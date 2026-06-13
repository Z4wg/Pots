import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { colors } from '@/lib/theme';
import { hydrateIdentity } from '@/hooks/useIdentity';
import { hydrateProfile } from '@/hooks/useProfile';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    hydrateIdentity();
    hydrateProfile();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="connect" />
          <Stack.Screen name="create" />
          <Stack.Screen name="invite/[potId]" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join/[code]" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
