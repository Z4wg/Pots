import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { colors, radius, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import type { PotEvent } from '@/lib/types';

const CAT_LABEL: Record<string, string> = {
  cafe: 'cafés',
  going_out: 'going out',
  grocery: 'groceries',
  transport: 'transport',
  savings: 'savings',
};

function catLabel(cat: string | undefined): string {
  return (cat && CAT_LABEL[cat]) ?? cat ?? 'the bet';
}

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
    case 'sync':
      // v2 §5/§6: feed events derive from the bet's metric.
      return p.metric === 'spend'
        ? {
            icon: '🔄',
            text: `${e.actor_name} synced · spent ${formatPence(p.amount ?? 0)} on ${catLabel(p.category)}`,
            tint: colors.textDim,
          }
        : {
            icon: '💪',
            text: `${e.actor_name} synced · saved ${formatPence(p.amount ?? 0)} this week`,
            tint: colors.lime,
          };
    case 'spend':
      // Only in-category spend reaches the feed (gated in recordTransaction).
      return {
        icon: '💳',
        text: `${e.actor_name} spent ${formatPence(p.amount ?? 0)} on ${catLabel(p.category)}${
          p.merchant ? ` (${p.merchant})` : ''
        }`,
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
    case 'paid':
      return {
        icon: '💰',
        text: `${e.actor_name} paid ${formatPence(p.amount ?? 0)} into the pot`,
        tint: colors.lime,
      };
    case 'milestone':
      return {
        icon: '📈',
        text: `${e.actor_name} saved ${formatPence(p.saved ?? 0)}${
          p.total ? ` · ${formatPence(p.total)} total` : ''
        }`,
        tint: colors.lime,
      };
    case 'rank_up':
      return { icon: '🔼', text: `${e.actor_name} climbed to #${p.rank ?? '?'}`, tint: colors.lime };
    case 'rank_down':
      return { icon: '🔽', text: `${e.actor_name} slipped to #${p.rank ?? '?'}`, tint: colors.red };
    default:
      return { icon: '•', text: e.kind, tint: colors.textDim };
  }
}

export function EventFeed({ events, limit }: { events: PotEvent[]; limit?: number }) {
  const ordered = [...events].reverse(); // newest first
  const shown = limit ? ordered.slice(0, limit) : ordered;
  const hidden = ordered.length - shown.length;

  if (ordered.length === 0) {
    return <Text style={styles.empty}>No activity yet. Sync to get things moving.</Text>;
  }

  return (
    <View style={styles.list}>
      {shown.map((e) => {
        const d = describe(e);
        return (
          <Animated.View
            key={e.id}
            entering={FadeInDown.springify().damping(16)}
            layout={LinearTransition.springify()}
            style={styles.row}>
            <Text style={styles.icon}>{d.icon}</Text>
            <Text style={[styles.text, { color: d.tint }]} numberOfLines={1}>
              {d.text}
            </Text>
          </Animated.View>
        );
      })}
      {hidden > 0 && <Text style={styles.more}>+{hidden} more</Text>}
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
  more: { ...type.caption, color: colors.textMute, textAlign: 'center', paddingTop: 2 },
});
