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

/** 한 칸 아래 단계 — 놓친 복습이 내려가는 곳(🔒 10.06). day1은 내려갈 데가 없어 null. */
export function getPreviousReviewStage(stage: ReviewStage): ReviewStage | null {
  const index = REVIEW_STAGE_ORDER.indexOf(stage);
  return index > 0 ? REVIEW_STAGE_ORDER[index - 1] : null;
}

export function getNextReviewStage(stage: ReviewStage): ReviewStage | null {
  const stageIndex = REVIEW_STAGE_ORDER.indexOf(stage);
  if (stageIndex === -1 || stageIndex >= REVIEW_STAGE_ORDER.length - 1) {
    return null;
  }

  return REVIEW_STAGE_ORDER[stageIndex + 1];
}
