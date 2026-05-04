// features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts
import type { WeaknessId } from '@/data/diagnosisMap';

import {
  computeAnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '../exam-analysis-in-progress';

const w = (s: string) => s as unknown as WeaknessId;

function attempt(
  examId: string,
  attemptId: string,
  attemptDateISO: string,
  wrong: number[],
): LatestExamAttemptSummary {
  return {
    examId,
    attemptId,
    attemptDateISO,
    wrongProblemNumbers: wrong,
    result: { examId, attemptId, completedAt: attemptDateISO } as never,
  };
}

describe('computeAnalysisInProgressState', () => {
  it('빈 attempts 입력 → isInProgress: false', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [],
        diagnosedProblemsByAttempt: {},
      }),
    ).toEqual({ isInProgress: false });
  });

  it('result null인 attempt는 items에서 제외', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2]);
    const noResult = { ...a, result: null };
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [noResult],
        diagnosedProblemsByAttempt: { a1: {} },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('wrongProblemNumbers 빈 attempt → items에서 제외', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', []);
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [a],
        diagnosedProblemsByAttempt: { a1: {} },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('1건 입력, 진단 미완 → items.length 1', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2, 3]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [a],
      diagnosedProblemsByAttempt: { a1: { 1: w('w_x') } },
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      examId: 'exam-A',
      attemptId: 'a1',
      noteCount: 1,
      totalNotes: 3,
    });
    expect(state.items[0].diagnosedNotes).toEqual([
      { problemNumber: 1, weaknessId: w('w_x') },
    ]);
  });

  it('3건 입력, 모두 진단 미완 → items.length 3, 입력 순서 유지', () => {
    const c = attempt('exam-C', 'c1', '2026-05-03T00:00:00Z', [1]);
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z', [1]);
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [c, b, a],
      diagnosedProblemsByAttempt: { c1: {}, b1: {}, a1: {} },
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items.map((i) => i.attemptId)).toEqual(['c1', 'b1', 'a1']);
  });

  it('3건 입력, 그중 1건은 모두 진단 완료 → items.length 2 (완료 attempt 제외)', () => {
    const c = attempt('exam-C', 'c1', '2026-05-03T00:00:00Z', [1, 2]);
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z', [1]); // 모두 완료
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [c, b, a],
      diagnosedProblemsByAttempt: {
        c1: { 1: w('w_x') },
        b1: { 1: w('w_y') },
        a1: {},
      },
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items.map((i) => i.attemptId)).toEqual(['c1', 'a1']);
  });

  it('모든 attempt 진단 완료 → isInProgress: false', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1]);
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [a],
        diagnosedProblemsByAttempt: { a1: { 1: w('w_x') } },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('diagnosedProblemsByAttempt에 키가 없는 attempt → 진단 0건으로 처리', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [a],
      diagnosedProblemsByAttempt: {}, // a1 키 없음
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items[0].noteCount).toBe(0);
    expect(state.items[0].diagnosedNotes).toEqual([]);
  });
});
