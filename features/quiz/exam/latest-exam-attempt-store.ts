import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LatestExamAttemptSummary } from './exam-analysis-in-progress';

const LEGACY_KEY = 'dasida/latest-exam-attempt';
const MAX_ATTEMPTS = 3;
const makeKey = (accountKey: string) => `dasida/latest-exam-attempt/${accountKey}`;

function isValidAttempt(v: unknown): v is LatestExamAttemptSummary {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.examId === 'string' &&
    typeof o.attemptId === 'string' &&
    typeof o.attemptDateISO === 'string' &&
    Array.isArray(o.wrongProblemNumbers)
  );
}

function parseStored(raw: string): LatestExamAttemptSummary[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidAttempt);
    }
    if (isValidAttempt(parsed)) {
      // legacy single-object format
      return [parsed];
    }
    return [];
  } catch {
    return [];
  }
}

export async function getLatestExamAttempts(
  accountKey: string,
): Promise<LatestExamAttemptSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey));
    if (raw) return parseStored(raw);

    // one-shot migration from pre-multi-account legacy key
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return [];
    const list = parseStored(legacyRaw);
    if (list.length > 0) {
      // write to new key first; if removeItem fails, migration safely reruns next launch
      // preserve legacy raw string — parseStored handles single-object format on next read
      await AsyncStorage.setItem(makeKey(accountKey), legacyRaw);
    }
    await AsyncStorage.removeItem(LEGACY_KEY);
    return list;
  } catch {
    return [];
  }
}

export async function prependLatestExamAttempt(
  accountKey: string,
  attempt: LatestExamAttemptSummary,
): Promise<void> {
  try {
    const current = await getLatestExamAttempts(accountKey);
    const existingIdx = current.findIndex((a) => a.attemptId === attempt.attemptId);
    let next: LatestExamAttemptSummary[];
    if (existingIdx >= 0) {
      // in-place update; preserve existing order
      next = [...current];
      next[existingIdx] = attempt;
    } else {
      next = [attempt, ...current].slice(0, MAX_ATTEMPTS);
    }
    await AsyncStorage.setItem(makeKey(accountKey), JSON.stringify(next));
  } catch {}
}
