import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useMemo, useState } from 'react';

import { useFirebaseEmulator } from '@/constants/env';
import { AuthFlowCancelledError } from '@/features/auth/auth-client';
import { getFirebaseAuthInstance } from '@/features/auth/firebase-app';
import type { SupportedAuthProvider } from '@/features/auth/types';
import { useCurrentLearner } from '@/features/learner/provider';

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function getProviderLabel(provider: SupportedAuthProvider) {
  return provider === 'apple' ? 'Apple로 계속' : 'Google로 계속';
}

function getBlockingCopy(reason: ReturnType<typeof useCurrentLearner>['authBlockingReason']) {
  if (reason === 'firebase_not_configured') {
    return {
      title: '로그인 설정이 아직 준비되지 않았어요',
      body: '이 빌드에는 Firebase Auth 설정이 없어 소셜 로그인을 시작할 수 없습니다.',
    };
  }

  return {
    title: '이 빌드에서는 로그인 제공자를 찾지 못했어요',
    body: 'Google 또는 Apple 로그인 구성이 누락되었는지 확인해 주세요.',
  };
}

export type UseSignInScreenResult = ReturnType<typeof useSignInScreen>;

export function useSignInScreen() {
  const {
    authBlockingReason,
    availableAuthProviders,
    canUseDevGuestAuth,
    continueAsDevGuest,
    refresh,
    signIn,
  } = useCurrentLearner();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supportedAuthProviders = useMemo(
    () =>
      availableAuthProviders.map((provider) => ({
        id: provider,
        label: getProviderLabel(provider),
      })),
    [availableAuthProviders],
  );

  async function handleSignIn(provider: SupportedAuthProvider) {
    setBusyAction(provider);
    setErrorMessage(null);

    try {
      await signIn(provider);
      router.replace('/(tabs)/quiz');
    } catch (error) {
      if (!(error instanceof AuthFlowCancelledError)) {
        setErrorMessage(formatErrorMessage(error));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleContinueAsDevGuest() {
    setBusyAction('dev-guest');
    setErrorMessage(null);

    try {
      await continueAsDevGuest();
      router.replace('/(tabs)/quiz');
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignInWithTestAccount() {
    setBusyAction('test-account');
    setErrorMessage(null);

    try {
      await signInWithEmailAndPassword(
        getFirebaseAuthInstance(),
        'test@emulator.local',
        'testpass123',
      );
      await refresh();
      router.replace('/(tabs)/quiz');
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  return {
    blockingCopy: supportedAuthProviders.length === 0 ? getBlockingCopy(authBlockingReason) : null,
    busyAction,
    canUseDevGuestAuth,
    errorMessage,
    supportedAuthProviders,
    onContinueAsDevGuest: handleContinueAsDevGuest,
    onSignIn: handleSignIn,
    onSignInWithTestAccount: useFirebaseEmulator ? handleSignInWithTestAccount : undefined,
  };
}
