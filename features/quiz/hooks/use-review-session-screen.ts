// features/quiz/hooks/use-review-session-screen.ts
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

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
  hasInput: boolean;
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
  const { session, refresh, profile, recordAttempt } = useCurrentLearner();
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

  const isFetchingRef = useRef(false);
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const firstAttemptCorrectRef = useRef<Array<boolean | null>>([]);

  // task 로드
  useEffect(() => {
    if (!accountKey || !taskId) {
      return;
    }
    let cancelled = false;
    store.load(accountKey).then((tasks) => {
      if (cancelled) return;
      const found = tasks.find((t) => t.id === taskId) ?? null;
      setTask(found);
      if (found) {
        setSteps(getReviewThinkingSteps(found.weaknessId));
        firstAttemptCorrectRef.current = new Array(
          getReviewThinkingSteps(found.weaknessId).length,
        ).fill(null);
        sessionStartedAtRef.current = new Date().toISOString();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, taskId]);

  const resetStepState = () => {
    setSelectedChoiceIndex(null);
    setUserText('');
    setAiFeedback(null);
    setStepPhase('input');
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
    if (
      stepPhase === 'input' &&
      firstAttemptCorrectRef.current[currentStepIndex] === null
    ) {
      const isCorrect = steps[currentStepIndex]?.choices[index]?.correct ?? false;
      firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
    }
  };

  const onChangeText = (text: string) => {
    setUserText(text);
  };

  const onPressNext = async () => {
    if (isFetchingRef.current) return;
    const step = steps[currentStepIndex];
    if (!step || !task) {
      return;
    }

    const hasChoice = selectedChoiceIndex !== null;
    const hasText = userText.trim().length > 0;

    if (!hasChoice && !hasText) return;

    isFetchingRef.current = true;
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
      setAiFeedback(null);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
      setStepPhase('feedback');
    }
  };

  const onPressContinue = () => {
    if (!task || steps.length === 0) {
      return;
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      setSessionComplete(true);
    } else {
      setCurrentStepIndex(nextIndex);
      resetStepState();
    }
  };

  const onPressRemember = async () => {
    if (!task || !profile) {
      return;
    }

    const completedAt = new Date().toISOString();
    const results = firstAttemptCorrectRef.current;
    const questionCount = steps.length;
    const correctCount = results.filter((r) => r === true).length;
    const accuracy =
      questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 100;

    try {
      await recordAttempt({
        attemptId: `review-${task.id}-${Date.now().toString(36)}`,
        accountKey,
        learnerId: profile.learnerId,
        source: 'weakness-practice',
        sourceEntityId: task.sourceId,
        gradeSnapshot: profile.grade,
        startedAt: sessionStartedAtRef.current,
        completedAt,
        questionCount,
        correctCount,
        wrongCount: results.filter((r) => r === false).length,
        accuracy,
        primaryWeaknessId: task.weaknessId,
        topWeaknesses: [task.weaknessId],
        reviewContext: {
          reviewTaskId: task.id,
          reviewStage: task.stage,
        },
        questions: steps.map((step, i) => ({
          questionId: `${task.id}-step-${i}`,
          questionNumber: i + 1,
          topic: step.title,
          selectedIndex: null,
          isCorrect: results[i] ?? false,
          finalWeaknessId: task.weaknessId,
          methodId: null,
          diagnosisSource: null,
          finalMethodSource: null,
          diagnosisCompleted: true,
          usedDontKnow: false,
          usedAiHelp: false,
        })),
      });
    } catch (error) {
      console.warn('Failed to record review attempt', error);
    }

    try {
      await completeReviewTask(accountKey, task.id, store);
      await refresh();
    } catch (error) {
      console.warn('Failed to complete review task', error);
    }
    router.back();
  };

  const onPressRetry = async () => {
    if (!task) {
      return;
    }
    try {
      await rescheduleReviewTask(accountKey, task.id, store);
      await refresh();
    } catch (error) {
      console.warn('Failed to reschedule review task', error);
    }
    router.back();
  };

  const hasInput = selectedChoiceIndex !== null || userText.trim().length > 0;

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
    hasInput,
    onSelectChoice,
    onChangeText,
    onPressNext,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  };
}
