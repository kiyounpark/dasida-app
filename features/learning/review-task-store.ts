import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import type { ReviewTask } from './types';

function getReviewTasksStorageKey(accountKey: string) {
  return `${StorageKeys.reviewTasksPrefix}${accountKey}`;
}

export type ReviewTaskStore = {
  load(accountKey: string): Promise<ReviewTask[]>;
  saveAll(accountKey: string, tasks: ReviewTask[]): Promise<void>;
  reset(accountKey: string): Promise<void>;
};

export class LocalReviewTaskStore implements ReviewTaskStore {
  async load(accountKey: string): Promise<ReviewTask[]> {
    const rawValue = await AsyncStorage.getItem(getReviewTasksStorageKey(accountKey));
    if (!rawValue) {
      return [];
    }

    try {
      return JSON.parse(rawValue) as ReviewTask[];
    } catch {
      return [];
    }
  }

  async saveAll(accountKey: string, tasks: ReviewTask[]): Promise<void> {
    await AsyncStorage.setItem(getReviewTasksStorageKey(accountKey), JSON.stringify(tasks));
  }

  async reset(accountKey: string): Promise<void> {
    await AsyncStorage.removeItem(getReviewTasksStorageKey(accountKey));
  }
}

