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
  const incompleteTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  const representativeTask = incompleteTasks[0];
  if (!representativeTask) return;

  const label = representativeTask.weaknessId
    ? diagnosisMap[representativeTask.weaknessId]?.labelKo
    : undefined;

  const morningTitle = label
    ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
    : '벌써 잊혀지고 있어요. 지금 3분이면 돼요';
  const morningBody = '오늘 안 하면 내일 처음부터예요';

  const eveningTitle = label
    ? `${label}, 오늘 자기 전 마지막 기회예요`
    : '오늘 복습 마감, 자기 전 3분만요';
  const eveningBody = '잠들기 전 3분, 기억이 굳어져요';

  const now = new Date();

  // Normalize to YYYY-MM-DD (handles both YYYY-MM-DD and full ISO strings).
  let scheduledDateString = representativeTask.scheduledFor.slice(0, 10);

  let morningDate = buildScheduledDate(scheduledDateString, MORNING_HOUR, MORNING_MINUTE);
  let eveningDate = buildScheduledDate(scheduledDateString, EVENING_HOUR, EVENING_MINUTE);

  // Fallback: if both slots have already passed (e.g. user completed diagnostic after 20:00),
  // advance to tomorrow so at least the next morning slot fires.
  if (morningDate <= now && eveningDate <= now) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    scheduledDateString = toLocalDateString(tomorrow);
    morningDate = buildScheduledDate(scheduledDateString, MORNING_HOUR, MORNING_MINUTE);
    eveningDate = buildScheduledDate(scheduledDateString, EVENING_HOUR, EVENING_MINUTE);
  }

  if (morningDate > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_NOTIFICATION_ID,
      content: {
        title: morningTitle,
        body: morningBody,
        sound: 'default',
        data: { taskId: representativeTask.id },
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
        data: { taskId: representativeTask.id },
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
