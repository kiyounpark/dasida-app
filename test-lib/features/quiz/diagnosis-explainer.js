"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestDiagnosisExplanation = requestDiagnosisExplanation;
const env_1 = require("../../constants/env");
async function requestDiagnosisExplanation(input) {
    if (!env_1.diagnosisExplainUrl) {
        throw new Error('Diagnosis explain endpoint is not configured');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env_1.diagnosisExplainTimeoutMs);
    try {
        const response = await fetch(env_1.diagnosisExplainUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || typeof payload.replyText !== 'string' || !payload.replyText.trim()) {
            throw new Error((payload && typeof payload.error === 'string' && payload.error) ||
                'Failed to fetch diagnosis explanation');
        }
        return {
            replyText: payload.replyText.trim(),
            source: 'openai-explainer',
        };
    }
    finally {
        clearTimeout(timeoutId);
    }
}
