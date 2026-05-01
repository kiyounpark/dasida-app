import type { LearningAttempt } from '@/features/learning/types';

import { filterLegacyPerProblemAttempts } from '../filter-legacy-per-problem-attempts';

function makeAttempt(id: string, completedAt: string): LearningAttempt {
  return {
    id,
    accountKey: 'a1',
    learnerId: 'l1',
    source: 'featured-exam',
    sourceEntityId: 'exam-1',
    gradeSnapshot: 'g3',
    startedAt: completedAt,
    completedAt,
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: null,
    topWeaknesses: [],
  } as unknown as LearningAttempt;
}

describe('filterLegacyPerProblemAttempts', () => {
  it('removes per-problem diagnosis attempts (exam-diag- prefix)', () => {
    const attempts = [
      makeAttempt('exam-diag-exam-1-p3-aaa', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z'),
    ];

    const result = filterLegacyPerProblemAttempts(attempts);

    expect(result.map((a) => a.id)).toEqual(['exam-attempt-1']);
  });

  it('preserves order of remaining attempts', () => {
    const attempts = [
      makeAttempt('exam-attempt-3', '2026-05-02T12:00:00.000Z'),
      makeAttempt('exam-diag-exam-1-p3-aaa', '2026-05-02T11:00:00.000Z'),
      makeAttempt('exam-attempt-2', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z'),
    ];

    const result = filterLegacyPerProblemAttempts(attempts);

    expect(result.map((a) => a.id)).toEqual([
      'exam-attempt-3',
      'exam-attempt-2',
      'exam-attempt-1',
    ]);
  });

  it('returns empty when input is empty', () => {
    expect(filterLegacyPerProblemAttempts([])).toEqual([]);
  });

  it('returns empty when all are per-problem attempts', () => {
    const attempts = [
      makeAttempt('exam-diag-exam-1-p1-aaa', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-diag-exam-1-p2-bbb', '2026-05-02T11:00:00.000Z'),
    ];

    expect(filterLegacyPerProblemAttempts(attempts)).toEqual([]);
  });

  it('handles saturated per-problem case (100 per-problem + 1 exam)', () => {
    const perProblems = Array.from({ length: 100 }, (_, i) =>
      makeAttempt(`exam-diag-exam-1-p${i}-${i}`, '2026-05-02T11:00:00.000Z'),
    );
    const examAttempt = makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z');

    const result = filterLegacyPerProblemAttempts([...perProblems, examAttempt]);

    expect(result.map((a) => a.id)).toEqual(['exam-attempt-1']);
  });
});
