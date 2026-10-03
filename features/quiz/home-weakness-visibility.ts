import type { WeaknessProgressItem } from '@/features/learning/types';

/**
 * 홈 「내 약점 · 복습 정답률」을 띄울지. 복습을 한 번이라도 끝내 막대가 하나 생긴 뒤부터(기윤 10.03).
 * 그 전엔 빈 차트라 첫 사진 학생의 홈을 한 칸 더 허전하게 만든다.
 */
export function shouldShowWeaknessSection(
  items: WeaknessProgressItem[] | undefined,
  isAnalysisInProgress: boolean,
): boolean {
  if (isAnalysisInProgress || !items) return false;
  return items.some((item) => Object.keys(item.reviewAccuracyByStage).length > 0);
}
