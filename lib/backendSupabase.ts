import { supabase } from './supabase';
import type { Backend, RealtimeHandlers } from './backend';
import type { Pot, PotMember, PotEvent, Transaction } from './types';
import { seedUsers, seedPot, seedMembers, seedEvents } from './seedData';

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
