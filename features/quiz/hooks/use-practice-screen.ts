import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { challengeProblem } from '@/data/challengeProblem';
import { diagnosisMap, resolveWeaknessId, type WeaknessId } from '@/data/diagnosisMap';
import { practiceMap } from '@/data/practiceMap';
import { useCurrentLearner } from '@/features/learner/provider';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';
import { formatReviewStageLabel } from '@/features/learning/review-stage';
import { buildWeaknessPracticeAttemptInput } from '@/features/quiz/build-finalized-attempt-input';
import { useQuizSession } from '@/features/quiz/session';
import { computeCanGraduate } from './can-graduate';

type ScreenMode = 'weakness' | 'challenge' | 'review';

export { computeCanGraduate } from './can-graduate';

export type QuizPracticeRouteParams = {
  fallbackWeaknessKey?: string;
  requestedMode?: string;
};

type FeedbackState =
  | {
      kind: 'correct';
      title: string;
      body: string;
    }
  | {
      kind: 'retry';
      title: string;
      body: string;
    }
  | {
      kind: 'coaching';
      title: string;
      body: string;
      focusTitle: string;
      focusBody: string;
      supportText: string;
    }
  | {
      kind: 'resolved';
      title: string;
      body: string;
      answerLabel: string;
      answerText: string;
      explanation: string;
    }
  | undefined;

function triggerPracticeHaptic(type: Haptics.NotificationFeedbackType) {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.notificationAsync(type);
  }
}

export type UsePracticeScreenResult = {
  activeProblem: typeof challengeProblem | (typeof practiceMap)[WeaknessId] | undefined;
  continueLabel: string;
  emptyActionLabel: string;
  emptyTitle: string;
  feedback: FeedbackState;
  isPersistingAttempt: boolean;
  canGraduate: boolean;
  isGraduating: boolean;
  onContinue: () => void;
  onGraduate: () => void;
  onRetry: () => void;
  onSelectChoice: (index: number) => void;
  onSubmit: () => void;
  onViewResult: () => void;
  persistErrorMessage: string | null;
  screenTitle: string;
  selectedIndex: number | null;
  weaknessLabel: string;
  currentQuestionNumber: number;
  isExitModalVisible: boolean;
  onCloseExitModal: () => void;
  onConfirmExit: () => void;
  onOpenExitModal: () => void;
  progressPercent: `${number}%`;
  questionCount: number;
};

const PERSIST_ERROR_MESSAGE = '연습 기록을 저장하지 못했어요. 다시 시도해 주세요.';

