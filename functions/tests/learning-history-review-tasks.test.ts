import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewTasks,
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

function createFeaturedExamInput(
  overrides: Partial<FinalizedAttemptInput> = {},
): FinalizedAttemptInput {
  return FinalizedAttemptInputSchema.parse({
    attemptId: 'featured-exam-attempt-1',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'featured-exam',
    sourceEntityId: 'featured-mock-1',
    gradeSnapshot: 'g3',
    startedAt: '2026-03-20T10:00:00.000Z',
    completedAt: '2026-03-20T10:30:00.000Z',
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding'],
    questions: [createMinimalQuestion()],
    ...overrides,
  });
}

function createDiagnosticInput(
  overrides: Partial<FinalizedAttemptInput> = {},
): FinalizedAttemptInput {
  return FinalizedAttemptInputSchema.parse({
    attemptId: 'diagnostic-attempt-1',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-03-21T09:00:00.000Z',
    completedAt: '2026-03-21T09:10:00.000Z',
    questionCount: 2,
    correctCount: 1,
    wrongCount: 1,
    accuracy: 50,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding', 'calc_repeated_error'],
    questions: [
      createMinimalQuestion({ questionId: 'question-1', questionNumber: 1 }),
      createMinimalQuestion({
        questionId: 'question-2',
        questionNumber: 2,
        finalWeaknessId: 'calc_repeated_error',
        isCorrect: true,
        selectedIndex: 0,
      }),
    ],
    ...overrides,
  });
}

// Test A: featured-exam source creates a day1 ReviewTask
test('buildReviewTasks: featured-exam source creates day1 tasks for top weaknesses', () => {
  const input = createFeaturedExamInput({
    topWeaknesses: ['formula_understanding', 'calc_repeated_error'],
    questionCount: 2,
    correctCount: 0,
    wrongCount: 2,
    questions: [
      createMinimalQuestion({ questionId: 'question-1', questionNumber: 1 }),
      createMinimalQuestion({
        questionId: 'question-2',
        questionNumber: 2,
        finalWeaknessId: 'calc_repeated_error',
      }),
    ],
  });

  const tasks = buildReviewTasks(input);

  // sourceId = sourceEntityId when present ('featured-mock-1')
  assert.equal(tasks.length, 2);

  const day1Task = tasks.find((t) => t.weaknessId === 'formula_understanding');
  assert.ok(day1Task, 'day1 task for formula_understanding should exist');
  assert.equal(day1Task.stage, 'day1');
  assert.equal(day1Task.source, 'featured-exam');
  assert.equal(day1Task.sourceId, 'featured-mock-1');
  assert.equal(day1Task.completed, false);
  assert.equal(day1Task.id, 'featured-mock-1__formula_understanding__day1');

  const day1Task2 = tasks.find((t) => t.weaknessId === 'calc_repeated_error');
  assert.ok(day1Task2, 'day1 task for calc_repeated_error should exist');
  assert.equal(day1Task2.stage, 'day1');
  assert.equal(day1Task2.source, 'featured-exam');
  assert.equal(day1Task2.id, 'featured-mock-1__calc_repeated_error__day1');
});

// Test A (edge): featured-exam with no sourceEntityId uses attemptId as sourceId
test('buildReviewTasks: featured-exam without sourceEntityId falls back to attemptId for sourceId', () => {
  const input = createFeaturedExamInput({
    sourceEntityId: null,
    topWeaknesses: ['formula_understanding'],
  });

  const tasks = buildReviewTasks(input);

  assert.equal(tasks.length, 1);
  const task = tasks[0];
  assert.ok(task);
  assert.equal(task.stage, 'day1');
  assert.equal(task.source, 'featured-exam');
  assert.equal(task.sourceId, 'featured-exam-attempt-1');
  assert.equal(task.id, 'featured-exam-attempt-1__formula_understanding__day1');
});

