import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MathText } from '@/components/math/MathText';
import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import { methodOptions, type SolveMethodId } from '@/data/diagnosisTree';
import { problemData, type Problem } from '@/data/problemData';
import {
  DiagnosisConversationPage,
  type DiagnosisConversationEntry,
} from '@/features/quiz/components/diagnosis-conversation-page';
import { DiagnosisExitConfirmModal } from '@/features/quiz/components/diagnosis-exit-confirm-modal';
import type { DiagnosisMethodCardOption } from '@/features/quiz/components/diagnosis-method-selector-card';
import {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  buildDiagnosisDetailTrace,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
  type DiagnosisFlowDraft,
} from '@/features/quiz/diagnosis-flow-engine';
import { analyzeDiagnosisMethod, type DiagnosisRouterResult } from '@/features/quiz/diagnosis-router';
import { useQuizSession } from '@/features/quiz/session';

type DiagnosisWorkspace = {
  answerIndex: number;
  problemId: string;
  status: 'pending' | 'in_progress' | 'completed';
  methodId: SolveMethodId | null;
  diagnosisInput: string;
  routerResult: DiagnosisRouterResult | null;
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  flowDraft: DiagnosisFlowDraft | null;
  chatEntries: DiagnosisConversationEntry[];
};

type DiagnosisPage = {
  answerIndex: number;
  problem: Problem;
  workspace: DiagnosisWorkspace;
  methods: DiagnosisMethodCardOption[];
  suggestedMethods: DiagnosisMethodCardOption[];
};

const problemById = new Map(problemData.map((problem) => [problem.id, problem]));

function getMethodLabel(
  methodId: SolveMethodId,
  availableMethods: DiagnosisMethodCardOption[],
) {
  return (
    availableMethods.find((method) => method.id === methodId)?.labelKo ??
    methodOptions.find((method) => method.id === methodId)?.labelKo ??
    methodId
  );
}

function getMethodSelectionText(methodId: SolveMethodId, methodLabel: string) {
  if (methodId === 'unknown') {
    return '잘 모르겠어요.';
  }

  return `${methodLabel}으로 풀었어요.`;
}

const diagnosisStepLabels = [
  '첫 번째 문제',
  '두 번째 문제',
  '세 번째 문제',
  '네 번째 문제',
  '다섯 번째 문제',
  '여섯 번째 문제',
  '일곱 번째 문제',
  '여덟 번째 문제',
  '아홉 번째 문제',
  '열 번째 문제',
] as const;

function getDiagnosisStepLabel(index: number) {
  return diagnosisStepLabels[index] ?? `${index + 1}번째 문제`;
}

function freezeConversationEntries(
  entries: DiagnosisConversationEntry[],
): DiagnosisConversationEntry[] {
  return entries.map((entry) =>
    entry.kind === 'method-selector' || entry.kind === 'node'
      ? { ...entry, interactive: false }
      : entry,
  );
}

function buildMethodOptions(problem: Problem): DiagnosisMethodCardOption[] {
  return methodOptions
    .filter((option) => problem.diagnosisMethods.includes(option.id))
    .map((option) => {
      const info = diagnosisMethodRoutingCatalog[option.id];

      return {
        id: option.id,
        labelKo: option.labelKo,
        summary: info?.summary ?? option.labelKo,
        exampleUtterances: info?.exampleUtterances ?? [],
      };
    });
}

function buildSuggestedMethods(
  routerResult: DiagnosisRouterResult | null,
  methods: DiagnosisMethodCardOption[],
): DiagnosisMethodCardOption[] {
  if (!routerResult?.needsManualSelection) {
    return [];
  }

  const suggestedIds = routerResult.candidateMethodIds
    .filter((methodId) => methodId !== 'unknown')
    .slice(0, 2);

  return suggestedIds
    .map((methodId) => methods.find((method) => method.id === methodId))
    .filter((method): method is DiagnosisMethodCardOption => Boolean(method));
}

