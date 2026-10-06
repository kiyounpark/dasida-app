import type { ReminderSlot, ReminderTask } from './review-reminder-core';

// 놓치면 내려가는 단계의 날 수 — day1은 더 안 내려간다(🔒 10.06 한 칸 내림).
// 클라는 features/learning/review-stage.ts getPreviousReviewStage로 같은 값을 낸다.
const STEP_DOWN_DAY: Record<'day1' | 'day3' | 'day7' | 'day30', number | null> = {
  day1: null,
  day3: 1,
  day7: 3,
  day30: 7,
};

// 카피 단일 출처(서버). 클라
// features/quiz/notifications/review-reminder-copy.ts 와 문자열 동일해야
// 하며, 양쪽 단위 테스트가 동일 기대값으로 드리프트를 막는다.
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

// 「절반 넘게」는 앱이 망각 곡선 카드에 쓰는 「내일 58% 사라져요」와 같은 숫자.
// day1은 놓쳐도 안 내려가서 「돌아가요」를 못 쓴다 — 그래서 day1만 다른 말.
function morningBody(task: ReminderTask): string {
  if (task.kind === 'missed') {
    return '어제 못 한 복습, 지금 이어서 해요';
  }
  const lowerDay = STEP_DOWN_DAY[task.stage];
  if (lowerDay === null) {
    return '틀린 거, 하루 만에 벌써 절반 넘게 잊었어요';
  }
  return `오늘 놓치면 ${lowerDay}일차로 돌아가요`;
}
