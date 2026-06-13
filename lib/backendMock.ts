import type { Backend, RealtimeHandlers } from './backend';
import type {
  BankConnection,
  NewPotInput,
  Pot,
  PotMember,
  PotEvent,
  Transaction,
  User,
} from './types';
import { seedUsers, seedPot, seedMembers, seedEvents, seedBankConnections } from './seedData';

// In-memory backend used when Supabase keys are not configured. Holds multiple
// pots; everything is filtered by pot_id like the Supabase tables.

let counter = 0;
function uid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function genInviteCode() {
  return 'POTS' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export class MockBackend implements Backend {
  readonly isMock = true;

  private users: User[] = [];
  private pots: Pot[] = [];
  private members: PotMember[] = [];
  private events: PotEvent[] = [];
  private bankConnections: BankConnection[] = [];
  private subs = new Map<string, Set<RealtimeHandlers>>();

  constructor() {
    this.load();
  }

  private load() {
    this.users = seedUsers();
    this.pots = [seedPot()];
    this.members = seedMembers();
    this.events = seedEvents();
    this.bankConnections = seedBankConnections();
  }

  private potById(potId: string): Pot {
    return this.pots.find((p) => p.id === potId) ?? this.pots[0];
  }

  private recomputeTotal(potId: string) {
    const total = this.members
      .filter((m) => m.pot_id === potId && m.stake_paid)
      .reduce((s, m) => s + m.stake_pence, 0);
    const pot = this.pots.find((p) => p.id === potId);
    if (pot) {
      pot.pot_total_pence = total;
      this.emitPot(pot);
    }
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

  async getPot(potId: string): Promise<Pot> {
    await this.delay();
    return { ...this.potById(potId) };
  }

  async getMembers(potId: string): Promise<PotMember[]> {
    await this.delay();
    return this.members.filter((m) => m.pot_id === potId).map((m) => ({ ...m }));
  }

  async getMember(potId: string, userId: string): Promise<PotMember | null> {
    await this.delay();
    const m = this.members.find((x) => x.pot_id === potId && x.user_id === userId);
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
    return this.events
      .filter((e) => e.pot_id === potId)
      .slice(-limit)
      .map((e) => ({ ...e }));
  }

  async getUserName(userId: string): Promise<string> {
    return this.users.find((u) => u.id === userId)?.display_name ?? 'Someone';
  }

  async updatePotTotal(potId: string, totalPence: number): Promise<void> {
    const pot = this.pots.find((p) => p.id === potId);
    if (!pot) return;
    pot.pot_total_pence = totalPence;
    this.emitPot(pot);
  }

  async getPotsForUser(userId: string): Promise<Pot[]> {
    await this.delay();
    const ids = new Set(this.members.filter((m) => m.user_id === userId).map((m) => m.pot_id));
    return this.pots.filter((p) => ids.has(p.id)).map((p) => ({ ...p }));
  }

  async getPotByInviteCode(code: string): Promise<Pot | null> {
    await this.delay();
    const p = this.pots.find((x) => x.invite_code === code);
    return p ? { ...p } : null;
  }

  async createPot(input: NewPotInput, creatorUserId: string): Promise<Pot> {
    await this.delay();
    const pot: Pot = {
      id: uid('pot'),
      name: input.name,
      goal_label: input.goal_label,
      category: input.category,
      comparator: input.comparator,
      threshold_pence: input.threshold_pence,
      window_start: new Date().toISOString(),
      window_end: input.window_end,
      stake_pence: input.stake_pence,
      pot_total_pence: input.stake_pence,
      invite_code: genInviteCode(),
      bet_type: input.bet_type,
      payout_rule: input.payout_rule,
    };
    this.pots.push(pot);
    const member: PotMember = {
      id: uid('mem'),
      pot_id: pot.id,
      user_id: creatorUserId,
      stake_pence: input.stake_pence,
      spent_pence: 0,
      current_streak: 0,
      status: 'active',
      personal_goal_pence: input.personal_goal_pence,
      current_value_pence: 0,
      stake_paid: true,
    };
    this.members.push(member);
    this.emitPot(pot);
    this.emitMember(member);
    await this.insertEvent({
      pot_id: pot.id,
      kind: 'join',
      actor_name: await this.getUserName(creatorUserId),
      payload: {},
    });
    return { ...pot };
  }

  async joinPot(potId: string, userId: string): Promise<void> {
    await this.delay();
    if (this.members.some((m) => m.pot_id === potId && m.user_id === userId)) return;
    const pot = this.potById(potId);
    const member: PotMember = {
      id: uid('mem'),
      pot_id: potId,
      user_id: userId,
      stake_pence: pot.stake_pence,
      spent_pence: 0,
      current_streak: 0,
      status: 'active',
      personal_goal_pence: pot.threshold_pence,
      current_value_pence: 0,
      stake_paid: false,
    };
    this.members.push(member);
    this.emitMember(member);
    await this.insertEvent({
      pot_id: potId,
      kind: 'join',
      actor_name: await this.getUserName(userId),
      payload: {},
    });
  }

  async payStake(potId: string, userId: string): Promise<void> {
    await this.delay();
    const m = this.members.find((x) => x.pot_id === potId && x.user_id === userId);
    if (!m) return;
    m.stake_paid = true;
    this.emitMember(m);
    this.recomputeTotal(potId);
    await this.insertEvent({
      pot_id: potId,
      kind: 'paid',
      actor_name: await this.getUserName(userId),
      payload: { amount: m.stake_pence },
    });
  }

  async getBankConnection(userId: string): Promise<BankConnection | null> {
    await this.delay();
    const c = this.bankConnections.find((x) => x.user_id === userId);
    return c ? { ...c } : null;
  }

  async upsertBankConnection(conn: BankConnection): Promise<void> {
    const idx = this.bankConnections.findIndex((x) => x.user_id === conn.user_id);
    if (idx === -1) this.bankConnections.push({ ...conn });
    else this.bankConnections[idx] = { ...conn };
  }

  async resetDemo(): Promise<void> {
    this.load();
    this.pots.forEach((p) => this.emitPot(p));
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
