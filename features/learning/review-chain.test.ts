import type { ReviewTask } from './types';
import {
  resolveNextDueReview,
  countDueReviews,
  nextStageOffsetDays,
} from './review-chain';

function task(p: Partial<ReviewTask> & { id: string }): ReviewTask {
  return {
    id: p.id,
    accountKey: 'acc-1',
    weaknessId: p.weaknessId ?? ('formula_understanding' as ReviewTask['weaknessId']),
    source: 'diagnostic',
    sourceId: p.sourceId ?? 'src-1',
    scheduledFor: p.scheduledFor ?? '2000-01-01',
    stage: p.stage ?? 'day1',
    completed: p.completed ?? false,
    createdAt: '2000-01-01T00:00:00.000Z',
  };
}

describe('resolveNextDueReview', () => {
  it('완료/방금 끝낸 task/미래 task를 제외하고 가장 이른 due를 반환', () => {
    const tasks: ReviewTask[] = [
      task({ id: 'done', completed: true }),
      task({ id: 'just', scheduledFor: '2000-01-01' }),
      task({ id: 'future', scheduledFor: '2999-01-01' }),
      task({ id: 'dueB', scheduledFor: '2000-01-03' }),
      task({ id: 'dueA', scheduledFor: '2000-01-02' }),
    ];
    const r = resolveNextDueReview(tasks, 'just');
    expect(r.nextDue?.id).toBe('dueA');
    expect(r.dueRemaining).toBe(2);
  });

  it('남은 due가 없으면 nextDue=null, dueRemaining=0', () => {
    const tasks: ReviewTask[] = [
      task({ id: 'just', scheduledFor: '2000-01-01' }),
      task({ id: 'future', scheduledFor: '2999-01-01' }),
    ];
    const r = resolveNextDueReview(tasks, 'just');
    expect(r.nextDue).toBeNull();
    expect(r.dueRemaining).toBe(0);
  });
});

describe('countDueReviews', () => {
  it('미완료 + scheduledFor<=today 인 task 수 (현재 진행 task 포함)', () => {
    const tasks: ReviewTask[] = [
      task({ id: 'a', scheduledFor: '2000-01-01' }),
      task({ id: 'b', scheduledFor: '2000-01-01' }),
      task({ id: 'c', completed: true, scheduledFor: '2000-01-01' }),
      task({ id: 'd', scheduledFor: '2999-01-01' }),
    ];
    expect(countDueReviews(tasks)).toBe(2);
  });
});

describe('nextStageOffsetDays', () => {
  it('day1→3, day3→7, day7→30, day30→null', () => {
    expect(nextStageOffsetDays('day1')).toBe(3);
    expect(nextStageOffsetDays('day3')).toBe(7);
    expect(nextStageOffsetDays('day7')).toBe(30);
    expect(nextStageOffsetDays('day30')).toBeNull();
  });
});
