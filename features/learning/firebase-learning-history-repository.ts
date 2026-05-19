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
import {
  MAX_ITEM_ATTEMPTS,
  bumpPendingAttemptCount,
  enqueuePendingAttempt,
  loadPendingAttempts,
  removePendingAttempt,
} from './pending-attempt-queue';
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
  listReviewTasksUrl: string;
};

export class FirebaseLearningHistoryRepository implements LearningHistoryRepository {
  private readonly cache = new LocalLearningHistoryRepository();
  private readonly flushingAccounts = new Set<string>();

  constructor(private readonly dependencies: Dependencies) {}

  private logCacheFallback(operation: string, error: unknown) {
    console.warn(
      `[FirebaseLearningHistoryRepository] Falling back to local cache for ${operation}.`,
      error,
    );
  }

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
      // 네트워크가 살아있다는 신호 — 큐에 밀린 항목을 기회적으로 드레인.
      void this.flushPendingAttempts(input.accountKey).catch(() => {});
      return payload;
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        this.logCacheFallback('recordAttempt', error);
        try {
          await enqueuePendingAttempt(input);
        } catch (enqueueError) {
          console.warn(
            '[FirebaseLearningHistoryRepository] Failed to enqueue pending attempt.',
            enqueueError,
          );
        }
        return this.cache.recordAttempt(input);
      }

      throw error;
    }
  }

  async flushPendingAttempts(accountKey: string): Promise<void> {
    if (this.flushingAccounts.has(accountKey)) {
      return;
    }
    this.flushingAccounts.add(accountKey);
    try {
      const queue = await loadPendingAttempts(accountKey);
      for (const item of queue) {
        // M2: 큐 항목이 현재 세션 계정과 다르면 절대 전송하지 않고 드롭.
        if (item.input.accountKey !== accountKey) {
          console.warn(
            '[FirebaseLearningHistoryRepository] Dropping pending attempt with mismatched accountKey.',
            item.input.attemptId,
          );
          await removePendingAttempt(accountKey, item.input.attemptId);
          continue;
        }

        try {
          const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
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
                  attempt: item.input,
                  replay: true,
                }),
              },
              1,
            ),
          );
          await this.cache.cacheRecord(payload);
          await removePendingAttempt(accountKey, item.input.attemptId);
        } catch (error) {
          const disposition = this.classifyFlushError(error);
          if (disposition === 'permanent') {
            console.warn(
              '[FirebaseLearningHistoryRepository] Dropping non-retryable pending attempt (dead-letter).',
              item.input.attemptId,
              error,
            );
            await removePendingAttempt(accountKey, item.input.attemptId);
            continue;
          }
          if (disposition === 'unauthorized') {
            // 재로그인 후 가능 — 보존하고 중단.
            break;
          }
          // transient: 재시도 누적이 한계를 넘으면 dead-letter, 아니면 보존 후 중단.
          const nextCount = await bumpPendingAttemptCount(
            accountKey,
            item.input.attemptId,
          );
          if (nextCount > MAX_ITEM_ATTEMPTS) {
            console.warn(
              '[FirebaseLearningHistoryRepository] Dropping pending attempt after max retries (dead-letter).',
              item.input.attemptId,
            );
            await removePendingAttempt(accountKey, item.input.attemptId);
            continue;
          }
          break;
        }
      }
    } finally {
      this.flushingAccounts.delete(accountKey);
    }
  }

  private classifyFlushError(
    error: unknown,
  ): 'permanent' | 'transient' | 'unauthorized' {
    if (!(error instanceof LearningHistoryApiError)) {
      return 'transient';
    }
    if (error.code === 'UNAUTHORIZED') {
      return 'unauthorized';
    }
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return 'transient';
    }
    // HTTP_ERROR: 5xx는 일시적, 그 외 4xx는 영구(poison) — 큐 차단 방지.
    if ([500, 502, 503, 504].includes(error.status)) {
      return 'transient';
    }
    return 'permanent';
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
        return payload.summary;
      }

      // Server returned null (eventual consistency — e.g. just after recordAttempt POST).
      // Fall back to local cache which may have correct data from a recent cacheRecord.
      const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
      if (cachedSummary) {
        return cachedSummary;
      }

      return null;
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        this.logCacheFallback('loadCurrentSummary', error);
        const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
        if (cachedSummary) {
          return cachedSummary;
        }

        return createEmptyLearnerSummary(accountKey);
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
        this.logCacheFallback('saveFeaturedExamState', error);
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
      if (shouldUseLearningHistoryCacheFallback(error)) {
        this.logCacheFallback('listAttempts', error);
        return this.cache.listAttempts(accountKey, options);
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
      if (shouldUseLearningHistoryCacheFallback(error)) {
        this.logCacheFallback('listAttemptResults', error);
        return this.cache.listAttemptResults(accountKey, attemptId);
      }

      throw error;
    }
  }

  async listReviewTasks(accountKey: string): Promise<ReviewTask[]> {
    try {
      const payload = await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ reviewTasks: ReviewTask[] }>(
          `${this.dependencies.listReviewTasksUrl}?accountKey=${encodeURIComponent(accountKey)}`,
          {
            method: 'GET',
            headers,
          },
          1,
        ),
      );

      await this.cache.cacheReviewTasks(accountKey, payload.reviewTasks);
      return payload.reviewTasks;
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        this.logCacheFallback('listReviewTasks', error);
        return this.cache.listReviewTasks(accountKey);
      }

      throw error;
    }
  }
}
