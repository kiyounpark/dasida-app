import type { AuthSession } from '@/features/auth/types';
import type { LearnerProfileStore } from './profile-store';
import type { LearnerProfile } from './types';

export class AnonymousAwareLearnerProfileStore implements LearnerProfileStore {
  constructor(
    private readonly loadSession: () => Promise<AuthSession | null>,
    private readonly authenticatedStore: LearnerProfileStore,
    private readonly anonymousStore: LearnerProfileStore,
  ) {}

  // 매 호출마다 최신 세션을 읽어 스토어를 선택합니다.
  // session이 null이거나 anonymous이면 anonymousStore로 위임합니다.
  // auth 전환(signIn/signOut) 중에는 이 메서드가 호출되지 않으므로 레이스 컨디션 위험은 없습니다.
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
