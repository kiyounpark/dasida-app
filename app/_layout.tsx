import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { CurrentLearnerProvider, useCurrentLearner } from '@/features/learner/provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const { authGateState, isReady } = useCurrentLearner();
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
      router.replace('/(tabs)/quiz');
    }
  }, [authGateState, isReady, isOnboardingRoute, isSignInRoute, isTabsRoute]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.taskId as string | undefined;
      if (taskId) {
        router.push({
          pathname: '/quiz/review-session',
          params: { taskId },
        });
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
