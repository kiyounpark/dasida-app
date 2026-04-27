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
