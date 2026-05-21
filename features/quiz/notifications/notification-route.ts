export type NotificationRoute =
  | { pathname: '/quiz/review-session'; params: { taskId: string } }
  | { pathname: '/(tabs)/quiz' };

// 알림 페이로드(data)를 보고 어느 화면으로 보낼지 결정한다.
// `review_reminder`인데 taskId가 빠진 경우(서버 푸시 회귀 또는 옛 빌드)는
// 복습 탭으로 폴백해 막다른 골목을 피한다.
export function resolveNotificationRoute(
  data: Record<string, unknown>,
): NotificationRoute | null {
  if (data.notificationType !== 'review_reminder') return null;
  if (typeof data.taskId === 'string' && data.taskId.length > 0) {
    return { pathname: '/quiz/review-session', params: { taskId: data.taskId } };
  }
  return { pathname: '/(tabs)/quiz' };
}
