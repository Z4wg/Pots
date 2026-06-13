import { useEffect, useRef, useState } from 'react';
import { LayoutRectangle, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { MemberTile } from '@/components/MemberTile';
import { MoneyCounter } from '@/components/MoneyCounter';
import { CheckInButton } from '@/components/CheckInButton';
import { EventFeed } from '@/components/EventFeed';
import { PayoutCoin, type CoinSpec } from '@/components/PayoutCoin';
import { colors, radius, space, type } from '@/lib/theme';
import { DEMO } from '@/lib/demo';
import { USING_MOCK } from '@/lib/backend';
import { usePot } from '@/hooks/usePotRealtime';
import { useIdentity } from '@/hooks/useIdentity';
import { recordTransaction, resolveWindowEnd, checkIn } from '@/lib/pots';
import { resetDemo } from '@/lib/seed';

const COIN = 44;

export default function PotScreen() {
  const me = useIdentity();
  const { pot, members, events, loading, error, refresh } = usePot(DEMO.POT_ID);

  const rects = useRef<Record<string, LayoutRectangle>>({});
  const [measureTick, setMeasureTick] = useState(0);
  const processed = useRef<Set<string>>(new Set());
  const [coins, setCoins] = useState<CoinSpec[]>([]);

  const onMeasure = (userId: string, layout: LayoutRectangle) => {
    rects.current[userId] = layout;
    setMeasureTick((t) => t + 1);
  };

  // Turn incoming 'redistribute' events into flying coins (the payout slide).
  useEffect(() => {
    const next: CoinSpec[] = [];
    for (const e of events) {
      if (e.kind !== 'redistribute' || processed.current.has(e.id)) continue;
      const fromId = e.payload?.fromUserId as string | undefined;
      const toId = e.payload?.toUserId as string | undefined;
      const fromRect = fromId ? rects.current[fromId] : undefined;
      const toRect = toId ? rects.current[toId] : undefined;
      if (!fromRect || !toRect) continue; // wait until both tiles measured
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

  const myMember = members.find((m) => m.user_id === me.id);
  const allResolved = members.length > 0 && members.every((m) => m.status !== 'active');

  // Dev actions ------------------------------------------------------------
  const tomBuysCoffee = () =>
    recordTransaction(DEMO.POT_ID, DEMO.TOM_ID, 'Black Sheep Coffee', 'cafe', 3000);
  const forceWindowEnd = () => resolveWindowEnd(DEMO.POT_ID);
  const onReset = async () => {
    processed.current = new Set();
    setCoins([]);
    await resetDemo();
    refresh();
  };

  return (
    <Screen glow={allResolved ? 'lime' : 'lime'}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{USING_MOCK ? 'DEMO POT · LOCAL' : 'LIVE POT'}</Text>
            <Text style={styles.potName}>{pot?.name ?? 'Loading…'}</Text>
            <Text style={styles.goal}>{pot?.goal_label ?? ''}</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>POT TOTAL</Text>
          <MoneyCounter
            value={pot?.pot_total_pence ?? 0}
            wholePounds
            style={styles.totalValue}
            color={colors.lime}
          />
          <Text style={styles.totalSub}>
            {members.length} {members.length === 1 ? 'player' : 'players'} ·{' '}
            {members.filter((m) => m.status === 'active').length} still holding
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Member tiles + flying coins overlay */}
        <View style={styles.board}>
          {members.map((m) => (
            <MemberTile
              key={m.id}
              member={m}
              pot={pot!}
              isMe={m.user_id === me.id}
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
          <Text style={styles.loading}>Connecting to the pot…</Text>
        )}

        {/* Check in */}
        {myMember && myMember.status === 'active' ? (
          <CheckInButton onCheckIn={() => checkIn(DEMO.POT_ID, me.id)} />
        ) : myMember ? (
          <Animated.View entering={FadeIn} style={styles.resolvedBanner}>
            <Text
              style={[
                styles.resolvedText,
                { color: myMember.status === 'broken' ? colors.red : colors.lime },
              ]}>
              {myMember.status === 'broken'
                ? 'You broke your bet. Your stake moved on.'
                : 'You held the line. 🏆'}
            </Text>
          </Animated.View>
        ) : null}

        {/* Live feed */}
        <Card title="Live feed" style={{ marginTop: space.sm }}>
          <EventFeed events={events} />
        </Card>

        {/* Dev row — clearly separated */}
        <View style={styles.devRow}>
          <Text style={styles.devLabel}>⚙︎ DEMO CONTROLS (acting as {me.display_name})</Text>
          <View style={styles.devButtons}>
            <Button label="Tom buys a £30 coffee" variant="danger" small onPress={tomBuysCoffee} />
            <Button label="Force window end" variant="secondary" small onPress={forceWindowEnd} />
          </View>
          <Button label="Reset demo" variant="ghost" small onPress={onReset} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function center(r: LayoutRectangle) {
  return { x: r.x + r.width / 2 - COIN / 2, y: r.y + r.height / 2 - COIN / 2 };
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { ...type.micro, color: colors.lime, letterSpacing: 1.4 },
  potName: { ...type.title, color: colors.text, marginTop: 4 },
  goal: { ...type.body, color: colors.textDim, marginTop: 2 },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: space.lg,
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: { ...type.micro, color: colors.textDim, letterSpacing: 1.5 },
  totalValue: { fontSize: 72 },
  totalSub: { ...type.caption, color: colors.textDim },
  error: { ...type.caption, color: colors.red },
  board: { gap: space.md, position: 'relative' },
  loading: { ...type.body, color: colors.textMute, textAlign: 'center', paddingVertical: space.lg },
  resolvedBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
  },
  resolvedText: { ...type.h3 },
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
