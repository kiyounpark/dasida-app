import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { AuthFlowCancelledError } from '@/features/auth/auth-client';
import { useCurrentLearner } from '@/features/learner/provider';
import type { PreviewSeedState } from '@/features/learner/types';
import {
  requestNotificationPermission,
  scheduleTestNotification,
} from '@/features/quiz/notifications/review-notification-scheduler';

type MigrationCandidate = {
  sourceAccountKey: string;
  recordCount: number;
};

export type UseProfileScreenResult = ReturnType<typeof useProfileScreen>;

const gradeOptions = [
  { value: 'g1', label: '고1' },
  { value: 'g2', label: '고2' },
  { value: 'g3', label: '고3' },
  { value: 'unknown', label: '미설정' },
] as const;

const previewStates: { value: PreviewSeedState; label: string }[] = [
  { value: 'fresh', label: '첫 설치' },
  { value: 'diagnostic-complete', label: '진단 완료' },
  { value: 'review-available', label: '오늘 복습 있음' },
  { value: 'review-day3-available', label: 'DAY 3 복습 있음' },
  { value: 'review-day7-available', label: 'DAY 7 복습 있음' },
  { value: 'review-day30-available', label: 'DAY 30 복습 있음' },
  { value: 'exam-in-progress', label: '모의고사 진행 중' },
  { value: 'practice-graduated', label: '약점 연습 완료' },
];

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function isCancelledAuthError(error: unknown) {
  if (error instanceof AuthFlowCancelledError) {
    return true;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  ) {
    return true;
  }

  return false;
}

export function useProfileScreen() {
  const {
    authGateState,
    availableAuthProviders,
    deleteAccount,
    getHistoryMigrationStatus,
    homeState,
    importAnonymousHistory,
    isReady,
    profile,
    pullReviewDueDates,
    refresh,
    resetLocalProfile,
    seedPreview,
    session,
    signIn,
    signOut,
    updateGrade,
  } = useCurrentLearner();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [manualImportCandidate, setManualImportCandidate] = useState<MigrationCandidate | null>(null);
  const isDevBuild = __DEV__;
  const isGuestDevSession = authGateState === 'guest-dev';

  useEffect(() => {
    let isMounted = true;

    async function loadManualImportCandidate() {
      if (session?.status !== 'authenticated') {
        if (isMounted) {
          setManualImportCandidate(null);
        }
        return;
      }

      try {
        const status = await getHistoryMigrationStatus();
        if (!isMounted) {
          return;
        }

        if (status.state === 'ready') {
          setManualImportCandidate({
            sourceAccountKey: status.sourceAccountKey,
            recordCount: status.recordCount,
          });
          return;
        }

        setManualImportCandidate(null);
      } catch {
        if (isMounted) {
          setManualImportCandidate(null);
        }
      }
    }

    void loadManualImportCandidate();

    return () => {
      isMounted = false;
    };
  }, [getHistoryMigrationStatus, session?.accountKey, session?.status]);

  async function handleSignIn(provider: (typeof availableAuthProviders)[number]) {
    setBusyAction(provider);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await signIn(provider);
      router.replace('/(tabs)/quiz');
    } catch (error) {
      if (!isCancelledAuthError(error)) {
        setErrorMessage(formatErrorMessage(error));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut() {
    setBusyAction('sign-out');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await signOut();
      setManualImportCandidate(null);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImport(sourceAccountKey: string) {
    setBusyAction('import');
    setErrorMessage(null);

    try {
      const status = await importAnonymousHistory(sourceAccountKey);
      if (status.state === 'completed' || status.state === 'already_imported') {
        setNoticeMessage('이 기기의 기록을 계정에 저장했습니다.');
      }
      setManualImportCandidate(null);
      await refresh();
    } catch (error) {
      setErrorMessage(`로컬 기록 가져오기에 실패했습니다. ${formatErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleManualImport() {
    if (!manualImportCandidate) {
      return;
    }

    await handleImport(manualImportCandidate.sourceAccountKey);
  }

  return {
    busyAction,
    errorMessage,
    gradeOptions,
    homeState,
    isDevBuild,
    isGuestDevSession,
    isImporting: busyAction === 'import',
    isReady,
    manualImportCandidate,
    noticeMessage,
    previewStates,
    profile,
    session,
    supportedAuthProviders: availableAuthProviders,
    onImportLocalHistory: handleManualImport,
    onResetLocalProfile: async () => {
      setBusyAction('reset-local');
      setErrorMessage(null);
      setNoticeMessage(null);

      try {
        await resetLocalProfile();
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    onPullReviewDueDates: async () => {
      setBusyAction('pull-review-dates');
      setErrorMessage(null);
      try {
        await pullReviewDueDates();
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    onSeedPreview: async (state: PreviewSeedState) => {
      setBusyAction(`preview:${state}`);
      setErrorMessage(null);

      try {
        await seedPreview(state);
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    onTestNotification: async () => {
      setBusyAction('test-notification');
      setErrorMessage(null);
      setNoticeMessage(null);

      try {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setErrorMessage('알림 권한이 거부됐습니다. 설정에서 알림을 허용해주세요.');
          return;
        }

        await scheduleTestNotification();

        setNoticeMessage('5초 후 테스트 알림 발송됩니다. 앱을 백그라운드로 내리세요.');
      } catch (error) {
        setErrorMessage(`알림 테스트 실패: ${formatErrorMessage(error)}`);
      } finally {
        setBusyAction(null);
      }
    },
    onGoToOnboarding: () => router.push('/onboarding'),
    onGoToDevHub: () => router.push('/dev'),
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
    onDeleteAccount: async () => {
      setBusyAction('delete-account');
      setErrorMessage(null);
      setNoticeMessage(null);

      try {
        await deleteAccount();
        router.replace('/sign-in');
      } catch (error) {
        setErrorMessage(`탈퇴에 실패했습니다. ${formatErrorMessage(error)}`);
      } finally {
        setBusyAction(null);
      }
    },
    onUpdateGrade: async (grade: (typeof gradeOptions)[number]['value']) => {
      setBusyAction(`grade:${grade}`);
      setErrorMessage(null);

      try {
        await updateGrade(grade);
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
  };
}
