import type { AuthClient } from '@/features/auth/auth-client';

import { createGetRemoteAuthHeaders } from './remote-auth-headers';

/**
 * 사진 분석(analyzePhoto)에 싣는 계정 헤더. 다른 서버 함수와 같은 셋이라야
 * 서버가 같은 검증(authenticateLearningHistoryRequest)으로 볼 수 있다.
 * 헤더 때문에 사진 분석이 멈추면 안 된다 — 실패해도 던지지 않는다.
 */
function makeAuthClient(getRemoteAuthContext: AuthClient['getRemoteAuthContext']) {
  return { getRemoteAuthContext } as AuthClient;
}

describe('getRemoteAuthHeaders', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('로그인 계정이면 계정 키와 Bearer 토큰을 싣는다', async () => {
    const getHeaders = createGetRemoteAuthHeaders(
      makeAuthClient(async () => ({ kind: 'firebase', accountKey: 'user:abc', idToken: 'idtok' })),
    );

    await expect(getHeaders('user:abc')).resolves.toEqual({
      'x-dasida-account-key': 'user:abc',
      Authorization: 'Bearer idtok',
    });
  });

  it('게스트면 계정 키와 세션 시크릿을 싣는다', async () => {
    const getHeaders = createGetRemoteAuthHeaders(
      makeAuthClient(async () => ({ kind: 'anonymous', accountKey: 'anon:xyz', requestSecret: 'sec' })),
    );

    await expect(getHeaders('anon:xyz')).resolves.toEqual({
      'x-dasida-account-key': 'anon:xyz',
      'x-dasida-session-secret': 'sec',
    });
  });

  it('토큰 갱신이 5초 넘게 안 끝나면 기다리지 않고 계정 키만 싣는다 — 분석 시작을 붙잡지 않는다', async () => {
    jest.useFakeTimers();
    try {
      // 모바일 Firebase 토큰 갱신은 망이 멈추면 60초까지 간다 (@firebase/auth DEFAULT_API_TIMEOUT_MS)
      const getHeaders = createGetRemoteAuthHeaders(makeAuthClient(() => new Promise(() => {})));

      const pending = getHeaders('user:abc');
      await jest.advanceTimersByTimeAsync(5_000);

      await expect(pending).resolves.toEqual({ 'x-dasida-account-key': 'user:abc' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('인증 정보를 못 받으면 던지지 않고 계정 키만 싣는다 — 사진 분석은 계속 돈다', async () => {
    const getHeaders = createGetRemoteAuthHeaders(
      makeAuthClient(async () => {
        throw new Error('token refresh failed');
      }),
    );

    await expect(getHeaders('user:abc')).resolves.toEqual({ 'x-dasida-account-key': 'user:abc' });
  });
});
