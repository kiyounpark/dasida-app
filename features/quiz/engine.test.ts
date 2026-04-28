import { buildQuizResult } from '@/features/quiz/engine';
import type { QuizAnswer } from '@/features/quiz/types';
import type { WeaknessId } from '@/data/diagnosisMap';

describe('buildQuizResult', () => {
  it('약점별 오답 횟수를 wrongByWeakness로 노출한다', () => {
    const answers: QuizAnswer[] = [
      { problemId: 'q1', selectedIndex: 0, isCorrect: false, weaknessId: 'formula_understanding' },
      { problemId: 'q2', selectedIndex: 1, isCorrect: false, weaknessId: 'formula_understanding' },
      { problemId: 'q3', selectedIndex: 0, isCorrect: false, weaknessId: 'calc_repeated_error' },
      { problemId: 'q4', selectedIndex: 0, isCorrect: true, weaknessId: 'formula_understanding' },
    ];
    const weaknessScores = {
      formula_understanding: 2,
      calc_repeated_error: 1,
    } as Record<WeaknessId, number>;

    const result = buildQuizResult(
      'attempt-1',
      '2026-04-28T00:00:00.000Z',
      '2026-04-28T00:10:00.000Z',
      answers,
      weaknessScores,
      4,
    );

    expect(result.wrongByWeakness).toBeDefined();
    expect(result.wrongByWeakness?.['formula_understanding']).toBe(2);
    expect(result.wrongByWeakness?.['calc_repeated_error']).toBe(1);
  });
});
