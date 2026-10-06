import { buildReviewReminderCopy } from './review-reminder-copy';

// 1.0.12 — 아침 본문은 과제 단계로 갈린다(기윤 10.06). 놓친 복습은 다음에 열 때 한 칸 내려가고(🔒 10.06)
// day1은 더 안 내려간다 — 그래서 「돌아가요」는 day3 이상에만, 숫자로 말한다.
// 서버 functions/tests/review-reminder-copy.test.ts와 같은 기대값 — 한쪽만 바꾸면 깨진다.
describe('buildReviewReminderCopy (클라/서버 카피 동기)', () => {
  it('아침 + 라벨 있음 · day1', () => {
    expect(
      buildReviewReminderCopy('morning', '판별식 계산 실수', { kind: 'due', stage: 'day1' }),
    ).toEqual({
      title: '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요',
      body: '틀린 거, 하루 만에 벌써 절반 넘게 잊었어요',
    });
  });
  it('아침 + 라벨 없음 · day1', () => {
    expect(buildReviewReminderCopy('morning', undefined, { kind: 'due', stage: 'day1' })).toEqual({
      title: '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: '틀린 거, 하루 만에 벌써 절반 넘게 잊었어요',
    });
  });
  it.each([
    ['day3', '오늘 놓치면 1일차로 돌아가요'],
    ['day7', '오늘 놓치면 3일차로 돌아가요'],
    ['day30', '오늘 놓치면 7일차로 돌아가요'],
  ] as const)('아침 · %s는 내려갈 단계를 숫자로', (stage, body) => {
    expect(buildReviewReminderCopy('morning', undefined, { kind: 'due', stage }).body).toBe(body);
  });
  it('아침 · 어제 놓친 과제 — 열면 이미 내려가니 「오늘 놓치면」은 안 쓴다', () => {
    expect(buildReviewReminderCopy('morning', undefined, { kind: 'missed' }).body).toBe(
      '어제 못 한 복습, 지금 이어서 해요',
    );
  });
  it('저녁 + 라벨 있음 (단계와 무관)', () => {
    expect(
      buildReviewReminderCopy('evening', '판별식 계산 실수', { kind: 'due', stage: 'day7' }),
    ).toEqual({
      title: '판별식 계산 실수, 오늘 자기 전 마지막 기회예요',
      body: '잠들기 전 3분, 기억이 굳어져요',
    });
  });
  it('저녁 + 라벨 없음 (단계와 무관)', () => {
    expect(buildReviewReminderCopy('evening', undefined, { kind: 'due', stage: 'day1' })).toEqual({
      title: '오늘 복습 마감, 자기 전 3분만요',
      body: '잠들기 전 3분, 기억이 굳어져요',
    });
  });
});
