// features/quiz/hooks/use-review-session-screen.ts
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { getReviewThinkingSteps, type ThinkingStep } from '@/data/review-content-map';
import { completeReviewTask, rescheduleReviewTask } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';
import { useCurrentLearner } from '@/features/learner/provider';
import { getSingleParam } from '@/utils/get-single-param';
import { requestReviewFeedback, type ChatMessage } from '@/features/quiz/review-feedback';

type StepPhase = 'input' | 'chat';

type ChatEntry = {
  role: 'user' | 'ai';
  text: string;
};

export type UseReviewSessionScreenResult = {
  task: ReviewTask | null;
  steps: readonly ThinkingStep[];
  currentStepIndex: number;
  stepPhase: StepPhase;
  selectedChoiceIndex: number | null;
  userText: string;
  chatMessages: ChatEntry[];
  chatText: string;
  isLoadingFeedback: boolean;
  sessionComplete: boolean;
  hasInput: boolean;
  onBack: () => void;
  onSelectChoice: (index: number) => void;
  onChangeText: (text: string) => void;
  onPressNext: () => void;
  onChangeChatText: (text: string) => void;
  onSendChatMessage: () => void;
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
  const [steps, setSteps] = useState<readonly ThinkingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepPhase, setStepPhase] = useState<StepPhase>('input');
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [userText, setUserText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [chatText, setChatText] = useState('');
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
    setChatMessages([]);
    setChatText('');
    setStepPhase('input');
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
    if (stepPhase === 'input' && firstAttemptCorrectRef.current[currentStepIndex] === null) {
      const isCorrect = steps[currentStepIndex]?.choices[index]?.correct ?? false;
      firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
    }
  };

  const onChangeText = (text: string) => {
    setUserText(text);
  };

  const onChangeChatText = (text: string) => {
    setChatText(text);
  };

  const onPressNext = async () => {
    if (isFetchingRef.current) return;
    const step = steps[currentStepIndex];
    if (!step || !task) return;

    const hasChoice = selectedChoiceIndex !== null;
    const hasText = userText.trim().length > 0;
    if (!hasChoice && !hasText) return;

    // 첫 번째 user 메시지 조합
    const parts: string[] = [];
    if (hasChoice) parts.push(`선택: ${step.choices[selectedChoiceIndex!]?.text ?? ''}`);
    if (hasText) parts.push(hasChoice ? `직접 쓴 내용: ${userText.trim()}` : userText.trim());
    const firstUserContent = parts.join('\n');

    const firstUserEntry: ChatEntry = { role: 'user', text: firstUserContent };

    isFetchingRef.current = true;
    setIsLoadingFeedback(true);
    setChatMessages([firstUserEntry]);
    setStepPhase('chat');

    try {
      const apiMessages: ChatMessage[] = [{ role: 'user', content: firstUserContent }];
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        messages: apiMessages,
      });
      setChatMessages([firstUserEntry, { role: 'ai', text: result.replyText }]);
    } catch {
      // 에러 시 AI 응답 없이 계속 진행 가능
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
    }
  };

  const onSendChatMessage = async () => {
    if (isFetchingRef.current || !chatText.trim() || !task) return;
    const step = steps[currentStepIndex];
    if (!step) return;

    const userInput = chatText.trim();
    const newUserEntry: ChatEntry = { role: 'user', text: userInput };
    const allMessages = [...chatMessages, newUserEntry];

    setChatMessages(allMessages);
    setChatText('');
    isFetchingRef.current = true;
    setIsLoadingFeedback(true);

    try {
      const apiMessages: ChatMessage[] = allMessages.map((m) => ({
        role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        messages: apiMessages,
      });
      setChatMessages([...allMessages, { role: 'ai', text: result.replyText }]);
    } catch {
      // 에러 시 사용자 메시지만 보임, 계속 진행 가능
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
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
    chatMessages,
    chatText,
    isLoadingFeedback,
    sessionComplete,
    hasInput,
    onBack: router.back,
    onSelectChoice,
    onChangeText,
    onPressNext,
    onChangeChatText,
    onSendChatMessage,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  };
}
