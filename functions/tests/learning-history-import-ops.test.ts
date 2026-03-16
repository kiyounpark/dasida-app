import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyImportWriteOperationsWithMerge,
  buildImportWriteOperationPath,
  buildImportWriteOperations,
  groupImportWriteOperations,
} from '../src/learning-history-import-ops';
import {
  buildSummary,
  createEmptyLearnerSummary,
  mergeImportedFeaturedExamState,
  type FeaturedExamState,
  type LearningAttempt,
  type LearningAttemptResult,
  type ReviewTask,
} from '../src/learning-history';

const TARGET_ACCOUNT_KEY = 'user:test-user';
const SOURCE_ACCOUNT_KEY = 'anon:device-one';
const FEATURED_EXAM_STATE: FeaturedExamState = {
  examId: 'featured-mock-1',
  status: 'in_progress',
  questionIndex: 12,
  lastOpenedAt: '2026-03-16T09:00:00.000Z',
};

function readCollectionDocuments<T extends Record<string, unknown>>(
  store: Map<string, Record<string, unknown>>,
  collectionPath: string,
) {
  return Array.from(store.entries())
    .filter(([path]) => path.startsWith(collectionPath))
    .map(([, value]) => value as T);
}

function createAttempt(index: number): LearningAttempt {
  const day = String(index + 1).padStart(2, '0');
  const completedAt = `2026-03-${day}T12:00:00.000Z`;

  return {
    id: `attempt-${index + 1}`,
    accountKey: SOURCE_ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: `2026-03-${day}T11:00:00.000Z`,
    completedAt,
    questionCount: 150,
    correctCount: 90,
    wrongCount: 60,
    accuracy: 60,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding', 'calc_repeated_error', 'derivative_calculation'],
    schemaVersion: 1,
    createdAt: completedAt,
  };
}

function createAttemptResults(attempt: LearningAttempt): LearningAttemptResult[] {
  return Array.from({ length: attempt.questionCount }, (_, index) => ({
    id: `${attempt.id}__question-${index + 1}`,
    attemptId: attempt.id,
    accountKey: SOURCE_ACCOUNT_KEY,
    source: attempt.source,
    sourceEntityId: attempt.sourceEntityId,
    questionId: `question-${index + 1}`,
    questionNumber: index + 1,
    topic: `topic-${(index % 3) + 1}`,
    selectedIndex: index % 5,
    isCorrect: index % 5 !== 0,
    finalWeaknessId: index % 2 === 0 ? 'formula_understanding' : 'calc_repeated_error',
    methodId: null,
    diagnosisSource: null,
    finalMethodSource: null,
    diagnosisCompleted: true,
    usedDontKnow: index % 7 === 0,
    usedAiHelp: index % 11 === 0,
    schemaVersion: 1,
    resolvedAt: attempt.completedAt,
  }));
}

function createReviewTask(attempt: LearningAttempt, index: number): ReviewTask {
  return {
    id: `task-${index + 1}`,
    accountKey: SOURCE_ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'diagnostic',
    sourceId: attempt.id,
    scheduledFor: `2026-03-${String(index + 10).padStart(2, '0')}T12:00:00.000Z`,
    stage: index === 0 ? 'day1' : index === 1 ? 'day3' : 'day7',
    completed: false,
    createdAt: attempt.completedAt,
  };
}

function createImportFixture() {
  const attempts = Array.from({ length: 3 }, (_, index) => createAttempt(index));
  const resultsByAttemptId = Object.fromEntries(
    attempts.map((attempt) => [attempt.id, createAttemptResults(attempt)]),
  );
  const reviewTasks = attempts.map((attempt, index) => createReviewTask(attempt, index));

  return {
    targetAccountKey: TARGET_ACCOUNT_KEY,
    sourceAnonymousAccountKey: SOURCE_ACCOUNT_KEY,
    attempts,
    resultsByAttemptId,
    reviewTasks,
    featuredExamState: FEATURED_EXAM_STATE,
  };
}

test('groups large imports into multiple Firestore batches', () => {
  const fixture = createImportFixture();
  const { operations } = buildImportWriteOperations(fixture);
  const batches = groupImportWriteOperations(operations);

  assert.equal(operations.length, 457);
  assert.equal(batches.length, 2);
  assert.equal(batches[0]?.length, 400);
  assert.equal(batches[1]?.length, 57);
});

test('retries partial import batches without creating duplicate documents', () => {
  const fixture = createImportFixture();
  const store = new Map<string, Record<string, unknown>>();
  const { migrationSourceHash, operations } = buildImportWriteOperations(fixture);

  assert.throws(() => {
    applyImportWriteOperationsWithMerge({
      targetAccountKey: fixture.targetAccountKey,
      store,
      operations,
      committedBatchCountBeforeFailure: 1,
    });
  }, /Simulated import failure/);

  assert.equal(store.size, 400);

  applyImportWriteOperationsWithMerge({
    targetAccountKey: fixture.targetAccountKey,
    store,
    operations,
  });

  applyImportWriteOperationsWithMerge({
    targetAccountKey: fixture.targetAccountKey,
    store,
    operations,
  });

  assert.equal(store.size, operations.length);

  const attempts = readCollectionDocuments<LearningAttempt>(
    store,
    `users/${fixture.targetAccountKey}/attempts/`,
  );
  const results = readCollectionDocuments<LearningAttemptResult>(
    store,
    `users/${fixture.targetAccountKey}/attemptResults/`,
  );
  const reviewTasks = readCollectionDocuments<ReviewTask>(
    store,
    `users/${fixture.targetAccountKey}/reviewTasks/`,
  );
  const migrationLedger = store.get(
    buildImportWriteOperationPath(fixture.targetAccountKey, {
      collection: 'migrationLedger',
      docId: 'migrations',
      data: {
        markers: {},
        updatedAt: '2026-03-16T00:00:00.000Z',
      },
    }),
  ) as
    | {
        markers?: Record<string, { sourceAnonymousAccountKey: string }>;
      }
    | undefined;

  assert.equal(attempts.length, fixture.attempts.length);
  assert.equal(results.length, 450);
  assert.equal(reviewTasks.length, fixture.reviewTasks.length);
  assert.ok(attempts.every((attempt) => attempt.accountKey === fixture.targetAccountKey));
  assert.ok(results.every((result) => result.accountKey === fixture.targetAccountKey));
  assert.ok(reviewTasks.every((task) => task.accountKey === fixture.targetAccountKey));
  assert.equal(
    migrationLedger?.markers?.[migrationSourceHash]?.sourceAnonymousAccountKey,
    fixture.sourceAnonymousAccountKey,
  );

  const currentSummary = {
    ...createEmptyLearnerSummary(fixture.targetAccountKey),
    featuredExamState: mergeImportedFeaturedExamState(null, fixture.featuredExamState),
  };
  const summary = buildSummary(
    fixture.targetAccountKey,
    attempts,
    results,
    reviewTasks,
    currentSummary,
  );

  assert.equal(summary.totals.diagnosticAttempts, fixture.attempts.length);
  assert.equal(summary.totals.featuredExamAttempts, 0);
  assert.equal(summary.featuredExamState.status, fixture.featuredExamState.status);
  assert.equal(summary.latestDiagnosticSummary?.attemptId, 'attempt-3');
  assert.equal(summary.nextReviewTask?.id, 'task-1');
});
