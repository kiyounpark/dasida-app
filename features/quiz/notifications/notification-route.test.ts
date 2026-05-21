import { resolveNotificationRoute } from './notification-route';

describe('resolveNotificationRoute', () => {
  test('review_reminder + taskId → review-session으로 라우팅', () => {
    expect(resolveNotificationRoute({ notificationType: 'review_reminder', taskId: 't-1' })).toEqual({
      pathname: '/quiz/review-session',
      params: { taskId: 't-1' },
    });
  });

  // 서버 푸시가 한때 taskId를 누락했던 회귀 + 옛 빌드 호환.
  // 적어도 복습 탭으로는 진입해 사용자가 막다른 골목에 빠지지 않게.
  test('review_reminder인데 taskId 누락 → 복습 탭 폴백', () => {
    expect(resolveNotificationRoute({ notificationType: 'review_reminder' })).toEqual({
      pathname: '/(tabs)/quiz',
    });
  });

  test('알 수 없는 type → null (라우팅 안 함)', () => {
    expect(resolveNotificationRoute({ notificationType: 'unknown', taskId: 't-1' })).toBeNull();
    expect(resolveNotificationRoute({})).toBeNull();
  });

  test('taskId가 비문자열 → 누락으로 간주', () => {
    expect(resolveNotificationRoute({ notificationType: 'review_reminder', taskId: 123 })).toEqual({
      pathname: '/(tabs)/quiz',
    });
  });
});
