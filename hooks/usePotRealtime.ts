import { useCallback, useEffect, useRef, useState } from 'react';
import { backend } from '@/lib/backend';
import type { Pot, PotEvent, PotMember } from '@/lib/types';
import { DEMO_USERS } from '@/lib/demo';

interface PotState {
  pot: Pot | null;
  members: PotMember[];
  events: PotEvent[];
  loading: boolean;
  error: string | null;
}

// Decorate a realtime member row (which lacks joined user fields) with display
// info from the known demo users.
function decorate(m: PotMember): PotMember {
  if (m.display_name) return m;
  const u = DEMO_USERS.find((x) => x.id === m.user_id);
  return u
    ? { ...m, display_name: u.display_name, avatar_emoji: u.avatar_emoji, archetype: u.archetype }
    : m;
}

export function usePot(potId: string) {
  const [state, setState] = useState<PotState>({
    pot: null,
    members: [],
    events: [],
    loading: true,
    error: null,
  });
  const seenEvents = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const [pot, members, events] = await Promise.all([
        backend.getPot(potId),
        backend.getMembers(potId),
        backend.getEvents(potId),
      ]);
      events.forEach((e) => seenEvents.current.add(e.id));
      setState({
        pot,
        members: members.map(decorate).sort(sortMembers),
        events,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message ?? 'Failed to load pot' }));
    }
  }, [potId]);

  useEffect(() => {
    refresh();

    const unsub = backend.subscribe(potId, {
      onMember: (m) => {
        const dec = decorate(m);
        setState((s) => {
          const idx = s.members.findIndex((x) => x.id === dec.id);
          let members: PotMember[];
          if (idx === -1) members = [...s.members, dec];
          else {
            members = [...s.members];
            // Preserve display info we already had.
            members[idx] = { ...members[idx], ...dec };
          }
          return { ...s, members: members.sort(sortMembers) };
        });
      },
      onEvent: (e) => {
        if (seenEvents.current.has(e.id)) return;
        seenEvents.current.add(e.id);
        setState((s) => ({ ...s, events: [...s.events, e] }));
      },
      onPot: (p) => setState((s) => ({ ...s, pot: p })),
    });

    return unsub;
  }, [potId, refresh]);

  return { ...state, refresh };
}

function sortMembers(a: PotMember, b: PotMember): number {
  // Holders/winners first by stake desc, broken sink to the bottom.
  const rank = (m: PotMember) => (m.status === 'broken' ? 1 : 0);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return b.stake_pence - a.stake_pence;
}
