import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutRectangle, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { BetHealthBar } from '@/components/BetHealthBar';
import { MoneyCounter } from '@/components/MoneyCounter';
import { EventFeed } from '@/components/EventFeed';
import { PayoutCoin, type CoinSpec } from '@/components/PayoutCoin';
import { colors, radius, space, type } from '@/lib/theme';
import { DEMO } from '@/lib/demo';
import { backend, USING_MOCK } from '@/lib/backend';
import { usePot } from '@/hooks/usePotRealtime';
import { useIdentity } from '@/hooks/useIdentity';
import { useProfile } from '@/hooks/useProfile';
import { getArchetype } from '@/lib/archetypes';
import { recordTransaction, resolveWindowEnd, simulateDay, resetDemo, syncAccount } from '@/lib/pots';
import { useLastSync, markSynced, relativeTime, isStale } from '@/lib/sync';
import type { BetType, Pot, PotMember } from '@/lib/types';

const COIN = 44;

const BET_LABEL: Record<BetType, string> = {
  spend_freeze: 'Spend Freeze',
  save_race: 'Save Race',
  target_commit: 'Target Commit',
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function Home() {
  const me = useIdentity();
  const profile = useProfile();
  const router = useRouter();
  const myArche = getArchetype(profile.archetype);
  const lastSync = useLastSync(me.id);

  const [pots, setPots] = useState<Pot[]>([]);
  const [focusedId, setFocusedId] = useState<string>(DEMO.POT_ID);

  const loadPots = useCallback(async () => {
    const list = await backend.getPotsForUser(me.id);
    setPots(list);
    if (list.length && !list.some((p) => p.id === focusedId)) setFocusedId(list[0].id);
  }, [me.id, focusedId]);

  useEffect(() => {
    loadPots();
  }, [me.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { pot, members, events, loading, refresh } = usePot(focusedId);

  const rects = useRef<Record<string, LayoutRectangle>>({});
  const [measureTick, setMeasureTick] = useState(0);
  const processed = useRef<Set<string>>(new Set());
  const [coins, setCoins] = useState<CoinSpec[]>([]);

  const onMeasure = (userId: string, layout: LayoutRectangle) => {
    rects.current[userId] = layout;
    setMeasureTick((t) => t + 1);
  };

  useEffect(() => {
    const next: CoinSpec[] = [];
    for (const e of events) {
      if (e.kind !== 'redistribute' || processed.current.has(e.id)) continue;
      const fromId = e.payload?.fromUserId as string | undefined;
      const toId = e.payload?.toUserId as string | undefined;
      const fromRect = fromId ? rects.current[fromId] : undefined;
      const toRect = toId ? rects.current[toId] : undefined;
      if (!fromRect || !toRect) continue;
      processed.current.add(e.id);
      next.push({
        id: e.id,
        amount: (e.payload?.amount as number) ?? 0,
        from: { x: center(fromRect).x, y: center(fromRect).y },
        to: { x: center(toRect).x, y: center(toRect).y },
      });
    }
    if (next.length) setCoins((c) => [...c, ...next]);
  }, [events, measureTick]);

  const onCoinArrive = (id: string) => setCoins((c) => c.filter((x) => x.id !== id));

  const lowerBetter = pot?.bet_type === 'spend_freeze';
  const ordered = [...members].sort((a, b) => {
    const brokenRank = (m: PotMember) => (m.status === 'broken' ? 1 : 0);
    if (brokenRank(a) !== brokenRank(b)) return brokenRank(a) - brokenRank(b);
    return lowerBetter
      ? a.current_value_pence - b.current_value_pence
      : b.current_value_pence - a.current_value_pence;
  });
  const activeOrdered = ordered.filter((m) => m.status !== 'broken');
  const myMember = members.find((m) => m.user_id === me.id);
  const myRank = activeOrdered.findIndex((m) => m.user_id === me.id) + 1;
  const daysLeft = pot
    ? Math.max(0, Math.ceil((new Date(pot.window_end).getTime() - Date.now()) / 86400000))
    : 0;

  // §5: pull my standing from the connected bank (replaces "I held today").
  const [syncing, setSyncing] = useState(false);
  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncAccount(focusedId, me.id);
      markSynced(me.id);
    } finally {
      setSyncing(false);
    }
  };

  // Dev actions
  const onSimulate = () => simulateDay(focusedId);
  const tomBuysCoffee = () =>
    recordTransaction(DEMO.POT_ID, DEMO.TOM_ID, 'Black Sheep Coffee', 'cafe', 3000);
  const forceWindowEnd = () => resolveWindowEnd(focusedId);
  const onReset = async () => {
    processed.current = new Set();
    setCoins([]);
    await resetDemo();
    await loadPots();
    refresh();
  };

  return (
    <Screen glow="lime">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header + archetype badge */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hi}>Hey {me.display_name}</Text>
            <Text style={styles.kicker}>{USING_MOCK ? 'DEMO · LOCAL' : 'LIVE'}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{myArche.emoji}</Text>
            <Text style={styles.badgeText}>{myArche.title}</Text>
          </View>
        </View>

        {/* Pot switcher */}
        {pots.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcher}>
            {pots.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setFocusedId(p.id)}
                style={[styles.potChip, p.id === focusedId && styles.potChipOn]}>
                <Text style={[styles.potChipText, p.id === focusedId && { color: colors.black }]}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Hero */}
        <View style={styles.totalCard}>
          <Text style={styles.potName}>{pot?.name ?? 'Loading…'}</Text>
          <Text style={styles.betType}>{pot ? BET_LABEL[pot.bet_type] : ''}</Text>
          <MoneyCounter
            value={pot?.pot_total_pence ?? 0}
            wholePounds
            style={styles.totalValue}
            color={colors.lime}
          />
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>⏳ {daysLeft} days left</Text>
            {myMember && myRank > 0 && (
              <Text style={styles.metaText}>
                You’re {ordinal(myRank)} of {activeOrdered.length}
              </Text>
            )}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.board}>
          {pot &&
            ordered.map((m) => (
              <LeaderRow
                key={m.id}
                member={m}
                pot={pot}
                isMe={m.user_id === me.id}
                lowerBetter={!!lowerBetter}
                onMeasure={onMeasure}
              />
            ))}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {coins.map((spec) => (
              <PayoutCoin key={spec.id} spec={spec} onArrive={onCoinArrive} />
            ))}
          </View>
        </View>

        {loading && members.length === 0 && (
          <Text style={styles.loading}>Loading the pot…</Text>
        )}

        {/* §5: account sync replaces self-reported check-in. */}
        {myMember && myMember.status === 'active' && (
          <View style={styles.syncCard}>
            {isStale(lastSync) && (
              <View style={styles.nudge}>
                <Text style={styles.nudgeText}>⏳ You haven’t synced today — update your standing.</Text>
              </View>
            )}
            <View style={styles.syncHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.syncTitle}>Sync your account</Text>
                <Text style={styles.syncMeta}>Last synced {relativeTime(lastSync)} · from your bank</Text>
              </View>
            </View>
            <Button
              label={syncing ? 'Syncing…' : 'Sync now'}
              onPress={onSync}
              loading={syncing}
            />
          </View>
        )}

        {/* Pod → Buckets shortcut (§7a). */}
        <Pressable onPress={() => router.push('/(tabs)/buckets')} style={styles.bucketLink}>
          <Text style={styles.bucketLinkText}>🪣 Plan your money in Buckets</Text>
          <Text style={styles.bucketLinkArrow}>→</Text>
        </Pressable>

        {/* Feed */}
        <Card title="Live feed" style={{ marginTop: space.sm }}>
          <EventFeed events={events} />
        </Card>

        <Button label="+ Start a new POT" variant="secondary" onPress={() => router.push('/create')} />

        {/* Dev row */}
        <View style={styles.devRow}>
          <Text style={styles.devLabel}>⚙︎ DEMO CONTROLS (acting as {me.display_name})</Text>
          <View style={styles.devButtons}>
            <Button label="Simulate a day" small onPress={onSimulate} />
            <Button label="Force window end" variant="secondary" small onPress={forceWindowEnd} />
          </View>
          <View style={styles.devButtons}>
            <Button label="Tom buys a £30 coffee" variant="danger" small onPress={tomBuysCoffee} />
            <Button label="Reset demo" variant="ghost" small onPress={onReset} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function LeaderRow({
  member,
  pot,
  isMe,
  lowerBetter,
  onMeasure,
}: {
  member: PotMember;
  pot: Pot;
  isMe: boolean;
  lowerBetter: boolean;
  onMeasure: (userId: string, layout: LayoutRectangle) => void;
}) {
  const broken = member.status === 'broken';
  const archetype = getArchetype(member.archetype);
  const value = lowerBetter ? member.spent_pence : member.current_value_pence;
  const metric = lowerBetter ? 'spent' : 'saved';

  const arrow =
    member.prev_rank != null && member.rank != null && member.prev_rank !== member.rank
      ? member.prev_rank > member.rank
        ? { glyph: '▲', color: colors.lime }
        : { glyph: '▼', color: colors.red }
      : { glyph: '–', color: colors.textMute };

  const saveRatio =
    pot.threshold_pence > 0 ? Math.min(member.current_value_pence / pot.threshold_pence, 1) : 0;

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18)}
      onLayout={(e) => onMeasure(member.user_id, e.nativeEvent.layout)}
      style={[styles.row, broken && styles.brokenRow, isMe && !broken && styles.meRow]}>
      <View style={styles.rankCol}>
        <Text style={styles.rankNum}>{broken ? '—' : (member.rank ?? '·')}</Text>
        <Text style={[styles.arrow, { color: arrow.color }]}>{arrow.glyph}</Text>
      </View>
      <Avatar
        emoji={member.avatar_emoji ?? archetype.emoji}
        size={42}
        ring={broken ? 'red' : member.status === 'won' ? 'lime' : isMe ? 'lime' : 'none'}
      />
      <View style={styles.rowMid}>
        <View style={styles.nameLine}>
          <Text style={styles.name}>{member.display_name ?? 'Member'}</Text>
          {isMe && <Text style={styles.youTag}>YOU</Text>}
        </View>
        {lowerBetter ? (
          <BetHealthBar
            spentPence={member.spent_pence}
            thresholdPence={pot.threshold_pence}
            category={pot.category}
            status={member.status}
            comparator={pot.comparator}
            compact
          />
        ) : (
          <View style={styles.saveTrack}>
            <View style={[styles.saveFill, { width: `${Math.max(saveRatio * 100, 3)}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.rowRight}>
        <MoneyCounter
          value={value}
          style={styles.rowValue}
          color={broken ? colors.textMute : colors.text}
        />
        <Text style={styles.rowMetric}>{metric}</Text>
      </View>
    </Animated.View>
  );
}

function center(r: LayoutRectangle) {
  return { x: r.x + r.width / 2 - COIN / 2, y: r.y + r.height / 2 - COIN / 2 };
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hi: { ...type.title, color: colors.text },
  kicker: { ...type.micro, color: colors.lime, letterSpacing: 1.4, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeEmoji: { fontSize: 16 },
  badgeText: { ...type.label, color: colors.text },
  switcher: { gap: 8, paddingVertical: 2 },
  potChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLo,
    borderWidth: 1,
    borderColor: colors.border,
  },
  potChipOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  potChipText: { ...type.label, color: colors.text },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: space.lg,
    alignItems: 'center',
    gap: 2,
  },
  potName: { ...type.h2, color: colors.text },
  betType: { ...type.micro, color: colors.lime, letterSpacing: 1.2 },
  totalValue: { fontSize: 64, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  metaText: { ...type.caption, color: colors.textDim },
  board: { gap: 10, position: 'relative' },
  loading: { ...type.body, color: colors.textMute, textAlign: 'center', paddingVertical: space.lg },
  syncCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 12,
  },
  syncHead: { flexDirection: 'row', alignItems: 'center' },
  syncTitle: { ...type.h3, color: colors.text },
  syncMeta: { ...type.caption, color: colors.textDim, marginTop: 2 },
  nudge: {
    backgroundColor: 'rgba(255,210,74,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,210,74,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nudgeText: { ...type.caption, color: colors.gold },
  bucketLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bucketLinkText: { ...type.label, color: colors.text },
  bucketLinkArrow: { ...type.h3, color: colors.lime },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  meRow: { borderColor: 'rgba(200,255,0,0.4)' },
  brokenRow: { borderColor: 'rgba(255,77,77,0.5)', backgroundColor: 'rgba(255,77,77,0.06)' },
  rankCol: { alignItems: 'center', width: 22 },
  rankNum: { ...type.h3, color: colors.text },
  arrow: { ...type.micro },
  rowMid: { flex: 1, gap: 6 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...type.h3, color: colors.text },
  youTag: {
    ...type.micro,
    color: colors.black,
    backgroundColor: colors.lime,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  saveTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLo,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.lime },
  rowRight: { alignItems: 'flex-end', minWidth: 64 },
  rowValue: { fontSize: 18 },
  rowMetric: { ...type.micro, color: colors.textMute },
  devRow: {
    marginTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
    gap: 10,
  },
  devLabel: { ...type.micro, color: colors.textMute, letterSpacing: 1 },
  devButtons: { flexDirection: 'row', gap: 10 },
});