function createInitialDiagnosisWorkspace(
  answerIndex: number,
  problem: Problem,
): DiagnosisWorkspace {
  return {
    answerIndex,
    problemId: problem.id,
    status: 'pending',
    methodId: null,
    diagnosisInput: '',
    routerResult: null,
    analysisErrorMessage: '',
    isAnalyzing: false,
    flowDraft: null,
    chatEntries: [
      {
        id: `${answerIndex}-problem`,
        kind: 'problem',
        topic: problem.topic,
        question: problem.question,
      },
      {
        id: `${answerIndex}-prompt`,
        kind: 'bubble',
        role: 'assistant',
        text: '이 문제는 어떻게 풀었나요?',
      },
      {
        id: `${answerIndex}-method-selector`,
        kind: 'method-selector',
        interactive: true,
      },
    ],
  };
}

function getActiveFlowNode(workspace: DiagnosisWorkspace): DiagnosisFlowNode | null {
  if (!workspace.flowDraft) {
    return null;
  }

  return getNode(
    getDiagnosisFlow(workspace.flowDraft.methodId),
    workspace.flowDraft.currentNodeId,
  );
}

export default function QuizIndexScreen() {
  const {
    state,
    startSession,
    submitAnswer,
    confirmDiagnosisMethod,
    submitDiagnosisWeakness,
    finishDiagnosis,
  } = useQuizSession();
  const { width: windowWidth } = useWindowDimensions();
  const diagnosisPageWidth = Math.max(windowWidth, 1);
  const diagnosisPagerRef = useRef<FlatList<DiagnosisPage> | null>(null);
  const diagnosisEntrySequence = useRef<Record<number, number>>({});
  const isAnalyzingRef = useRef<Record<number, boolean>>({});
  const diagnosisScrollOffsetsRef = useRef<Record<number, number>>({});
  const diagnosisHasInteractedRef = useRef<Record<number, boolean>>({});
  const diagnosisPendingAutoScrollRef = useRef<Record<number, boolean>>({});
  const diagnosisPendingRestoreRef = useRef<Record<number, boolean>>({});
  const activeDiagnosisAnswerIndexRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeDiagnosisPageIndex, setActiveDiagnosisPageIndex] = useState(0);
  const [diagnosisWorkspaces, setDiagnosisWorkspaces] = useState<Record<number, DiagnosisWorkspace>>(
    {},
  );
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);

  const currentProblem = useMemo(
    () => problemData[state.currentQuestionIndex],
    [state.currentQuestionIndex],
  );

  useEffect(() => {
    setSelectedIndex(null);
  }, [state.currentQuestionIndex]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (state.result) {
      router.replace('/quiz/result');
    }
  }, [state.result]);

  useEffect(() => {
    if (!state.isDiagnosing) {
      setDiagnosisWorkspaces({});
      setActiveDiagnosisPageIndex(0);
      diagnosisEntrySequence.current = {};
      isAnalyzingRef.current = {};
      diagnosisScrollOffsetsRef.current = {};
      diagnosisHasInteractedRef.current = {};
      diagnosisPendingAutoScrollRef.current = {};
      diagnosisPendingRestoreRef.current = {};
      activeDiagnosisAnswerIndexRef.current = null;
      return;
    }

    setDiagnosisWorkspaces((prev) => {
      const next: Record<number, DiagnosisWorkspace> = {};

      state.diagnosisQueue.forEach((answerIndex) => {
        const answer = state.answers[answerIndex];
        const problem = answer ? problemById.get(answer.problemId) : undefined;

        if (!answer || !problem) {
          return;
        }

        if (!diagnosisEntrySequence.current[answerIndex]) {
          diagnosisEntrySequence.current[answerIndex] = 3;
        }

        next[answerIndex] = prev[answerIndex] ?? createInitialDiagnosisWorkspace(answerIndex, problem);
      });

      return next;
    });

    setActiveDiagnosisPageIndex((prev) =>
      Math.min(prev, Math.max(state.diagnosisQueue.length - 1, 0)),
    );
  }, [state.answers, state.diagnosisQueue, state.isDiagnosing]);

  useEffect(() => {
    if (!state.isDiagnosing || state.diagnosisQueue.length === 0) {
      return;
    }

    const targetIndex = Math.min(activeDiagnosisPageIndex, state.diagnosisQueue.length - 1);
    if (targetIndex < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      diagnosisPagerRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false,
      });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeDiagnosisPageIndex, diagnosisPageWidth, state.diagnosisQueue.length, state.isDiagnosing]);

  const diagnosisPages = useMemo<DiagnosisPage[]>(() => {
    if (!state.isDiagnosing) {
      return [];
    }

    return state.diagnosisQueue
      .map((answerIndex) => {
        const answer = state.answers[answerIndex];
        const problem = answer ? problemById.get(answer.problemId) : undefined;
        if (!answer || !problem) {
          return null;
        }

        const workspace =
          diagnosisWorkspaces[answerIndex] ?? createInitialDiagnosisWorkspace(answerIndex, problem);
        const methods = buildMethodOptions(problem);

        return {
          answerIndex,
          problem,
          workspace,
          methods,
          suggestedMethods: buildSuggestedMethods(workspace.routerResult, methods),
        };
      })
      .filter((page): page is DiagnosisPage => Boolean(page));
  }, [diagnosisWorkspaces, state.answers, state.diagnosisQueue, state.isDiagnosing]);

  useEffect(() => {
    activeDiagnosisAnswerIndexRef.current =
      diagnosisPages[activeDiagnosisPageIndex]?.answerIndex ?? null;
  }, [activeDiagnosisPageIndex, diagnosisPages]);

  const hasStoredDiagnosisOffset = (answerIndex: number) =>
    Object.prototype.hasOwnProperty.call(diagnosisScrollOffsetsRef.current, answerIndex);

  const shouldRestoreDiagnosisOffset = (answerIndex: number) =>
    diagnosisHasInteractedRef.current[answerIndex] === true &&
    hasStoredDiagnosisOffset(answerIndex);

  const setDiagnosisInteracted = (answerIndex: number) => {
    diagnosisHasInteractedRef.current[answerIndex] = true;
  };

  const requestDiagnosisAutoScroll = (answerIndex: number) => {
    if (activeDiagnosisAnswerIndexRef.current !== answerIndex) {
      return;
    }

    diagnosisPendingAutoScrollRef.current[answerIndex] = true;
  };

  const requestDiagnosisRestore = (answerIndex: number) => {
    if (shouldRestoreDiagnosisOffset(answerIndex)) {
      diagnosisPendingRestoreRef.current[answerIndex] = true;
      return;
    }

    delete diagnosisPendingRestoreRef.current[answerIndex];
  };

  const createChatEntryId = (answerIndex: number, prefix: string) => {
    diagnosisEntrySequence.current[answerIndex] =
      (diagnosisEntrySequence.current[answerIndex] ?? 3) + 1;
    return `${answerIndex}-${prefix}-${diagnosisEntrySequence.current[answerIndex]}`;
  };

  const createBubbleEntry = (
    answerIndex: number,
    role: 'assistant' | 'user',
    text: string,
    tone: 'neutral' | 'positive' | 'warning' | 'info' = 'neutral',
  ): DiagnosisConversationEntry => ({
    id: createChatEntryId(answerIndex, role),
    kind: 'bubble',
    role,
    text,
    tone,
  });

  const createNodeEntry = (
    answerIndex: number,
    methodId: SolveMethodId,
    methodOptionsForProblem: DiagnosisMethodCardOption[],
    node: DiagnosisFlowNode,
    interactive: boolean,
  ): DiagnosisConversationEntry => ({
    id: createChatEntryId(answerIndex, node.id),
    kind: 'node',
    methodLabel: getMethodLabel(methodId, methodOptionsForProblem),
    node,
    interactive,
  });

  const updateWorkspace = (
    answerIndex: number,
    updater: (workspace: DiagnosisWorkspace) => DiagnosisWorkspace,
  ) => {
    setDiagnosisWorkspaces((prev) => {
      const current = prev[answerIndex];
      if (!current) {
        return prev;
      }

      const nextWorkspace = updater(current);
      if (nextWorkspace === current) {
        return prev;
      }

      return {
        ...prev,
        [answerIndex]: nextWorkspace,
      };
    });
  };

  const scrollToDiagnosisPage = (pageIndex: number, animated = true) => {
    if (pageIndex < 0 || pageIndex >= diagnosisPages.length) {
      return;
    }

    const targetAnswerIndex = diagnosisPages[pageIndex]?.answerIndex;
    if (targetAnswerIndex !== undefined) {
      requestDiagnosisRestore(targetAnswerIndex);
    }

    setActiveDiagnosisPageIndex(pageIndex);
    diagnosisPagerRef.current?.scrollToIndex({
      index: pageIndex,
      animated,
    });
  };

  const handleDiagnosisMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextPageIndex = Math.round(event.nativeEvent.contentOffset.x / diagnosisPageWidth);
    if (nextPageIndex !== activeDiagnosisPageIndex) {
      const targetAnswerIndex = diagnosisPages[nextPageIndex]?.answerIndex;
      if (targetAnswerIndex !== undefined) {
        requestDiagnosisRestore(targetAnswerIndex);
      }
      setActiveDiagnosisPageIndex(nextPageIndex);
    }
  };

  const handleDiagnosisScrollOffsetChange = (answerIndex: number, offsetY: number) => {
    diagnosisScrollOffsetsRef.current[answerIndex] = Math.max(offsetY, 0);
  };

  const handleDiagnosisAutoScrollHandled = (answerIndex: number) => {
    delete diagnosisPendingAutoScrollRef.current[answerIndex];
  };

  const handleDiagnosisRestoreHandled = (answerIndex: number) => {
    delete diagnosisPendingRestoreRef.current[answerIndex];
  };

  const handleDiagnosisInputChange = (answerIndex: number, text: string) => {
    setDiagnosisInteracted(answerIndex);
    updateWorkspace(answerIndex, (workspace) => ({
      ...workspace,
      diagnosisInput: text,
      routerResult: null,
      analysisErrorMessage: '',
    }));
  };

  const startDiagnosisFlow = (
    answerIndex: number,
    methodId: SolveMethodId,
    methodOptionsForProblem: DiagnosisMethodCardOption[],
  ) => {
    setDiagnosisInteracted(answerIndex);
    requestDiagnosisAutoScroll(answerIndex);
    const draft = createDiagnosisFlowDraft(methodId);
    const startNode = getNode(getDiagnosisFlow(methodId), draft.currentNodeId);
    const methodLabel = getMethodLabel(methodId, methodOptionsForProblem);

    updateWorkspace(answerIndex, (workspace) => ({
      ...workspace,
      status: 'in_progress',
      methodId,
      flowDraft: draft,
      analysisErrorMessage: '',
      chatEntries: [
        ...freezeConversationEntries(workspace.chatEntries),
        createBubbleEntry(answerIndex, 'user', getMethodSelectionText(methodId, methodLabel)),
        createNodeEntry(answerIndex, methodId, methodOptionsForProblem, startNode, true),
      ],
    }));
  };

  const appendNextNode = (
    answerIndex: number,
    methodOptionsForProblem: DiagnosisMethodCardOption[],
    draft: DiagnosisFlowDraft,
    userText: string,
    feedback?: {
      text: string;
      tone?: 'neutral' | 'positive' | 'warning';
    },
  ) => {
    setDiagnosisInteracted(answerIndex);
    requestDiagnosisAutoScroll(answerIndex);
    const nextNode = getNode(getDiagnosisFlow(draft.methodId), draft.currentNodeId);

    updateWorkspace(answerIndex, (workspace) => ({
      ...workspace,
      status: 'in_progress',
      flowDraft: draft,
      chatEntries: [
        ...freezeConversationEntries(workspace.chatEntries),
        createBubbleEntry(answerIndex, 'user', userText),
        ...(feedback
          ? [createBubbleEntry(answerIndex, 'assistant', feedback.text, feedback.tone)]
          : []),
        createNodeEntry(answerIndex, draft.methodId, methodOptionsForProblem, nextNode, true),
      ],
    }));
  };

  const handleAnalyze = async (page: DiagnosisPage) => {
    const { answerIndex, problem, methods, workspace } = page;

    if (!workspace.diagnosisInput.trim() || workspace.status === 'completed') {
      return;
    }

    if (isAnalyzingRef.current[answerIndex]) {
      return;
    }

    isAnalyzingRef.current[answerIndex] = true;
    updateWorkspace(answerIndex, (current) => ({
      ...current,
      isAnalyzing: true,
      analysisErrorMessage: '',
    }));

    try {
      const result = await analyzeDiagnosisMethod({
        problemId: problem.id,
        rawText: workspace.diagnosisInput,
        allowedMethodIds: methods.map((method) => method.id),
        allowedMethods: methods.map((method) => ({
          id: method.id,
          labelKo: method.labelKo,
          summary: method.summary ?? method.labelKo,
          exampleUtterances: method.exampleUtterances ?? [],
        })),
      });

      if (!isMountedRef.current) {
        return;
      }

      requestDiagnosisAutoScroll(answerIndex);
      updateWorkspace(answerIndex, (current) => ({
        ...current,
        routerResult: result,
        isAnalyzing: false,
        analysisErrorMessage: '',
      }));
    } catch (error) {
      console.error('diagnosis method analysis failed', error);
      if (!isMountedRef.current) {
        return;
      }
      requestDiagnosisAutoScroll(answerIndex);
      updateWorkspace(answerIndex, (current) => ({
        ...current,
        routerResult: null,
        isAnalyzing: false,
        analysisErrorMessage:
          '지금은 추천을 불러오지 못했어요. 위 선택지에서 고르거나 잠시 후 다시 시도해주세요.',
      }));
    } finally {
      isAnalyzingRef.current[answerIndex] = false;
    }
  };

  const handleConfirmPredicted = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    if (!workspace.routerResult || workspace.status === 'completed') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    confirmDiagnosisMethod(answerIndex, {
      ...workspace.routerResult,
      rawText: workspace.diagnosisInput,
      finalMethodId: workspace.routerResult.predictedMethodId,
      finalMethodSource: 'router',
    });

    startDiagnosisFlow(answerIndex, workspace.routerResult.predictedMethodId, methods);
  };

  const handleManualSelect = (page: DiagnosisPage, methodId: SolveMethodId) => {
    const { answerIndex, methods, workspace } = page;
    if (workspace.status === 'completed') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    const trace = workspace.routerResult
      ? {
          ...workspace.routerResult,
          rawText: workspace.diagnosisInput,
          finalMethodId: methodId,
          finalMethodSource: 'manual' as const,
        }
      : {
          rawText: workspace.diagnosisInput,
          predictedMethodId: 'unknown' as SolveMethodId,
          confidence: 0,
          reason: 'Manual selection',
          source: 'manual-selection' as const,
          needsManualSelection: true,
          candidateMethodIds: methods.map((method) => method.id),
          finalMethodId: methodId,
          finalMethodSource: 'manual' as const,
        };

    confirmDiagnosisMethod(answerIndex, trace);
    startDiagnosisFlow(answerIndex, methodId, methods);
  };

  const handleFlowChoice = (page: DiagnosisPage, optionId: string) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'choice') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    const option = activeNode.options.find((item) => item.id === optionId);
    if (!option) {
      return;
    }

    appendNextNode(
      answerIndex,
      methods,
      advanceFromChoice(workspace.flowDraft, optionId),
      option.text,
    );
  };

  const handleExplainContinue = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'explain') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    appendNextNode(
      answerIndex,
      methods,
      advanceFromExplain(workspace.flowDraft, 'continue'),
      activeNode.primaryLabel,
    );
  };

  const handleExplainDontKnow = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'explain') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    const nextDraft = advanceFromExplain(workspace.flowDraft, 'dont_know');
    const nextNode = getNode(getDiagnosisFlow(nextDraft.methodId), nextDraft.currentNodeId);

    appendNextNode(answerIndex, methods, nextDraft, activeNode.secondaryLabel, {
      text:
        nextNode.kind === 'final'
          ? '괜찮아요. 지금은 기초부터 정리하는 쪽이 더 좋아 보여요.'
          : '괜찮아요. 더 쉬운 설명으로 다시 이어갈게요.',
      tone: 'neutral',
    });
  };

  const handleCheckPress = (page: DiagnosisPage, optionId: string) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'check') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    const option = activeNode.options.find((item) => item.id === optionId);
    if (!option) {
      return;
    }

    const nextDraft = advanceFromCheck(workspace.flowDraft, optionId);
    const nextNode = getNode(getDiagnosisFlow(nextDraft.methodId), nextDraft.currentNodeId);

    appendNextNode(answerIndex, methods, nextDraft, option.text, {
      text: option.isCorrect
        ? nextNode.kind === 'final'
          ? '좋아요. 지금까지의 흐름을 바탕으로 약점을 정리해볼게요.'
          : '좋아요. 다음 단계로 이어갈게요.'
        : nextNode.kind === 'final'
          ? '이 지점이 현재 가장 큰 약점으로 보여요. 우선 여기부터 잡아볼게요.'
          : '이 부분이 아직 흔들리고 있어요. 더 쉽게 다시 짚어볼게요.',
      tone: option.isCorrect ? 'positive' : 'warning',
    });
  };

  const handleCheckDontKnow = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'check') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    const nextDraft = advanceFromCheck(workspace.flowDraft);
    const nextNode = getNode(getDiagnosisFlow(nextDraft.methodId), nextDraft.currentNodeId);

    appendNextNode(answerIndex, methods, nextDraft, '모르겠습니다', {
      text:
        nextNode.kind === 'final'
          ? '괜찮아요. 지금은 기초부터 다시 다지는 편이 좋아 보여요.'
          : '괜찮아요. 더 쉬운 설명으로 다시 볼게요.',
      tone: 'neutral',
    });
  };

  const handleFinalizeDiagnosis = (page: DiagnosisPage) => {
    const { answerIndex, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'final') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    requestDiagnosisAutoScroll(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    submitDiagnosisWeakness(
      answerIndex,
      activeNode.weaknessId,
      buildDiagnosisDetailTrace(workspace.flowDraft, activeNode.weaknessId),
    );

    updateWorkspace(answerIndex, (current) => ({
      ...current,
      status: 'completed',
      chatEntries: [
        ...freezeConversationEntries(current.chatEntries),
        createBubbleEntry(answerIndex, 'user', activeNode.ctaLabel),
        createBubbleEntry(answerIndex, 'assistant', '이 문제는 분석을 마쳤어요.', 'positive'),
      ],
    }));
  };

  const handleExitDiagnosis = () => {
    setIsExitModalVisible(false);
    finishDiagnosis();
  };

  const handleSubmit = () => {
    if (!currentProblem || selectedIndex === null) {
      return;
    }

    submitAnswer(
      currentProblem.id,
      selectedIndex,
      selectedIndex === currentProblem.answerIndex,
    );
  };

  if (!currentProblem && !state.result && !state.isDiagnosing) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingBody}>
          <Text selectable style={styles.loadingText}>
            결과를 계산 중입니다...
          </Text>
        </View>
      </View>
    );
  }

  if (state.isDiagnosing) {
    const totalDiagnosisPages = diagnosisPages.length;
    const diagnosisStepLabel = getDiagnosisStepLabel(activeDiagnosisPageIndex);
    const isCompactNavigator = totalDiagnosisPages > 5;

    return (
      <View style={[styles.screen, styles.diagnosisScreen]}>
        <BrandHeader />
        <View style={styles.diagnosisShell}>
          <View pointerEvents="none" style={styles.diagnosisBackdrop}>
            <View style={styles.diagnosisBackdropGlow} />
            <View style={styles.diagnosisBackdropBand} />
          </View>

          <View style={styles.diagnosisSessionBar}>
            <View style={styles.diagnosisHeader}>
              <Pressable
                style={styles.closeButton}
                onPress={() => setIsExitModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="오답 분석 닫기">
                <IconSymbol name="xmark" size={18} color={DiagnosisTheme.ink} />
              </Pressable>
              <View style={styles.diagnosisHeaderCopy}>
                <Text selectable style={styles.diagnosisHeaderTitle}>
                  오답 약점 분석
                </Text>
                <Text selectable style={styles.diagnosisHeaderMeta}>
                  {diagnosisStepLabel}
                </Text>
              </View>
              <View style={styles.closeSpacer} />
            </View>

            <View style={styles.navigatorRow}>
              <View style={styles.navigatorDots}>
                <View accessible accessibilityRole="tablist" style={styles.navigatorDotsList}>
                  {diagnosisPages.map((page, pageIndex) => {
                    const isActive = pageIndex === activeDiagnosisPageIndex;
                    const isCompleted = page.workspace.status === 'completed';

                    return (
                      <Pressable
                        key={`diagnosis-page-${page.answerIndex}`}
                        style={styles.navigatorDotHitArea}
                        onPress={() => scrollToDiagnosisPage(pageIndex)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${getDiagnosisStepLabel(pageIndex)}로 이동`}
                        accessibilityHint={
                          isCompleted
                            ? '이 문제의 분석은 완료되었습니다'
                            : '이 문제의 분석은 아직 진행 중입니다'
                        }>
                        <View
                          style={[
                            styles.navigatorDot,
                            isCompactNavigator ? styles.navigatorDotCompact : styles.navigatorDotRegular,
                            isCompleted ? styles.navigatorDotCompleted : styles.navigatorDotUpcoming,
                            isActive && styles.navigatorDotActive,
                            isActive && isCompactNavigator && styles.navigatorDotActiveCompact,
                            isActive && !isCompactNavigator && styles.navigatorDotActiveRegular,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <FlatList
            ref={diagnosisPagerRef}
            data={diagnosisPages}
            horizontal
            pagingEnabled
            bounces={false}
            directionalLockEnabled
            decelerationRate="fast"
            keyExtractor={(page) => String(page.answerIndex)}
            renderItem={({ item, index }) => (
              <DiagnosisConversationPage
                answerIndex={item.answerIndex}
                width={diagnosisPageWidth}
                isActive={index === activeDiagnosisPageIndex}
                status={item.workspace.status}
                chatEntries={item.workspace.chatEntries}
                methods={item.methods}
                diagnosisInput={item.workspace.diagnosisInput}
                routerResult={item.workspace.routerResult}
                suggestedMethods={item.suggestedMethods}
                analysisErrorMessage={item.workspace.analysisErrorMessage}
                isAnalyzing={item.workspace.isAnalyzing}
                restoreOffset={
                  hasStoredDiagnosisOffset(item.answerIndex)
                    ? diagnosisScrollOffsetsRef.current[item.answerIndex]
                    : undefined
                }
                shouldRestoreScroll={Boolean(
                  diagnosisPendingRestoreRef.current[item.answerIndex],
                )}
                shouldAutoScrollToEnd={Boolean(
                  diagnosisPendingAutoScrollRef.current[item.answerIndex],
                )}
                onInputChange={(text) => handleDiagnosisInputChange(item.answerIndex, text)}
                onAnalyze={() => handleAnalyze(item)}
                onManualSelect={(methodId) => handleManualSelect(item, methodId)}
                onConfirmPredicted={() => handleConfirmPredicted(item)}
                onChoicePress={(optionId) => handleFlowChoice(item, optionId)}
                onExplainContinue={() => handleExplainContinue(item)}
                onExplainDontKnow={() => handleExplainDontKnow(item)}
                onCheckPress={(optionId) => handleCheckPress(item, optionId)}
                onCheckDontKnow={() => handleCheckDontKnow(item)}
                onFinalConfirm={() => handleFinalizeDiagnosis(item)}
                onScrollOffsetChange={handleDiagnosisScrollOffsetChange}
                onAutoScrollHandled={handleDiagnosisAutoScrollHandled}
                onRestoreHandled={handleDiagnosisRestoreHandled}
              />
            )}
            style={styles.diagnosisPager}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="on-drag"
            showsHorizontalScrollIndicator={false}
            scrollEnabled={diagnosisPages.length > 1}
            getItemLayout={(_, index) => ({
              length: diagnosisPageWidth,
              offset: diagnosisPageWidth * index,
              index,
            })}
            onMomentumScrollEnd={handleDiagnosisMomentumEnd}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                diagnosisPagerRef.current?.scrollToOffset({
                  offset: diagnosisPageWidth * index,
                  animated: false,
                });
              }, 120);
            }}
          />
        </View>

        <DiagnosisExitConfirmModal
          visible={isExitModalVisible}
          onContinue={() => setIsExitModalVisible(false)}
          onExit={handleExitDiagnosis}
        />
      </View>
    );
  }

  if (!currentProblem) {
    return null;
  }

  const stepTitle = `${state.currentQuestionIndex + 1} / ${problemData.length}`;
  const progressRatio = (state.currentQuestionIndex + 1) / problemData.length;
  const progressPercent = `${Math.max(progressRatio * 100, 8)}%` as `${number}%`;

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        {!state.hasStarted ? (
          <View style={styles.introCard}>
            <Text selectable style={styles.introEyebrow}>
              진단 시작 전
            </Text>
            <Text selectable style={styles.introTitle}>
              10문제 약점 진단
            </Text>
            <Text selectable style={styles.introBody}>
              짧은 10문항으로 자주 흔들리는 단원을 찾고, 결과에서 바로 약점 연습으로 이어집니다.
            </Text>
            <View style={styles.introMetaRow}>
              <View style={styles.introMetaChip}>
                <Text selectable style={styles.introMetaText}>
                  10문항
                </Text>
              </View>
              <View style={styles.introMetaChip}>
                <Text selectable style={styles.introMetaText}>
                  약 3분
                </Text>
              </View>
            </View>
            <BrandButton title="진단 시작하기" onPress={startSession} />
          </View>
        ) : (
          <View style={styles.surfaceCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPercent }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text selectable style={styles.progressLabel}>
                  진행률
                </Text>
                <Text selectable style={styles.progress}>
                  {stepTitle}
                </Text>
              </View>
            </View>
            <View style={styles.topicRow}>
              <Text selectable style={styles.topicChip}>
                {currentProblem.topic}
              </Text>
            </View>
            <ProblemStatement question={currentProblem.question} />

            <View style={styles.choicesContainer}>
              {currentProblem.choices.map((choice, index) => {
                const isSelected = selectedIndex === index;

                return (
                  <Pressable
                    key={`${currentProblem.id}_${index}`}
                    style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                    onPress={() => setSelectedIndex(index)}>
                    <MathText
                      text={choice}
                      style={[styles.choiceText, isSelected && styles.choiceTextSelected]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.submitContainer}>
              <BrandButton
                title="답 제출하기"
                onPress={handleSubmit}
                disabled={selectedIndex === null}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  diagnosisScreen: {
    backgroundColor: DiagnosisTheme.canvas,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.lg,
  },
  loadingText: {
    marginTop: BrandSpacing.lg,
    textAlign: 'center',
    color: BrandColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  diagnosisShell: {
    flex: 1,
    overflow: 'hidden',
    paddingTop: BrandSpacing.sm,
    backgroundColor: DiagnosisTheme.canvas,
  },
  diagnosisBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  diagnosisBackdropGlow: {
    position: 'absolute',
    top: -54,
    left: 20,
    right: 20,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#EEE6D7',
    opacity: 0.7,
  },
  diagnosisBackdropBand: {
    position: 'absolute',
    top: 94,
    left: -40,
    right: -40,
    height: 140,
    borderRadius: 999,
    backgroundColor: '#FAF6EF',
    opacity: 0.9,
  },
  diagnosisSessionBar: {
    marginHorizontal: BrandSpacing.lg,
    paddingHorizontal: BrandSpacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    boxShadow: '0 10px 24px rgba(36, 50, 41, 0.06)',
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BrandSpacing.sm,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
  },
  diagnosisHeaderCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  diagnosisHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  diagnosisHeaderMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: DiagnosisTheme.inkMuted,
    letterSpacing: 0.2,
  },
  closeSpacer: {
    width: 42,
    height: 42,
  },
  navigatorRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  navigatorDots: {
    alignSelf: 'stretch',
  },
  navigatorDotsList: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  navigatorDotHitArea: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigatorDot: {
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  navigatorDotRegular: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  navigatorDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  navigatorDotActive: {
    backgroundColor: DiagnosisTheme.userBubble,
    borderColor: DiagnosisTheme.userBubble,
  },
  navigatorDotActiveRegular: {
    width: 24,
    height: 10,
    borderRadius: 999,
  },
  navigatorDotActiveCompact: {
    width: 20,
    height: 8,
    borderRadius: 999,
  },
  navigatorDotCompleted: {
    backgroundColor: '#73896E',
    borderColor: '#73896E',
  },
  navigatorDotUpcoming: {
    backgroundColor: 'transparent',
    borderColor: '#B4BCAF',
  },
  diagnosisPager: {
    flex: 1,
    marginTop: 6,
  },
  surfaceCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  introCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  introEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primarySoft,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.text,
  },
  introBody: {
    fontSize: 16,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  introMetaRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  introMetaChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#F7FAF6',
  },
  introMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.text,
    fontVariant: ['tabular-nums'],
  },
  progressHeader: {
    gap: BrandSpacing.xs,
    marginBottom: BrandSpacing.xs,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E3ECE2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primary,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.mutedText,
  },
  progress: {
    fontSize: 14,
    color: BrandColors.primarySoft,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topicRow: {
    marginTop: 2,
    marginBottom: BrandSpacing.xs,
  },
  topicChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF5EC',
    color: BrandColors.primarySoft,
    fontSize: 12,
    fontWeight: '700',
  },
  choicesContainer: {
    marginTop: BrandSpacing.sm,
    gap: BrandSpacing.sm,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  choiceButtonSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  choiceText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 24,
  },
  choiceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitContainer: {
    marginTop: BrandSpacing.md,
  },
});
