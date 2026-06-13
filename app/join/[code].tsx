import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { colors, radius, space, type } from '@/lib/theme';
import { DEMO, TOM } from '@/lib/demo';
import { setIdentity } from '@/hooks/useIdentity';
import { completeOnboarding } from '@/hooks/useProfile';

export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const valid = code === DEMO.INVITE_CODE;

  const join = () => {
    setIdentity(TOM.id); // joining device acts as Tom for the demo
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <Screen glow="lime">
      <View style={styles.wrap}>
        <Animated.View entering={FadeInUp.springify().damping(14)} style={styles.card}>
          <Avatar emoji="🤝" size={96} ring="lime" />
          <Text style={styles.kicker}>YOU’RE INVITED</Text>
          <Text style={styles.title}>Cafe Cap September</Text>
          <Text style={styles.goal}>Under £100 on cafes this month · £5 stake</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={[styles.code, !valid && { color: colors.red }]}>
              {code ?? '—'}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <Button label={valid ? 'Join the pot' : 'Join anyway (demo)'} onPress={join} />
          <Button label="Maybe later" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, justifyContent: 'center', gap: space.xl },
  card: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: space.xl,
  },
  kicker: { ...type.label, color: colors.lime, letterSpacing: 2 },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  goal: { ...type.body, color: colors.textDim, textAlign: 'center' },
  codeBox: {
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  codeLabel: { ...type.micro, color: colors.textMute },
  code: { ...type.title, color: colors.lime, letterSpacing: 4 },
  actions: { gap: 12 },
});
