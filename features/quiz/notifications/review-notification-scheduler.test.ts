import * as Notifications from 'expo-notifications';

import type { ReviewTask } from '@/features/learning/types';

import {
  pickTodayRepresentativeTask,
  requestNotificationPermission,
} from './review-notification-scheduler';

jest.mock('expo-notifications');

// 1.0.12 ② — 안드 13+ 새 설치는 묻기 전에도 denied(canAskAgain true)를 준다(expo-notifications)
describe('requestNotificationPermission', () => {
  const mockGet = Notifications.getPermissionsAsync as jest.Mock;
  const mockRequest = Notifications.requestPermissionsAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ status: 'granted' });
  });

  it('denied + canAskAgain true면 시스템 창을 띄운다(requestPermissionsAsync)', async () => {
    mockGet.mockResolvedValue({ status: 'denied', canAskAgain: true });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('denied + canAskAgain false면 창 없이 false', async () => {
    mockGet.mockResolvedValue({ status: 'denied', canAskAgain: false });
    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('이미 granted면 창 없이 true', async () => {
    mockGet.mockResolvedValue({ status: 'granted', canAskAgain: true });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

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
