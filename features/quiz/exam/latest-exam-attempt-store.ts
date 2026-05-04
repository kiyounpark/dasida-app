import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LatestExamAttemptSummary } from './exam-analysis-in-progress';

const LEGACY_KEY = 'dasida/latest-exam-attempt';
const MAX_ATTEMPTS = 3;
const makeKey = (accountKey: string) => `dasida/latest-exam-attempt/${accountKey}`;

// Serialize writes to avoid read-modify-write races when multiple attempts
// finish in rapid succession (or save races a focus-triggered refresh).
let writeChain: Promise<void> = Promise.resolve();

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
    // Pre-multi-account legacy key has no owner attribution. Discarding rather than
    // copying avoids cross-account data leak when device is shared between accounts.
    // User's next exam attempt will repopulate the per-account key correctly.
    await AsyncStorage.removeItem(LEGACY_KEY);
    return [];
  } catch (err) {
    console.warn('[latest-exam-attempt-store] read failed', err);
    return [];
  }
}

export async function prependLatestExamAttempt(
  accountKey: string,
  attempt: LatestExamAttemptSummary,
): Promise<void> {
  const next = writeChain.then(async () => {
    try {
      const current = await getLatestExamAttempts(accountKey);
      const existingIdx = current.findIndex((a) => a.attemptId === attempt.attemptId);
      let nextList: LatestExamAttemptSummary[];
      if (existingIdx >= 0) {
        nextList = [...current];
        nextList[existingIdx] = attempt;
      } else {
        nextList = [attempt, ...current].slice(0, MAX_ATTEMPTS);
      }
      await AsyncStorage.setItem(makeKey(accountKey), JSON.stringify(nextList));
    } catch (err) {
      console.warn('[latest-exam-attempt-store] prepend failed', err);
    }
  });
  writeChain = next;
  return next;
}
