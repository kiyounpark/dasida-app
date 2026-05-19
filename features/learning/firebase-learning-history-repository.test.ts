jest.mock('./firebase-learning-history-api', () => {
  const actual = jest.requireActual('./firebase-learning-history-api');
  return { ...actual, readLearningHistoryApiJson: jest.fn() };
});
jest.mock('./pending-attempt-queue');

import type { AuthClient } from '@/features/auth/auth-client';

import {
  LearningHistoryApiError,
  readLearningHistoryApiJson,
} from './firebase-learning-history-api';
import { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import { LocalLearningHistoryRepository } from './local-learning-history-repository';
import type { FinalizedAttemptInput } from './history-repository';
import {
  bumpPendingAttemptCount,
  enqueuePendingAttempt,
  loadPendingAttempts,
  removePendingAttempt,
  type PendingAttempt,
} from './pending-attempt-queue';

const ACCOUNT = 'user:acc-1';

const mockedReadJson = readLearningHistoryApiJson as jest.MockedFunction<
  typeof readLearningHistoryApiJson
>;
const mockedEnqueue = enqueuePendingAttempt as jest.MockedFunction<
  typeof enqueuePendingAttempt
>;
const mockedLoad = loadPendingAttempts as jest.MockedFunction<typeof loadPendingAttempts>;
const mockedRemove = removePendingAttempt as jest.MockedFunction<
  typeof removePendingAttempt
>;
const mockedBump = bumpPendingAttemptCount as jest.MockedFunction<
  typeof bumpPendingAttemptCount
>;

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

function pending(attemptId: string, accountKey = ACCOUNT, attemptCount = 0): PendingAttempt {
  return { input: input(attemptId, accountKey), attemptCount, enqueuedAt: '2026-05-01T00:00:00.000Z' };
}

const PAYLOAD = { attempt: {}, results: [], summary: {}, reviewTasks: [] };

function makeRepo() {
  const authClient = {
    getRemoteAuthContext: jest.fn(async () => ({
      kind: 'anonymous' as const,
      accountKey: ACCOUNT,
      requestSecret: 'sec',
    })),
  } as unknown as AuthClient;

  return new FirebaseLearningHistoryRepository({
    authClient,
    recordLearningAttemptUrl: 'https://example.test/record',
    getLearnerSummaryUrl: 'https://example.test/summary',
    saveFeaturedExamStateUrl: 'https://example.test/featured',
    listLearningAttemptsUrl: 'https://example.test/attempts',
    getLearningAttemptResultsUrl: 'https://example.test/results',
    listReviewTasksUrl: 'https://example.test/reviews',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue([]);
  mockedEnqueue.mockResolvedValue(undefined);
  mockedRemove.mockResolvedValue(undefined);
  mockedBump.mockResolvedValue(1);
  jest
    .spyOn(LocalLearningHistoryRepository.prototype, 'recordAttempt')
    .mockResolvedValue(PAYLOAD as never);
  jest
    .spyOn(LocalLearningHistoryRepository.prototype, 'cacheRecord')
    .mockResolvedValue(undefined as never);
});

test('POST network failure enqueues and returns local cache fallback', async () => {
  const repo = makeRepo();
  mockedReadJson.mockRejectedValue(
    new LearningHistoryApiError('net', 0, 'NETWORK_ERROR'),
  );

  const result = await repo.recordAttempt(input('a'));

  expect(mockedEnqueue).toHaveBeenCalledWith(expect.objectContaining({ attemptId: 'a' }));
  expect(result).toBe(PAYLOAD);
});

test('enqueue failure does not break the user flow', async () => {
  const repo = makeRepo();
  mockedReadJson.mockRejectedValue(
    new LearningHistoryApiError('net', 0, 'NETWORK_ERROR'),
  );
  mockedEnqueue.mockRejectedValue(new Error('storage exploded'));

  const result = await repo.recordAttempt(input('a'));

  expect(result).toBe(PAYLOAD);
});

test('successful recordAttempt triggers a flush drain with replay:true', async () => {
  const repo = makeRepo();
  mockedReadJson.mockResolvedValue(PAYLOAD as never);
  mockedLoad.mockResolvedValueOnce([pending('queued-1')]);

  await repo.recordAttempt(input('fresh'));
  await new Promise((r) => setImmediate(r));

  const replayCall = mockedReadJson.mock.calls.find((c) =>
    String((c[1] as RequestInit | undefined)?.body ?? '').includes('queued-1'),
  );
  expect(replayCall).toBeDefined();
  expect(JSON.parse(String((replayCall![1] as RequestInit).body)).replay).toBe(true);
  expect(mockedRemove).toHaveBeenCalledWith(ACCOUNT, 'queued-1');
});

test('C2: permanent 4xx item is dropped and queue continues', async () => {
  const repo = makeRepo();
  mockedLoad.mockResolvedValue([pending('bad'), pending('good')]);
  mockedReadJson
    .mockRejectedValueOnce(new LearningHistoryApiError('bad req', 400, 'HTTP_ERROR'))
    .mockResolvedValueOnce(PAYLOAD as never);

  await repo.flushPendingAttempts(ACCOUNT);

  expect(mockedRemove).toHaveBeenCalledWith(ACCOUNT, 'bad');
  expect(mockedRemove).toHaveBeenCalledWith(ACCOUNT, 'good');
});

test('C2: transient 5xx breaks and preserves the rest', async () => {
  const repo = makeRepo();
  mockedLoad.mockResolvedValue([pending('first'), pending('second')]);
  mockedReadJson.mockRejectedValue(
    new LearningHistoryApiError('unavailable', 503, 'HTTP_ERROR'),
  );

  await repo.flushPendingAttempts(ACCOUNT);

  expect(mockedBump).toHaveBeenCalledWith(ACCOUNT, 'first');
  expect(mockedRemove).not.toHaveBeenCalledWith(ACCOUNT, 'first');
  expect(mockedRemove).not.toHaveBeenCalledWith(ACCOUNT, 'second');
});

test('C2: UNAUTHORIZED breaks and preserves the item', async () => {
  const repo = makeRepo();
  mockedLoad.mockResolvedValue([pending('x')]);
  mockedReadJson.mockRejectedValue(
    new LearningHistoryApiError('unauth', 401, 'UNAUTHORIZED'),
  );

  await repo.flushPendingAttempts(ACCOUNT);

  expect(mockedRemove).not.toHaveBeenCalledWith(ACCOUNT, 'x');
});

test('M2: item with mismatched accountKey is dropped and never POSTed', async () => {
  const repo = makeRepo();
  mockedLoad.mockResolvedValue([pending('foreign', 'user:other')]);

  await repo.flushPendingAttempts(ACCOUNT);

  expect(mockedReadJson).not.toHaveBeenCalled();
  expect(mockedRemove).toHaveBeenCalledWith(ACCOUNT, 'foreign');
});

test('M5: flush does not call recordAttempt', async () => {
  const repo = makeRepo();
  mockedLoad.mockResolvedValue([pending('q')]);
  mockedReadJson.mockResolvedValue(PAYLOAD as never);
  const recordSpy = jest.spyOn(repo, 'recordAttempt');

  await repo.flushPendingAttempts(ACCOUNT);

  expect(recordSpy).not.toHaveBeenCalled();
});
