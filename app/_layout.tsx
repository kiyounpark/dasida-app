import { useCallback, useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { CurrentLearnerProvider, useCurrentLearner } from '@/features/learner/provider';
import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';
import { Dimensions, Platform } from 'react-native';

import { lockToLandscape, lockToPortrait } from '@/hooks/use-orientation-lock';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenTracking } from '@/features/analytics/use-screen-tracking';
import { logEvent } from '@/features/analytics/log-event';
import type { NotificationType } from '@/features/analytics/event-types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Android foreground 알림 표시
    shouldShowBanner: true, // iOS 14+ banner
    shouldShowList: true, // iOS 14+ notification center
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Fast refresh or unsupported platforms can call this more than once.
});

if (process.env.EXPO_OS === 'android') {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function SplashGate() {
  const { authGateState, isReady } = useCurrentLearner();
  const [splashHidden, setSplashHidden] = useState(false);
  const pendingTaskIdRef = useRef<string | null>(null);
  const handledNotificationIdRef = useRef<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'SUIT-Regular': require('../assets/fonts/SUIT-Regular.ttf'),
    'SUIT-Medium': require('../assets/fonts/SUIT-Medium.ttf'),
    'SUIT-SemiBold': require('../assets/fonts/SUIT-SemiBold.ttf'),
    'SUIT-Bold': require('../assets/fonts/SUIT-Bold.ttf'),
    'SUIT-ExtraBold': require('../assets/fonts/SUIT-ExtraBold.ttf'),
    'GowunBatang-Regular': require('../assets/fonts/GowunBatang-Regular.ttf'),
    'GowunBatang-Bold': require('../assets/fonts/GowunBatang-Bold.ttf'),
  });

  const hideSplash = useCallback(() => {
    setSplashHidden((prev) => {
      if (prev) return prev;
      void SplashScreen.hideAsync().catch(() => {});
      return true;
    });
  }, []);

  // splash가 내려가고 인증이 정상 상태일 때만 cold-start 알림 라우팅 실행.
  // 3초 강제 타임아웃이 발동해도 인증이 'required'/'loading'이면 sign-in으로 튕기므로 보류.
  useEffect(() => {
    if (!splashHidden) return;
    if (!isReady) return;
    if (authGateState !== 'authenticated' && authGateState !== 'guest-dev') return;
    if (!pendingTaskIdRef.current) return;
    const taskId = pendingTaskIdRef.current;
    pendingTaskIdRef.current = null;
    router.push({ pathname: '/quiz/review-session', params: { taskId } });
  }, [splashHidden, isReady, authGateState]);

  // 콜드스타트 알림 페이로드 캡처 (Stack 마운트 전에 ref에만 저장)
  useEffect(() => {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      handledNotificationIdRef.current = lastResponse.notification.request.identifier;
      const data = lastResponse.notification.request.content.data ?? {};
      const taskId = typeof data.taskId === 'string' ? data.taskId : undefined;
      const notificationType: NotificationType =
        data.notificationType === 'review_reminder' ? 'review_reminder' : 'unknown';
      const scheduledAt = typeof data.scheduledAt === 'string' ? data.scheduledAt : undefined;
      logEvent('notification_opened', {
        notification_type: notificationType,
        task_id: taskId,
        scheduled_at: scheduledAt,
        opened_at: new Date().toISOString(),
      });
      if (taskId) {
        pendingTaskIdRef.current = taskId;
      }
    }

    // 포그라운드/백그라운드 알림 탭
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.identifier === handledNotificationIdRef.current) return;
      const data = response.notification.request.content.data ?? {};
      const taskId = typeof data.taskId === 'string' ? data.taskId : undefined;
      const notificationType: NotificationType =
        data.notificationType === 'review_reminder' ? 'review_reminder' : 'unknown';
      const scheduledAt = typeof data.scheduledAt === 'string' ? data.scheduledAt : undefined;
      logEvent('notification_opened', {
        notification_type: notificationType,
        task_id: taskId,
        scheduled_at: scheduledAt,
        opened_at: new Date().toISOString(),
      });
      if (taskId) {
        router.push({ pathname: '/quiz/review-session', params: { taskId } });
      }
    });
    return () => subscription.remove();
  }, []);

  // 캐릭터 이미지 프리로드 (스플래시 유지 시간을 활용)
  useEffect(() => {
    void Asset.loadAsync([
      require('../assets/images/characters/char_04.png'),
      require('../assets/images/characters/char_07.png'),
      require('../assets/images/characters/char_sparkle_sunglasses.png'),
    ]).catch(() => {});
  }, []);

  // 폰트 에러 로그
  useEffect(() => {
    if (fontError) {
      console.warn('SUIT font loading failed, using system fallback instead.', fontError);
    }
  }, [fontError]);

  // 정상 케이스: 폰트 + 인증 둘 다 ready되면 스플래시 내림
  useEffect(() => {
    const fontsReady = fontsLoaded || !!fontError;
    const authReady = isReady && authGateState !== 'loading';
    if (fontsReady && authReady) {
      hideSplash();
    }
  }, [fontsLoaded, fontError, isReady, authGateState, hideSplash]);

  // 안전장치: 3초가 지나도 스플래시가 떠 있으면 강제로 내림
  useEffect(() => {
    if (splashHidden) return;
    const timer = setTimeout(() => {
      console.warn('[splash] forced hide after 3s timeout');
      hideSplash();
    }, 3000);
    return () => clearTimeout(timer);
  }, [splashHidden, hideSplash]);

  return null;
}

function AuthGateRedirector() {
  const { authGateState, isReady, profile } = useCurrentLearner();
  const segments = useSegments();
  const rootSegment = segments[0];
  const isSignInRoute = rootSegment === 'sign-in';
  const isTabsRoute = rootSegment === '(tabs)';
  const isOnboardingRoute = rootSegment === 'onboarding';

  useEffect(() => {
    if (!isReady || authGateState === 'loading') {
      return;
    }

    if (authGateState === 'required') {
      if (isTabsRoute || isOnboardingRoute) {
        router.replace('/sign-in');
      }
      return;
    }

    if (isSignInRoute) {
      if (profile?.grade === 'unknown' || !profile?.nickname) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/quiz');
      }
    }
  }, [authGateState, isReady, isOnboardingRoute, isSignInRoute, isTabsRoute, profile]);

  return null;
}

function ScreenTracker() {
  useScreenTracking();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // iOS는 Info.plist의 UISupportedInterfaceOrientations(~ipad 포함)가 정적으로 처리.
    // Android는 디바이스-클래스 분기가 manifest 차원에 없어 런타임 lock 사용.
    if (Platform.OS !== 'android') return;
    const screen = Dimensions.get('screen');
    const shorterEdge = Math.min(screen.width, screen.height);
    const isTabletDevice = shorterEdge >= 600;
    if (isTabletDevice) {
      void lockToLandscape();
    } else {
      void lockToPortrait();
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <CurrentLearnerProvider>
          <ExamSessionProvider>
            <SplashGate />
            <AuthGateRedirector />
            <ScreenTracker />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="quiz" options={{ headerShown: false, gestureEnabled: false }} />
              {__DEV__ ? <Stack.Screen name="dev" options={{ title: '개발자 도구' }} /> : null}
            </Stack>
          </ExamSessionProvider>
        </CurrentLearnerProvider>
        <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
