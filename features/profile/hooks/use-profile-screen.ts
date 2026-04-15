import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';

type MigrationCandidate = {
  sourceAccountKey: string;
  recordCount: number;
};

export type UseProfileScreenResult = ReturnType<typeof useProfileScreen>;

const gradeOptions = [
  { value: 'g1', label: '고1' },
  { value: 'g2', label: '고2' },
  { value: 'g3', label: '고3' },
] as const;

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export function useProfileScreen() {
  const {
    clearLearningHistory,
    deleteAccount,
    getHistoryMigrationStatus,
    importAnonymousHistory,
    profile,
    refresh,
    session,
    signOut,
    updateOnboardingProfile,
  } = useCurrentLearner();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [manualImportCandidate, setManualImportCandidate] = useState<MigrationCandidate | null>(null);

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
    manualImportCandidate,
    noticeMessage,
    profile,
    session,
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
    onImportLocalHistory: handleManualImport,
    onSignOut: handleSignOut,
    onUpdateGradeAndTrack: async (
      grade: 'g1' | 'g2' | 'g3',
      track?: 'calc' | 'stats' | 'geom',
    ) => {
      setBusyAction(`grade:${grade}`);
      setErrorMessage(null);

      try {
        // 히스토리 초기화: 로컬(anonymous) 사용자에게는 완전 초기화, authenticated 사용자는
        // 로컬 캐시만 초기화됨 (Firestore 기록은 유지). 실패해도 학년 변경은 진행.
        try {
          await clearLearningHistory();
        } catch {
          // best-effort — 학년 변경 자체는 막지 않음
        }
        await updateOnboardingProfile(
          profile?.nickname ?? '',
          grade,
          grade === 'g3' ? track : undefined,
        );
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
  };
}
