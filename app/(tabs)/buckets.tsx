import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { BetHealthBar } from '@/components/BetHealthBar';
import { colors, radius, space, type } from '@/lib/theme';
import { getArchetype, BUCKET_LABELS, type BucketSplit } from '@/lib/archetypes';
import { useProfile } from '@/hooks/useProfile';
import { usePot } from '@/hooks/usePotRealtime';
import { useIdentity } from '@/hooks/useIdentity';
import { DEMO } from '@/lib/demo';
import type { Category } from '@/lib/types';

const BUCKET_COLORS: Record<string, string> = {
  essentials: colors.violet,
  goingOut: colors.gold,
  travel: '#5AC8FA',
  savings: colors.lime,
};

// Which bucket the bet rides on (cafe -> Going Out/Cafe).
function betBucket(cat: Category): keyof BucketSplit {
  if (cat === 'savings') return 'savings';
  if (cat === 'transport') return 'travel';
  if (cat === 'grocery') return 'essentials';
  return 'goingOut'; // cafe + going_out
}

export default function Buckets() {
  const profile = useProfile();
  const me = useIdentity();
  const a = getArchetype(profile.archetype);
  const { pot, members } = usePot(DEMO.POT_ID);
  const myMember = members.find((m) => m.user_id === me.id);
  const betKey = betBucket(a.betCategory);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your buckets</Text>
        <Text style={styles.caption}>
          Based on the 50/30/20 rule, tuned for {a.title}.
        </Text>

        <Card>
          {BUCKET_LABELS.map((b, i) => (
            <BucketBar
              key={b.key}
              label={b.label}
              pct={a.split[b.key]}
              color={BUCKET_COLORS[b.key]}
              delay={i * 120}
              highlight={b.key === betKey}
            />
          ))}
        </Card>

        {pot && (
          <Animated.View entering={FadeInDown.delay(400)}>
            <Card accent title={`${BUCKET_LABELS.find((b) => b.key === betKey)?.label} · live bet`}>
              <Text style={styles.betGoal}>{pot.goal_label}</Text>
              {myMember && (
                <BetHealthBar
                  spentPence={myMember.spent_pence}
                  thresholdPence={pot.threshold_pence}
                  category={pot.category}
                  status={myMember.status}
                  comparator={pot.comparator}
                />
              )}
              <Text style={styles.betNote}>
                This bucket carries your stake. Cross the cap and it breaks automatically.
              </Text>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

function BucketBar({
  label,
  pct,
  color,
  delay,
  highlight,
}: {
  label: string;
  pct: number;
  color: string;
  delay: number;
  highlight?: boolean;
}) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(delay, withTiming(pct / 100, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [pct, delay]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ width: `${Math.max(fill.value * 100, 2)}%` }));

  return (
    <View style={styles.bucket}>
      <View style={styles.bucketHead}>
        <Text style={[styles.bucketLabel, highlight && { color: colors.lime }]}>
          {label}
          {highlight ? '  •  BET' : ''}
        </Text>
        <Text style={styles.bucketPct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, style, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  title: { ...type.title, color: colors.text },
  caption: { ...type.body, color: colors.textDim, marginTop: -6 },
  bucket: { gap: 8, paddingVertical: 6 },
  bucketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bucketLabel: { ...type.h3, color: colors.text },
  bucketPct: { ...type.h3, color: colors.textDim },
  track: {
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLo,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  betGoal: { ...type.h3, color: colors.text },
  betNote: { ...type.caption, color: colors.textMute },
});
