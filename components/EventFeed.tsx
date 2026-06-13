import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { colors, radius, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import type { PotEvent } from '@/lib/types';

function describe(e: PotEvent): { icon: string; text: string; tint: string } {
  const p = e.payload ?? {};
  switch (e.kind) {
    case 'join':
      return { icon: '👋', text: `${e.actor_name} joined the pot`, tint: colors.textDim };
    case 'check_in':
      return {
        icon: '✅',
        text: `${e.actor_name} held the line${p.streak ? ` · streak ${p.streak}` : ''}`,
        tint: colors.lime,
      };
    case 'spend':
      return {
        icon: '💳',
        text: `${e.actor_name} spent ${formatPence(p.amount ?? 0)} at ${p.merchant ?? 'a shop'}`,
        tint: colors.textDim,
      };
    case 'broke':
      return {
        icon: '💥',
        text: `${e.actor_name} blew their ${p.category ?? 'budget'}`,
        tint: colors.red,
      };
    case 'redistribute':
      return {
        icon: '💸',
        text: `${formatPence(p.amount ?? 0)} from ${p.from} goes to ${p.to}`,
        tint: colors.lime,
      };
    case 'won':
      return { icon: '🏆', text: `${e.actor_name} held the line and won`, tint: colors.lime };
    default:
      return { icon: '•', text: e.kind, tint: colors.textDim };
  }
}

export function EventFeed({ events }: { events: PotEvent[] }) {
  const ordered = [...events].reverse(); // newest first

  if (ordered.length === 0) {
    return <Text style={styles.empty}>No activity yet. Check in to get things moving.</Text>;
  }

  return (
    <View style={styles.list}>
      {ordered.map((e) => {
        const d = describe(e);
        return (
          <Animated.View
            key={e.id}
            entering={FadeInDown.springify().damping(16)}
            layout={LinearTransition.springify()}
            style={styles.row}>
            <Text style={styles.icon}>{d.icon}</Text>
            <Text style={[styles.text, { color: d.tint }]}>{d.text}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLo,
    marginBottom: 6,
  },
  icon: { fontSize: 16 },
  text: { ...type.body, flexShrink: 1 },
  empty: { ...type.body, color: colors.textMute, paddingVertical: 12 },
});
