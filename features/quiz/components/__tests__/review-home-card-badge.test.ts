import { reviewDeadlineBadge } from '../review-home-card';

// 카드 렌더는 안 한다 — jest.setup.js가 PlatformConstants를 null로 막아 Animated가 못 뜬다.
// 기윤 10.06 확정: day1은 내려갈 칸이 없어 「더 흐려져요」, 그 위는 내려갈 날을 숫자로.
describe('reviewDeadlineBadge — 놓친 복습 한 칸 내림 (🔒 10.06)', () => {
  it('day1은 내려갈 칸이 없어 「오늘 안 하면 더 흐려져요」', () => {
    expect(reviewDeadlineBadge('day1')).toBe('오늘 안 하면 더 흐려져요');
  });

  it.each([
    ['day3', '오늘 놓치면 1일차로'],
    ['day7', '오늘 놓치면 3일차로'],
    ['day30', '오늘 놓치면 7일차로'],
  ] as const)('%s는 내려갈 날을 숫자로', (stage, badge) => {
    expect(reviewDeadlineBadge(stage)).toBe(badge);
  });
});
