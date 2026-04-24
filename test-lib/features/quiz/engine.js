"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialWeaknessScores = createInitialWeaknessScores;
exports.incrementWeaknessScore = incrementWeaknessScore;
exports.getTopWeaknesses = getTopWeaknesses;
exports.buildQuizResult = buildQuizResult;
const diagnosisMap_1 = require("../../data/diagnosisMap");
function createInitialWeaknessScores() {
    return diagnosisMap_1.weaknessOrder.reduce((acc, id) => {
        acc[id] = 0;
        return acc;
    }, {});
}
function incrementWeaknessScore(scores, weaknessId) {
    return {
        ...scores,
        [weaknessId]: scores[weaknessId] + 1,
    };
}
function getTopWeaknesses(scores, count) {
    const orderIndex = diagnosisMap_1.weaknessOrder.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
    }, {});
    return [...diagnosisMap_1.weaknessOrder]
        .sort((a, b) => {
        const scoreDiff = scores[b] - scores[a];
        if (scoreDiff !== 0)
            return scoreDiff;
        return orderIndex[a] - orderIndex[b];
    })
        .filter((id) => scores[id] > 0)
        .slice(0, count);
}
function buildQuizResult(attemptId, startedAt, completedAt, answers, weaknessScores, totalQuestions) {
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const wrong = totalQuestions - correct;
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const allCorrect = wrong === 0;
    const topWeaknesses = allCorrect ? [] : getTopWeaknesses(weaknessScores, 3);
    return {
        attemptId,
        startedAt,
        completedAt,
        total: totalQuestions,
        correct,
        wrong,
        accuracy,
        allCorrect,
        topWeaknesses,
    };
}
