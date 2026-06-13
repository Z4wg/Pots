import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './theme';

// v2 §7a: personal planning buckets — separate from the bet pods. Local +
// resettable. Created manually or accepted from the scripted Coach (§7b).

export interface Bucket {
  id: string;
  name: string;
  emoji: string;
  targetPence: number;
  currentPence: number;
  color: string;
  targetDate?: string; // free text, e.g. "Aug 2026"
}

const KEY = 'pots.buckets.v1';

// The bucket that pot winnings flow into — the concrete link between the social
// bet (pots) and the user's private goals (buckets).
export const PRIMARY_BUCKET_ID = 'bucket-emergency';

function seedState(): Bucket[] {
  return [
    { id: 'bucket-holiday', name: 'Holiday', emoji: '🏝️', targetPence: 120000, currentPence: 45000, color: '#5AC8FA', targetDate: 'Aug 2026' },
    { id: 'bucket-emergency', name: 'Emergency fund', emoji: '🛟', targetPence: 200000, currentPence: 80000, color: colors.lime },
    { id: 'bucket-laptop', name: 'New laptop', emoji: '💻', targetPence: 90000, currentPence: 12000, color: colors.violet, targetDate: 'Dec 2026' },
  ];
}

let state: Bucket[] = seedState();
const listeners = new Set<() => void>();
let counter = 0;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export async function hydrateBuckets() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state = parsed;
        emit();
      }
    }
  } catch {
    // ignore
  }
}

export function addBucket(input: Omit<Bucket, 'id'>): Bucket {
  counter += 1;
  const bucket: Bucket = { ...input, id: `bucket-${Date.now().toString(36)}-${counter}` };
  // Avoid obvious duplicates (e.g. accepting the same Coach suggestion twice).
  if (state.some((b) => b.name.toLowerCase() === bucket.name.toLowerCase())) return bucket;
  state = [...state, bucket];
  emit();
  persist();
  return bucket;
}

export function hasBucket(name: string): boolean {
  return state.some((b) => b.name.toLowerCase() === name.toLowerCase());
}

// Move money into a bucket (e.g. what you saved by holding a pot's cap).
export function topUpBucket(id: string, pence: number) {
  if (pence <= 0) return;
  state = state.map((b) =>
    b.id === id ? { ...b, currentPence: b.currentPence + pence } : b
  );
  emit();
  persist();
}

export function resetBuckets() {
  state = seedState();
  emit();
  persist();
}

export function useBuckets(): Bucket[] {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
