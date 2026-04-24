"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestReviewFeedback = requestReviewFeedback;
// features/quiz/review-feedback.ts
const env_1 = require("../../constants/env");
async function requestReviewFeedback(input) {
    if (!env_1.reviewFeedbackUrl) {
        throw new Error('Review feedback endpoint is not configured');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env_1.reviewFeedbackTimeoutMs);
    try {
        const response = await fetch(env_1.reviewFeedbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const errorMsg = (payload && typeof payload.error === 'string' && payload.error) ||
                `Review feedback request failed (HTTP ${response.status})`;
            throw new Error(errorMsg);
        }
        if (!payload || typeof payload.replyText !== 'string' || !payload.replyText.trim()) {
            throw new Error('Review feedback returned empty or invalid response');
        }
        return { replyText: payload.replyText.trim() };
    }
    finally {
        clearTimeout(timeoutId);
    }
}
