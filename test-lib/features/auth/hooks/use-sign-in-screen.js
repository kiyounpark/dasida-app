"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSignInScreen = useSignInScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const auth_client_1 = require("../../../features/auth/auth-client");
const provider_1 = require("@/features/learner/provider");
function formatErrorMessage(error) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
function getProviderLabel(provider) {
    return provider === 'apple' ? 'Apple로 계속' : 'Google로 계속';
}
function getBlockingCopy(reason) {
    if (reason === 'firebase_not_configured') {
        return {
            title: '로그인 설정이 아직 준비되지 않았어요',
            body: '이 빌드에는 Firebase Auth 설정이 없어 소셜 로그인을 시작할 수 없습니다.',
        };
    }
    return {
        title: '이 빌드에서는 로그인 제공자를 찾지 못했어요',
        body: 'Google 또는 Apple 로그인 구성이 누락되었는지 확인해 주세요.',
    };
}
function useSignInScreen() {
    const { authBlockingReason, availableAuthProviders, canUseDevGuestAuth, continueAsDevGuest, signIn, } = (0, provider_1.useCurrentLearner)();
    const [busyAction, setBusyAction] = (0, react_1.useState)(null);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const supportedAuthProviders = (0, react_1.useMemo)(() => availableAuthProviders.map((provider) => ({
        id: provider,
        label: getProviderLabel(provider),
    })), [availableAuthProviders]);
    async function handleSignIn(provider) {
        setBusyAction(provider);
        setErrorMessage(null);
        try {
            await signIn(provider);
            expo_router_1.router.replace('/(tabs)/quiz');
        }
        catch (error) {
            if (!(error instanceof auth_client_1.AuthFlowCancelledError)) {
                setErrorMessage(formatErrorMessage(error));
            }
        }
        finally {
            setBusyAction(null);
        }
    }
    async function handleContinueAsDevGuest() {
        setBusyAction('dev-guest');
        setErrorMessage(null);
        try {
            await continueAsDevGuest();
            expo_router_1.router.replace('/(tabs)/quiz');
        }
        catch (error) {
            setErrorMessage(formatErrorMessage(error));
        }
        finally {
            setBusyAction(null);
        }
    }
    return {
        blockingCopy: supportedAuthProviders.length === 0 ? getBlockingCopy(authBlockingReason) : null,
        busyAction,
        canUseDevGuestAuth,
        errorMessage,
        supportedAuthProviders,
        onContinueAsDevGuest: handleContinueAsDevGuest,
        onSignIn: handleSignIn,
    };
}
