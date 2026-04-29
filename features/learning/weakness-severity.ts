import type { WeaknessId } from '@/data/diagnosisMap';

import type { LearningAttempt, WeaknessSeverity } from './types';

const RECENT_WINDOW = 5;

export function computeRecentAppearanceCount(
  weaknessId: WeaknessId,
  attempts: LearningAttempt[],
): number {
  const recent = attempts
    .filter((a) => a.source === 'diagnostic' || a.source === 'featured-exam')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, RECENT_WINDOW);
  return recent.filter((a) => a.topWeaknesses.includes(weaknessId)).length;
}

export function computeSeverity(count: number): WeaknessSeverity {
  if (count >= 4) return 'frequent';
  if (count >= 2) return 'often';
  return 'occasional';
}
