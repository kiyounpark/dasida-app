import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDiagnosisProgress,
  markProblemDiagnosed,
  purgeLegacyDiagnosisKey,
  type ExamDiagnosisProgress,
} from './exam-diagnosis-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE = {
  examId: 'exam-x',
  attemptId: 'attempt-123',
  // 2026-04-25 15:00 UTC == 2026-04-26 00:00 KST → 키 라벨은 KST 기준 "2026-04-26"
  attemptDateISO: '2026-04-25T15:00:00.000Z',
};
const EXPECTED_KEY = 'dasida/exam-diagnosis/exam-x/2026-04-26-attempt-123';
const LEGACY_KEY = 'dasida/exam-diagnosis/exam-x';

describe('exam-diagnosis-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDiagnosisProgress', () => {
    it('attempt scope로 스코프된 키에서 진행 데이터를 읽는다', async () => {
      const stored: ExamDiagnosisProgress = { 5: 'formula_understanding' };
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));

      const result = await getDiagnosisProgress(SCOPE);

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(EXPECTED_KEY);
      expect(result).toEqual(stored);
    });

    it('값이 없으면 빈 객체를 반환한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await getDiagnosisProgress(SCOPE);

      expect(result).toEqual({});
    });

    it('파싱 실패 시 빈 객체를 반환한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce('not-json');

      const result = await getDiagnosisProgress(SCOPE);

      expect(result).toEqual({});
    });

    it('다른 attemptId는 같은 examId여도 다른 키를 사용한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      await getDiagnosisProgress({ ...SCOPE, attemptId: 'attempt-other' });

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(
        'dasida/exam-diagnosis/exam-x/2026-04-26-attempt-other',
      );
    });
  });

  describe('markProblemDiagnosed', () => {
    it('attempt scope로 스코프된 키에 진단 결과를 추가한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      await markProblemDiagnosed(SCOPE, 7, 'calc_repeated_error');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        EXPECTED_KEY,
        JSON.stringify({ 7: 'calc_repeated_error' }),
      );
    });

    it('기존 진행 데이터를 보존하며 새 진단을 머지한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 3: 'formula_understanding' }),
      );

      await markProblemDiagnosed(SCOPE, 7, 'calc_repeated_error');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        EXPECTED_KEY,
        JSON.stringify({
          3: 'formula_understanding',
          7: 'calc_repeated_error',
        }),
      );
    });
  });

  describe('purgeLegacyDiagnosisKey', () => {
    it('attemptId가 없는 옛날 키를 삭제한다', async () => {
      await purgeLegacyDiagnosisKey('exam-x');

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    });

    it('removeItem을 정확히 1번만 호출한다', async () => {
      await purgeLegacyDiagnosisKey('exam-x');

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    });
  });
});
