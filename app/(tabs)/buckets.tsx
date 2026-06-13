import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { TabActions } from '@/components/TabActions';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { useBuckets, addBucket, type Bucket } from '@/lib/buckets';

const ADD_COLORS = [colors.lime, colors.violet, '#5AC8FA', colors.gold];

export default function Buckets() {
  const router = useRouter();
  const buckets = useBuckets();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(50000);

  const totalSaved = buckets.reduce((s, b) => s + b.currentPence, 0);
  const totalTarget = buckets.reduce((s, b) => s + b.targetPence, 0);

  const submitAdd = () => {
    const n = name.trim();
    if (!n) return;
    addBucket({
      name: n,
      emoji: '🎯',
      targetPence: target,
      currentPence: 0,
      color: ADD_COLORS[buckets.length % ADD_COLORS.length],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setName('');
    setTarget(50000);
    setAdding(false);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Buckets</Text>
        <Text style={styles.caption}>Plan your money. Separate from the bets.</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryValue}>{formatPence(totalSaved)}</Text>
          <Text style={styles.summarySub}>
            saved across {buckets.length} buckets · {formatPence(totalTarget)} target
          </Text>
        </View>

        {/* Coach entry point (§7b). */}
        <Pressable onPress={() => router.push('/(tabs)/coach')} style={styles.coachLink}>
          <Text style={styles.coachEmoji}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachTitle}>Build buckets with Coach</Text>
            <Text style={styles.coachSub}>A quick guided setup, tuned to your money type.</Text>
          </View>
          <Text style={styles.coachArrow}>→</Text>
        </Pressable>

        <View style={styles.list}>
          {buckets.map((b, i) => (
            <BucketCard key={b.id} bucket={b} delay={i * 90} />
          ))}
        </View>

        {adding ? (
          <Animated.View entering={FadeIn} style={styles.addCard}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Bucket name (e.g. Festival)"
              placeholderTextColor={colors.textMute}
              style={styles.input}
            />
            <View style={styles.stepRow}>
              <Stepper label="–" onPress={() => setTarget((t) => Math.max(5000, t - 5000))} />
              <View style={styles.stepMid}>
                <Text style={styles.stepValue}>{formatPence(target)}</Text>
                <Text style={styles.stepHint}>target</Text>
              </View>
              <Stepper label="+" onPress={() => setTarget((t) => t + 5000)} />
            </View>
            <View style={styles.addActions}>
              <Button label="Add bucket" onPress={submitAdd} style={{ flex: 1 }} />
              <Button label="Cancel" variant="ghost" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        ) : (
          <Button label="+ Add a bucket" variant="secondary" onPress={() => setAdding(true)} />
        )}

        <TabActions />
      </ScrollView>
    </Screen>
  );
}

function BucketCard({ bucket, delay }: { bucket: Bucket; delay: number }) {
  const ratio = bucket.targetPence > 0 ? Math.min(bucket.currentPence / bucket.targetPence, 1) : 0;
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio]); // eslint-disable-line react-hooks/exhaustive-deps
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(fill.value * 100, 3)}%` }));

  return (
    <Animated.View entering={FadeIn.delay(delay)} layout={LinearTransition.springify()} style={styles.bucket}>
      <View style={styles.bucketHead}>
        <Text style={styles.bucketEmoji}>{bucket.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bucketName}>{bucket.name}</Text>
          {!!bucket.targetDate && <Text style={styles.bucketDate}>by {bucket.targetDate}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.bucketAmount}>{formatPence(bucket.currentPence)}</Text>
          <Text style={styles.bucketTarget}>of {formatPence(bucket.targetPence)}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: bucket.color }]} />
      </View>
      <Text style={styles.bucketPct}>{Math.round(ratio * 100)}%</Text>
    </Animated.View>
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
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  title: { ...type.title, color: colors.text },
  caption: { ...type.body, color: colors.textDim, marginTop: -6 },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: space.lg,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: { ...type.hero, fontSize: 44, color: colors.lime },
  summarySub: { ...type.caption, color: colors.textDim },
  coachLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(158,123,255,0.4)',
    padding: 14,
  },
  coachEmoji: { fontSize: 22 },
  coachTitle: { ...type.h3, color: colors.text },
  coachSub: { ...type.caption, color: colors.textDim, marginTop: 2 },
  coachArrow: { ...type.h2, color: colors.violet },
  list: { gap: 12 },
  bucket: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  bucketHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bucketEmoji: { fontSize: 26 },
  bucketName: { ...type.h3, color: colors.text },
  bucketDate: { ...type.caption, color: colors.textMute, marginTop: 2 },
  bucketAmount: { ...type.h3, color: colors.text },
  bucketTarget: { ...type.caption, color: colors.textMute, marginTop: 2 },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLo,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  bucketPct: { ...type.micro, color: colors.textDim, textAlign: 'right' },
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  input: {
    ...type.h3,
    color: colors.text,
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepMid: { alignItems: 'center', gap: 2, flex: 1 },
  stepValue: { ...type.hero, fontSize: 34, color: colors.lime },
  stepHint: { ...type.caption, color: colors.textMute },
  stepper: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { ...type.title, color: colors.text },
  addActions: { flexDirection: 'row', gap: 10 },
});
