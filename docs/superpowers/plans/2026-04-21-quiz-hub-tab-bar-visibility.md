# 퀴즈 허브 탭 바 조건부 표시 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 여정 진행 중에는 하단 탭 바를 숨기고, 졸업 완료(`practiceGraduatedAt` 존재) 후에는 다시 표시한다.

**Architecture:** `(tabs)/_layout.tsx`에서 `useCurrentLearner()`로 `profile.practiceGraduatedAt`을 읽어 `isGraduated`를 계산하고, quiz `Tabs.Screen`의 `tabBarStyle`을 조건부로 설정한다. 현재 하드코딩된 `{ display: 'none' }`을 이 조건부 로직으로 교체한다.

**Tech Stack:** Expo Router 6, React Context (`CurrentLearnerProvider` / `useCurrentLearner`)

---

### Task 1: `useCurrentLearner` 기반 조건부 탭 바 로직 적용

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

현재 상태: quiz `Tabs.Screen`에 `tabBarStyle: { display: 'none' }` 하드코딩됨  
목표: `profile.practiceGraduatedAt` 유무에 따라 탭 바 표시/숨김 결정

- [ ] **Step 1: `app/(tabs)/_layout.tsx` 수정**

아래 최종 코드로 교체한다:

```tsx
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
```

- [ ] **Step 2: 동작 확인 (수동 테스트)**

시뮬레이터 또는 기기에서 아래 시나리오를 확인한다:

| 시나리오 | 기대 결과 |
|---|---|
| 앱 최초 실행 (미졸업) | 퀴즈 허브에서 탭 바 **없음** |
| 내 기록 탭 탭 | 탭 바 **표시됨** |
| 다시 퀴즈 탭 탭 | 탭 바 **없음** |
| 졸업 완료 후 퀴즈 허브 | 탭 바 **표시됨** |

졸업 상태 강제 확인법 (Firebase Emulator 또는 Firestore에서 `practiceGraduatedAt` 필드를 임의로 추가 후 앱 재기동):
```
users/{uid}/profile/data → practiceGraduatedAt: "2026-04-21T00:00:00.000Z"
```

- [ ] **Step 3: 커밋**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat(tabs): 졸업 여부에 따라 퀴즈 탭 바 조건부 표시"
git push origin main
```
