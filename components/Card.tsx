import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, type } from '@/lib/theme';

interface Props {
  children: ReactNode;
  title?: string;
  style?: ViewStyle;
  accent?: boolean;
}

export function Card({ children, title, style, accent }: Props) {
  return (
    <View style={[styles.card, accent && styles.accent, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  accent: { borderColor: 'rgba(200,255,0,0.35)' },
  title: { ...type.label, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.6 },
});
