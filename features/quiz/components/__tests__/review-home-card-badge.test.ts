import { reviewDeadlineBadge } from '../review-home-card';

// 카드 렌더는 안 한다 — jest.setup.js가 PlatformConstants를 null로 막아 Animated가 못 뜬다.
// 문자열은 초안 — 기윤 검수 전. 이 테스트가 지키는 건 day1과 그 위가 갈리는 것.
describe('reviewDeadlineBadge — 놓친 복습 한 칸 내림 (🔒 10.06)', () => {
  it('day1은 내려갈 칸이 없어 「내일 또 떠요」', () => {
    expect(reviewDeadlineBadge('day1')).toBe('오늘 안 하면 내일 또 떠요');
  });

  it.each(['day3', 'day7', 'day30'] as const)('%s는 「한 칸 내려가요」', (stage) => {
    expect(reviewDeadlineBadge(stage)).toBe('오늘 안 하면 한 칸 내려가요');
  });
});
