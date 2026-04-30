import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LearningAttemptResult } from '@/features/learning/types';

import type { ExamAttemptScope, ExamDiagnosisProgress } from './exam-diagnosis-progress';
import { storageKey } from './exam-diagnosis-progress';

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
  try {
    await AsyncStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // 시드 실패 시에도 결과화면 진입은 가능하므로 silently 진행.
  }
}
