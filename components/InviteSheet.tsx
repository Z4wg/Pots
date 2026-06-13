import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

import { Avatar } from '@/components/Avatar';
import { colors, radius, type } from '@/lib/theme';
import { addInvite, useInvites, type InviteEntry } from '@/lib/invites';

// One invite component reused everywhere (pot creation §3 + every tab §7d):
// email / shareable link / QR, plus the live "Invited / Joined" squad list.
interface Props {
  potId: string;
  inviteCode?: string;
  showQr?: boolean;
}

export function InviteSheet({ potId, inviteCode, showQr = true }: Props) {
  const [email, setEmail] = useState('');
  const invites = useInvites(potId);
  const joinUrl = inviteCode ? Linking.createURL('/join/' + inviteCode) : '';

  const addEmail = () => {
    const e = email.trim();
    if (!e.includes('@')) return;
    if (invites.some((i) => i.label.toLowerCase() === e.toLowerCase())) return;
    addInvite(potId, e, 'email');
    setEmail('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const shareLink = () => {
    if (!joinUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addInvite(potId, 'Link shared', 'link');
    Share.share({ message: `Join my POT — ${joinUrl}` }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      {showQr && !!joinUrl && (
        <View style={styles.qrWrap}>
          <View style={styles.qrCard}>
            <QRCode value={joinUrl} size={150} color="#0B0B0F" backgroundColor="#FFFFFF" />
          </View>
          {!!inviteCode && <Text style={styles.code}>Code: {inviteCode}</Text>}
        </View>
      )}

      <View style={styles.methods}>
        <Pressable onPress={shareLink} style={({ pressed }) => [styles.method, pressed && styles.pressed]}>
          <Text style={styles.methodIcon}>🔗</Text>
          <Text style={styles.methodText}>Share link</Text>
        </Pressable>
        <Pressable onPress={shareLink} style={({ pressed }) => [styles.method, pressed && styles.pressed]}>
          <Text style={styles.methodIcon}>📲</Text>
          <Text style={styles.methodText}>QR code</Text>
        </Pressable>
      </View>

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
        <Pressable onPress={addEmail} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
          <Text style={styles.addBtnText}>Invite</Text>
        </Pressable>
      </View>

      {invites.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listLabel}>SQUAD · {invites.length}</Text>
          {invites.map((row) => (
            <InviteRow key={row.id} row={row} />
          ))}
        </View>
      )}
    </View>
  );
}

function InviteRow({ row }: { row: InviteEntry }) {
  const joined = row.status === 'joined';
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition.springify()} style={styles.row}>
      <Avatar emoji={row.emoji} size={36} ring={joined ? 'lime' : 'none'} />
      <Text style={styles.rowName} numberOfLines={1}>
        {row.label}
      </Text>
      <View style={[styles.status, joined ? styles.statusJoined : styles.statusInvited]}>
        <Text style={[styles.statusText, { color: joined ? colors.black : colors.textDim }]}>
          {joined ? 'JOINED' : 'INVITED'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  qrWrap: { alignItems: 'center', gap: 8 },
  qrCard: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: 14 },
  code: { ...type.label, color: colors.lime, letterSpacing: 2 },
  methods: { flexDirection: 'row', gap: 10 },
  method: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  methodIcon: { fontSize: 16 },
  methodText: { ...type.label, color: colors.text },
  pressed: { opacity: 0.8 },
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
    backgroundColor: colors.lime,
  },
  addBtnText: { ...type.label, color: colors.black, fontWeight: '800' },
  list: { gap: 8, marginTop: 2 },
  listLabel: { ...type.micro, color: colors.textMute, letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowName: { ...type.body, color: colors.text, flex: 1, fontWeight: '600' },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusInvited: { backgroundColor: colors.surfaceHi, borderWidth: 1, borderColor: colors.border },
  statusJoined: { backgroundColor: colors.lime },
  statusText: { ...type.micro, letterSpacing: 0.6 },
});
