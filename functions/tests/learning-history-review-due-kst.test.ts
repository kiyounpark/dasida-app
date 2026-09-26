import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewTasks,
  buildSummary,
  createEmptyLearnerSummary,
  FinalizedAttemptInputSchema,
  type FinalizedAttemptInput,
  type ReviewTask,
} from '../src/learning-history';

// 07:30 KST 아침 알림은 scheduledFor 앞 10글자(날짜)로 오늘 과제를 고른다(review-reminder-core).
// 앱이 만든 과제도 `YYYY-MM-DDT00:00:00.000Z`(날짜만 의미)다. 서버가 만든 과제·due 판정도 같은 규칙이어야
// 알림이 "오늘 복습 있어"라고 한 날 아침에 홈에도 뜬다.

const ACCOUNT_KEY = 'user:test-user';

function createDiagnosticInput(completedAt: string): FinalizedAttemptInput {
  return FinalizedAttemptInputSchema.parse({
    attemptId: 'diagnostic-attempt-kst',
    accountKey: ACCOUNT_KEY,
    learnerId: 'learner-1',
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: completedAt,
    completedAt,
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding'],
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
    ],
  });
}

function kstDateLabel(offsetDays: number) {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  return kst.toISOString().slice(0, 10);
}

test('day1: 20:00 KST에 끝내면 다음 날 날짜만 남는다 (T00:00:00.000Z)', () => {
  const tasks = buildReviewTasks(createDiagnosticInput('2026-09-24T11:00:00.000Z'), []);
  assert.equal(tasks[0]?.scheduledFor, '2026-09-25T00:00:00.000Z');
});

test('day1: 01:00 KST(전날 UTC)에 끝내도 KST 날짜 기준으로 하루 뒤', () => {
  const tasks = buildReviewTasks(createDiagnosticInput('2026-09-24T16:00:00.000Z'), []);
  assert.equal(tasks[0]?.scheduledFor, '2026-09-26T00:00:00.000Z');
});

test('다음 단계(day3): 20:00 KST에 day1 끝내면 D+3 날짜만 남는다', () => {
  const day1Task: ReviewTask = {
    id: 'photo-1__formula_understanding__day1',
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'photo',
    sourceId: 'photo-1',
    scheduledFor: '2026-09-24T00:00:00.000Z',
    stage: 'day1',
    completed: false,
    createdAt: '2026-09-23T05:00:00.000Z',
  };
  const completion = FinalizedAttemptInputSchema.parse({
    ...createDiagnosticInput('2026-09-24T11:00:00.000Z'),
    attemptId: 'weakness-practice-day1-kst',
    source: 'weakness-practice',
    sourceEntityId: 'formula_understanding',
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    reviewContext: { reviewTaskId: day1Task.id, reviewStage: 'day1' },
  });

  const tasks = buildReviewTasks(completion, [day1Task]);
  const day3 = tasks.find((task) => task.stage === 'day3');

  assert.equal(day3?.scheduledFor, '2026-09-27T00:00:00.000Z');
});

test('due 판정: 오늘(KST) 날짜 과제는 시각이 아직 안 와도 오늘 할 복습이다', () => {
  const today = kstDateLabel(0);
  const tomorrow = kstDateLabel(1);
  const base: Omit<ReviewTask, 'id' | 'scheduledFor'> = {
    accountKey: ACCOUNT_KEY,
    weaknessId: 'formula_understanding',
    source: 'weakness-practice',
    sourceId: 'src',
    stage: 'day3',
    completed: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  // 옛 데이터: 끝낸 시각 그대로 저장된 과제 — 23:59 KST
  const todayLate: ReviewTask = { ...base, id: 'today-late', scheduledFor: `${today}T14:59:59.999Z` };
  const todayNormalized: ReviewTask = { ...base, id: 'today-norm', scheduledFor: `${today}T00:00:00.000Z` };
  const tomorrowTask: ReviewTask = { ...base, id: 'tomorrow', scheduledFor: `${tomorrow}T00:00:00.000Z` };

  const summary = buildSummary(
    ACCOUNT_KEY,
    [],
    [],
    [todayLate, todayNormalized, tomorrowTask],
    createEmptyLearnerSummary(ACCOUNT_KEY),
  );

  assert.deepEqual(
    summary.dueReviewTasks.map((task) => task.id).sort(),
    ['today-late', 'today-norm'],
  );
});
