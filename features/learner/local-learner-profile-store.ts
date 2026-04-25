import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import type { LearnerProfileStore } from './profile-store';
import type { LearnerProfile } from './types';

function createRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getLearnerProfileStorageKey(accountKey: string) {
  return `${StorageKeys.learnerProfilePrefix}${accountKey}`;
}

export class LocalLearnerProfileStore implements LearnerProfileStore {
  async load(accountKey: string): Promise<LearnerProfile | null> {
    const rawValue = await AsyncStorage.getItem(getLearnerProfileStorageKey(accountKey));
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as LearnerProfile;
    } catch {
      return null;
    }
  }

  async createInitial(accountKey: string): Promise<LearnerProfile> {
    const timestamp = new Date().toISOString();
    const profile: LearnerProfile = {
      accountKey,
      learnerId: createRandomId(),
      nickname: '',
      grade: 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.save(profile);
    return profile;
  }

  async save(profile: LearnerProfile): Promise<void> {
    // JSON.stringify: undefined 필드는 직렬화에서 제외되어 미저장.
    // 커스텀 replacer로 undefined를 보존할 경우 필드 삭제가 동작하지 않음.
    await AsyncStorage.setItem(
      getLearnerProfileStorageKey(profile.accountKey),
      JSON.stringify(profile),
    );
  }

  async reset(accountKey: string): Promise<void> {
    await AsyncStorage.removeItem(getLearnerProfileStorageKey(accountKey));
  }
}
