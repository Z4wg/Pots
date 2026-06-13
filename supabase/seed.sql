-- Pots demo seed. Fixed UUIDs match lib/demo.ts so the two phones share state.
-- Run after schema.sql. Re-runnable (deletes the demo pot first).

delete from events where pot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from transactions where pot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from pot_members where pot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from pots where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Users: Maya (Traveller) and Tom (Socialiser)
insert into users (id, display_name, archetype, avatar_emoji) values
  ('11111111-1111-1111-1111-111111111111', 'Maya', 'traveller', '🦊'),
  ('22222222-2222-2222-2222-222222222222', 'Tom', 'socialiser', '🐢')
on conflict (id) do update
  set display_name = excluded.display_name,
      archetype = excluded.archetype,
      avatar_emoji = excluded.avatar_emoji;

-- Pot: Cafe Cap September, under £100 on cafes, window a few days out
insert into pots (id, name, goal_label, category, comparator, threshold_pence,
                  window_start, window_end, stake_pence, pot_total_pence, invite_code)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Cafe Cap September',
  'Under £100 on cafes this month',
  'cafe',
  'under',
  10000,
  now() - interval '20 days',
  now() + interval '3 days',
  500,
  1000,
  'POTS42'
);

-- Members: Maya safe (£60, streak 4), Tom one coffee from breaking (£96, streak 3)
insert into pot_members (id, pot_id, user_id, stake_pence, spent_pence, current_streak, status)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', 500, 6000, 4, 'active'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222', 500, 9600, 3, 'active');

-- A few pre-seeded events so the feed looks alive
insert into events (pot_id, kind, actor_name, payload) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'join', 'Maya', '{}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'join', 'Tom', '{}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'check_in', 'Maya', '{"streak":4}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'check_in', 'Tom', '{"streak":3}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'spend', 'Tom', '{"merchant":"Pret","category":"cafe","amount":380}');