export function usePracticeScreen({
  fallbackWeaknessKey,
  requestedMode,
}: QuizPracticeRouteParams): UsePracticeScreenResult {
  const { state, advancePractice, completeChallenge, resetSession, seedPracticeQueue } = useQuizSession();
  const {
    clearPendingPractice,
    graduateToPractice,
    markPendingPracticeStarted,
    profile,
    recordAttempt,
    session,
    summary,
  } = useCurrentLearner();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [problemStartedAt, setProblemStartedAt] = useState(() => new Date().toISOString());
  const [firstSubmittedIndex, setFirstSubmittedIndex] = useState<number | null>(null);
  const [isPersistingAttempt, setIsPersistingAttempt] = useState(false);
  const [persistErrorMessage, setPersistErrorMessage] = useState<string | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [isGraduating, setIsGraduating] = useState(false);
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const reviewQueueInitialCountRef = useRef<number | null>(null);

  const fallbackWeaknessId = resolveWeaknessId(fallbackWeaknessKey);
  const reviewQueue = useMemo<ActiveReviewTaskSummary[]>(
    () => summary?.dueReviewTasks ?? [],
    [summary?.dueReviewTasks],
  );

  const activeMode: ScreenMode =
    requestedMode === 'review'
      ? 'review'
      : state.result?.allCorrect
        ? 'challenge'
        : state.result
          ? 'weakness'
          : requestedMode === 'challenge'
            ? 'challenge'
            : 'weakness';

  const activeReviewTask = activeMode === 'review' ? reviewQueue[0] : undefined;
  const activeWeaknessId: WeaknessId | undefined = useMemo(() => {
    if (activeMode === 'review') {
      return activeReviewTask?.weaknessId;
    }

    if (activeMode === 'weakness' && state.practiceQueue.length > 0) {
      return state.practiceQueue[state.practiceIndex];
    }

    return fallbackWeaknessId;
  }, [
    activeMode,
    activeReviewTask?.weaknessId,
    fallbackWeaknessId,
    state.practiceIndex,
    state.practiceQueue,
  ]);

  useEffect(() => {
    if (activeMode !== 'review') {
      reviewQueueInitialCountRef.current = null;
      return;
    }
    if (reviewQueueInitialCountRef.current === null) {
      reviewQueueInitialCountRef.current = reviewQueue.length;
    }
  }, [activeMode, reviewQueue.length]);

  const activeProblem =
    activeMode === 'challenge'
      ? challengeProblem
      : activeWeaknessId
        ? practiceMap[activeWeaknessId]
        : undefined;

  useEffect(() => {
    setSelectedIndex(null);
    setFeedback(undefined);
    setWrongAttempts(0);
    setFirstSubmittedIndex(null);
    setIsPersistingAttempt(false);
    setPersistErrorMessage(null);
    setProblemStartedAt(new Date().toISOString());
  }, [activeProblem?.id, activeReviewTask?.id]);

  // state 5 감지용 플래그. weakness 모드에서 활성 문제가 잡혀 실제 풀이 중일 때만 SET.
  // review/challenge 모드는 건드리지 않는다.
  useEffect(() => {
    if (activeMode !== 'weakness') {
      return;
    }
    if (!activeProblem) {
      return;
    }
    void markPendingPracticeStarted().catch((err) => {
      console.warn('[PracticeScreen] markPendingPracticeStarted failed', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, activeProblem?.id]);

  useEffect(() => {
    if (activeMode !== 'weakness') return;
    if (state.result) return;
    if (state.practiceQueue.length > 0) return;
    const weaknesses = summary?.latestDiagnosticSummary?.topWeaknesses;
    if (!weaknesses?.length) return;
    seedPracticeQueue(weaknesses);
    // seedPracticeQueue은 dispatch wrapper로 안정적. topWeaknesses 대신
    // attemptId를 dep로 써서 동일 콘텐츠 재시딩을 방지한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, state.result, state.practiceQueue.length, summary?.latestDiagnosticSummary?.attemptId]);

  const toFeedbackParams = (mode: 'weakness' | 'challenge', weaknessId?: WeaknessId) => {
    if (mode === 'challenge') {
      return { mode };
    }

    const next: { mode: 'weakness'; weaknessId?: string; weakTag?: string } = { mode };
    if (weaknessId) {
      next.weaknessId = weaknessId;
      next.weakTag = diagnosisMap[weaknessId].labelKo;
    }
    return next;
  };

  const baseWeaknessLabel =
    activeWeaknessId !== undefined ? diagnosisMap[activeWeaknessId].labelKo : '약점 연습';

  const onSubmit = () => {
    if (selectedIndex === null || !activeProblem) {
      return;
    }

    if (firstSubmittedIndex === null) {
      setFirstSubmittedIndex(selectedIndex);
    }

    const isCorrect = selectedIndex === activeProblem.answerIndex;

    if (isCorrect) {
      triggerPracticeHaptic(Haptics.NotificationFeedbackType.Success);
      setFeedback({
        kind: 'correct',
        title: '좋아요. 이번 문제는 잡혔어요.',
        body: activeProblem.explanation,
      });
      return;
    }

    if (activeMode !== 'challenge') {
      triggerPracticeHaptic(Haptics.NotificationFeedbackType.Warning);
      if (wrongAttempts === 0) {
        setWrongAttempts(1);
        setFeedback({
          kind: 'coaching',
          title: '이 포인트만 다시 보면 풀 수 있어요.',
          body: `${baseWeaknessLabel}에서 자주 흔들리는 기준만 짧게 다시 잡고 갈게요.`,
          focusTitle: '지금 다시 볼 포인트',
          focusBody: activeProblem.hint,
          supportText: '답을 바로 외우기보다, 이 기준 한 줄을 떠올린 뒤 다시 풀어보세요.',
        });
        return;
      }

      setWrongAttempts((current) => current + 1);
      setFeedback({
        kind: 'resolved',
        title: '이번에는 해설까지 같이 볼게요.',
        body: `${baseWeaknessLabel} 약점에서 놓친 기준을 정리해두면 다음 문제에서 같은 실수를 줄일 수 있어요.`,
        answerLabel: '정답',
        answerText: activeProblem.choices[activeProblem.answerIndex],
        explanation: activeProblem.explanation,
      });
      return;
    }

    triggerPracticeHaptic(Haptics.NotificationFeedbackType.Warning);
    setFeedback({
      kind: 'retry',
      title: '한 번 더 기준을 확인해 볼게요.',
      body: activeProblem.hint,
    });
  };

  const continueAfterPersistence = () => {
    if (feedback?.kind !== 'correct' && feedback?.kind !== 'resolved') {
      return;
    }

    setSolvedCount((c) => c + 1);

    if (activeMode === 'challenge') {
      completeChallenge();
      router.push({
        pathname: '/quiz/feedback',
        params: toFeedbackParams('challenge'),
      });
      return;
    }

    if (activeMode === 'review') {
      if (reviewQueue.length <= 1) {
        router.replace('/quiz');
      }
      return;
    }

    if (state.practiceMode === 'weakness' && state.practiceQueue.length > 0) {
      const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
      advancePractice();

      if (isLast) {
        resetSession();
        void clearPendingPractice().catch((err) => {
          console.warn('[PracticeScreen] clearPendingPractice failed', err);
        });
        router.replace({
          pathname: '/quiz/step-complete',
          params: { step: 'practice' },
        });
      }
      return;
    }

    router.push({
      pathname: '/quiz/feedback',
      params: toFeedbackParams('weakness', activeWeaknessId),
    });
  };

  const persistWeaknessAttempt = async () => {
    if (
      (activeMode !== 'weakness' && activeMode !== 'review') ||
      (feedback?.kind !== 'correct' && feedback?.kind !== 'resolved')
    ) {
      return true;
    }

    if (!session || !profile || !activeWeaknessId || !activeProblem || selectedIndex === null) {
      setPersistErrorMessage(PERSIST_ERROR_MESSAGE);
      return false;
    }

    if (activeMode === 'review' && !activeReviewTask) {
      setPersistErrorMessage(PERSIST_ERROR_MESSAGE);
      return false;
    }

    const resolvedBy = feedback.kind === 'correct' ? 'solved' : 'answer_revealed';

    setIsPersistingAttempt(true);
    setPersistErrorMessage(null);

    try {
      await recordAttempt(
        buildWeaknessPracticeAttemptInput({
          session,
          profile,
          weaknessId: activeWeaknessId,
          weaknessLabel: baseWeaknessLabel,
          problemId: activeProblem.id,
          startedAt: problemStartedAt,
          completedAt: new Date().toISOString(),
          firstSelectedIndex: firstSubmittedIndex,
          finalSelectedIndex: selectedIndex,
          wrongAttempts: feedback.kind === 'correct' ? wrongAttempts : 2,
          resolvedBy,
          reviewContext:
            activeMode === 'review' && activeReviewTask
              ? {
                  reviewTaskId: activeReviewTask.id,
                  reviewStage: activeReviewTask.stage,
                }
              : undefined,
        }),
      );
      return true;
    } catch (error) {
      console.warn('Failed to persist weakness-practice attempt', error);
      setIsPersistingAttempt(false);
      setPersistErrorMessage(PERSIST_ERROR_MESSAGE);
      return false;
    }
  };

  const onContinue = () => {
    if (isPersistingAttempt) {
      return;
    }

    void (async () => {
      const shouldContinue = await persistWeaknessAttempt();
      if (!shouldContinue) {
        return;
      }

      continueAfterPersistence();
    })();
  };

  const weaknessLabel =
    activeMode === 'challenge'
      ? '심화 문제'
      : activeMode === 'review' && activeReviewTask
        ? `${formatReviewStageLabel(activeReviewTask.stage)} · ${baseWeaknessLabel}`
        : baseWeaknessLabel;

  const isLastWeakness =
    state.practiceMode === 'weakness' && state.practiceQueue.length > 0
      ? state.practiceIndex >= state.practiceQueue.length - 1
      : true;

  const counter = (() => {
    if (activeMode === 'weakness' && state.practiceMode === 'weakness' && state.practiceQueue.length > 0) {
      const total = Math.max(state.practiceQueue.length, 1);
      const current = Math.min(state.practiceIndex + 1, total);
      return { current, total };
    }

    if (activeMode === 'review') {
      const total = Math.max(reviewQueueInitialCountRef.current ?? reviewQueue.length, 1);
      const remaining = reviewQueue.length;
      const current = Math.min(Math.max(total - remaining + 1, 1), total);
      return { current, total };
    }

    return { current: 1, total: 1 };
  })();

  const progressPercent = `${Math.round((counter.current / counter.total) * 100)}%` as `${number}%`;

  return {
    activeProblem,
    continueLabel:
      activeMode === 'challenge'
        ? '피드백 화면으로 이동'
        : activeMode === 'review'
          ? reviewQueue.length > 1
            ? '다음 복습 문제'
            : '홈으로 돌아가기'
          : isLastWeakness
            ? state.practiceMode === 'weakness' && state.practiceQueue.length > 0
              ? '연습 완료'
              : '피드백 화면으로 이동'
            : '다음 약점 문제',
    emptyActionLabel: activeMode === 'review' ? '홈으로 돌아가기' : '결과로 돌아가기',
    emptyTitle: activeMode === 'review' ? '오늘 바로 시작할 복습이 없어요.' : '연습 문제를 찾지 못했어요.',
    feedback,
    isPersistingAttempt,
    onContinue,
    onRetry: () => {
      setSelectedIndex(null);
      setFeedback(undefined);
      setPersistErrorMessage(null);
    },
    onSelectChoice: setSelectedIndex,
    onSubmit,
    onViewResult: () => {
      if (activeMode === 'review') {
        router.replace('/quiz');
        return;
      }

      router.replace('/quiz/result');
    },
    canGraduate: computeCanGraduate({
      activeMode,
      solvedCount,
      questionCount: counter.total,
      practiceGraduatedAt: profile?.practiceGraduatedAt,
    }),
    isGraduating,
    onGraduate: () => {
      if (isGraduating) {
        return;
      }
      setIsGraduating(true);
      void graduateToPractice()
        .then(() => {
          void clearPendingPractice().catch((err) => {
            console.warn('[PracticeScreen] clearPendingPractice failed', err);
          });
          resetSession();
          router.replace('/(tabs)/quiz');
        })
        .catch(() => {
          setIsGraduating(false);
        });
    },
    persistErrorMessage,
    screenTitle:
      activeMode === 'challenge'
        ? '심화 문제'
        : activeMode === 'review'
          ? '오늘 복습'
          : '약점 기반 연습',
    selectedIndex,
    weaknessLabel,
    currentQuestionNumber: counter.current,
    isExitModalVisible,
    onCloseExitModal: () => setIsExitModalVisible(false),
    onConfirmExit: () => {
      if (isGraduating) {
        return;
      }
      setIsExitModalVisible(false);
      router.replace('/(tabs)/quiz');
    },
    onOpenExitModal: () => {
      if (isGraduating) {
        return;
      }
      setIsExitModalVisible(true);
    },
    progressPercent,
    questionCount: counter.total,
  };
}
