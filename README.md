# Pots 🫙

**Bet on your budget. Your friends hold you to it. The disciplined ones get paid.**
Loud budgeting with skin in the game.

Pots is a Gen Z social budgeting app. Friends put real money (simulated as integer
**pence** in this build) into a shared **pot** and bet it on sticking to their own
budget. Hold your goal and you keep your stake. Break it and your stake is automatically
taken and redistributed to the friends who held theirs.

> **The single most important rule:** a bet is won or lost **only by transaction data,
> never by a person**. No user, not even the bettor, can tap "I won" or "you lost." The
> system reads spending / savings from the connected (mocked) bank and resolves
> automatically. This is _"the bank is the referee."_ `status` can only change inside
> `recordTransaction` / `syncAccount` (data) or `resolveWindowEnd` (the scheduled
> window-end resolver). `breakBet` is idempotent.

## Bet types

- **Spend Freeze** — keep a category (cafés, going out, …) under a cap. Cross it and you
  break. Lowest spender wins. (This is the bet behind the payout-slide demo.)
- **Save Race** — grow your savings the most over the window.
- **Target Commit** — first to hit your own personal target.

## Stack

- **Expo SDK 54**, React Native 0.81, TypeScript
- **Expo Router** (file-based routing in `/app`), bottom tabs
- **Supabase** (Postgres + Realtime via `postgres_changes`) for cross-device sync. No
  auth — runs as `anon` with two hardcoded demo user IDs behind a dev toggle
- **react-native-reanimated v4** + **react-native-gesture-handler** for animation and the
  swipe quiz, **expo-haptics** for haptics, **expo-linking** for invite deep links,
  **react-native-qrcode-svg** for invite QR codes

React Native primitives only. No HTML tags. Money is always integer pence; formatted on
display only. Invite / bucket / sync state is held in small local stores (AsyncStorage),
seeded and reset by the "Reset demo" button.

## Run it

```bash
npm install            # restore JS deps
npx expo start         # then press i / a, or scan the QR with Expo Go
```

The app runs **out of the box with no setup** using an in-memory mock backend, so the
full demo flow (including the payout slide) works on a single phone immediately. To get
**real two-phone realtime sync**, connect Supabase (below).

### Connect Supabase (for two-phone realtime)

1. Create a Supabase project.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) then
   [`supabase/seed.sql`](supabase/seed.sql).
3. Copy [`.env.example`](.env.example) to `.env` and set your project's values
   (Project Settings → API):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   No code edit needed — the app reads these at startup. (Alternatively, hardcode the
   `FALLBACK_URL` / `FALLBACK_ANON_KEY` constants in
   [`lib/supabase.ts`](lib/supabase.ts) for a quick demo.)
4. Restart `npx expo start`. The app auto-detects the keys and switches from the mock
   backend to live Supabase realtime. The header shows **LIVE** instead of
   **DEMO · LOCAL**.

**Verify realtime first:** edit a `pot_members` row in the Supabase dashboard and watch
the bet-health bar / stake update live on the phone before anything else.

> ⚠️ **The RLS policies in `schema.sql` are DEMO-ONLY** — they let the `anon` role read
> and write everything so the no-auth demo works. Do **not** ship them to production.
> Real apps need auth and row-scoped policies.

### Two phones

- **Phone A = Maya** (The Vault 🦊), **Phone B = Tom** (The Baller 🐢).
- Switch identity on the **Squad** tab → "Demo identity" (or open an invite link, which
  joins as Tom). On two physical devices each picks an identity; with Supabase connected
  they share live state.

## The flow

1. **Find your money type** — a binary swipe quiz (drag a card left/right; the matching
   answer rises and highlights). Six questions → one of six archetypes, with a shareable
   result card.
2. **Connect your bank** — a fully mocked Open Banking flow: pick a provider (Revolut
   recommended, Monzo, Starling, …) → a bank-styled OAuth consent (Allow / Deny) →
   **choose which account to connect** (Personal vs Savings; the Savings account is what
   the pot tracks) → "connecting…" → connected, with balances + recent transactions.
3. **Start a pot** — pick a bet type, set the cap/target, stake, duration and payout rule.
4. **Invite your squad** — one invite component (email / shareable link / QR). Invited
   people appear immediately with an **Invited** label; a couple start **Joined**.
5. **Play** — your standing is pulled from the bank via **Sync** (no self-reporting). The
   leaderboard, live feed and payout slide all run off that data.

## The demo script (the wow)

1. Both phones show the seeded pot alive: **Maya** £5 staked / £60 spent / streak 4;
   **Tom** £5 staked / £96 spent / streak 3; **pot £10**. A nudge reminds you to sync.
2. Phone A (Maya) taps **"Sync now"** → her standing is pulled from the (mock) bank, the
   "Last synced" indicator updates, and both phones' feeds show _"Maya synced…"._
3. The presenter taps **"Tom buys a £30 coffee"** (dev row on the Pot screen) — an
   in-category spend that pushes Tom over his cap. (Tapping **Sync** as Tom can do the
   same.)
