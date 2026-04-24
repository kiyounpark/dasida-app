"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExamDiagnosisAttemptInput = buildExamDiagnosisAttemptInput;
function createAttemptId(examId, problemNumber) {
    return `exam-diag-${examId}-p${problemNumber}-${Date.now().toString(36)}`;
}
function buildExamDiagnosisAttemptInput(params) {
    const { session, profile, examId, problemNumber, topic, methodId, weaknessId, startedAt, completedAt, } = params;
    return {
        attemptId: createAttemptId(examId, problemNumber),
        accountKey: session.accountKey,
        learnerId: profile.learnerId,
        source: 'featured-exam',
        sourceEntityId: examId,
        gradeSnapshot: profile.grade,
        startedAt,
        completedAt,
        questionCount: 1,
        correctCount: 0,
        wrongCount: 1,
        accuracy: 0,
        primaryWeaknessId: weaknessId,
        topWeaknesses: [weaknessId],
        questions: [
            {
                questionId: `${examId}/${problemNumber}`,
                questionNumber: problemNumber,
                topic,
                selectedIndex: null,
                isCorrect: false,
                finalWeaknessId: weaknessId,
                methodId,
                diagnosisSource: 'manual-selection',
                finalMethodSource: 'manual',
                diagnosisCompleted: true,
                usedDontKnow: false,
                usedAiHelp: false,
            },
        ],
    };
}
