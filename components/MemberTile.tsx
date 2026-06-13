import { LayoutRectangle, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';
import { BetHealthBar } from './BetHealthBar';
import { MoneyCounter } from './MoneyCounter';
import { colors, radius, type } from '@/lib/theme';
import { getArchetype } from '@/lib/archetypes';
import type { Pot, PotMember } from '@/lib/types';

interface Props {
  member: PotMember;
  pot: Pot;
  isMe: boolean;
  onMeasure?: (userId: string, layout: LayoutRectangle) => void;
}

export function MemberTile({ member, pot, isMe, onMeasure }: Props) {
  const broken = member.status === 'broken';
  const archetype = getArchetype(member.archetype);

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18)}
      onLayout={(e) => onMeasure?.(member.user_id, e.nativeEvent.layout)}
      style={[
        styles.tile,
        broken && styles.broken,
        isMe && !broken && styles.me,
      ]}>
      <View style={styles.header}>
        <View style={styles.idRow}>
          <Avatar
            emoji={member.avatar_emoji ?? archetype.emoji}
            size={46}
            ring={broken ? 'red' : member.status === 'won' ? 'lime' : isMe ? 'lime' : 'none'}
          />
          <View style={styles.names}>
            <View style={styles.nameLine}>
              <Text style={styles.name}>{member.display_name ?? 'Member'}</Text>
              {isMe && <Text style={styles.youTag}>YOU</Text>}
            </View>
            <Text style={styles.archetype}>{archetype.title}</Text>
          </View>
        </View>
        <StatusPill status={member.status} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>STAKE</Text>
          <MoneyCounter
            value={member.stake_pence}
            style={styles.stakeValue}
            color={broken ? colors.textMute : colors.lime}
          />
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={styles.streak}>🔥 {member.current_streak}</Text>
        </View>
      </View>

      <BetHealthBar
        spentPence={member.spent_pence}
        thresholdPence={pot.threshold_pence}
        category={pot.category}
        status={member.status}
        comparator={pot.comparator}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  me: { borderColor: 'rgba(200,255,0,0.4)' },
  broken: { borderColor: 'rgba(255,77,77,0.5)', backgroundColor: 'rgba(255,77,77,0.06)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  names: { gap: 2, flexShrink: 1 },
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
  archetype: { ...type.caption, color: colors.textDim },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { gap: 2 },
  statLabel: { ...type.micro, color: colors.textMute },
  stakeValue: { fontSize: 24 },
  streak: { ...type.h3, color: colors.text },
});
