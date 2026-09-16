import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { logEvent } from '@/features/analytics/log-event';
import { useNoReviewDayCardAnalytics } from '@/features/quiz/hooks/use-no-review-day-card-analytics';
import type { HomeTodayState } from '@/features/learning/home-today-state';
import { applyOverduePenalties } from '@/features/learning/review-scheduler';
import {
  cancelAllReviewNotifications,
  rescheduleAllReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';
import { useCurrentLearner } from '@/features/learner/provider';
import { readPhotoNotes } from '@/features/photo/note-store';
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
  onDismissAuthNotice: () => void;
  onPressExam: () => void;
  onPressPhoto: () => void;
  onPressReviewTask: (taskId: string) => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onResumeAnalysis: (attemptId: string) => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
  showAnalysisResumeCard: boolean;
  /** 사진 노트가 한 장도 없는 학생 — 복습 얘기 대신 web-proto의 소개 화면을 띄운다. */
  showFirstRun: boolean;
  showNoReviewDayCard: boolean;
  showWeaknessSection: boolean;
  today: HomeTodayState | null;
};

export function useQuizHubScreen(): UseQuizHubScreenResult {
  const { height, width } = useWindowDimensions();
  const {
    authNoticeMessage,
    dismissAuthNotice,
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
  // null = 아직 안 읽음. 0인지 아닌지를 알기 전에는 홈을 그리지 않는다 —
  // 모르는 채로 그리면 처음 온 학생이 "아직 복습할 게 없어요"를 한 번 깜빡이고 본다.
  const [photoNoteCount, setPhotoNoteCount] = useState<number | null>(null);

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
    const isAuthenticated = session?.status === 'authenticated';
    applyOverduePenalties(accountKey, hubReviewStore)
      // 서버가 4xx로 거절하면 이제 throw된다 — 잡지 않으면 아래 refresh가 통째로 멈춘다.
      .catch(console.warn)
      .then(() => {
        if (isAuthenticated) {
          // 인증 사용자는 서버가 발송 주도 — 로컬 재예약 금지, 기존 예약 취소.
          void cancelAllReviewNotifications().catch(console.warn);
        } else {
          void rescheduleAllReviewNotifications(accountKey, hubReviewStore).catch(
            console.warn,
          );
        }
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
    }, [session?.accountKey]),
  );

  // 사진을 한 장이라도 찍어봤나. 사진 흐름에서 돌아올 때마다 다시 센다.
  useFocusEffect(
    useCallback(() => {
      const accountKey = session?.accountKey;
      let cancelled = false;
      void (async () => {
        const notes = accountKey ? await readPhotoNotes(accountKey) : [];
        if (!cancelled) {
          setPhotoNoteCount(notes.length);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.accountKey]),
  );

  const onPressReviewTask = useCallback((taskId: string) => {
    if (!taskId) {
      return;
    }
    router.push({
      pathname: '/quiz/review-session',
      params: { taskId },
    });
  }, []);

  const onPressExam = () => {
    router.push('/(tabs)/exam');
  };

  // 사진 오답노트. 탭 밖 루트 라우트라 탭바가 안 보이고, 헤더 뒤로가기로 홈에 돌아온다.
  const onPressPhoto = () => {
    router.push('/photo');
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

  const today = homeState?.today ?? null;

  // 졸업은 홈의 분기에서 빠졌지만(🔒 결정 B "졸업은 없다"), 약점연습·step-complete 화면은
  // 여전히 practiceGraduatedAt을 세운다. 그 순간을 한 번 기록하는 것만 남긴다.
  const isGraduated = Boolean(profile?.practiceGraduatedAt);
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
  }, [isGraduated, session?.accountKey]);

  const isAnalysisInProgress = analysisState.isInProgress;

  // 재료는 있는데 오늘 차례가 아닌 날에만 뜬다.
  const showNoReviewDayCard =
    today?.mode === 'resting' && !!today.nextTask && !isAnalysisInProgress;

  const noReviewDaysUntil = (() => {
    const scheduledFor = today?.nextTask?.scheduledFor;
    if (!scheduledFor) return 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDate = new Date(todayStr);
    const target = new Date(scheduledFor.slice(0, 10));
    const diffMs = target.getTime() - todayDate.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  })();

  const { handlePressExam: onPressExamWithAnalytics } = useNoReviewDayCardAnalytics({
    visible: showNoReviewDayCard,
    daysUntil: noReviewDaysUntil,
    onPressExam,
  });

  // 졸업 게이트를 뺀 자리. 띄울 게 실제로 있을 때만 띄운다.
  const showWeaknessSection =
    (homeState?.weaknessProgressItems.length ?? 0) > 0 && !isAnalysisInProgress;
  const showAnalysisResumeCard = isAnalysisInProgress;

  // 아직 아무것도 안 해본 학생. 복습이 0건인 이유가 "다 했다"가 아니라 "시작을 안 했다"다.
  const showFirstRun =
    photoNoteCount === 0 && today?.mode === 'empty' && !isAnalysisInProgress;

  return {
    analysisState,
    authNoticeMessage: localAuthNoticeMessage,
    getExamTitle: (examId: string) => EXAM_CATALOG_BY_ID[examId]?.title ?? examId,
    homeState,
    isCompactLayout: width < 390 || height < 780,
    // 사진 노트를 세기 전에는 아직 준비가 안 된 것으로 본다 — 위 photoNoteCount 주석 참고.
    isReady: isReady && photoNoteCount !== null,
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onPressExam: onPressExamWithAnalytics,
    onPressPhoto,
    onPressReviewTask,
    onRefresh: refresh,
    onResumeAnalysis,
    profile,
    session,
    showAnalysisResumeCard,
    showFirstRun,
    showNoReviewDayCard,
    showWeaknessSection,
    today,
  };
}
