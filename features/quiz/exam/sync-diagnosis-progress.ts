import type { LearningAttemptResult } from '@/features/learning/types';

import type { ExamAttemptScope, ExamDiagnosisProgress } from './exam-diagnosis-progress';
import { replaceProgress } from './exam-diagnosis-progress';

export async function syncDiagnosisProgressFromServer(
  scope: ExamAttemptScope,
  results: LearningAttemptResult[],
): Promise<void> {
  const next: ExamDiagnosisProgress = {};
  for (const r of results) {
    if (r.diagnosisCompleted && r.finalWeaknessId !== null) {
      next[r.questionNumber] = r.finalWeaknessId;
    }
  }
  await replaceProgress(scope, next);
}
