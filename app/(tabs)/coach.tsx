import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { TabActions } from '@/components/TabActions';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { backend } from '@/lib/backend';
import { useIdentity } from '@/hooks/useIdentity';
import { useProfile } from '@/hooks/useProfile';
import { usePot } from '@/hooks/usePotRealtime';
import { DEMO } from '@/lib/demo';
import { getArchetype, type ArchetypeKey } from '@/lib/archetypes';
import { useBuckets, addBucket, hasBucket } from '@/lib/buckets';
import type { BankConnection } from '@/lib/types';

const CAT_META: Record<string, { label: string; emoji: string }> = {
  cafe: { label: 'Cafés', emoji: '☕' },
  going_out: { label: 'Going out', emoji: '🍸' },
  grocery: { label: 'Groceries', emoji: '🛒' },
  transport: { label: 'Transport', emoji: '🚌' },
  savings: { label: 'Savings', emoji: '🏦' },
};
const catLabel = (k: string) => CAT_META[k]?.label ?? k;

// A money tip + a "next bucket" the coach nudges, per money type.
const TIP: Record<ArchetypeKey, string> = {
  vault: 'You guard money well — now make it work. Idle cash loses to inflation; move some into a higher-yield pot or index fund.',
  baller: 'Set a weekly "fun" cap and let it ride. Capping nights out is the single move that stops the “where did it go?” moment.',
  hustler: 'Automate the boring bit: sweep a fixed % to savings the day you’re paid, before you reinvest the rest.',
  magpie: 'Add a 24-hour rule to anything over £30. If you still want it tomorrow, buy it — most carts don’t survive the night.',
  strategist: 'Your budget’s tight — now optimise. Move savings to a higher-yield pot and review subscriptions every quarter.',
  free_spirit: 'Automate one thing so you never think about it: a small auto-transfer to savings each payday.',
};

const NEXT_BUCKET: Record<ArchetypeKey, { name: string; emoji: string; target: number }> = {
  vault: { name: 'House Deposit', emoji: '🏡', target: 500000 },
  baller: { name: 'Fun Fund', emoji: '🍾', target: 40000 },
  hustler: { name: 'Invest Pot', emoji: '📈', target: 150000 },
  magpie: { name: 'Treat Budget', emoji: '✨', target: 30000 },
  strategist: { name: 'Annual Bills', emoji: '🗂️', target: 120000 },
  free_spirit: { name: 'Buffer', emoji: '🌊', target: 50000 },
};

type Tone = 'good' | 'warn' | 'bad' | 'info';
const TONE: Record<Tone, { border: string; tint: string }> = {
  good: { border: 'rgba(200,255,0,0.4)', tint: colors.lime },
  warn: { border: 'rgba(255,210,74,0.4)', tint: colors.gold },
  bad: { border: 'rgba(255,77,77,0.4)', tint: colors.red },
  info: { border: colors.border, tint: colors.textDim },
};

interface Insight {
  id: string;
  tone: Tone;
  emoji: string;
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
}

