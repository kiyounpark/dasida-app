import * as Notifications from 'expo-notifications';

import { diagnosisMap } from '@/data/diagnosisMap';
import type { ReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';

import * as reminderCopy from './review-reminder-copy';
import {
  pickTodayRepresentativeTask,
  requestNotificationPermission,
  scheduleReviewNotifications,
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

describe('scheduleReviewNotifications', () => {
  const today = '2026-05-07';
  const mockGet = Notifications.getPermissionsAsync as jest.Mock;
  const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
  let copySpy: jest.SpyInstance;
  let store: ReviewTaskStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Local 06:00 keeps today's 07:30 and 20:00 reminders in the future in any timezone.
    jest.setSystemTime(new Date(2026, 4, 7, 6, 0, 0));
    mockGet.mockResolvedValue({ status: 'granted' });
    mockSchedule.mockResolvedValue('notification-id');
    copySpy = jest.spyOn(reminderCopy, 'buildReviewReminderCopy');
    store = { load: jest.fn(), saveAll: jest.fn(), reset: jest.fn() };
  });

  afterEach(() => {
    copySpy.mockRestore();
    jest.useRealTimers();
  });

  function expectReminders(task: ReviewTask, label: string | undefined) {
    const reminderTask = { kind: 'due', stage: task.stage } as const;
    expect(store.load).toHaveBeenCalledWith('acct');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
    // null also yields generic copy today; verify that the scheduler normalizes it to undefined.
    expect(copySpy).toHaveBeenCalledTimes(2);
    expect(copySpy).toHaveBeenNthCalledWith(1, 'morning', label, reminderTask);
    expect(copySpy).toHaveBeenNthCalledWith(2, 'evening', label, reminderTask);

    (['morning', 'evening'] as const).forEach((slot, index) => {
      const expectedDate = new Date(
        2026, 4, 7, slot === 'morning' ? 7 : 20, slot === 'morning' ? 30 : 0,
      );
      const expectedCopy = reminderCopy.buildReviewReminderCopy(slot, label, reminderTask);
      expect(mockSchedule).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        identifier: `review_${slot}`,
        content: expect.objectContaining(expectedCopy),
        trigger: expect.objectContaining({
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: expectedDate,
        }),
      }));
      const { title, body } = mockSchedule.mock.calls[index][0].content;
      expect(title).not.toMatch(/undefined|null|알 수 없음/);
      expect(body).not.toMatch(/undefined|null|알 수 없음/);
      if (label !== undefined) {
        expect(`${title}\n${body}`).toContain(label);
      }
    });
  }

  it('weaknessId가 null이면 아침·저녁 알림에 이름 없는 문구를 예약한다', async () => {
    const task = makeTask({ id: 'today', scheduledFor: today, source: 'photo', weaknessId: null });
    (store.load as jest.Mock).mockResolvedValue([task]);

    await scheduleReviewNotifications('acct', store);

    expectReminders(task, undefined);
  });

  it('weaknessId가 diagnosisMap에 없으면 아침·저녁 알림에 이름 없는 문구를 예약한다', async () => {
    // Simulate a stale persisted ID outside the current WeaknessId union.
    const weaknessId = 'missing-weakness' as NonNullable<ReviewTask['weaknessId']>;
    expect(diagnosisMap[weaknessId]).toBeUndefined();
    const task = makeTask({ id: 'today', scheduledFor: today, weaknessId });
    (store.load as jest.Mock).mockResolvedValue([task]);

    await scheduleReviewNotifications('acct', store);

    expectReminders(task, undefined);
  });

  it('weaknessId가 diagnosisMap에 있으면 아침·저녁 알림에 labelKo를 넣는다', async () => {
    const weaknessId = 'discriminant_calculation';
    const label = diagnosisMap[weaknessId].labelKo;
    const task = makeTask({ id: 'today', scheduledFor: today, weaknessId });
    (store.load as jest.Mock).mockResolvedValue([task]);

    await scheduleReviewNotifications('acct', store);

    expectReminders(task, label);
  });
});
