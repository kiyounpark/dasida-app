import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: () => undefined,
}));

jest.mock('@/features/quiz/exam/exam-session', () => ({
  useExamSession: () => ({ hydrateResult: jest.fn() }),
}));

jest.mock('@/features/quiz/exam/sync-diagnosis-progress', () => ({
  syncDiagnosisProgressFromServer: jest.fn(),
}));

import { syncDiagnosisProgressFromServer } from '@/features/quiz/exam/sync-diagnosis-progress';
import { onPressExamHistoryItemImpl } from '../use-history-screen-handlers';

describe('onPressExamHistoryItem', () => {
  const hydrateResult = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const summary = {
    attemptId: 'a1',
    examId: 'exam-1',
    startedAt: '2024-09-01T09:00:00.000Z',
    completedAt: '2024-09-01T10:00:00.000Z',
    total: 3,
    correct: 1,
    wrong: 2,
    unanswered: 0,
    accuracy: 33,
    totalScore: 0,
    maxScore: 0,
    perProblem: [],
  };

  const latestAttempt = {
    examId: 'exam-1',
    attemptId: 'a1',
    attemptDateISO: '2024-09-01T10:00:00.000Z',
    wrongProblemNumbers: [2, 3],
    result: summary,
    results: [],
  };

  it('navigates to result screen with resumed=1 when in_progress', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'in_progress', attemptId: 'a1' } as any,
      latestAttempt,
      hydrateResult,
    );

    expect(syncDiagnosisProgressFromServer).toHaveBeenCalledWith(
      expect.objectContaining({ examId: 'exam-1', attemptId: 'a1' }),
      [],
    );
    expect(hydrateResult).toHaveBeenCalledWith(summary);
    expect(router.push).toHaveBeenCalledWith('/quiz/exam/result?resumed=1');
  });

  it('does nothing when status is completed', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'completed', attemptId: 'a1' } as any,
      latestAttempt,
      hydrateResult,
    );

    expect(hydrateResult).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does nothing when attemptId mismatch', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'in_progress', attemptId: 'other' } as any,
      latestAttempt,
      hydrateResult,
    );

    expect(hydrateResult).not.toHaveBeenCalled();
  });

  it('does nothing when latestAttempt.result is null', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'in_progress', attemptId: 'a1' } as any,
      { ...latestAttempt, result: null },
      hydrateResult,
    );

    expect(hydrateResult).not.toHaveBeenCalled();
  });
});
