import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';
import { formatPence, formatPounds } from '@/lib/money';

interface Props {
  value: number; // integer pence
  style?: TextStyle;
  wholePounds?: boolean; // hide pennies (for hero totals)
  haptics?: boolean;
  color?: string;
}

export function MoneyCounter({ value, style, wholePounds, haptics = true, color }: Props) {
  const progress = useSharedValue(value);
  const pop = useSharedValue(1);
  const [display, setDisplay] = useState(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      progress.value = value;
      setDisplay(value);
      return;
    }
    progress.value = withTiming(value, { duration: 600, easing: Easing.out(Easing.cubic) });
    pop.value = withSequence(
      withTiming(1.14, { duration: 160 }),
      withTiming(1, { duration: 260 })
    );
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useAnimatedReaction(
    () => progress.value,
    (cur) => {
      runOnJS(setDisplay)(Math.round(cur));
    }
  );

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const text = wholePounds ? formatPounds(display) : formatPence(display);

  return (
    <Animated.Text style={[styles.text, { color: color ?? colors.text }, style, animStyle]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: { fontWeight: '900', letterSpacing: -1 },
});
