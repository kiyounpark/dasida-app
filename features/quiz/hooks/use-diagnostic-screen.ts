import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { useIsTablet } from '@/hooks/use-is-tablet';
import {
  hasSeenLandscapeHint,
  markLandscapeHintSeen,
} from '@/features/quiz/exam/storage/landscape-hint-store';
import {
  useDiagnosticScratchpadStore,
  type DiagnosticScratchpadStore,
} from './use-diagnostic-scratchpad-store';
import { useDiagnosticScreenOrientation } from './use-diagnostic-screen-orientation';

import type { SolveMethodId } from '@/data/diagnosisTree';
import type { Problem } from '@/data/problemData';
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
import { logDiagnosisCompleted } from '@/features/analytics/diagnosis-analytics';
import { useCurrentLearner } from '@/features/learner/provider';

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
  completedDiagnosisCount: number;
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
  onInputChange: (answerIndex: number, text: string) => void;
  onManualSelect: (page: DiagnosisPage, methodId: SolveMethodId) => void;
  onOpenExitModal: () => void;
  onScrollToDiagnosisPage: (pageIndex: number) => void;
  onScrollToIndexFailed: (index: number) => void;
  onStartSession: () => void;
  // 스크래치패드 (태블릿 + 가로일 때만 활성. 분석 단계에서는 read-only로 사용)
  scratchpadStore: DiagnosticScratchpadStore;
  isTablet: boolean;
  isPortrait: boolean;
  showLandscapeHint: boolean;
  onDismissLandscapeHint: () => void;
};

