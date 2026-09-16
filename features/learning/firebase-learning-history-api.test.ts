import {
  LearningHistoryApiError,
  shouldUseLearningHistoryCacheFallback,
} from './firebase-learning-history-api';

describe('shouldUseLearningHistoryCacheFallback', () => {
  it('400은 폴백하지 않는다 — 보낸 데이터가 틀린 것이라 재시도해도 같고, 캐시로 숨기면 변경이 조용히 유실된다', () => {
    const error = new LearningHistoryApiError('Invalid request body', 400, 'HTTP_ERROR');

    expect(shouldUseLearningHistoryCacheFallback(error)).toBe(false);
  });

  it('500은 폴백한다 — 서버 일시 장애라 캐시로 버티는 게 맞다', () => {
    const error = new LearningHistoryApiError('boom', 500, 'HTTP_ERROR');

    expect(shouldUseLearningHistoryCacheFallback(error)).toBe(true);
  });

  it('429는 폴백한다 — 4xx지만 일시적이다', () => {
    const error = new LearningHistoryApiError('slow down', 429, 'HTTP_ERROR');

    expect(shouldUseLearningHistoryCacheFallback(error)).toBe(true);
  });

  it('네트워크 끊김은 폴백한다', () => {
    const error = new LearningHistoryApiError('net', 0, 'NETWORK_ERROR');

    expect(shouldUseLearningHistoryCacheFallback(error)).toBe(true);
  });

  it('타임아웃은 폴백한다', () => {
    const error = new LearningHistoryApiError('timeout', 0, 'TIMEOUT');

    expect(shouldUseLearningHistoryCacheFallback(error)).toBe(true);
  });

  it('인증 실패는 폴백하지 않는다 (기존 동작 유지)', () => {
    const error = new LearningHistoryApiError('unauth', 401, 'UNAUTHORIZED');

    expect(shouldUseLearningHistoryCacheFallback(error)).toBe(false);
  });
});
