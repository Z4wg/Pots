import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/lib/theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  // Subtle colored glow at the top for the "expensive" feel.
  glow?: 'lime' | 'red' | 'none';
}

export function Screen({ children, style, glow = 'lime' }: Props) {
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
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  safe: { flex: 1 },
});
