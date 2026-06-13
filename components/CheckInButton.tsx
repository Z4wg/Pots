import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, type } from '@/lib/theme';

interface Props {
  onCheckIn: () => void | Promise<void>;
  disabled?: boolean;
  label?: string;
}

export function CheckInButton({ onCheckIn, disabled, label = 'I held today' }: Props) {
  const scale = useSharedValue(1);
  const check = useSharedValue(0);
  const [justChecked, setJustChecked] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.92, { damping: 12 }),
      withSpring(1.06, { damping: 8 }),
      withSpring(1, { damping: 10 })
    );
    check.value = withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 220 }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setJustChecked(true);
    setTimeout(() => setJustChecked(false), 1400);
    onCheckIn();
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.5 + check.value * 0.5 }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={[styles.btn, disabled && styles.disabled]}>
        <View style={styles.row}>
          <Animated.View style={[styles.checkWrap, checkStyle]} pointerEvents="none">
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Text style={styles.label}>{justChecked ? 'Held. Nice.' : label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.lime,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.lime, fontWeight: '900', fontSize: 14 },
  label: { ...type.h3, color: colors.black, fontWeight: '900' },
});
