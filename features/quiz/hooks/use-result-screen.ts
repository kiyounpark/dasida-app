import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import type { WeaknessId } from '@/data/diagnosisMap';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { useCurrentLearner } from '@/features/learner/provider';
import { buildDiagnosticAttemptInput } from '@/features/quiz/build-finalized-attempt-input';
import {
  requestNotificationPermission,
  scheduleReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';
import { useQuizSession } from '@/features/quiz/session';
import type { QuizResultSummary } from '@/features/quiz/types';

const resultScreenReviewStore = new LocalReviewTaskStore();

export type QuizResultRouteParams = {
  legacyNextStep?: string;
  legacyWeaknessKey?: string;
  requestedSource?: string;
  // exam source params
  examId?: string;
  examTotal?: string;
  examCorrect?: string;
  examAccuracy?: string;
  examTopWeaknesses?: string;
  examWrong?: string;
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
  liveSummary: QuizResultSummary | undefined;
  onOpenChallengePractice: () => void;
  onOpenLegacyPractice: () => void;
  onOpenSnapshotDiagnostic: () => void;
  onOpenSnapshotPractice: (weaknessId: string) => void;
  onOpenWeaknessPractice: (weaknessId: string) => void;
  onRestartQuiz: () => void;
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: ResultSaveState;
  source?: 'exam' | 'diagnostic';
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
  examId,
  examTotal,
  examCorrect,
  examAccuracy,
  examTopWeaknesses,
  examWrong,
}: QuizResultRouteParams): UseResultScreenResult {
  const { state, resetSession } = useQuizSession();
  const {
    markDiagnosticResultViewed,
    profile,
    recordAttempt,
    session,
    summary: currentSummary,
  } = useCurrentLearner();
  const [saveState, setSaveState] = useState<ResultSaveState>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const liveSessionSummary = state.result;

  const examSummary = useMemo<QuizResultSummary | undefined>(() => {
    if (requestedSource !== 'exam') return undefined;
    if (!examTotal || !examCorrect || !examAccuracy || !examTopWeaknesses) return undefined;
    const total = parseInt(examTotal, 10);
    const correct = parseInt(examCorrect, 10);
    const accuracy = Number(examAccuracy) || 0;
    // Use the explicitly passed wrongCount (answered-but-wrong only, excluding blanks).
    // Fall back to total - correct only when the param is absent (legacy navigation).
    const wrong = examWrong ? parseInt(examWrong, 10) : total - correct;
    let topWeaknesses: WeaknessId[] = [];
    try {
      topWeaknesses = JSON.parse(examTopWeaknesses) as WeaknessId[];
    } catch {
      topWeaknesses = [];
    }
    return {
      attemptId: examId ?? 'exam',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      total,
      correct,
      wrong,
      accuracy,
      allCorrect: correct === total,
      topWeaknesses,
    };
  }, [requestedSource, examId, examTotal, examCorrect, examAccuracy, examTopWeaknesses, examWrong]);

  const liveSummary = examSummary ?? liveSessionSummary;
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
    if (requestedSource === 'exam') return; // exam result already saved by use-exam-result-screen
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
  }, [liveSummary, profile, recordAttempt, requestedSource, saveState, session, state.answers]);

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

  // 결과 화면 첫 진입 시 "결과 봄" 이정표를 기록한다.
  // 이미 값이 있으면 controller 측에서 no-op로 처리된다.
  useEffect(() => {
    if (requestedSource === 'exam') return; // exam visits don't set the diagnostic result viewed milestone
    const hasAnySummary = Boolean(liveSummary) || Boolean(snapshotSummary);
    if (!hasAnySummary) {
      return;
    }
    if (profile?.latestDiagnosticResultViewedAt) {
      return;
    }
    void markDiagnosticResultViewed().catch((err) => {
      console.warn('[Result] markDiagnosticResultViewed failed', err);
    });
  }, [
    liveSummary,
    markDiagnosticResultViewed,
    profile?.latestDiagnosticResultViewedAt,
    snapshotSummary,
  ]);

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
    source: requestedSource === 'exam' ? 'exam' : undefined,
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
