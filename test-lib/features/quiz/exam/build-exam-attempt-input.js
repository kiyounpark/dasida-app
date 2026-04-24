"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExamAttemptInput = buildExamAttemptInput;
function buildExamAttemptInput(params) {
    const { profile, result, session } = params;
    return {
        attemptId: result.attemptId,
        accountKey: session.accountKey,
        learnerId: profile.learnerId,
        source: 'featured-exam',
        sourceEntityId: result.examId,
        gradeSnapshot: profile.grade,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        questionCount: result.total,
        correctCount: result.correct,
        wrongCount: result.wrong,
        accuracy: result.accuracy,
        primaryWeaknessId: null,
        topWeaknesses: [],
        questions: result.perProblem.map((p) => ({
            questionId: `${result.examId}/${p.number}`,
            questionNumber: p.number,
            topic: 'exam',
            selectedIndex: p.userAnswer,
            isCorrect: p.isCorrect,
            finalWeaknessId: null,
            methodId: null,
            diagnosisSource: null,
            finalMethodSource: null,
            diagnosisCompleted: false,
            usedDontKnow: false,
            usedAiHelp: false,
        })),
    };
}
