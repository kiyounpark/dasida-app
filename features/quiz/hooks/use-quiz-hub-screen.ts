import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { logEvent } from '@/features/analytics/log-event';
import { useNoReviewDayCardAnalytics } from '@/features/quiz/hooks/use-no-review-day-card-analytics';
import type { HomeJourneyState } from '@/features/learning/home-journey-state';
import { applyOverduePenalties } from '@/features/learning/review-scheduler';
import { rescheduleAllReviewNotifications } from '@/features/quiz/notifications/review-notification-scheduler';
import { useCurrentLearner } from '@/features/learner/provider';
import type { WeaknessId } from '@/data/diagnosisMap';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '@/features/quiz/exam/exam-analysis-in-progress';
import { buildResumeAnalysisQueue } from '@/features/quiz/exam/build-resume-analysis-queue';
import { getDiagnosisProgress } from '@/features/quiz/exam/exam-diagnosis-progress';
import { getLatestExamAttempts } from '@/features/quiz/exam/latest-exam-attempt-store';
import { useExamSession } from '@/features/quiz/exam/exam-session';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';

type CurrentLearnerSnapshot = ReturnType<typeof useCurrentLearner>;

export type UseQuizHubScreenResult = {
  analysisState: AnalysisInProgressState;
  authNoticeMessage: string | null;
  getExamTitle: (examId: string) => string;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressExam: () => void;
  onPressJourneyCta: () => void;
  onPressReviewCard: () => void;
  onRediagnose: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onResumeAnalysis: (attemptId: string) => void;
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
  showAnalysisResumeCard: boolean;
  showBrandHeader: boolean;
  showJourneyHero: boolean;
  showJourneyBoard: boolean;
  showNoReviewDayCard: boolean;
  showReviewHomeCard: boolean;
  showWeaknessSection: boolean;
};

