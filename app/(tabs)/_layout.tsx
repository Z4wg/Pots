import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import { colors } from '@/lib/theme';

function HapticTab(props: any) {
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        Haptics.selectionAsync().catch(() => {});
        props.onPress?.(e);
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textMute,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pot',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buckets"
        options={{
          title: 'Buckets',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