4. On **both** phones: Tom's bet-health bar fills past £100 and turns **red**, his status
   flips to **BROKE**, his **£5 chip slides across the screen onto Maya's tile**, Maya's
   stake counts **£5 → £10** with a success haptic, and the feed shows
   _"£5 from Tom goes to Maya."_
5. The feed / leaderboard reflect the new standings.
6. **"Force window end"** marks any remaining holders as **WON**.

Tap **"Reset demo"** to return to the seeded starting state (pot, invites, buckets and
sync state all reload) and run it again.

## How resolution works (`lib/pots.ts`)

- `recordTransaction(potId, userId, merchant, category, amountPence)` — inserts the
  transaction, posts a `spend` feed event **only when the category matches the pot's
  metric**, and adds to the member's `spent_pence`. If that crosses the cap (`under`) or
  any spend happens (`nospend`), it auto-calls `breakBet`.
- `syncAccount(potId, userId)` — pulls a member's latest bank figures and updates their
  standing (in-category spend for a Spend Freeze, savings delta for a Save Race), posts a
  `sync` feed event, and recomputes ranks. For a Spend Freeze it can cross the cap and
  auto-break → firing the payout slide. **Replaces the old self-reported check-in.**
- `breakBet(potId, brokenId)` — **idempotent**. Zeroes the broken member's stake, splits
  it (`floor` share + remainder to the first holder) across active holders, and emits
  `redistribute` + `broke` events. Each holder save fires the payout slide on every phone.
- `resolveWindowEnd(potId)` — scheduled / dev button. Survivors become `won`.

Categorization is by the transaction's `category` field. In production this comes from
Open Banking / Revolut merchant + MCC codes; here the seed, sync and dev buttons set it
directly so resolution is deterministic. **No LLM ever decides win/loss.**

## Project structure

```
app/
  _layout.tsx            Root stack + local-store hydration
  index.tsx              Redirect: onboarding vs tabs
  onboarding.tsx         "Find your money type" — binary swipe archetype quiz
  connect.tsx            Mocked Open Banking: provider → consent → account picker → connected
  create.tsx             Set bet type, cap/target, stake, payout (requires bank connected)
  invite/[potId].tsx     Invite squad — email / link / QR with Invited/Joined list
  join/[code].tsx        Invite deep link (pots://join/POTS42)
  (tabs)/
    index.tsx            POT — hero, leaderboard, Sync, live feed, payout slide, dev row
    buckets.tsx          Personal planning buckets (targets + progress) + Coach entry
    coach.tsx            Scripted bucket-builder, tuned to your archetype
    squad.tsx            Friends + archetype badges + standing + identity toggle
components/              InviteSheet, TabActions, MoneyCounter, PayoutCoin, BetHealthBar,
                         Avatar, StatusPill, Card, Button, Screen, EventFeed, ResultCard
hooks/                   usePotRealtime (usePot), useIdentity, useProfile
lib/                     supabase, backend (+ mock), pots, types, money, theme, archetypes,
                         bankSeed, invites, buckets, sync, friends, demo, seed/seedData
supabase/               schema.sql, seed.sql, functions/coach (optional Edge Function)
```

## The three animations

1. **Swipe quiz** (`onboarding.tsx`) — a Pan gesture drives the card; as you drag, the
   matching answer button rises and highlights live, then the card flies off and the next
   one fades in. Tapping a button works too.
2. **MoneyCounter** — animates the number with `withTiming(value, { duration: 600 })`,
   light impact haptic on change. Used for stakes and the pot total.
3. **PayoutSlide** (centerpiece) — a chip flies from the broken member's tile to each
   holder using `withTiming(target, { duration: 700, easing: Easing.out(Easing.exp) })`;
   tiles reflow with `LinearTransition.springify()`; on arrival the holder's MoneyCounter
   runs and a success haptic fires; the broken tile turns red.

## Buckets & Coach (planning layer)

Separate from the bets, **Buckets** is where you plan your own money — personal savings
goals (Holiday, Emergency fund, …) with a target and progress, reachable in one tap from
the Pot screen. **Coach** is a scripted, conversational bucket-builder tuned to your
archetype: it walks you through a couple of suggestions you accept, and the buckets appear
in the Buckets tab. (Scripted for the demo — no live LLM.) Every tab also exposes
**Create a pot** and **Invite friends**.

## Optional LLM coach

[`supabase/functions/coach`](supabase/functions/coach) is a Supabase Edge Function that
returns `{ headline, stake_risk, insights[], suggested_action, goal_projection }`. The
API key lives in the function's secrets, **never on the device**. It falls back to
deterministic rule-based JSON when no key is set. The coach only comments; it never
decides win/loss.

## Hard requirements honoured

- Money is integer pence everywhere; formatted on display only. No floats.
- `status` changes only in `recordTransaction` / `syncAccount` or `resolveWindowEnd`. No
  human sets won/lost. `breakBet` is idempotent.
- Visuals animate optimistically and reconcile from realtime.
- React Native primitives only. No HTML tags.
- Supabase keys live in `.env` (`EXPO_PUBLIC_*`); any LLM key lives in the Edge Function.
```
