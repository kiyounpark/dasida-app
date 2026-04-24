"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDiagnosisMethod = analyzeDiagnosisMethod;
const env_1 = require("../../constants/env");
const diagnosis_router_mock_1 = require("./diagnosis-router-mock");
const HIGH_CONFIDENCE_THRESHOLD = 0.74;
function sanitizeMethodId(candidate, allowedMethodIds) {
    if (typeof candidate !== 'string') {
        return 'unknown';
    }
    return allowedMethodIds.includes(candidate) ? candidate : 'unknown';
}
function sanitizeCandidateMethodIds(candidateMethodIds, allowedMethodIds, predictedMethodId) {
    const next = new Set();
    if (predictedMethodId !== 'unknown') {
        next.add(predictedMethodId);
    }
    if (Array.isArray(candidateMethodIds)) {
        candidateMethodIds.forEach((candidate) => {
            const methodId = sanitizeMethodId(candidate, allowedMethodIds);
            if (methodId !== 'unknown') {
                next.add(methodId);
            }
        });
    }
    if (next.size === 0) {
        next.add('unknown');
    }
    return Array.from(next);
}
function parseRemoteDiagnosisResponse(payload, allowedMethodIds) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const response = payload;
    const predictedMethodId = sanitizeMethodId(response.predictedMethodId, allowedMethodIds);
    const confidence = typeof response.confidence === 'number' && Number.isFinite(response.confidence)
        ? Math.max(0, Math.min(1, response.confidence))
        : 0;
    const reason = typeof response.reason === 'string' && response.reason.trim()
        ? response.reason.trim()
        : 'OpenAI router response';
    const candidateMethodIds = sanitizeCandidateMethodIds(response.candidateMethodIds, allowedMethodIds, predictedMethodId);
    const needsManualSelection = predictedMethodId === 'unknown' || confidence < HIGH_CONFIDENCE_THRESHOLD;
    return {
        predictedMethodId,
        confidence,
        reason,
        needsManualSelection,
        candidateMethodIds,
        source: 'openai-router',
    };
}
function mergeCandidateMethodIds(allowedMethodIds, results) {
    const merged = new Set();
    results.forEach((result) => {
        if (!result) {
            return;
        }
        if (result.predictedMethodId !== 'unknown') {
            merged.add(result.predictedMethodId);
        }
        result.candidateMethodIds.forEach((candidateMethodId) => {
            if (candidateMethodId !== 'unknown') {
                merged.add(candidateMethodId);
            }
        });
    });
    const validCandidateCount = () => Array.from(merged).filter((methodId) => methodId !== 'unknown').length;
    allowedMethodIds.forEach((methodId) => {
        if (methodId !== 'unknown' && validCandidateCount() < 2) {
            merged.add(methodId);
        }
    });
    if (validCandidateCount() === 0) {
        merged.add('unknown');
    }
    return Array.from(merged);
}
function buildManualSelectionResult(input, remoteResult, mockResult) {
    const candidateMethodIds = mergeCandidateMethodIds(input.allowedMethodIds, [remoteResult, mockResult]);
    const predictedMethodId = candidateMethodIds[0] ?? 'unknown';
    return {
        predictedMethodId,
        confidence: Math.max(remoteResult?.confidence ?? 0, mockResult.confidence),
        reason: remoteResult?.reason ?? mockResult.reason,
        needsManualSelection: true,
        candidateMethodIds,
        source: remoteResult?.source ?? mockResult.source,
        scores: mockResult.scores,
    };
}
async function requestOpenAiDiagnosis(input) {
    if (!env_1.diagnosisRouterUrl) {
        return null;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env_1.diagnosisRouterTimeoutMs);
    try {
        const response = await fetch(env_1.diagnosisRouterUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
            signal: controller.signal,
        });
        if (!response.ok) {
            return null;
        }
        const payload = await response.json();
        return parseRemoteDiagnosisResponse(payload, input.allowedMethodIds);
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
async function analyzeDiagnosisMethod(input) {
    if (!input.rawText.trim()) {
        return (0, diagnosis_router_mock_1.analyzeDiagnosisMethodWithMock)(input);
    }
    const remoteResult = await requestOpenAiDiagnosis(input);
    if (remoteResult && !remoteResult.needsManualSelection) {
        return remoteResult;
    }
    const mockResult = await (0, diagnosis_router_mock_1.analyzeDiagnosisMethodWithMock)(input);
    if (!remoteResult) {
        return mockResult;
    }
    if (!mockResult.needsManualSelection) {
        return mockResult;
    }
    return buildManualSelectionResult(input, remoteResult, mockResult);
}
