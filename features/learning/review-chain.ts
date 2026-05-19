import { compareTimestampsAsc } from '@/functions/shared/timestamp-utils';

import type { ReviewStage } from './history-types';
import { getNextReviewStage, REVIEW_STAGE_OFFSETS } from './review-stage';
import type { ReviewTask } from './types';

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface NextDueResolution {
  nextDue: ReviewTask | null;
  dueRemaining: number;
}

export function resolveNextDueReview(
  tasks: ReviewTask[],
  justCompletedTaskId: string,
): NextDueResolution {
  const today = todayStr();
  const due = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.id !== justCompletedTaskId &&
        t.scheduledFor.slice(0, 10) <= today,
    )
    .sort((a, b) => compareTimestampsAsc(a.scheduledFor, b.scheduledFor));
  return { nextDue: due[0] ?? null, dueRemaining: due.length };
}

export function countDueReviews(tasks: ReviewTask[]): number {
  const today = todayStr();
  return tasks.filter(
    (t) => !t.completed && t.scheduledFor.slice(0, 10) <= today,
  ).length;
}

export function nextStageOffsetDays(stage: ReviewStage): number | null {
  const next = getNextReviewStage(stage);
  return next ? REVIEW_STAGE_OFFSETS[next] : null;
}
