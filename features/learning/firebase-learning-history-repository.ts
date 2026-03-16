import type { AuthClient } from '@/features/auth/auth-client';
import type { FeaturedExamState } from '@/features/learner/types';

import type { LearningSource } from './history-types';
import {
  LearningHistoryApiError,
  createRemoteAuthHeaders,
  readLearningHistoryApiJson,
  shouldUseLearningHistoryCacheFallback,
} from './firebase-learning-history-api';
import { createEmptyLearnerSummary } from './history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';
import type {
  FinalizedAttemptInput,
  LearningHistoryRepository,
} from './history-repository';
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
  ReviewTask,
} from './types';

type Dependencies = {
  authClient: AuthClient;
  recordLearningAttemptUrl: string;
  getLearnerSummaryUrl: string;
  saveFeaturedExamStateUrl: string;
  listLearningAttemptsUrl: string;
  getLearningAttemptResultsUrl: string;
};

export class FirebaseLearningHistoryRepository implements LearningHistoryRepository {
  private readonly cache = new LocalLearningHistoryRepository();

  constructor(private readonly dependencies: Dependencies) {}

  private async getRemoteAuthContext(accountKey?: string, options?: { forceRefresh?: boolean }) {
    return this.dependencies.authClient.getRemoteAuthContext(accountKey, options);
  }

  private async withAuthorizedRequest<T>(
    accountKey: string,
    run: (
      headers: Record<string, string>,
      authContext: Awaited<ReturnType<typeof this.getRemoteAuthContext>>,
    ) => Promise<T>,
  ) {
    const authContext = await this.getRemoteAuthContext(accountKey);

    try {
      return await run(createRemoteAuthHeaders(authContext), authContext);
    } catch (error) {
      if (
        authContext.kind === 'firebase' &&
        error instanceof LearningHistoryApiError &&
        error.code === 'UNAUTHORIZED'
      ) {
        const refreshedAuthContext = await this.getRemoteAuthContext(accountKey, {
          forceRefresh: true,
        });
        return run(createRemoteAuthHeaders(refreshedAuthContext), refreshedAuthContext);
      }

      throw error;
    }
  }

  async recordAttempt(input: FinalizedAttemptInput) {
    try {
      const payload = await this.withAuthorizedRequest(input.accountKey, (headers) =>
        readLearningHistoryApiJson<{
          attempt: LearningAttempt;
          results: LearningAttemptResult[];
          summary: LearnerSummaryCurrent;
          reviewTasks: ReviewTask[];
        }>(
          this.dependencies.recordLearningAttemptUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify({
              attempt: input,
            }),
          },
          1,
        ),
      );
      await this.cache.cacheRecord(payload);
      return payload;
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        return this.cache.recordAttempt(input);
      }

      throw error;
    }
  }

  async loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null> {
    try {
      const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ summary: LearnerSummaryCurrent | null }>(
          `${this.dependencies.getLearnerSummaryUrl}?accountKey=${encodeURIComponent(accountKey)}`,
          {
            method: 'GET',
            headers,
          },
          1,
        ),
      );

      if (payload.summary) {
        await this.cache.cacheSummary(accountKey, payload.summary);
      } else {
        await this.cache.cacheSummary(accountKey, createEmptyLearnerSummary(accountKey));
      }

      return payload.summary;
    } catch (error) {
      if (!shouldUseLearningHistoryCacheFallback(error)) {
        throw error;
      }

      const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
      if (cachedSummary) {
        return cachedSummary;
      }

      throw error;
    }
  }

  async saveFeaturedExamState(
    accountKey: string,
    state: FeaturedExamState,
  ): Promise<LearnerSummaryCurrent> {
    try {
      const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ summary: LearnerSummaryCurrent }>(
          this.dependencies.saveFeaturedExamStateUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify({
              accountKey,
              state,
            }),
          },
          1,
        ),
      );

      await this.cache.cacheSummary(accountKey, payload.summary);
      return payload.summary;
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        return this.cache.saveFeaturedExamState(accountKey, state);
      }

      throw error;
    }
  }

  async listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]> {
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

      const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ attempts: LearningAttempt[] }>(
          `${this.dependencies.listLearningAttemptsUrl}?${searchParams.toString()}`,
          {
            method: 'GET',
            headers,
          },
          1,
        ),
      );

      await this.cache.cacheAttempts(accountKey, payload.attempts);
      return payload.attempts;
    } catch (error) {
      if (!shouldUseLearningHistoryCacheFallback(error)) {
        throw error;
      }

      const cachedAttempts = await this.cache.listAttempts(accountKey, options);
      if (cachedAttempts.length > 0) {
        return cachedAttempts;
      }

      throw error;
    }
  }

  async listAttemptResults(
    accountKey: string,
    attemptId: string,
  ): Promise<LearningAttemptResult[]> {
    try {
      const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ results: LearningAttemptResult[] }>(
          `${this.dependencies.getLearningAttemptResultsUrl}?accountKey=${encodeURIComponent(accountKey)}&attemptId=${encodeURIComponent(attemptId)}`,
          {
            method: 'GET',
            headers,
          },
          1,
        ),
      );

      await this.cache.cacheAttemptResults(accountKey, attemptId, payload.results);
      return payload.results;
    } catch (error) {
      if (!shouldUseLearningHistoryCacheFallback(error)) {
        throw error;
      }

      const cachedResults = await this.cache.listAttemptResults(accountKey, attemptId);
      if (cachedResults.length > 0) {
        return cachedResults;
      }

      throw error;
    }
  }
}
