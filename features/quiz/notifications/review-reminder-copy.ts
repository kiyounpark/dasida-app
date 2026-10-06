import type { ReviewStage } from '@/features/learning/history-types';
import { REVIEW_STAGE_OFFSETS, getPreviousReviewStage } from '@/features/learning/review-stage';

export type ReminderSlot = 'morning' | 'evening';

/**
 * 알림이 가리키는 과제 — 아침 본문이 단계로 갈린다(기윤 10.06).
 * due = 오늘 복습 날 · missed = 어제 놓친 과제(오늘 과제는 없음). 놓친 과제는 다음에 열 때 이미
 * 한 칸 내려가니(🔒 10.06) 「오늘 놓치면」을 쓰면 거짓이다.
 */
export type ReminderTask = { kind: 'due'; stage: ReviewStage } | { kind: 'missed' };

// 카피 단일 출처(클라). 서버 functions/src/review-reminder-copy.ts 와
// 문자열 동일해야 하며, 양쪽 단위 테스트가 동일 기대값으로 드리프트 차단.
export function buildReviewReminderCopy(
  slot: ReminderSlot,
  label: string | undefined,
  task: ReminderTask,
): { title: string; body: string } {
  if (slot === 'morning') {
    return {
      title: label
        ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
        : '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: morningBody(task),
    };
  }
  return {
    title: label
      ? `${label}, 오늘 자기 전 마지막 기회예요`
      : '오늘 복습 마감, 자기 전 3분만요',
    body: '잠들기 전 3분, 기억이 굳어져요',
  };
}

// 「절반 넘게」는 앱이 망각 곡선 카드에 쓰는 「내일 58% 사라져요」와 같은 숫자(notification-opt-in-card).
// day1은 놓쳐도 안 내려가서 「돌아가요」를 못 쓴다 — 그래서 day1만 다른 말.
function morningBody(task: ReminderTask): string {
  if (task.kind === 'missed') {
    return '어제 못 한 복습, 지금 이어서 해요';
  }
  const lower = getPreviousReviewStage(task.stage);
  if (!lower) {
    return '틀린 거, 하루 만에 벌써 절반 넘게 잊었어요';
  }
  return `오늘 놓치면 ${REVIEW_STAGE_OFFSETS[lower]}일차로 돌아가요`;
}
