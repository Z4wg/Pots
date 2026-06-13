// Data model mirrors the Supabase schema exactly. Money is integer pence.

export type Comparator = 'under' | 'nospend' | 'atleast';

export type MemberStatus = 'active' | 'broken' | 'won';

export type Category = 'cafe' | 'grocery' | 'going_out' | 'transport' | 'savings';

// v2: a pot's bet mechanic. 'spend_freeze' keeps the cap-break + payout-slide;
// 'save_race' ranks by savings growth; 'target_commit' is per-person targets.
export type BetType = 'spend_freeze' | 'save_race' | 'target_commit';

export type PayoutRule = 'winner_takes_all' | 'split_winners' | 'loser_buys';

export type EventKind =
  | 'spend'
  | 'check_in'
  | 'broke'
  | 'redistribute'
  | 'won'
  | 'join'
  | 'milestone'
  | 'paid'
  | 'rank_up'
  | 'rank_down'
  | 'sync'; // v2: account synced from the connected bank (replaces self-reported check-in)

export interface User {
  id: string;
  display_name: string;
  archetype: string;
  avatar_emoji: string;
}

export interface Pot {
  id: string;
  name: string;
  goal_label: string;
  category: string;
  comparator: Comparator;
  threshold_pence: number;
  window_start: string;
  window_end: string;
  stake_pence: number;
  pot_total_pence: number;
  invite_code: string;
  bet_type: BetType;
  payout_rule: PayoutRule;
}

export interface PotMember {
  id: string;
  pot_id: string;
  user_id: string;
  stake_pence: number;
  spent_pence: number;
  current_streak: number;
  status: MemberStatus;
  // v2 leaderboard / commit fields.
  personal_goal_pence: number; // their own target (save target, or spend cap)
  current_value_pence: number; // progress metric the leaderboard ranks on
  rank?: number | null;
  prev_rank?: number | null;
  stake_paid: boolean;
  // Joined / denormalized for display (filled by the hook from users).
  display_name?: string;
  avatar_emoji?: string;
  archetype?: string;
}

export interface Transaction {
  id: string;
  pot_id: string;
  user_id: string;
  merchant: string;
  category: string;
  amount_pence: number;
  created_at: string;
}

export interface PotEvent {
  id: string;
  pot_id: string;
  kind: EventKind;
  actor_name: string | null;
  payload: Record<string, any> | null;
  created_at: string;
}

// v2: mocked open-banking connection. The numbers the pot tracks; mutated by
// the "Simulate a day" control. All integer pence.
export interface BankConnection {
  id: string;
  user_id: string;
  provider: string; // 'revolut' | 'monzo' | 'starling' | ...
  balance_pence: number;
  savings_balance_pence: number;
  spend_by_category: Record<string, number>; // pence per category
  connected_at: string;
}

export interface Invite {
  id: string;
  pot_id: string;
  token: string | null;
  email: string | null;
  status: 'pending' | 'accepted';
  created_at: string;
}

// Input for creating a new pot (the create form fills this).
export interface NewPotInput {
  name: string;
  goal_label: string;
  bet_type: BetType;
  category: string;
  comparator: Comparator;
  threshold_pence: number;
  window_end: string;
  stake_pence: number;
  payout_rule: PayoutRule;
  personal_goal_pence: number;
}
