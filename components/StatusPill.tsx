import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '@/lib/theme';
import type { MemberStatus } from '@/lib/types';

const MAP: Record<MemberStatus, { label: string; fg: string; bg: string }> = {
  active: { label: 'HOLDING', fg: colors.lime, bg: colors.limeGlow },
  won: { label: 'WON', fg: colors.lime, bg: colors.limeGlow },
  broken: { label: 'BROKE', fg: colors.red, bg: colors.redGlow },
};

export function StatusPill({ status }: { status: MemberStatus }) {
  const s = MAP[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...type.micro },
});
