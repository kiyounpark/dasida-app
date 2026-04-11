import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * 모의고사별 오답 진단 완료 목록을 AsyncStorage에 저장/조회한다.
 * key: dasida/exam-diagnosis/{examId}
 * value: { [problemNumber]: WeaknessId }
 */

export type ExamDiagnosisProgress = Record<number, WeaknessId>;

function storageKey(examId: string) {
  return StorageKeys.examDiagnosisProgressPrefix + examId;
}

let pendingWrite = Promise.resolve();

export async function getDiagnosisProgress(
  examId: string,
): Promise<ExamDiagnosisProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(examId));
    if (!raw) return {};
    return JSON.parse(raw) as ExamDiagnosisProgress;
  } catch {
    return {};
  }
}

export async function markProblemDiagnosed(
  examId: string,
  problemNumber: number,
  weaknessId: WeaknessId,
): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    const current = await getDiagnosisProgress(examId);
    const updated: ExamDiagnosisProgress = { ...current, [problemNumber]: weaknessId };
    await AsyncStorage.setItem(storageKey(examId), JSON.stringify(updated));
  });
  await pendingWrite;
}
