"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOnboardingScreen = useOnboardingScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const provider_1 = require("@/features/learner/provider");
function useOnboardingScreen() {
    const { updateOnboardingProfile } = (0, provider_1.useCurrentLearner)();
    const [nickname, setNickname] = (0, react_1.useState)('');
    const [grade, setGrade] = (0, react_1.useState)(null);
    const [track, setTrack] = (0, react_1.useState)(null);
    const [isBusy, setIsBusy] = (0, react_1.useState)(false);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const showTrackStep = grade === 'g3';
    const isReady = nickname.trim().length > 0 &&
        grade !== null &&
        (grade !== 'g3' || track !== null);
    const onSelectGrade = (newGrade) => {
        setGrade(newGrade);
        if (newGrade !== 'g3') {
            setTrack(null);
        }
    };
    const onSubmit = async () => {
        if (!isReady || isBusy || !grade)
            return;
        setIsBusy(true);
        setErrorMessage(null);
        try {
            await updateOnboardingProfile(nickname.trim(), grade, grade === 'g3' ? (track ?? undefined) : undefined);
            expo_router_1.router.replace('/(tabs)/quiz');
        }
        catch {
            setErrorMessage('저장 중 오류가 발생했어요. 다시 시도해 주세요.');
        }
        finally {
            setIsBusy(false);
        }
    };
    return {
        nickname,
        grade,
        track,
        showTrackStep,
        isBusy,
        isReady,
        errorMessage,
        onChangeNickname: setNickname,
        onSelectGrade,
        onSelectTrack: setTrack,
        onSubmit,
    };
}
