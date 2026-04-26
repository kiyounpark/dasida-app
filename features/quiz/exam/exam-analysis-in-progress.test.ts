import type { WeaknessId } from '@/data/diagnosisMap';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressInput,
} from '@/features/quiz/exam/exam-analysis-in-progress';

const w = (s: string) => s as unknown as WeaknessId;

describe('computeAnalysisInProgressState', () => {
  it('어템트 없으면 inactive', () => {
    expect(computeAnalysisInProgressState({ latestAttempt: null, diagnosedProblems: {} })).toEqual({
      isInProgress: false,
    });
  });

  it('오답 0개면 inactive', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: { examId: 'e1', attemptId: 'a1', attemptDateISO: '2026-04-26', wrongProblemNumbers: [] },
        diagnosedProblems: {},
      }),
    ).toEqual({ isInProgress: false });
  });

  it('진단 0/N: 진행 중', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
        },
        diagnosedProblems: {},
      }),
    ).toEqual({
      isInProgress: true,
      examId: 'e1',
      attemptId: 'a1',
      noteCount: 0,
      totalNotes: 3,
      diagnosedNotes: [],
    });
  });

  it('진단 2/3: 진행 중, noteCount 2', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
        },
        diagnosedProblems: { 1: w('w_basic'), 2: w('w_advanced') },
      }),
    ).toEqual({
      isInProgress: true,
      examId: 'e1',
      attemptId: 'a1',
      noteCount: 2,
      totalNotes: 3,
      diagnosedNotes: [
        { problemNumber: 1, weaknessId: 'w_basic' },
        { problemNumber: 2, weaknessId: 'w_advanced' },
      ],
    });
  });

  it('진단 3/3 (완료): inactive (종합 리포트가 노출되어야 함)', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
        },
        diagnosedProblems: { 1: w('w1'), 2: w('w2'), 3: w('w3') },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('diagnosedProblems에 wrongProblemNumbers 외 키가 있어도 무시 (재시도 케이스)', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2],
        },
        diagnosedProblems: { 1: w('w1'), 99: w('w_stale') },
      }),
    ).toEqual({
      isInProgress: true,
      examId: 'e1',
      attemptId: 'a1',
      noteCount: 1,
      totalNotes: 2,
      diagnosedNotes: [{ problemNumber: 1, weaknessId: 'w1' }],
    });
  });
});
