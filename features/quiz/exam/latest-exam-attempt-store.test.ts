import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LatestExamAttemptSummary } from '@/features/quiz/exam/exam-analysis-in-progress';
import {
  saveLatestExamAttempt,
  getLatestExamAttempt,
} from '@/features/quiz/exam/latest-exam-attempt-store';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SAMPLE_ATTEMPT: LatestExamAttemptSummary = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27T00:00:00.000Z',
  wrongProblemNumbers: [3, 7, 12],
};

const KEY = 'dasida/latest-exam-attempt';

describe('latest-exam-attempt-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLatestExamAttempt', () => {
    it('attempt를 JSON으로 직렬화하여 AsyncStorage에 저장', async () => {
      mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      await saveLatestExamAttempt(SAMPLE_ATTEMPT);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        KEY,
        JSON.stringify(SAMPLE_ATTEMPT),
      );
    });

    it('AsyncStorage 에러 시 예외를 전파하지 않음 (안전한 무시)', async () => {
      mockedAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage full'));
      await expect(saveLatestExamAttempt(SAMPLE_ATTEMPT)).resolves.toBeUndefined();
    });
  });

  describe('getLatestExamAttempt', () => {
    it('저장된 값이 없으면 null 반환', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
      await expect(getLatestExamAttempt()).resolves.toBeNull();
    });

    it('저장된 JSON이 있으면 파싱하여 반환', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SAMPLE_ATTEMPT));
      await expect(getLatestExamAttempt()).resolves.toEqual(SAMPLE_ATTEMPT);
    });

    it('AsyncStorage 에러 시 null 반환 (안전한 기본값)', async () => {
      mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage error'));
      await expect(getLatestExamAttempt()).resolves.toBeNull();
    });
  });
});
