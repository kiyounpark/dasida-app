"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseLearningHistoryRepository = void 0;
const firebase_learning_history_api_1 = require("./firebase-learning-history-api");
const history_repository_1 = require("./history-repository");
const local_learning_history_repository_1 = require("./local-learning-history-repository");
class FirebaseLearningHistoryRepository {
    dependencies;
    cache = new local_learning_history_repository_1.LocalLearningHistoryRepository();
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    logCacheFallback(operation, error) {
        console.warn(`[FirebaseLearningHistoryRepository] Falling back to local cache for ${operation}.`, error);
    }
    async getRemoteAuthContext(accountKey, options) {
        return this.dependencies.authClient.getRemoteAuthContext(accountKey, options);
    }
    async withAuthorizedRequest(accountKey, run) {
        const authContext = await this.getRemoteAuthContext(accountKey);
        try {
            return await run((0, firebase_learning_history_api_1.createRemoteAuthHeaders)(authContext), authContext);
        }
        catch (error) {
            if (authContext.kind === 'firebase' &&
                error instanceof firebase_learning_history_api_1.LearningHistoryApiError &&
                error.code === 'UNAUTHORIZED') {
                const refreshedAuthContext = await this.getRemoteAuthContext(accountKey, {
                    forceRefresh: true,
                });
                return run((0, firebase_learning_history_api_1.createRemoteAuthHeaders)(refreshedAuthContext), refreshedAuthContext);
            }
            throw error;
        }
    }
    async recordAttempt(input) {
        try {
            const payload = await this.withAuthorizedRequest(input.accountKey, (headers) => (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(this.dependencies.recordLearningAttemptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({
                    attempt: input,
                }),
            }, 1));
            await this.cache.cacheRecord(payload);
            return payload;
        }
        catch (error) {
            if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                this.logCacheFallback('recordAttempt', error);
                return this.cache.recordAttempt(input);
            }
            throw error;
        }
    }
    async loadCurrentSummary(accountKey) {
        try {
            const payload = await this.withAuthorizedRequest(accountKey, (headers) => (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(`${this.dependencies.getLearnerSummaryUrl}?accountKey=${encodeURIComponent(accountKey)}`, {
                method: 'GET',
                headers,
            }, 1));
            if (payload.summary) {
                await this.cache.cacheSummary(accountKey, payload.summary);
                return payload.summary;
            }
            // Server returned null (eventual consistency — e.g. just after recordAttempt POST).
            // Fall back to local cache which may have correct data from a recent cacheRecord.
            const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
            if (cachedSummary) {
                return cachedSummary;
            }
            return null;
        }
        catch (error) {
            if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                this.logCacheFallback('loadCurrentSummary', error);
                const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
                if (cachedSummary) {
                    return cachedSummary;
                }
                return (0, history_repository_1.createEmptyLearnerSummary)(accountKey);
            }
            throw error;
        }
    }
    async saveFeaturedExamState(accountKey, state) {
        try {
            const payload = await this.withAuthorizedRequest(accountKey, (headers) => (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(this.dependencies.saveFeaturedExamStateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({
                    accountKey,
                    state,
                }),
            }, 1));
            await this.cache.cacheSummary(accountKey, payload.summary);
            return payload.summary;
        }
        catch (error) {
            if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                this.logCacheFallback('saveFeaturedExamState', error);
                return this.cache.saveFeaturedExamState(accountKey, state);
            }
            throw error;
        }
    }
    async listAttempts(accountKey, options) {
        try {
            const searchParams = new URLSearchParams({
                accountKey,
            });
            if (options?.source) {
                searchParams.set('source', options.source);
            }
            if (typeof options?.limit === 'number') {
                searchParams.set('limit', String(options.limit));
            }
            const payload = await this.withAuthorizedRequest(accountKey, (headers) => (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(`${this.dependencies.listLearningAttemptsUrl}?${searchParams.toString()}`, {
                method: 'GET',
                headers,
            }, 1));
            await this.cache.cacheAttempts(accountKey, payload.attempts);
            return payload.attempts;
        }
        catch (error) {
            if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                this.logCacheFallback('listAttempts', error);
                return this.cache.listAttempts(accountKey, options);
            }
            throw error;
        }
    }
    async listAttemptResults(accountKey, attemptId) {
        try {
            const payload = await this.withAuthorizedRequest(accountKey, (headers) => (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(`${this.dependencies.getLearningAttemptResultsUrl}?accountKey=${encodeURIComponent(accountKey)}&attemptId=${encodeURIComponent(attemptId)}`, {
                method: 'GET',
                headers,
            }, 1));
            await this.cache.cacheAttemptResults(accountKey, attemptId, payload.results);
            return payload.results;
        }
        catch (error) {
            if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                this.logCacheFallback('listAttemptResults', error);
                return this.cache.listAttemptResults(accountKey, attemptId);
            }
            throw error;
        }
    }
    async listReviewTasks(accountKey) {
        try {
            const payload = await this.withAuthorizedRequest(accountKey, (headers) => (0, firebase_learning_history_api_1.readLearningHistoryApiJson)(`${this.dependencies.listReviewTasksUrl}?accountKey=${encodeURIComponent(accountKey)}`, {
                method: 'GET',
                headers,
            }, 1));
            await this.cache.cacheReviewTasks(accountKey, payload.reviewTasks);
            return payload.reviewTasks;
        }
        catch (error) {
            if ((0, firebase_learning_history_api_1.shouldUseLearningHistoryCacheFallback)(error)) {
                this.logCacheFallback('listReviewTasks', error);
                return this.cache.listReviewTasks(accountKey);
            }
            throw error;
        }
    }
}
exports.FirebaseLearningHistoryRepository = FirebaseLearningHistoryRepository;
