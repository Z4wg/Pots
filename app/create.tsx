import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { getArchetype } from '@/lib/archetypes';
import { DEMO } from '@/lib/demo';
import { useProfile, setStakePence, completeOnboarding } from '@/hooks/useProfile';

export default function Create() {
  const router = useRouter();
  const profile = useProfile();
  const a = getArchetype(profile.archetype);
  const [stake, setStake] = useState(profile.stakePence);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const bump = (delta: number) => {
    const next = Math.max(100, stake + delta);
    setStake(next);
    setStakePence(next);
    Haptics.selectionAsync().catch(() => {});
  };

  const invite = () => {
    const url = Linking.createURL('/join/' + DEMO.INVITE_CODE);
    Share.share({
      message: `Join my Pots bet "${a.betGoalLabel}". Tap to join: ${url}`,
    }).catch(() => {});
  };

  const connectRevolut = () => {
    setConnecting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Faked: pretend to pull seeded transactions from the bank.
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 1800);
  };

  const go = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Set your bet</Text>
        <Text style={styles.sub}>Auto-suggested for {a.title}. Adjust if you like.</Text>

        <Card accent>
          <View style={styles.betHead}>
            <Avatar emoji={a.emoji} size={44} ring="lime" />
            <View style={{ flex: 1 }}>
              <Text style={styles.betLabel}>{a.betGoalLabel}</Text>
              <Text style={styles.betMeta}>Resolved automatically by your spending.</Text>
            </View>
          </View>
        </Card>

        <Card title="Your stake">
          <View style={styles.stakeRow}>
            <Stepper label="–" onPress={() => bump(-100)} />
            <View style={styles.stakeMid}>
              <Text style={styles.stakeValue}>{formatPence(stake)}</Text>
              <Text style={styles.stakeHint}>at risk if you break it</Text>
            </View>
            <Stepper label="+" onPress={() => bump(100)} />
          </View>
        </Card>

        <Card title="Squad">
          <Button label="Invite a friend" variant="secondary" onPress={invite} />
          <Text style={styles.inviteHint}>Generates a deep link to /join/{DEMO.INVITE_CODE}</Text>
        </Card>

        <Card title="Connect your bank">
          {connected ? (
            <Animated.View entering={FadeIn} style={styles.connectedRow}>
              <Text style={styles.connectedDot}>●</Text>
              <Text style={styles.connectedText}>Revolut connected · demo transactions loaded</Text>
            </Animated.View>
          ) : connecting ? (
            <ConnectingAnim />
          ) : (
            <Button label="Connect Revolut" variant="secondary" onPress={connectRevolut} />
          )}
          <Text style={styles.inviteHint}>Demo only — no real bank data is used.</Text>
        </Card>

        <View style={{ flex: 1 }} />
        <Button label="Enter the pot →" onPress={go} disabled={!connected} />
        {!connected && <Text style={styles.lockHint}>Connect your bank to continue</Text>}
      </View>
    </Screen>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.7 }]}>
      <Text style={styles.stepperText}>{label}</Text>
    </Pressable>
  );
}

function ConnectingAnim() {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 360}deg` }] }));
  return (
    <View style={styles.connectingRow}>
      <Animated.View style={[styles.spinner, style]} />
      <Text style={styles.connectingText}>Securely connecting to Revolut…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, gap: space.md },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim, marginTop: -6 },
  betHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  betLabel: { ...type.h3, color: colors.text },
  betMeta: { ...type.caption, color: colors.textDim, marginTop: 2 },
  stakeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stakeMid: { alignItems: 'center', gap: 2 },
  stakeValue: { ...type.hero, fontSize: 44, color: colors.lime },
  stakeHint: { ...type.caption, color: colors.textMute },
  stepper: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { ...type.title, color: colors.text },
  inviteHint: { ...type.caption, color: colors.textMute },
  connectingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  spinner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.lime,
    borderTopColor: 'transparent',
  },
  connectingText: { ...type.body, color: colors.textDim },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connectedDot: { color: colors.lime, fontSize: 12 },
  connectedText: { ...type.body, color: colors.text },
  lockHint: { ...type.caption, color: colors.textMute, textAlign: 'center' },
});
