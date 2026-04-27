import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LatestExamAttemptSummary } from '@/features/quiz/exam/exam-analysis-in-progress';
import {
  saveLatestExamAttempt,
  getLatestExamAttempt,
} from '@/features/quiz/exam/latest-exam-attempt-store';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const ACCOUNT_KEY = 'user-abc';
const KEY = `dasida/latest-exam-attempt/${ACCOUNT_KEY}`;

const SAMPLE_ATTEMPT: LatestExamAttemptSummary = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27T00:00:00.000Z',
  wrongProblemNumbers: [3, 7, 12],
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
  });
});
