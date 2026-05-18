import type { AuthClient } from '@/features/auth/auth-client';

import type { ReviewTaskStore } from './review-task-store';
import type { ReviewTask } from './types';

type Dependencies = {
  authClient: AuthClient;
  localStore: ReviewTaskStore;
  remoteStore: ReviewTaskStore | null;
};

export class ReviewTaskStoreRouter implements ReviewTaskStore {
  constructor(private readonly dependencies: Dependencies) {}

  private async resolveStore(accountKey: string): Promise<ReviewTaskStore> {
    const session = await this.dependencies.authClient.loadSession();
    if (!session) {
      throw new Error('Authentication is required before accessing review tasks.');
    }

    if (session.accountKey !== accountKey) {
      throw new Error('Review task store account mismatch.');
    }

    if (session.status === 'authenticated') {
      if (!this.dependencies.remoteStore) {
        throw new Error(
          'Remote review task store is not configured for authenticated users.',
        );
      }
      return this.dependencies.remoteStore;
    }

    return this.dependencies.localStore;
  }

  async load(accountKey: string): Promise<ReviewTask[]> {
    return (await this.resolveStore(accountKey)).load(accountKey);
  }

  async saveAll(accountKey: string, tasks: ReviewTask[]): Promise<void> {
    return (await this.resolveStore(accountKey)).saveAll(accountKey, tasks);
  }

  async reset(accountKey: string): Promise<void> {
    return (await this.resolveStore(accountKey)).reset(accountKey);
  }
}
