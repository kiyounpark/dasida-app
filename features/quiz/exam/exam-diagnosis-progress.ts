import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * 모의고사별 오답 진단 완료 목록을 AsyncStorage에 저장/조회한다.
 * key: exam_diag_{examId}
 * value: { [problemNumber]: WeaknessId }
 */

export type ExamDiagnosisProgress = Record<number, WeaknessId>;

function storageKey(examId: string) {
  return `exam_diag_${examId}`;
}

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
  const current = await getDiagnosisProgress(examId);
  const updated: ExamDiagnosisProgress = { ...current, [problemNumber]: weaknessId };
  await AsyncStorage.setItem(storageKey(examId), JSON.stringify(updated));
}
