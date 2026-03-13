import type { FeaturedExamState } from '@/features/learner/types';

import type { LearningSource } from './history-types';
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
  recordLearningAttemptUrl: string;
  getLearnerSummaryUrl: string;
  saveFeaturedExamStateUrl: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(
      (payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string' &&
        payload.error) ||
        'Request failed',
    );
  }

  return payload as T;
}

export class FirebaseLearningHistoryRepository implements LearningHistoryRepository {
  private readonly cache = new LocalLearningHistoryRepository();

  constructor(private readonly dependencies: Dependencies) {}

  async recordAttempt(input: FinalizedAttemptInput) {
    const response = await fetch(this.dependencies.recordLearningAttemptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attempt: input,
      }),
    });

    const payload = await readJson<{
      attempt: LearningAttempt;
      results: LearningAttemptResult[];
      summary: LearnerSummaryCurrent;
      reviewTasks: ReviewTask[];
    }>(response);
    await this.cache.recordAttempt(input);
    return payload;
  }

  async loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null> {
    const response = await fetch(
      `${this.dependencies.getLearnerSummaryUrl}?accountKey=${encodeURIComponent(accountKey)}`,
      {
        method: 'GET',
      },
    );
    const payload = await readJson<{ summary: LearnerSummaryCurrent | null }>(response);
    return payload.summary;
  }

  async saveFeaturedExamState(
    accountKey: string,
    state: FeaturedExamState,
  ): Promise<LearnerSummaryCurrent> {
    const response = await fetch(this.dependencies.saveFeaturedExamStateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountKey,
        state,
      }),
    });

    const payload = await readJson<{ summary: LearnerSummaryCurrent }>(response);
    await this.cache.saveFeaturedExamState(accountKey, state);
    return payload.summary;
  }

  async listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]> {
    return this.cache.listAttempts(accountKey, options);
  }

  async listAttemptResults(
    accountKey: string,
    attemptId: string,
  ): Promise<LearningAttemptResult[]> {
    return this.cache.listAttemptResults(accountKey, attemptId);
  }
}
