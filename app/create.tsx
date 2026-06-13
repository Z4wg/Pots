import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { getArchetype } from '@/lib/archetypes';
import { getProvider } from '@/lib/bankSeed';
import { backend } from '@/lib/backend';
import { useIdentity } from '@/hooks/useIdentity';
import { useProfile, completeOnboarding } from '@/hooks/useProfile';
import type { BankConnection, BetType, Comparator, NewPotInput, PayoutRule } from '@/lib/types';

const BET_TYPES: { key: BetType; label: string; desc: string }[] = [
  { key: 'spend_freeze', label: 'Spend Freeze', desc: 'Lowest spend in a category wins.' },
  { key: 'save_race', label: 'Save Race', desc: 'Grow your savings the most.' },
  { key: 'target_commit', label: 'Target Commit', desc: 'First to hit your own target.' },
];

const CATS: { key: string; label: string }[] = [
  { key: 'cafe', label: 'Cafés' },
  { key: 'going_out', label: 'Going out' },
  { key: 'grocery', label: 'Groceries' },
  { key: 'transport', label: 'Transport' },
];

const PAYOUTS: { key: PayoutRule; label: string }[] = [
  { key: 'winner_takes_all', label: 'Winner takes all' },
  { key: 'split_winners', label: 'Split among everyone who hits their goal' },
  { key: 'loser_buys', label: 'Loser buys dinner (no money moves)' },
];

const GOAL_DEFAULTS: Record<BetType, number> = {
  spend_freeze: 8000,
  save_race: 20000,
  target_commit: 20000,
};