export function useQuizHubScreen(): UseQuizHubScreenResult {
  const { height, width } = useWindowDimensions();
  const {
    authNoticeMessage,
    dismissAuthNotice,
    graduateToPractice,
    homeState,
    isReady,
    profile,
    refresh,
    session,
    reviewTaskStore: hubReviewStore,
  } = useCurrentLearner();
  const { hydrateResult } = useExamSession();
  const [localAuthNoticeMessage, setLocalAuthNoticeMessage] = useState<string | null>(null);
  const [latestAttempts, setLatestAttempts] = useState<LatestExamAttemptSummary[]>([]);
  const [analysisState, setAnalysisState] = useState<AnalysisInProgressState>({
    isInProgress: false,
  });
  const isGraduatingRef = useRef(false);

  useEffect(() => {
    if (!authNoticeMessage) {
      return;
    }

    setLocalAuthNoticeMessage(authNoticeMessage);
    dismissAuthNotice();
  }, [authNoticeMessage, dismissAuthNotice]);

  useEffect(() => {
    const accountKey = session?.accountKey;
    if (!accountKey) {
      return;
    }
    applyOverduePenalties(accountKey, hubReviewStore).then(() => {
      void rescheduleAllReviewNotifications(accountKey, hubReviewStore).catch(console.warn);
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accountKey]);

  const isFirstFocusRef = useRef(true);
  const lastFocusRefreshAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 5_000) {
        return;
      }
      lastFocusRefreshAtRef.current = now;
      void refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  useFocusEffect(
    useCallback(() => {
      const accountKey = session?.accountKey;
      let cancelled = false;
      void (async () => {
        if (!accountKey) {
          setLatestAttempts([]);
          setAnalysisState({ isInProgress: false });
          return;
        }
        const attempts = await getLatestExamAttempts(accountKey);
        if (cancelled) return;
        setLatestAttempts(attempts);
        if (attempts.length === 0) {
          setAnalysisState({ isInProgress: false });
          return;
        }
        const diagnosedProblemsByAttempt: Record<string, Record<number, WeaknessId>> = {};
        for (const attempt of attempts) {
          diagnosedProblemsByAttempt[attempt.attemptId] = await getDiagnosisProgress({
            examId: attempt.examId,
            attemptId: attempt.attemptId,
            attemptDateISO: attempt.attemptDateISO,
          });
          if (cancelled) return;
        }
        setAnalysisState(
          computeAnalysisInProgressState({
            latestAttempts: attempts,
            diagnosedProblemsByAttempt,
          }),
        );
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  const onStartDiagnostic = () => {
    router.push({
      pathname: '/quiz/diagnostic',
      params: { autostart: '1', reset: '1' },
    });
  };

  const onOpenPractice = () => {
    if (!homeState) {
      return;
    }

    if (homeState.todayReviewCount > 0) {
      router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
      return;
    }

    router.push({ pathname: '/quiz/practice', params: { mode: 'weakness' } });
  };

  const onOpenRecentResult = () => {
    if (!homeState?.recentResultCard.enabled) {
      return;
    }

    router.push({
      pathname: '/quiz/result',
      params: { source: 'snapshot' },
    });
  };

  const onPressReviewCard = () => {
    const taskId = homeState?.nextReviewTask?.id;
    if (!taskId) {
      return;
    }
    router.push({
      pathname: '/quiz/review-session',
      params: { taskId },
    });
  };

  const onPressExam = () => {
    router.push('/(tabs)/exam');
  };

  const onResumeDiagnosis = () => {
    router.push('/quiz/diagnostic');
  };

  const onResumeAnalysis = useCallback(
    (attemptId: string) => {
      const attempt = latestAttempts.find((a) => a.attemptId === attemptId);
      if (!attempt || !attempt.result) return;
      if (!analysisState.isInProgress) return;

      const item = analysisState.items.find((i) => i.attemptId === attemptId);
      if (!item) return;

      const queue = buildResumeAnalysisQueue(
        attempt.wrongProblemNumbers,
        item.diagnosedNotes,
      );
      if (queue.length === 0) return;

      hydrateResult(attempt.result);

      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: attempt.examId,
          wrongProblemNumbers: JSON.stringify(queue),
          startIndex: '0',
          totalNotes: String(attempt.wrongProblemNumbers.length),
          diagnosedCountBefore: String(item.diagnosedNotes.length),
        },
      });
    },
    [latestAttempts, analysisState, hydrateResult],
  );

  const onPressJourneyCta = () => {
    const action = homeState?.journey.ctaAction;

    if (!action || action === 'none') {
      return;
    }

    switch (action) {
      case 'resume_diagnosis':
        onResumeDiagnosis();
        return;
      case 'open_result':
        onOpenRecentResult();
        return;
      case 'open_review':
        onOpenPractice();
        return;
      case 'graduate_practice':
        if (isGraduatingRef.current) return;
        isGraduatingRef.current = true;
        void graduateToPractice()
          .then(() => {
            isGraduatingRef.current = false;
            // router.replace가 app/quiz/_layout.tsx 스택을 unmount하면서
            // QuizSessionProvider도 소멸 → 세션 상태가 자연히 초기화됨
            router.replace('/(tabs)/quiz');
          })
          .catch((err) => {
            isGraduatingRef.current = false;
            console.warn('[QuizHub] graduateToPractice failed', err);
          });
        return;
      case 'start_diagnostic':
        onStartDiagnostic();
        return;
      default: {
        const exhaustiveCheck: never = action;
        console.warn('[QuizHub] unknown ctaAction', exhaustiveCheck);
      }
    }
  };

  const journey = homeState?.journey ?? null;
  const isGraduated = journey?.currentStateKey === 'journey_graduated';
  const isJourneyActive = !isGraduated;

  const graduationLoggedRef = useRef(false);
  useEffect(() => {
    if (!isGraduated) return;
    if (graduationLoggedRef.current) return;
    graduationLoggedRef.current = true;  // set synchronously to prevent race condition
    const accountKey = session?.accountKey ?? 'guest';
    const key = `analytics.graduation_logged.${accountKey}`;
    void (async () => {
      const already = await AsyncStorage.getItem(key);
      if (already) return;
      // setItem first to close the race window where two near-simultaneous
      // IIFEs both see null from getItem. Note: AsyncStorage is local-only,
      // so graduation_reached fires once per device (not once per account).
      await AsyncStorage.setItem(key, new Date().toISOString());
      logEvent('graduation_reached', {});
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGraduated, session?.accountKey]);
  const isAnalysisInProgress = analysisState.isInProgress;

  const showBrandHeader = isGraduated;
  const showJourneyHero = isJourneyActive && !isAnalysisInProgress;
  const showJourneyBoard = isJourneyActive && !isAnalysisInProgress;
  // 여정 진행 중에는 NoReviewDayCard를 숨긴다. 졸업 후(isGraduated)에만 기존 조건을 평가.
  const showNoReviewDayCard =
    isGraduated &&
    !!homeState?.nextReviewTask &&
    homeState.todayReviewCount === 0 &&
    !isAnalysisInProgress;

  const noReviewDaysUntil = (() => {
    const scheduledFor = homeState?.nextReviewTask?.scheduledFor;
    if (!scheduledFor) return 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date(todayStr);
    const target = new Date(scheduledFor.slice(0, 10));
    const diffMs = target.getTime() - today.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  })();

  const { handlePressExam: onPressExamWithAnalytics } = useNoReviewDayCardAnalytics({
    visible: showNoReviewDayCard,
    daysUntil: noReviewDaysUntil,
    onPressExam,
  });
  // 약점 섹션도 여정 완료 후에만 노출.
  const showWeaknessSection = isGraduated;
  // ReviewHomeCard도 여정 진행 중에는 숨긴다. 졸업 후에만 평가.
  const showReviewHomeCard =
    isGraduated &&
    !!homeState?.nextReviewTask &&
    homeState.todayReviewCount > 0;
  const showAnalysisResumeCard = isAnalysisInProgress;

  return {
    analysisState,
    authNoticeMessage: localAuthNoticeMessage,
    getExamTitle: (examId: string) => EXAM_CATALOG_BY_ID[examId]?.title ?? examId,
    homeState,
    isCompactLayout: width < 390 || height < 780,
    isReady,
    journey,
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onOpenPractice,
    onOpenRecentResult,
    onPressExam: onPressExamWithAnalytics,
    onPressJourneyCta,
    onPressReviewCard,
    onRediagnose: onStartDiagnostic,
    onRefresh: refresh,
    onResumeAnalysis,
    onStartDiagnostic,
    profile,
    session,
    showAnalysisResumeCard,
    showBrandHeader,
    showJourneyHero,
    showJourneyBoard,
    showNoReviewDayCard,
    showReviewHomeCard,
    showWeaknessSection,
  };
}
