import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { InviteSheet } from '@/components/InviteSheet';
import { colors, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { backend } from '@/lib/backend';
import { completeOnboarding } from '@/hooks/useProfile';
import type { Pot } from '@/lib/types';

export default function Invite() {
  const { potId, ctx } = useLocalSearchParams<{ potId: string; ctx?: string }>();
  const router = useRouter();
  const fromTab = ctx === 'tab';
  const [pot, setPot] = useState<Pot | null>(null);

  useEffect(() => {
    if (potId) backend.getPot(potId).then(setPot).catch(() => {});
  }, [potId]);

  // Re-entrant: opened from a tab (ctx=tab) → just pop back to that tab.
  // Opened at the end of the create flow → finish onboarding and land on the
  // app's main POT screen (never back on the create form).
  const done = () => {
    if (fromTab && router.canGoBack()) {
      router.back();
      return;
    }
    completeOnboarding(); // idempotent
    router.replace('/(tabs)');
  };

  return (
    <Screen onClose={done}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Invite your squad</Text>
        <Text style={styles.sub}>
          {pot ? `“${pot.name}” is live · ${formatPence(pot.stake_pence)} each` : 'Loading…'}
        </Text>

        <Card title="Add friends">
          <InviteSheet potId={potId} inviteCode={pot?.invite_code} />
        </Card>

        <Button label={fromTab ? 'Done' : 'Enter POTS →'} onPress={done} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim, marginTop: -6 },
});
