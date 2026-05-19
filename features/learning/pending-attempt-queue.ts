import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import type { FinalizedAttemptInput } from './history-repository';

export const MAX_PENDING_ATTEMPTS = 100;

export type PendingAttempt = {
  input: FinalizedAttemptInput;
  attemptCount: number;
  enqueuedAt: string;
};

function storageKey(accountKey: string) {
  return `${StorageKeys.pendingAttemptsPrefix}${accountKey}`;
}

// 계정별 async mutex — enqueue/remove/bump/clear의 read-modify-write를
// 직렬화해 동시 변경 lost-update를 차단한다.
const locks = new Map<string, Promise<unknown>>();

function withLock<T>(accountKey: string, run: () => Promise<T>): Promise<T> {
  const prev = locks.get(accountKey) ?? Promise.resolve();
  const next = prev.then(run, run);
  locks.set(
    accountKey,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

function isValidPendingAttempt(value: unknown): value is PendingAttempt {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const input = candidate.input as Record<string, unknown> | undefined;
  return (
    typeof candidate.attemptCount === 'number' &&
    typeof candidate.enqueuedAt === 'string' &&
    !!input &&
    typeof input === 'object' &&
    typeof input.attemptId === 'string' &&
    typeof input.accountKey === 'string'
  );
}

async function readQueue(accountKey: string): Promise<PendingAttempt[]> {
  const raw = await AsyncStorage.getItem(storageKey(accountKey));
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidPendingAttempt);
}

async function writeQueue(accountKey: string, queue: PendingAttempt[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(accountKey), JSON.stringify(queue));
}

export async function loadPendingAttempts(accountKey: string): Promise<PendingAttempt[]> {
  return withLock(accountKey, () => readQueue(accountKey));
}

export async function enqueuePendingAttempt(input: FinalizedAttemptInput): Promise<void> {
  const accountKey = input.accountKey;
  await withLock(accountKey, async () => {
    const queue = await readQueue(accountKey);
    const existingIndex = queue.findIndex(
      (item) => item.input.attemptId === input.attemptId,
    );

    if (existingIndex >= 0) {
      // upsert: payload만 갱신, attemptCount/enqueuedAt 보존(중복 누적 방지).
      queue[existingIndex] = { ...queue[existingIndex], input };
    } else {
      queue.push({ input, attemptCount: 0, enqueuedAt: new Date().toISOString() });
    }

    while (queue.length > MAX_PENDING_ATTEMPTS) {
      const dropped = queue.shift();
      console.error(
        '[pending-attempt-queue] queue overflow — dropping oldest pending attempt',
        dropped?.input.attemptId,
      );
    }

    await writeQueue(accountKey, queue);
  });
}

export async function removePendingAttempt(
  accountKey: string,
  attemptId: string,
): Promise<void> {
  await withLock(accountKey, async () => {
    const queue = await readQueue(accountKey);
    const next = queue.filter((item) => item.input.attemptId !== attemptId);
    if (next.length !== queue.length) {
      await writeQueue(accountKey, next);
    }
  });
}

export async function bumpPendingAttemptCount(
  accountKey: string,
  attemptId: string,
): Promise<number> {
  return withLock(accountKey, async () => {
    const queue = await readQueue(accountKey);
    const item = queue.find((entry) => entry.input.attemptId === attemptId);
    if (!item) return 0;
    item.attemptCount += 1;
    await writeQueue(accountKey, queue);
    return item.attemptCount;
  });
}

export async function clearPendingAttempts(accountKey: string): Promise<void> {
  await withLock(accountKey, async () => {
    await AsyncStorage.removeItem(storageKey(accountKey));
  });
}