export default function Coach() {
  const router = useRouter();
  const me = useIdentity();
  const profile = useProfile();
  const key = profile.archetype as ArchetypeKey;
  const a = getArchetype(key);
  const { pot, members } = usePot(DEMO.POT_ID);
  const buckets = useBuckets();
  const [conn, setConn] = useState<BankConnection | null>(null);
  const [asked, setAsked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    backend.getBankConnection(me.id).then((c) => alive && setConn(c));
    return () => {
      alive = false;
    };
  }, [me.id]);

  const myMember = members.find((m) => m.user_id === me.id);
  const spend = conn?.spend_by_category ?? {};
  const cats = Object.entries(spend)
    .map(([k, v]) => ({ key: k, amount: v as number }))
    .sort((x, y) => y.amount - x.amount);
  const monthly = cats.reduce((s, c) => s + c.amount, 0);
  const top = cats[0];
  const savings = conn?.savings_balance_pence ?? 0;

  // The goal that needs the most attention.
  const goal = [...buckets]
    .filter((b) => b.currentPence < b.targetPence)
    .sort((x, y) => x.currentPence / x.targetPence - y.currentPence / y.targetPence)[0];
  const goalNeeded = goal ? goal.targetPence - goal.currentPence : 0;
  const goalMonths = goal ? Math.max(1, Math.ceil(goalNeeded / 5000)) : 0; // at £50/mo

  const insights: Insight[] = [];

  // 1) Where you stand in the live pot — comment only, never call it.
  if (pot && myMember) {
    const lowerBetter = pot.bet_type === 'spend_freeze';
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(pot.window_end).getTime() - Date.now()) / 86400000)
    );
    if (myMember.status === 'broken') {
      insights.push({
        id: 'pot',
        tone: 'bad',
        emoji: '💥',
        title: `You broke ${pot.name}`,
        body: `Your ${catLabel(pot.category)} spend crossed the cap, so the bank moved your stake. No shame — set a tighter cap next round.`,
      });
    } else if (lowerBetter) {
      const headroom = Math.max(pot.threshold_pence - myMember.spent_pence, 0);
      const perDay = Math.floor(headroom / daysLeft);
      const pct = pot.threshold_pence > 0 ? Math.round((myMember.spent_pence / pot.threshold_pence) * 100) : 0;
      const tight = pct >= 80;
      insights.push({
        id: 'pot',
        tone: tight ? 'warn' : 'good',
        emoji: tight ? '⚠️' : '✅',
        title: `${pct}% of your ${catLabel(pot.category)} cap`,
        body: `${formatPence(headroom)} of headroom with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left — about ${formatPence(perDay)}/day to hold the line. ${tight ? 'Ease off to keep your stake.' : 'You’re comfortably on track.'}`,
      });
    }
  }

  // 2) Biggest spend leak — tied to the money type's kryptonite.
  if (top && top.amount > 0) {
    const cut = Math.round(top.amount * 0.2);
    insights.push({
      id: 'leak',
      tone: 'warn',
      emoji: CAT_META[top.key]?.emoji ?? '💳',
      title: `${catLabel(top.key)} is your biggest spend`,
      body: `${formatPence(top.amount)} this month — your largest category. Classic ${a.title}: ${a.kryptonite.toLowerCase()} Trim 20% (${formatPence(cut)}/mo ≈ ${formatPence(cut * 12)}/yr).`,
      cta: { label: `Freeze ${catLabel(top.key)} in a pot →`, onPress: () => router.push('/create') },
    });
  }

  // 3) Goal projection — turn discipline into a real target.
  if (goal) {
    const pct = Math.round((goal.currentPence / goal.targetPence) * 100);
    insights.push({
      id: 'goal',
      tone: 'info',
      emoji: goal.emoji,
      title: `${goal.name} is ${pct}% there`,
      body: `${formatPence(goalNeeded)} to go. Save £50/mo and you’ll hit it in ${goalMonths} month${goalMonths === 1 ? '' : 's'}; double it to £100/mo and it’s ${Math.ceil(goalMonths / 2)}.`,
      cta: { label: 'Open Buckets →', onPress: () => router.push('/(tabs)/buckets') },
    });
  }

  // 4) A tailored tip + an optional next bucket to build.
  const nb = NEXT_BUCKET[key];
  insights.push({
    id: 'tip',
    tone: 'info',
    emoji: a.emoji,
    title: `Tip for ${a.title}`,
    body: TIP[key],
    cta:
      nb && !hasBucket(nb.name)
        ? {
            label: `Add a ${nb.name} bucket`,
            onPress: () => {
              addBucket({ name: nb.name, emoji: nb.emoji, targetPence: nb.target, currentPence: 0, color: colors.lime });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              router.push('/(tabs)/buckets');
            },
          }
        : { label: 'Open Buckets →', onPress: () => router.push('/(tabs)/buckets') },
  });

  // "Ask your Coach" — scripted, data-filled answers (feels interactive).
  const questions: { id: string; q: string; a: string }[] = [
    {
      id: 'where',
      q: 'Where’s my money going?',
      a: cats.length
        ? `This month: ${cats
            .slice(0, 3)
            .map((c) => `${catLabel(c.key)} ${formatPence(c.amount)}`)
            .join(' · ')}. ${top ? `${catLabel(top.key)} is where to look first.` : ''}`
        : 'Connect your bank and I’ll break down your spend by category.',
    },
    {
      id: 'faster',
      q: goal ? `How do I hit ${goal.name} faster?` : 'How do I start saving?',
      a: goal
        ? `${goal.name} needs ${formatPence(goalNeeded)} more. £50/mo → ${goalMonths} months; £100/mo → ${Math.ceil(
            goalMonths / 2
          )}. The fastest lever is your ${top ? catLabel(top.key).toLowerCase() : 'biggest'} spend — trimming it funds the bucket without feeling it.`
        : 'Pick one goal in Buckets and automate a small monthly transfer. Tiny and consistent beats big and occasional.',
    },
    {
      id: 'win',
      q: pot ? `Will I win ${pot.name}?` : 'Am I on track?',
      a: pot && myMember
        ? `I only read the data — I never call the winner 🤖. You’re at ${
            pot.threshold_pence > 0 ? Math.round((myMember.spent_pence / pot.threshold_pence) * 100) : 0
          }% of your ${catLabel(pot.category)} cap. ${
            myMember.status === 'broken' ? 'This one’s already settled.' : 'Hold your pace and your stake is safe.'
          }`
        : 'Keep syncing — your standing comes straight from your bank, not a self-report.',
    },
  ];

  const ask = (id: string) => {
    setAsked((s) => ({ ...s, [id]: true }));
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar emoji="🤖" size={44} ring="lime" />
          <View>
            <Text style={styles.title}>Coach</Text>
            <Text style={styles.sub}>Reads your money. Advises — never calls the bet.</Text>
          </View>
        </View>

        {/* Snapshot from the connected bank. */}
        {conn ? (
          <View style={styles.snapshot}>
            <Snap label="SAVINGS" value={formatPence(savings)} tint={colors.lime} />
            <Snap label="SPEND / MO" value={formatPence(monthly)} tint={colors.text} />
            <Snap label="TOP" value={top ? catLabel(top.key) : '—'} tint={colors.gold} />
          </View>
        ) : (
          <View style={styles.connectCard}>
            <Text style={styles.connectText}>Connect your bank so Coach can read your spending.</Text>
            <Button label="Connect bank" variant="secondary" small onPress={() => router.push('/connect')} />
          </View>
        )}

        {insights.map((c, i) => (
          <Animated.View
            key={c.id}
            entering={FadeInDown.delay(i * 70).springify().damping(16)}
            style={[styles.card, { borderColor: TONE[c.tone].border }]}>
            <View style={styles.cardHead}>
              <Text style={styles.cardEmoji}>{c.emoji}</Text>
              <Text style={[styles.cardTitle, { color: TONE[c.tone].tint }]}>{c.title}</Text>
            </View>
            <Text style={styles.cardBody}>{c.body}</Text>
            {c.cta && (
              <Button label={c.cta.label} variant="secondary" small onPress={c.cta.onPress} />
            )}
          </Animated.View>
        ))}

        {/* Ask your Coach */}
        <Text style={styles.askLabel}>ASK YOUR COACH</Text>
        <View style={styles.askList}>
          {questions.map((item) => (
            <View key={item.id} style={{ gap: 8 }}>
              <Pressable
                onPress={() => ask(item.id)}
                style={({ pressed }) => [styles.question, pressed && { opacity: 0.7 }]}>
                <Text style={styles.questionText}>{item.q}</Text>
                <Text style={styles.questionArrow}>{asked[item.id] ? '·' : '＋'}</Text>
              </Pressable>
              {asked[item.id] && (
                <Animated.View entering={FadeIn} style={styles.answer}>
                  <Text style={styles.answerText}>{item.a}</Text>
                </Animated.View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.flavor}>
          Tuned for {a.emoji} {a.title} · {a.tagline}
        </Text>

        <TabActions />
      </ScrollView>
    </Screen>
  );
}

function Snap({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={styles.snap}>
      <Text style={styles.snapLabel}>{label}</Text>
      <Text style={[styles.snapValue, { color: tint }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 2 },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
  snapshot: { flexDirection: 'row', gap: 10 },
  snap: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  snapLabel: { ...type.micro, color: colors.textMute, letterSpacing: 0.6 },
  snapValue: { ...type.h3, fontWeight: '800' },
  connectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  connectText: { ...type.body, color: colors.textDim },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardEmoji: { fontSize: 22 },
  cardTitle: { ...type.h3, flex: 1 },
  cardBody: { ...type.body, color: colors.textDim, lineHeight: 21 },
  askLabel: { ...type.micro, color: colors.textMute, letterSpacing: 1.2, marginTop: 4 },
  askList: { gap: 10 },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  questionText: { ...type.label, color: colors.text, flex: 1 },
  questionArrow: { ...type.h3, color: colors.lime },
  answer: {
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.lime,
    padding: 14,
  },
  answerText: { ...type.body, color: colors.text, lineHeight: 21 },
  flavor: { ...type.caption, color: colors.textMute, textAlign: 'center', marginTop: 4 },
});
