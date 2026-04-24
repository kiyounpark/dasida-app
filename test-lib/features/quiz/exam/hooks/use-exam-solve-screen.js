"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExamSolveScreen = useExamSolveScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const react_native_1 = require("react-native");
const exam_problems_1 = require("../../../../features/quiz/data/exam-problems");
const exam_session_1 = require("../exam-session");
function useExamSolveScreen(examId) {
    const { state, initExam, setAnswer, goToNext, goToPrev, submitExam } = (0, exam_session_1.useExamSession)();
    const { width, height } = (0, react_native_1.useWindowDimensions)();
    const isCompactLayout = width < 390 || height < 780;
    const initialized = (0, react_1.useRef)(false);
    // 단답형 입력 로컬 상태 (문자열)
    const [shortAnswerText, setShortAnswerText] = (0, react_1.useState)('');
    const [bookmarkedIndices, setBookmarkedIndices] = (0, react_1.useState)([]);
    // 초기화: examId가 바뀌면 exam 로드
    (0, react_1.useEffect)(() => {
        if (initialized.current && state.examId === examId)
            return;
        const problems = (0, exam_problems_1.getExamProblems)(examId);
        if (problems.length === 0)
            return;
        initExam(examId, problems);
        setBookmarkedIndices([]);
        initialized.current = true;
    }, [examId, initExam, state.examId]);
    // 문제가 바뀌면 단답형 텍스트 동기화
    (0, react_1.useEffect)(() => {
        const currentAnswer = state.answers[state.currentIndex];
        if (state.problems[state.currentIndex]?.type === 'short_answer') {
            setShortAnswerText(currentAnswer !== null ? String(currentAnswer) : '');
        }
        else {
            setShortAnswerText('');
        }
    }, [state.currentIndex, state.answers, state.problems]);
    // 채점 완료 시 결과 화면으로
    (0, react_1.useEffect)(() => {
        if (state.isFinished && state.result) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expo_router_1.router.replace('/quiz/exam/result');
        }
    }, [state.isFinished, state.result]);
    const currentProblem = state.problems[state.currentIndex] ?? null;
    const currentAnswer = state.answers[state.currentIndex] ?? null;
    const answeredCount = state.answers.filter((a) => a !== null).length;
    const handleNext = () => {
        const isLast = state.currentIndex === state.problems.length - 1;
        if (isLast) {
            // onChangeShortAnswer가 이미 실시간으로 state.answers를 동기화하므로 직접 읽어도 정확
            const unanswered = state.answers.filter((a) => a === null).length;
            const total = state.problems.length;
            const msg = unanswered > 0
                ? `${unanswered}문제를 아직 답하지 않았습니다.\n채점하시겠습니까?`
                : `${total}문제를 모두 풀었습니다.\n채점하시겠습니까?`;
            react_native_1.Alert.alert('채점하기', msg, [
                { text: '취소', style: 'cancel' },
                { text: '채점하기', onPress: () => submitExam() },
            ]);
        }
        else {
            goToNext();
        }
    };
    const handlePrev = () => {
        goToPrev();
    };
    const handleSelectChoice = (n) => {
        setAnswer(state.currentIndex, n);
    };
    const handleExit = () => {
        react_native_1.Alert.alert('시험 나가기', '지금 나가면 풀이 내용이 사라집니다.', [
            { text: '계속 풀기', style: 'cancel' },
            {
                text: '나가기',
                style: 'destructive',
                onPress: () => expo_router_1.router.back(),
            },
        ]);
    };
    const answeredIndices = state.answers
        .map((a, i) => (a !== null ? i : null))
        .filter((i) => i !== null);
    const isCurrentBookmarked = bookmarkedIndices.includes(state.currentIndex);
    const handleToggleBookmark = () => {
        setBookmarkedIndices((prev) => prev.includes(state.currentIndex)
            ? prev.filter((i) => i !== state.currentIndex)
            : [...prev, state.currentIndex]);
    };
    const imageKey = currentProblem
        ? `${state.examId}/${currentProblem.number}`
        : '';
    return {
        examId: state.examId,
        currentProblem,
        currentIndex: state.currentIndex,
        totalCount: state.problems.length,
        answeredCount,
        answeredIndices,
        currentAnswer,
        shortAnswerText,
        isCompactLayout,
        canGoPrev: state.currentIndex > 0,
        isLast: state.currentIndex === state.problems.length - 1,
        imageKey,
        bookmarkedIndices,
        isCurrentBookmarked,
        onToggleBookmark: handleToggleBookmark,
        onSelectChoice: handleSelectChoice,
        onChangeShortAnswer: (text) => {
            setShortAnswerText(text);
            const num = parseInt(text, 10);
            setAnswer(state.currentIndex, text === '' ? null : isNaN(num) ? null : num);
        },
        onPrev: handlePrev,
        onNext: handleNext,
        onExit: handleExit,
    };
}
