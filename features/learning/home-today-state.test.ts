import { buildHomeTodayState } from './home-today-state';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

function makeSummary(overrides: Partial<LearnerSummaryCurrent> = {}): LearnerSummaryCurrent {
  return {
    accountKey: 'test-account',
    updatedAt: '2026-01-01T00:00:00Z',
    repeatedWeaknesses: [],
    dueReviewTasks: [],
    featuredExamState: { examId: 'test-exam', status: 'not_started' },
    totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
    recentActivity: [],
    ...overrides,
  };
}

function makeTask(overrides: Partial<ActiveReviewTaskSummary> = {}): ActiveReviewTaskSummary {
  return {
    id: 'task-1',
    weaknessId: 'discriminant_calculation' as ActiveReviewTaskSummary['weaknessId'],
    stage: 'day1',
    scheduledFor: '2026-09-15',
    source: 'weakness-practice',
    sourceId: 'src-1',
    ...overrides,
  };
}

describe('buildHomeTodayState', () => {
  // ── mode 판정 3갈래 ────────────────────────────────────────────

  it('재료가 아예 없으면 empty', () => {
    const state = buildHomeTodayState(makeSummary());
    expect(state.mode).toBe('empty');
    expect(state.dueTasks).toEqual([]);
  });

  it('오늘 할 복습이 없고 예정된 복습만 있으면 resting', () => {
    const state = buildHomeTodayState(
      makeSummary({ dueReviewTasks: [], nextReviewTask: makeTask({ scheduledFor: '2026-09-18' }) }),
    );
    expect(state.mode).toBe('resting');
    expect(state.dueTasks).toEqual([]);
    expect(state.nextTask?.scheduledFor).toBe('2026-09-18');
  });

  it('오늘 할 복습이 있으면 review이고 due 목록을 그대로 넘긴다', () => {
    const due = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    const state = buildHomeTodayState(makeSummary({ dueReviewTasks: due, nextReviewTask: due[0] }));
    expect(state.mode).toBe('review');
    expect(state.dueTasks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  // ── 문구 ──────────────────────────────────────────────────────

  it('empty 문구는 사진을 요구한다', () => {
    const state = buildHomeTodayState(makeSummary());
    expect(state.title).toBe('아직 복습할 게 없어요');
    expect(state.body).toContain('찍어');
  });

  it('review 문구에 오늘 복습 개수가 들어간다', () => {
    const state = buildHomeTodayState(
      makeSummary({ dueReviewTasks: [makeTask({ id: 'a' }), makeTask({ id: 'b' }), makeTask({ id: 'c' })] }),
    );
    expect(state.title).toBe('오늘 복습할 게 3개 있어요');
  });

  it('review가 1개면 개수 대신 한 개라고 말한다', () => {
    const state = buildHomeTodayState(makeSummary({ dueReviewTasks: [makeTask()] }));
    expect(state.title).toBe('오늘 복습할 게 1개 있어요');
    expect(state.body).toContain('하나');
  });
});
