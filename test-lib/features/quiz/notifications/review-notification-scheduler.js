"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestNotificationPermission = requestNotificationPermission;
exports.scheduleReviewNotifications = scheduleReviewNotifications;
exports.scheduleTestNotification = scheduleTestNotification;
exports.rescheduleAllReviewNotifications = rescheduleAllReviewNotifications;
// features/quiz/notifications/review-notification-scheduler.ts
const Notifications = __importStar(require("expo-notifications"));
const react_native_1 = require("react-native");
const diagnosisMap_1 = require("../../../data/diagnosisMap");
const MORNING_HOUR = 7;
const MORNING_MINUTE = 30;
const EVENING_HOUR = 20;
const EVENING_MINUTE = 0;
const NOTIFICATION_ID_PREFIX = 'review_';
const MORNING_NOTIFICATION_ID = `${NOTIFICATION_ID_PREFIX}morning`;
const EVENING_NOTIFICATION_ID = `${NOTIFICATION_ID_PREFIX}evening`;
function toLocalDateString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function buildScheduledDate(dateString, hour, minute) {
    // Normalize: accept both "YYYY-MM-DD" (review-scheduler) and
    // "YYYY-MM-DDTHH:mm:ss.sssZ" (local-learning-history-repository addDays).
    const datePart = dateString.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
}
/**
 * 알림 권한 요청. 이미 granted면 바로 true, denied면 false.
 */
async function requestNotificationPermission() {
    if (react_native_1.Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('review', {
            name: '복습 알림',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
        });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted')
        return true;
    if (existing === 'denied')
        return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}
/**
 * 현재 미완료 task 목록 기준으로 알림 예약.
 * 이미 지난 시간의 알림은 건너뜀.
 */
async function scheduleReviewNotifications(accountKey, store) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted')
        return;
    const tasks = await store.load(accountKey);
    const incompleteTasks = tasks
        .filter((t) => !t.completed)
        .sort((a, b) => a.scheduledFor.slice(0, 10).localeCompare(b.scheduledFor.slice(0, 10)));
    const representativeTask = incompleteTasks[0];
    if (!representativeTask)
        return;
    const label = representativeTask.weaknessId
        ? diagnosisMap_1.diagnosisMap[representativeTask.weaknessId]?.labelKo
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
    // Also update the store so applyOverduePenalties does not wrongly penalize this task.
    if (morningDate <= now && eveningDate <= now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        scheduledDateString = toLocalDateString(tomorrow);
        morningDate = buildScheduledDate(scheduledDateString, MORNING_HOUR, MORNING_MINUTE);
        eveningDate = buildScheduledDate(scheduledDateString, EVENING_HOUR, EVENING_MINUTE);
        const updatedTasks = tasks.map((t) => t.id === representativeTask.id ? { ...t, scheduledFor: scheduledDateString } : t);
        await store.saveAll(accountKey, updatedTasks);
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
async function scheduleTestNotification() {
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
async function rescheduleAllReviewNotifications(accountKey, store) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted')
        return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reviewIds = scheduled
        .map((n) => n.identifier)
        .filter((id) => id.startsWith(NOTIFICATION_ID_PREFIX));
    await Promise.all(reviewIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => { })));
    await scheduleReviewNotifications(accountKey, store);
}
