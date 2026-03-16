import type { AuthClient } from '@/features/auth/auth-client';

import type { LearningSource } from './history-types';
import type {
  FinalizedAttemptInput,
  LearningHistoryRepository,
} from './history-repository';
import { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
} from './types';

type Dependencies = {
  authClient: AuthClient;
  localRepository: LocalLearningHistoryRepository;
  remoteRepository: FirebaseLearningHistoryRepository | null;
};

export class LearningHistoryRepositoryRouter implements LearningHistoryRepository {
  constructor(private readonly dependencies: Dependencies) {}

  private async resolveRepository(accountKey?: string): Promise<LearningHistoryRepository> {
    const session =
      (await this.dependencies.authClient.loadSession()) ??
      (await this.dependencies.authClient.ensureAnonymousSession());

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

  async recordAttempt(input: FinalizedAttemptInput) {
    return (await this.resolveRepository(input.accountKey)).recordAttempt(input);
  }

  async loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null> {
    return (await this.resolveRepository(accountKey)).loadCurrentSummary(accountKey);
  }

  async saveFeaturedExamState(accountKey: string, state: LearnerSummaryCurrent['featuredExamState']) {
    return (await this.resolveRepository(accountKey)).saveFeaturedExamState(accountKey, state);
  }

  async listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]> {
    return (await this.resolveRepository(accountKey)).listAttempts(accountKey, options);
  }

  async listAttemptResults(
    accountKey: string,
    attemptId: string,
  ): Promise<LearningAttemptResult[]> {
    return (await this.resolveRepository(accountKey)).listAttemptResults(accountKey, attemptId);
  }
}
