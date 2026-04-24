"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProfileScreen = useProfileScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const provider_1 = require("@/features/learner/provider");
const gradeOptions = [
    { value: 'g1', label: '고1' },
    { value: 'g2', label: '고2' },
    { value: 'g3', label: '고3' },
];
function formatErrorMessage(error) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
function useProfileScreen() {
    const { clearLearningHistory, deleteAccount, getHistoryMigrationStatus, importAnonymousHistory, profile, refresh, session, signOut, updateOnboardingProfile, } = (0, provider_1.useCurrentLearner)();
    const [busyAction, setBusyAction] = (0, react_1.useState)(null);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const [noticeMessage, setNoticeMessage] = (0, react_1.useState)(null);
    const [manualImportCandidate, setManualImportCandidate] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let isMounted = true;
        async function loadManualImportCandidate() {
            if (session?.status !== 'authenticated') {
                if (isMounted) {
                    setManualImportCandidate(null);
                }
                return;
            }
            try {
                const status = await getHistoryMigrationStatus();
                if (!isMounted) {
                    return;
                }
                if (status.state === 'ready') {
                    setManualImportCandidate({
                        sourceAccountKey: status.sourceAccountKey,
                        recordCount: status.recordCount,
                    });
                    return;
                }
                setManualImportCandidate(null);
            }
            catch {
                if (isMounted) {
                    setManualImportCandidate(null);
                }
            }
        }
        void loadManualImportCandidate();
        return () => {
            isMounted = false;
        };
    }, [getHistoryMigrationStatus, session?.accountKey, session?.status]);
    async function handleSignOut() {
        setBusyAction('sign-out');
        setErrorMessage(null);
        setNoticeMessage(null);
        try {
            await signOut();
            setManualImportCandidate(null);
        }
        catch (error) {
            setErrorMessage(formatErrorMessage(error));
        }
        finally {
            setBusyAction(null);
        }
    }
    async function handleImport(sourceAccountKey) {
        setBusyAction('import');
        setErrorMessage(null);
        try {
            const status = await importAnonymousHistory(sourceAccountKey);
            if (status.state === 'completed' || status.state === 'already_imported') {
                setNoticeMessage('이 기기의 기록을 계정에 저장했습니다.');
            }
            setManualImportCandidate(null);
            await refresh();
        }
        catch (error) {
            setErrorMessage(`로컬 기록 가져오기에 실패했습니다. ${formatErrorMessage(error)}`);
        }
        finally {
            setBusyAction(null);
        }
    }
    async function handleManualImport() {
        if (!manualImportCandidate) {
            return;
        }
        await handleImport(manualImportCandidate.sourceAccountKey);
    }
    return {
        busyAction,
        errorMessage,
        gradeOptions,
        manualImportCandidate,
        noticeMessage,
        profile,
        session,
        onDeleteAccount: async () => {
            setBusyAction('delete-account');
            setErrorMessage(null);
            setNoticeMessage(null);
            try {
                await deleteAccount();
                expo_router_1.router.replace('/sign-in');
            }
            catch (error) {
                setErrorMessage(`탈퇴에 실패했습니다. ${formatErrorMessage(error)}`);
            }
            finally {
                setBusyAction(null);
            }
        },
        onImportLocalHistory: handleManualImport,
        onSignOut: handleSignOut,
        onUpdateGradeAndTrack: async (grade, track) => {
            setBusyAction(`grade:${grade}`);
            setErrorMessage(null);
            try {
                // 히스토리 초기화: 로컬(anonymous) 사용자에게는 완전 초기화, authenticated 사용자는
                // 로컬 캐시만 초기화됨 (Firestore 기록은 유지). 실패해도 학년 변경은 진행.
                try {
                    await clearLearningHistory();
                }
                catch {
                    // best-effort — 학년 변경 자체는 막지 않음
                }
                await updateOnboardingProfile(profile?.nickname ?? '', grade, grade === 'g3' ? track : undefined);
            }
            catch (error) {
                setErrorMessage(formatErrorMessage(error));
            }
            finally {
                setBusyAction(null);
            }
        },
    };
}
