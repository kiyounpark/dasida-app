"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQuizHubScreen = useQuizHubScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const react_native_1 = require("react-native");
const review_scheduler_1 = require("../../../features/learning/review-scheduler");
const review_task_store_1 = require("../../../features/learning/review-task-store");
const review_notification_scheduler_1 = require("../../../features/quiz/notifications/review-notification-scheduler");
const provider_1 = require("@/features/learner/provider");
const hubReviewStore = new review_task_store_1.LocalReviewTaskStore();
function useQuizHubScreen() {
    const { height, width } = (0, react_native_1.useWindowDimensions)();
    const { authNoticeMessage, dismissAuthNotice, graduateToPractice, homeState, isReady, profile, refresh, session, } = (0, provider_1.useCurrentLearner)();
    const [localAuthNoticeMessage, setLocalAuthNoticeMessage] = (0, react_1.useState)(null);
    const isGraduatingRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (!authNoticeMessage) {
            return;
        }
        setLocalAuthNoticeMessage(authNoticeMessage);
        dismissAuthNotice();
    }, [authNoticeMessage, dismissAuthNotice]);
    (0, react_1.useEffect)(() => {
        const accountKey = session?.accountKey;
        if (!accountKey) {
            return;
        }
        (0, review_scheduler_1.applyOverduePenalties)(accountKey, hubReviewStore).then(() => {
            void (0, review_notification_scheduler_1.rescheduleAllReviewNotifications)(accountKey, hubReviewStore).catch(console.warn);
            void refresh();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]);
    const isFirstFocusRef = (0, react_1.useRef)(true);
    const lastFocusRefreshAtRef = (0, react_1.useRef)(0);
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(() => {
        if (isFirstFocusRef.current) {
            isFirstFocusRef.current = false;
            return;
        }
        const now = Date.now();
        if (now - lastFocusRefreshAtRef.current < 5_000) {
            return;
        }
        lastFocusRefreshAtRef.current = now;
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]));
    const onStartDiagnostic = () => {
        expo_router_1.router.push({
            pathname: '/quiz/diagnostic',
            params: { autostart: '1', reset: '1' },
        });
    };
    const onOpenPractice = () => {
        if (!homeState) {
            return;
        }
        if (homeState.todayReviewCount > 0) {
            expo_router_1.router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
            return;
        }
        expo_router_1.router.push({ pathname: '/quiz/practice', params: { mode: 'weakness' } });
    };
    const onOpenRecentResult = () => {
        if (!homeState?.recentResultCard.enabled) {
            return;
        }
        expo_router_1.router.push({
            pathname: '/quiz/result',
            params: { source: 'snapshot' },
        });
    };
    const onPressReviewCard = () => {
        const taskId = homeState?.nextReviewTask?.id;
        if (!taskId) {
            return;
        }
        expo_router_1.router.push({
            pathname: '/quiz/review-session',
            params: { taskId },
        });
    };
    const onPressExam = () => {
        expo_router_1.router.push('/(tabs)/quiz/exams');
    };
    const onResumeDiagnosis = () => {
        expo_router_1.router.push('/quiz/diagnostic');
    };
    const onPressJourneyCta = () => {
        const action = homeState?.journey.ctaAction;
        if (!action || action === 'none') {
            return;
        }
        switch (action) {
            case 'resume_diagnosis':
                onResumeDiagnosis();
                return;
            case 'open_result':
                onOpenRecentResult();
                return;
            case 'open_review':
                onOpenPractice();
                return;
            case 'graduate_practice':
                if (isGraduatingRef.current)
                    return;
                isGraduatingRef.current = true;
                void graduateToPractice()
                    .then(() => {
                    isGraduatingRef.current = false;
                    // router.replace가 app/quiz/_layout.tsx 스택을 unmount하면서
                    // QuizSessionProvider도 소멸 → 세션 상태가 자연히 초기화됨
                    expo_router_1.router.replace('/(tabs)/quiz');
                })
                    .catch((err) => {
                    isGraduatingRef.current = false;
                    console.warn('[QuizHub] graduateToPractice failed', err);
                });
                return;
            case 'start_diagnostic':
                onStartDiagnostic();
                return;
            default: {
                const exhaustiveCheck = action;
                console.warn('[QuizHub] unknown ctaAction', exhaustiveCheck);
            }
        }
    };
    const journey = homeState?.journey ?? null;
    const isGraduated = journey?.currentStateKey === 'journey_graduated';
    const isJourneyActive = !isGraduated;
    const showBrandHeader = isGraduated;
    const showJourneyHero = isJourneyActive;
    const showJourneyBoard = isJourneyActive;
    // 여정 진행 중에는 NoReviewDayCard를 숨긴다. 졸업 후(isGraduated)에만 기존 조건을 평가.
    const showNoReviewDayCard = isGraduated &&
        !!homeState?.nextReviewTask &&
        homeState.todayReviewCount === 0;
    // 약점 섹션도 여정 완료 후에만 노출.
    const showWeaknessSection = isGraduated;
    // ReviewHomeCard도 여정 진행 중에는 숨긴다. 졸업 후에만 평가.
    const showReviewHomeCard = isGraduated &&
        !!homeState?.nextReviewTask &&
        homeState.todayReviewCount > 0;
    return {
        authNoticeMessage: localAuthNoticeMessage,
        homeState,
        isCompactLayout: width < 390 || height < 780,
        isReady,
        journey,
        onDismissAuthNotice: () => {
            setLocalAuthNoticeMessage(null);
        },
        onOpenPractice,
        onOpenRecentResult,
        onPressExam,
        onPressJourneyCta,
        onPressReviewCard,
        onRediagnose: onStartDiagnostic,
        onRefresh: refresh,
        onStartDiagnostic,
        profile,
        session,
        showBrandHeader,
        showJourneyHero,
        showJourneyBoard,
        showNoReviewDayCard,
        showReviewHomeCard,
        showWeaknessSection,
    };
}
