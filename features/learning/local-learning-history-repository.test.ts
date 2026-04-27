import type { WeaknessId } from '@/data/diagnosisMap';
import type { FinalizedAttemptInput } from './history-repository';
import { buildReviewTasks, buildSummary } from './local-learning-history-repository';
import type { ReviewTask } from './types';

// ── 픽스처 헬퍼 ──────────────────────────────────────────────────

function makeExamInput(overrides: Partial<FinalizedAttemptInput> = {}): FinalizedAttemptInput {
  return {
    attemptId: 'exam-attempt-1',
    accountKey: 'acc-1',
    learnerId: 'learner-1',
    source: 'featured-exam',
    sourceEntityId: 'exam-2025-csat',
    gradeSnapshot: 'g2',
    startedAt: '2026-04-27T09:00:00Z',
    completedAt: '2026-04-27T10:00:00Z',
    questionCount: 30,
    correctCount: 28,
    wrongCount: 2,
    accuracy: 93,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding', 'calc_repeated_error'],
    questions: [],
    ...overrides,
  };
}

function makeDiagnosticInput(overrides: Partial<FinalizedAttemptInput> = {}): FinalizedAttemptInput {
  return {
    attemptId: 'diag-attempt-1',
    accountKey: 'acc-1',
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g2',
    startedAt: '2026-04-26T09:00:00Z',
    completedAt: '2026-04-26T10:00:00Z',
    questionCount: 20,
    correctCount: 15,
    wrongCount: 5,
    accuracy: 75,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding'],
    questions: [],
    ...overrides,
  };
}

