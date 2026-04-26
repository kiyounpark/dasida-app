import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';

export type MilestoneScope = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
};

export function buildMilestoneStorageKey(
  scope: MilestoneScope,
  fraction: MilestoneFraction,
): string {
  return `dasida/exam-diagnosis-milestone/${scope.examId}/${scope.attemptDateISO}-${scope.attemptId}/${fraction}`;
}

export async function hasMilestoneShown(
  scope: MilestoneScope,
  fraction: MilestoneFraction,
): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(buildMilestoneStorageKey(scope, fraction));
    return value === '1';
  } catch {
    return false;
  }
}

export async function markMilestoneShown(
  scope: MilestoneScope,
  fraction: MilestoneFraction,
): Promise<void> {
  try {
    await AsyncStorage.setItem(buildMilestoneStorageKey(scope, fraction), '1');
  } catch {
    // 저장 실패해도 UX 흐름은 막지 않음
  }
}
