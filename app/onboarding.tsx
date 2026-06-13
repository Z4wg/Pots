import { useState } from 'react';
import { Dimensions, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { colors, radius, space, type } from '@/lib/theme';
import { QUIZ, scoreQuiz, getArchetype, type ArchetypeKey } from '@/lib/archetypes';
import { setArchetype } from '@/hooks/useProfile';

const { width } = Dimensions.get('window');
const SWIPE = width * 0.28;

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<('left' | 'right')[]>([]);
  const [result, setResult] = useState<ArchetypeKey | null>(null);

  const tx = useSharedValue(0);

  const commit = (side: 'left' | 'right') => {
    Haptics.selectionAsync().catch(() => {});
    const next = [...answers, side];
    setAnswers(next);
    if (next.length >= QUIZ.length) {
      const key = scoreQuiz(next);
      setArchetype(key);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(key);
    } else {
      setIndex((i) => i + 1);
    }
    tx.value = 0;
  };

  const fling = (side: 'left' | 'right') => {
    tx.value = withTiming(side === 'left' ? -width : width, { duration: 200 }, (done) => {
      if (done) runOnJS(commit)(side);
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE) {
        tx.value = withTiming(-width, { duration: 180 }, (d) => d && runOnJS(commit)('left'));
      } else if (e.translationX > SWIPE) {
        tx.value = withTiming(width, { duration: 180 }, (d) => d && runOnJS(commit)('right'));
      } else {
        tx.value = withSpring(0, { damping: 16 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotateZ: `${interpolate(tx.value, [-width, 0, width], [-9, 0, 9])}deg` },
    ],
  }));
  const leftHint = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-SWIPE, 0], [1, 0]) }));
  const rightHint = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [0, SWIPE], [0, 1]) }));

  if (result) return <Reveal archetypeKey={result} onContinue={() => router.replace('/create')} />;

  const card = QUIZ[index];

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.kicker}>FIND YOUR MONEY TYPE</Text>
          <Text style={styles.progress}>
            {index + 1} / {QUIZ.length}
          </Text>
          <View style={styles.dots}>
            {QUIZ.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i <= index && { backgroundColor: colors.lime }]}
              />
            ))}
          </View>
        </View>

        <View style={styles.cardArea}>
          <Animated.View style={[styles.hintLeft, leftHint]}>
            <Text style={styles.hintText}>{card.left.label}</Text>
          </Animated.View>
          <Animated.View style={[styles.hintRight, rightHint]}>
            <Text style={styles.hintText}>{card.right.label}</Text>
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View key={card.id} entering={FadeIn} style={[styles.card, cardStyle]}>
              <Text style={styles.cardEmoji}>🤔</Text>
              <Text style={styles.prompt}>{card.prompt}</Text>
              <Text style={styles.swipeHint}>Swipe or tap your pick</Text>
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={styles.choices}>
          <Button
            label={card.left.label}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => fling('left')}
          />
          <Button
            label={card.right.label}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => fling('right')}
          />
        </View>
      </View>
    </Screen>
  );
}

function Reveal({
  archetypeKey,
  onContinue,
}: {
  archetypeKey: ArchetypeKey;
  onContinue: () => void;
}) {
  const a = getArchetype(archetypeKey);
  const share = () => {
    Share.share({
      message: `I'm ${a.title} on Pots ${a.emoji} — betting on my budget with friends. ${a.betGoalLabel}.`,
    }).catch(() => {});
  };
  return (
    <Screen>
      <View style={styles.revealWrap}>
        <Animated.View entering={FadeInUp.springify().damping(14)} style={styles.revealCard}>
          <Text style={styles.revealKicker}>YOU’RE</Text>
          <Animated.View entering={FadeIn.delay(150)}>
            <Avatar emoji={a.emoji} size={120} ring="lime" />
          </Animated.View>
          <Text style={styles.revealTitle}>{a.title}</Text>
          <Text style={styles.revealBlurb}>{a.blurb}</Text>
          <View style={styles.revealBetBox}>
            <Text style={styles.revealBetLabel}>YOUR DEFAULT BET</Text>
            <Text style={styles.revealBet}>{a.betGoalLabel}</Text>
          </View>
        </Animated.View>
        <View style={styles.revealActions}>
          <Button label="Share my type" variant="secondary" onPress={share} />
          <Button label="Set up my pot →" onPress={onContinue} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.lg },
  top: { gap: 10, alignItems: 'center' },
  kicker: { ...type.micro, color: colors.lime, letterSpacing: 1.5 },
  progress: { ...type.caption, color: colors.textDim },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 28, height: 5, borderRadius: 3, backgroundColor: colors.border },
  cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '100%',
    minHeight: 320,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  cardEmoji: { fontSize: 56 },
  prompt: { ...type.title, color: colors.text, textAlign: 'center' },
  swipeHint: { ...type.caption, color: colors.textMute },
  hintLeft: {
    position: 'absolute',
    left: 8,
    top: '45%',
    borderColor: colors.lime,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 5,
  },
  hintRight: {
    position: 'absolute',
    right: 8,
    top: '45%',
    borderColor: colors.lime,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 5,
  },
  hintText: { ...type.label, color: colors.lime },
  choices: { flexDirection: 'row', gap: 12, paddingBottom: space.md },
  // Reveal
  revealWrap: { flex: 1, padding: space.lg, justifyContent: 'center', gap: space.xl },
  revealCard: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: space.xl,
  },
  revealKicker: { ...type.label, color: colors.textDim, letterSpacing: 2 },
  revealTitle: { ...type.hero, fontSize: 44, color: colors.lime, textAlign: 'center' },
  revealBlurb: { ...type.body, color: colors.textDim, textAlign: 'center' },
  revealBetBox: {
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.lg,
    padding: 16,
    width: '100%',
    gap: 6,
    alignItems: 'center',
  },
  revealBetLabel: { ...type.micro, color: colors.textMute },
  revealBet: { ...type.h3, color: colors.text, textAlign: 'center' },
  revealActions: { gap: 12 },
});
