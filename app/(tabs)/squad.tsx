import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/StatusPill';
import { TabActions } from '@/components/TabActions';
import { colors, radius, space, type } from '@/lib/theme';
import { usePot } from '@/hooks/usePotRealtime';
import { useIdentity, setIdentity } from '@/hooks/useIdentity';
import { DEMO, MAYA, TOM } from '@/lib/demo';
import { getArchetype } from '@/lib/archetypes';
import { FRIENDS } from '@/lib/friends';
import type { MemberStatus, PotMember } from '@/lib/types';

interface Row {
  key: string;
  name: string;
  emoji: string;
  archetypeTitle: string;
  archetypeEmoji: string;
  standing: string;
  status: MemberStatus | null;
  streak: number;
  isMe: boolean;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function Squad() {
  const me = useIdentity();
  const router = useRouter();
  const { pot, members } = usePot(DEMO.POT_ID);

  const lowerBetter = pot?.bet_type === 'spend_freeze';
  const active = members
    .filter((m) => m.status !== 'broken')
    .sort((a, b) =>
      lowerBetter
        ? a.current_value_pence - b.current_value_pence
        : b.current_value_pence - a.current_value_pence
    );

  const liveRows: Row[] = members.map((m: PotMember) => {
    const arche = getArchetype(m.archetype);
    const rank = active.findIndex((x) => x.user_id === m.user_id) + 1;
    const standing =
      m.status === 'broken'
        ? `Broke the ${pot?.name ?? 'pot'}`
        : rank > 0
        ? `${ordinal(rank)} in ${pot?.name ?? 'the pot'}`
        : 'In the pot';
    return {
      key: m.id,
      name: m.display_name ?? 'Member',
      emoji: m.avatar_emoji ?? arche.emoji,
      archetypeTitle: arche.title,
      archetypeEmoji: arche.emoji,
      standing,
      status: m.status,
      streak: m.current_streak,
      isMe: m.user_id === me.id,
    };
  });

  const friendRows: Row[] = FRIENDS.map((f) => {
    const arche = getArchetype(f.archetype);
    return {
      key: f.id,
      name: f.name,
      emoji: f.emoji,
      archetypeTitle: arche.title,
      archetypeEmoji: arche.emoji,
      standing: f.standing,
      status: null,
      streak: f.streak,
      isMe: false,
    };
  });

  const rows = [...liveRows, ...friendRows];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Squad</Text>
            <Text style={styles.sub}>Everyone playing across your pots.</Text>
          </View>
        </View>

        {/* Two-phone demo identity toggle. */}
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
          <Button
            label="↺ Replay intro (swipe quiz)"
            variant="ghost"
            small
            onPress={() => router.push('/onboarding')}
          />
        </Card>

        <View style={styles.list}>
          {rows.map((r, i) => (
            <Animated.View
              key={r.key}
              entering={FadeInDown.delay(i * 60)}
              layout={LinearTransition.springify()}
              style={[styles.row, r.isMe && styles.meRow, r.status === 'broken' && styles.brokenRow]}>
              <Avatar emoji={r.emoji} size={44} ring={r.status === 'broken' ? 'red' : r.isMe ? 'lime' : 'none'} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameLine}>
                  <Text style={styles.name}>{r.name}</Text>
                  {r.isMe && <Text style={styles.youTag}>YOU</Text>}
                </View>
                <Text style={styles.standing}>{r.standing}</Text>
              </View>
              <View style={styles.right}>
                <View style={styles.archeBadge}>
                  <Text style={styles.archeEmoji}>{r.archetypeEmoji}</Text>
                  <Text style={styles.archeText}>{r.archetypeTitle}</Text>
                </View>
                {r.status ? (
                  <StatusPill status={r.status} />
                ) : (
                  <Text style={styles.streak}>🔥 {r.streak}</Text>
                )}
              </View>
            </Animated.View>
          ))}
        </View>

        <TabActions />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, marginTop: 2 },
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
  standing: { ...type.caption, color: colors.textDim, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  archeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceLo,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  archeEmoji: { fontSize: 12 },
  archeText: { ...type.micro, color: colors.textDim },
  streak: { ...type.caption, color: colors.gold },
});
