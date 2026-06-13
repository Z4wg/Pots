import { DEMO, MAYA, TOM } from './demo';
import type { Pot, PotMember, PotEvent, User } from './types';

// Single source of truth for the demo seed. Used by both the Supabase reset
// helper (lib/seed.ts) and the offline mock backend (lib/backendMock.ts).

export function seedUsers(): User[] {
  return [
    { ...MAYA },
    { ...TOM },
  ];
}

export function seedPot(): Pot {
  const now = Date.now();
  const start = new Date(now - 1000 * 60 * 60 * 24 * 20).toISOString();
  const end = new Date(now + 1000 * 60 * 60 * 24 * 3).toISOString(); // a few days out
  return {
    id: DEMO.POT_ID,
    name: 'Cafe Cap September',
    goal_label: 'Under £100 on cafes this month',
    category: 'cafe',
    comparator: 'under',
    threshold_pence: 10000,
    window_start: start,
    window_end: end,
    stake_pence: 500,
    pot_total_pence: 1000,
    invite_code: DEMO.INVITE_CODE,
  };
}

export function seedMembers(): PotMember[] {
  return [
    {
      id: DEMO.MAYA_MEMBER_ID,
      pot_id: DEMO.POT_ID,
      user_id: DEMO.MAYA_ID,
      stake_pence: 500,
      spent_pence: 6000, // £60, safe
      current_streak: 4,
      status: 'active',
      display_name: MAYA.display_name,
      avatar_emoji: MAYA.avatar_emoji,
      archetype: MAYA.archetype,
    },
    {
      id: DEMO.TOM_MEMBER_ID,
      pot_id: DEMO.POT_ID,
      user_id: DEMO.TOM_ID,
      stake_pence: 500,
      spent_pence: 9600, // £96, one coffee from breaking
      current_streak: 3,
      status: 'active',
      display_name: TOM.display_name,
      avatar_emoji: TOM.avatar_emoji,
      archetype: TOM.archetype,
    },
  ];
}

export function seedEvents(): PotEvent[] {
  const base = Date.now() - 1000 * 60 * 60 * 6;
  const mk = (i: number, kind: PotEvent['kind'], actor: string, payload: any): PotEvent => ({
    id: `seed-event-${i}`,
    pot_id: DEMO.POT_ID,
    kind,
    actor_name: actor,
    payload,
    created_at: new Date(base + i * 1000 * 60 * 20).toISOString(),
  });
  return [
    mk(0, 'join', 'Maya', {}),
    mk(1, 'join', 'Tom', {}),
    mk(2, 'check_in', 'Maya', { streak: 4 }),
    mk(3, 'check_in', 'Tom', { streak: 3 }),
    mk(4, 'spend', 'Tom', { merchant: 'Pret', category: 'cafe', amount: 380 }),
  ];
}
