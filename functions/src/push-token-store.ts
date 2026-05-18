import { getFirestore } from 'firebase-admin/firestore';

import {
  upsertPushToken,
  type PushTokenRecord,
  type ReminderSentLog,
} from './review-reminder-core';

function userRef(accountKey: string) {
  return getFirestore().collection('users').doc(accountKey);
}

export async function getUserPushState(accountKey: string): Promise<{
  pushTokens: PushTokenRecord[];
  reminderSentLog: ReminderSentLog;
}> {
  const snap = await userRef(accountKey).get();
  const data = snap.data() ?? {};
  return {
    pushTokens: Array.isArray(data.pushTokens) ? data.pushTokens : [],
    reminderSentLog:
      data.reminderSentLog && typeof data.reminderSentLog === 'object'
        ? data.reminderSentLog
        : {},
  };
}

export async function savePushToken(
  accountKey: string,
  record: PushTokenRecord,
): Promise<void> {
  const { pushTokens } = await getUserPushState(accountKey);
  const next = upsertPushToken(pushTokens, record);
  await userRef(accountKey).set({ pushTokens: next }, { merge: true });
}

export async function writePushTokens(
  accountKey: string,
  pushTokens: PushTokenRecord[],
): Promise<void> {
  await userRef(accountKey).set({ pushTokens }, { merge: true });
}

export async function writeReminderSentLog(
  accountKey: string,
  reminderSentLog: ReminderSentLog,
): Promise<void> {
  await userRef(accountKey).set({ reminderSentLog }, { merge: true });
}
