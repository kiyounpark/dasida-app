import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies } from '@/constants/typography';
import { Colors } from '@/constants/theme';
import { EXAM_DOORS_VISIBLE } from '@/features/quiz/exam/exam-doors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 66 + insets.bottom;
  const tabBarPaddingBottom = 9 + insets.bottom;

  const defaultTabBarStyle = useMemo(() => ({
    backgroundColor: '#FFFEF8',
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
    height: tabBarHeight,
    paddingBottom: tabBarPaddingBottom,
    paddingTop: 8,
  }), [tabBarHeight, tabBarPaddingBottom]);

  // 탭바는 항상 보인다. 예전엔 약점 연습을 완주해야(profile.practiceGraduatedAt)
  // 홈·기출 탭이 열렸는데, 10문제 진단을 걷어내면서 신규 학생은 그 도장을 받을 길이
  // 없어졌다 — 약점 큐가 진단 결과에서만 채워지기 때문이다 (09.15).
  return (
    <Tabs
      initialRouteName="quiz"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          // 줄 높이를 안 주면 SUIT 글꼴 받침이 잘린다(10.03 기윤 폰 「홈」 ㅁ·「설정」 아래). 시뮬레이터에선 안 잘림
          lineHeight: 16,
          fontFamily: FontFamilies.medium,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="quiz"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="doc.text.magnifyingglass" color={color} />
          ),
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
        name="exam"
        options={{
          // 기출은 화면에서만 내렸다 — href: null이면 탭바에서 빠지고 화면 파일은 남는다(exam-doors.ts)
          href: EXAM_DOORS_VISIBLE ? undefined : null,
          title: '기출',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="pencil.and.list.clipboard" color={color} />
          ),
        }}
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
