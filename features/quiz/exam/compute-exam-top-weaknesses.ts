import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

export function computeExamTopWeaknesses(progress: ExamDiagnosisProgress): WeaknessId[] {
  const freq = new Map<WeaknessId, number>();
  for (const weaknessId of Object.values(progress) as WeaknessId[]) {
    freq.set(weaknessId, (freq.get(weaknessId) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 3);
}
