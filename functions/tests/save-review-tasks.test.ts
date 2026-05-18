import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewTasks,
  computeReviewTaskWrite,
  FinalizedAttemptInputSchema,
  SaveReviewTasksRequestSchema,
  type ReviewTask,
} from '../src/learning-history';

const ACCOUNT_KEY = 'user:test-user';

function makeTask(overrides: Partial<ReviewTask> = {}): ReviewTask {
  return {
    id: 'src-1__formula_understanding__day1',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'weakness-practice',
    sourceId: 'src-1',
    scheduledFor: '2026-05-19T00:00:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: '2026-05-18T00:00:00.000Z',
    ...overrides,
  };
}

test('(a) 활성 task 완료 마킹 + 신규 task → upserts에 둘 다, deletes 없음', () => {
  const a = makeTask();
  const existing: ReviewTask[] = [a];
  const aDone = makeTask({ completed: true, completedAt: '2026-05-18T09:00:00.000Z' });
  const b = makeTask({ id: 'src-2__formula_understanding__day1', sourceId: 'src-2' });

  const { upserts, deletes } = computeReviewTaskWrite(existing, [aDone, b]);

  const upsertIds = upserts.map((t) => t.id).sort();
  assert.deepEqual(upsertIds, [a.id, b.id].sort());
  assert.equal(deletes.length, 0);
});

test('(b) next에서 빠진 기존 task는 deletes에 포함', () => {
  const a = makeTask();
  const b = makeTask({ id: 'src-2__formula_understanding__day1', sourceId: 'src-2' });

  const { deletes } = computeReviewTaskWrite([a, b], [a]);

  assert.deepEqual(
    deletes.map((t) => t.id),
    [b.id],
  );
});

test('(c) 스키마 위반 task → throw', () => {
  const bad = { ...makeTask(), scheduledFor: 'not-a-datetime' } as ReviewTask;
  assert.throws(() => computeReviewTaskWrite([], [bad]));
});

test('스키마: 정상 바디 통과', () => {
  const parsed = SaveReviewTasksRequestSchema.safeParse({
    accountKey: ACCOUNT_KEY,
    reviewTasks: [makeTask()],
  });
  assert.equal(parsed.success, true);
});

test('스키마: accountKey 누락 reject', () => {
  const parsed = SaveReviewTasksRequestSchema.safeParse({ reviewTasks: [] });
  assert.equal(parsed.success, false);
});

test('스키마: reviewTasks 비배열 reject', () => {
  const parsed = SaveReviewTasksRequestSchema.safeParse({
    accountKey: ACCOUNT_KEY,
    reviewTasks: 'nope',
  });
  assert.equal(parsed.success, false);
});

test('스키마: reviewTasks 600 초과 reject', () => {
  const parsed = SaveReviewTasksRequestSchema.safeParse({
    accountKey: ACCOUNT_KEY,
    reviewTasks: Array.from({ length: 601 }, (_, i) =>
      makeTask({ id: `src-${i}__formula_understanding__day1`, sourceId: `src-${i}` }),
    ),
  });
  assert.equal(parsed.success, false);
});

test('(e) buildReviewTasks 멱등 — 동일 weakness-practice 재적용 시 불변 (spec §6)', () => {
  const activeId = 'min_value_read_confusion__min_value_read_confusion__day1';
  const parsed = FinalizedAttemptInputSchema.parse({
    attemptId: 'wp-idem-1',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'weakness-practice',
    sourceEntityId: 'min_value_read_confusion',
    gradeSnapshot: 'g3',
    startedAt: '2026-05-18T09:00:00.000Z',
    completedAt: '2026-05-18T09:05:00.000Z',
    questionCount: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    primaryWeaknessId: 'min_value_read_confusion',
    topWeaknesses: ['min_value_read_confusion'],
    questions: [
      {
        questionId: 'q1',
        questionNumber: 1,
        topic: '최솟값',
        selectedIndex: 1,
        isCorrect: true,
        finalWeaknessId: 'min_value_read_confusion',
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
      },
    ],
    reviewContext: { reviewTaskId: activeId, reviewStage: 'day1' },
  });

  const existing: ReviewTask[] = [
    makeTask({
      id: activeId,
      weaknessId: 'min_value_read_confusion',
      sourceId: 'min_value_read_confusion',
      stage: 'day1',
      completed: false,
    }),
  ];

  const once = buildReviewTasks(parsed, existing);
  const twice = buildReviewTasks(parsed, once);

  assert.deepEqual(twice, once);
  assert.equal(once.find((t) => t.id === activeId)?.completed, true);
  assert.equal(once.some((t) => t.stage === 'day3'), true);
});

test('(d) sorted는 scheduledFor 오름차순', () => {
  const later = makeTask({
    id: 'src-1__formula_understanding__day1',
    scheduledFor: '2026-05-25T00:00:00.000Z',
  });
  const earlier = makeTask({
    id: 'src-2__formula_understanding__day1',
    sourceId: 'src-2',
    scheduledFor: '2026-05-20T00:00:00.000Z',
  });

  const { sorted } = computeReviewTaskWrite([], [later, earlier]);

  assert.deepEqual(
    sorted.map((t) => t.scheduledFor),
    ['2026-05-20T00:00:00.000Z', '2026-05-25T00:00:00.000Z'],
  );
});
