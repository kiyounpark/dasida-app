import { requestAnalyze } from '../analyze-photo-request';

// 스토어 빌드엔 app.config.js의 version이 박힌다. jest엔 없어서 값을 준다
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.9' } } }));

/**
 * 09.02 실측 — 기윤이 폰에서 504를 봤다. 서버 로그를 열어보니 같은 사진 세 번이
 * 84초 · 99초 · 25초였다. 사진 난이도가 아니라 AI 쪽 편차고, 콜드 스타트는 1.7초로
 * 무관했다. 그래서 5xx는 "우리 잘못"이 아니라 "그때 늦었다"이고, 다시 누르면 될
 * 확률이 높다. 학생한테 숫자 대신 할 일을 준다.
 */
describe('requestAnalyze — 서버가 못 답했을 때 학생이 읽는 말', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function respondWith(status: number) {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status }) as unknown as typeof fetch;
  }

  it.each([500, 502, 503, 504, 429])('%d면 다시 눌러달라고 한다', async (status) => {
    respondWith(status);
    await expect(requestAnalyze('data:image/jpeg;base64,AAAA')).rejects.toThrow(
      '잠깐 늦어졌어. 한 번만 다시 눌러줄래?',
    );
  });

  it('상태 코드를 학생한테 보여주지 않는다', async () => {
    respondWith(504);
    await expect(requestAnalyze('data:image/jpeg;base64,AAAA')).rejects.not.toThrow(/504/);
  });

  it('4xx는 다시 눌러도 같으므로 안내가 다르다', async () => {
    respondWith(400);
    await expect(requestAnalyze('data:image/jpeg;base64,AAAA')).rejects.toThrow(/400/);
  });
});

/**
 * 사용량 원장(photoAnalysisRuns) — 서버가 "누가 보냈나"를 세려면 앱이 계정 헤더와 출처를 실어야 한다.
 * 1.0.8까지는 Content-Type 하나뿐이라 서버가 셀 수 없었다 (설계: docs/superpowers/specs/2026-09-23-photo-usage-log-design.md).
 */
describe('requestAnalyze — 서버 사용량 원장에 싣는 것', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function captureRequest() {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = mockFetch as unknown as typeof fetch;
    return () => {
      const [, init] = mockFetch.mock.calls[0];
      return { headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
    };
  }

  it('계정 헤더를 Content-Type과 합쳐 싣는다', async () => {
    const read = captureRequest();

    await requestAnalyze('data:image/jpeg;base64,AAAA', {
      headers: { 'x-dasida-account-key': 'user:abc', Authorization: 'Bearer idtok' },
    });

    expect(read().headers).toEqual({
      'Content-Type': 'application/json',
      'x-dasida-account-key': 'user:abc',
      Authorization: 'Bearer idtok',
    });
  });

  it('본문에 사진과 함께 출처(app)·앱 버전·qa를 싣는다', async () => {
    const read = captureRequest();

    await requestAnalyze('data:image/jpeg;base64,AAAA', { qa: true });

    const { body } = read();
    expect(body.imageDataUrl).toBe('data:image/jpeg;base64,AAAA');
    expect(body.channel).toBe('app');
    expect(body.appVersion).toBe('1.0.9');
    expect(body.qa).toBe(true);
  });

  it('옵션 없이 부르면 헤더는 Content-Type 하나, qa는 false', async () => {
    const read = captureRequest();

    await requestAnalyze('data:image/jpeg;base64,AAAA');

    expect(read().headers).toEqual({ 'Content-Type': 'application/json' });
    expect(read().body.qa).toBe(false);
  });
});
