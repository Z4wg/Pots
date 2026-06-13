import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { backend } from '@/lib/backend';
import { TOM } from '@/lib/demo';
import { setIdentity } from '@/hooks/useIdentity';
import { completeOnboarding } from '@/hooks/useProfile';
import type { Pot } from '@/lib/types';

export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [pot, setPot] = useState<Pot | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    backend
      .getPotByInviteCode(code)
      .then(setPot)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  const join = async () => {
    if (!pot || joining) return;
    setJoining(true);
    // Joining device acts as Tom for the two-phone demo.
    setIdentity(TOM.id);
    try {
      await backend.joinPot(pot.id, TOM.id);
      await backend.payStake(pot.id, TOM.id);
    } catch {
      // ignore — demo is forgiving
    }
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <Screen glow="lime">
      <View style={styles.wrap}>
        <Animated.View entering={FadeInUp.springify().damping(14)} style={styles.card}>
          <Avatar emoji="🤝" size={96} ring="lime" />
          <Text style={styles.kicker}>YOU’RE INVITED</Text>
          <Text style={styles.title}>
            {loading ? 'Finding your pot…' : pot ? pot.name : 'Pot not found'}
          </Text>
          <Text style={styles.goal}>
            {pot ? `${pot.goal_label} · ${formatPence(pot.stake_pence)} stake` : `Code: ${code ?? '—'}`}
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={[styles.code, !pot && !loading && { color: colors.red }]}>{code ?? '—'}</Text>
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <Button
            label={joining ? 'Joining…' : pot ? 'Join the pot' : 'Continue'}
            onPress={pot ? join : () => router.replace('/(tabs)')}
            disabled={loading || joining}
          />
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
