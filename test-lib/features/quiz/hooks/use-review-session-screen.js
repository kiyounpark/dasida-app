"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReviewSessionScreen = useReviewSessionScreen;
// features/quiz/hooks/use-review-session-screen.ts
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const review_content_map_1 = require("../../../data/review-content-map");
const review_scheduler_1 = require("../../../features/learning/review-scheduler");
const review_task_store_1 = require("../../../features/learning/review-task-store");
const review_notification_scheduler_1 = require("../../../features/quiz/notifications/review-notification-scheduler");
const provider_1 = require("@/features/learner/provider");
const get_single_param_1 = require("../../../utils/get-single-param");
const review_feedback_1 = require("../../../features/quiz/review-feedback");
const store = new review_task_store_1.LocalReviewTaskStore();
function useReviewSessionScreen() {
    const params = (0, expo_router_1.useLocalSearchParams)();
    const taskId = (0, get_single_param_1.getSingleParam)(params.taskId) ?? '';
    const { session, refresh, profile, recordAttempt } = (0, provider_1.useCurrentLearner)();
    const accountKey = session?.accountKey ?? '';
    const [task, setTask] = (0, react_1.useState)(null);
    const [steps, setSteps] = (0, react_1.useState)([]);
    const [currentStepIndex, setCurrentStepIndex] = (0, react_1.useState)(0);
    const [stepPhase, setStepPhase] = (0, react_1.useState)('input');
    const [selectedChoiceIndex, setSelectedChoiceIndex] = (0, react_1.useState)(null);
    const [userText, setUserText] = (0, react_1.useState)('');
    const [chatMessages, setChatMessages] = (0, react_1.useState)([]);
    const [chatText, setChatText] = (0, react_1.useState)('');
    const [isLoadingFeedback, setIsLoadingFeedback] = (0, react_1.useState)(false);
    const [sessionComplete, setSessionComplete] = (0, react_1.useState)(false);
    const isFetchingRef = (0, react_1.useRef)(false);
    const sessionStartedAtRef = (0, react_1.useRef)(new Date().toISOString());
    const firstAttemptCorrectRef = (0, react_1.useRef)([]);
    // task 로드
    (0, react_1.useEffect)(() => {
        if (!accountKey || !taskId) {
            return;
        }
        // DEV: 스크린샷용 목업 태스크 (taskId='__mock__'일 때만 활성화)
        if (taskId === '__mock__') {
            const mockTask = {
                id: '__mock__',
                accountKey,
                weaknessId: 'formula_understanding',
                source: 'diagnostic',
                sourceId: '__mock__',
                scheduledFor: new Date().toISOString(),
                stage: 'day1',
                completed: false,
                createdAt: new Date().toISOString(),
            };
            setTask(mockTask);
            setSteps((0, review_content_map_1.getReviewThinkingSteps)(mockTask.weaknessId));
            firstAttemptCorrectRef.current = new Array((0, review_content_map_1.getReviewThinkingSteps)(mockTask.weaknessId).length).fill(null);
            sessionStartedAtRef.current = new Date().toISOString();
            return;
        }
        let cancelled = false;
        store.load(accountKey).then((tasks) => {
            if (cancelled)
                return;
            const found = tasks.find((t) => t.id === taskId) ?? null;
            setTask(found);
            if (found) {
                setSteps((0, review_content_map_1.getReviewThinkingSteps)(found.weaknessId));
                firstAttemptCorrectRef.current = new Array((0, review_content_map_1.getReviewThinkingSteps)(found.weaknessId).length).fill(null);
                sessionStartedAtRef.current = new Date().toISOString();
            }
        });
        return () => {
            cancelled = true;
        };
    }, [accountKey, taskId]);
    const resetStepState = () => {
        setSelectedChoiceIndex(null);
        setUserText('');
        setChatMessages([]);
        setChatText('');
        setStepPhase('input');
    };
    const onSelectChoice = (index) => {
        setSelectedChoiceIndex(index);
        if (stepPhase === 'input' && firstAttemptCorrectRef.current[currentStepIndex] === null) {
            const isCorrect = steps[currentStepIndex]?.choices[index]?.correct ?? false;
            firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
        }
    };
    const onChangeText = (text) => {
        setUserText(text);
    };
    const onChangeChatText = (text) => {
        setChatText(text);
    };
    const onPressNext = async () => {
        if (isFetchingRef.current)
            return;
        const step = steps[currentStepIndex];
        if (!step || !task)
            return;
        const hasChoice = selectedChoiceIndex !== null;
        const hasText = userText.trim().length > 0;
        if (!hasChoice && !hasText)
            return;
        // 첫 번째 user 메시지 조합
        const parts = [];
        if (hasChoice)
            parts.push(`선택: ${step.choices[selectedChoiceIndex]?.text ?? ''}`);
        if (hasText)
            parts.push(hasChoice ? `직접 쓴 내용: ${userText.trim()}` : userText.trim());
        const firstUserContent = parts.join('\n');
        const firstUserEntry = { role: 'user', text: firstUserContent };
        isFetchingRef.current = true;
        setIsLoadingFeedback(true);
        setChatMessages([firstUserEntry]);
        setStepPhase('chat');
        try {
            const apiMessages = [{ role: 'user', content: firstUserContent }];
            const result = await (0, review_feedback_1.requestReviewFeedback)({
                weaknessId: task.weaknessId,
                stepTitle: step.title,
                stepBody: step.body,
                messages: apiMessages,
            });
            setChatMessages([firstUserEntry, { role: 'ai', text: result.replyText }]);
        }
        catch {
            // 에러 시 AI 응답 없이 계속 진행 가능
        }
        finally {
            isFetchingRef.current = false;
            setIsLoadingFeedback(false);
        }
    };
    const onSendChatMessage = async () => {
        if (isFetchingRef.current || !chatText.trim() || !task)
            return;
        const step = steps[currentStepIndex];
        if (!step)
            return;
        const userInput = chatText.trim();
        const newUserEntry = { role: 'user', text: userInput };
        const allMessages = [...chatMessages, newUserEntry];
        setChatMessages(allMessages);
        setChatText('');
        isFetchingRef.current = true;
        setIsLoadingFeedback(true);
        try {
            const apiMessages = allMessages.map((m) => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text,
            }));
            const result = await (0, review_feedback_1.requestReviewFeedback)({
                weaknessId: task.weaknessId,
                stepTitle: step.title,
                stepBody: step.body,
                messages: apiMessages,
            });
            setChatMessages([...allMessages, { role: 'ai', text: result.replyText }]);
        }
        catch {
            // 에러 시 사용자 메시지만 보임, 계속 진행 가능
        }
        finally {
            isFetchingRef.current = false;
            setIsLoadingFeedback(false);
        }
    };
    const onPressContinue = () => {
        if (!task || steps.length === 0) {
            return;
        }
        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= steps.length) {
            setSessionComplete(true);
        }
        else {
            setCurrentStepIndex(nextIndex);
            resetStepState();
        }
    };
    const onPressRemember = async () => {
        if (!task || !profile) {
            return;
        }
        const completedAt = new Date().toISOString();
        const results = firstAttemptCorrectRef.current;
        const questionCount = steps.length;
        const correctCount = results.filter((r) => r === true).length;
        const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 100;
        try {
            await recordAttempt({
                attemptId: `review-${task.id}-${Date.now().toString(36)}`,
                accountKey,
                learnerId: profile.learnerId,
                source: 'weakness-practice',
                sourceEntityId: task.sourceId,
                gradeSnapshot: profile.grade,
                startedAt: sessionStartedAtRef.current,
                completedAt,
                questionCount,
                correctCount,
                wrongCount: results.filter((r) => r === false).length,
                accuracy,
                primaryWeaknessId: task.weaknessId,
                topWeaknesses: [task.weaknessId],
                reviewContext: {
                    reviewTaskId: task.id,
                    reviewStage: task.stage,
                },
                questions: steps.map((step, i) => ({
                    questionId: `${task.id}-step-${i}`,
                    questionNumber: i + 1,
                    topic: step.title,
                    selectedIndex: null,
                    isCorrect: results[i] ?? false,
                    finalWeaknessId: task.weaknessId,
                    methodId: null,
                    diagnosisSource: null,
                    finalMethodSource: null,
                    diagnosisCompleted: true,
                    usedDontKnow: false,
                    usedAiHelp: false,
                })),
            });
        }
        catch (error) {
            console.warn('Failed to record review attempt', error);
        }
        try {
            await (0, review_scheduler_1.completeReviewTask)(accountKey, task.id, store);
            void (0, review_notification_scheduler_1.rescheduleAllReviewNotifications)(accountKey, store).catch(console.warn);
            await refresh();
        }
        catch (error) {
            console.warn('Failed to complete review task', error);
        }
        expo_router_1.router.back();
    };
    const onPressRetry = async () => {
        if (!task) {
            return;
        }
        try {
            await (0, review_scheduler_1.rescheduleReviewTask)(accountKey, task.id, store);
            void (0, review_notification_scheduler_1.rescheduleAllReviewNotifications)(accountKey, store).catch(console.warn);
            await refresh();
        }
        catch (error) {
            console.warn('Failed to reschedule review task', error);
        }
        expo_router_1.router.back();
    };
    const hasInput = selectedChoiceIndex !== null || userText.trim().length > 0;
    return {
        task,
        steps,
        currentStepIndex,
        stepPhase,
        selectedChoiceIndex,
        userText,
        chatMessages,
        chatText,
        isLoadingFeedback,
        sessionComplete,
        hasInput,
        onBack: expo_router_1.router.back,
        onSelectChoice,
        onChangeText,
        onPressNext,
        onChangeChatText,
        onSendChatMessage,
        onPressContinue,
        onPressRemember,
        onPressRetry,
    };
}
