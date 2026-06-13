import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import type { Comparator, MemberStatus } from '@/lib/types';

interface Props {
  spentPence: number;
  thresholdPence: number;
  category: string;
  status: MemberStatus;
  comparator: Comparator;
  compact?: boolean;
}

export function BetHealthBar({
  spentPence,
  thresholdPence,
  category,
  status,
  comparator,
  compact,
}: Props) {
  const ratio =
    thresholdPence > 0 ? Math.min(spentPence / thresholdPence, 1) : spentPence > 0 ? 1 : 0;
  const over = comparator === 'under' && spentPence > thresholdPence;
  const broken = status === 'broken';
  const danger = broken || over;
  const warn = !danger && ratio >= 0.8;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(fill.value * 100, 3)}%` }));
  const fillColor = danger ? colors.red : warn ? colors.gold : colors.lime;

  const label =
    comparator === 'atleast'
      ? `${formatPence(spentPence)} / ${formatPence(thresholdPence)} ${category} target`
      : `${formatPence(spentPence)} / ${formatPence(thresholdPence)} ${category} budget`;

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, compact && { height: 8 }]}>
        <Animated.View
          style={[styles.fill, fillStyle, { backgroundColor: fillColor }]}
        />
      </View>
      {!compact && (
        <View style={styles.meta}>
          <Text style={[styles.label, { color: danger ? colors.red : colors.textDim }]}>
            {label}
          </Text>
          {warn && <Text style={styles.warn}>{Math.round(ratio * 100)}% used</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, width: '100%' },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLo,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...type.caption },
  warn: { ...type.micro, color: colors.gold },
});
