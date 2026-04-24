"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useHistoryScreen = useHistoryScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const history_insights_1 = require("../../../features/history/history-insights");
const provider_1 = require("@/features/learner/provider");
function useHistoryScreen() {
    const { isReady, refresh, loadRecentAttempts, summary } = (0, provider_1.useCurrentLearner)();
    const [recentDiagnosticAttempts, setRecentDiagnosticAttempts] = (0, react_1.useState)([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = (0, react_1.useState)(false);
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    const isMountedRef = (0, react_1.useRef)(true);
    (0, react_1.useEffect)(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    const loadAttempts = (0, react_1.useCallback)(async () => {
        if (!isReady || !summary?.accountKey) {
            if (!isMountedRef.current) {
                return;
            }
            setRecentDiagnosticAttempts([]);
            setIsLoadingAttempts(false);
            return;
        }
        setIsLoadingAttempts(true);
        try {
            const attempts = await loadRecentAttempts({
                source: 'diagnostic',
                limit: 5,
            });
            if (!isMountedRef.current) {
                return;
            }
            setRecentDiagnosticAttempts(attempts);
        }
        catch (error) {
            if (!isMountedRef.current) {
                return;
            }
            setRecentDiagnosticAttempts([]);
        }
        finally {
            if (isMountedRef.current) {
                setIsLoadingAttempts(false);
            }
        }
    }, [isReady, loadRecentAttempts, summary?.accountKey]);
    (0, react_1.useEffect)(() => {
        void loadAttempts();
    }, [loadAttempts, summary?.updatedAt]);
    const insights = (0, react_1.useMemo)(() => {
        if (!summary) {
            return null;
        }
        return (0, history_insights_1.buildHistoryInsights)(summary, recentDiagnosticAttempts, {
            isLoadingAttempts,
        });
    }, [isLoadingAttempts, recentDiagnosticAttempts, summary]);
    async function onRefresh() {
        setIsRefreshing(true);
        try {
            await refresh();
            await loadAttempts();
        }
        finally {
            setIsRefreshing(false);
        }
    }
    function onPrimaryAction() {
        if (!insights || !summary) {
            return;
        }
        if (insights.hero.ctaKind === 'review' && (summary.dueReviewTasks?.length ?? 0) > 0) {
            expo_router_1.router.push({
                pathname: '/quiz/practice',
                params: {
                    mode: 'review',
                },
            });
            return;
        }
        expo_router_1.router.push({
            pathname: '/quiz/diagnostic',
            params: {
                autostart: '1',
                reset: '1',
            },
        });
    }
    return {
        insights,
        isLoadingAttempts,
        isReady,
        isRefreshing,
        onPrimaryAction,
        onRefresh,
    };
}
