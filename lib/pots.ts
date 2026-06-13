import { backend } from './backend';
import type { PotMember, EventKind } from './types';

// ===========================================================================
// CORE LOGIC: "the bank is the referee".
// A bet's `status` is mutated ONLY inside recordTransaction (via breakBet) or
// resolveWindowEnd. No human action ever sets won/lost. breakBet is idempotent.
// All money is integer pence.
// ===========================================================================

export async function insertEvent(
  potId: string,
  kind: EventKind,
  actorName: string | null,
  payload: Record<string, any> = {}
): Promise<void> {
  await backend.insertEvent({ pot_id: potId, kind, actor_name: actorName, payload });
}

async function saveMember(m: PotMember): Promise<void> {
  await backend.updateMember(m.id, {
    stake_pence: m.stake_pence,
    spent_pence: m.spent_pence,
    current_streak: m.current_streak,
    status: m.status,
  });
}

// ---------------------------------------------------------------------------
// recordTransaction — the ONLY data path that can break a bet.
// ---------------------------------------------------------------------------
export async function recordTransaction(
  potId: string,
  userId: string,
  merchant: string,
  category: string,
  amountPence: number
): Promise<void> {
  const name = await backend.getUserName(userId);

  await backend.insertTransaction({
    pot_id: potId,
    user_id: userId,
    merchant,
    category,
    amount_pence: amountPence,
  });

  await insertEvent(potId, 'spend', name, { merchant, category, amount: amountPence });

  const pot = await backend.getPot(potId);
  if (category !== pot.category) return;

  const m = await backend.getMember(potId, userId);
  if (!m || m.status !== 'active') return; // already resolved -> ignore

  m.spent_pence += amountPence;
  await saveMember(m); // fires realtime -> bet-health bar updates on both phones

  if (pot.comparator === 'under' && m.spent_pence > pot.threshold_pence) {
    await breakBet(potId, userId); // AUTO-break the instant the cap is crossed
  } else if (pot.comparator === 'nospend' && amountPence > 0) {
    await breakBet(potId, userId);
  }
}

// ---------------------------------------------------------------------------
// breakBet — idempotent. Moves the broken stake to active holders.
// ---------------------------------------------------------------------------
export async function breakBet(potId: string, brokenId: string): Promise<void> {
  const broken = await backend.getMember(potId, brokenId);
  if (!broken || broken.status !== 'active') return; // idempotent guard

  const pot = await backend.getPot(potId);
  const brokenName = await backend.getUserName(brokenId);
  const amount = broken.stake_pence;

  broken.status = 'broken';
  broken.stake_pence = 0;
  broken.current_streak = 0;
  await saveMember(broken);

  const all = await backend.getMembers(potId);
  const holders = all.filter((h) => h.status === 'active' && h.user_id !== brokenId);

  if (holders.length > 0 && amount > 0) {
    const share = Math.floor(amount / holders.length);
    const rem = amount - share * holders.length;
    for (let i = 0; i < holders.length; i++) {
      const h = holders[i];
      const add = share + (i === 0 ? rem : 0);
      h.stake_pence += add;
      await saveMember(h); // each save fires the payout-slide on both phones
      const hName = await backend.getUserName(h.user_id);
      await insertEvent(potId, 'redistribute', brokenName, {
        from: brokenName,
        to: hName,
        amount: add,
        toUserId: h.user_id,
        fromUserId: brokenId,
      });
    }
  }

  await insertEvent(potId, 'broke', brokenName, {
    category: pot.category,
    over: amount,
    userId: brokenId,
  });
}

// ---------------------------------------------------------------------------
// checkIn — streak only. NEVER resolves win/loss.
// ---------------------------------------------------------------------------
export async function checkIn(potId: string, userId: string): Promise<void> {
  const m = await backend.getMember(potId, userId);
  if (!m || m.status !== 'active') return;
  m.current_streak += 1;
  await saveMember(m);
  const name = await backend.getUserName(userId);
  await insertEvent(potId, 'check_in', name, { streak: m.current_streak });
}

// ---------------------------------------------------------------------------
// resolveWindowEnd — scheduled / dev button. Survivors win.
// ---------------------------------------------------------------------------
export async function resolveWindowEnd(potId: string): Promise<void> {
  const pot = await backend.getPot(potId);
  const members = await backend.getMembers(potId);
  for (const m of members) {
    if (m.status !== 'active') continue;
    if (pot.comparator === 'under' || pot.comparator === 'nospend') {
      m.status = 'won';
      await saveMember(m);
      const name = await backend.getUserName(m.user_id);
      await insertEvent(potId, 'won', name, { userId: m.user_id });
    } else if (pot.comparator === 'atleast') {
      if (m.spent_pence < pot.threshold_pence) {
        await breakBet(potId, m.user_id);
      } else {
        m.status = 'won';
        await saveMember(m);
        const name = await backend.getUserName(m.user_id);
        await insertEvent(potId, 'won', name, { userId: m.user_id });
      }
    }
  }
}

export async function recomputePotTotal(potId: string): Promise<void> {
  const members = await backend.getMembers(potId);
  const total = members.reduce((s, m) => s + m.stake_pence, 0);
  await backend.updatePotTotal(potId, total);
}

export async function resetDemo(): Promise<void> {
  await backend.resetDemo();
}
