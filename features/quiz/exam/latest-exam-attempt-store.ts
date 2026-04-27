import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LatestExamAttemptSummary } from './exam-analysis-in-progress';

const makeKey = (accountKey: string) => `dasida/latest-exam-attempt/${accountKey}`;

export async function saveLatestExamAttempt(
  accountKey: string,
  attempt: LatestExamAttemptSummary,
): Promise<void> {
  try {
    await AsyncStorage.setItem(makeKey(accountKey), JSON.stringify(attempt));
  } catch {}
}

export async function getLatestExamAttempt(
  accountKey: string,
): Promise<LatestExamAttemptSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.wrongProblemNumbers)) {
      return null;
    }
    return parsed as LatestExamAttemptSummary;
  } catch {
    return null;
  }
}
