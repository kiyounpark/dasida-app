"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useResultScreen = useResultScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const diagnosisMap_1 = require("../../../data/diagnosisMap");
const review_task_store_1 = require("../../../features/learning/review-task-store");
const provider_1 = require("@/features/learner/provider");
const build_finalized_attempt_input_1 = require("../../../features/quiz/build-finalized-attempt-input");
const review_notification_scheduler_1 = require("../../../features/quiz/notifications/review-notification-scheduler");
const session_1 = require("@/features/quiz/session");
const resultScreenReviewStore = new review_task_store_1.LocalReviewTaskStore();
function getSaveErrorMessage(error) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return '결과를 저장하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.';
}
function useResultScreen({ legacyNextStep, legacyWeaknessKey, requestedSource, }) {
    const { state, resetSession } = (0, session_1.useQuizSession)();
    const { markDiagnosticResultViewed, profile, recordAttempt, session, summary: currentSummary, } = (0, provider_1.useCurrentLearner)();
    const [saveState, setSaveState] = (0, react_1.useState)('idle');
    const [saveErrorMessage, setSaveErrorMessage] = (0, react_1.useState)(null);
    const liveSummary = state.result;
    const legacyWeaknessId = (0, diagnosisMap_1.resolveWeaknessId)(legacyWeaknessKey);
    const storedSummary = currentSummary?.latestDiagnosticSummary;
    const snapshotSummary = requestedSource === 'snapshot' || !liveSummary ? storedSummary : undefined;
    const legacyPracticeParams = {
        mode: 'weakness',
    };
    if (legacyWeaknessId) {
        legacyPracticeParams.weaknessId = legacyWeaknessId;
        legacyPracticeParams.weakTag = diagnosisMap_1.diagnosisMap[legacyWeaknessId].labelKo;
    }
    const persistResult = (0, react_1.useCallback)(async () => {
        if (!liveSummary || !profile || !session || saveState === 'saving') {
            return;
        }
        setSaveState('saving');
        setSaveErrorMessage(null);
        try {
            await recordAttempt((0, build_finalized_attempt_input_1.buildDiagnosticAttemptInput)({
                session,
                profile,
                answers: state.answers,
                result: liveSummary,
            }));
            setSaveState('saved');
        }
        catch (error) {
            setSaveState('error');
            setSaveErrorMessage(getSaveErrorMessage(error));
        }
    }, [liveSummary, profile, recordAttempt, saveState, session, state.answers]);
    (0, react_1.useEffect)(() => {
        if (!liveSummary) {
            setSaveState('saved');
            setSaveErrorMessage(null);
            return;
        }
        if (storedSummary?.attemptId === liveSummary.attemptId) {
            setSaveState('saved');
            setSaveErrorMessage(null);
            return;
        }
        setSaveState('idle');
        setSaveErrorMessage(null);
    }, [liveSummary, storedSummary?.attemptId]);
    (0, react_1.useEffect)(() => {
        if (!liveSummary || !profile || !session) {
            return;
        }
        if (storedSummary?.attemptId === liveSummary.attemptId) {
            return;
        }
        if (saveState !== 'idle') {
            return;
        }
        void persistResult();
    }, [liveSummary, persistResult, profile, saveState, session, storedSummary?.attemptId]);
    // 진단 완료 저장 후 알림 권한 요청 + Day1 알림 예약
    (0, react_1.useEffect)(() => {
        if (saveState !== 'saved' || !liveSummary || !session?.accountKey) {
            return;
        }
        const accountKey = session.accountKey;
        (0, review_notification_scheduler_1.requestNotificationPermission)()
            .then((granted) => {
            if (!granted)
                return;
            return (0, review_notification_scheduler_1.scheduleReviewNotifications)(accountKey, resultScreenReviewStore);
        })
            .catch(console.warn);
    }, [saveState, session?.accountKey]);
    // 결과 화면 첫 진입 시 "결과 봄" 이정표를 기록한다.
    // 이미 값이 있으면 controller 측에서 no-op로 처리된다.
    (0, react_1.useEffect)(() => {
        const hasAnySummary = Boolean(liveSummary) || Boolean(snapshotSummary);
        if (!hasAnySummary) {
            return;
        }
        if (profile?.latestDiagnosticResultViewedAt) {
            return;
        }
        void markDiagnosticResultViewed().catch((err) => {
            console.warn('[Result] markDiagnosticResultViewed failed', err);
        });
    }, [
        liveSummary,
        markDiagnosticResultViewed,
        profile?.latestDiagnosticResultViewedAt,
        snapshotSummary,
    ]);
    const snapshotSummaryTitle = (0, react_1.useMemo)(() => {
        if (!snapshotSummary || snapshotSummary.topWeaknesses.length === 0) {
            return null;
        }
        return diagnosisMap_1.diagnosisMap[snapshotSummary.topWeaknesses[0]].labelKo;
    }, [snapshotSummary]);
    return {
        legacyNextStep,
        legacyPracticeParams,
        legacyWeaknessId,
        liveSummary,
        onOpenChallengePractice: () => {
            expo_router_1.router.push({
                pathname: '/quiz/practice',
                params: { mode: 'challenge' },
            });
        },
        onOpenLegacyPractice: () => {
            expo_router_1.router.push({
                pathname: '/quiz/practice',
                params: legacyPracticeParams,
            });
        },
        onOpenSnapshotDiagnostic: () => {
            resetSession();
            expo_router_1.router.replace({
                pathname: '/quiz/diagnostic',
                params: { autostart: '1' },
            });
        },
        onOpenSnapshotPractice: (weaknessId) => {
            expo_router_1.router.push({
                pathname: '/quiz/practice',
                params: {
                    mode: 'weakness',
                    weaknessId,
                },
            });
        },
        onOpenWeaknessPractice: (weaknessId) => {
            expo_router_1.router.push({
                pathname: '/quiz/practice',
                params: {
                    mode: 'weakness',
                    weaknessId,
                },
            });
        },
        onRestartQuiz: () => {
            expo_router_1.router.replace('/quiz');
            resetSession();
        },
        persistResult,
        saveErrorMessage,
        saveState,
        snapshotSummary,
        snapshotSummaryTitle,
    };
}
