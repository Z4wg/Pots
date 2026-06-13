import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO } from './demo';
import { FRIENDS } from './friends';

// v2 §3/§7d: invited squad members live in a local, resettable store so the
// demo runs identically every time and works on both the mock + live backend
// (the shared Backend has no invite API). One row per invited person, with an
// "Invited" → "Joined" status. A couple of friends start already "Joined".

export type InviteMethod = 'email' | 'link' | 'qr';
export type InviteStatus = 'invited' | 'joined';

export interface InviteEntry {
  id: string;
  potId: string;
  label: string; // name or email
  method: InviteMethod;
  status: InviteStatus;
  emoji: string;
  archetype?: string;
}

const KEY = 'pots.invites.v1';
const EMPTY: InviteEntry[] = [];

function seedState(): Record<string, InviteEntry[]> {
  // A couple of friends already accepted, so the squad looks alive on open.
  const joined: InviteEntry[] = FRIENDS.slice(0, 2).map((f) => ({
    id: `seed-${f.id}`,
    potId: DEMO.POT_ID,
    label: f.name,
    method: 'link',
    status: 'joined',
    emoji: f.emoji,
    archetype: f.archetype,
  }));
  return { [DEMO.POT_ID]: joined };
}

let state: Record<string, InviteEntry[]> = seedState();
const listeners = new Set<() => void>();
let counter = 0;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export async function hydrateInvites() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      state = { ...state, ...JSON.parse(raw) };
      emit();
    }
  } catch {
    // ignore
  }
}

const EMOJIS = ['🦉', '🐬', '🦝', '🐝', '🦄', '🐙', '🐧', '🦔'];

export function addInvite(
  potId: string,
  label: string,
  method: InviteMethod
): InviteEntry {
  counter += 1;
  const entry: InviteEntry = {
    id: `inv-${Date.now().toString(36)}-${counter}`,
    potId,
    label,
    method,
    status: 'invited',
    emoji: EMOJIS[counter % EMOJIS.length],
  };
  const list = state[potId] ?? EMPTY;
  state = { ...state, [potId]: [...list, entry] };
  emit();
  persist();
  return entry;
}

export function resetInvites() {
  state = seedState();
  emit();
  persist();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Stable per-pot snapshot (reference only changes on mutation) so
// useSyncExternalStore doesn't loop.
export function useInvites(potId: string): InviteEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => state[potId] ?? EMPTY,
    () => state[potId] ?? EMPTY
  );
}
