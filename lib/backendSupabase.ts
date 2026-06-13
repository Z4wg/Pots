import { supabase } from './supabase';
import type { Backend, RealtimeHandlers } from './backend';
import type {
  BankConnection,
  NewPotInput,
  Pot,
  PotMember,
  PotEvent,
  Transaction,
} from './types';
import { seedUsers, seedPot, seedMembers, seedEvents, seedBankConnections } from './seedData';

function genInviteCode() {
  return 'POTS' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export class SupabaseBackend implements Backend {
  readonly isMock = false;

  async getPot(potId: string): Promise<Pot> {
    const { data, error } = await supabase.from('pots').select('*').eq('id', potId).single();
    if (error) throw error;
    return data as Pot;
  }

  async getMembers(potId: string): Promise<PotMember[]> {
    const { data, error } = await supabase
      .from('pot_members')
      .select('*, users(display_name, avatar_emoji, archetype)')
      .eq('pot_id', potId);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...row,
      display_name: row.users?.display_name,
      avatar_emoji: row.users?.avatar_emoji,
      archetype: row.users?.archetype,
    })) as PotMember[];
  }

  async getMember(potId: string, userId: string): Promise<PotMember | null> {
    const { data, error } = await supabase
      .from('pot_members')
      .select('*')
      .eq('pot_id', potId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as PotMember) ?? null;
  }

  async updateMember(id: string, patch: Partial<PotMember>): Promise<void> {
    const { display_name, avatar_emoji, archetype, ...clean } = patch as any;
    const { error } = await supabase.from('pot_members').update(clean).eq('id', id);
    if (error) throw error;
  }

  async insertTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('transactions').insert(tx);
    if (error) throw error;
  }

  async insertEvent(e: Omit<PotEvent, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from('events').insert(e);
    if (error) throw error;
  }

  async getEvents(potId: string, limit = 40): Promise<PotEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('pot_id', potId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as PotEvent[]) ?? []).reverse();
  }

  async getUserName(userId: string): Promise<string> {
    const { data } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();
    return (data?.display_name as string) ?? 'Someone';
  }

  async updatePotTotal(potId: string, totalPence: number): Promise<void> {
    await supabase.from('pots').update({ pot_total_pence: totalPence }).eq('id', potId);
  }

  async getPotsForUser(userId: string): Promise<Pot[]> {
    const { data: mem, error: e1 } = await supabase
      .from('pot_members')
      .select('pot_id')
      .eq('user_id', userId);
    if (e1) throw e1;
    const ids = (mem ?? []).map((r: any) => r.pot_id);
    if (!ids.length) return [];
    const { data, error } = await supabase.from('pots').select('*').in('id', ids);
    if (error) throw error;
    return (data ?? []) as Pot[];
  }

  async getPotByInviteCode(code: string): Promise<Pot | null> {
    const { data, error } = await supabase
      .from('pots')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();
    if (error) throw error;
    return (data as Pot) ?? null;
  }

  async getBankConnection(userId: string): Promise<BankConnection | null> {
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as BankConnection) ?? null;
  }

  async upsertBankConnection(conn: BankConnection): Promise<void> {
    const { error } = await supabase
      .from('bank_connections')
      .upsert(conn, { onConflict: 'user_id' });
    if (error) throw error;
  }

  async createPot(input: NewPotInput, creatorUserId: string): Promise<Pot> {
    const { data, error } = await supabase
      .from('pots')
      .insert({
        name: input.name,
        goal_label: input.goal_label,
        category: input.category,
        comparator: input.comparator,
        threshold_pence: input.threshold_pence,
        window_end: input.window_end,
        stake_pence: input.stake_pence,
        pot_total_pence: input.stake_pence,
        invite_code: genInviteCode(),
        bet_type: input.bet_type,
        payout_rule: input.payout_rule,
      })
      .select()
      .single();
    if (error) throw error;
    const pot = data as Pot;

    const { error: e2 } = await supabase.from('pot_members').insert({
      pot_id: pot.id,
      user_id: creatorUserId,
      stake_pence: input.stake_pence,
      spent_pence: 0,
      current_streak: 0,
      status: 'active',
      personal_goal_pence: input.personal_goal_pence,
      current_value_pence: 0,
      stake_paid: true,
    });
    if (e2) throw e2;

    await supabase.from('events').insert({
      pot_id: pot.id,
      kind: 'join',
      actor_name: await this.getUserName(creatorUserId),
      payload: {},
    });
    return pot;
  }

  async joinPot(potId: string, userId: string): Promise<void> {
    const { data: existing } = await supabase
      .from('pot_members')
      .select('id')
      .eq('pot_id', potId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) return;

    const pot = await this.getPot(potId);
    const { error } = await supabase.from('pot_members').insert({
      pot_id: potId,
      user_id: userId,
      stake_pence: pot.stake_pence,
      spent_pence: 0,
      current_streak: 0,
      status: 'active',
      personal_goal_pence: pot.threshold_pence,
      current_value_pence: 0,
      stake_paid: false,
    });
    if (error) throw error;

    await supabase.from('events').insert({
      pot_id: potId,
      kind: 'join',
      actor_name: await this.getUserName(userId),
      payload: {},
    });
  }

  async payStake(potId: string, userId: string): Promise<void> {
    await supabase
      .from('pot_members')
      .update({ stake_paid: true })
      .eq('pot_id', potId)
      .eq('user_id', userId);

    const { data: mems } = await supabase
      .from('pot_members')
      .select('stake_pence, stake_paid, user_id')
      .eq('pot_id', potId);
    const total = (mems ?? [])
      .filter((m: any) => m.stake_paid)
      .reduce((s: number, m: any) => s + m.stake_pence, 0);
    await supabase.from('pots').update({ pot_total_pence: total }).eq('id', potId);

    const mine = (mems ?? []).find((m: any) => m.user_id === userId);
    await supabase.from('events').insert({
      pot_id: potId,
      kind: 'paid',
      actor_name: await this.getUserName(userId),
      payload: { amount: mine?.stake_pence ?? 0 },
    });
  }

  async resetDemo(): Promise<void> {
    const pot = seedPot();
    const users = seedUsers();
    const members = seedMembers();
    const events = seedEvents();

    await supabase.from('events').delete().eq('pot_id', pot.id);
    await supabase.from('transactions').delete().eq('pot_id', pot.id);
    await supabase.from('pot_members').delete().eq('pot_id', pot.id);
    await supabase.from('pots').delete().eq('id', pot.id);

    await supabase.from('users').upsert(users);
    await supabase.from('pots').upsert(pot);
    await supabase.from('pot_members').upsert(
      members.map(({ display_name, avatar_emoji, archetype, ...m }) => m)
    );
    await supabase.from('events').insert(
      events.map(({ id, created_at, ...e }) => e)
    );

    await supabase
      .from('bank_connections')
      .upsert(seedBankConnections(), { onConflict: 'user_id' });
  }

  subscribe(potId: string, handlers: RealtimeHandlers): () => void {
    const channel = supabase
      .channel(`pot-${potId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pot_members', filter: `pot_id=eq.${potId}` },
        (payload) => handlers.onMember?.(payload.new as PotMember)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events', filter: `pot_id=eq.${potId}` },
        (payload) => handlers.onEvent?.(payload.new as PotEvent)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pots', filter: `id=eq.${potId}` },
        (payload) => handlers.onPot?.(payload.new as Pot)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `pot_id=eq.${potId}` },
        (payload) => handlers.onTransaction?.(payload.new as Transaction)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
