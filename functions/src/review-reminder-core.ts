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
