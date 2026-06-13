import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';
import { formatPence } from '@/lib/money';

export interface CoinSpec {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  amount: number;
}

interface Props {
  spec: CoinSpec;
  onArrive: (id: string) => void;
}

const SIZE = 44;
const DURATION = 700;

// A chip that flies from the broken tile to the holder tile, then fires a
// success haptic on arrival (the centerpiece "payout slide").
export function PayoutCoin({ spec, onArrive }: Props) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 140 }),
      withDelay(DURATION - 200, withTiming(0, { duration: 260 }))
    );
    scale.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(DURATION - 380, withTiming(0.7, { duration: 200 }))
    );
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.out(Easing.exp) },
      (finished) => {
        if (finished) {
          runOnJS(fireArrival)();
        }
      }
    );

    function fireArrival() {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onArrive(spec.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => {
    const x = spec.from.x + (spec.to.x - spec.from.x) * progress.value;
    // slight arc upward in the middle of the flight
    const arc = -40 * Math.sin(progress.value * Math.PI);
    const y = spec.from.y + (spec.to.y - spec.from.y) * progress.value + arc;
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.coin, style]} pointerEvents="none">
      <Text style={styles.amount}>{formatPence(spec.amount)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coin: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    zIndex: 100,
  },
  amount: { color: colors.black, fontWeight: '900', fontSize: 12 },
});
