import { useEffect, useState } from 'react';

import { AuthFlowCancelledError } from '@/features/auth/auth-client';
import { isFirebaseAuthConfigured } from '@/features/auth/firebase-config';
import { useCurrentLearner } from '@/features/learner/provider';
import type { PreviewSeedState } from '@/features/learner/types';
import { isLearningHistoryRemoteCrudConfigured } from '@/features/learning/create-learning-history-repository';

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
  { value: 'exam-in-progress', label: '모의고사 진행 중' },
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
    availableAuthProviders,
    getHistoryMigrationStatus,
    homeState,
    importAnonymousHistory,
    isReady,
    profile,
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
  const [migrationPrompt, setMigrationPrompt] = useState<MigrationCandidate | null>(null);
  const [manualImportCandidate, setManualImportCandidate] = useState<MigrationCandidate | null>(null);

  const showAuthSection =
    isFirebaseAuthConfigured() &&
    isLearningHistoryRemoteCrudConfigured() &&
    availableAuthProviders.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadManualImportCandidate() {
      if (session?.status !== 'authenticated') {
        if (isMounted) {
          setManualImportCandidate(null);
          setMigrationPrompt(null);
        }
        return;
      }

      try {
        const status = await getHistoryMigrationStatus();
        if (!isMounted) {
          return;
        }

        if (status.state === 'ready') {
          const candidate = {
            sourceAccountKey: status.sourceAccountKey,
            recordCount: status.recordCount,
          };
          setManualImportCandidate(candidate);
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
      const status = await signIn(provider);
      if (status.state === 'ready') {
        const candidate = {
          sourceAccountKey: status.sourceAccountKey,
          recordCount: status.recordCount,
        };
        setMigrationPrompt(candidate);
        setManualImportCandidate(candidate);
      } else {
        setMigrationPrompt(null);
        if (status.state !== 'already_imported') {
          setManualImportCandidate(null);
        }
      }
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
      setMigrationPrompt(null);
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
      setMigrationPrompt(null);
      setManualImportCandidate(null);
      await refresh();
    } catch (error) {
      setMigrationPrompt(null);
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
    isAnonymousSession: session?.status === 'anonymous',
    isImporting: busyAction === 'import',
    isReady,
    manualImportCandidate,
    migrationPrompt,
    noticeMessage,
    previewStates,
    profile,
    session,
    showAuthSection,
    supportedAuthProviders: availableAuthProviders,
    onCloseMigrationPrompt: () => {
      setMigrationPrompt(null);
    },
    onConfirmMigrationPrompt: async () => {
      if (!migrationPrompt) {
        return;
      }

      await handleImport(migrationPrompt.sourceAccountKey);
    },
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
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
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
