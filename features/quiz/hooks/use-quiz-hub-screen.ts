import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import type { HomeJourneyState } from '@/features/learning/home-journey-state';
import { applyOverduePenalties } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { rescheduleAllReviewNotifications } from '@/features/quiz/notifications/review-notification-scheduler';
import { useCurrentLearner } from '@/features/learner/provider';

const hubReviewStore = new LocalReviewTaskStore();

type CurrentLearnerSnapshot = ReturnType<typeof useCurrentLearner>;

export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
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
  onResumeDiagnosis: () => void;
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
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
    summary,
  } = useCurrentLearner();
  const [localAuthNoticeMessage, setLocalAuthNoticeMessage] = useState<string | null>(null);
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
    router.push('/(tabs)/quiz/exams');
  };

  const pendingResume = profile?.pendingDiagnosisResume;
  const hasPendingResume = Boolean(
    pendingResume &&
      pendingResume.schemaVersion === 1 &&
      pendingResume.attemptId &&
      pendingResume.diagnosisQueue.length > 0 &&
      summary?.latestDiagnosticSummary?.attemptId !== pendingResume.attemptId,
  );

  const onResumeDiagnosis = () => {
    router.push('/quiz/diagnostic');
  };

  const onPressJourneyCta = () => {
    if (hasPendingResume) {
      onResumeDiagnosis();
      return;
    }

    const action = homeState?.journey.ctaAction;

    if (!action || action === 'none') {
      return;
    }

    switch (action) {
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
      default:
        onStartDiagnostic();
    }
  };

  const rawJourney = homeState?.journey ?? null;
  const journey =
    hasPendingResume && rawJourney
      ? { ...rawJourney, ctaLabel: '약점 분석 이어서 하기' }
      : rawJourney;
  const isGraduated = journey?.currentStateKey === 'journey_graduated';
  const isJourneyActive = !isGraduated;

  const showBrandHeader = isGraduated;
  const showJourneyHero = isJourneyActive;
  const showJourneyBoard = isJourneyActive;
  // 여정 진행 중에는 NoReviewDayCard를 숨긴다. 졸업 후(isGraduated)에만 기존 조건을 평가.
  const showNoReviewDayCard =
    isGraduated &&
    !!homeState?.nextReviewTask &&
    homeState.todayReviewCount === 0;
  // 약점 섹션도 여정 완료 후에만 노출.
  const showWeaknessSection = isGraduated;
  // ReviewHomeCard도 여정 진행 중에는 숨긴다. 졸업 후에만 평가.
  const showReviewHomeCard =
    isGraduated &&
    !!homeState?.nextReviewTask &&
    homeState.todayReviewCount > 0;

  return {
    authNoticeMessage: localAuthNoticeMessage,
    homeState,
    isCompactLayout: width < 390 || height < 780,
    isReady,
    journey,
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onOpenPractice,
    onOpenRecentResult,
    onPressExam,
    onPressJourneyCta,
    onPressReviewCard,
    onRediagnose: onStartDiagnostic,
    onRefresh: refresh,
    onResumeDiagnosis,
    onStartDiagnostic,
    profile,
    session,
    showBrandHeader,
    showJourneyHero,
    showJourneyBoard,
    showNoReviewDayCard,
    showReviewHomeCard,
    showWeaknessSection,
  };
}
