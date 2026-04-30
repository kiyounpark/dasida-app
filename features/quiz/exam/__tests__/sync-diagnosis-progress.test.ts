import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningAttemptResult } from '@/features/learning/types';

import { syncDiagnosisProgressFromServer } from '../sync-diagnosis-progress';
import { getDiagnosisProgress } from '../exam-diagnosis-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

function makeResult(
  questionNumber: number,
  overrides?: Partial<LearningAttemptResult>,
): LearningAttemptResult {
  return {
    id: `r-${questionNumber}`,
    attemptId: 'attempt-1',
    accountKey: 'acc',
    source: 'featured-exam',
    sourceEntityId: 'exam-1',
    questionId: `q-${questionNumber}`,
    questionNumber,
    topic: 'exam',
    selectedIndex: 1,
    isCorrect: false,
    finalWeaknessId: null,
    methodId: null,
    diagnosisSource: null,
    finalMethodSource: null,
    diagnosisCompleted: false,
    usedDontKnow: false,
    usedAiHelp: false,
    schemaVersion: 1,
    resolvedAt: '2024-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const SCOPE = {
  examId: 'exam-1',
  attemptId: 'attempt-1',
  // 2024-09-01T10:00:00.000Z UTC == 2024-09-01T19:00:00 KST → 키 라벨은 "2024-09-01"
  attemptDateISO: '2024-09-01T10:00:00.000Z',
};
const EXPECTED_KEY = 'dasida/exam-diagnosis/exam-1/2024-09-01-attempt-1';

describe('syncDiagnosisProgressFromServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a map of diagnosed problems with weakness ids', async () => {
    const results = [
      makeResult(1, { isCorrect: true }),
      makeResult(2, { diagnosisCompleted: true, finalWeaknessId: 'formula_understanding' }),
      makeResult(5, { diagnosisCompleted: true, finalWeaknessId: 'calc_repeated_error' }),
      makeResult(7, { diagnosisCompleted: false, finalWeaknessId: null }),
    ];

    await syncDiagnosisProgressFromServer(SCOPE, results);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      EXPECTED_KEY,
      JSON.stringify({ 2: 'formula_understanding', 5: 'calc_repeated_error' }),
    );

    // verify getDiagnosisProgress reads from the same key
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ 2: 'formula_understanding', 5: 'calc_repeated_error' }),
    );
    const progress = await getDiagnosisProgress(SCOPE);
    expect(progress).toEqual({ 2: 'formula_understanding', 5: 'calc_repeated_error' });
  });

  it('overwrites existing local progress (server is authoritative)', async () => {
    // first call
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(2, { diagnosisCompleted: true, finalWeaknessId: 'formula_understanding' }),
    ]);

    // second call — should overwrite
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(5, { diagnosisCompleted: true, finalWeaknessId: 'calc_repeated_error' }),
    ]);

    const calls = mockedAsyncStorage.setItem.mock.calls;
    expect(calls).toHaveLength(2);
    // both calls use the same key
    expect(calls[0][0]).toBe(EXPECTED_KEY);
    expect(calls[1][0]).toBe(EXPECTED_KEY);
    // second call contains only the new result (full overwrite)
    expect(calls[1][1]).toBe(JSON.stringify({ 5: 'calc_repeated_error' }));
  });

  it('writes empty object when no diagnosed results present', async () => {
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(1, { isCorrect: true }),
      makeResult(2, { diagnosisCompleted: false }),
    ]);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(EXPECTED_KEY, JSON.stringify({}));
  });

  it('skips entries with diagnosisCompleted=true but null weaknessId (defensive)', async () => {
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(2, { diagnosisCompleted: true, finalWeaknessId: null }),
    ]);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(EXPECTED_KEY, JSON.stringify({}));
  });
});
