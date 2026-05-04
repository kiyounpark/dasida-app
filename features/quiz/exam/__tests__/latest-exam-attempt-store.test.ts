// features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getLatestExamAttempts,
  prependLatestExamAttempt,
} from '../latest-exam-attempt-store';
import type { LatestExamAttemptSummary } from '../exam-analysis-in-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const ACCOUNT = 'acc';
const KEY = `dasida/latest-exam-attempt/${ACCOUNT}`;
const LEGACY_KEY = 'dasida/latest-exam-attempt';

function attempt(
  examId: string,
  attemptId: string,
  attemptDateISO: string,
  wrong: number[] = [1, 2],
): LatestExamAttemptSummary {
  return {
    examId,
    attemptId,
    attemptDateISO,
    wrongProblemNumbers: wrong,
    result: { examId, attemptId, completedAt: attemptDateISO } as never,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getLatestExamAttempts', () => {
  it('빈 저장소 → 빈 배열', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    expect(await getLatestExamAttempts(ACCOUNT)).toEqual([]);
  });

  it('legacy 단일 객체 저장값 → 빈 배열 + legacy 키 삭제 (cross-account leak 방지)', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // new key empty

    const result = await getLatestExamAttempts(ACCOUNT);

    expect(result).toEqual([]);
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    // No setItem to the new key — we discard rather than copy
    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('새 키에 단일 객체가 저장돼 있으면 → 길이 1 배열로 정규화', async () => {
    const single = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(single));

    expect(await getLatestExamAttempts(ACCOUNT)).toEqual([single]);
  });

  it('새 키에 배열이 저장돼 있으면 → 그대로 반환', async () => {
    const arr = [
      attempt('exam-B', 'b1', '2026-05-02T00:00:00Z'),
      attempt('exam-A', 'a1', '2026-05-01T00:00:00Z'),
    ];
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(arr));

    expect(await getLatestExamAttempts(ACCOUNT)).toEqual(arr);
  });

  it('손상된 JSON → 빈 배열 (안전 fallback)', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('not json');
    expect(await getLatestExamAttempts(ACCOUNT)).toEqual([]);
  });
});

describe('prependLatestExamAttempt', () => {
  it('빈 배열 → 길이 1', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');

    await prependLatestExamAttempt(ACCOUNT, a);

    const lastSet = mockedAsyncStorage.setItem.mock.calls.at(-1);
    expect(lastSet?.[0]).toBe(KEY);
    expect(JSON.parse(lastSet?.[1] as string)).toEqual([a]);
  });

  it('새 attemptId → 맨 앞 prepend', async () => {
    const existing = [attempt('exam-A', 'a1', '2026-05-01T00:00:00Z')];
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existing));
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z');

    await prependLatestExamAttempt(ACCOUNT, b);

    const written = JSON.parse(
      mockedAsyncStorage.setItem.mock.calls.at(-1)?.[1] as string,
    );
    expect(written).toEqual([b, existing[0]]);
  });

  it('동일 attemptId → 기존 위치에서 in-place 업데이트', async () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2]);
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z');
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([b, a]));

    const aUpdated = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2, 3]);
    await prependLatestExamAttempt(ACCOUNT, aUpdated);

    const written = JSON.parse(
      mockedAsyncStorage.setItem.mock.calls.at(-1)?.[1] as string,
    );
    expect(written).toEqual([b, aUpdated]);
  });

  it('4번째 신규 attempt → 가장 오래된 것이 빠지고 길이 3 유지', async () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z');
    const c = attempt('exam-C', 'c1', '2026-05-03T00:00:00Z');
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([c, b, a]));

    const d = attempt('exam-D', 'd1', '2026-05-04T00:00:00Z');
    await prependLatestExamAttempt(ACCOUNT, d);

    const written = JSON.parse(
      mockedAsyncStorage.setItem.mock.calls.at(-1)?.[1] as string,
    );
    expect(written).toEqual([d, c, b]); // a 탈락
    expect(written).toHaveLength(3);
  });
});
