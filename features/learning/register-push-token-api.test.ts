import { createRegisterPushToken } from './register-push-token-api';

function makeAuthClient(kind: 'firebase' | 'anonymous') {
  return {
    getRemoteAuthContext: jest.fn().mockResolvedValue(
      kind === 'firebase'
        ? { kind, accountKey: 'user:abc', idToken: 'idtok' }
        : { kind, accountKey: 'anon:1', requestSecret: 'sec' },
    ),
  } as any;
}

describe('createRegisterPushToken', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('firebase 인증: POST로 토큰 전송, Authorization 헤더 포함', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as any;

    const register = createRegisterPushToken({
      authClient: makeAuthClient('firebase'),
      registerPushTokenUrl: 'https://fn/registerPushToken',
    });
    await register('user:abc', 'ExponentPushToken[X]', 'ios');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://fn/registerPushToken');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      accountKey: 'user:abc',
      token: 'ExponentPushToken[X]',
      platform: 'ios',
    });
    expect(init.headers.Authorization).toBe('Bearer idtok');
  });

  it('네트워크 실패 시 throw 안 함(베스트에포트)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as any;
    const register = createRegisterPushToken({
      authClient: makeAuthClient('firebase'),
      registerPushTokenUrl: 'https://fn/registerPushToken',
    });
    await expect(
      register('user:abc', 'ExponentPushToken[X]', 'ios'),
    ).resolves.toBeUndefined();
  });
});