export function useDiagnosticScreen({
  shouldAutoStart,
  shouldResetOnMount,
}: UseDiagnosticScreenParams): UseDiagnosticScreenResult {
  const {
    problems,
    state,
    resetSession,
    startSession,
    goToPreviousQuestion,
    submitAnswer,
    confirmDiagnosisMethod,
    submitDiagnosisWeakness,
    finishDiagnosis,
    resumeDiagnosis,
  } = useQuizSession();
  const { profile, summary, markPendingDiagnosticStarted, clearPendingDiagnostic, setPendingDiagnosisResume, clearPendingDiagnosisResume } = useCurrentLearner();
  const { width: windowWidth, width, height } = useWindowDimensions();
  const diagnosisPageWidth = Math.max(windowWidth, 1);
  const isTablet = useIsTablet();
  const isPortrait = height >= width;

  const scratchpadStore = useDiagnosticScratchpadStore();

  // 회전 도중 휘발 stroke을 끊는다 — 활성 question의 endStroke를 호출.
  // (eslint react-hooks/exhaustive-deps는 store/state 의존을 정확히 추적하지 못하므로 의도적으로 비움)
  const handleOrientationChange = useCallback(() => {
    const idx = state.currentQuestionIndex;
    scratchpadStore.forIndex(idx).endStroke();
  }, [scratchpadStore, state.currentQuestionIndex]);

  useDiagnosticScreenOrientation({
    isTablet,
    onOrientationChange: handleOrientationChange,
  });

  // 가로 회전 안내 배너: tablet이고 portrait이고, 풀이 단계(quizStage 활성)일 때만 한 번 노출.
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  useEffect(() => {
    if (!isTablet || !isPortrait) {
      setShowLandscapeHint(false);
      return;
    }
    let cancelled = false;
    void hasSeenLandscapeHint().then((seen) => {
      if (!cancelled && !seen) setShowLandscapeHint(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isTablet, isPortrait]);

  const handleDismissLandscapeHint = useCallback(() => {
    setShowLandscapeHint(false);
    void markLandscapeHintSeen();
  }, []);

  const isMountedRef = useRef(true);
  const hasRequestedResetRef = useRef(false);
  const hasNavigatedToAnalysisRef = useRef(false);
  const hasResumedDiagnosisRef = useRef(false);
  const autoCompletedRef = useRef(new Set<number>());
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const [isSolveExitModalVisible, setIsSolveExitModalVisible] = useState(false);
  const [isPreparingFreshSession, setIsPreparingFreshSession] = useState(shouldResetOnMount);

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
    scratchpadStore.resetAll();
  }, [resetSession, shouldResetOnMount, scratchpadStore]);

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

  // isDiagnosing→false와 result→set은 finalizeQuiz()에서 단일 dispatch로 동시에 일어난다.
  // 따라서 이 effect는 결과 전환 시에는 발화하지 않으며, 세션이 완전히 비어있을 때만 ref를 초기화한다.
  useEffect(() => {
    if (!state.isDiagnosing && !state.result) {
      hasNavigatedToAnalysisRef.current = false;
      hasResumedDiagnosisRef.current = false;
      autoCompletedRef.current = new Set<number>();
    }
  }, [state.isDiagnosing, state.result]);

  useEffect(() => {
    if (isPreparingFreshSession) {
      return;
    }

    if (state.result && !hasNavigatedToAnalysisRef.current) {
      hasNavigatedToAnalysisRef.current = true;
      router.replace('/quiz/result');
    }
  }, [isPreparingFreshSession, state.result]);

  // 진단 결과가 기록되면 pending 플래그들을 순차적으로 클리어한다.
  // 순서 중요: clearPendingDiagnostic → clearPendingDiagnosisResume.
  // 역순이면 두 write 사이 window에서 isPendingDiagnosticFresh가 true로 평가되어
  // 여정 보드가 diagnostic_in_progress를 잘못 표시할 수 있다.
  // 단, 각 write는 독립적 try/catch이므로 write 1 실패 시에도 write 2가 실행된다.
  // write 1 실패 + write 2 성공의 partial failure 케이스는 위 나쁜 상태로 남을 수 있다.
  useEffect(() => {
    if (!state.result) {
      return;
    }
    void (async () => {
      try {
        await clearPendingDiagnostic();
      } catch (err) {
        console.warn('[DiagnosticScreen] clearPendingDiagnostic failed', err);
      }
      try {
        await clearPendingDiagnosisResume();
      } catch (err) {
        console.warn('[DiagnosticScreen] clearPendingDiagnosisResume failed', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);

  useEffect(() => {
    if (isPreparingFreshSession) {
      return;
    }

    if (shouldAutoStart && !state.hasStarted) {
      startSession();
    }
  }, [isPreparingFreshSession, shouldAutoStart, startSession, state.hasStarted]);

  // pendingDiagnosisResume 감지 시 세션 자동 복원
  useEffect(() => {
    if (shouldResetOnMount || state.hasStarted || state.isDiagnosing) {
      return;
    }
    const pendingResume = profile?.pendingDiagnosisResume;
    if (
      !pendingResume ||
      pendingResume.schemaVersion !== 1 ||
      pendingResume.diagnosisQueue.length === 0
    ) {
      return;
    }
    // §6.3: 이미 완료된 attemptId의 resume 상태는 복원하지 않는다.
    if (summary?.latestDiagnosticSummary?.attemptId === pendingResume.attemptId) {
      return;
    }
    hasResumedDiagnosisRef.current = true;
    resumeDiagnosis(pendingResume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.pendingDiagnosisResume]);

  // state 2 감지용 플래그. hasStarted 전환 시마다 현재 시각으로 덮어쓴다(크로스 디바이스 stale 방지).
  useEffect(() => {
    if (isPreparingFreshSession) {
      return;
    }
    if (!state.hasStarted) {
      return;
    }
    void markPendingDiagnosticStarted().catch((err) => {
      console.warn('[DiagnosticScreen] markPendingDiagnosticStarted failed', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreparingFreshSession, state.hasStarted]);

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
    problems,
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

  // 최종 노드 도달 시: "분석을 마쳤어요" 메시지를 즉시 노출하고, 3초 후에
  // 약점 디스패치 + 다음 페이지 이동을 함께 수행한다. 마지막 페이지라면 디스패치가
  // finalizeQuiz를 트리거해 result가 세팅되고 navigation effect가 즉시 /quiz/result로
  // 이동한다 (디스패치를 즉시 호출하면 isDiagnosing이 즉시 false가 되어 페이저가
  // 사라지고 3초간 흰 화면이 나타나는 문제를 방지).
  useEffect(() => {
    if (!state.isDiagnosing) return;

    for (const page of diagnosisPages) {
      const { answerIndex, workspace } = page;
      if (workspace.status === 'completed') continue;
      if (autoCompletedRef.current.has(answerIndex)) continue;

      const activeNode = getActiveFlowNode(workspace);
      if (!activeNode || activeNode.kind !== 'final') continue;

      autoCompletedRef.current.add(answerIndex);

      const weaknessId = activeNode.weaknessId;
      const detailTrace = buildDiagnosisDetailTrace(workspace.flowDraft!, weaknessId);

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

      setDiagnosisInteracted(answerIndex);
      requestDiagnosisAutoScroll(answerIndex);

      if (profile) {
        logDiagnosisCompleted({
          accountKey: profile.accountKey,
          source: 'unit',
          weaknessId,
        });
      }

      const currentPageIndex = diagnosisPages.findIndex((p) => p.answerIndex === answerIndex);
      const nextPageIndex =
        currentPageIndex === -1
          ? null
          : findNextIncompleteDiagnosisPageIndex(diagnosisPages, currentPageIndex);

      setTimeout(() => {
        if (!isMountedRef.current) return;
        submitDiagnosisWeakness(answerIndex, weaknessId, detailTrace);
        if (nextPageIndex !== null) {
          scrollToDiagnosisPage(nextPageIndex);
        }
      }, 3000);
    }
  }, [
    state.isDiagnosing,
    diagnosisPages,
    submitDiagnosisWeakness,
    updateWorkspace,
    createBubbleEntry,
    freezeConversationEntries,
    buildDiagnosisDetailTrace,
    setDiagnosisInteracted,
    requestDiagnosisAutoScroll,
    logDiagnosisCompleted,
    scrollToDiagnosisPage,
    profile,
  ]);

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

  const completedDiagnosisCount = state.isDiagnosing
    ? state.diagnosisQueue.filter((i) => Boolean(state.answers[i]?.weaknessId)).length
    : 0;

  // onExitDiagnosis은 매 렌더에서 재생성되므로 항상 최신 state와 diagnosisPages를 캡처한다.
  // 이 수정이 의존하는 속성이므로 useCallback으로 감싸지 않는다.
  const onExitDiagnosis = () => {
    setIsExitModalVisible(false);

    // 3초 타이머가 아직 안 터진 경우: workspace는 completed지만 state.answers엔 weaknessId가 없음.
    // 나가기 시점에 즉시 제출해서 finishDiagnosis가 올바른 topWeaknesses를 만들도록 한다.
    const pendingSubmitPages = state.isDiagnosing
      ? diagnosisPages.filter(
          (p) => p.workspace.status === 'completed' && !state.answers[p.answerIndex]?.weaknessId,
        )
      : [];

    let submittedNowCount = 0;
    for (const page of pendingSubmitPages) {
      const activeNode = getActiveFlowNode(page.workspace);
      // Invariant: 'completed' workspace는 항상 final 노드를 통해 도달한다.
      // 이 guard는 미래에 다른 경로로 completed가 되는 케이스에 대한 방어적 처리다.
      if (!activeNode || activeNode.kind !== 'final' || !page.workspace.flowDraft) continue;
      const weaknessId = activeNode.weaknessId;
      submitDiagnosisWeakness(
        page.answerIndex,
        weaknessId,
        buildDiagnosisDetailTrace(page.workspace.flowDraft, weaknessId),
      );
      submittedNowCount++;
    }

    const hasCompletedAnyAnalysis =
      state.isDiagnosing && (completedDiagnosisCount > 0 || submittedNowCount > 0);

    if (hasCompletedAnyAnalysis) {
      // 완료된 분석만 반영된 결과를 생성한다. 미완성 항목은 결과에서 제외되며, 이는 의도된 동작이다.
      finishDiagnosis();
      return;
    }

    if (!state.attemptId || !state.startedAt) {
      router.replace('/(tabs)/quiz');
      return;
    }
    void setPendingDiagnosisResume({
      schemaVersion: 1,
      attemptId: state.attemptId,
      startedAt: state.startedAt,
      savedAt: new Date().toISOString(),
      totalQuestions: state.totalQuestions,
      answers: state.answers,
      weaknessScores: state.weaknessScores,
      diagnosisQueue: state.diagnosisQueue,
    }).catch((err) => {
      console.warn('[DiagnosticScreen] setPendingDiagnosisResume failed', err);
    });
    router.replace('/(tabs)/quiz');
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

  const currentQuestionNumber = Math.min(state.currentQuestionIndex + 1, problems.length);
  const questionCount = state.totalQuestions;
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
    completedDiagnosisCount,
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
    onStartSession: startSession,
    scratchpadStore,
    isTablet,
    isPortrait,
    showLandscapeHint,
    onDismissLandscapeHint: handleDismissLandscapeHint,
  };
}