// Test B: diagnostic source still creates ReviewTask (regression guard)
test('buildReviewTasks: diagnostic source creates day1 tasks for top weaknesses', () => {
  const input = createDiagnosticInput();

  const tasks = buildReviewTasks(input);

  assert.equal(tasks.length, 2);

  const formulaTask = tasks.find((t) => t.weaknessId === 'formula_understanding');
  assert.ok(formulaTask, 'day1 task for formula_understanding should exist');
  assert.equal(formulaTask.stage, 'day1');
  assert.equal(formulaTask.source, 'diagnostic');
  // sourceEntityId is null so sourceId = attemptId
  assert.equal(formulaTask.sourceId, 'diagnostic-attempt-1');
  assert.equal(formulaTask.id, 'diagnostic-attempt-1__formula_understanding__day1');

  const calcTask = tasks.find((t) => t.weaknessId === 'calc_repeated_error');
  assert.ok(calcTask, 'day1 task for calc_repeated_error should exist');
  assert.equal(calcTask.stage, 'day1');
  assert.equal(calcTask.source, 'diagnostic');
});

// Test B (edge): diagnostic with no topWeaknesses returns unchanged tasks
test('buildReviewTasks: diagnostic with empty topWeaknesses returns existing tasks unchanged', () => {
  const input = createDiagnosticInput({
    topWeaknesses: [],
    primaryWeaknessId: null,
    questionCount: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    questions: [
      createMinimalQuestion({ isCorrect: true, finalWeaknessId: null, selectedIndex: 0 }),
    ],
  });

  const tasks = buildReviewTasks(input, []);
  assert.equal(tasks.length, 0);
});

// Test C: cross-source preservation — existing featured-exam task preserved when diagnostic runs
test('buildReviewTasks: existing featured-exam task is preserved when diagnostic runs', () => {
  const existingFeaturedExamTask: ReviewTask = {
    id: 'featured-mock-1__formula_understanding__day1',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'featured-exam',
    sourceId: 'featured-mock-1',
    scheduledFor: '2026-03-21T10:30:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: '2026-03-20T10:30:00.000Z',
  };

  const diagnosticInput = createDiagnosticInput({
    topWeaknesses: ['formula_understanding'],
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    questions: [createMinimalQuestion()],
  });

  const tasks = buildReviewTasks(diagnosticInput, [existingFeaturedExamTask]);

  // The featured-exam task should be preserved (different source)
  const featuredTask = tasks.find((t) => t.source === 'featured-exam');
  assert.ok(featuredTask, 'existing featured-exam task should be preserved');
  assert.equal(featuredTask.id, 'featured-mock-1__formula_understanding__day1');
  assert.equal(featuredTask.completed, false);

  // A new diagnostic day1 task should also be created for the same weaknessId
  const diagnosticTask = tasks.find((t) => t.source === 'diagnostic');
  assert.ok(diagnosticTask, 'new diagnostic task should be created');
  assert.equal(diagnosticTask.weaknessId, 'formula_understanding');
  assert.equal(diagnosticTask.stage, 'day1');
  assert.equal(diagnosticTask.sourceId, 'diagnostic-attempt-1');

  assert.equal(tasks.length, 2);
});

// Test C (mirror): existing diagnostic task preserved when featured-exam runs
test('buildReviewTasks: existing diagnostic task is preserved when featured-exam runs', () => {
  const existingDiagnosticTask: ReviewTask = {
    id: 'diagnostic-attempt-0__formula_understanding__day1',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'diagnostic',
    sourceId: 'diagnostic-attempt-0',
    scheduledFor: '2026-03-19T09:10:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: '2026-03-18T09:10:00.000Z',
  };

  const featuredExamInput = createFeaturedExamInput({
    topWeaknesses: ['formula_understanding'],
  });

  const tasks = buildReviewTasks(featuredExamInput, [existingDiagnosticTask]);

  // The diagnostic task should be preserved (different source)
  const diagnosticTask = tasks.find((t) => t.source === 'diagnostic');
  assert.ok(diagnosticTask, 'existing diagnostic task should be preserved');
  assert.equal(diagnosticTask.id, 'diagnostic-attempt-0__formula_understanding__day1');
  assert.equal(diagnosticTask.completed, false);

  // A new featured-exam day1 task should also be created
  const featuredTask = tasks.find((t) => t.source === 'featured-exam');
  assert.ok(featuredTask, 'new featured-exam task should be created');
  assert.equal(featuredTask.weaknessId, 'formula_understanding');
  assert.equal(featuredTask.stage, 'day1');
  assert.equal(featuredTask.sourceId, 'featured-mock-1');

  assert.equal(tasks.length, 2);
});
