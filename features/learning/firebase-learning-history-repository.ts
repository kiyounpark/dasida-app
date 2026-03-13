import type { AuthClient } from '@/features/auth/auth-client';
import type { AuthSession } from '@/features/auth/types';
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

const REQUEST_TIMEOUT_MS = 25000;
const NETWORK_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

type Dependencies = {
  authClient: AuthClient;
  recordLearningAttemptUrl: string;
  getLearnerSummaryUrl: string;
  saveFeaturedExamStateUrl: string;
  listLearningAttemptsUrl: string;
  getLearningAttemptResultsUrl: string;
};

export class LearningHistoryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'HTTP_ERROR' | 'UNAUTHORIZED',
  ) {
    super(message);
    this.name = 'LearningHistoryApiError';
  }
}

function isRetryableError(error: unknown) {
  return (
    error instanceof LearningHistoryApiError &&
    (error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      NETWORK_RETRYABLE_STATUS_CODES.has(error.status))
  );
}

async function parseErrorPayload(response: Response) {
  const payload = await response.json().catch(() => null);
  const errorMessage =
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string' &&
    payload.error
      ? payload.error
      : `Request failed (${response.status})`;

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

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson<T>(
  url: string,
  options: RequestInit,
  retries = 1,
): Promise<T> {
  const { controller, clear } = createTimeoutController();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      await parseErrorPayload(response);
    }

    const payload = await response.json().catch(() => null);
    if (!payload) {
      throw new LearningHistoryApiError('Empty response payload', response.status, 'HTTP_ERROR');
    }

    return payload as T;
  } catch (error) {
    if (error instanceof LearningHistoryApiError) {
      if (retries > 0 && isRetryableError(error)) {
        await wait(300);
        return readJson<T>(url, options, retries - 1);
      }

      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new LearningHistoryApiError(
        '요청 시간이 초과되었어요. 잠시 후 다시 시도해 주세요.',
        0,
        'TIMEOUT',
      );
      if (retries > 0) {
        await wait(300);
        return readJson<T>(url, options, retries - 1);
      }
      throw timeoutError;
    }

    const networkError = new LearningHistoryApiError(
      '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
      0,
      'NETWORK_ERROR',
    );
    if (retries > 0) {
      await wait(300);
      return readJson<T>(url, options, retries - 1);
    }
    throw networkError;
  } finally {
    clear();
  }
}

function createAuthHeaders(session: AuthSession) {
  return {
    'x-dasida-account-key': session.accountKey,
    'x-dasida-session-secret': session.requestSecret,
  };
}

export class FirebaseLearningHistoryRepository implements LearningHistoryRepository {
  private readonly cache = new LocalLearningHistoryRepository();

  constructor(private readonly dependencies: Dependencies) {}

  private async getSession(accountKey?: string) {
    const session =
      (await this.dependencies.authClient.loadSession()) ??
      (await this.dependencies.authClient.ensureAnonymousSession());

    if (accountKey && session.accountKey !== accountKey) {
      throw new LearningHistoryApiError('학습자 세션이 일치하지 않습니다.', 403, 'UNAUTHORIZED');
    }

    return session;
  }

  async recordAttempt(input: FinalizedAttemptInput) {
    const session = await this.getSession(input.accountKey);
    const payload = await readJson<{
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
          ...createAuthHeaders(session),
        },
        body: JSON.stringify({
          attempt: input,
        }),
      },
      1,
    );
    await this.cache.cacheRecord(payload);
    return payload;
  }

  async loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null> {
    const session = await this.getSession(accountKey);

    try {
      const payload = await readJson<{ summary: LearnerSummaryCurrent | null }>(
        `${this.dependencies.getLearnerSummaryUrl}?accountKey=${encodeURIComponent(accountKey)}`,
        {
          method: 'GET',
          headers: createAuthHeaders(session),
        },
        1,
      );

      if (payload.summary) {
        await this.cache.cacheSummary(accountKey, payload.summary);
      }

      return payload.summary;
    } catch (error) {
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
    const session = await this.getSession(accountKey);
    const payload = await readJson<{ summary: LearnerSummaryCurrent }>(
      this.dependencies.saveFeaturedExamStateUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders(session),
        },
        body: JSON.stringify({
          accountKey,
          state,
        }),
      },
      1,
    );

    await this.cache.cacheSummary(accountKey, payload.summary);
    return payload.summary;
  }

  async listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]> {
    const session = await this.getSession(accountKey);

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

      const payload = await readJson<{ attempts: LearningAttempt[] }>(
        `${this.dependencies.listLearningAttemptsUrl}?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: createAuthHeaders(session),
        },
        1,
      );

      await this.cache.cacheAttempts(accountKey, payload.attempts);
      return payload.attempts;
    } catch (error) {
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
    const session = await this.getSession(accountKey);

    try {
      const payload = await readJson<{ results: LearningAttemptResult[] }>(
        `${this.dependencies.getLearningAttemptResultsUrl}?accountKey=${encodeURIComponent(accountKey)}&attemptId=${encodeURIComponent(attemptId)}`,
        {
          method: 'GET',
          headers: createAuthHeaders(session),
        },
        1,
      );

      await this.cache.cacheAttemptResults(accountKey, attemptId, payload.results);
      return payload.results;
    } catch (error) {
      const cachedResults = await this.cache.listAttemptResults(accountKey, attemptId);
      if (cachedResults.length > 0) {
        return cachedResults;
      }

      throw error;
    }
  }
}
