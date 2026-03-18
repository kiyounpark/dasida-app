import * as Haptics from 'expo-haptics';
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
  const [wrongAttempts, setWrongAttempts] = useState(0);

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
    setWrongAttempts(0);
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
      triggerPracticeHaptic(Haptics.NotificationFeedbackType.Success);
      setFeedback({
        kind: 'correct',
        title: '좋아요. 이번 문제는 잡혔어요.',
        body: activeProblem.explanation,
      });
      return;
    }

    if (activeMode === 'weakness') {
      triggerPracticeHaptic(Haptics.NotificationFeedbackType.Warning);
      if (wrongAttempts === 0) {
        setWrongAttempts(1);
        setFeedback({
          kind: 'coaching',
          title: '이 포인트만 다시 보면 풀 수 있어요.',
          body: `${weaknessLabel}에서 자주 흔들리는 기준만 짧게 다시 잡고 갈게요.`,
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
        body: `${weaknessLabel} 약점에서 놓친 기준을 정리해두면 다음 문제에서 같은 실수를 줄일 수 있어요.`,
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

  const onContinue = () => {
    if (feedback?.kind !== 'correct' && feedback?.kind !== 'resolved') {
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
