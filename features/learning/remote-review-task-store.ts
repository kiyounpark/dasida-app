import type { AuthClient, RemoteAuthContext } from '@/features/auth/auth-client';

import {
  LearningHistoryApiError,
  createRemoteAuthHeaders,
  readLearningHistoryApiJson,
  shouldUseLearningHistoryCacheFallback,
} from './firebase-learning-history-api';
import { LocalReviewTaskStore, type ReviewTaskStore } from './review-task-store';
import type { ReviewTask } from './types';

type Dependencies = {
  authClient: AuthClient;
  listReviewTasksUrl: string;
  saveReviewTasksUrl: string;
};

export class RemoteReviewTaskStore implements ReviewTaskStore {
  private readonly mirror = new LocalReviewTaskStore();

  constructor(private readonly dependencies: Dependencies) {}

  private async withAuthorizedRequest<T>(
    accountKey: string,
    run: (headers: Record<string, string>) => Promise<T>,
  ): Promise<T> {
    const authContext: RemoteAuthContext =
      await this.dependencies.authClient.getRemoteAuthContext(accountKey);

    try {
      return await run(createRemoteAuthHeaders(authContext));
    } catch (error) {
      if (
        authContext.kind === 'firebase' &&
        error instanceof LearningHistoryApiError &&
        error.code === 'UNAUTHORIZED'
      ) {
        const refreshed = await this.dependencies.authClient.getRemoteAuthContext(
          accountKey,
          { forceRefresh: true },
        );
        return run(createRemoteAuthHeaders(refreshed));
      }

      throw error;
    }
  }

  async load(accountKey: string): Promise<ReviewTask[]> {
    try {
      const { reviewTasks } = await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ reviewTasks: ReviewTask[] }>(
          `${this.dependencies.listReviewTasksUrl}?accountKey=${encodeURIComponent(accountKey)}`,
          { method: 'GET', headers },
          1,
        ),
      );
      await this.mirror.saveAll(accountKey, reviewTasks);
      return reviewTasks;
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        console.warn('[RemoteReviewTaskStore] load falling back to local mirror.', error);
        return this.mirror.load(accountKey);
      }
      throw error;
    }
  }

  async saveAll(accountKey: string, tasks: ReviewTask[]): Promise<void> {
    try {
      await this.withAuthorizedRequest(accountKey, (headers) =>
        readLearningHistoryApiJson<{ reviewTasks: ReviewTask[] }>(
          this.dependencies.saveReviewTasksUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ accountKey, reviewTasks: tasks }),
          },
          1,
        ),
      );
      await this.mirror.saveAll(accountKey, tasks);
    } catch (error) {
      if (shouldUseLearningHistoryCacheFallback(error)) {
        // 변경 유실 방지: 다음 load/saveAll 동기화 때 서버와 재수렴.
        console.warn('[RemoteReviewTaskStore] saveAll falling back to local mirror.', error);
        await this.mirror.saveAll(accountKey, tasks);
        return;
      }
      throw error;
    }
  }

  async reset(accountKey: string): Promise<void> {
    await this.mirror.reset(accountKey);
  }
}
