import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { LearningAttemptResult } from '@/features/learning/types';

import type { ExamAttemptScope, ExamDiagnosisProgress } from './exam-diagnosis-progress';

function formatKstDate(iso: string): string {
  const utcMs = new Date(iso).getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

function storageKey(scope: ExamAttemptScope): string {
  const date = formatKstDate(scope.attemptDateISO);
  return `${StorageKeys.examDiagnosisProgressPrefix}${scope.examId}/${date}-${scope.attemptId}`;
}

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
