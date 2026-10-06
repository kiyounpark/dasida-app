import { z } from 'zod';

export type ReminderSlot = 'morning' | 'evening';

export function computeReminderDateBounds(
  todayLabel: string,
  lookbackDays = 0,
): {
  gte: string;
  lt: string;
} {
  const [y, m, d] = todayLabel.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - lookbackDays));
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { gte: start.toISOString(), lt: next.toISOString() };
}

// 1.0.12 Q2'(astra·Fable → Fable 최종 10.05) — 놓친 복습은 다음 날 아침에 한 번 더.
// ① 뒤로 놓친 과제는 날짜가 안 밀려서, 오늘만 보면 하루 놓친 줄은 알림이 끊긴다.
// 저녁 문구는 「오늘 복습 마감」이라 놓친 과제엔 안 맞다 — 아침만 어제까지 본다.
export function reminderLookbackDays(slot: ReminderSlot): number {
  return slot === 'morning' ? 1 : 0;
}

export function dedupeAccountKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export type ReminderSentLog = Record<
  string,
  { morning?: true; evening?: true }
>;

export type PushTokenRecord = {
  token: string;
  platform: 'ios' | 'android';
  updatedAt: string;
};

export function shouldSendForSlot(
  log: ReminderSentLog | undefined,
  dateLabel: string,
  slot: ReminderSlot,
): boolean {
  return !log?.[dateLabel]?.[slot];
}

export function recordSlotSent(
  log: ReminderSentLog | undefined,
  dateLabel: string,
  slot: ReminderSlot,
): ReminderSentLog {
  const base: ReminderSentLog = { ...(log ?? {}) };
  base[dateLabel] = { ...(base[dateLabel] ?? {}), [slot]: true };

  const [y, m, d] = dateLabel.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1))
    .toISOString()
    .slice(0, 10);
  const keep = new Set([dateLabel, yesterday]);
  for (const key of Object.keys(base)) {
    if (!keep.has(key)) delete base[key];
  }
  return base;
}

export function removeInvalidTokens(
  tokens: PushTokenRecord[],
  invalid: Set<string>,
): PushTokenRecord[] {
  return tokens.filter((t) => !invalid.has(t.token));
}

export const MAX_PUSH_TOKENS = 10;

export function upsertPushToken(
  prev: PushTokenRecord[],
  next: PushTokenRecord,
): PushTokenRecord[] {
  const existingIdx = prev.findIndex((t) => t.token === next.token);
  let merged: PushTokenRecord[];
  if (existingIdx >= 0) {
    merged = prev.slice();
    merged[existingIdx] = { ...merged[existingIdx], ...next };
  } else {
    merged = [...prev, next];
  }
  if (merged.length <= MAX_PUSH_TOKENS) return merged;
  return merged
    .slice()
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(merged.length - MAX_PUSH_TOKENS);
}

export const RegisterPushTokenRequestSchema = z.object({
  accountKey: z.string().min(1).max(200),
  token: z.string().regex(/^ExponentPushToken\[.+\]$/),
  platform: z.enum(['ios', 'android']),
});

export type RegisterPushTokenRequest = z.infer<
  typeof RegisterPushTokenRequestSchema
>;

// 푸시 메시지 빌더 (순수). `priority`/`channelId`는 Android에서 알림이 저우선
// 채널로 묶여 화면 표시가 묵음 처리되는 회귀를 막기 위해 항상 부여한다 — iOS는
// 무영향. 클라가 별도 채널을 보장하지 않더라도 Expo가 default 채널을 자동
// 생성하므로 `'default'`로 고정. 페이로드 누락은 회귀 테스트로 차단.
// 주의: 클라 `review-notification-scheduler.ts`의 `'review'` 채널은 **게스트
// 로컬 스케줄 경로에서만** 생성되며 인증 사용자 서버 푸시 경로에서는 보장되지
// 않는다. 그래서 `'review'`로 "통일"하지 말 것 — 그렇게 하면 인증 Android
// 사용자에게 다시 묵음 회귀가 일어난다(이 회귀를 잡은 fix가 본 함수임).
// `taskId`는 클라 알림 탭 핸들러(app/_layout.tsx)가 `/quiz/review-session`로
// 라우팅하기 위해 요구한다. 누락 시 탭이 무동작 회귀가 발생하므로 필수.
export function buildPushMessages(
  tokens: string[],
  copy: { title: string; body: string },
  slot: ReminderSlot,
  taskId: string,
): import('./expo-push-client').ExpoPushMessage[] {
  return tokens.map((to) => ({
    to,
    title: copy.title,
    body: copy.body,
    sound: 'default',
    priority: 'high',
    channelId: 'default',
    data: { notificationType: 'review_reminder', slot, taskId },
  }));
}

export function pickRepresentativeTaskByAccount<
  T extends { accountKey: string; taskId: string; scheduledFor?: string },
>(docs: ReadonlyArray<T>, preferFrom?: string): Map<string, T> {
  const map = new Map<string, T>();
  // 오늘 과제가 있으면 탭이 그걸 연다 — 어제 놓친 과제는 오늘 과제가 없을 때만 대표가 된다.
  if (preferFrom) {
    for (const d of docs) {
      if (!map.has(d.accountKey) && (d.scheduledFor ?? '') >= preferFrom) {
        map.set(d.accountKey, d);
      }
    }
  }
  for (const d of docs) {
    if (!map.has(d.accountKey)) map.set(d.accountKey, d);
  }
  return map;
}

const REMINDER_STAGES = ['day1', 'day3', 'day7', 'day30'] as const;

/**
 * 알림이 가리키는 과제 — 아침 본문이 단계로 갈린다(기윤 10.06).
 * due = 오늘 복습 날 · missed = 어제 놓친 과제(오늘 과제는 없음). 놓친 과제는 다음에 열 때 이미
 * 한 칸 내려가니(🔒 10.06) 「오늘 놓치면」을 쓰면 거짓이다. 클라 review-reminder-copy.ts와 같은 모양.
 */
export type ReminderTask =
  | { kind: 'due'; stage: (typeof REMINDER_STAGES)[number] }
  | { kind: 'missed' };

export function reminderTaskFor(
  doc: { scheduledFor?: string; stage?: unknown },
  todayGte: string,
): ReminderTask {
  if ((doc.scheduledFor ?? '') < todayGte) {
    return { kind: 'missed' };
  }
  // 모르는 단계면 day1 — 「N일차로 돌아가요」를 잘못 내보내지 않는 쪽
  const stage = REMINDER_STAGES.find((s) => s === doc.stage) ?? 'day1';
  return { kind: 'due', stage };
}

export function chunkExpoMessages<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export type ExpoPushTicket = {
  status: 'ok' | 'error';
  details?: { error?: string };
};

export function collectInvalidTokensFromTickets(
  sentTokens: string[],
  tickets: ExpoPushTicket[],
): Set<string> {
  const invalid = new Set<string>();
  const n = Math.min(sentTokens.length, tickets.length);
  for (let i = 0; i < n; i++) {
    if (
      tickets[i].status === 'error' &&
      tickets[i].details?.error === 'DeviceNotRegistered'
    ) {
      invalid.add(sentTokens[i]);
    }
  }
  return invalid;
}
