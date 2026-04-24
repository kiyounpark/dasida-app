"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExamResultScreen = useExamResultScreen;
const expo_router_1 = require("expo-router");
const react_1 = require("react");
const provider_1 = require("@/features/learner/provider");
const exam_catalog_1 = require("../../../../features/quiz/data/exam-catalog");
const exam_problems_1 = require("../../../../features/quiz/data/exam-problems");
const build_exam_attempt_input_1 = require("../build-exam-attempt-input");
const exam_diagnosis_progress_1 = require("../exam-diagnosis-progress");
const exam_session_1 = require("../exam-session");
function useExamResultScreen() {
    const { state, resetExam } = (0, exam_session_1.useExamSession)();
    const { profile, recordAttempt, session } = (0, provider_1.useCurrentLearner)();
    const [saveState, setSaveState] = (0, react_1.useState)('idle');
    const [diagnosedProblems, setDiagnosedProblems] = (0, react_1.useState)({});
    const saveAttempted = (0, react_1.useRef)(false);
    const result = state.result;
    const examTitle = result ? (exam_catalog_1.EXAM_CATALOG_BY_ID[result.examId]?.title ?? result.examId) : '';
    const examProblems = (0, react_1.useMemo)(() => (result ? (0, exam_problems_1.getExamProblems)(result.examId) : []), [result]);
    // 결과 저장 (최초 1회)
    (0, react_1.useEffect)(() => {
        if (!result || !profile || !session)
            return;
        if (saveAttempted.current)
            return;
        saveAttempted.current = true;
        setSaveState('saving');
        recordAttempt((0, build_exam_attempt_input_1.buildExamAttemptInput)({ session, profile, result }))
            .then(() => setSaveState('saved'))
            .catch(() => setSaveState('error'));
    }, [result, profile, session, recordAttempt]);
    // 포커스 시 진단 진행 상태 갱신
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(() => {
        if (!result)
            return;
        (0, exam_diagnosis_progress_1.getDiagnosisProgress)(result.examId).then(setDiagnosedProblems);
    }, [result]));
    // 문제 타일 계산
    const problemTiles = result
        ? result.perProblem
            .filter((p) => !p.isCorrect)
            .sort((a, b) => {
            const aBlank = a.userAnswer === null;
            const bBlank = b.userAnswer === null;
            if (aBlank !== bBlank)
                return aBlank ? 1 : -1;
            const aScore = examProblems.find((ep) => ep.number === a.number)?.score ?? 0;
            const bScore = examProblems.find((ep) => ep.number === b.number)?.score ?? 0;
            return bScore - aScore;
        })
            .map((p) => {
            const ep = examProblems.find((e) => e.number === p.number);
            return {
                number: p.number,
                topic: ep?.topic ?? '문제',
                score: ep?.score ?? 0,
                status: p.userAnswer === null
                    ? 'blank'
                    : diagnosedProblems[p.number]
                        ? 'done'
                        : 'undone',
            };
        })
        : [];
    const wrongCount = result
        ? result.perProblem.filter((p) => !p.isCorrect && p.userAnswer !== null).length
        : 0;
    const diagnosedCount = Object.keys(diagnosedProblems).length;
    return {
        result,
        examTitle,
        saveState,
        problemTiles,
        diagnosedCount,
        wrongCount,
        onAnalyzeProblem: (problemNumber) => {
            if (!result)
                return;
            const wrongProblemNumbers = result.perProblem
                .filter((p) => !p.isCorrect && p.userAnswer !== null)
                .map((p) => p.number);
            const startIndex = wrongProblemNumbers.indexOf(problemNumber);
            expo_router_1.router.push({
                pathname: '/quiz/exam/diagnosis-session',
                params: {
                    examId: result.examId,
                    wrongProblemNumbers: JSON.stringify(wrongProblemNumbers),
                    startIndex: String(Math.max(0, startIndex)),
                },
            });
        },
        onReturnHome: () => {
            resetExam();
            expo_router_1.router.replace('/quiz');
        },
    };
}
