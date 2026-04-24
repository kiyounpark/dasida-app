"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningHistoryApiError = void 0;
exports.shouldUseLearningHistoryCacheFallback = shouldUseLearningHistoryCacheFallback;
exports.readLearningHistoryApiJson = readLearningHistoryApiJson;
exports.createRemoteAuthHeaders = createRemoteAuthHeaders;
const REQUEST_TIMEOUT_MS = 25000;
const NETWORK_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
class LearningHistoryApiError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'LearningHistoryApiError';
    }
}
exports.LearningHistoryApiError = LearningHistoryApiError;
function shouldUseLearningHistoryCacheFallback(error) {
    return (error instanceof LearningHistoryApiError &&
        (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || error.code === 'HTTP_ERROR'));
}
function isRetryableError(error) {
    return (error instanceof LearningHistoryApiError &&
        (error.code === 'NETWORK_ERROR' ||
            error.code === 'TIMEOUT' ||
            NETWORK_RETRYABLE_STATUS_CODES.has(error.status)));
}
async function parseErrorPayload(response, url) {
    const payload = await response.json().catch(() => null);
    const errorMessage = payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string' &&
        payload.error
        ? payload.error
        : `Request failed (${response.status})`;
    if (response.status === 400 && payload && typeof payload === 'object' && 'details' in payload) {
        console.warn(`[LearningHistoryApi] 400 validation details (${url}):`, JSON.stringify(payload.details));
    }
    if (response.status === 401 || response.status === 403) {
        throw new LearningHistoryApiError(errorMessage, response.status, 'UNAUTHORIZED');
    }
    throw new LearningHistoryApiError(errorMessage, response.status, 'HTTP_ERROR');
}
function createTimeoutController(timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return {
        controller,
        clear: () => clearTimeout(timeoutId),
    };
}
async function wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
async function readLearningHistoryApiJson(url, options, retries = 1) {
    const { controller, clear } = createTimeoutController();
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        if (!response.ok) {
            await parseErrorPayload(response, url);
        }
        const payload = await response.json().catch(() => null);
        if (!payload) {
            throw new LearningHistoryApiError('Empty response payload', response.status, 'HTTP_ERROR');
        }
        return payload;
    }
    catch (error) {
        if (error instanceof LearningHistoryApiError) {
            if (retries > 0 && isRetryableError(error)) {
                await wait(300);
                return readLearningHistoryApiJson(url, options, retries - 1);
            }
            throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
            const timeoutError = new LearningHistoryApiError('요청 시간이 초과되었어요. 잠시 후 다시 시도해 주세요.', 0, 'TIMEOUT');
            if (retries > 0) {
                await wait(300);
                return readLearningHistoryApiJson(url, options, retries - 1);
            }
            throw timeoutError;
        }
        const networkError = new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR');
        if (retries > 0) {
            await wait(300);
            return readLearningHistoryApiJson(url, options, retries - 1);
        }
        throw networkError;
    }
    finally {
        clear();
    }
}
function createRemoteAuthHeaders(authContext) {
    const headers = {
        'x-dasida-account-key': authContext.accountKey,
    };
    if (authContext.kind === 'firebase') {
        headers.Authorization = `Bearer ${authContext.idToken}`;
        return headers;
    }
    headers['x-dasida-session-secret'] = authContext.requestSecret;
    return headers;
}
