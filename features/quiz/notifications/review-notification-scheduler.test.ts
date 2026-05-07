import type { ReviewTask } from '@/features/learning/types';

import { pickTodayRepresentativeTask } from './review-notification-scheduler';

function makeTask(overrides: Partial<ReviewTask> & { id: string; scheduledFor: string }): ReviewTask {
  return {
    accountKey: 'acct',
    weaknessId: 'fn-limit',
    source: 'featured-exam',
    sourceId: 'src-1',
    stage: 'day1',
    completed: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  } as ReviewTask;
}

describe('pickTodayRepresentativeTask', () => {
  const today = '2026-05-07';

  it('returns the today task when one exists', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-07' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)?.id).toBe('t1');
  });

  it('ignores completed tasks even if scheduled for today', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-07', completed: true }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)).toBeUndefined();
  });

  it('ignores overdue tasks', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-03' }),
      makeTask({ id: 't2', scheduledFor: '2026-05-05' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)).toBeUndefined();
  });

  it('ignores future tasks', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-08' }),
      makeTask({ id: 't2', scheduledFor: '2026-05-10' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)).toBeUndefined();
  });

  it('picks a today task when overdue and future tasks coexist', () => {
    const tasks = [
      makeTask({ id: 'overdue', scheduledFor: '2026-05-03' }),
      makeTask({ id: 'today', scheduledFor: '2026-05-07' }),
      makeTask({ id: 'future', scheduledFor: '2026-05-10' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)?.id).toBe('today');
  });

  it('handles ISO timestamp scheduledFor (YYYY-MM-DDTHH:mm:ss.sssZ)', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-07T00:00:00.000Z' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)?.id).toBe('t1');
  });

  it('returns undefined for empty input', () => {
    expect(pickTodayRepresentativeTask([], today)).toBeUndefined();
  });
});
