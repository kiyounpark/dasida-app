// features/quiz/notifications/review-notification-scheduler.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { diagnosisMap } from '@/data/diagnosisMap';
import type { ReviewTaskStore } from '@/features/learning/review-task-store';

const MORNING_HOUR = 7;
const MORNING_MINUTE = 30;
const EVENING_HOUR = 20;
const EVENING_MINUTE = 0;

const NOTIFICATION_ID_PREFIX = 'review_';

function morningId(taskId: string) {
  return `${NOTIFICATION_ID_PREFIX}${taskId}_morning`;
}

function eveningId(taskId: string) {
  return `${NOTIFICATION_ID_PREFIX}${taskId}_evening`;
}

function buildScheduledDate(dateString: string, hour: number, minute: number): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * 알림 권한 요청. 이미 granted면 바로 true, denied면 false.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('review', {
      name: '복습 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * 현재 미완료 task 목록 기준으로 알림 예약.
 * 이미 지난 시간의 알림은 건너뜀.
 */
export async function scheduleReviewNotifications(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const tasks = await store.load(accountKey);
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const now = new Date();

  for (const task of incompleteTasks) {
    const label = task.weaknessId ? diagnosisMap[task.weaknessId]?.labelKo : undefined;
    const title = label ? `${label}, 잊기 전에 확인해요` : '오늘 복습이 기다리고 있어요';
    const body = '3분만 다시 보면 기억이 살아납니다 →';

    const morningDate = buildScheduledDate(task.scheduledFor, MORNING_HOUR, MORNING_MINUTE);
    const eveningDate = buildScheduledDate(task.scheduledFor, EVENING_HOUR, EVENING_MINUTE);

    if (morningDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: morningId(task.id),
        content: {
          title,
          body,
          sound: 'default',
          data: { taskId: task.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morningDate,
          channelId: 'review',
        },
      });
    }

    if (eveningDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: eveningId(task.id),
        content: {
          title,
          body,
          sound: 'default',
          data: { taskId: task.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: eveningDate,
          channelId: 'review',
        },
      });
    }
  }
}

/**
 * 특정 task 알림 취소 (아침 + 저녁).
 */
export async function cancelReviewNotifications(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(morningId(taskId)).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(eveningId(taskId)).catch(() => {});
}

/**
 * 개발용 테스트 알림. 5초 후 단건 발송.
 * __DEV__ 환경에서만 호출할 것.
 */
export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: 'dev-test-notification',
    content: {
      title: '판별식, 잊기 전에 확인해요',
      body: '3분만 다시 보면 기억이 살아납니다 →',
      sound: 'default',
      data: { taskId: 'dev-test-task' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: 'review',
    },
  });
}

/**
 * 전체 review 알림을 취소하고 현재 task 목록 기준으로 재예약.
 * overdue penalty 적용 후 또는 앱 마운트 시 호출.
 */
export async function rescheduleAllReviewNotifications(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reviewIds = scheduled
    .map((n) => n.identifier)
    .filter((id) => id.startsWith(NOTIFICATION_ID_PREFIX));

  await Promise.all(
    reviewIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );

  await scheduleReviewNotifications(accountKey, store);
}