export default function Create() {
  const router = useRouter();
  const me = useIdentity();
  const profile = useProfile();
  const a = getArchetype(profile.archetype);

  const [name, setName] = useState('No-Takeout Challenge');
  const [betType, setBetType] = useState<BetType>('spend_freeze');
  const [category, setCategory] = useState<string>(a.betCategory === 'savings' ? 'cafe' : a.betCategory);
  const [days, setDays] = useState(30);
  const [stake, setStake] = useState(profile.stakePence);
  const [goal, setGoal] = useState(GOAL_DEFAULTS.spend_freeze);
  const [payout, setPayout] = useState<PayoutRule>('winner_takes_all');
  const [stakePaid, setStakePaid] = useState(false);
  const [connection, setConnection] = useState<BankConnection | null>(null);
  const [creating, setCreating] = useState(false);
  const [blocker, setBlocker] = useState<'bank' | 'stake' | 'name' | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const stakeY = useRef(0);

  useEffect(() => {
    let alive = true;
    backend.getBankConnection(me.id).then((c) => alive && setConnection(c));
    return () => {
      alive = false;
    };
  }, [me.id]);

  // Exit the flow (✕). From a tab → back; from onboarding → into the app.
  const exitFlow = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const chooseBetType = (key: BetType) => {
    Haptics.selectionAsync().catch(() => {});
    setBetType(key);
    setGoal(GOAL_DEFAULTS[key]);
  };

  const bump = (set: (n: number) => void, val: number, delta: number, min = 100) =>
    () => {
      set(Math.max(min, val + delta));
      Haptics.selectionAsync().catch(() => {});
    };

  const pay = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStakePaid(true);
    setBlocker((b) => (b === 'stake' ? null : b));
  };

  const isFreeze = betType === 'spend_freeze';
  const catLabel = CATS.find((c) => c.key === category)?.label ?? category;
  const goalLabel = isFreeze
    ? `Spend under ${formatPence(goal)} on ${catLabel.toLowerCase()}`
    : betType === 'save_race'
    ? `Grow savings the most (target ${formatPence(goal)})`
    : `First to hit your ${formatPence(goal)} target`;

  const canCreate = !!connection && stakePaid && name.trim().length > 0 && !creating;

  // The button is always tappable; if a requirement is missing we point the user
  // at it (highlight + scroll + haptic) instead of silently doing nothing.
  const attemptCreate = async () => {
    if (creating) return;
    if (!connection) {
      setBlocker('bank');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    if (!stakePaid) {
      setBlocker('stake');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      scrollRef.current?.scrollTo({ y: Math.max(stakeY.current - 24, 0), animated: true });
      return;
    }
    if (!name.trim()) {
      setBlocker('name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setBlocker(null);
    setCreating(true);
    const comparator: Comparator = isFreeze ? 'under' : 'atleast';
    const input: NewPotInput = {
      name: name.trim(),
      goal_label: goalLabel,
      bet_type: betType,
      category: isFreeze ? category : 'savings',
      comparator,
      threshold_pence: goal,
      window_end: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      stake_pence: stake,
      payout_rule: payout,
      personal_goal_pence: goal,
    };
    try {
      const pot = await backend.createPot(input, me.id);
      router.push(`/invite/${pot.id}`);
    } finally {
      setCreating(false);
    }
  };

  const blockerMsg =
    blocker === 'bank'
      ? 'Connect your bank first — scroll down to “Connect your bank.”'
      : blocker === 'stake'
      ? '⚠️ Pay your stake above to unlock — tap “Pay stake.”'
      : blocker === 'name'
      ? 'Give your pot a name first.'
      : null;

  return (
    <Screen onClose={exitFlow}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Start a POT</Text>
        <Text style={styles.sub}>Set the bet. Your friends hold you to it.</Text>

        <Card title="Pot name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name your pot"
            placeholderTextColor={colors.textMute}
            style={styles.input}
          />
        </Card>

        <Card title="Bet type">
          <View style={styles.betTypes}>
            {BET_TYPES.map((b) => (
              <Pressable
                key={b.key}
                onPress={() => chooseBetType(b.key)}
                style={[styles.betType, betType === b.key && styles.betTypeOn]}>
                <Text style={[styles.betTypeLabel, betType === b.key && { color: colors.lime }]}>
                  {b.label}
                </Text>
                <Text style={styles.betTypeDesc}>{b.desc}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {isFreeze && (
          <Card title="Category">
            <View style={styles.chips}>
              {CATS.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    setCategory(c.key);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={[styles.chip, category === c.key && styles.chipOn]}>
                  <Text style={[styles.chipText, category === c.key && { color: colors.black }]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        <Card title={isFreeze ? 'Your cap' : 'Your target'}>
          <View style={styles.stepRow}>
            <Stepper label="–" onPress={bump(setGoal, goal, -500, 500)} />
            <View style={styles.stepMid}>
              <Text style={styles.stepValue}>{formatPence(goal)}</Text>
              <Text style={styles.stepHint}>{goalLabel}</Text>
            </View>
            <Stepper label="+" onPress={bump(setGoal, goal, 500, 500)} />
          </View>
        </Card>

        <Card title="Duration">
          <View style={styles.chips}>
            {[7, 30, 90].map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDays(d);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={[styles.chip, days === d && styles.chipOn]}>
                <Text style={[styles.chipText, days === d && { color: colors.black }]}>{d} days</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <View onLayout={(e) => (stakeY.current = e.nativeEvent.layout.y)}>
          <Card title="Stake (per person)" style={blocker === 'stake' ? styles.cardWarn : undefined}>
            <View style={styles.stepRow}>
              <Stepper label="–" onPress={bump(setStake, stake, -100)} />
              <View style={styles.stepMid}>
                <Text style={styles.stepValue}>{formatPence(stake)}</Text>
                <Text style={styles.stepHint}>into the pot</Text>
              </View>
              <Stepper label="+" onPress={bump(setStake, stake, 100)} />
            </View>
            {stakePaid ? (
              <Animated.View entering={FadeIn} style={styles.paidRow}>
                <Text style={styles.paidText}>✓ Paid {formatPence(stake)}</Text>
              </Animated.View>
            ) : (
              <>
                <Button label={`Pay ${formatPence(stake)} stake`} onPress={pay} />
                <Text style={[styles.hint, blocker === 'stake' && styles.hintWarn]}>
                  {blocker === 'stake'
                    ? '⚠️ Required — pay your stake to create the pot.'
                    : 'Required — your skin in the game.'}
                </Text>
              </>
            )}
          </Card>
        </View>

        <Card title="Payout rule">
          <View style={{ gap: 8 }}>
            {PAYOUTS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => {
                  setPayout(p.key);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={styles.radioRow}>
                <View style={[styles.radio, payout === p.key && styles.radioOn]}>
                  {payout === p.key && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {!connection && (
          <Card title="Connect your bank" style={blocker === 'bank' ? styles.cardWarn : undefined}>
            <Button label="Connect your bank" onPress={() => router.push('/connect')} />
            <Text style={[styles.hint, blocker === 'bank' && styles.hintWarn]}>
              Required — the bank tracks the bet.
            </Text>
          </Card>
        )}
        {connection && (
          <Text style={styles.connHint}>
            ● {getProvider(connection.provider).name} connected · {formatPence(connection.balance_pence)}
          </Text>
        )}

        {blockerMsg && (
          <Animated.View entering={FadeIn} style={styles.blocker}>
            <Text style={styles.blockerText}>{blockerMsg}</Text>
          </Animated.View>
        )}

        <Button
          label={creating ? 'Creating…' : 'Create pot →'}
          onPress={attemptCreate}
          loading={creating}
          variant={canCreate ? 'primary' : 'secondary'}
        />
      </ScrollView>
    </Screen>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.7 }]}>
      <Text style={styles.stepperText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: 12, paddingBottom: space.xxl },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim, marginTop: -6, marginBottom: 2 },
  input: { ...type.h3, color: colors.text, paddingVertical: 4 },
  betTypes: { gap: 8 },
  betType: {
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 2,
  },
  betTypeOn: { borderColor: colors.lime, backgroundColor: colors.surfaceHi },
  betTypeLabel: { ...type.h3, color: colors.text },
  betTypeDesc: { ...type.caption, color: colors.textDim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLo,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { ...type.label, color: colors.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepMid: { alignItems: 'center', gap: 2, flex: 1 },
  stepValue: { ...type.hero, fontSize: 34, color: colors.lime },
  stepHint: { ...type.caption, color: colors.textMute, textAlign: 'center' },
  stepper: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { ...type.title, color: colors.text },
  paidRow: { alignItems: 'center', paddingVertical: 8 },
  paidText: { ...type.h3, color: colors.lime },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.lime },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime },
  radioLabel: { ...type.body, color: colors.text, flex: 1 },
  hint: { ...type.caption, color: colors.textMute, marginTop: 2 },
  hintWarn: { color: colors.gold },
  connHint: { ...type.caption, color: colors.lime, textAlign: 'center' },
  cardWarn: { borderColor: colors.gold },
  blocker: {
    backgroundColor: 'rgba(255,210,74,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,210,74,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  blockerText: { ...type.label, color: colors.gold, textAlign: 'center' },
});
