import type { Pot, PotMember, PotEvent, Transaction } from './types';
import { SUPABASE_CONFIGURED } from './supabase';
import { SupabaseBackend } from './backendSupabase';
import { MockBackend } from './backendMock';

export type RealtimeHandlers = {
  onMember?: (m: PotMember) => void;
  onEvent?: (e: PotEvent) => void;
  onPot?: (p: Pot) => void;
  onTransaction?: (t: Transaction) => void;
};

export interface Backend {
  readonly isMock: boolean;
  getPot(potId: string): Promise<Pot>;
  getMembers(potId: string): Promise<PotMember[]>;
  getMember(potId: string, userId: string): Promise<PotMember | null>;
  updateMember(id: string, patch: Partial<PotMember>): Promise<void>;
  insertTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<void>;
  insertEvent(e: Omit<PotEvent, 'id' | 'created_at'>): Promise<void>;
  getEvents(potId: string, limit?: number): Promise<PotEvent[]>;
  getUserName(userId: string): Promise<string>;
  updatePotTotal(potId: string, totalPence: number): Promise<void>;
  resetDemo(): Promise<void>;
  subscribe(potId: string, handlers: RealtimeHandlers): () => void;
}

// Choose the live Supabase backend when keys are configured, otherwise fall
// back to an in-memory mock so the full demo flow runs offline in Expo Go.
export const backend: Backend = SUPABASE_CONFIGURED
  ? new SupabaseBackend()
  : new MockBackend();

export const USING_MOCK = backend.isMock;