function makePendingTask(overrides: Partial<ReviewTask> = {}): ReviewTask {
  return {
    id: 'diag-attempt-1__formula_understanding__day1',
    accountKey: 'acc-1',
    weaknessId: 'formula_understanding',
    source: 'diagnostic',
    sourceId: 'diag-attempt-1',
    scheduledFor: '2026-04-27T10:00:00Z',
    stage: 'day1',
    completed: false,
    createdAt: '2026-04-26T10:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('buildReviewTasks', () => {
  test('featured-exam attempt creates day1 ReviewTask', () => {
    const input = makeExamInput();
    const result = buildReviewTasks(input, []);

    // Should create day1 tasks for topWeaknesses
    expect(result.length).toBeGreaterThan(0);

    const task = result.find((t) => t.weaknessId === 'formula_understanding');
    expect(task).toBeDefined();
    expect(task?.source).toBe('featured-exam');
    expect(task?.sourceId).toBe('exam-2025-csat'); // sourceEntityId
    expect(task?.stage).toBe('day1');
    expect(task?.completed).toBe(false);

    // ID format: ${sourceId}__${weaknessId}__${stage}
    expect(task?.id).toBe('exam-2025-csat__formula_understanding__day1');
  });

  test('empty topWeaknesses creates no ReviewTask', () => {
    const input = makeExamInput({ topWeaknesses: [] });
    const result = buildReviewTasks(input, []);

    expect(result).toHaveLength(0);
  });

  test('same attemptId re-call does not create duplicate ReviewTask (idempotent)', () => {
    const input = makeExamInput();
    // First call
    const firstResult = buildReviewTasks(input, []);
    // Second call with first result as existing tasks
    const secondResult = buildReviewTasks(input, firstResult);

    // Count tasks with weaknessId 'formula_understanding' and stage 'day1'
    const count = secondResult.filter(
      (t) => t.weaknessId === 'formula_understanding' && t.stage === 'day1',
    ).length;
    expect(count).toBe(1);
  });

  test('existing diagnostic task with same weaknessId is NOT deleted when featured-exam runs', () => {
    const diagnosticTask = makePendingTask({
      id: 'diag-attempt-1__formula_understanding__day1',
      source: 'diagnostic',
      sourceId: 'diag-attempt-1',
      weaknessId: 'formula_understanding',
    });

    const input = makeExamInput({
      topWeaknesses: ['formula_understanding', 'calc_repeated_error'],
    });

    const result = buildReviewTasks(input, [diagnosticTask]);

    // The diagnostic task must still be present
    const diagnosticTaskInResult = result.find((t) => t.id === diagnosticTask.id);
    expect(diagnosticTaskInResult).toBeDefined();
    expect(diagnosticTaskInResult?.source).toBe('diagnostic');

    // And the new featured-exam task should also be created
    const examTask = result.find(
      (t) => t.source === 'featured-exam' && t.weaknessId === 'formula_understanding',
    );
    expect(examTask).toBeDefined();
  });

  test('reverse cross-source: existing featured-exam task is preserved when diagnostic push runs (누락 #2)', () => {
    // A pending featured-exam task already exists
    const featuredExamTask = makePendingTask({
      id: 'exam-2025-csat__formula_understanding__day1',
      source: 'featured-exam',
      sourceId: 'exam-2025-csat',
      weaknessId: 'formula_understanding',
    });

    // Now a new diagnostic attempt is recorded
    const diagnosticInput = makeDiagnosticInput({
      topWeaknesses: ['formula_understanding'],
    });

    const result = buildReviewTasks(diagnosticInput, [featuredExamTask]);

    // The featured-exam task must still be present
    const featuredExamTaskInResult = result.find((t) => t.id === featuredExamTask.id);
    expect(featuredExamTaskInResult).toBeDefined();
    expect(featuredExamTaskInResult?.source).toBe('featured-exam');
  });

  // Test B: all-blanks — no topWeaknesses means no new tasks.
  // Note: This is intentionally similar to the existing 'empty topWeaknesses creates no ReviewTask'
  // test but explicitly names the all-blanks semantic (wrongCount === 0 → no diagnosis → empty
  // topWeaknesses). Since the behaviour is identical the two tests are near-duplicates. We keep
  // this one as a semantic anchor for the all-blanks edge case and accept the overlap.
  test('all-blanks attempt: wrongCount===0 produces empty topWeaknesses, so no ReviewTask is created (누락 #5)', () => {
    const allBlanksInput = makeExamInput({ topWeaknesses: [], wrongCount: 0 });
    const result = buildReviewTasks(allBlanksInput, []);

    expect(result).toHaveLength(0);
  });

  test('featured-exam with null sourceEntityId falls back to attemptId for sourceId (Min #7)', () => {
    const input = makeExamInput({ sourceEntityId: null, attemptId: 'exam-attempt-1' });
    const result = buildReviewTasks(input, []);

    const task = result.find((t) => t.weaknessId === 'formula_understanding');
    expect(task).toBeDefined();
    // sourceId should fall back to attemptId when sourceEntityId is null
    expect(task?.sourceId).toBe('exam-attempt-1');
    // ID format: ${sourceId}__${weaknessId}__${stage}
    expect(task?.id).toBe('exam-attempt-1__formula_understanding__day1');
  });
});

describe('buildSummary', () => {
  test('featured-exam attempt does NOT affect latestDiagnosticSummary', () => {
    const examAttempt = {
      id: 'exam-attempt-1',
      accountKey: 'acc-1',
      learnerId: 'learner-1',
      source: 'featured-exam' as const,
      sourceEntityId: 'exam-2025-csat',
      gradeSnapshot: 'g2' as const,
      startedAt: '2026-04-27T09:00:00Z',
      completedAt: '2026-04-27T10:00:00Z',
      questionCount: 30,
      correctCount: 28,
      wrongCount: 2,
      accuracy: 93,
      primaryWeaknessId: 'formula_understanding' as const,
      topWeaknesses: ['formula_understanding', 'calc_repeated_error'] as WeaknessId[],
      reviewStage: undefined,
      schemaVersion: 1 as const,
      createdAt: '2026-04-27T10:00:00Z',
    };

    const result = buildSummary('acc-1', [examAttempt], [], [], null);

    expect(result.latestDiagnosticSummary).toBeUndefined();
    // totals should reflect featured exam
    expect(result.totals.featuredExamAttempts).toBe(1);
    expect(result.totals.diagnosticAttempts).toBe(0);
  });
});
