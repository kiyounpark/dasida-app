// features/quiz/notifications/review-notification-scheduler.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { diagnosisMap } from '@/data/diagnosisMap';
import { buildReviewReminderCopy } from '@/features/quiz/notifications/review-reminder-copy';
import type { ReviewTask } from '@/features/learning/types';
import type { ReviewTaskStore } from '@/features/learning/review-task-store';

const MORNING_HOUR = 7;
const MORNING_MINUTE = 30;
const EVENING_HOUR = 20;
const EVENING_MINUTE = 0;

const NOTIFICATION_ID_PREFIX = 'review_';
const MORNING_NOTIFICATION_ID = `${NOTIFICATION_ID_PREFIX}morning` as const;
const EVENING_NOTIFICATION_ID = `${NOTIFICATION_ID_PREFIX}evening` as const;

function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildScheduledDate(dateString: string, hour: number, minute: number): Date {
  // Normalize: accept both "YYYY-MM-DD" (review-scheduler) and
  // "YYYY-MM-DDTHH:mm:ss.sssZ" (local-learning-history-repository addDays).
  const datePart = dateString.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * 미완료 태스크 중 오늘 날짜(`scheduledFor`의 YYYY-MM-DD가 today와 일치)인 첫 번째 태스크를 반환.
 * 오늘 태스크가 없으면 undefined.
 */
export function pickTodayRepresentativeTask(
  tasks: ReviewTask[],
  today: string,
): ReviewTask | undefined {
  return tasks.find(
    (t) => !t.completed && t.scheduledFor.slice(0, 10) === today,
  );
}

/**
 * 알림 권한 요청. 이미 granted면 바로 true, denied면 false.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('review', {
      name: '복습 알림',
      importance: Notifications.AndroidImportance.HIGH,
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
  const today = toLocalDateString(new Date());
  const representativeTask = pickTodayRepresentativeTask(tasks, today);
  if (!representativeTask) return;

  const label = representativeTask.weaknessId
    ? diagnosisMap[representativeTask.weaknessId]?.labelKo
    : undefined;

  const morning = buildReviewReminderCopy('morning', label);
  const evening = buildReviewReminderCopy('evening', label);
  const morningTitle = morning.title;
  const morningBody = morning.body;
  const eveningTitle = evening.title;
  const eveningBody = evening.body;

  const now = new Date();

  const scheduledDateString = representativeTask.scheduledFor.slice(0, 10);
  const morningDate = buildScheduledDate(scheduledDateString, MORNING_HOUR, MORNING_MINUTE);
  const eveningDate = buildScheduledDate(scheduledDateString, EVENING_HOUR, EVENING_MINUTE);

  if (morningDate > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_NOTIFICATION_ID,
      content: {
        title: morningTitle,
        body: morningBody,
        sound: 'default',
        data: {
          taskId: representativeTask.id,
          notificationType: 'review_reminder' as const,
          scheduledAt: morningDate.toISOString(),
        },
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
      identifier: EVENING_NOTIFICATION_ID,
      content: {
        title: eveningTitle,
        body: eveningBody,
        sound: 'default',
        data: {
          taskId: representativeTask.id,
          notificationType: 'review_reminder' as const,
          scheduledAt: eveningDate.toISOString(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: eveningDate,
        channelId: 'review',
      },
    });
  }
}

/**
 * 개발용 테스트 알림. 5초 후 단건 발송.
 * __DEV__ 환경에서만 호출할 것.
 */
export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: 'dev-test-notification',
    content: {
      title: '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
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
