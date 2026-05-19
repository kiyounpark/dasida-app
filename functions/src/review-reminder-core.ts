import { z } from 'zod';

export type ReminderSlot = 'morning' | 'evening';

export function computeReminderDateBounds(todayLabel: string): {
  gte: string;
  lt: string;
} {
  const [y, m, d] = todayLabel.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { gte: start.toISOString(), lt: next.toISOString() };
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
