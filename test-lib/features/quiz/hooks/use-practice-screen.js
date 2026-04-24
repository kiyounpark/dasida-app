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
exports.usePracticeScreen = usePracticeScreen;
const Haptics = __importStar(require("expo-haptics"));
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const challengeProblem_1 = require("../../../data/challengeProblem");
const diagnosisMap_1 = require("../../../data/diagnosisMap");
const practiceMap_1 = require("../../../data/practiceMap");
const provider_1 = require("@/features/learner/provider");
const review_stage_1 = require("../../../features/learning/review-stage");
const build_finalized_attempt_input_1 = require("../../../features/quiz/build-finalized-attempt-input");
const session_1 = require("@/features/quiz/session");
function triggerPracticeHaptic(type) {
    if (process.env.EXPO_OS === 'ios') {
        void Haptics.notificationAsync(type);
    }
}
const PERSIST_ERROR_MESSAGE = '연습 기록을 저장하지 못했어요. 다시 시도해 주세요.';
function usePracticeScreen({ fallbackWeaknessKey, requestedMode, }) {
    const { state, advancePractice, completeChallenge, resetSession } = (0, session_1.useQuizSession)();
    const { clearPendingPractice, graduateToPractice, markPendingPracticeStarted, profile, recordAttempt, session, summary, } = (0, provider_1.useCurrentLearner)();
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(null);
    const [feedback, setFeedback] = (0, react_1.useState)();
    const [wrongAttempts, setWrongAttempts] = (0, react_1.useState)(0);
    const [problemStartedAt, setProblemStartedAt] = (0, react_1.useState)(() => new Date().toISOString());
    const [firstSubmittedIndex, setFirstSubmittedIndex] = (0, react_1.useState)(null);
    const [isPersistingAttempt, setIsPersistingAttempt] = (0, react_1.useState)(false);
    const [persistErrorMessage, setPersistErrorMessage] = (0, react_1.useState)(null);
    const [solvedCount, setSolvedCount] = (0, react_1.useState)(0);
    const [isGraduating, setIsGraduating] = (0, react_1.useState)(false);
    const [isExitModalVisible, setIsExitModalVisible] = (0, react_1.useState)(false);
    const reviewQueueInitialCountRef = (0, react_1.useRef)(null);
    const fallbackWeaknessId = (0, diagnosisMap_1.resolveWeaknessId)(fallbackWeaknessKey);
    const reviewQueue = (0, react_1.useMemo)(() => summary?.dueReviewTasks ?? [], [summary?.dueReviewTasks]);
    const activeMode = requestedMode === 'review'
        ? 'review'
        : state.result?.allCorrect
            ? 'challenge'
            : state.result
                ? 'weakness'
                : requestedMode === 'challenge'
                    ? 'challenge'
                    : 'weakness';
    const activeReviewTask = activeMode === 'review' ? reviewQueue[0] : undefined;
    const activeWeaknessId = (0, react_1.useMemo)(() => {
        if (activeMode === 'review') {
            return activeReviewTask?.weaknessId;
        }
        if (state.result && activeMode === 'weakness') {
            return state.practiceQueue[state.practiceIndex];
        }
        return fallbackWeaknessId;
    }, [
        activeMode,
        activeReviewTask?.weaknessId,
        fallbackWeaknessId,
        state.practiceIndex,
        state.practiceQueue,
        state.result,
    ]);
    (0, react_1.useEffect)(() => {
        if (activeMode !== 'review') {
            reviewQueueInitialCountRef.current = null;
            return;
        }
        if (reviewQueueInitialCountRef.current === null) {
            reviewQueueInitialCountRef.current = reviewQueue.length;
        }
    }, [activeMode, reviewQueue.length]);
    const activeProblem = activeMode === 'challenge'
        ? challengeProblem_1.challengeProblem
        : activeWeaknessId
            ? practiceMap_1.practiceMap[activeWeaknessId]
            : undefined;
    (0, react_1.useEffect)(() => {
        setSelectedIndex(null);
        setFeedback(undefined);
        setWrongAttempts(0);
        setFirstSubmittedIndex(null);
        setIsPersistingAttempt(false);
        setPersistErrorMessage(null);
        setProblemStartedAt(new Date().toISOString());
    }, [activeProblem?.id, activeReviewTask?.id]);
    // state 5 감지용 플래그. weakness 모드에서 활성 문제가 잡혀 실제 풀이 중일 때만 SET.
    // review/challenge 모드는 건드리지 않는다.
    (0, react_1.useEffect)(() => {
        if (activeMode !== 'weakness') {
            return;
        }
        if (!activeProblem) {
            return;
        }
        void markPendingPracticeStarted().catch((err) => {
            console.warn('[PracticeScreen] markPendingPracticeStarted failed', err);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMode, activeProblem?.id]);
    const toFeedbackParams = (mode, weaknessId) => {
        if (mode === 'challenge') {
            return { mode };
        }
        const next = { mode };
        if (weaknessId) {
            next.weaknessId = weaknessId;
            next.weakTag = diagnosisMap_1.diagnosisMap[weaknessId].labelKo;
        }
        return next;
    };
    const baseWeaknessLabel = activeWeaknessId !== undefined ? diagnosisMap_1.diagnosisMap[activeWeaknessId].labelKo : '약점 연습';
    const onSubmit = () => {
        if (selectedIndex === null || !activeProblem) {
            return;
        }
        if (firstSubmittedIndex === null) {
            setFirstSubmittedIndex(selectedIndex);
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
        if (activeMode !== 'challenge') {
            triggerPracticeHaptic(Haptics.NotificationFeedbackType.Warning);
            if (wrongAttempts === 0) {
                setWrongAttempts(1);
                setFeedback({
                    kind: 'coaching',
                    title: '이 포인트만 다시 보면 풀 수 있어요.',
                    body: `${baseWeaknessLabel}에서 자주 흔들리는 기준만 짧게 다시 잡고 갈게요.`,
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
                body: `${baseWeaknessLabel} 약점에서 놓친 기준을 정리해두면 다음 문제에서 같은 실수를 줄일 수 있어요.`,
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
    const continueAfterPersistence = () => {
        if (feedback?.kind !== 'correct' && feedback?.kind !== 'resolved') {
            return;
        }
        setSolvedCount((c) => c + 1);
        if (activeMode === 'challenge') {
            completeChallenge();
            expo_router_1.router.push({
                pathname: '/quiz/feedback',
                params: toFeedbackParams('challenge'),
            });
            return;
        }
        if (activeMode === 'review') {
            if (reviewQueue.length <= 1) {
                expo_router_1.router.replace('/quiz');
            }
            return;
        }
        if (state.result && state.practiceMode === 'weakness') {
            const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
            advancePractice();
            if (isLast) {
                resetSession();
                void clearPendingPractice().catch((err) => {
                    console.warn('[PracticeScreen] clearPendingPractice failed', err);
                });
                expo_router_1.router.replace({
                    pathname: '/quiz/step-complete',
                    params: { step: 'practice' },
                });
            }
            return;
        }
        expo_router_1.router.push({
            pathname: '/quiz/feedback',
            params: toFeedbackParams('weakness', activeWeaknessId),
        });
    };
    const persistWeaknessAttempt = async () => {
        if ((activeMode !== 'weakness' && activeMode !== 'review') ||
            (feedback?.kind !== 'correct' && feedback?.kind !== 'resolved')) {
            return true;
        }
        if (!session || !profile || !activeWeaknessId || !activeProblem || selectedIndex === null) {
            setPersistErrorMessage(PERSIST_ERROR_MESSAGE);
            return false;
        }
        if (activeMode === 'review' && !activeReviewTask) {
            setPersistErrorMessage(PERSIST_ERROR_MESSAGE);
            return false;
        }
        const resolvedBy = feedback.kind === 'correct' ? 'solved' : 'answer_revealed';
        setIsPersistingAttempt(true);
        setPersistErrorMessage(null);
        try {
            await recordAttempt((0, build_finalized_attempt_input_1.buildWeaknessPracticeAttemptInput)({
                session,
                profile,
                weaknessId: activeWeaknessId,
                weaknessLabel: baseWeaknessLabel,
                problemId: activeProblem.id,
                startedAt: problemStartedAt,
                completedAt: new Date().toISOString(),
                firstSelectedIndex: firstSubmittedIndex,
                finalSelectedIndex: selectedIndex,
                wrongAttempts: feedback.kind === 'correct' ? wrongAttempts : 2,
                resolvedBy,
                reviewContext: activeMode === 'review' && activeReviewTask
                    ? {
                        reviewTaskId: activeReviewTask.id,
                        reviewStage: activeReviewTask.stage,
                    }
                    : undefined,
            }));
            return true;
        }
        catch (error) {
            console.warn('Failed to persist weakness-practice attempt', error);
            setIsPersistingAttempt(false);
            setPersistErrorMessage(PERSIST_ERROR_MESSAGE);
            return false;
        }
    };
    const onContinue = () => {
        if (isPersistingAttempt) {
            return;
        }
        void (async () => {
            const shouldContinue = await persistWeaknessAttempt();
            if (!shouldContinue) {
                return;
            }
            continueAfterPersistence();
        })();
    };
    const weaknessLabel = activeMode === 'challenge'
        ? '심화 문제'
        : activeMode === 'review' && activeReviewTask
            ? `${(0, review_stage_1.formatReviewStageLabel)(activeReviewTask.stage)} · ${baseWeaknessLabel}`
            : baseWeaknessLabel;
    const isLastWeakness = state.result && state.practiceMode === 'weakness'
        ? state.practiceIndex >= state.practiceQueue.length - 1
        : true;
    const counter = (() => {
        if (activeMode === 'weakness' && state.result && state.practiceMode === 'weakness') {
            const total = Math.max(state.practiceQueue.length, 1);
            const current = Math.min(state.practiceIndex + 1, total);
            return { current, total };
        }
        if (activeMode === 'review') {
            const total = Math.max(reviewQueueInitialCountRef.current ?? reviewQueue.length, 1);
            const remaining = reviewQueue.length;
            const current = Math.min(Math.max(total - remaining + 1, 1), total);
            return { current, total };
        }
        return { current: 1, total: 1 };
    })();
    const progressPercent = `${Math.round((counter.current / counter.total) * 100)}%`;
    return {
        activeProblem,
        continueLabel: activeMode === 'challenge'
            ? '피드백 화면으로 이동'
            : activeMode === 'review'
                ? reviewQueue.length > 1
                    ? '다음 복습 문제'
                    : '홈으로 돌아가기'
                : isLastWeakness
                    ? state.result && state.practiceMode === 'weakness'
                        ? '연습 완료'
                        : '피드백 화면으로 이동'
                    : '다음 약점 문제',
        emptyActionLabel: activeMode === 'review' ? '홈으로 돌아가기' : '결과로 돌아가기',
        emptyTitle: activeMode === 'review' ? '오늘 바로 시작할 복습이 없어요.' : '연습 문제를 찾지 못했어요.',
        feedback,
        isPersistingAttempt,
        onContinue,
        onRetry: () => {
            setSelectedIndex(null);
            setFeedback(undefined);
            setPersistErrorMessage(null);
        },
        onSelectChoice: setSelectedIndex,
        onSubmit,
        onViewResult: () => {
            if (activeMode === 'review') {
                expo_router_1.router.replace('/quiz');
                return;
            }
            expo_router_1.router.replace('/quiz/result');
        },
        canGraduate: activeMode === 'weakness' && solvedCount > 0 && !profile?.practiceGraduatedAt,
        isGraduating,
        onGraduate: () => {
            if (isGraduating) {
                return;
            }
            setIsGraduating(true);
            void graduateToPractice()
                .then(() => {
                void clearPendingPractice().catch((err) => {
                    console.warn('[PracticeScreen] clearPendingPractice failed', err);
                });
                expo_router_1.router.replace('/(tabs)/quiz');
            })
                .catch(() => {
                setIsGraduating(false);
            });
        },
        persistErrorMessage,
        screenTitle: activeMode === 'challenge'
            ? '심화 문제'
            : activeMode === 'review'
                ? '오늘 복습'
                : '약점 기반 연습',
        selectedIndex,
        weaknessLabel,
        currentQuestionNumber: counter.current,
        isExitModalVisible,
        onCloseExitModal: () => setIsExitModalVisible(false),
        onConfirmExit: () => {
            if (isGraduating) {
                return;
            }
            setIsExitModalVisible(false);
            expo_router_1.router.replace('/(tabs)/quiz');
        },
        onOpenExitModal: () => {
            if (isGraduating) {
                return;
            }
            setIsExitModalVisible(true);
        },
        progressPercent,
        questionCount: counter.total,
    };
}
