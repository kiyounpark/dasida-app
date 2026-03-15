import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { challengeProblem } from '@/data/challengeProblem';
import { diagnosisMap, resolveWeaknessId, type WeaknessId } from '@/data/diagnosisMap';
import { practiceMap } from '@/data/practiceMap';
import { useQuizSession } from '@/features/quiz/session';

export type QuizPracticeRouteParams = {
  fallbackWeaknessKey?: string;
  requestedMode?: string;
};

type FeedbackState =
  | {
      kind: 'correct' | 'wrong';
      message: string;
    }
  | undefined;

export type UsePracticeScreenResult = {
  activeProblem: typeof challengeProblem | (typeof practiceMap)[WeaknessId] | undefined;
  continueLabel: string;
  feedback: FeedbackState;
  onContinue: () => void;
  onRetry: () => void;
  onSelectChoice: (index: number) => void;
  onSubmit: () => void;
  onViewResult: () => void;
  selectedIndex: number | null;
  weaknessLabel: string;
};

export function usePracticeScreen({
  fallbackWeaknessKey,
  requestedMode,
}: QuizPracticeRouteParams): UsePracticeScreenResult {
  const { state, advancePractice, completeChallenge } = useQuizSession();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>();

  const fallbackWeaknessId = resolveWeaknessId(fallbackWeaknessKey);
  const activeMode = state.result?.allCorrect
    ? 'challenge'
    : state.result
      ? 'weakness'
      : requestedMode === 'challenge'
        ? 'challenge'
        : 'weakness';

  const activeWeaknessId: WeaknessId | undefined = useMemo(() => {
    if (state.result && activeMode === 'weakness') {
      return state.practiceQueue[state.practiceIndex];
    }

    return fallbackWeaknessId;
  }, [activeMode, fallbackWeaknessId, state.practiceIndex, state.practiceQueue, state.result]);

  const activeProblem =
    activeMode === 'challenge'
      ? challengeProblem
      : activeWeaknessId
        ? practiceMap[activeWeaknessId]
        : undefined;

  useEffect(() => {
    setSelectedIndex(null);
    setFeedback(undefined);
  }, [activeProblem?.id]);

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

  const onSubmit = () => {
    if (selectedIndex === null || !activeProblem) {
      return;
    }

    const isCorrect = selectedIndex === activeProblem.answerIndex;

    if (isCorrect) {
      setFeedback({
        kind: 'correct',
        message: activeProblem.explanation,
      });
      return;
    }

    setFeedback({
      kind: 'wrong',
      message: activeProblem.hint,
    });
  };

  const onContinue = () => {
    if (feedback?.kind !== 'correct') {
      return;
    }

    if (activeMode === 'challenge') {
      completeChallenge();
      router.push({
        pathname: '/quiz/feedback',
        params: toFeedbackParams('challenge'),
      });
      return;
    }

    if (state.result && state.practiceMode === 'weakness') {
      const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
      advancePractice();

      if (isLast) {
        router.push({
          pathname: '/quiz/feedback',
          params: toFeedbackParams('weakness', activeWeaknessId),
        });
      }
      return;
    }

    router.push({
      pathname: '/quiz/feedback',
      params: toFeedbackParams('weakness', activeWeaknessId),
    });
  };

  const weaknessLabel =
    activeMode === 'challenge'
      ? '심화 문제'
      : activeWeaknessId
        ? diagnosisMap[activeWeaknessId].labelKo
        : '약점 연습';

  const isLastWeakness =
    state.result && state.practiceMode === 'weakness'
      ? state.practiceIndex >= state.practiceQueue.length - 1
      : true;

  return {
    activeProblem,
    continueLabel:
      activeMode === 'challenge'
        ? '피드백 화면으로 이동'
        : isLastWeakness
          ? '피드백 화면으로 이동'
          : '다음 약점 문제',
    feedback,
    onContinue,
    onRetry: () => {
      setSelectedIndex(null);
      setFeedback(undefined);
    },
    onSelectChoice: setSelectedIndex,
    onSubmit,
    onViewResult: () => {
      router.replace('/quiz/result');
    },
    selectedIndex,
    weaknessLabel,
  };
}
