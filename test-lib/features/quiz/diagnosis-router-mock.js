"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDiagnosisMethodWithMock = analyzeDiagnosisMethodWithMock;
const diagnosis_method_routing_1 = require("../../data/diagnosis-method-routing");
async function analyzeDiagnosisMethodWithMock(input) {
    const candidates = Array.from(new Set([...input.allowedMethodIds, 'unknown']));
    const normalizedInput = input.rawText.replace(/\s+/g, '').toLowerCase();
    const scores = {};
    candidates.forEach((id) => {
        scores[id] = 0;
    });
    if (!normalizedInput) {
        return {
            predictedMethodId: 'unknown',
            confidence: 0,
            reason: 'Empty input text',
            needsManualSelection: true,
            candidateMethodIds: candidates,
            scores,
            source: 'mock-router',
        };
    }
    candidates.forEach((id) => {
        let score = 0;
        const catalog = diagnosis_method_routing_1.diagnosisMethodRoutingCatalog[id];
        if (catalog?.keywords) {
            catalog.keywords.forEach((keyword) => {
                const normalizedKeyword = keyword.replace(/\s+/g, '').toLowerCase();
                if (normalizedInput.includes(normalizedKeyword)) {
                    score += 1;
                }
            });
        }
        scores[id] = score;
    });
    const sorted = candidates
        .map((id) => ({ id, score: scores[id] ?? 0 }))
        .sort((a, b) => b.score - a.score);
    const top = sorted[0] ?? { id: 'unknown', score: 0 };
    const second = sorted[1] ?? { id: 'unknown', score: 0 };
    const gap = top.score - second.score;
    let confidence = 0;
    if (top.score > 0) {
        if (gap >= 2)
            confidence = 0.8;
        else if (gap === 1)
            confidence = 0.6;
        else
            confidence = 0.4;
    }
    const isHighConfidence = top.id !== 'unknown' && confidence >= 0.74 && gap >= 2;
    const reason = `top=${top.id}(${top.score}), 2nd=${second.id}(${second.score}), gap=${gap}, conf=${confidence.toFixed(2)}`;
    return {
        predictedMethodId: top.id,
        confidence,
        reason,
        needsManualSelection: !isHighConfidence,
        candidateMethodIds: sorted.map(({ id }) => id),
        scores,
        source: 'mock-router',
    };
}
