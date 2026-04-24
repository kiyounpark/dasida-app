"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningHistoryRepositoryRouter = void 0;
class LearningHistoryRepositoryRouter {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async resolveRepository(accountKey) {
        const session = await this.dependencies.authClient.loadSession();
        if (!session) {
            throw new Error('Authentication is required before accessing learning history.');
        }
        if (accountKey && session.accountKey !== accountKey) {
            throw new Error('Learning history repository account mismatch.');
        }
        if (session.status === 'authenticated') {
            if (!this.dependencies.remoteRepository) {
                throw new Error('Remote learning history is not configured for authenticated users.');
            }
            return this.dependencies.remoteRepository;
        }
        return this.dependencies.localRepository;
    }
    async recordAttempt(input) {
        return (await this.resolveRepository(input.accountKey)).recordAttempt(input);
    }
    async loadCurrentSummary(accountKey) {
        return (await this.resolveRepository(accountKey)).loadCurrentSummary(accountKey);
    }
    async saveFeaturedExamState(accountKey, state) {
        return (await this.resolveRepository(accountKey)).saveFeaturedExamState(accountKey, state);
    }
    async listAttempts(accountKey, options) {
        return (await this.resolveRepository(accountKey)).listAttempts(accountKey, options);
    }
    async listAttemptResults(accountKey, attemptId) {
        return (await this.resolveRepository(accountKey)).listAttemptResults(accountKey, attemptId);
    }
    async listReviewTasks(accountKey) {
        return (await this.resolveRepository(accountKey)).listReviewTasks(accountKey);
    }
}
exports.LearningHistoryRepositoryRouter = LearningHistoryRepositoryRouter;
