-- Pots schema. Money is integer pence everywhere.
-- NOTE: The open RLS policies below are DEMO-ONLY (anon can read/write all).
-- Do not ship this to production without real auth + scoped policies.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  archetype text default 'traveller',
  avatar_emoji text default '🦊'
);

create table if not exists pots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal_label text not null,                    -- "Under £100 on cafes this month"
  category text not null,                       -- 'cafe' (the bet rides on this category)
  comparator text not null default 'under',     -- 'under' | 'nospend' | 'atleast'
  threshold_pence int not null default 10000,   -- 10000 = £100
  window_start timestamptz not null default now(),
  window_end timestamptz not null,
  stake_pence int not null default 500,
  pot_total_pence int not null default 0,
  invite_code text unique not null
);

create table if not exists pot_members (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid references pots(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  stake_pence int not null default 500,         -- current share, grows when they win others' stakes
  spent_pence int not null default 0,           -- running spend in the bet category
  current_streak int not null default 0,
  status text not null default 'active'         -- 'active' | 'broken' | 'won'
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid references pots(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  merchant text not null,
  category text not null,                       -- 'cafe','grocery','going_out','transport','savings'
  amount_pence int not null,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid references pots(id) on delete cascade,
  kind text not null,         -- 'spend' | 'check_in' | 'broke' | 'redistribute' | 'won' | 'join'
  actor_name text,
  payload jsonb,
  created_at timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table pot_members;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table pots;

-- RLS (DEMO-ONLY open policies)
alter table users enable row level security;
alter table pots enable row level security;
alter table pot_members enable row level security;
alter table events enable row level security;
alter table transactions enable row level security;

create policy "anon all users" on users for all to anon using (true) with check (true);
create policy "anon all pots" on pots for all to anon using (true) with check (true);
create policy "anon all members" on pot_members for all to anon using (true) with check (true);
create policy "anon all events" on events for all to anon using (true) with check (true);
create policy "anon all tx" on transactions for all to anon using (true) with check (true);
