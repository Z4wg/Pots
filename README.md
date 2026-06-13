# Pots 🫙

**Bet on your budget. Your friends hold you to it. The disciplined ones get paid.**
Loud budgeting with skin in the game.

Pots is a Gen Z social budgeting app. Friends put real money (simulated as integer
**pence** in this build) into a shared **pot** and bet it on sticking to their own
budget. Hold your goal and you keep your stake. Break it and your stake is automatically
taken and redistributed to the friends who held theirs.

> **The single most important rule:** a bet is won or lost **only by transaction data,
> never by a person**. No user, not even the bettor, can tap "I won" or "you lost." The
> system reads spending in the bet's category and resolves automatically. This is
> _"the bank is the referee."_ `status` can only change inside `recordTransaction`
> (data) or `resolveWindowEnd` (the scheduled window-end resolver). `breakBet` is
> idempotent.

> ℹ️ **Where the code is:** the full app currently lives on the
> [`cursor/build-pots-app-0cfd`](https://github.com/Z4wg/Pots/tree/cursor/build-pots-app-0cfd)
> branch (built for the **8xHackathon**). The file links below point there. Merge that
> branch into `main` to bring the code onto the default branch.

## Stack

- **Expo SDK 54**, React Native 0.81, React 19, TypeScript
- **Expo Router** (file-based routing in `/app`), bottom tabs
- **Supabase** (Postgres + Realtime via `postgres_changes`) for cross-device sync. No
  auth — runs as `anon` with two hardcoded demo user IDs behind a dev toggle
- **react-native-reanimated v4** for animation, **expo-haptics** for haptics,
  **expo-linking** for invite deep links

React Native primitives only. No HTML tags. No `localStorage`. Money is always integer
pence; formatted on display only.

## Run it

```bash
git checkout cursor/build-pots-app-0cfd   # the code lives here for now
npm install                                # restore JS deps
npx expo start                             # then press i / a, or scan the QR with Expo Go
```

The app runs **out of the box with no setup** using an in-memory mock backend, so the
full demo flow (including the payout slide) works on a single phone immediately. To get
**real two-phone realtime sync**, connect Supabase (below).

### Connect Supabase (for two-phone realtime)

1. Create a Supabase project.
2. In the SQL editor, run
   [`supabase/schema.sql`](https://github.com/Z4wg/Pots/blob/cursor/build-pots-app-0cfd/supabase/schema.sql)
   then
   [`supabase/seed.sql`](https://github.com/Z4wg/Pots/blob/cursor/build-pots-app-0cfd/supabase/seed.sql).
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). These are read by
   [`lib/supabase.ts`](https://github.com/Z4wg/Pots/blob/cursor/build-pots-app-0cfd/lib/supabase.ts).
4. Restart `npx expo start`. The app auto-detects the keys and switches from the mock
   backend to live Supabase realtime.

**Verify realtime first:** edit a `pot_members` row in the Supabase dashboard and watch
the bet-health bar / stake update live on the phone before anything else.

> ⚠️ **The RLS policies in `schema.sql` are DEMO-ONLY** — they let the `anon` role read
> and write everything so the no-auth demo works. Do **not** ship them to production.
> Real apps need auth and row-scoped policies.

### Two phones

- **Phone A = Maya** (Traveller 🦊), **Phone B = Tom** (Socialiser 🐢).
- Switch identity on the **Squad** tab → "Demo identity" (or open an invite link, which
  joins as Tom). On two physical devices each picks an identity; with Supabase connected
  they share live state.

## The demo script (the wow)

1. Both phones show the seeded pot alive: **Maya** £5 staked / £60 spent / streak 4;
   **Tom** £5 staked / £96 spent / streak 3; **pot £10**.
2. Phone A (Maya) taps **"I held today"** → spring animation + success haptic; Phone B's
   feed updates _"Maya held the line · streak 5."_
3. The presenter taps **"Tom buys a £30 coffee"** (dev row on the Pot screen).
4. On **both** phones: Tom's bet-health bar fills past £100 and turns **red**, his status
   flips to **BROKE**, his **£5 chip slides across the screen onto Maya's tile**, Maya's
   stake counts **£5 → £10** with a success haptic, and the feed shows
   _"£5 from Tom goes to Maya."_
5. The **Coach** card updates: _"Maya held the line and took the pot."_
6. **"Force window end"** marks any remaining holders as **WON**.

Tap **"Reset demo"** to return to the seeded starting state and run it again.

## How resolution works (`lib/pots.ts`)

- `recordTransaction(potId, userId, merchant, category, amountPence)` — inserts the
  transaction + a `spend` event, and **only if** the category matches the pot's category
  does it add to the member's `spent_pence`. If that crosses the cap (`under`) or any
  spend happens (`nospend`), it auto-calls `breakBet`.
- `breakBet(potId, brokenId)` — **idempotent**. Zeroes the broken member's stake, splits
  it (`floor` share + remainder to the first holder) across active holders, and emits
  `redistribute` + `broke` events. Each holder save fires the payout slide on every phone.
- `checkIn(potId, userId)` — increments streak only. **Never** resolves win/loss.
- `resolveWindowEnd(potId)` — scheduled / dev button. Survivors become `won`.

Comparators: `under` (stay below the cap), `nospend` (any spend breaks you), `atleast`
(must reach the threshold by window end). Categorization is by the transaction's
`category` field. In production this comes from Open Banking / Revolut merchant + MCC
codes; here the seed and dev buttons set it directly so resolution is deterministic.
**No LLM ever decides win/loss.**

## Project structure

```
app/
  _layout.tsx            Root stack + providers
  index.tsx              Redirect: onboarding vs tabs
  onboarding.tsx         Archetype quiz + animated reveal
  create.tsx             Set bet, stake, invite, "Connect Revolut" (demo)
  join/[code].tsx        Invite deep link (pots://join/POTS42)
  (tabs)/
    index.tsx            POT — hero screen, tiles, live feed, PayoutSlide, dev row
    buckets.tsx          50/30/20 split tuned to archetype, live bet bucket
    coach.tsx            Rule-based proactive cards (comments only)
    squad.tsx            Leaderboard + identity toggle + invite
components/              CheckInButton, MoneyCounter, PayoutCoin, MemberTile, ...
hooks/                   usePotRealtime (usePot), useIdentity, useProfile
lib/                     supabase, backend (+ mock), pots, types, money, theme, archetypes, seed
supabase/               schema.sql, seed.sql, functions/coach (optional Edge Function)
```

## Data model

Five Postgres tables, all money in **integer pence**:

- **`users`** — display name, archetype, avatar emoji.
- **`pots`** — the bet: `goal_label`, `category`, `comparator`, `threshold_pence`, time
  window, `stake_pence`, `pot_total_pence`, `invite_code`.
- **`pot_members`** — a user's seat: `stake_pence` (grows when they win others' stakes),
  `spent_pence`, `current_streak`, `status` (`active | broken | won`).
- **`transactions`** — merchant, category, `amount_pence`. **The only thing that can
  break a bet.**
- **`events`** — append-only feed: `spend | check_in | broke | redistribute | won | join`.

## The three animations

1. **CheckInButton** — press → `withSequence(withSpring 0.92 → 1.06 → 1)`, checkmark,
   `Haptics.notificationAsync(Success)`.
2. **MoneyCounter** — animates the number with `withTiming(value, { duration: 600 })`,
   light impact haptic on change. Used for stakes and the pot total.
3. **PayoutSlide** (centerpiece) — a chip flies from the broken member's tile to each
   holder using `withTiming(target, { duration: 700, easing: Easing.out(Easing.exp) })`;
   tiles reflow with `LinearTransition.springify()`; on arrival the holder's MoneyCounter
   runs and a success haptic fires; the broken tile turns red.

## Optional LLM coach

[`supabase/functions/coach`](https://github.com/Z4wg/Pots/tree/cursor/build-pots-app-0cfd/supabase/functions/coach)
is a Supabase Edge Function that returns
`{ headline, stake_risk, insights[], suggested_action, goal_projection }`. The API key
lives in the function's secrets, **never on the device**. It falls back to deterministic
rule-based JSON when no key is set. The coach only comments; it never decides win/loss.

## Hard requirements honoured

- Money is integer pence everywhere; formatted on display only. No floats.
- `status` changes only in `recordTransaction` or `resolveWindowEnd`. No human sets
  won/lost. `breakBet` is idempotent.
- Visuals animate optimistically and reconcile from realtime.
- React Native primitives only. No HTML tags. No `localStorage`/`sessionStorage`.
- Supabase keys live in `.env` (`EXPO_PUBLIC_*`); any LLM key lives in the Edge Function.
