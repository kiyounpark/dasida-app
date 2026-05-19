import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

import {
  chunkExpoMessages,
  collectInvalidTokensFromTickets,
  computeReminderDateBounds,
  dedupeAccountKeys,
  recordSlotSent,
  removeInvalidTokens,
  shouldSendForSlot,
  type ExpoPushTicket,
  type ReminderSlot,
} from './review-reminder-core';
import { buildReviewReminderCopy } from './review-reminder-copy';
import { sendExpoPushChunk, type ExpoPushMessage } from './expo-push-client';
import {
  getUserPushState,
  writePushTokens,
  writeReminderSentLog,
} from './push-token-store';

function todayLabelKst(now: Date): string {
  // 사용자 전원 KST 가정(스펙). KST = UTC+9.
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function isSendingEnabled(): Promise<boolean> {
  const snap = await getFirestore()
    .collection('config')
    .doc('notifications')
    .get();
  return snap.exists && snap.data()?.enabled === true;
}

export async function runReviewReminders(
  slot: ReminderSlot,
  now: Date,
): Promise<void> {
  if (!(await isSendingEnabled())) {
    logger.info('reviewReminders gate off — skip', { slot });
    return;
  }

  const dateLabel = todayLabelKst(now);
  const { gte, lt } = computeReminderDateBounds(dateLabel);

  const snap = await getFirestore()
    .collectionGroup('reviewTasks')
    .where('completed', '==', false)
    .where('scheduledFor', '>=', gte)
    .where('scheduledFor', '<', lt)
    .get();

  const accountKeys = dedupeAccountKeys(
    snap.docs
      .map((d) => d.ref.parent.parent?.id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const accountKey of accountKeys) {
    try {
      const { pushTokens, reminderSentLog } = await getUserPushState(accountKey);
      if (pushTokens.length === 0) continue;
      if (!shouldSendForSlot(reminderSentLog, dateLabel, slot)) continue;

      const { title, body } = buildReviewReminderCopy(slot, undefined);
      const sentTokens = pushTokens.map((t) => t.token);
      const messages: ExpoPushMessage[] = sentTokens.map((to) => ({
        to,
        title,
        body,
        sound: 'default',
        data: { notificationType: 'review_reminder', slot },
      }));

      // MAX_PUSH_TOKENS=10 < 100이라 계정당 항상 단일 청크 → 전송 throw 시
      // 아무것도 전달되지 않고 sent-log 미기록 → 다음 슬롯에서 안전 재시도
      // (이중 발송 없음). 향후 토큰 상한을 100 이상으로 올리면 부분 청크
      // 실패 시 이중 발송 가능 — 그 경우 청크 단위 sent-log 재설계 필요.
      const invalid = new Set<string>();
      let tokenCursor = 0;
      for (const chunk of chunkExpoMessages(messages, 100)) {
        const result = await sendExpoPushChunk(chunk);
        const tickets = (result.data ?? []) as ExpoPushTicket[];
        const chunkTokens = sentTokens.slice(
          tokenCursor,
          tokenCursor + chunk.length,
        );
        for (const tk of collectInvalidTokensFromTickets(chunkTokens, tickets)) {
          invalid.add(tk);
        }
        tickets.forEach((ticket, i) => {
          if (
            ticket.status === 'error' &&
            ticket.details?.error !== 'DeviceNotRegistered'
          ) {
            logger.warn('Expo ticket error (unhandled)', {
              token: chunkTokens[i],
              details: ticket.details,
            });
          }
        });
        tokenCursor += chunk.length;
      }

      if (invalid.size > 0) {
        await writePushTokens(
          accountKey,
          removeInvalidTokens(pushTokens, invalid),
        );
      }
      await writeReminderSentLog(
        accountKey,
        recordSlotSent(reminderSentLog, dateLabel, slot),
      );
    } catch (error) {
      logger.error('reviewReminders per-account failed', { accountKey, error });
    }
  }
}

const scheduleOptions = {
  region: 'asia-northeast3' as const,
  timeZone: 'Asia/Seoul' as const,
};

export const sendReviewRemindersMorning = onSchedule(
  { ...scheduleOptions, schedule: '30 7 * * *' },
  async () => {
    await runReviewReminders('morning', new Date());
  },
);

export const sendReviewRemindersEvening = onSchedule(
  { ...scheduleOptions, schedule: '0 20 * * *' },
  async () => {
    await runReviewReminders('evening', new Date());
  },
);
