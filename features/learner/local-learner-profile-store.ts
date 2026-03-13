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
      grade: 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp,
      featuredExamState: {
        examId: 'featured-mock-1',
        status: 'not_started',
      },
    };

    await this.save(profile);
    return profile;
  }

  async save(profile: LearnerProfile): Promise<void> {
    await AsyncStorage.setItem(
      getLearnerProfileStorageKey(profile.accountKey),
      JSON.stringify(profile),
    );
  }

  async reset(accountKey: string): Promise<void> {
    await AsyncStorage.removeItem(getLearnerProfileStorageKey(accountKey));
  }
}

