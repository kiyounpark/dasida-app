import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import type { SolveMethodId } from '@/data/diagnosisTree';
import { problemData, type Problem } from '@/data/problemData';
import {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  buildDiagnosisDetailTrace,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
import {
  buildDiagnosisAnalysisText,
  findNextIncompleteDiagnosisPageIndex,
  freezeConversationEntries,
  getActiveFlowNode,
  getDiagnosisStepLabel,
  type DiagnosisPage,
} from '@/features/quiz/hooks/diagnostic-screen-helpers';
import { useDiagnosisAiHelp } from '@/features/quiz/hooks/use-diagnosis-ai-help';
import { useDiagnosisPager } from '@/features/quiz/hooks/use-diagnosis-pager';
import { useDiagnosisWorkspaces } from '@/features/quiz/hooks/use-diagnosis-workspaces';
import { useQuizSession } from '@/features/quiz/session';

type UseDiagnosticScreenParams = {
  shouldAutoStart: boolean;
  shouldResetOnMount: boolean;
};

export type DiagnosticQuizStageModel = {
  problem: Problem;
  currentQuestionNumber: number;
  questionCount: number;
  stepLabel: string;
  progressPercent: `${number}%`;
  selectedIndex: number | null;
  canGoPrevious: boolean;
  isNextDisabled: boolean;
  isExitModalVisible: boolean;
  onSelectChoice: (index: number) => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onOpenExitModal: () => void;
  onCloseExitModal: () => void;
  onConfirmExit: () => void;
};

export type UseDiagnosticScreenResult = {
  activeDiagnosisPageIndex: number;
  diagnosisPageWidth: number;
  diagnosisPages: DiagnosisPage[];
  diagnosisPagerRef: ReturnType<typeof useDiagnosisPager>['diagnosisPagerRef'];
  diagnosisPendingAutoScrollRef: ReturnType<typeof useDiagnosisPager>['diagnosisPendingAutoScrollRef'];
  diagnosisPendingRestoreRef: ReturnType<typeof useDiagnosisPager>['diagnosisPendingRestoreRef'];
  diagnosisScrollOffsetsRef: ReturnType<typeof useDiagnosisPager>['diagnosisScrollOffsetsRef'];
  diagnosisStepLabel: string;
  handleDiagnosisAutoScrollHandled: ReturnType<typeof useDiagnosisPager>['handleDiagnosisAutoScrollHandled'];
  handleDiagnosisMomentumEnd: ReturnType<typeof useDiagnosisPager>['handleDiagnosisMomentumEnd'];
  handleDiagnosisRestoreHandled: ReturnType<typeof useDiagnosisPager>['handleDiagnosisRestoreHandled'];
  handleDiagnosisScrollOffsetChange: ReturnType<typeof useDiagnosisPager>['handleDiagnosisScrollOffsetChange'];
  hasSeenDiagnosisIntro: boolean;
  hasStarted: boolean;
  hasStoredDiagnosisOffset: ReturnType<typeof useDiagnosisPager>['hasStoredDiagnosisOffset'];
  isCompactNavigator: boolean;
  isDiagnosing: boolean;
  isExitModalVisible: boolean;
  isLoadingState: boolean;
  quizStage: DiagnosticQuizStageModel | null;
  onAiHelpContinue: (page: DiagnosisPage) => void;
  onAiHelpFallback: (page: DiagnosisPage) => void;
  onAiHelpInputChange: (answerIndex: number, text: string) => void;
  onAiHelpSubmit: (page: DiagnosisPage) => Promise<void>;
  onAnalyzePage: (page: DiagnosisPage) => Promise<void>;
  onCheckDontKnow: (page: DiagnosisPage) => void;
  onCheckPress: (page: DiagnosisPage, optionId: string) => void;
  onChoicePress: (page: DiagnosisPage, optionId: string) => void;
  onCloseExitModal: () => void;
  onConfirmPredicted: (page: DiagnosisPage) => void;
  onExplainContinue: (page: DiagnosisPage) => void;
  onExplainDontKnow: (page: DiagnosisPage) => void;
  onExitDiagnosis: () => void;
  onFinalConfirm: (page: DiagnosisPage) => void;
  onInputChange: (answerIndex: number, text: string) => void;
  onManualSelect: (page: DiagnosisPage, methodId: SolveMethodId) => void;
  onOpenExitModal: () => void;
  onScrollToDiagnosisPage: (pageIndex: number) => void;
  onScrollToIndexFailed: (index: number) => void;
  onStartDiagnosisIntro: () => void;
  onStartSession: () => void;
};

export function useDiagnosticScreen({
  shouldAutoStart,
  shouldResetOnMount,
}: UseDiagnosticScreenParams): UseDiagnosticScreenResult {
  const {
    state,
    resetSession,
    startSession,
    goToPreviousQuestion,
    submitAnswer,
    confirmDiagnosisMethod,
    submitDiagnosisWeakness,
    finishDiagnosis,
  } = useQuizSession();
  const { width: windowWidth } = useWindowDimensions();
  const diagnosisPageWidth = Math.max(windowWidth, 1);
  const isMountedRef = useRef(true);
  const hasRequestedResetRef = useRef(false);
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const [isSolveExitModalVisible, setIsSolveExitModalVisible] = useState(false);
  const [isPreparingFreshSession, setIsPreparingFreshSession] = useState(shouldResetOnMount);
  const [hasSeenDiagnosisIntro, setHasSeenDiagnosisIntro] = useState(false);

  useEffect(() => {
    if (!state.hasStarted) {
      setHasSeenDiagnosisIntro(false);
    }
  }, [state.hasStarted]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldResetOnMount || hasRequestedResetRef.current) {
      return;
    }

    hasRequestedResetRef.current = true;
    resetSession();
  }, [resetSession, shouldResetOnMount]);

  useEffect(() => {
    if (!isPreparingFreshSession) {
      return;
    }

    const isFreshSessionState =
      !state.hasStarted &&
      !state.result &&
      !state.isDiagnosing &&
      state.currentQuestionIndex === 0 &&
      state.answers.length === 0;

    if (isFreshSessionState) {
      setIsPreparingFreshSession(false);
    }
  }, [
    isPreparingFreshSession,
    state.answers.length,
    state.currentQuestionIndex,
    state.hasStarted,
    state.isDiagnosing,
    state.result,
  ]);

  useEffect(() => {
    if (isPreparingFreshSession) {
      return;
    }

    if (state.result) {
      router.replace('/quiz/result');
    }
  }, [isPreparingFreshSession, state.result]);

  useEffect(() => {
    if (isPreparingFreshSession) {
      return;
    }

    if (shouldAutoStart && !state.hasStarted) {
      startSession();
    }
  }, [isPreparingFreshSession, shouldAutoStart, startSession, state.hasStarted]);

  const {
    appendNextNode,
    createAiHelpActionsEntry,
    createAiHelpEntry,
    createBubbleEntry,
    createNodeEntry,
    currentProblem,
    diagnosisPages,
    handleAnalyze,
    handleDiagnosisInputChange: handleDiagnosisInputChangeBase,
    removeAiHelpComposerEntries,
    selectedIndex,
    setSelectedIndex,
    startDiagnosisFlow,
    updateWorkspace,
  } = useDiagnosisWorkspaces({
    isMountedRef,
    state,
  });

  const {
    activeDiagnosisPageIndex,
    diagnosisPagerRef,
    diagnosisPendingAutoScrollRef,
    diagnosisPendingRestoreRef,
    diagnosisScrollOffsetsRef,
    handleDiagnosisAutoScrollHandled,
    handleDiagnosisMomentumEnd,
    handleDiagnosisRestoreHandled,
    handleDiagnosisScrollOffsetChange,
    hasStoredDiagnosisOffset,
    requestDiagnosisAutoScroll,
    scrollToDiagnosisPage,
    setDiagnosisInteracted,
  } = useDiagnosisPager({
    diagnosisPageWidth,
    diagnosisPages,
    isDiagnosing: state.isDiagnosing,
  });

  const {
    handleAiHelpContinue,
    handleAiHelpFallback,
    handleAiHelpInputChange,
    handleSubmitAiHelp,
    openAiHelpComposer,
  } = useDiagnosisAiHelp({
    appendNextNode: (answerIndex, methods, draft, userText, feedback) => {
      setDiagnosisInteracted(answerIndex);
      requestDiagnosisAutoScroll(answerIndex);
      appendNextNode(answerIndex, methods, draft, userText, feedback);
    },
    createAiHelpActionsEntry,
    createAiHelpEntry,
    createBubbleEntry,
    createNodeEntry,
    isMountedRef,
    removeAiHelpComposerEntries,
    requestDiagnosisAutoScroll,
    setDiagnosisInteracted,
    updateWorkspace,
  });

  const onInputChange = (answerIndex: number, text: string) => {
    setDiagnosisInteracted(answerIndex);
    handleDiagnosisInputChangeBase(answerIndex, text);
  };

  const onAnalyzePage = async (page: DiagnosisPage) => {
    setDiagnosisInteracted(page.answerIndex);
    await handleAnalyze(page);
  };

  const onConfirmPredicted = (page: DiagnosisPage) => {
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
      rawText: buildDiagnosisAnalysisText(workspace),
      finalMethodId: workspace.routerResult.predictedMethodId,
      finalMethodSource: 'router',
    });

    requestDiagnosisAutoScroll(answerIndex);
    startDiagnosisFlow(answerIndex, workspace.routerResult.predictedMethodId, methods);
  };

  const onManualSelect = (page: DiagnosisPage, methodId: SolveMethodId) => {
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
          rawText: buildDiagnosisAnalysisText(workspace),
          finalMethodId: methodId,
          finalMethodSource: 'manual' as const,
        }
      : {
          candidateMethodIds: methods.map((method) => method.id),
          confidence: 0,
          finalMethodId: methodId,
          finalMethodSource: 'manual' as const,
          needsManualSelection: true,
          predictedMethodId: 'unknown' as SolveMethodId,
          rawText: buildDiagnosisAnalysisText(workspace),
          reason: 'Manual selection',
          source: 'manual-selection' as const,
        };

    confirmDiagnosisMethod(answerIndex, trace);
    requestDiagnosisAutoScroll(answerIndex);
    startDiagnosisFlow(answerIndex, methodId, methods);
  };

  const onChoicePress = (page: DiagnosisPage, optionId: string) => {
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

    requestDiagnosisAutoScroll(answerIndex);
    appendNextNode(
      answerIndex,
      methods,
      advanceFromChoice(workspace.flowDraft, optionId),
      option.text,
    );
  };

  const onExplainContinue = (page: DiagnosisPage) => {
    const { answerIndex, methods, workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'explain') {
      return;
    }

    setDiagnosisInteracted(answerIndex);
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }

    requestDiagnosisAutoScroll(answerIndex);
    appendNextNode(
      answerIndex,
      methods,
      advanceFromExplain(workspace.flowDraft, 'continue'),
      activeNode.primaryLabel,
    );
  };

  const onExplainDontKnow = (page: DiagnosisPage) => {
    const { workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'explain') {
      return;
    }

    openAiHelpComposer(page, 'explain');
  };

  const onCheckPress = (page: DiagnosisPage, optionId: string) => {
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

    requestDiagnosisAutoScroll(answerIndex);
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

  const onCheckDontKnow = (page: DiagnosisPage) => {
    const { workspace } = page;
    const activeNode = getActiveFlowNode(workspace);
    if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'check') {
      return;
    }

    openAiHelpComposer(page, 'check');
  };

  const onFinalConfirm = (page: DiagnosisPage) => {
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

    const currentPageIndex = diagnosisPages.findIndex(
      (diagnosisPage) => diagnosisPage.answerIndex === answerIndex,
    );
    const nextPageIndex =
      currentPageIndex === -1
        ? null
        : findNextIncompleteDiagnosisPageIndex(diagnosisPages, currentPageIndex);

    submitDiagnosisWeakness(
      answerIndex,
      activeNode.weaknessId,
      buildDiagnosisDetailTrace(workspace.flowDraft, activeNode.weaknessId),
    );

    updateWorkspace(answerIndex, (current) => ({
      ...current,
      aiHelpState: null,
      chatEntries: [
        ...freezeConversationEntries(current.chatEntries),
        createBubbleEntry(answerIndex, 'user', activeNode.ctaLabel),
        createBubbleEntry(answerIndex, 'assistant', '이 문제는 분석을 마쳤어요.', 'positive'),
      ],
      status: 'completed',
    }));

    if (nextPageIndex !== null) {
      requestAnimationFrame(() => {
        if (!isMountedRef.current) {
          return;
        }

        scrollToDiagnosisPage(nextPageIndex);
      });
    }
  };

  const onExitDiagnosis = () => {
    setIsExitModalVisible(false);
    finishDiagnosis();
  };

  const onQuestionSubmit = () => {
    if (!currentProblem || selectedIndex === null) {
      return;
    }

    submitAnswer(
      currentProblem.id,
      selectedIndex,
      selectedIndex === currentProblem.answerIndex,
    );
  };

  const currentQuestionNumber = Math.min(state.currentQuestionIndex + 1, problemData.length);
  const questionCount = problemData.length;
  const progressRatio = currentQuestionNumber / questionCount;
  const progressPercent = `${progressRatio * 100}%` as `${number}%`;
  const stepLabel = `${String(currentQuestionNumber).padStart(2, '0')} / ${String(questionCount).padStart(2, '0')}`;

  const quizStage =
    state.hasStarted && !state.isDiagnosing && currentProblem
      ? {
          problem: currentProblem,
          currentQuestionNumber,
          questionCount,
          stepLabel,
          progressPercent,
          selectedIndex,
          canGoPrevious: state.currentQuestionIndex > 0,
          isNextDisabled: selectedIndex === null,
          isExitModalVisible: isSolveExitModalVisible,
          onSelectChoice: (index: number) => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.selectionAsync();
            }
            setSelectedIndex(index);
          },
          onPreviousQuestion: () => {
            if (state.currentQuestionIndex <= 0) {
              return;
            }

            if (process.env.EXPO_OS === 'ios') {
              Haptics.selectionAsync();
            }

            goToPreviousQuestion();
          },
          onNextQuestion: onQuestionSubmit,
          onOpenExitModal: () => setIsSolveExitModalVisible(true),
          onCloseExitModal: () => setIsSolveExitModalVisible(false),
          onConfirmExit: () => {
            setIsSolveExitModalVisible(false);
            resetSession();
            router.replace('/quiz');
          },
        }
      : null;

  return {
    activeDiagnosisPageIndex,
    diagnosisPageWidth,
    diagnosisPages,
    diagnosisPagerRef,
    diagnosisPendingAutoScrollRef,
    diagnosisPendingRestoreRef,
    diagnosisScrollOffsetsRef,
    diagnosisStepLabel: getDiagnosisStepLabel(activeDiagnosisPageIndex),
    handleDiagnosisAutoScrollHandled,
    handleDiagnosisMomentumEnd,
    handleDiagnosisRestoreHandled,
    handleDiagnosisScrollOffsetChange,
    hasSeenDiagnosisIntro,
    hasStarted: state.hasStarted,
    hasStoredDiagnosisOffset,
    isCompactNavigator: diagnosisPages.length > 5,
    isDiagnosing: state.isDiagnosing,
    isExitModalVisible,
    isLoadingState: isPreparingFreshSession || (!currentProblem && !state.result && !state.isDiagnosing),
    quizStage,
    onAiHelpContinue: handleAiHelpContinue,
    onAiHelpFallback: handleAiHelpFallback,
    onAiHelpInputChange: handleAiHelpInputChange,
    onAiHelpSubmit: handleSubmitAiHelp,
    onAnalyzePage,
    onCheckDontKnow,
    onCheckPress,
    onChoicePress,
    onCloseExitModal: () => setIsExitModalVisible(false),
    onConfirmPredicted,
    onExitDiagnosis,
    onExplainContinue,
    onExplainDontKnow,
    onFinalConfirm,
    onInputChange,
    onManualSelect,
    onOpenExitModal: () => setIsExitModalVisible(true),
    onScrollToDiagnosisPage: scrollToDiagnosisPage,
    onScrollToIndexFailed: (index: number) => {
      setTimeout(() => {
        diagnosisPagerRef.current?.scrollToOffset({
          animated: false,
          offset: diagnosisPageWidth * index,
        });
      }, 120);
    },
    onStartDiagnosisIntro: () => setHasSeenDiagnosisIntro(true),
    onStartSession: startSession,
  };
}
