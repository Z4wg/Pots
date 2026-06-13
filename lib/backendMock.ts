import type { Backend, RealtimeHandlers } from './backend';
import type { Pot, PotMember, PotEvent, Transaction, User } from './types';
import { seedUsers, seedPot, seedMembers, seedEvents } from './seedData';

// In-memory backend used when Supabase keys are not configured. It mirrors the
// async shape of the Supabase backend and pushes changes to subscribers on a
// micro-delay so optimistic UI + realtime reconciliation behaves identically.

let counter = 0;
function uid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export class MockBackend implements Backend {
  readonly isMock = true;

  private users: User[] = [];
  private pot!: Pot;
  private members: PotMember[] = [];
  private events: PotEvent[] = [];
  private subs = new Map<string, Set<RealtimeHandlers>>();

  constructor() {
    this.load();
  }

  private load() {
    this.users = seedUsers();
    this.pot = seedPot();
    this.members = seedMembers();
    this.events = seedEvents();
  }

  private subsFor(potId: string): Set<RealtimeHandlers> {
    let s = this.subs.get(potId);
    if (!s) {
      s = new Set();
      this.subs.set(potId, s);
    }
    return s;
  }

  private emitMember(m: PotMember) {
    const snapshot = { ...m };
    setTimeout(() => this.subsFor(m.pot_id).forEach((h) => h.onMember?.(snapshot)), 30);
  }
  private emitEvent(e: PotEvent) {
    const snapshot = { ...e };
    setTimeout(() => this.subsFor(e.pot_id).forEach((h) => h.onEvent?.(snapshot)), 30);
  }
  private emitPot(p: Pot) {
    const snapshot = { ...p };
    setTimeout(() => this.subsFor(p.id).forEach((h) => h.onPot?.(snapshot)), 30);
  }
  private emitTx(t: Transaction) {
    const snapshot = { ...t };
    setTimeout(() => this.subsFor(t.pot_id).forEach((h) => h.onTransaction?.(snapshot)), 30);
  }

  private async delay() {
    return new Promise<void>((r) => setTimeout(r, 20));
  }

  async getPot(): Promise<Pot> {
    await this.delay();
    return { ...this.pot };
  }

  async getMembers(): Promise<PotMember[]> {
    await this.delay();
    return this.members.map((m) => ({ ...m }));
  }

  async getMember(potId: string, userId: string): Promise<PotMember | null> {
    await this.delay();
    const m = this.members.find((x) => x.user_id === userId);
    return m ? { ...m } : null;
  }

  async updateMember(id: string, patch: Partial<PotMember>): Promise<void> {
    const m = this.members.find((x) => x.id === id);
    if (!m) return;
    Object.assign(m, patch);
    this.emitMember(m);
  }

  async insertTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<void> {
    const t: Transaction = { ...tx, id: uid('tx'), created_at: new Date().toISOString() };
    this.emitTx(t);
  }

  async insertEvent(e: Omit<PotEvent, 'id' | 'created_at'>): Promise<void> {
    const ev: PotEvent = { ...e, id: uid('ev'), created_at: new Date().toISOString() };
    this.events.push(ev);
    this.emitEvent(ev);
  }

  async getEvents(potId: string, limit = 40): Promise<PotEvent[]> {
    await this.delay();
    return this.events.slice(-limit).map((e) => ({ ...e }));
  }

  async getUserName(userId: string): Promise<string> {
    return this.users.find((u) => u.id === userId)?.display_name ?? 'Someone';
  }

  async updatePotTotal(potId: string, totalPence: number): Promise<void> {
    this.pot.pot_total_pence = totalPence;
    this.emitPot(this.pot);
  }

  async resetDemo(): Promise<void> {
    this.load();
    this.emitPot(this.pot);
    this.members.forEach((m) => this.emitMember(m));
  }

  subscribe(potId: string, handlers: RealtimeHandlers): () => void {
    const s = this.subsFor(potId);
    s.add(handlers);
    return () => {
      s.delete(handlers);
    };
  }
}
