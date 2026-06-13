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
import type { PotMember } from '@/lib/types';

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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Squad</Text>
        <Text style={styles.sub}>Your people — invite them to pots. (Pot rankings live on the Pot tab.)</Text>

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

        {/* In the current pot — same pot, so a standing here is meaningful. */}
        {pot && members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>IN {pot.name.toUpperCase()}</Text>
            {members.map((m: PotMember, i) => {
              const arche = getArchetype(m.archetype);
              const rank = active.findIndex((x) => x.user_id === m.user_id) + 1;
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInDown.delay(i * 50)}
                  layout={LinearTransition.springify()}
                  style={[
                    styles.row,
                    m.user_id === me.id && styles.meRow,
                    m.status === 'broken' && styles.brokenRow,
                  ]}>
                  <Avatar
                    emoji={m.avatar_emoji ?? arche.emoji}
                    size={44}
                    ring={m.status === 'broken' ? 'red' : m.user_id === me.id ? 'lime' : 'none'}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameLine}>
                      <Text style={styles.name}>{m.display_name ?? 'Member'}</Text>
                      {m.user_id === me.id && <Text style={styles.youTag}>YOU</Text>}
                    </View>
                    <Text style={styles.standing}>
                      {m.status === 'broken'
                        ? 'Out — broke the cap'
                        : `${ordinal(rank)} of ${active.length}`}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Badge emoji={arche.emoji} label={arche.title} />
                    <StatusPill status={m.status} />
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Friends — a roster, not a ranking. */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FRIENDS · {FRIENDS.length}</Text>
          {FRIENDS.map((f, i) => {
            const arche = getArchetype(f.archetype);
            return (
              <Animated.View
                key={f.id}
                entering={FadeInDown.delay(i * 50)}
                layout={LinearTransition.springify()}
                style={styles.row}>
                <Avatar emoji={f.emoji} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{f.name}</Text>
                  <Text style={styles.standing} numberOfLines={1}>
                    {arche.tagline}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Badge emoji={arche.emoji} label={arche.title} />
                  <Text style={styles.streak}>🔥 {f.streak}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <TabActions />
      </ScrollView>
    </Screen>
  );
}

function Badge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.archeBadge}>
      <Text style={styles.archeEmoji}>{emoji}</Text>
      <Text style={styles.archeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, marginTop: 2 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleHint: { ...type.caption, color: colors.textMute },
  section: { gap: 10 },
  sectionLabel: { ...type.micro, color: colors.textMute, letterSpacing: 1.2 },
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
