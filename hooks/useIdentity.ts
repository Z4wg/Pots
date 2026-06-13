import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO, MAYA, TOM, type DemoUser } from '@/lib/demo';

// Tiny global store for the active demo identity (Phone A = Maya, B = Tom).
const KEY = 'pots.identity';

let currentId: string = DEMO.MAYA_ID;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export async function hydrateIdentity() {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v && (v === DEMO.MAYA_ID || v === DEMO.TOM_ID)) {
      currentId = v;
      emit();
    }
  } catch {
    // ignore
  }
}

export function setIdentity(id: string) {
  currentId = id;
  emit();
  AsyncStorage.setItem(KEY, id).catch(() => {});
}

export function toggleIdentity() {
  setIdentity(currentId === DEMO.MAYA_ID ? DEMO.TOM_ID : DEMO.MAYA_ID);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return currentId;
}

export function useIdentity(): DemoUser {
  const id = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return id === DEMO.MAYA_ID ? MAYA : TOM;
}
