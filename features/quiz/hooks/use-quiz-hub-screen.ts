import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { logEvent } from '@/features/analytics/log-event';
import type { NotificationOptInCardState } from '@/features/quiz/components/notification-opt-in-card';
import { useNoReviewDayCardAnalytics } from '@/features/quiz/hooks/use-no-review-day-card-analytics';
import { useNotificationOptIn } from '@/features/quiz/hooks/use-notification-opt-in';
import type { HomeTodayState } from '@/features/learning/home-today-state';
import { daysUntilScheduled, stepDownMissedReviewTasks } from '@/features/learning/review-scheduler';
import {
  cancelAllReviewNotifications,
  rescheduleAllReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';
import { useCurrentLearner } from '@/features/learner/provider';
import { readPhotoNotes } from '@/features/photo/note-store';
import type { PhotoNote } from '@/features/photo/types';
import { shouldShowWeaknessSection as decideWeaknessSection } from '@/features/quiz/home-weakness-visibility';
import type { WeaknessId } from '@/data/diagnosisMap';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '@/features/quiz/exam/exam-analysis-in-progress';
import { buildResumeAnalysisQueue } from '@/features/quiz/exam/build-resume-analysis-queue';
import { getDiagnosisProgress } from '@/features/quiz/exam/exam-diagnosis-progress';
import { EXAM_DOORS_VISIBLE } from '@/features/quiz/exam/exam-doors';
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
  /** 이 기기의 가장 최근 사진 노트 — 첫 사진 뒤 홈이 「방금 만든 것」을 보여준다(10.03). 없으면 null */
  latestPhotoNote: PhotoNote | null;
  /** 1.0.12 ② — 사진 「내일 복습」 카드 아래 알림 허락 카드 */
  notificationOptIn: {
    state: NotificationOptInCardState;
    onEnable: () => Promise<void>;
  };
  onDismissAuthNotice: () => void;
  onPressExam: () => void;
  /** 지난 오답노트 목록으로 */
  onPressNotes: () => void;
  onPressPhoto: () => void;
  onPressReviewTask: (taskId: string) => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onResumeAnalysis: (attemptId: string) => void;
  /** 이 기기의 사진 노트 장수 */
  photoNoteCount: number;
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
    registerPushToken,
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
  const [latestPhotoNote, setLatestPhotoNote] = useState<PhotoNote | null>(null);

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
    stepDownMissedReviewTasks(accountKey, hubReviewStore)
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
      const accountKey = session?.accountKey;
      void (async () => {
        // 다른 화면·탭에서 돌아올 때도 놓친 복습을 한 칸 내린다 — 위 효과는 계정이 바뀔 때만 다시 돈다.
        if (accountKey) {
          await stepDownMissedReviewTasks(accountKey, hubReviewStore).catch(console.warn);
        }
        await refresh();
      })();
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
          // readPhotoNotes는 최신순 — 첫 장이 방금 만든 노트다
          setLatestPhotoNote(notes[0] ?? null);
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

  const onPressNotes = () => {
    router.push('/photo-notes');
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

  // 기출을 내린 동안(exam-doors.ts)은 「분석 이어하기」도 안 띄운다 — 홈은 분석 중이 아닌 학생과 같게 그린다
  const isAnalysisInProgress = EXAM_DOORS_VISIBLE && analysisState.isInProgress;

  // 재료는 있는데 오늘 차례가 아닌 날에만 뜬다.
  const showNoReviewDayCard =
    today?.mode === 'resting' && !!today.nextTask && !isAnalysisInProgress;

  // GA 값이라 지금처럼 1 이상. 기기 날짜로 센다(카드와 같은 함수)
  const noReviewDaysUntil = today?.nextTask?.scheduledFor
    ? Math.max(1, daysUntilScheduled(today.nextTask.scheduledFor))
    : 1;

  // 1.0.12 ② — 사진만 올린 학생은 실모 결과 화면을 안 지나서 알림 허락을 받은 적이 없다.
  // 사진 「내일 복습」 카드가 뜰 때 그 아래에서 묻는다(astra·Fable → Fable 최종 10.05):
  // 그 카드는 과제가 저장된 뒤에만 뜬다 — 보낼 알림이 없는 학생(이름 없는 노트)에게
  // 한 번뿐인 iOS 허락 창을 쓰지 않는다. 이미 허락한 학생은 여기서 토큰만 등록된다.
  const notificationOptIn = useNotificationOptIn({
    accountKey: session?.accountKey,
    eligible: showNoReviewDayCard && today?.nextTask?.source === 'photo',
    isAuthenticated: session?.status === 'authenticated',
    registerPushToken,
  });

  const { handlePressExam: onPressExamWithAnalytics } = useNoReviewDayCardAnalytics({
    visible: showNoReviewDayCard,
    daysUntil: noReviewDaysUntil,
    onPressExam,
  });

  // 졸업 게이트를 뺀 자리. 복습을 한 번 끝내 그릴 막대가 생긴 뒤부터 띄운다(기윤 10.03).
  const showWeaknessSection = decideWeaknessSection(
    homeState?.weaknessProgressItems,
    isAnalysisInProgress,
  );
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
    latestPhotoNote,
    notificationOptIn,
    onDismissAuthNotice: () => {
      setLocalAuthNoticeMessage(null);
    },
    onPressExam: onPressExamWithAnalytics,
    onPressNotes,
    onPressPhoto,
    onPressReviewTask,
    onRefresh: refresh,
    onResumeAnalysis,
    photoNoteCount: photoNoteCount ?? 0,
    profile,
    session,
    showAnalysisResumeCard,
    showFirstRun,
    showNoReviewDayCard,
    showWeaknessSection,
    today,
  };
}
