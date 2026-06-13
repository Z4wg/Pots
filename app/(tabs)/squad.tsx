import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/StatusPill';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { usePot } from '@/hooks/usePotRealtime';
import { useIdentity, setIdentity } from '@/hooks/useIdentity';
import { DEMO, MAYA, TOM } from '@/lib/demo';
import { getArchetype } from '@/lib/archetypes';
import type { MemberStatus, PotMember } from '@/lib/types';

// Extra seeded friends so the squad looks alive (display-only, not in the bet).
const EXTRA_FRIENDS: { name: string; emoji: string; archetype: string; stake: number; streak: number; status: MemberStatus }[] = [
  { name: 'Priya', emoji: '🐿️', archetype: 'saver', stake: 500, streak: 7, status: 'active' },
  { name: 'Leo', emoji: '🚀', archetype: 'hustler', stake: 500, streak: 5, status: 'active' },
  { name: 'Zoe', emoji: '💎', archetype: 'status_spender', stake: 0, streak: 0, status: 'broken' },
  { name: 'Sam', emoji: '🌱', archetype: 'soft_saver', stake: 500, streak: 2, status: 'active' },
];

interface Row {
  key: string;
  name: string;
  emoji: string;
  archetype: string;
  stake: number;
  streak: number;
  status: MemberStatus;
  isMe: boolean;
}

export default function Squad() {
  const me = useIdentity();
  const { members } = usePot(DEMO.POT_ID);

  const liveRows: Row[] = members.map((m: PotMember) => ({
    key: m.id,
    name: m.display_name ?? 'Member',
    emoji: m.avatar_emoji ?? getArchetype(m.archetype).emoji,
    archetype: getArchetype(m.archetype).title,
    stake: m.stake_pence,
    streak: m.current_streak,
    status: m.status,
    isMe: m.user_id === me.id,
  }));

  const extraRows: Row[] = EXTRA_FRIENDS.map((f, i) => ({
    key: `extra-${i}`,
    name: f.name,
    emoji: f.emoji,
    archetype: getArchetype(f.archetype).title,
    stake: f.stake,
    streak: f.streak,
    status: f.status,
    isMe: false,
  }));

  const rows = [...liveRows, ...extraRows].sort((a, b) => {
    const rank = (s: MemberStatus) => (s === 'broken' ? 1 : 0);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return b.stake - a.stake;
  });

  const invite = () => {
    const url = Linking.createURL('/join/' + DEMO.INVITE_CODE);
    Share.share({ message: `Join my Pots squad: ${url}` }).catch(() => {});
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Squad</Text>
            <Text style={styles.sub}>Ranked by who’s holding and what they stand to win.</Text>
          </View>
        </View>

        {/* Demo identity toggle */}
        <Card title="Demo identity">
          <View style={styles.toggleRow}>
            <Button
              label={`${MAYA.avatar_emoji} Maya`}
              variant={me.id === MAYA.id ? 'primary' : 'secondary'}
              small
              style={{ flex: 1 }}
              onPress={() => setIdentity(MAYA.id)}
            />
            <Button
              label={`${TOM.avatar_emoji} Tom`}
              variant={me.id === TOM.id ? 'primary' : 'secondary'}
              small
              style={{ flex: 1 }}
              onPress={() => setIdentity(TOM.id)}
            />
          </View>
          <Text style={styles.toggleHint}>Phone A = Maya · Phone B = Tom</Text>
        </Card>

        <View style={styles.list}>
          {rows.map((r, i) => (
            <Animated.View
              key={r.key}
              entering={FadeInDown.delay(i * 70)}
              layout={LinearTransition.springify()}
              style={[styles.row, r.isMe && styles.meRow, r.status === 'broken' && styles.brokenRow]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Avatar emoji={r.emoji} size={44} ring={r.status === 'broken' ? 'red' : 'none'} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameLine}>
                  <Text style={styles.name}>{r.name}</Text>
                  {r.isMe && <Text style={styles.youTag}>YOU</Text>}
                </View>
                <Text style={styles.archetype}>
                  {r.archetype} · 🔥 {r.streak}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.stake, r.status === 'broken' && { color: colors.textMute }]}>
                  {formatPence(r.stake)}
                </Text>
                <StatusPill status={r.status} />
              </View>
            </Animated.View>
          ))}
        </View>

        <Button label="Invite a friend" variant="secondary" onPress={invite} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, maxWidth: 260, marginTop: 2 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleHint: { ...type.caption, color: colors.textMute },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  meRow: { borderColor: 'rgba(200,255,0,0.4)' },
  brokenRow: { borderColor: 'rgba(255,77,77,0.35)', backgroundColor: 'rgba(255,77,77,0.05)' },
  rank: { ...type.h3, color: colors.textMute, width: 18, textAlign: 'center' },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...type.h3, color: colors.text },
  youTag: {
    ...type.micro,
    color: colors.black,
    backgroundColor: colors.lime,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  archetype: { ...type.caption, color: colors.textDim, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  stake: { ...type.h3, color: colors.lime },
});
