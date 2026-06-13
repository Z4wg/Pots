import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { usePot } from '@/hooks/usePotRealtime';
import { useIdentity } from '@/hooks/useIdentity';
import { DEMO } from '@/lib/demo';
import type { Pot, PotMember } from '@/lib/types';

interface CoachCard {
  id: string;
  tone: 'warn' | 'win' | 'lose' | 'info';
  emoji: string;
  headline: string;
  body: string;
}

function buildCards(pot: Pot, members: PotMember[], meId: string): CoachCard[] {
  const cards: CoachCard[] = [];
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(pot.window_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  for (const m of members) {
    const isMe = m.user_id === meId;
    const who = isMe ? 'Your' : `${m.display_name}'s`;
    const whoSubject = isMe ? "you're" : `${m.display_name} is`;
    const ratio = pot.threshold_pence > 0 ? m.spent_pence / pot.threshold_pence : 0;

    if (m.status === 'broken') {
      const over = m.spent_pence - pot.threshold_pence;
      cards.push({
        id: `broke-${m.id}`,
        tone: 'lose',
        emoji: '💥',
        headline: `${m.display_name} went ${formatPence(over)} over`,
        body: `${m.display_name} blew the ${pot.category} cap. ${formatPence(
          pot.stake_pence
        )} got redistributed to whoever held the line.`,
      });
    } else if (m.status === 'won') {
      cards.push({
        id: `won-${m.id}`,
        tone: 'win',
        emoji: '🏆',
        headline: `${m.display_name} held the line and took the pot`,
        body: `Discipline paid. ${m.display_name} now holds ${formatPence(m.stake_pence)}.`,
      });
    } else if (ratio >= 0.8) {
      cards.push({
        id: `warn-${m.id}`,
        tone: 'warn',
        emoji: '⚠️',
        headline: `${who} ${formatPence(pot.stake_pence)} is on the line`,
        body: `${whoSubject} ${Math.round(ratio * 100)}% through the ${pot.category} budget with ${daysLeft} ${
          daysLeft === 1 ? 'day' : 'days'
        } to go. One more slip breaks the bet.`,
      });
    }
  }

  if (cards.length === 0) {
    cards.push({
      id: 'all-good',
      tone: 'info',
      emoji: '🌤️',
      headline: 'Everyone is comfortably holding',
      body: `Plenty of headroom on the ${pot.category} budget. Keep checking in to build streaks.`,
    });
  }

  return cards;
}

const TONE: Record<CoachCard['tone'], { border: string; tint: string }> = {
  warn: { border: 'rgba(255,210,74,0.4)', tint: colors.gold },
  win: { border: 'rgba(200,255,0,0.4)', tint: colors.lime },
  lose: { border: 'rgba(255,77,77,0.4)', tint: colors.red },
  info: { border: colors.border, tint: colors.textDim },
};

export default function Coach() {
  const me = useIdentity();
  const { pot, members } = usePot(DEMO.POT_ID);
  const cards = pot ? buildCards(pot, members, me.id) : [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar emoji="🤖" size={44} ring="lime" />
          <View>
            <Text style={styles.title}>Coach</Text>
            <Text style={styles.sub}>Reads the data. Never calls the winner.</Text>
          </View>
        </View>

        {cards.map((c, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(i * 90).springify().damping(16)}>
            <View style={[styles.card, { borderColor: TONE[c.tone].border }]}>
              <Text style={styles.cardEmoji}>{c.emoji}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.headline, { color: TONE[c.tone].tint }]}>{c.headline}</Text>
                <Text style={styles.body}>{c.body}</Text>
              </View>
            </View>
          </Animated.View>
        ))}

        <Card title="How the coach works">
          <Text style={styles.note}>
            Cards are rule-based and read live spending. An optional LLM summary can be wired through
            a Supabase Edge Function (see supabase/functions/coach) so the API key never lives on the
            device. The coach only comments — it never decides who wins or loses.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 18,
  },
  cardEmoji: { fontSize: 28 },
  headline: { ...type.h3 },
  body: { ...type.body, color: colors.textDim, lineHeight: 21 },
  note: { ...type.body, color: colors.textMute, lineHeight: 21 },
});
