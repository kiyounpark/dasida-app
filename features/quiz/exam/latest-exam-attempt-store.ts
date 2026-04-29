import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LatestExamAttemptSummary } from './exam-analysis-in-progress';

const LEGACY_KEY = 'dasida/latest-exam-attempt';
const makeKey = (accountKey: string) => `dasida/latest-exam-attempt/${accountKey}`;

function parseAttempt(raw: string): LatestExamAttemptSummary | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.wrongProblemNumbers)) {
      return null;
    }
    const result = parsed.result && typeof parsed.result === 'object' ? parsed.result : null;
    return {
      examId: parsed.examId,
      attemptId: parsed.attemptId,
      attemptDateISO: parsed.attemptDateISO,
      wrongProblemNumbers: parsed.wrongProblemNumbers,
      result,
    };
  } catch {
    return null;
  }
}

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
    if (raw) return parseAttempt(raw);

    // one-shot migration from pre-multi-account key
    // Assumes legacy data belongs to the first account to call this on this device (pre-multi-account invariant).
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return null;
    const attempt = parseAttempt(legacyRaw);
    // Write to new key first — if removeItem fails, worst case is migration reruns next launch (safe).
    // If we removed first and setItem threw, data would be permanently lost.
    if (attempt) await AsyncStorage.setItem(makeKey(accountKey), legacyRaw);
    await AsyncStorage.removeItem(LEGACY_KEY);
    return attempt;
  } catch {
    return null;
  }
}
