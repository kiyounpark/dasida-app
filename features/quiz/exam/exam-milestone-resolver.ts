import { computeMilestoneThresholds, type MilestoneFraction } from './diagnosis-milestone';
import { hasMilestoneShown, type MilestoneScope } from './diagnosis-milestone-progress';

export type { MilestoneScope };

/**
 * 현재 노트 수 기준으로 다음에 표시해야 할 마일스톤을 결정한다.
 *
 * - 이미 표시된 마일스톤은 건너뛴다 (hasMilestoneShown 확인)
 * - 두 임계값을 동시에 돌파한 경우 낮은 것(33)부터 표시 — 사용자 여정 순서 보장
 * - 모든 해당 마일스톤이 이미 표시됐으면 null 반환
 */
export async function resolveMilestoneToShow(params: {
  scope: MilestoneScope;
  totalNotes: number;
  noteCountAfterThis: number;
}): Promise<MilestoneFraction | null> {
  const thresholds = computeMilestoneThresholds(params.totalNotes);

  const candidates: MilestoneFraction[] = [];
  if (thresholds.at33 !== null && params.noteCountAfterThis >= thresholds.at33) {
    candidates.push(33);
  }
  if (thresholds.at67 !== null && params.noteCountAfterThis >= thresholds.at67) {
    candidates.push(67);
  }

  for (const fraction of candidates) {
    const seen = await hasMilestoneShown(params.scope, fraction);
    if (!seen) return fraction;
  }
  return null;
}
