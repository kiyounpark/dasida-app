import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { useCurrentLearner } from '@/features/learner/provider';
import { buildDiagnosticAttemptInput } from '@/features/quiz/build-finalized-attempt-input';
import {
  requestNotificationPermission,
  scheduleReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';
import { useQuizSession } from '@/features/quiz/session';

const resultScreenReviewStore = new LocalReviewTaskStore();

export type QuizResultRouteParams = {
  legacyNextStep?: string;
  legacyWeaknessKey?: string;
  requestedSource?: string;
};

export type ResultSaveState = 'idle' | 'saving' | 'saved' | 'error';

function getSaveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '결과를 저장하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.';
}

export type UseResultScreenResult = {
  legacyNextStep?: string;
  legacyPracticeParams: { mode: 'weakness'; weaknessId?: string; weakTag?: string };
  legacyWeaknessId: ReturnType<typeof resolveWeaknessId>;
  liveSummary: ReturnType<typeof useQuizSession>['state']['result'];
  onCloseReport: () => void;
  onOpenChallengePractice: () => void;
  onOpenLegacyPractice: () => void;
  onOpenSnapshotDiagnostic: () => void;
  onOpenSnapshotPractice: (weaknessId: string) => void;
  onOpenWeaknessPractice: (weaknessId: string) => void;
  onRestartQuiz: () => void;
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: ResultSaveState;
  snapshotSummary: ReturnType<typeof useCurrentLearner>['summary'] extends infer Summary
    ? Summary extends { latestDiagnosticSummary?: infer Snapshot }
      ? Snapshot | undefined
      : never
    : never;
  snapshotSummaryTitle: string | null;
};

export function useResultScreen({
  legacyNextStep,
  legacyWeaknessKey,
  requestedSource,
}: QuizResultRouteParams): UseResultScreenResult {
  const { state, resetSession } = useQuizSession();
  const { profile, recordAttempt, session, summary: currentSummary } = useCurrentLearner();
  const [saveState, setSaveState] = useState<ResultSaveState>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const liveSummary = state.result;
  const legacyWeaknessId = resolveWeaknessId(legacyWeaknessKey);
  const storedSummary = currentSummary?.latestDiagnosticSummary;
  const snapshotSummary =
    requestedSource === 'snapshot' || !liveSummary ? storedSummary : undefined;
  const legacyPracticeParams: { mode: 'weakness'; weaknessId?: string; weakTag?: string } = {
    mode: 'weakness',
  };

  if (legacyWeaknessId) {
    legacyPracticeParams.weaknessId = legacyWeaknessId;
    legacyPracticeParams.weakTag = diagnosisMap[legacyWeaknessId].labelKo;
  }

  const persistResult = useCallback(async () => {
    if (!liveSummary || !profile || !session || saveState === 'saving') {
      return;
    }

    setSaveState('saving');
    setSaveErrorMessage(null);

    try {
      await recordAttempt(
        buildDiagnosticAttemptInput({
          session,
          profile,
          answers: state.answers,
          result: liveSummary,
        }),
      );
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveErrorMessage(getSaveErrorMessage(error));
    }
  }, [liveSummary, profile, recordAttempt, saveState, session, state.answers]);

  useEffect(() => {
    if (!liveSummary) {
      setSaveState('saved');
      setSaveErrorMessage(null);
      return;
    }

    if (storedSummary?.attemptId === liveSummary.attemptId) {
      setSaveState('saved');
      setSaveErrorMessage(null);
      return;
    }

    setSaveState('idle');
    setSaveErrorMessage(null);
  }, [liveSummary, storedSummary?.attemptId]);

  useEffect(() => {
    if (!liveSummary || !profile || !session) {
      return;
    }

    if (storedSummary?.attemptId === liveSummary.attemptId) {
      return;
    }

    if (saveState !== 'idle') {
      return;
    }

    void persistResult();
  }, [liveSummary, persistResult, profile, saveState, session, storedSummary?.attemptId]);

  // 진단 완료 저장 후 알림 권한 요청 + Day1 알림 예약
  useEffect(() => {
    if (saveState !== 'saved' || !liveSummary || !session?.accountKey) {
      return;
    }
    const accountKey = session.accountKey;
    requestNotificationPermission()
      .then((granted) => {
        if (!granted) return;
        return scheduleReviewNotifications(accountKey, resultScreenReviewStore);
      })
      .catch(console.warn);
  }, [saveState, session?.accountKey]);

  const snapshotSummaryTitle = useMemo(() => {
    if (!snapshotSummary || snapshotSummary.topWeaknesses.length === 0) {
      return null;
    }

    return diagnosisMap[snapshotSummary.topWeaknesses[0]].labelKo;
  }, [snapshotSummary]);

  return {
    legacyNextStep,
    legacyPracticeParams,
    legacyWeaknessId,
    liveSummary,
    onCloseReport: () => {
      router.replace('/quiz');
    },
    onOpenChallengePractice: () => {
      router.push({
        pathname: '/quiz/practice',
        params: { mode: 'challenge' },
      });
    },
    onOpenLegacyPractice: () => {
      router.push({
        pathname: '/quiz/practice',
        params: legacyPracticeParams,
      });
    },
    onOpenSnapshotDiagnostic: () => {
      resetSession();
      router.replace({
        pathname: '/quiz/diagnostic',
        params: { autostart: '1' },
      });
    },
    onOpenSnapshotPractice: (weaknessId: string) => {
      router.push({
        pathname: '/quiz/practice',
        params: {
          mode: 'weakness',
          weaknessId,
        },
      });
    },
    onOpenWeaknessPractice: (weaknessId: string) => {
      router.push({
        pathname: '/quiz/practice',
        params: {
          mode: 'weakness',
          weaknessId,
        },
      });
    },
    onRestartQuiz: () => {
      router.replace('/quiz');
      resetSession();
    },
    persistResult,
    saveErrorMessage,
    saveState,
    snapshotSummary,
    snapshotSummaryTitle,
  };
}
