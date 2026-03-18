import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewTasks,
  buildSummary,
  createEmptyLearnerSummary,
  FinalizedAttemptInputSchema,
  type FinalizedAttemptInput,
  type LearningAttempt,
  type LearningAttemptResult,
  type ReviewTask,
} from '../src/learning-history';
import { ListLearningAttemptsQuerySchema } from '../src/list-learning-attempts';

const ACCOUNT_KEY = 'user:test-user';

function createDiagnosticAttempt(): LearningAttempt {
  return {
    id: 'attempt-diagnostic-1',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-03-16T08:00:00.000Z',
    completedAt: '2026-03-16T08:10:00.000Z',
    questionCount: 10,
    correctCount: 7,
    wrongCount: 3,
    accuracy: 70,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding', 'calc_repeated_error'],
    schemaVersion: 1,
    createdAt: '2026-03-16T08:10:00.000Z',
  };
}

function createWeaknessPracticeAttempt(): LearningAttempt {
  return {
    id: 'weakness-practice-min-value-p1',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'weakness-practice',
    sourceEntityId: 'min_value_read_confusion',
    gradeSnapshot: 'g3',
    startedAt: '2026-03-17T09:00:00.000Z',
    completedAt: '2026-03-17T09:02:00.000Z',
    questionCount: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    primaryWeaknessId: 'min_value_read_confusion',
    topWeaknesses: ['min_value_read_confusion'],
    schemaVersion: 1,
    createdAt: '2026-03-17T09:02:00.000Z',
  };
}

function createDiagnosticResult(attempt: LearningAttempt): LearningAttemptResult {
  return {
    id: `${attempt.id}__question-1`,
    attemptId: attempt.id,
    accountKey: ACCOUNT_KEY,
    source: 'diagnostic',
    sourceEntityId: null,
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
    schemaVersion: 1,
    resolvedAt: attempt.completedAt,
  };
}

function createWeaknessPracticeResult(attempt: LearningAttempt): LearningAttemptResult {
  return {
    id: `${attempt.id}__p_min_value_read_confusion`,
    attemptId: attempt.id,
    accountKey: ACCOUNT_KEY,
    source: 'weakness-practice',
    sourceEntityId: 'min_value_read_confusion',
    questionId: 'p_min_value_read_confusion',
    questionNumber: 1,
    topic: '최솟값 읽기 혼동',
    firstSelectedIndex: 0,
    selectedIndex: 1,
    isCorrect: true,
    finalWeaknessId: 'min_value_read_confusion',
    methodId: null,
    diagnosisSource: null,
    finalMethodSource: null,
    diagnosisCompleted: true,
    usedDontKnow: false,
    usedAiHelp: false,
    wrongAttempts: 1,
    usedCoaching: true,
    resolvedBy: 'solved',
    schemaVersion: 1,
    resolvedAt: attempt.completedAt,
  };
}

function createReviewTask(attempt: LearningAttempt): ReviewTask {
  return {
    id: 'attempt-diagnostic-1__formula_understanding__day1',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'diagnostic',
    sourceId: attempt.id,
    scheduledFor: '2026-03-17T08:10:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: attempt.completedAt,
  };
}

test('accepts weakness-practice attempt payloads and skips review tasks', () => {
  const weaknessPracticeInput: FinalizedAttemptInput = {
    attemptId: 'weakness-practice-min-value-p1',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'weakness-practice',
    sourceEntityId: 'min_value_read_confusion',
    gradeSnapshot: 'g3',
    startedAt: '2026-03-17T09:00:00.000Z',
    completedAt: '2026-03-17T09:02:00.000Z',
    questionCount: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    primaryWeaknessId: 'min_value_read_confusion',
    topWeaknesses: ['min_value_read_confusion'],
    questions: [
      {
        questionId: 'p_min_value_read_confusion',
        questionNumber: 1,
        topic: '최솟값 읽기 혼동',
        firstSelectedIndex: 0,
        selectedIndex: 1,
        isCorrect: true,
        finalWeaknessId: 'min_value_read_confusion',
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
        wrongAttempts: 1,
        usedCoaching: true,
        resolvedBy: 'solved',
      },
    ],
  };

  const parsed = FinalizedAttemptInputSchema.parse(weaknessPracticeInput);

  assert.equal(parsed.source, 'weakness-practice');
  assert.equal(parsed.questions[0]?.firstSelectedIndex, 0);
  assert.equal(parsed.questions[0]?.wrongAttempts, 1);
  assert.equal(parsed.questions[0]?.usedCoaching, true);
  assert.equal(parsed.questions[0]?.resolvedBy, 'solved');
  assert.deepEqual(buildReviewTasks(parsed), []);
});

test('buildSummary ignores weakness-practice for repeated weaknesses and recent activity', () => {
  const diagnosticAttempt = createDiagnosticAttempt();
  const weaknessAttempt = createWeaknessPracticeAttempt();
  const reviewTask = createReviewTask(diagnosticAttempt);
  const summary = buildSummary(
    ACCOUNT_KEY,
    [weaknessAttempt, diagnosticAttempt],
    [createWeaknessPracticeResult(weaknessAttempt), createDiagnosticResult(diagnosticAttempt)],
    [reviewTask],
    createEmptyLearnerSummary(ACCOUNT_KEY),
  );

  assert.equal(summary.latestDiagnosticSummary?.attemptId, diagnosticAttempt.id);
  assert.equal(summary.repeatedWeaknesses.length, 1);
  assert.equal(summary.repeatedWeaknesses[0]?.weaknessId, 'formula_understanding');
  assert.equal(
    summary.repeatedWeaknesses.some(
      (weakness) => weakness.weaknessId === 'min_value_read_confusion',
    ),
    false,
  );
  assert.equal(summary.nextReviewTask?.id, reviewTask.id);
  assert.equal(summary.totals.diagnosticAttempts, 1);
  assert.equal(summary.totals.featuredExamAttempts, 0);
  assert.equal(summary.recentActivity.some((activity) => activity.id === weaknessAttempt.id), false);
  assert.equal(summary.recentActivity.some((activity) => activity.id === diagnosticAttempt.id), true);
});

test('listLearningAttempts query accepts weakness-practice source filter', () => {
  const parsed = ListLearningAttemptsQuerySchema.parse({
    accountKey: ACCOUNT_KEY,
    source: 'weakness-practice',
    limit: '10',
  });

  assert.equal(parsed.source, 'weakness-practice');
  assert.equal(parsed.limit, 10);
});
