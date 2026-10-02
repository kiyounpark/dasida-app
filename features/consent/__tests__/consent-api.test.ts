import type { ConsentDoc, SaveConsentRequest } from '@/functions/src/photo-store-contract';

import { ConsentApiError, createConsentRemote } from '../consent-api';

/** saveConsent·getConsent 부르는 모양 — 약속 파일 엔드포인트·인증 헤더 그대로 (1.0.11 1줄) */

const DOC: ConsentDoc = {
  schemaVersion: 1,
  accountKey: 'user:abc',
  analysis: { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null },
  store: { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null },
  review: { version: 1, agreedAt: null, revokedAt: null },
  via: 'all',
  updatedAt: '2026-10-10T00:00:00.000Z',
  appVersion: '1.0.11',
};

const HEADERS = { 'x-dasida-account-key': 'user:abc', Authorization: 'Bearer token' };

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const remote = createConsentRemote(async () => HEADERS);

it('getConsent: 계정 키를 쿼리·헤더에 싣고, 문서가 없으면 null', async () => {
  fetchMock.mockResolvedValue(respond(200, { consent: null }));

  await expect(remote.fetch('user:abc')).resolves.toBeNull();

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://asia-northeast3-dasida-app.cloudfunctions.net/getConsent?accountKey=user%3Aabc');
  expect(init).toMatchObject({ method: 'GET', headers: HEADERS });
});

it('getConsent: 문서가 있으면 그대로', async () => {
  fetchMock.mockResolvedValue(respond(200, { consent: DOC }));

  await expect(remote.fetch('user:abc')).resolves.toEqual(DOC);
});

it('saveConsent: POST 본문 = 요청 그대로, 응답 문서를 돌려준다', async () => {
  fetchMock.mockResolvedValue(respond(200, { consent: DOC }));
  const request: SaveConsentRequest = {
    accountKey: 'user:abc',
    decisions: { analysis: true, store: true, review: true },
    copyVersion: { analysis: 1, store: 1, review: 1 },
    via: 'all',
    appVersion: '1.0.11',
  };

  await expect(remote.save(request)).resolves.toEqual(DOC);

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://asia-northeast3-dasida-app.cloudfunctions.net/saveConsent');
  expect(init.method).toBe('POST');
  expect(init.headers).toEqual({ ...HEADERS, 'Content-Type': 'application/json' });
  expect(JSON.parse(init.body)).toEqual(request);
});

it('오류 응답은 상태·code를 실어 던진다', async () => {
  fetchMock.mockResolvedValue(
    respond(503, { error: 'Failed to save consent', code: 'TEMPORARY_FAILURE', retryable: true }),
  );

  const error = await remote.fetch('user:abc').catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ConsentApiError);
  expect(error).toMatchObject({ status: 503, code: 'TEMPORARY_FAILURE' });
});

it('모양이 깨진 응답은 "문서 없음"으로 읽지 않고 던진다 — 동의를 지우거나 지어내지 않는다', async () => {
  fetchMock.mockResolvedValue(respond(200, { consent: { schemaVersion: 2 } }));
  await expect(remote.fetch('user:abc')).rejects.toBeInstanceOf(ConsentApiError);

  fetchMock.mockResolvedValue(respond(200, null));
  await expect(remote.fetch('user:abc')).rejects.toBeInstanceOf(ConsentApiError);
});
