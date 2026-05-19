export type ReminderSlot = 'morning' | 'evening';

// 카피 단일 출처(클라). 서버 functions/src/review-reminder-copy.ts 와
// 문자열 동일해야 하며, 양쪽 단위 테스트가 동일 기대값으로 드리프트 차단.
export function buildReviewReminderCopy(
  slot: ReminderSlot,
  label: string | undefined,
): { title: string; body: string } {
  if (slot === 'morning') {
    return {
      title: label
        ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
        : '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    };
  }
  return {
    title: label
      ? `${label}, 오늘 자기 전 마지막 기회예요`
      : '오늘 복습 마감, 자기 전 3분만요',
    body: '잠들기 전 3분, 기억이 굳어져요',
  };
}
