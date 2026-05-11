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
import type { WeaknessId } from '@/data/diagnosisMap';
import {
  getRemedialNode,
} from '@/data/review-remedial-flows';
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

// ExitNode 도달 후 다음 ThinkingStep으로 자동 전환하기까지 짧게 보여주는 전환 카드의 지속 시간(ms).
// spec §13 (미해결 항목) — UX 시연 후 확정 예정.
const REMEDIAL_TRANSITION_DELAY_MS = 600;
import {
  createAiBubbleEntry,
  createAiHelpActionsEntry,
  createAiHelpInputEntry,
  createNodeEntry,
  createTransitionEntry,
  createUserBubbleEntry,
  lockAllEntries,
  type RemedialEntry,
} from '@/features/quiz/components/review-session/remedial-entries';

type StepPhase = 'input' | 'chat' | 'remedial';

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
  selectedChoiceFeedback: string | null;
  aiResponseCount: number;
  isTextMode: boolean;
  onBack: () => void;
  onSelectChoice: (index: number) => void;
  onChangeText: (text: string) => void;
  onPressNext: () => void;
  onChangeChatText: (text: string) => void;
  onSendChatMessage: () => void;
  onPressContinue: () => void;
  onPressRemember: () => void;
  onPressRetry: () => void;
  remedialFlowState: {
    weaknessId: WeaknessId;
    currentNodeId: string;
    entries: RemedialEntry[];
    aiHelpUsed: boolean;
    aiHelpState: { nodeId: string; input: string; isLoading: boolean; error: string } | null;
  } | null;
  onPressRemedialPrimary: (nodeId: string) => void;
  onPressRemedialSecondary: (nodeId: string) => void;
  onPressRemedialChoice: (nodeId: string, optionId: string) => void;
  onChangeRemedialAiHelpInput: (text: string) => void;
  onSendRemedialAiHelp: () => void;
  onPressRemedialAiHelpAction: (action: 'continue' | 'fallback') => void;
  entries: ReviewEntry[];
  freeText: string;
  fallbackText: string;
  onChangeFreeText: (text: string) => void;
  onSubmitFreeText: () => Promise<void>;
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
  const [selectedChoiceFeedback, setSelectedChoiceFeedback] = useState<string | null>(null);
  const [aiResponseCount, setAiResponseCount] = useState(0);
  const [remedialFlowState, setRemedialFlowState] = useState<{
    weaknessId: WeaknessId;
    currentNodeId: string;
    entries: RemedialEntry[];
    aiHelpUsed: boolean;
    aiHelpState: { nodeId: string; input: string; isLoading: boolean; error: string } | null;
  } | null>(null);

  const [freeText, setFreeText] = useState('');
  const [fallbackText, setFallbackText] = useState('');
  const [fallbackTurnsUsed, setFallbackTurnsUsed] = useState(0);
  const chatHistoryRef = useRef<ChatMessage[]>([]);

  const isFetchingRef = useRef(false);
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const firstAttemptCorrectRef = useRef<(boolean | null)[]>([]);
  const firstAttemptChoiceIndexRef = useRef<(number | null)[]>([]);
  const aiHelpUsedPerStepRef = useRef<boolean[]>([]);
  const wrongAttemptsPerStepRef = useRef<number[]>([]);
  const remedialTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reviewEntries = useReviewEntries(currentStepIndex);

  useEffect(() => {
    reviewEntries.resetForStep(currentStepIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  useEffect(() => {
    return () => {
      if (remedialTransitionTimeoutRef.current) {
        clearTimeout(remedialTransitionTimeoutRef.current);
        remedialTransitionTimeoutRef.current = null;
      }
    };
  }, []);

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
      setSteps(getReviewThinkingSteps(mockTask.weaknessId));
      const mockStepCount = getReviewThinkingSteps(mockTask.weaknessId).length;
      firstAttemptCorrectRef.current = new Array(mockStepCount).fill(null);
      firstAttemptChoiceIndexRef.current = new Array(mockStepCount).fill(null);
      aiHelpUsedPerStepRef.current = new Array(mockStepCount).fill(false);
      wrongAttemptsPerStepRef.current = new Array(mockStepCount).fill(0);
      sessionStartedAtRef.current = new Date().toISOString();
      return;
    }

    let cancelled = false;
    store.load(accountKey).then((tasks) => {
      if (cancelled) return;
      const found = tasks.find((t) => t.id === taskId) ?? null;
      setTask(found);
      if (found) {
        setSteps(getReviewThinkingSteps(found.weaknessId));
        const foundStepCount = getReviewThinkingSteps(found.weaknessId).length;
        firstAttemptCorrectRef.current = new Array(foundStepCount).fill(null);
        firstAttemptChoiceIndexRef.current = new Array(foundStepCount).fill(null);
        aiHelpUsedPerStepRef.current = new Array(foundStepCount).fill(false);
        wrongAttemptsPerStepRef.current = new Array(foundStepCount).fill(0);
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
    setSelectedChoiceFeedback(null);
    setAiResponseCount(0);
  };

  const onSelectChoice = (index: number) => {
    setSelectedChoiceIndex(index);
    const choice = steps[currentStepIndex]?.choices[index];
    setSelectedChoiceFeedback(choice?.feedback ?? null);
    // 첫 시도 결과는 'input' phase에서만 기록한다. 보완 흐름 진행은 이 값에 영향을 주지 않는다.
    // 두 ref는 동시에 채워야 통계 매핑(`onPressRemember`의 questions)이 정합성을 유지한다.
    if (stepPhase === 'input' && firstAttemptCorrectRef.current[currentStepIndex] === null) {
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

  const onChangeText = (text: string) => {
    setUserText(text);
  };

  const onChangeChatText = (text: string) => {
    setChatText(text);
  };

  const onPressContinue = () => {
    if (!task || steps.length === 0) {
      return;
    }
    // ExitNode 전환 setTimeout이 진행 중이면 중복 진행을 막기 위해 cancel.
    if (remedialTransitionTimeoutRef.current) {
      clearTimeout(remedialTransitionTimeoutRef.current);
      remedialTransitionTimeoutRef.current = null;
    }
    const nextIndex = currentStepIndex + 1;
    // spec invariant: ExitNode 도달 또는 다음 ThinkingStep 이동 시 보완 상태 전체 리셋.
    // 마지막 step 완료(세션 종료) 시점에도 동일하게 리셋한다.
    setRemedialFlowState(null);
    if (nextIndex >= steps.length) {
      setSessionComplete(true);
    } else {
      setCurrentStepIndex(nextIndex);
      resetStepState();
    }
  };

  const onPressNext = () => {
    const step = steps[currentStepIndex];
    if (!step || !task) return;

    const choiceIndex = selectedChoiceIndex;
    if (choiceIndex === null) return;
    const choice = step.choices[choiceIndex];
    if (!choice) return;

    if (choice.correct) {
      onPressContinue();
      return;
    }

    if (!choice.remedialFlowStartNodeId) {
      console.warn(`Choice index ${choiceIndex} of step ${step.id} has no remedialFlowStartNodeId`);
      onPressContinue();
      return;
    }

    const startNode = getRemedialNode(task.weaknessId, choice.remedialFlowStartNodeId);
    if (!startNode) {
      console.warn(`Remedial node not found: ${choice.remedialFlowStartNodeId}`);
      onPressContinue();
      return;
    }

    setStepPhase('remedial');
    setRemedialFlowState({
      weaknessId: task.weaknessId,
      currentNodeId: startNode.id,
      entries: [createNodeEntry(startNode)],
      aiHelpUsed: false,
      aiHelpState: null,
    });
  };

  // @deprecated 메인 챗 진입 경로가 제거됨. 보완 흐름(remedial-flow.tsx)으로 대체.
  // 별도 cleanup PR에서 제거 예정.
  const onSendChatMessage = async () => {
    if (isFetchingRef.current || !chatText.trim() || !task) return;
    if (aiResponseCount >= 2) return;
    const step = steps[currentStepIndex];
    if (!step) return;

    const userInput = chatText.trim();
    const newUserEntry: ChatEntry = { role: 'user', text: userInput };
    const allMessages = [...chatMessages, newUserEntry];
    const choice =
      selectedChoiceIndex !== null ? step.choices[selectedChoiceIndex] : null;

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
        selectedChoiceText: choice?.text,
        selectedChoiceCorrect: choice?.correct,
        messages: apiMessages,
      });
      setChatMessages([...allMessages, { role: 'ai', text: result.replyText }]);
      setAiResponseCount((c) => c + 1);
    } catch {
      // 실패 시 사용자 메시지 롤백 + 입력 텍스트 복원 (재시도 보장)
      setChatMessages((prev) => prev.slice(0, -1));
      setChatText(userInput);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
    }
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
      // 2턴째 fallback-input 추가는 Task 8에서
    } catch {
      reviewEntries.replaceTypingWithBubble('응답이 늦고 있어요. 잠시 후 다시 시도해주세요.');
    }
  };

  const appendRemedialEntries = (...newEntries: RemedialEntry[]) => {
    setRemedialFlowState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: [...lockAllEntries(prev.entries), ...newEntries],
      };
    });
  };

  const advanceToRemedialNode = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node) {
      console.warn(`Remedial node not found: ${nodeId}`);
      onPressContinue();
      return;
    }
    if (node.kind === 'exit') {
      appendRemedialEntries(createTransitionEntry('이해 잘 되셨네요. 다음으로 가요.'));
      if (remedialTransitionTimeoutRef.current) {
        clearTimeout(remedialTransitionTimeoutRef.current);
      }
      remedialTransitionTimeoutRef.current = setTimeout(() => {
        remedialTransitionTimeoutRef.current = null;
        onPressContinue();
      }, REMEDIAL_TRANSITION_DELAY_MS);
      return;
    }
    appendRemedialEntries(createNodeEntry(node));
    setRemedialFlowState((prev) => (prev ? { ...prev, currentNodeId: node.id } : prev));
  };

  const onPressRemedialPrimary = (nodeId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'explain') return;
    advanceToRemedialNode(node.primaryNextNodeId);
  };

  const onPressRemedialSecondary = (nodeId: string) => {
    if (!task || !remedialFlowState) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind === 'exit') return;

    const fallbackId = node.kind === 'explain' ? node.secondaryNextNodeId : node.dontKnowNextNodeId;

    if (remedialFlowState.aiHelpUsed) {
      appendRemedialEntries(createUserBubbleEntry('모르겠어요'));
      advanceToRemedialNode(fallbackId);
      return;
    }

    // aiHelpUsed=true는 AI 응답이 실제로 성공한 시점에 set (`onSendRemedialAiHelp` try 블록).
    // spec §6.3 "실패 시 aiHelpUsed=false 유지 → 학습자가 재시도 가능".
    appendRemedialEntries(
      createUserBubbleEntry('모르겠어요'),
      createAiHelpInputEntry(node.id, node.kind),
    );
    setRemedialFlowState((prev) => prev ? {
      ...prev,
      aiHelpState: { nodeId: node.id, input: '', isLoading: false, error: '' },
    } : prev);
  };

  const onPressRemedialChoice = (nodeId: string, optionId: string) => {
    if (!task) return;
    const node = getRemedialNode(task.weaknessId, nodeId);
    if (!node || node.kind !== 'check') return;
    const option = node.options.find((o) => o.id === optionId);
    if (!option) return;
    if (!option.isCorrect) {
      wrongAttemptsPerStepRef.current[currentStepIndex] += 1;
    }
    advanceToRemedialNode(option.nextNodeId);
  };

  const onChangeRemedialAiHelpInput = (text: string) => {
    setRemedialFlowState((prev) => prev && prev.aiHelpState ? {
      ...prev,
      aiHelpState: { ...prev.aiHelpState, input: text, error: '' },
    } : prev);
  };

  const onSendRemedialAiHelp = async () => {
    const state = remedialFlowState;
    if (!state || !state.aiHelpState || !task) return;
    const input = state.aiHelpState.input.trim();
    if (!input || state.aiHelpState.isLoading) return;

    const node = getRemedialNode(state.weaknessId, state.aiHelpState.nodeId);
    if (!node || node.kind === 'exit') return;

    setRemedialFlowState((prev) => prev && prev.aiHelpState ? {
      ...prev,
      aiHelpState: { ...prev.aiHelpState, isLoading: true, error: '' },
    } : prev);

    try {
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: steps[currentStepIndex].title,
        stepBody: steps[currentStepIndex].body,
        selectedChoiceText: selectedChoiceIndex !== null
          ? steps[currentStepIndex].choices[selectedChoiceIndex]?.text
          : undefined,
        selectedChoiceCorrect: selectedChoiceIndex !== null
          ? steps[currentStepIndex].choices[selectedChoiceIndex]?.correct
          : undefined,
        messages: [{ role: 'user', content: input }],
        remedialContext: {
          nodeId: node.id,
          nodeKind: node.kind,
          nodeTitle: node.title,
          nodeBody: node.kind === 'explain' ? node.body : undefined,
          nodePrompt: node.kind === 'check' ? node.prompt : undefined,
          nodeOptions: node.kind === 'check' ? node.options.map((o) => o.text) : undefined,
        },
      });

      appendRemedialEntries(
        createUserBubbleEntry(input),
        createAiBubbleEntry(result.replyText),
        createAiHelpActionsEntry(node.kind),
      );
      // AI 응답이 실제로 성공한 시점에 aiHelpUsed 가드와 분석 ref를 동시에 마킹.
      setRemedialFlowState((prev) => prev ? { ...prev, aiHelpUsed: true, aiHelpState: null } : prev);
      aiHelpUsedPerStepRef.current[currentStepIndex] = true;
    } catch {
      setRemedialFlowState((prev) => prev && prev.aiHelpState ? {
        ...prev,
        aiHelpState: {
          ...prev.aiHelpState,
          isLoading: false,
          error: '응답이 조금 늦고 있어요. 다시 시도하거나 더 쉬운 설명으로 이어갈 수 있어요.',
        },
      } : prev);
    }
  };

  const onPressRemedialAiHelpAction = (action: 'continue' | 'fallback') => {
    if (!task || !remedialFlowState) return;
    const node = getRemedialNode(task.weaknessId, remedialFlowState.currentNodeId);
    if (!node) return;

    if (node.kind === 'exit') return;

    if (action === 'continue') {
      if (node.kind === 'explain') {
        advanceToRemedialNode(node.primaryNextNodeId);
      } else {
        // CheckNode 재활성화 — 같은 노드를 다시 entry로 추가
        appendRemedialEntries(createNodeEntry(node));
      }
    } else {
      const fallbackId = node.kind === 'explain' ? node.secondaryNextNodeId : node.dontKnowNextNodeId;
      advanceToRemedialNode(fallbackId);
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
    selectedChoiceFeedback,
    aiResponseCount,
    isTextMode: userText.length > 0,
    onBack: router.back,
    onSelectChoice,
    onChangeText,
    onPressNext,
    onChangeChatText,
    onSendChatMessage,
    onPressContinue,
    onPressRemember,
    onPressRetry,
    remedialFlowState,
    onPressRemedialPrimary,
    onPressRemedialSecondary,
    onPressRemedialChoice,
    onChangeRemedialAiHelpInput,
    onSendRemedialAiHelp,
    onPressRemedialAiHelpAction,
    entries: reviewEntries.entries,
    freeText,
    fallbackText,
    onChangeFreeText,
    onSubmitFreeText,
  };
}
