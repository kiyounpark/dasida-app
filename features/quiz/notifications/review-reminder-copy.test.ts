import { buildReviewReminderCopy } from './review-reminder-copy';

describe('buildReviewReminderCopy (클라/서버 카피 동기)', () => {
  it('아침 + 라벨 있음', () => {
    expect(buildReviewReminderCopy('morning', '판별식 계산 실수')).toEqual({
      title: '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    });
  });
  it('아침 + 라벨 없음', () => {
    expect(buildReviewReminderCopy('morning', undefined)).toEqual({
      title: '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    });
  });
  it('저녁 + 라벨 있음', () => {
    expect(buildReviewReminderCopy('evening', '판별식 계산 실수')).toEqual({
      title: '판별식 계산 실수, 오늘 자기 전 마지막 기회예요',
      body: '잠들기 전 3분, 기억이 굳어져요',
    });
  });
  it('저녁 + 라벨 없음', () => {
    expect(buildReviewReminderCopy('evening', undefined)).toEqual({
      title: '오늘 복습 마감, 자기 전 3분만요',
      body: '잠들기 전 3분, 기억이 굳어져요',
    });
  });
});
