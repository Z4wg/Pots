import { useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { ResultCard } from '@/components/ResultCard';
import { colors, radius, space, type } from '@/lib/theme';
import { QUIZ, scoreQuiz, type ArchetypeKey, type QuizQuestion } from '@/lib/archetypes';
import { setArchetype } from '@/hooks/useProfile';

const SCREEN_W = Dimensions.get('window').width;
const THRESH = 90; // px drag to commit a swipe
const EXIT = SCREEN_W * 1.15;

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ArchetypeKey[]>([]);
  const [result, setResult] = useState<ArchetypeKey | null>(null);

  const pick = (tag: ArchetypeKey) => {
    Haptics.selectionAsync().catch(() => {});
    const next = [...answers, tag];
    setAnswers(next);
    if (next.length >= QUIZ.length) {
      const key = scoreQuiz(next);
      setArchetype(key);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(key);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (result) {
    return (
      <Screen>
        <ResultCard archetypeKey={result} onStart={() => router.replace('/connect')} />
      </Screen>
    );
  }

  const q = QUIZ[index];

  return (
    <Screen>
      <View style={styles.container}>
        {/* §1 — hero headline: the screen's purpose, unmistakable on open. */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Find your{'\n'}money type</Text>
          <Text style={styles.heroSub}>{QUIZ.length} quick swipes.</Text>
          <View style={styles.dots}>
            {QUIZ.map((_, i) => (
              <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
            ))}
          </View>
        </View>

        {/* §2 — the card + its two answers are one tight unit. */}
        <SwipeCard key={q.id} question={q} onPick={pick} />
      </View>
    </Screen>
  );
}

function SwipeCard({ question, onPick }: { question: QuizQuestion; onPick: (tag: ArchetypeKey) => void }) {
  const tx = useSharedValue(0);
  const picked = useRef(false);
  const [left, right] = question.options;
  const leftTag = left.tag;
  const rightTag = right.tag;

  const handlePick = (tag: ArchetypeKey) => {
    if (picked.current) return;
    picked.current = true;
    onPick(tag);
  };

  // Tap path: fly the card off toward the chosen side, then commit.
  const fly = (dir: -1 | 1, tag: ArchetypeKey) => {
    tx.value = withTiming(dir * EXIT, { duration: 200 });
    setTimeout(() => handlePick(tag), 190);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > THRESH) {
        tx.value = withTiming(EXIT, { duration: 200 }, (done) => {
          if (done) runOnJS(handlePick)(rightTag);
        });
      } else if (e.translationX < -THRESH) {
        tx.value = withTiming(-EXIT, { duration: 200 }, (done) => {
          if (done) runOnJS(handlePick)(leftTag);
        });
      } else {
        tx.value = withSpring(0, { damping: 16 });
      }
    });

  // Card follows the finger with a little rotation.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${interpolate(tx.value, [-EXIT, EXIT], [-9, 9], Extrapolation.CLAMP)}deg` },
    ],
  }));

  // Faint edge hints reveal which answer a direction selects, before you commit.
  const leftHint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-THRESH, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const rightHint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, THRESH], [0, 1], Extrapolation.CLAMP),
  }));

  // Each answer button rises + highlights as you drag toward it (§2.1).
  // (Hooks called directly — drag-left fills the left progress, drag-right the right.)
  const leftBtnStyle = useAnimatedStyle(() => {
    const p = interpolate(-tx.value, [0, THRESH], [0, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: -p * 16 }, { scale: 1 + p * 0.04 }],
      borderColor: interpolateColor(p, [0, 1], [colors.border, colors.lime]),
      backgroundColor: interpolateColor(p, [0, 1], [colors.surface, 'rgba(200,255,0,0.14)']),
    };
  });
  const rightBtnStyle = useAnimatedStyle(() => {
    const p = interpolate(tx.value, [0, THRESH], [0, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: -p * 16 }, { scale: 1 + p * 0.04 }],
      borderColor: interpolateColor(p, [0, 1], [colors.border, colors.lime]),
      backgroundColor: interpolateColor(p, [0, 1], [colors.surface, 'rgba(200,255,0,0.14)']),
    };
  });
  const leftLabelStyle = useAnimatedStyle(() => {
    const p = interpolate(-tx.value, [0, THRESH], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(p, [0, 1], [colors.text, colors.lime]) };
  });
  const rightLabelStyle = useAnimatedStyle(() => {
    const p = interpolate(tx.value, [0, THRESH], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(p, [0, 1], [colors.text, colors.lime]) };
  });

  return (
    <View style={styles.unit}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]} entering={FadeIn.duration(220)}>
          <Animated.Text style={[styles.edge, styles.edgeLeft, leftHint]} numberOfLines={2}>
            ◀ {left.label}
          </Animated.Text>
          <Animated.Text style={[styles.edge, styles.edgeRight, rightHint]} numberOfLines={2}>
            {right.label} ▶
          </Animated.Text>
          <Text style={styles.prompt}>{question.prompt}</Text>
          <Text style={styles.swipeHint}>Swipe or tap</Text>
        </Animated.View>
      </GestureDetector>

      <View style={styles.answers}>
        <AnswerButton style={leftBtnStyle} labelStyle={leftLabelStyle} label={left.label} onPress={() => fly(-1, left.tag)} />
        <AnswerButton style={rightBtnStyle} labelStyle={rightLabelStyle} label={right.label} onPress={() => fly(1, right.tag)} />
      </View>
    </View>
  );
}

function AnswerButton({
  label,
  onPress,
  style,
  labelStyle,
}: {
  label: string;
  onPress: () => void;
  style: any;
  labelStyle: any;
}) {
  return (
    <Pressable style={styles.answerWrap} onPress={onPress}>
      <Animated.View style={[styles.answer, style]}>
        <Animated.Text style={[styles.answerText, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.md, justifyContent: 'space-between', paddingBottom: space.xl },
  hero: { gap: 10 },
  heroTitle: { fontSize: 46, fontWeight: '900', letterSpacing: -1.5, color: colors.text, lineHeight: 48 },
  heroSub: { ...type.h3, color: colors.lime, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 7, marginTop: 6 },
  dot: { width: 26, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.lime },

  // Card + the two answers, grouped tight (§2.3).
  unit: { gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 44,
    paddingHorizontal: 24,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  edge: { position: 'absolute', top: 16, ...type.micro, color: colors.lime, maxWidth: 110 },
  edgeLeft: { left: 14, textAlign: 'left' },
  edgeRight: { right: 14, textAlign: 'right' },
  prompt: { ...type.h2, fontSize: 26, color: colors.text, textAlign: 'center', lineHeight: 32 },
  swipeHint: { ...type.micro, color: colors.textMute, letterSpacing: 1 },

  answers: { flexDirection: 'row', gap: 12 },
  answerWrap: { flex: 1 },
  answer: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 22,
    paddingHorizontal: 14,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerText: { ...type.h3, color: colors.text, textAlign: 'center' },
});
