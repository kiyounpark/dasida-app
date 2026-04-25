import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * 모의고사 회차별 오답 진단 완료 목록을 AsyncStorage에 저장/조회한다.
 * key:   dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}
 *        - YYYY-MM-DD는 KST 기준, 라벨/디버깅용
 *        - attemptId가 회차 식별 책임
 * value: { [problemNumber]: WeaknessId }
 */

export type ExamDiagnosisProgress = Record<number, WeaknessId>;

export type ExamAttemptScope = {
  examId: string;
  attemptId: string;
  attemptDateISO: string; // ISO 타임스탬프 (예: result.completedAt)
};

function formatKstDate(iso: string): string {
  const utcMs = new Date(iso).getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

function storageKey(scope: ExamAttemptScope): string {
  const date = formatKstDate(scope.attemptDateISO);
  return `${StorageKeys.examDiagnosisProgressPrefix}${scope.examId}/${date}-${scope.attemptId}`;
}

function legacyStorageKey(examId: string): string {
  return StorageKeys.examDiagnosisProgressPrefix + examId;
}

let pendingWrite = Promise.resolve();

export async function getDiagnosisProgress(
  scope: ExamAttemptScope,
): Promise<ExamDiagnosisProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    if (!raw) return {};
    return JSON.parse(raw) as ExamDiagnosisProgress;
  } catch {
    return {};
  }
}

export async function markProblemDiagnosed(
  scope: ExamAttemptScope,
  problemNumber: number,
  weaknessId: WeaknessId,
): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    const current = await getDiagnosisProgress(scope);
    const updated: ExamDiagnosisProgress = { ...current, [problemNumber]: weaknessId };
    await AsyncStorage.setItem(storageKey(scope), JSON.stringify(updated));
  });
  await pendingWrite;
}

/**
 * 옛날 키 형태(`dasida/exam-diagnosis/{examId}`, attemptId 없음)를 한 번 삭제한다.
 * 결과 화면 첫 진입 시 호출 — 진단 이력은 백엔드 attempt 레코드에 보존되므로
 * AsyncStorage 캐시 삭제는 안전하다.
 */
export async function purgeLegacyDiagnosisKey(examId: string): Promise<void> {
  await AsyncStorage.removeItem(legacyStorageKey(examId));
}
