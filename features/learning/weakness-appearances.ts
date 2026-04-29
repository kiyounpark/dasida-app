import type { WeaknessId } from '@/data/diagnosisMap';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';

import type { LearningAttempt, WeaknessAppearance } from './types';

function formatYearMonthKst(iso: string): { year: number; month: number } {
  const utcMs = new Date(iso).getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function buildSourceLabel(attempt: LearningAttempt): string {
  if (attempt.source === 'featured-exam' && attempt.sourceEntityId != null) {
    const exam = EXAM_CATALOG_BY_ID[attempt.sourceEntityId];
    if (exam != null) return exam.title;
  }
  const { year, month } = formatYearMonthKst(attempt.completedAt);
  if (attempt.source === 'diagnostic') {
    return `${year}년 ${month}월 진단`;
  }
  return `${year}년 ${month}월 모의고사`;
}

export function buildWeaknessAppearances(
  weaknessId: WeaknessId,
  attempts: LearningAttempt[],
): WeaknessAppearance[] {
  return attempts
    .filter((a) => a.source === 'diagnostic' || a.source === 'featured-exam')
    .filter((a) => a.topWeaknesses.includes(weaknessId))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((a) => ({
      attemptId: a.id,
      source: a.source,
      sourceLabel: buildSourceLabel(a),
      attemptedAt: a.completedAt,
    }));
}
