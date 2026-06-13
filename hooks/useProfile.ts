import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArchetypeKey } from '@/lib/archetypes';

const KEY = 'pots.profile.v1';

interface Profile {
  onboarded: boolean;
  archetype: ArchetypeKey;
  stakePence: number;
}

let state: Profile = { onboarded: false, archetype: 'traveller', stakePence: 500 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export async function hydrateProfile() {
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

export function setArchetype(archetype: ArchetypeKey) {
  state = { ...state, archetype };
  emit();
  persist();
}

export function setStakePence(stakePence: number) {
  state = { ...state, stakePence };
  emit();
  persist();
}

export function completeOnboarding() {
  state = { ...state, onboarded: true };
  emit();
  persist();
}

export function resetOnboarding() {
  state = { onboarded: false, archetype: 'traveller', stakePence: 500 };
  emit();
  persist();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
