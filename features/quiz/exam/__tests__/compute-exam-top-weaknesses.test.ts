import { computeExamTopWeaknesses } from '../compute-exam-top-weaknesses';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';

describe('computeExamTopWeaknesses', () => {
  it('returns empty array for empty progress', () => {
    expect(computeExamTopWeaknesses({})).toEqual([]);
  });

  it('returns single weakness', () => {
    const progress: ExamDiagnosisProgress = { 1: 'calc_repeated_error' };
    expect(computeExamTopWeaknesses(progress)).toEqual(['calc_repeated_error']);
  });

  it('sorts by frequency descending', () => {
    const progress: ExamDiagnosisProgress = {
      1: 'formula_understanding',
      2: 'calc_repeated_error',
      3: 'formula_understanding',
      4: 'calc_repeated_error',
      5: 'calc_repeated_error',
    };
    const result = computeExamTopWeaknesses(progress);
    expect(result[0]).toBe('calc_repeated_error'); // 3 occurrences
    expect(result[1]).toBe('formula_understanding'); // 2 occurrences
  });

  it('includes each weakness id exactly once', () => {
    const progress: ExamDiagnosisProgress = {
      1: 'formula_understanding',
      2: 'formula_understanding',
      3: 'formula_understanding',
    };
    const result = computeExamTopWeaknesses(progress);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('formula_understanding');
  });
});
