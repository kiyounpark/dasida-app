// features/quiz/hooks/use-review-session-screen.ts
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { getReviewThinkingSteps, type ThinkingStep } from '@/data/review-content-map';
import { completeReviewTask, rescheduleReviewTask } from '@/features/learning/review-scheduler';
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import { rescheduleAllReviewNotifications } from '@/features/quiz/notifications/review-notification-scheduler';
import type { ReviewTask } from '@/features/learning/types';
import { useCurrentLearner } from '@/features/learner/provider';
import { getSingleParam } from '@/utils/get-single-param';
import { requestReviewFeedback, type ChatMessage } from '@/features/quiz/review-feedback';
import { getRemedialNode } from '@/data/review-remedial-flows';
import { logEvent } from '@/features/analytics/log-event';
import { useReviewEntries } from './use-review-entries';
import {
  createChoiceBubbleEntry,
  createFeedbackBannerEntry,
  createDoneCtaEntry,
  createRemedialNodeEntry,
  createUserBubbleEntry as createReviewUserBubbleEntry,
  createAiTypingEntry,
  createFallbackInputEntry,
  type ReviewEntry,
} from '@/features/quiz/components/review-session/review-entries';

export type UseReviewSessionScreenResult = {
  task: ReviewTask | null;
  steps: readonly ThinkingStep[];
  currentStepIndex: number;
  sessionComplete: boolean;
  onBack: () => void;
  onSelectChoice: (index: number) => void;
  onPressNext: () => void;
  onPressContinue: () => void;
  onPressRemember: () => void;
  onPressRetry: () => void;
  onRemedialExplainPrimary: (nodeId: string) => void;
  onRemedialExplainSecondary: (nodeId: string) => void;
  onRemedialCheckOption: (nodeId: string, optionId: string) => void;
  onRemedialCheckDontKnow: (nodeId: string) => void;
  entries: ReviewEntry[];
  freeText: string;
  fallbackText: string;
  onChangeFreeText: (text: string) => void;
  onSubmitFreeText: () => Promise<void>;
  onChangeFallbackText: (text: string) => void;
  onSubmitFallback: () => Promise<void>;
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
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  const [freeText, setFreeText] = useState('');
  const [fallbackText, setFallbackText] = useState('');
  const [fallbackTurnsUsed, setFallbackTurnsUsed] = useState(0);
  const chatHistoryRef = useRef<ChatMessage[]>([]);

  const sessionStartedAtRef = useRef(new Date().toISOString());
  const firstAttemptCorrectRef = useRef<(boolean | null)[]>([]);
  const firstAttemptChoiceIndexRef = useRef<(number | null)[]>([]);
  const aiHelpUsedPerStepRef = useRef<boolean[]>([]);

  const reviewEntries = useReviewEntries(currentStepIndex);
  const { resetForStep: resetEntriesForStep } = reviewEntries;
  const prevStepIndexRef = useRef(currentStepIndex);

  // 다음 step으로 넘어갈 때 entries를 새 step의 seed로 리셋한다.
  // 초기 mount(prev === current)에서는 useReviewEntries가 이미 시드한 상태이므로 건너뛴다.
  useEffect(() => {
    if (prevStepIndexRef.current !== currentStepIndex) {
      resetEntriesForStep(currentStepIndex);
      prevStepIndexRef.current = currentStepIndex;
    }
  }, [currentStepIndex, resetEntriesForStep]);

  // task 로드
  useEffect(() => {
    if (!accountKey || !taskId) {
      return;
    }

    // DEV: 스크린샷용 목업 태스크 (taskId='__mock__'일 때만 활성화)
    if (taskId === '__mock__') {
      const mockTask: ReviewTask = {
        id: '__mock__',
        accountKey,
        weaknessId: 'formula_understanding',
        source: 'diagnostic',
        sourceId: '__mock__',
        scheduledFor: new Date().toISOString(),
        stage: 'day1',
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTask(mockTask);
      if (__DEV__) {
        logEvent('review_started', { task_id: mockTask.id });
      }
      setSteps(getReviewThinkingSteps(mockTask.weaknessId));
      const mockStepCount = getReviewThinkingSteps(mockTask.weaknessId).length;
      firstAttemptCorrectRef.current = new Array(mockStepCount).fill(null);
      firstAttemptChoiceIndexRef.current = new Array(mockStepCount).fill(null);
      aiHelpUsedPerStepRef.current = new Array(mockStepCount).fill(false);
      sessionStartedAtRef.current = new Date().toISOString();
      return;
    }

    let cancelled = false;
    store.load(accountKey).then((tasks) => {
      if (cancelled) return;
      const found = tasks.find((t) => t.id === taskId) ?? null;
      setTask(found);
      if (found) {
        logEvent('review_started', { task_id: found.id });
        setSteps(getReviewThinkingSteps(found.weaknessId));
        const foundStepCount = getReviewThinkingSteps(found.weaknessId).length;
        firstAttemptCorrectRef.current = new Array(foundStepCount).fill(null);
        firstAttemptChoiceIndexRef.current = new Array(foundStepCount).fill(null);
        aiHelpUsedPerStepRef.current = new Array(foundStepCount).fill(false);
        sessionStartedAtRef.current = new Date().toISOString();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, taskId]);

  const resetStepState = () => {
    setSelectedChoiceIndex(null);
    setFreeText('');
    setFallbackText('');
    setFallbackTurnsUsed(0);
    chatHistoryRef.current = [];
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
    const choice = steps[currentStepIndex]?.choices[index];
    // 두 ref는 동시에 채워야 통계 매핑(`onPressRemember`의 questions)이 정합성을 유지한다.
    if (firstAttemptCorrectRef.current[currentStepIndex] === null) {
      const isCorrect = choice?.correct ?? false;
      firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
      firstAttemptChoiceIndexRef.current[currentStepIndex] = index;
    }

    // entries-based flow (new)
    if (!choice || !task) return;
    reviewEntries.lockInputArea();
    reviewEntries.appendEntries([
      createChoiceBubbleEntry(index, choice.text, choice.correct),
      createFeedbackBannerEntry(choice.correct, choice.feedback ?? ''),
    ]);

    if (choice.correct) {
      const isLast = currentStepIndex === steps.length - 1;
      reviewEntries.appendEntries([
        createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
      ]);
    } else {
      const startNodeId = choice.remedialFlowStartNodeId;
      if (startNodeId) {
        const firstNode = getRemedialNode(task.weaknessId, startNodeId);
        if (firstNode && firstNode.kind !== 'exit') {
          reviewEntries.appendEntries([createRemedialNodeEntry(firstNode)]);
        }
      }
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

  const onPressNext = () => {
    onPressContinue();
  };

  const onChangeFreeText = (text: string) => setFreeText(text);

  const onSubmitFreeText = async () => {
    const text = freeText.trim();
    if (!text || !task) return;

    setFreeText('');
    reviewEntries.lockInputArea();
    reviewEntries.appendEntries([
      createReviewUserBubbleEntry(text),
      createAiTypingEntry(),
    ]);

    // 새 대화 시작: 자유 입력 1턴은 항상 새 history로 시작한다.
    // (실패 후 재시도 시에도 이 함수가 다시 호출되므로 이전 메시지를 덮어쓰는 것이 의도된 동작.)
    chatHistoryRef.current = [{ role: 'user', content: text }];

    try {
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: steps[currentStepIndex].title,
        stepBody: steps[currentStepIndex].body,
        messages: chatHistoryRef.current,
      });
      chatHistoryRef.current.push({ role: 'assistant', content: result.replyText });
      reviewEntries.replaceTypingWithBubble(result.replyText);
      setFallbackTurnsUsed(1);
      aiHelpUsedPerStepRef.current[currentStepIndex] = true;
      reviewEntries.appendEntries([createFallbackInputEntry(2)]);
    } catch {
      reviewEntries.replaceTypingWithBubble('응답이 늦고 있어요. 잠시 후 다시 시도해주세요.');
      // 실패 시 사용자가 재시도할 수 있도록 입력 복구 + input-area 다시 활성화.
      setFreeText(text);
      reviewEntries.unlockLatestInput();
    }
  };

  const onChangeFallbackText = (text: string) => setFallbackText(text);

  const onSubmitFallback = async () => {
    const text = fallbackText.trim();
    if (!text || !task) return;

    setFallbackText('');
    reviewEntries.lockInputArea();
    reviewEntries.appendEntries([
      createReviewUserBubbleEntry(text),
      createAiTypingEntry(),
    ]);

    chatHistoryRef.current.push({ role: 'user', content: text });
    // 응답이 어느 턴의 마무리인지를 결정하기 위해 현재 턴 카운트를 잡아둔다.
    // (Scenario B: free-text 1턴 후 setFallbackTurnsUsed(1) 상태에서 진입 → 이 호출이 2번째 턴.
    //  Scenario E: remedial "모르겠어요" 후 setFallbackTurnsUsed(0) 상태에서 진입 → 이 호출이 1번째 턴,
    //   응답 후 fallback-input(turn=2)를 추가해 2턴까지 진행한다.)
    const turnBeforeResponse = fallbackTurnsUsed;

    try {
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: steps[currentStepIndex].title,
        stepBody: steps[currentStepIndex].body,
        messages: chatHistoryRef.current,
      });
      chatHistoryRef.current.push({ role: 'assistant', content: result.replyText });
      reviewEntries.replaceTypingWithBubble(result.replyText);
      aiHelpUsedPerStepRef.current[currentStepIndex] = true;

      if (turnBeforeResponse === 0) {
        // 1턴 완료 → 2턴 입력창 오픈 (close 모드 마무리는 다음 submit에서)
        setFallbackTurnsUsed(1);
        reviewEntries.appendEntries([createFallbackInputEntry(2)]);
      } else {
        // 2턴 마무리 → done-cta로 step 종료
        setFallbackTurnsUsed(turnBeforeResponse + 1);
        const isLast = currentStepIndex === steps.length - 1;
        reviewEntries.appendEntries([
          createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
        ]);
      }
    } catch {
      reviewEntries.replaceTypingWithBubble('응답이 늦고 있어요. 다시 시도해 주세요.');
      // 실패 시 사용자가 재시도할 수 있도록 fallback-input 다시 활성화.
      // (chatHistoryRef는 이미 user 메시지를 push했으므로, 다음 호출 시 같은 메시지가
      // 두 번 들어가지 않도록 마지막 user 항목을 제거한다.)
      chatHistoryRef.current.pop();
      setFallbackText(text);
      reviewEntries.unlockLatestInput();
    }
  };

  // 헬퍼: 다음 remedial 노드로 진행 (entries 기반)
  const advanceRemedialToNode = (nextNodeId: string) => {
    if (!task) return;
    reviewEntries.lockRemedialNodes();
    const next = getRemedialNode(task.weaknessId, nextNodeId);
    if (!next || next.kind === 'exit') {
      const isLast = currentStepIndex === steps.length - 1;
      reviewEntries.appendEntries([
        createDoneCtaEntry(isLast ? '이해했어요, 완료' : '이해했어요, 다음으로'),
      ]);
      return;
    }
    reviewEntries.appendEntries([createRemedialNodeEntry(next)]);
  };

  const onRemedialExplainPrimary = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'explain') return;
    advanceRemedialToNode(node.primaryNextNodeId);
  };

  const onRemedialExplainSecondary = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'explain') return;
    reviewEntries.lockRemedialNodes();
    reviewEntries.appendEntries([createFallbackInputEntry(1)]);
    setFallbackTurnsUsed(0);
    aiHelpUsedPerStepRef.current[currentStepIndex] = true;
  };

  const onRemedialCheckOption = (nodeId: string, optionId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'check') return;
    const opt = node.options.find((o) => o.id === optionId);
    if (!opt) return;
    reviewEntries.appendEntries([createReviewUserBubbleEntry(opt.text)]);
    advanceRemedialToNode(opt.nextNodeId);
  };

  const onRemedialCheckDontKnow = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'check') return;
    reviewEntries.lockRemedialNodes();
    reviewEntries.appendEntries([createFallbackInputEntry(1)]);
    setFallbackTurnsUsed(0);
    aiHelpUsedPerStepRef.current[currentStepIndex] = true;
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

    logEvent('review_completed', {
      task_id: task.id,
      correct_count: correctCount,
      total_count: questionCount,
    });

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
          selectedIndex: firstAttemptChoiceIndexRef.current[i] ?? null,
          isCorrect: results[i] ?? false,
          finalWeaknessId: task.weaknessId,
          methodId: null,
          diagnosisSource: null,
          finalMethodSource: null,
          diagnosisCompleted: true,
          usedDontKnow: false,
          usedAiHelp: aiHelpUsedPerStepRef.current[i] ?? false,
        })),
      });
    } catch (error) {
      console.warn('Failed to record review attempt', error);
    }

    try {
      await completeReviewTask(accountKey, task.id, store);
      void rescheduleAllReviewNotifications(accountKey, store).catch(console.warn);
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
      void rescheduleAllReviewNotifications(accountKey, store).catch(console.warn);
      await refresh();
    } catch (error) {
      console.warn('Failed to reschedule review task', error);
    }
    router.back();
  };

  return {
    task,
    steps,
    currentStepIndex,
    sessionComplete,
    onBack: router.back,
    onSelectChoice,
    onPressNext,
    onPressContinue,
    onPressRemember,
    onPressRetry,
    onRemedialExplainPrimary,
    onRemedialExplainSecondary,
    onRemedialCheckOption,
    onRemedialCheckDontKnow,
    entries: reviewEntries.entries,
    freeText,
    fallbackText,
    onChangeFreeText,
    onSubmitFreeText,
    onChangeFallbackText,
    onSubmitFallback,
  };
}
