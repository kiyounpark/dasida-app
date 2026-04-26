import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LatestExamAttemptSummary } from './exam-analysis-in-progress';

const KEY = 'dasida/latest-exam-attempt';

export async function saveLatestExamAttempt(attempt: LatestExamAttemptSummary): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(attempt));
  } catch {}
}

export async function getLatestExamAttempt(): Promise<LatestExamAttemptSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LatestExamAttemptSummary;
  } catch {
    return null;
  }
}
