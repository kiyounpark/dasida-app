"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDiagnosticAttemptInput = buildDiagnosticAttemptInput;
exports.buildWeaknessPracticeAttemptInput = buildWeaknessPracticeAttemptInput;
const problemData_1 = require("../../data/problemData");
const problemById = new Map(problemData_1.problemData.map((problem, index) => [
    problem.id,
    {
        topic: problem.topic,
        questionNumber: index + 1,
    },
]));
function buildDiagnosticAttemptInput(params) {
    const { answers, profile, result, session } = params;
    return {
        attemptId: result.attemptId,
        accountKey: session.accountKey,
        learnerId: profile.learnerId,
        source: 'diagnostic',
        sourceEntityId: null,
        gradeSnapshot: profile.grade,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        questionCount: result.total,
        correctCount: result.correct,
        wrongCount: result.wrong,
        accuracy: result.accuracy,
        primaryWeaknessId: result.topWeaknesses[0] ?? null,
        topWeaknesses: result.topWeaknesses,
        questions: answers.map((answer, index) => {
            const problem = problemById.get(answer.problemId);
            const finalWeaknessId = answer.weaknessId ?? answer.diagnosisDetailTrace?.finalWeaknessId ?? null;
            const diagnosisSource = answer.diagnosisRouting?.source ?? null;
            const finalMethodSource = answer.diagnosisRouting?.finalMethodSource ?? null;
            return {
                questionId: answer.problemId,
                questionNumber: problem?.questionNumber ?? index + 1,
                topic: problem?.topic ?? 'unknown',
                selectedIndex: answer.selectedIndex ?? null,
                isCorrect: answer.isCorrect,
                finalWeaknessId,
                methodId: answer.methodId ?? answer.diagnosisDetailTrace?.methodId ?? null,
                diagnosisSource,
                finalMethodSource,
                diagnosisCompleted: answer.isCorrect ? true : finalWeaknessId !== null,
                usedDontKnow: answer.diagnosisDetailTrace?.usedDontKnow ?? false,
                usedAiHelp: answer.diagnosisDetailTrace?.usedAiHelp ?? false,
            };
        }),
    };
}
function createWeaknessPracticeAttemptId(problemId, weaknessId, startedAt) {
    const startedAtKey = startedAt.replace(/[^\d]/g, '');
    return `weakness-practice-${weaknessId}-${problemId}-${startedAtKey}`;
}
function buildWeaknessPracticeAttemptInput(params) {
    const { completedAt, finalSelectedIndex, firstSelectedIndex, problemId, profile, resolvedBy, reviewContext, session, startedAt, weaknessId, weaknessLabel, wrongAttempts, } = params;
    const isCorrect = resolvedBy === 'solved';
    return {
        attemptId: createWeaknessPracticeAttemptId(problemId, weaknessId, startedAt),
        accountKey: session.accountKey,
        learnerId: profile.learnerId,
        source: 'weakness-practice',
        sourceEntityId: weaknessId,
        gradeSnapshot: profile.grade,
        startedAt,
        completedAt,
        questionCount: 1,
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
        accuracy: isCorrect ? 100 : 0,
        primaryWeaknessId: weaknessId,
        topWeaknesses: [weaknessId],
        reviewContext,
        questions: [
            {
                questionId: problemId,
                questionNumber: 1,
                topic: weaknessLabel,
                firstSelectedIndex,
                selectedIndex: finalSelectedIndex,
                isCorrect,
                finalWeaknessId: weaknessId,
                methodId: null,
                diagnosisSource: null,
                finalMethodSource: null,
                diagnosisCompleted: true,
                usedDontKnow: false,
                usedAiHelp: false,
                wrongAttempts,
                usedCoaching: wrongAttempts > 0,
                resolvedBy,
            },
        ],
    };
}
