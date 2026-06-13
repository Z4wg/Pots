import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { ResultCard } from '@/components/ResultCard';
import { colors, radius, space, type } from '@/lib/theme';
import { QUIZ, scoreQuiz, type ArchetypeKey } from '@/lib/archetypes';
import { setArchetype } from '@/hooks/useProfile';

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
        <View style={styles.top}>
          <Text style={styles.kicker}>FIND YOUR MONEY TYPE</Text>
          <View style={styles.dots}>
            {QUIZ.map((_, i) => (
              <View key={i} style={[styles.dot, i <= index && { backgroundColor: colors.lime }]} />
            ))}
          </View>
          <Text style={styles.progress}>
            {index + 1} / {QUIZ.length}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          key={q.id}>
          <Animated.Text entering={FadeIn} style={styles.prompt}>
            {q.prompt}
          </Animated.Text>

          <View style={styles.options}>
            {q.options.map((opt, i) => (
              <Animated.View key={opt.label} entering={FadeInRight.delay(i * 60).springify().damping(16)}>
                <Pressable
                  onPress={() => pick(opt.tag)}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                  <Text style={styles.optionText}>{opt.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.md },
  top: { gap: 10, alignItems: 'center', paddingBottom: space.lg },
  kicker: { ...type.micro, color: colors.lime, letterSpacing: 1.5 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 28, height: 5, borderRadius: 3, backgroundColor: colors.border },
  progress: { ...type.caption, color: colors.textDim },
  body: { paddingBottom: space.xxl, gap: space.lg },
  prompt: { ...type.title, color: colors.text },
  options: { gap: 12 },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  optionPressed: { borderColor: colors.lime, backgroundColor: colors.surfaceHi, opacity: 0.95 },
  optionText: { ...type.h3, color: colors.text, fontWeight: '600' },
});
