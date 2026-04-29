import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LatestExamAttemptSummary } from '@/features/quiz/exam/exam-analysis-in-progress';
import type { ExamResultSummary } from '@/features/quiz/exam/types';
import {
  saveLatestExamAttempt,
  getLatestExamAttempt,
} from '@/features/quiz/exam/latest-exam-attempt-store';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const ACCOUNT_KEY = 'user-abc';
const KEY = `dasida/latest-exam-attempt/${ACCOUNT_KEY}`;

const SAMPLE_RESULT: ExamResultSummary = {
  attemptId: 'attempt-abc',
  examId: 'exam-001',
  startedAt: '2026-04-27T00:00:00.000Z',
  completedAt: '2026-04-27T00:30:00.000Z',
  total: 30,
  correct: 27,
  wrong: 3,
  unanswered: 0,
  accuracy: 90,
  totalScore: 95,
  maxScore: 100,
  perProblem: [
    { number: 3, userAnswer: 1, correctAnswer: 2, isCorrect: false, earnedScore: 0 },
    { number: 7, userAnswer: 3, correctAnswer: 4, isCorrect: false, earnedScore: 0 },
    { number: 12, userAnswer: 2, correctAnswer: 1, isCorrect: false, earnedScore: 0 },
  ],
};

const SAMPLE_ATTEMPT: LatestExamAttemptSummary = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27T00:00:00.000Z',
  wrongProblemNumbers: [3, 7, 12],
  result: SAMPLE_RESULT,
};

describe('latest-exam-attempt-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLatestExamAttempt', () => {
    it('attempt를 계정 범위 키로 직렬화하여 AsyncStorage에 저장', async () => {
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      await saveLatestExamAttempt(ACCOUNT_KEY, SAMPLE_ATTEMPT);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        KEY,
        JSON.stringify(SAMPLE_ATTEMPT),
      );
    });

    it('다른 계정은 다른 키를 사용', async () => {
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      await saveLatestExamAttempt('other-user', SAMPLE_ATTEMPT);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'dasida/latest-exam-attempt/other-user',
        JSON.stringify(SAMPLE_ATTEMPT),
      );
    });

    it('AsyncStorage 에러 시 예외를 전파하지 않음 (안전한 무시)', async () => {
      mockedAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage full'));
      await expect(saveLatestExamAttempt(ACCOUNT_KEY, SAMPLE_ATTEMPT)).resolves.toBeUndefined();
    });
  });

  describe('getLatestExamAttempt', () => {
    it('저장된 값이 없으면 null 반환', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
    });

    it('저장된 JSON이 있으면 파싱하여 반환', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SAMPLE_ATTEMPT));
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toEqual(SAMPLE_ATTEMPT);
    });

    it('AsyncStorage 에러 시 null 반환 (안전한 기본값)', async () => {
      mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage error'));
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
    });

    it('malformed JSON이 저장된 경우 null 반환', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce('not-valid-json{{{');
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
    });

    it('wrongProblemNumbers 필드 없는 구버전 페이로드 → null 반환', async () => {
      const legacyPayload = { examId: 'exam-001', attemptId: 'abc', attemptDateISO: '2026-01-01' };
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(legacyPayload));
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
    });

    it('wrongProblemNumbers가 배열이 아닌 경우 → null 반환', async () => {
      const badPayload = { ...SAMPLE_ATTEMPT, wrongProblemNumbers: '3,7,12' };
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(badPayload));
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
    });

    it('계정 범위 키로 조회', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
      await getLatestExamAttempt(ACCOUNT_KEY);
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(KEY);
    });

    it('result 필드 없는 페이로드 → result: null로 정상화', async () => {
      const legacyPayload = {
        examId: 'exam-001',
        attemptId: 'attempt-abc',
        attemptDateISO: '2026-04-27T00:00:00.000Z',
        wrongProblemNumbers: [3, 7, 12],
        // result 없음 — legacy
      };
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(legacyPayload));
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toEqual({
        ...legacyPayload,
        result: null,
      });
    });
  });

  describe('레거시 키 마이그레이션', () => {
    const LEGACY_KEY = 'dasida/latest-exam-attempt';

    it('계정 키 없고 레거시 키 있으면 마이그레이션 후 반환', async () => {
      mockedAsyncStorage.getItem
        .mockResolvedValueOnce(null) // account key → 없음
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_ATTEMPT)); // legacy key → 있음
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      mockedAsyncStorage.removeItem.mockResolvedValueOnce(undefined);

      const result = await getLatestExamAttempt(ACCOUNT_KEY);
      expect(result).toEqual(SAMPLE_ATTEMPT);
      // setItem 먼저, removeItem 나중 (데이터 유실 방지)
      const setItemOrder = mockedAsyncStorage.setItem.mock.invocationCallOrder[0];
      const removeItemOrder = mockedAsyncStorage.removeItem.mock.invocationCallOrder[0];
      expect(setItemOrder).toBeLessThan(removeItemOrder);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(KEY, JSON.stringify(SAMPLE_ATTEMPT));
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    });

    it('레거시 키도 없으면 null 반환', async () => {
      mockedAsyncStorage.getItem
        .mockResolvedValueOnce(null) // account key
        .mockResolvedValueOnce(null); // legacy key
      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('레거시 키가 malformed이면 null 반환 후 레거시 키 삭제', async () => {
      mockedAsyncStorage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('not-valid-json');
      mockedAsyncStorage.removeItem.mockResolvedValueOnce(undefined);

      await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toBeNull();
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    });
  });
});
