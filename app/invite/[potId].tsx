import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { backend } from '@/lib/backend';
import { completeOnboarding } from '@/hooks/useProfile';
import type { Pot } from '@/lib/types';

export default function Invite() {
  const { potId } = useLocalSearchParams<{ potId: string }>();
  const router = useRouter();
  const [pot, setPot] = useState<Pot | null>(null);
  const [email, setEmail] = useState('');
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    if (potId) backend.getPot(potId).then(setPot).catch(() => {});
  }, [potId]);

  const joinUrl = pot ? Linking.createURL('/join/' + pot.invite_code) : '';

  const addEmail = () => {
    const e = email.trim();
    if (!e.includes('@') || invited.includes(e)) return;
    setInvited((list) => [...list, e]);
    setEmail('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const shareLink = () => {
    if (!pot) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Share.share({
      message: `Join my POT "${pot.name}" — ${pot.goal_label}. ${formatPence(pot.stake_pence)} stake. ${joinUrl}`,
    }).catch(() => {});
  };

  const done = () => {
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

        <Card title="Share a link or QR">
          <View style={styles.qrWrap}>
            {joinUrl ? (
              <View style={styles.qrCard}>
                <QRCode value={joinUrl} size={172} color="#0B0B0F" backgroundColor="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <Text style={styles.code}>Code: {pot?.invite_code ?? '—'}</Text>
          <Button label="Share invite link" variant="secondary" onPress={shareLink} />
          <Text style={styles.hint}>Anyone with the link can join this pot.</Text>
        </Card>

        <Card title="Invite by email">
          <View style={styles.emailRow}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={addEmail}
              placeholder="friend@email.com"
              placeholderTextColor={colors.textMute}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Pressable onPress={addEmail} style={styles.addBtn}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          {invited.length > 0 && (
            <View style={styles.chips}>
              {invited.map((e) => (
                <Animated.View
                  key={e}
                  entering={FadeIn}
                  layout={LinearTransition.springify()}
                  style={styles.chip}>
                  <Text style={styles.chipText}>{e} ✓</Text>
                </Animated.View>
              ))}
            </View>
          )}
          {invited.length > 0 && (
            <Text style={styles.hint}>{invited.length} invited (demo — no email actually sent).</Text>
          )}
        </Card>

        <Button label="Enter POTS →" onPress={done} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim, marginTop: -6 },
  qrWrap: { alignItems: 'center', paddingVertical: 6 },
  qrCard: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: 16 },
  code: { ...type.label, color: colors.lime, textAlign: 'center', letterSpacing: 2 },
  hint: { ...type.caption, color: colors.textMute },
  emailRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtnText: { ...type.label, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(200,255,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.4)',
  },
  chipText: { ...type.caption, color: colors.lime },
});
