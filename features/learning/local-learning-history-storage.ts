import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

export function getAttemptsStorageKey(accountKey: string) {
  return `${StorageKeys.learningAttemptsPrefix}${accountKey}`;
}

export function getAttemptResultsStorageKey(accountKey: string) {
  return `${StorageKeys.learningAttemptResultsPrefix}${accountKey}`;
}

export function getReviewTasksStorageKey(accountKey: string) {
  return `${StorageKeys.reviewTasksPrefix}${accountKey}`;
}

export function getSummaryStorageKey(accountKey: string) {
  return `${StorageKeys.learnerSummaryCurrentPrefix}${accountKey}`;
}

export async function readLearningHistoryJson<T>(key: string, fallback: T): Promise<T> {
  const rawValue = await AsyncStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export async function writeLearningHistoryJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function clearLearningHistoryStorage(accountKey: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(getAttemptsStorageKey(accountKey)),
    AsyncStorage.removeItem(getAttemptResultsStorageKey(accountKey)),
    AsyncStorage.removeItem(getReviewTasksStorageKey(accountKey)),
    AsyncStorage.removeItem(getSummaryStorageKey(accountKey)),
  ]);
}
