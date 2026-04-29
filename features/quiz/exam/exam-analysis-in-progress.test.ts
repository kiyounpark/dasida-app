import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamResultSummary } from '@/features/quiz/exam/types';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressInput,
} from '@/features/quiz/exam/exam-analysis-in-progress';

const w = (s: string) => s as unknown as WeaknessId;

const SAMPLE_RESULT: ExamResultSummary = {
  attemptId: 'a1',
  examId: 'e1',
  startedAt: '2026-04-26T00:00:00.000Z',
  completedAt: '2026-04-26T01:00:00.000Z',
  total: 3,
  correct: 0,
  wrong: 3,
  unanswered: 0,
  accuracy: 0,
  totalScore: 0,
  maxScore: 9,
  perProblem: [
    { number: 1, userAnswer: 2, correctAnswer: 1, isCorrect: false, earnedScore: 0 },
    { number: 2, userAnswer: 3, correctAnswer: 2, isCorrect: false, earnedScore: 0 },
    { number: 3, userAnswer: 1, correctAnswer: 4, isCorrect: false, earnedScore: 0 },
  ],
};

describe('computeAnalysisInProgressState', () => {
  it('어템트 없으면 inactive', () => {
    expect(computeAnalysisInProgressState({ latestAttempt: null, diagnosedProblems: {} })).toEqual({
      isInProgress: false,
    });
  });

  it('오답 0개면 inactive', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: { examId: 'e1', attemptId: 'a1', attemptDateISO: '2026-04-26', wrongProblemNumbers: [], result: null },
        diagnosedProblems: {},
      }),
    ).toEqual({ isInProgress: false });
  });

  it('legacy data (result == null)면 inactive', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
          result: null,
        },
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
          result: SAMPLE_RESULT,
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
          result: SAMPLE_RESULT,
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
          result: SAMPLE_RESULT,
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
          result: SAMPLE_RESULT,
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
