import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO } from './demo';

// v2 §5: tracks when each user last pulled their bank figures. Drives the
// "Last synced 2h ago" indicator and the "you haven't synced today" nudge.
// Local + resettable; the standing itself lives on the member row.

const KEY = 'pots.sync.v1';
const STALE_MS = 8 * 60 * 60 * 1000; // not synced in 8h → nudge

function seedState(): Record<string, number> {
  // Seed both demo users ~26h ago so the "sync today" nudge shows on open,
  // then clears the moment you press Sync (a clean on-stage beat).
  const past = Date.now() - 26 * 60 * 60 * 1000;
  return { [DEMO.MAYA_ID]: past, [DEMO.TOM_ID]: past };
}

let state: Record<string, number> = seedState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export async function hydrateSync() {
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

export function markSynced(userId: string) {
  state = { ...state, [userId]: Date.now() };
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export function resetSync() {
  state = seedState();
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLastSync(userId: string): number | null {
  return useSyncExternalStore(
    subscribe,
    () => state[userId] ?? null,
    () => state[userId] ?? null
  );
}

export function relativeTime(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function isStale(ts: number | null): boolean {
  if (!ts) return true;
  return Date.now() - ts > STALE_MS;
}
