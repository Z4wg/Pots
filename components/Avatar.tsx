import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/lib/theme';

interface Props {
  emoji: string;
  size?: number;
  ring?: 'lime' | 'red' | 'none';
}

export function Avatar({ emoji, size = 48, ring = 'none' }: Props) {
  const ringColor = ring === 'lime' ? colors.lime : ring === 'red' ? colors.red : colors.border;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          borderColor: ringColor,
          borderWidth: ring === 'none' ? 1 : 2,
        },
      ]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
  },
});
