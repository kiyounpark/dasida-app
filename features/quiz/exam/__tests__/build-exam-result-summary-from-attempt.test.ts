import type { LearningAttempt, LearningAttemptResult } from '@/features/learning/types';

import { buildExamResultSummaryFromAttempt } from '../build-exam-result-summary-from-attempt';

const FAKE_EXAM_ID = '2024-09-mock';

function makeAttempt(overrides?: Partial<LearningAttempt>): LearningAttempt {
  return {
    id: 'attempt-1',
    accountKey: 'acc',
    learnerId: 'learner-1',
    source: 'featured-exam',
    sourceEntityId: FAKE_EXAM_ID,
    gradeSnapshot: 'high2',
    startedAt: '2024-09-01T09:00:00.000Z',
    completedAt: '2024-09-01T10:00:00.000Z',
    questionCount: 3,
    correctCount: 1,
    wrongCount: 2,
    accuracy: 33,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2024-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeResult(
  questionNumber: number,
  overrides?: Partial<LearningAttemptResult>,
): LearningAttemptResult {
  return {
    id: `r-${questionNumber}`,
    attemptId: 'attempt-1',
    accountKey: 'acc',
    source: 'featured-exam',
    sourceEntityId: FAKE_EXAM_ID,
    questionId: `${FAKE_EXAM_ID}-${questionNumber}`,
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

describe('buildExamResultSummaryFromAttempt', () => {
  it('reconstructs basic summary fields from attempt + results', () => {
    const attempt = makeAttempt();
    const results = [
      makeResult(1, { isCorrect: true, selectedIndex: 2 }),
      makeResult(2, { isCorrect: false, selectedIndex: 3 }),
      makeResult(3, { isCorrect: false, selectedIndex: null }),
    ];

    const summary = buildExamResultSummaryFromAttempt({ attempt, results });

    expect(summary.attemptId).toBe('attempt-1');
    expect(summary.examId).toBe(FAKE_EXAM_ID);
    expect(summary.startedAt).toBe(attempt.startedAt);
    expect(summary.completedAt).toBe(attempt.completedAt);
    expect(summary.total).toBe(3);
    expect(summary.correct).toBe(1);
    expect(summary.wrong).toBe(1);
    expect(summary.unanswered).toBe(1);
    expect(summary.accuracy).toBe(33);
  });

  it('orders perProblem by questionNumber ascending', () => {
    const attempt = makeAttempt();
    const results = [makeResult(3), makeResult(1), makeResult(2)];

    const summary = buildExamResultSummaryFromAttempt({ attempt, results });

    expect(summary.perProblem.map((p) => p.number)).toEqual([1, 2, 3]);
  });

  it('returns null sourceEntityId as empty examId fallback', () => {
    const attempt = makeAttempt({ sourceEntityId: null });
    const summary = buildExamResultSummaryFromAttempt({ attempt, results: [] });
    expect(summary.examId).toBe('');
  });
});
