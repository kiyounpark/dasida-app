import type { AuthSession } from '@/features/auth/types';
import type { LearnerProfileStore } from './profile-store';
import type { LearnerProfile } from './types';

export class AnonymousAwareLearnerProfileStore implements LearnerProfileStore {
  constructor(
    private readonly loadSession: () => Promise<AuthSession | null>,
    private readonly authenticatedStore: LearnerProfileStore,
    private readonly anonymousStore: LearnerProfileStore,
  ) {}

  private async selectStore(): Promise<LearnerProfileStore> {
    const session = await this.loadSession();
    return session?.status === 'authenticated'
      ? this.authenticatedStore
      : this.anonymousStore;
  }

  async load(accountKey: string): Promise<LearnerProfile | null> {
    return (await this.selectStore()).load(accountKey);
  }

  async createInitial(accountKey: string): Promise<LearnerProfile> {
    return (await this.selectStore()).createInitial(accountKey);
  }

  async save(profile: LearnerProfile): Promise<void> {
    return (await this.selectStore()).save(profile);
  }

  async reset(accountKey: string): Promise<void> {
    return (await this.selectStore()).reset(accountKey);
  }
}
