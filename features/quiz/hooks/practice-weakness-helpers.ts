import type { WeaknessId } from '@/data/diagnosisMap';

type ScreenMode = 'weakness' | 'challenge' | 'review';

/**
 * Determines the active weakness ID for the current session.
 *
 * Priority (highest → lowest):
 * 1. fallbackWeaknessId — URL param from exam/direct navigation
 * 2. practiceQueue[practiceIndex] — in-progress seeded queue
 * 3. recoveryWeakness — top weakness from latest diagnostic summary
 */
export function pickActiveWeaknessId(args: {
  activeMode: ScreenMode;
  activeReviewTaskWeaknessId?: WeaknessId;
  practiceQueue: WeaknessId[];
  practiceIndex: number;
  fallbackWeaknessId?: WeaknessId;
  recoveryWeakness?: WeaknessId;
}): WeaknessId | undefined {
  const {
    activeMode,
    activeReviewTaskWeaknessId,
    practiceQueue,
    practiceIndex,
    fallbackWeaknessId,
    recoveryWeakness,
  } = args;

  if (activeMode === 'review') {
    return activeReviewTaskWeaknessId;
  }

  if (activeMode === 'weakness' && practiceQueue.length > 0) {
    return practiceQueue[practiceIndex];
  }

  return fallbackWeaknessId ?? recoveryWeakness;
}

/**
 * Returns the weaknesses array to seed the practice queue with,
 * or null if seeding should be skipped.
 *
 * Seeding is skipped when:
 * - Not in weakness mode
 * - A result already exists (session finished)
 * - A queue is already populated
 * - A URL-param fallback weakness is present (that takes precedence instead)
 * - topWeaknesses is empty
 */
export function resolveQueueSeed(args: {
  activeMode: ScreenMode;
  hasResult: boolean;
  practiceQueueLength: number;
  fallbackWeaknessId?: WeaknessId;
  topWeaknesses?: WeaknessId[];
}): WeaknessId[] | null {
  const { activeMode, hasResult, practiceQueueLength, fallbackWeaknessId, topWeaknesses } = args;

  if (activeMode !== 'weakness') return null;
  if (hasResult) return null;
  if (practiceQueueLength > 0) return null;
  if (fallbackWeaknessId) return null;
  if (!topWeaknesses?.length) return null;

  return topWeaknesses;
}
