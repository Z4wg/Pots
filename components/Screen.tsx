import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, radius, type } from '@/lib/theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  // Subtle colored glow at the top for the "expensive" feel.
  glow?: 'lime' | 'red' | 'none';
  // Optional dismiss control (top-right). Shows "✕" by default; pass closeLabel
  // for a text affordance like "Skip".
  onClose?: () => void;
  closeLabel?: string;
}

export function Screen({ children, style, glow = 'lime', onClose, closeLabel }: Props) {
  return (
    <View style={styles.root}>
      {glow !== 'none' && (
        <LinearGradient
          colors={
            glow === 'lime'
              ? ['rgba(200,255,0,0.12)', 'rgba(11,11,15,0)']
              : ['rgba(255,77,77,0.12)', 'rgba(11,11,15,0)']
          }
          style={styles.glow}
          pointerEvents="none"
        />
      )}
      <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
        {onClose && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onClose();
            }}
            hitSlop={14}
            style={({ pressed }) => [
              styles.close,
              closeLabel ? styles.closePill : styles.closeRound,
              pressed && { opacity: 0.6 },
            ]}>
            <Text style={styles.closeText}>{closeLabel ?? '✕'}</Text>
          </Pressable>
        )}
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  safe: { flex: 1 },
  close: {
    position: 'absolute',
    top: 6,
    right: 16,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeRound: { width: 36, height: 36, borderRadius: 18 },
  closePill: { paddingHorizontal: 16, height: 36, borderRadius: radius.pill },
  closeText: { ...type.label, color: colors.textDim },
});
