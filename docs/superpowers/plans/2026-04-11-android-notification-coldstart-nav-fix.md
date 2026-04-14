# Android 알림 콜드스타트 내비게이션 수정 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android 콜드스타트 시 알림 탭으로 진입할 때 발생하는 "Attempted to navigate before mounting the Root Layout component" 에러 수정

**Architecture:** `getLastNotificationResponse()`로 얻은 cold-start `taskId`를 `useRef`에 임시 저장하고, 폰트 로드 완료(= `<Stack>` 네비게이터 실제 마운트 시점) 이후 `router.push`를 실행하도록 타이밍을 분리한다. foreground/background 리스너는 이미 Stack이 마운트된 상태에서 동작하므로 수정 불필요.

**Tech Stack:** expo-router, expo-notifications, React hooks (`useRef`, `useEffect`)

---

## 파일 구조

| 작업 | 파일 |
|------|------|
| Modify | `app/_layout.tsx` |

---

## 원인 요약

```
RootLayout mount (첫 렌더)
  → fontsLoaded = false → return null   ← Stack 미렌더
  → useEffect[69] 실행
      → getLastNotificationResponse() → taskId 있음
      → router.push(...)               ← Stack 없음 → 에러 💥

(이후) fontsLoaded = true → 재렌더 → Stack 렌더됨
```

foreground/background 리스너 (`addNotificationResponseReceivedListener`)는 앱이 실행 중일 때만 발화하므로 Stack이 이미 마운트된 상태 → 문제 없음.

---

### Task 1: `_layout.tsx` — cold-start 알림 nav 타이밍 분리

**Files:**
- Modify: `app/_layout.tsx`

---

- [ ] **Step 1: `useRef` import 추가 및 `pendingTaskId` ref 선언**

`app/_layout.tsx` line 1의 import를 수정한다:

```tsx
import { useEffect, useRef } from 'react';
```

`RootLayout` 함수 최상단 (line 67 바로 아래)에 ref 선언 추가:

```tsx
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pendingTaskId = useRef<string | null>(null);   // ← 추가
```

---

- [ ] **Step 2: cold-start 처리를 `router.push` → ref 저장으로 변경**

기존 line 69–77 useEffect의 cold-start 블록을 수정한다:

```tsx
useEffect(() => {
  // 콜드스타트: Stack이 아직 마운트되지 않았으므로 ref에만 저장
  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse) {
    const taskId = lastResponse.notification.request.content.data?.taskId as string | undefined;
    if (taskId) {
      pendingTaskId.current = taskId;   // router.push 대신 ref에 저장
    }
  }

  // 포그라운드/백그라운드: 앱 실행 중 알림 탭 (Stack 이미 마운트됨 → 직접 navigate)
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const taskId = response.notification.request.content.data?.taskId as string | undefined;
    if (taskId) {
      router.push({ pathname: '/quiz/review-session', params: { taskId } });
    }
  });
  return () => subscription.remove();
}, []);
```

---

- [ ] **Step 3: 폰트 로드 완료 시점에 pending nav 실행**

기존 line 97–105 fonts useEffect에 pending navigate 처리를 추가한다:

```tsx
useEffect(() => {
  if (fontError) {
    console.warn('SUIT font loading failed, using system fallback instead.', fontError);
  }

  if (fontsLoaded || fontError) {
    void SplashScreen.hideAsync();

    // Stack이 이제 마운트되어 있으므로 cold-start pending 알림 처리
    if (pendingTaskId.current) {
      router.push({ pathname: '/quiz/review-session', params: { taskId: pendingTaskId.current } });
      pendingTaskId.current = null;
    }
  }
}, [fontsLoaded, fontError]);
```

> **왜 여기서 safe한가?**  
> `fontsLoaded || fontError`가 true가 된 순간, 컴포넌트는 더 이상 `return null`을 하지 않고  
> `<Stack>`을 포함한 전체 JSX를 렌더했으며, React `useEffect`는 커밋(DOM 반영) 이후 실행된다.  
> 즉 이 effect가 실행될 때 `<Stack>` 네비게이터는 반드시 마운트된 상태다.

---

- [ ] **Step 4: TypeScript 타입 에러 확인**

```bash
npx tsc --noEmit
```

Expected output: 에러 없음 (exit code 0)

---

- [ ] **Step 5: Android 빌드 및 동작 확인**

```bash
npx expo run:android
```

테스트 시나리오:
1. 앱을 완전히 종료 (백그라운드 아님, 프로세스 kill)
2. Firebase Console 또는 `review-notification-scheduler.ts`로 테스트 알림 발송
3. 알림 배너 탭 → 앱 콜드스타트
4. `/quiz/review-session` 화면으로 정상 진입하는지 확인
5. Metro 콘솔에 에러 없는지 확인

---

- [ ] **Step 6: commit**

```bash
git add app/_layout.tsx
git commit -m "fix(notifications): cold-start 알림 nav 타이밍 수정 — Stack 마운트 후 router.push 실행"
```

---

## 완성된 `_layout.tsx` 전체 (참고)

```tsx
import { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CurrentLearnerProvider, useCurrentLearner } from '@/features/learner/provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

void SplashScreen.preventAutoHideAsync().catch(() => {});

if (process.env.EXPO_OS === 'android') {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGateRedirector() {
  const { authGateState, isReady } = useCurrentLearner();
  const segments = useSegments();
  const rootSegment = segments[0];
  const isSignInRoute = rootSegment === 'sign-in';
  const isTabsRoute = rootSegment === '(tabs)';
  const isOnboardingRoute = rootSegment === 'onboarding';

  useEffect(() => {
    if (!isReady || authGateState === 'loading') return;

    if (authGateState === 'required') {
      if (isTabsRoute || isOnboardingRoute) {
        router.replace('/sign-in');
      }
      return;
    }

    if (isSignInRoute) {
      router.replace('/(tabs)/quiz');
    }
  }, [authGateState, isReady, isOnboardingRoute, isSignInRoute, isTabsRoute]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pendingTaskId = useRef<string | null>(null);

  useEffect(() => {
    // 콜드스타트: Stack 마운트 전이므로 ref에만 저장
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const taskId = lastResponse.notification.request.content.data?.taskId as string | undefined;
      if (taskId) {
        pendingTaskId.current = taskId;
      }
    }

    // 포그라운드/백그라운드: Stack 이미 마운트됨 → 직접 navigate
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.taskId as string | undefined;
      if (taskId) {
        router.push({ pathname: '/quiz/review-session', params: { taskId } });
      }
    });
    return () => subscription.remove();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    'SUIT-Regular': require('../assets/fonts/SUIT-Regular.ttf'),
    'SUIT-Medium': require('../assets/fonts/SUIT-Medium.ttf'),
    'SUIT-SemiBold': require('../assets/fonts/SUIT-SemiBold.ttf'),
    'SUIT-Bold': require('../assets/fonts/SUIT-Bold.ttf'),
    'SUIT-ExtraBold': require('../assets/fonts/SUIT-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.warn('SUIT font loading failed, using system fallback instead.', fontError);
    }

    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();

      // Stack이 마운트된 이후 → cold-start pending 알림 처리
      if (pendingTaskId.current) {
        router.push({ pathname: '/quiz/review-session', params: { taskId: pendingTaskId.current } });
        pendingTaskId.current = null;
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CurrentLearnerProvider>
        <AuthGateRedirector />
        <Stack>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </CurrentLearnerProvider>
      <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
    </ThemeProvider>
  );
}
```
