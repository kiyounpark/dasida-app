"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExamDiagnosisSession = useExamDiagnosisSession;
// features/quiz/exam/hooks/use-exam-diagnosis-session.ts
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const exam_session_1 = require("../exam-session");
function useExamDiagnosisSession({ examId, wrongProblemNumbers, startIndex, }) {
    const { state } = (0, exam_session_1.useExamSession)();
    const [activeProblemIndex, setActiveProblemIndex] = (0, react_1.useState)(startIndex);
    // Ref always reflects current value — readable by stale closures at call time
    const activeProblemIndexRef = (0, react_1.useRef)(activeProblemIndex);
    activeProblemIndexRef.current = activeProblemIndex;
    const [diagnosedIndices, setDiagnosedIndices] = (0, react_1.useState)([]);
    const pagerRef = (0, react_1.useRef)(null);
    const total = wrongProblemNumbers.length;
    const getUserAnswer = (0, react_1.useCallback)((problemNumber) => {
        const perProblem = state.result?.perProblem ?? [];
        return perProblem.find((p) => p.number === problemNumber)?.userAnswer ?? 0;
    }, [state.result]);
    const getNextProblemNumber = (0, react_1.useCallback)((currentIndex) => {
        const nextIndex = currentIndex + 1;
        return nextIndex < total ? (wrongProblemNumbers[nextIndex] ?? null) : null;
    }, [total, wrongProblemNumbers]);
    const scrollToIndex = (0, react_1.useCallback)((index) => {
        // Phone: FlatList slides with animation. Tablet: pagerRef is null (no FlatList),
        // but setActiveProblemIndex below re-keys the single ExamDiagnosisPage, triggering re-mount.
        pagerRef.current?.scrollToIndex({ index, animated: true });
        setActiveProblemIndex(index);
    }, []);
    const onDotPress = (0, react_1.useCallback)((index) => {
        scrollToIndex(index);
    }, [scrollToIndex]);
    // 스와이프로 페이지 변경 시 — 상태만 업데이트, scrollToIndex 호출 금지 (무한 루프 방지)
    const onSwipeEnd = (0, react_1.useCallback)((index) => {
        setActiveProblemIndex(index);
    }, []);
    const onComplete = (0, react_1.useCallback)((problemIndex) => {
        setDiagnosedIndices((prev) => prev.includes(problemIndex) ? prev : [...prev, problemIndex]);
    }, []);
    const onScrollToNext = (0, react_1.useCallback)((fromIndex) => {
        const nextIndex = fromIndex + 1;
        if (nextIndex < total) {
            scrollToIndex(nextIndex);
        }
    }, [total, scrollToIndex]);
    const onBackToResult = (0, react_1.useCallback)(() => {
        expo_router_1.router.back();
    }, []);
    const progressPercent = total > 0 ? ((activeProblemIndex + 1) / total) * 100 : 0;
    return {
        examId,
        wrongProblemNumbers,
        activeProblemIndex,
        activeProblemIndexRef,
        diagnosedIndices,
        pagerRef,
        progressLabel: `${activeProblemIndex + 1} / ${total}`,
        progressPercent,
        getUserAnswer,
        getNextProblemNumber,
        onDotPress,
        onSwipeEnd,
        onComplete,
        onScrollToNext,
        onBackToResult,
    };
}
