const MILESTONE_MIN_TOTAL = 10;

export type MilestoneFraction = 33 | 67;

export type MilestoneThresholds = {
  at33: number | null;
  at67: number | null;
};

export function computeMilestoneThresholds(totalWrong: number): MilestoneThresholds {
  if (totalWrong < MILESTONE_MIN_TOTAL) {
    return { at33: null, at67: null };
  }
  return {
    at33: Math.floor(totalWrong * 0.33),
    at67: Math.floor(totalWrong * 0.67),
  };
}

export function detectMilestoneReached(input: {
  totalWrong: number;
  currentNoteCount: number;
}): MilestoneFraction | null {
  const thresholds = computeMilestoneThresholds(input.totalWrong);
  // 67 먼저 체크: 높은 마일스톤 우선. >= 비교로 dot-jump 시 스킵 방지
  if (thresholds.at67 !== null && input.currentNoteCount >= thresholds.at67) return 67;
  if (thresholds.at33 !== null && input.currentNoteCount >= thresholds.at33) return 33;
  return null;
}
