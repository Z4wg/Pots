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
import { completeOnboarding, useProfile } from '@/hooks/useProfile';
import type { Pot } from '@/lib/types';

export default function Invite() {
  const { potId } = useLocalSearchParams<{ potId: string }>();
  const router = useRouter();
  const profile = useProfile();
  const [pot, setPot] = useState<Pot | null>(null);

  useEffect(() => {
    if (potId) backend.getPot(potId).then(setPot).catch(() => {});
  }, [potId]);

  // Re-entrant: during onboarding this finishes the flow; from a tab it just
  // pops back.
  const done = () => {
    if (profile.onboarded) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      return;
    }
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Invite your squad</Text>
        <Text style={styles.sub}>
          {pot ? `“${pot.name}” is live · ${formatPence(pot.stake_pence)} each` : 'Loading…'}
        </Text>

        <Card title="Add friends">
          <InviteSheet potId={potId} inviteCode={pot?.invite_code} />
        </Card>

        <Button label={profile.onboarded ? 'Done' : 'Enter POTS →'} onPress={done} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim, marginTop: -6 },
});
