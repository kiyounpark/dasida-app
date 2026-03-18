import type { ReviewStage } from './history-types';

export const REVIEW_STAGE_ORDER: ReviewStage[] = ['day1', 'day3', 'day7', 'day30'];

export const REVIEW_STAGE_OFFSETS: Record<ReviewStage, number> = {
  day1: 1,
  day3: 3,
  day7: 7,
  day30: 30,
};

export function formatReviewStageLabel(stage: ReviewStage) {
  switch (stage) {
    case 'day1':
      return 'DAY 1';
    case 'day3':
      return 'DAY 3';
    case 'day7':
      return 'DAY 7';
    case 'day30':
      return 'DAY 30';
  }
}

export function getNextReviewStage(stage: ReviewStage): ReviewStage | null {
  const stageIndex = REVIEW_STAGE_ORDER.indexOf(stage);
  if (stageIndex === -1 || stageIndex >= REVIEW_STAGE_ORDER.length - 1) {
    return null;
  }

  return REVIEW_STAGE_ORDER[stageIndex + 1];
}
