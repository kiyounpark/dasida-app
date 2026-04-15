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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pendingTaskId = useRef<string | null>(null);

  useEffect(() => {
    // 콜드스타트: Stack이 아직 마운트되지 않았으므로 ref에만 저장
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const taskId = lastResponse.notification.request.content.data?.taskId as string | undefined;
      if (taskId) {
        pendingTaskId.current = taskId;
      }
    }

    // 포그라운드/백그라운드: 앱 실행 중 알림 탭 (Stack 이미 마운트됨)
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
