import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies } from '@/constants/typography';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLearner } from '@/features/learner/provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 66 + insets.bottom;
  const tabBarPaddingBottom = 9 + insets.bottom;
  const { profile } = useCurrentLearner();
  const isGraduated = Boolean(profile?.practiceGraduatedAt);

  const defaultTabBarStyle = {
    backgroundColor: '#FFFEF8',
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
    height: tabBarHeight,
    paddingBottom: tabBarPaddingBottom,
    paddingTop: 8,
  } as const;

  return (
    <Tabs
      initialRouteName="quiz"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: FontFamilies.medium,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="quiz"
        options={{
          title: '문제 풀기',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="doc.text.magnifyingglass" color={color} />
          ),
          tabBarStyle: isGraduated ? defaultTabBarStyle : { display: 'none' },
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            const state = navigation.getState();
            const currentRoute = state.routes[state.index];
            if (currentRoute.key === route.key) {
              event.preventDefault();
            }
          },
        })}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '내 기록',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="note.text" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
