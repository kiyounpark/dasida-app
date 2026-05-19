import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeAttemptReviewTaskWrite,
  FinalizedAttemptInputSchema,
  type FinalizedAttemptInput,
  type ReviewTask,
} from '../src/learning-history';

const ACCOUNT_KEY = 'user:test-user';

function createMinimalQuestion(
  overrides: Partial<FinalizedAttemptInput['questions'][0]> = {},
): FinalizedAttemptInput['questions'][0] {
  return {
    questionId: 'question-1',
    questionNumber: 1,
    topic: '이차함수',
    selectedIndex: 2,
    isCorrect: false,
    finalWeaknessId: 'formula_understanding',
    methodId: null,
    diagnosisSource: null,
    finalMethodSource: null,
    diagnosisCompleted: true,
    usedDontKnow: false,
    usedAiHelp: false,
    ...overrides,
  };
}

function createStaleDiagnosticInput(): FinalizedAttemptInput {
  return FinalizedAttemptInputSchema.parse({
    attemptId: 'stale-diagnostic-attempt',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-03-01T09:00:00.000Z',
    completedAt: '2026-03-01T09:10:00.000Z',
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding'],
    questions: [createMinimalQuestion()],
  });
}

// The learner already advanced this weakness to day3 via real review sessions
// after the (now stale) diagnostic was completed offline.
const existingDay3: ReviewTask = {
  id: 'old-source__formula_understanding__day3',
  accountKey: ACCOUNT_KEY,
  weaknessId: 'formula_understanding',
  source: 'diagnostic',
  sourceId: 'old-source',
  scheduledFor: '2026-03-25T00:00:00.000Z',
  stage: 'day3',
  completed: false,
  createdAt: '2026-03-04T00:00:00.000Z',
};

// C1: replaying a stale diagnostic MUST NOT mutate the live review schedule.
test('computeAttemptReviewTaskWrite: replay=true produces no review-task mutations', () => {
  const input = createStaleDiagnosticInput();

  const { upserts, deletes } = computeAttemptReviewTaskWrite(input, [existingDay3], {
    replay: true,
  });

  assert.equal(upserts.length, 0, 'replay must not upsert/recreate review tasks');
  assert.equal(deletes.length, 0, 'replay must not delete the live day3 task');
});

// Regression guard: non-replay path keeps the existing (destructive) behavior.
test('computeAttemptReviewTaskWrite: replay=false keeps existing rebuild behavior', () => {
  const input = createStaleDiagnosticInput();

  const { upserts, deletes } = computeAttemptReviewTaskWrite(input, [existingDay3]);

  assert.ok(
    deletes.some((task) => task.id === existingDay3.id),
    'non-replay path still removes the stale-superseded day3 task (unchanged behavior)',
  );
  assert.ok(
    upserts.some(
      (task) => task.weaknessId === 'formula_understanding' && task.stage === 'day1',
    ),
    'non-replay path still recreates a day1 task (unchanged behavior)',
  );
});
