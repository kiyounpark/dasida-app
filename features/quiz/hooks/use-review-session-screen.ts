// features/quiz/hooks/use-review-session-screen.ts
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { getReviewThinkingSteps, type ThinkingStep } from '@/data/review-content-map';
import { completeReviewTask, rescheduleReviewTask } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';
import { useCurrentLearner } from '@/features/learner/provider';
import { getSingleParam } from '@/utils/get-single-param';
import { requestReviewFeedback } from '@/features/quiz/review-feedback';

type StepPhase = 'input' | 'feedback';

export type UseReviewSessionScreenResult = {
  task: ReviewTask | null;
  steps: ThinkingStep[];
  currentStepIndex: number;
  stepPhase: StepPhase;
  selectedChoiceIndex: number | null;
  userText: string;
  aiFeedback: string | null;
  isLoadingFeedback: boolean;
  sessionComplete: boolean;
  onSelectChoice: (index: number) => void;
  onChangeText: (text: string) => void;
  onPressNext: () => void;
  onPressContinue: () => void;
  onPressRemember: () => void;
  onPressRetry: () => void;
};

const store = new LocalReviewTaskStore();

export function useReviewSessionScreen(): UseReviewSessionScreenResult {
  const params = useLocalSearchParams();
  const taskId = getSingleParam(params.taskId) ?? '';
  const { session, refresh } = useCurrentLearner();
  const accountKey = session?.accountKey ?? '';

  const [task, setTask] = useState<ReviewTask | null>(null);
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState<StepPhase>('input');
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [userText, setUserText] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // task 로드
  useEffect(() => {
    if (!accountKey || !taskId) {
      return;
    }
    store.load(accountKey).then((tasks) => {
      const found = tasks.find((t) => t.id === taskId) ?? null;
      setTask(found);
      if (found) {
        setSteps(getReviewThinkingSteps(found.weaknessId));
      }
    });
  }, [accountKey, taskId]);

  const resetStepState = () => {
    setSelectedChoiceIndex(null);
    setUserText('');
    setAiFeedback(null);
    setStepPhase('input');
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
  };

  const onChangeText = (text: string) => {
    setUserText(text);
  };

  const onPressNext = async () => {
    const step = steps[currentStepIndex];
    if (!step || !task) {
      return;
    }

    const hasChoice = selectedChoiceIndex !== null;
    const hasText = userText.trim().length > 0;

    if (!hasChoice && !hasText) {
      // 아무 입력 없으면 피드백 없이 바로 다음
      setStepPhase('feedback');
      return;
    }

    setIsLoadingFeedback(true);
    try {
      const selectedChoiceText = hasChoice
        ? (step.choices[selectedChoiceIndex!]?.text ?? null)
        : null;
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        selectedChoiceText,
        userText: hasText ? userText.trim() : null,
      });
      setAiFeedback(result.replyText);
    } catch {
      // AI 실패 시 피드백 없이 계속 진행
      setAiFeedback(null);
    } finally {
      setIsLoadingFeedback(false);
      setStepPhase('feedback');
    }
  };

  const onPressContinue = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      setSessionComplete(true);
    } else {
      setCurrentStepIndex(nextIndex);
      resetStepState();
    }
  };

  const onPressRemember = async () => {
    if (!task) {
      return;
    }
    await completeReviewTask(accountKey, task.id, store);
    await refresh();
    router.back();
  };

  const onPressRetry = async () => {
    if (!task) {
      return;
    }
    await rescheduleReviewTask(accountKey, task.id, store);
    await refresh();
    router.back();
  };

  return {
    task,
    steps,
    currentStepIndex,
    stepPhase,
    selectedChoiceIndex,
    userText,
    aiFeedback,
    isLoadingFeedback,
    sessionComplete,
    onSelectChoice,
    onChangeText,
    onPressNext,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  };
}
