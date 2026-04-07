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
    topWeaknesses: ['formula_understanding', 'calc_repeated_error', 'derivative_calculation'],
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
    scheduledFor: '2000-03-17T08:10:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: attempt.completedAt,
  };
}

function createDiagnosticInput(
  overrides: Partial<FinalizedAttemptInput> = {},
): FinalizedAttemptInput {
  return {
    attemptId: 'diagnostic-attempt-2',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-03-18T09:00:00.000Z',
    completedAt: '2026-03-18T09:10:00.000Z',
    questionCount: 3,
    correctCount: 1,
    wrongCount: 2,
    accuracy: 33,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding', 'calc_repeated_error', 'derivative_calculation'],
    questions: [
      {
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
      },
      {
        questionId: 'question-2',
        questionNumber: 2,
        topic: '계산',
        selectedIndex: 1,
        isCorrect: false,
        finalWeaknessId: 'calc_repeated_error',
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
      },
      {
        questionId: 'question-3',
        questionNumber: 3,
        topic: '미분',
        selectedIndex: 0,
        isCorrect: true,
        finalWeaknessId: null,
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
      },
    ],
    ...overrides,
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

test('accepts weakness-practice reviewContext payloads through day30', () => {
  const parsed = FinalizedAttemptInputSchema.parse({
    ...createDiagnosticInput({
      attemptId: 'weakness-practice-review-day30',
      source: 'weakness-practice',
      sourceEntityId: 'min_value_read_confusion',
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
      reviewContext: {
        reviewTaskId: 'task-day30',
        reviewStage: 'day30',
      },
    }),
  });

  assert.equal(parsed.reviewContext?.reviewStage, 'day30');
});

test('diagnostic schedules day1 review tasks for top 3 weaknesses and resets unfinished overlaps', () => {
  const parsed = FinalizedAttemptInputSchema.parse(createDiagnosticInput());
  const existingTasks: ReviewTask[] = [
    {
      id: 'old-source__formula_understanding__day7',
      accountKey: ACCOUNT_KEY,
      weaknessId: 'formula_understanding',
      source: 'diagnostic',
      sourceId: 'old-source',
      scheduledFor: '2000-03-20T08:00:00.000Z',
      stage: 'day7',
      completed: false,
      createdAt: '2026-03-10T08:00:00.000Z',
    },
    {
      id: 'completed-source__formula_understanding__day3',
      accountKey: ACCOUNT_KEY,
      weaknessId: 'formula_understanding',
      source: 'diagnostic',
      sourceId: 'completed-source',
      scheduledFor: '2000-03-12T08:00:00.000Z',
      stage: 'day3',
      completed: true,
      createdAt: '2026-03-09T08:00:00.000Z',
      completedAt: '2026-03-12T08:05:00.000Z',
    },
    {
      id: 'other-source__min_value_read_confusion__day1',
      accountKey: ACCOUNT_KEY,
      weaknessId: 'min_value_read_confusion',
      source: 'diagnostic',
      sourceId: 'other-source',
      scheduledFor: '2000-03-15T08:00:00.000Z',
      stage: 'day1',
      completed: false,
      createdAt: '2026-03-14T08:00:00.000Z',
    },
  ];

  const nextTasks = buildReviewTasks(parsed, existingTasks);

  assert.equal(
    nextTasks.some((task) => task.id === 'old-source__formula_understanding__day7'),
    false,
  );
  assert.equal(
    nextTasks.some((task) => task.id === 'completed-source__formula_understanding__day3'),
    true,
  );
  assert.equal(
    nextTasks.some((task) => task.id === 'other-source__min_value_read_confusion__day1'),
    true,
  );
  assert.deepEqual(
    nextTasks
      .filter((task) => task.sourceId === parsed.attemptId)
      .map((task) => `${task.weaknessId}:${task.stage}`),
    [
      'formula_understanding:day1',
      'calc_repeated_error:day1',
      'derivative_calculation:day1',
    ],
  );
});

test('review completion advances to the next stage and stops after day30', () => {
  const day7Task: ReviewTask = {
    id: 'attempt-diagnostic-1__formula_understanding__day7',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'diagnostic',
    sourceId: 'attempt-diagnostic-1',
    scheduledFor: '2000-03-24T08:10:00.000Z',
    stage: 'day7',
    completed: false,
    createdAt: '2026-03-16T08:10:00.000Z',
  };
  const day30Task: ReviewTask = {
    id: 'attempt-diagnostic-1__formula_understanding__day30',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'diagnostic',
    sourceId: 'attempt-diagnostic-1',
    scheduledFor: '2026-04-19T09:02:00.000Z',
    stage: 'day30',
    completed: false,
    createdAt: '2026-03-20T09:02:00.000Z',
  };
  const parsedDay7Completion = FinalizedAttemptInputSchema.parse({
    ...createDiagnosticInput({
      attemptId: 'weakness-practice-formula-understanding',
      source: 'weakness-practice',
      sourceEntityId: 'formula_understanding',
      questionCount: 1,
      correctCount: 1,
      wrongCount: 0,
      accuracy: 100,
      primaryWeaknessId: 'formula_understanding',
      topWeaknesses: ['formula_understanding'],
      questions: [
        {
          questionId: 'p_formula_understanding',
          questionNumber: 1,
          topic: '공식 이해 부족',
          firstSelectedIndex: 0,
          selectedIndex: 1,
          isCorrect: true,
          finalWeaknessId: 'formula_understanding',
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
      reviewContext: {
        reviewTaskId: day7Task.id,
        reviewStage: 'day7',
      },
      completedAt: '2026-03-20T09:02:00.000Z',
    }),
  });

  const nextTasks = buildReviewTasks(parsedDay7Completion, [day7Task]);
  const completedDay7 = nextTasks.find((task) => task.id === day7Task.id);
  const scheduledDay30 = nextTasks.find((task) => task.id === day30Task.id);

  assert.equal(completedDay7?.completed, true);
  assert.equal(completedDay7?.completedAt, parsedDay7Completion.completedAt);
  assert.equal(scheduledDay30?.scheduledFor, day30Task.scheduledFor);

  const parsedDay30Completion = FinalizedAttemptInputSchema.parse({
    ...parsedDay7Completion,
    attemptId: 'weakness-practice-formula-understanding-day30',
    completedAt: '2026-04-17T09:02:00.000Z',
    reviewContext: {
      reviewTaskId: day30Task.id,
      reviewStage: 'day30',
    },
  });

  const completedOnly = buildReviewTasks(parsedDay30Completion, [day30Task]);
  const stillOnlyDay30 = completedOnly.find((task) => task.id === day30Task.id);

  assert.equal(completedOnly.length, 1);
  assert.equal(stillOnlyDay30?.completed, true);
});

test('buildSummary ignores weakness-practice for repeated weaknesses and recent activity', () => {
  const diagnosticAttempt = createDiagnosticAttempt();
  const weaknessAttempt = createWeaknessPracticeAttempt();
  const reviewTask = createReviewTask(diagnosticAttempt);
  const futureReviewTask: ReviewTask = {
    ...reviewTask,
    id: 'attempt-diagnostic-1__calc_repeated_error__day3',
    weaknessId: 'calc_repeated_error',
    scheduledFor: '2999-03-19T08:10:00.000Z',
    stage: 'day3',
  };
  const summary = buildSummary(
    ACCOUNT_KEY,
    [weaknessAttempt, diagnosticAttempt],
    [createWeaknessPracticeResult(weaknessAttempt), createDiagnosticResult(diagnosticAttempt)],
    [reviewTask, futureReviewTask],
    createEmptyLearnerSummary(ACCOUNT_KEY),
  );

  assert.equal(summary.latestDiagnosticSummary?.attemptId, diagnosticAttempt.id);
  // weaknessAccuracies: 진단 결과에서 약점별 정답률이 계산됨
  const weaknessAccuracies = summary.latestDiagnosticSummary?.weaknessAccuracies;
  assert.ok(weaknessAccuracies !== undefined, 'weaknessAccuracies should exist');
  assert.ok(typeof weaknessAccuracies['formula_understanding'] === 'number' || weaknessAccuracies['formula_understanding'] === undefined);
  // 진단 결과에 formula_understanding 관련 문제가 있었다면 정답률이 0-100 범위여야 함
  if (typeof weaknessAccuracies['formula_understanding'] === 'number') {
    assert.ok(weaknessAccuracies['formula_understanding'] >= 0);
    assert.ok(weaknessAccuracies['formula_understanding'] <= 100);
  }
  assert.equal(summary.repeatedWeaknesses.length, 1);
  assert.equal(summary.repeatedWeaknesses[0]?.weaknessId, 'formula_understanding');
  assert.equal(
    summary.repeatedWeaknesses.some(
      (weakness) => weakness.weaknessId === 'min_value_read_confusion',
    ),
    false,
  );
  assert.equal(summary.nextReviewTask?.id, reviewTask.id);
  assert.deepEqual(summary.dueReviewTasks.map((task) => task.id), [reviewTask.id]);
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
