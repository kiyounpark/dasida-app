jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

import type { FinalizedAttemptInput } from './history-repository';
import {
  MAX_PENDING_ATTEMPTS,
  bumpPendingAttemptCount,
  clearPendingAttempts,
  enqueuePendingAttempt,
  loadPendingAttempts,
  removePendingAttempt,
} from './pending-attempt-queue';

const ACCOUNT = 'user:acc-1';

function input(attemptId: string, accountKey = ACCOUNT): FinalizedAttemptInput {
  return {
    attemptId,
    accountKey,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-05-01T09:00:00.000Z',
    completedAt: '2026-05-01T09:10:00.000Z',
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: null,
    topWeaknesses: [],
    questions: [],
  } as unknown as FinalizedAttemptInput;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

test('enqueue then load preserves FIFO order with attemptCount 0', async () => {
  await enqueuePendingAttempt(input('a'));
  await enqueuePendingAttempt(input('b'));

  const items = await loadPendingAttempts(ACCOUNT);

  expect(items.map((i) => i.input.attemptId)).toEqual(['a', 'b']);
  expect(items[0].attemptCount).toBe(0);
  expect(typeof items[0].enqueuedAt).toBe('string');
});

test('enqueue is upsert by attemptId and preserves attemptCount', async () => {
  await enqueuePendingAttempt(input('a'));
  await bumpPendingAttemptCount(ACCOUNT, 'a');
  await enqueuePendingAttempt(input('a'));

  const items = await loadPendingAttempts(ACCOUNT);
  expect(items).toHaveLength(1);
  expect(items[0].attemptCount).toBe(1);
});

test('bumpPendingAttemptCount increments and persists', async () => {
  await enqueuePendingAttempt(input('a'));
  const next = await bumpPendingAttemptCount(ACCOUNT, 'a');
  expect(next).toBe(1);
  const items = await loadPendingAttempts(ACCOUNT);
  expect(items[0].attemptCount).toBe(1);
});

test('removePendingAttempt removes only the target', async () => {
  await enqueuePendingAttempt(input('a'));
  await enqueuePendingAttempt(input('b'));
  await removePendingAttempt(ACCOUNT, 'a');
  const items = await loadPendingAttempts(ACCOUNT);
  expect(items.map((i) => i.input.attemptId)).toEqual(['b']);
});

test('clearPendingAttempts empties the queue', async () => {
  await enqueuePendingAttempt(input('a'));
  await clearPendingAttempts(ACCOUNT);
  expect(await loadPendingAttempts(ACCOUNT)).toEqual([]);
});

test('cap drops oldest beyond MAX_PENDING_ATTEMPTS and logs loudly', async () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  for (let i = 0; i < MAX_PENDING_ATTEMPTS + 1; i += 1) {
    await enqueuePendingAttempt(input(`a${i}`));
  }
  const items = await loadPendingAttempts(ACCOUNT);
  expect(items).toHaveLength(MAX_PENDING_ATTEMPTS);
  expect(items[0].input.attemptId).toBe('a1');
  expect(errorSpy).toHaveBeenCalled();
});

test('loadPendingAttempts skips corrupt entries', async () => {
  const key = `${StorageKeys.pendingAttemptsPrefix}${ACCOUNT}`;
  await AsyncStorage.setItem(
    key,
    JSON.stringify([
      { nope: true },
      { input: input('good'), attemptCount: 0, enqueuedAt: '2026-05-01T00:00:00.000Z' },
    ]),
  );
  const items = await loadPendingAttempts(ACCOUNT);
  expect(items.map((i) => i.input.attemptId)).toEqual(['good']);
});

test('concurrent enqueue and remove do not lose updates (mutex)', async () => {
  await enqueuePendingAttempt(input('b'));
  await Promise.all([
    enqueuePendingAttempt(input('a')),
    removePendingAttempt(ACCOUNT, 'b'),
  ]);
  const ids = (await loadPendingAttempts(ACCOUNT)).map((i) => i.input.attemptId);
  expect(ids).toContain('a');
  expect(ids).not.toContain('b');
});
