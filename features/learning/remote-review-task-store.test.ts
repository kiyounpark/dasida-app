jest.mock('./firebase-learning-history-api', () => {
  const actual = jest.requireActual('./firebase-learning-history-api');
  return { ...actual, readLearningHistoryApiJson: jest.fn() };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthClient } from '@/features/auth/auth-client';

import {
  LearningHistoryApiError,
  readLearningHistoryApiJson,
} from './firebase-learning-history-api';
import { RemoteReviewTaskStore } from './remote-review-task-store';
import type { ReviewTask } from './types';

const ACCOUNT = 'user:acc-1';
const LIST_URL = 'https://example.test/listReviewTasks';
const SAVE_URL = 'https://example.test/saveReviewTasks';

const mockedReadJson = readLearningHistoryApiJson as jest.MockedFunction<
  typeof readLearningHistoryApiJson
>;

function makeTask(overrides: Partial<ReviewTask> = {}): ReviewTask {
  return {
    id: 'src-1__formula_understanding__day1',
    accountKey: ACCOUNT,
    weaknessId: 'formula_understanding',
    source: 'weakness-practice',
    sourceId: 'src-1',
    scheduledFor: '2026-05-19T00:00:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: '2026-05-18T00:00:00.000Z',
    ...overrides,
  } as ReviewTask;
}

function makeAuthClient(): AuthClient {
  return {
    getRemoteAuthContext: jest.fn().mockResolvedValue({
      kind: 'firebase',
      accountKey: ACCOUNT,
      idToken: 'token-1',
    }),
    loadSession: jest.fn(),
  } as unknown as AuthClient;
}

function makeStore(authClient = makeAuthClient()) {
  return {
    authClient,
    store: new RemoteReviewTaskStore({
      authClient,
      listReviewTasksUrl: LIST_URL,
      saveReviewTasksUrl: SAVE_URL,
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

test('load 성공 → 서버 task 반환 + 미러 캐시', async () => {
  const tasks = [makeTask()];
  mockedReadJson.mockResolvedValueOnce({ reviewTasks: tasks });
  const { store } = makeStore();

  const result = await store.load(ACCOUNT);

  expect(result).toEqual(tasks);
  const [url, init] = mockedReadJson.mock.calls[0];
  expect(url).toContain(encodeURIComponent(ACCOUNT));
  expect((init as RequestInit).method).toBe('GET');
  expect(AsyncStorage.setItem).toHaveBeenCalled();
});

test('load 네트워크 실패 → 미러 폴백', async () => {
  const cached = [makeTask({ id: 'cached__formula_understanding__day1' })];
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cached));
  mockedReadJson.mockRejectedValueOnce(
    new LearningHistoryApiError('net', 0, 'NETWORK_ERROR'),
  );
  const { store } = makeStore();

  const result = await store.load(ACCOUNT);

  expect(result).toEqual(cached);
});

test('saveAll 성공 → POST 바디 검증 + 미러 갱신', async () => {
  const tasks = [makeTask()];
  mockedReadJson.mockResolvedValueOnce({ reviewTasks: tasks });
  const { store } = makeStore();

  await store.saveAll(ACCOUNT, tasks);

  const [url, init] = mockedReadJson.mock.calls[0];
  expect(url).toBe(SAVE_URL);
  expect((init as RequestInit).method).toBe('POST');
  expect(JSON.parse((init as RequestInit).body as string)).toEqual({
    accountKey: ACCOUNT,
    reviewTasks: tasks,
  });
  expect(AsyncStorage.setItem).toHaveBeenCalled();
});

test('saveAll 네트워크 실패 → throw 안 함 + 미러 보존', async () => {
  mockedReadJson.mockRejectedValueOnce(
    new LearningHistoryApiError('net', 0, 'NETWORK_ERROR'),
  );
  const { store } = makeStore();

  await expect(store.saveAll(ACCOUNT, [makeTask()])).resolves.toBeUndefined();
  expect(AsyncStorage.setItem).toHaveBeenCalled();
});

test('UNAUTHORIZED(firebase) → forceRefresh 재시도', async () => {
  mockedReadJson
    .mockRejectedValueOnce(new LearningHistoryApiError('unauth', 401, 'UNAUTHORIZED'))
    .mockResolvedValueOnce({ reviewTasks: [] });
  const { store, authClient } = makeStore();

  const result = await store.load(ACCOUNT);

  expect(result).toEqual([]);
  expect(authClient.getRemoteAuthContext).toHaveBeenCalledTimes(2);
  expect((authClient.getRemoteAuthContext as jest.Mock).mock.calls[1][1]).toEqual({
    forceRefresh: true,
  });
});
