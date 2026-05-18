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
