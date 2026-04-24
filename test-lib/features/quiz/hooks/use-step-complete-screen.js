"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStepCompleteScreen = useStepCompleteScreen;
// features/quiz/hooks/use-step-complete-screen.ts
const react_1 = require("react");
const expo_router_1 = require("expo-router");
const provider_1 = require("@/features/learner/provider");
const session_1 = require("@/features/quiz/session");
function useStepCompleteScreen(stepKey) {
    const { resetSession } = (0, session_1.useQuizSession)();
    const { graduateToPractice } = (0, provider_1.useCurrentLearner)();
    const [isGraduating, setIsGraduating] = (0, react_1.useState)(false);
    const onContinue = (0, react_1.useCallback)(() => {
        if (stepKey === 'diagnostic') {
            expo_router_1.router.back();
            return;
        }
        if (stepKey === 'analysis') {
            expo_router_1.router.replace('/quiz/result');
            return;
        }
        // practice: 졸업 처리 후 홈으로 이동 (중복 호출 방지)
        if (isGraduating)
            return;
        setIsGraduating(true);
        void graduateToPractice()
            .then(() => {
            resetSession();
            expo_router_1.router.replace('/(tabs)/quiz');
        })
            .catch((err) => {
            console.warn('[StepComplete] graduateToPractice failed', err);
            setIsGraduating(false);
            // 졸업 저장 실패해도 홈으로 이동 — quiz-hub에서 재시도 가능
            resetSession();
            expo_router_1.router.replace('/(tabs)/quiz');
        });
    }, [stepKey, isGraduating, resetSession, graduateToPractice]);
    const onDismissCallback = (0, react_1.useCallback)(() => {
        expo_router_1.router.replace('/(tabs)/quiz');
    }, []);
    const onDismiss = stepKey === 'practice' ? onDismissCallback : undefined;
    return { stepKey, onContinue, onDismiss, isGraduating };
}
