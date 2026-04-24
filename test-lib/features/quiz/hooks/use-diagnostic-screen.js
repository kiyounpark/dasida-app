"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDiagnosticScreen = useDiagnosticScreen;
const Haptics = __importStar(require("expo-haptics"));
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const react_native_1 = require("react-native");
const diagnosis_flow_engine_1 = require("../../../features/quiz/diagnosis-flow-engine");
const diagnostic_screen_helpers_1 = require("../../../features/quiz/hooks/diagnostic-screen-helpers");
const use_diagnosis_ai_help_1 = require("../../../features/quiz/hooks/use-diagnosis-ai-help");
const use_diagnosis_pager_1 = require("../../../features/quiz/hooks/use-diagnosis-pager");
const use_diagnosis_workspaces_1 = require("../../../features/quiz/hooks/use-diagnosis-workspaces");
const session_1 = require("@/features/quiz/session");
const diagnosis_analytics_1 = require("../../../features/analytics/diagnosis-analytics");
const provider_1 = require("@/features/learner/provider");
function useDiagnosticScreen({ shouldAutoStart, shouldResetOnMount, }) {
    const { problems, state, resetSession, startSession, goToPreviousQuestion, submitAnswer, confirmDiagnosisMethod, submitDiagnosisWeakness, finishDiagnosis, resumeDiagnosis, } = (0, session_1.useQuizSession)();
    const { profile, summary, markPendingDiagnosticStarted, clearPendingDiagnostic, setPendingDiagnosisResume, clearPendingDiagnosisResume } = (0, provider_1.useCurrentLearner)();
    const { width: windowWidth } = (0, react_native_1.useWindowDimensions)();
    const diagnosisPageWidth = Math.max(windowWidth, 1);
    const isMountedRef = (0, react_1.useRef)(true);
    const hasRequestedResetRef = (0, react_1.useRef)(false);
    const hasNavigatedToAnalysisRef = (0, react_1.useRef)(false);
    const hasResumedDiagnosisRef = (0, react_1.useRef)(false);
    const [isExitModalVisible, setIsExitModalVisible] = (0, react_1.useState)(false);
    const [isSolveExitModalVisible, setIsSolveExitModalVisible] = (0, react_1.useState)(false);
    const [isPreparingFreshSession, setIsPreparingFreshSession] = (0, react_1.useState)(shouldResetOnMount);
    const [hasNavigatedToStepComplete, setHasNavigatedToStepComplete] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!shouldResetOnMount || hasRequestedResetRef.current) {
            return;
        }
        hasRequestedResetRef.current = true;
        resetSession();
    }, [resetSession, shouldResetOnMount]);
    (0, react_1.useEffect)(() => {
        if (!isPreparingFreshSession) {
            return;
        }
        const isFreshSessionState = !state.hasStarted &&
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
    (0, react_1.useEffect)(() => {
        if (!state.isDiagnosing) {
            setHasNavigatedToStepComplete(false);
            hasNavigatedToAnalysisRef.current = false;
            hasResumedDiagnosisRef.current = false;
        }
    }, [state.isDiagnosing]);
    (0, react_1.useEffect)(() => {
        if (isPreparingFreshSession) {
            return;
        }
        if (state.isDiagnosing && !state.result && !hasNavigatedToStepComplete && !hasResumedDiagnosisRef.current) {
            setHasNavigatedToStepComplete(true);
            expo_router_1.router.push({
                pathname: '/quiz/step-complete',
                params: { step: 'diagnostic' },
            });
        }
    }, [isPreparingFreshSession, state.isDiagnosing, state.result, hasNavigatedToStepComplete]);
    (0, react_1.useEffect)(() => {
        if (isPreparingFreshSession) {
            return;
        }
        if (state.result && !hasNavigatedToAnalysisRef.current) {
            hasNavigatedToAnalysisRef.current = true;
            expo_router_1.router.replace({
                pathname: '/quiz/step-complete',
                params: { step: 'analysis' },
            });
        }
    }, [isPreparingFreshSession, state.result]);
    // 진단 결과가 기록되면 pending 플래그들을 순차적으로 클리어한다.
    // 순서 중요: clearPendingDiagnostic → clearPendingDiagnosisResume.
    // 역순이면 두 write 사이 window에서 isPendingDiagnosticFresh가 true로 평가되어
    // 여정 보드가 diagnostic_in_progress를 잘못 표시할 수 있다.
    (0, react_1.useEffect)(() => {
        if (!state.result) {
            return;
        }
        void (async () => {
            try {
                await clearPendingDiagnostic();
            }
            catch (err) {
                console.warn('[DiagnosticScreen] clearPendingDiagnostic failed', err);
            }
            try {
                await clearPendingDiagnosisResume();
            }
            catch (err) {
                console.warn('[DiagnosticScreen] clearPendingDiagnosisResume failed', err);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.result]);
    (0, react_1.useEffect)(() => {
        if (isPreparingFreshSession) {
            return;
        }
        if (shouldAutoStart && !state.hasStarted) {
            startSession();
        }
    }, [isPreparingFreshSession, shouldAutoStart, startSession, state.hasStarted]);
    // pendingDiagnosisResume 감지 시 세션 자동 복원
    (0, react_1.useEffect)(() => {
        if (shouldResetOnMount || state.hasStarted || state.isDiagnosing) {
            return;
        }
        const pendingResume = profile?.pendingDiagnosisResume;
        if (!pendingResume ||
            pendingResume.schemaVersion !== 1 ||
            pendingResume.diagnosisQueue.length === 0) {
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
    (0, react_1.useEffect)(() => {
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
    const { appendNextNode, createAiHelpActionsEntry, createAiHelpEntry, createBubbleEntry, createNodeEntry, currentProblem, diagnosisPages, handleAnalyze, handleDiagnosisInputChange: handleDiagnosisInputChangeBase, removeAiHelpComposerEntries, selectedIndex, setSelectedIndex, startDiagnosisFlow, updateWorkspace, } = (0, use_diagnosis_workspaces_1.useDiagnosisWorkspaces)({
        isMountedRef,
        problems,
        state,
    });
    const { activeDiagnosisPageIndex, diagnosisPagerRef, diagnosisPendingAutoScrollRef, diagnosisPendingRestoreRef, diagnosisScrollOffsetsRef, handleDiagnosisAutoScrollHandled, handleDiagnosisMomentumEnd, handleDiagnosisRestoreHandled, handleDiagnosisScrollOffsetChange, hasStoredDiagnosisOffset, requestDiagnosisAutoScroll, scrollToDiagnosisPage, setDiagnosisInteracted, } = (0, use_diagnosis_pager_1.useDiagnosisPager)({
        diagnosisPageWidth,
        diagnosisPages,
        isDiagnosing: state.isDiagnosing,
    });
    const { handleAiHelpContinue, handleAiHelpFallback, handleAiHelpInputChange, handleSubmitAiHelp, openAiHelpComposer, } = (0, use_diagnosis_ai_help_1.useDiagnosisAiHelp)({
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
    const onInputChange = (answerIndex, text) => {
        setDiagnosisInteracted(answerIndex);
        handleDiagnosisInputChangeBase(answerIndex, text);
    };
    const onAnalyzePage = async (page) => {
        setDiagnosisInteracted(page.answerIndex);
        await handleAnalyze(page);
    };
    const onConfirmPredicted = (page) => {
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
            rawText: (0, diagnostic_screen_helpers_1.buildDiagnosisAnalysisText)(workspace),
            finalMethodId: workspace.routerResult.predictedMethodId,
            finalMethodSource: 'router',
        });
        requestDiagnosisAutoScroll(answerIndex);
        startDiagnosisFlow(answerIndex, workspace.routerResult.predictedMethodId, methods);
    };
    const onManualSelect = (page, methodId) => {
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
                rawText: (0, diagnostic_screen_helpers_1.buildDiagnosisAnalysisText)(workspace),
                finalMethodId: methodId,
                finalMethodSource: 'manual',
            }
            : {
                candidateMethodIds: methods.map((method) => method.id),
                confidence: 0,
                finalMethodId: methodId,
                finalMethodSource: 'manual',
                needsManualSelection: true,
                predictedMethodId: 'unknown',
                rawText: (0, diagnostic_screen_helpers_1.buildDiagnosisAnalysisText)(workspace),
                reason: 'Manual selection',
                source: 'manual-selection',
            };
        confirmDiagnosisMethod(answerIndex, trace);
        requestDiagnosisAutoScroll(answerIndex);
        startDiagnosisFlow(answerIndex, methodId, methods);
    };
    const onChoicePress = (page, optionId) => {
        const { answerIndex, methods, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
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
        appendNextNode(answerIndex, methods, (0, diagnosis_flow_engine_1.advanceFromChoice)(workspace.flowDraft, optionId), option.text);
    };
    const onExplainContinue = (page) => {
        const { answerIndex, methods, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'explain') {
            return;
        }
        setDiagnosisInteracted(answerIndex);
        if (process.env.EXPO_OS === 'ios') {
            Haptics.selectionAsync();
        }
        requestDiagnosisAutoScroll(answerIndex);
        appendNextNode(answerIndex, methods, (0, diagnosis_flow_engine_1.advanceFromExplain)(workspace.flowDraft, 'continue'), activeNode.primaryLabel);
    };
    const onExplainDontKnow = (page) => {
        const { workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'explain') {
            return;
        }
        openAiHelpComposer(page, 'explain');
    };
    const onCheckPress = (page, optionId) => {
        const { answerIndex, methods, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
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
        const nextDraft = (0, diagnosis_flow_engine_1.advanceFromCheck)(workspace.flowDraft, optionId);
        const nextNode = (0, diagnosis_flow_engine_1.getNode)((0, diagnosis_flow_engine_1.getDiagnosisFlow)(nextDraft.methodId), nextDraft.currentNodeId);
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
    const onCheckDontKnow = (page) => {
        const { workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'check') {
            return;
        }
        openAiHelpComposer(page, 'check');
    };
    const onFinalConfirm = (page) => {
        const { answerIndex, workspace } = page;
        const activeNode = (0, diagnostic_screen_helpers_1.getActiveFlowNode)(workspace);
        if (!workspace.flowDraft || !activeNode || activeNode.kind !== 'final') {
            return;
        }
        if (workspace.status === 'completed') {
            return;
        }
        setDiagnosisInteracted(answerIndex);
        requestDiagnosisAutoScroll(answerIndex);
        if (process.env.EXPO_OS === 'ios') {
            Haptics.selectionAsync();
        }
        const currentPageIndex = diagnosisPages.findIndex((diagnosisPage) => diagnosisPage.answerIndex === answerIndex);
        const nextPageIndex = currentPageIndex === -1
            ? null
            : (0, diagnostic_screen_helpers_1.findNextIncompleteDiagnosisPageIndex)(diagnosisPages, currentPageIndex);
        submitDiagnosisWeakness(answerIndex, activeNode.weaknessId, (0, diagnosis_flow_engine_1.buildDiagnosisDetailTrace)(workspace.flowDraft, activeNode.weaknessId));
        updateWorkspace(answerIndex, (current) => ({
            ...current,
            aiHelpState: null,
            chatEntries: [
                ...(0, diagnostic_screen_helpers_1.freezeConversationEntries)(current.chatEntries),
                createBubbleEntry(answerIndex, 'user', activeNode.ctaLabel),
                createBubbleEntry(answerIndex, 'assistant', '이 문제는 분석을 마쳤어요.', 'positive'),
            ],
            status: 'completed',
        }));
        if (profile) {
            (0, diagnosis_analytics_1.logDiagnosisCompleted)({
                accountKey: profile.accountKey,
                source: 'unit',
                weaknessId: activeNode.weaknessId,
            });
        }
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
        if (!state.attemptId || !state.startedAt) {
            expo_router_1.router.replace('/(tabs)/quiz');
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
        expo_router_1.router.replace('/(tabs)/quiz');
    };
    const onQuestionSubmit = () => {
        if (!currentProblem || selectedIndex === null) {
            return;
        }
        submitAnswer(currentProblem.id, selectedIndex, selectedIndex === currentProblem.answerIndex);
    };
    const currentQuestionNumber = Math.min(state.currentQuestionIndex + 1, problems.length);
    const questionCount = state.totalQuestions;
    const progressRatio = currentQuestionNumber / questionCount;
    const progressPercent = `${progressRatio * 100}%`;
    const stepLabel = `${String(currentQuestionNumber).padStart(2, '0')} / ${String(questionCount).padStart(2, '0')}`;
    const completedDiagnosisCount = state.isDiagnosing
        ? state.diagnosisQueue.filter((i) => Boolean(state.answers[i]?.weaknessId)).length
        : 0;
    const quizStage = state.hasStarted && !state.isDiagnosing && currentProblem
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
            onSelectChoice: (index) => {
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
                expo_router_1.router.replace('/quiz');
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
        diagnosisStepLabel: (0, diagnostic_screen_helpers_1.getDiagnosisStepLabel)(activeDiagnosisPageIndex),
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
        onFinalConfirm,
        onInputChange,
        onManualSelect,
        onOpenExitModal: () => setIsExitModalVisible(true),
        onScrollToDiagnosisPage: scrollToDiagnosisPage,
        onScrollToIndexFailed: (index) => {
            setTimeout(() => {
                diagnosisPagerRef.current?.scrollToOffset({
                    animated: false,
                    offset: diagnosisPageWidth * index,
                });
            }, 120);
        },
        onStartSession: startSession,
    };
}
