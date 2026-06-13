import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, type } from '@/lib/theme';

interface Props {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  small,
}: Props) {
  const handle = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  const isDark = variant === 'primary';
  return (
    <Pressable
      onPress={handle}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variantStyle[variant],
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isDark ? colors.black : colors.text} />
      ) : (
        <Text
          style={[
            styles.label,
            small && styles.labelSmall,
            { color: labelColor[variant] },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const variantStyle: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.lime },
  secondary: { backgroundColor: colors.surfaceHi, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: 'rgba(255,77,77,0.14)', borderWidth: 1, borderColor: colors.redDim },
  ghost: { backgroundColor: 'transparent' },
};

const labelColor: Record<string, string> = {
  primary: colors.black,
  secondary: colors.text,
  danger: colors.red,
  ghost: colors.textDim,
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.4 },
  label: { ...type.h3, fontWeight: '800' },
  labelSmall: { ...type.label },
});
