import { downscaleRatio, requestAnalyze } from '../analyze-photo-request';

// 스토어 빌드엔 app.config.js의 version이 박힌다. jest엔 없어서 값을 준다
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.9' } } }));

/**
 * 09.30 바꿈(웹과 같은 문구 — 앱은 1.0.10). 옛 "잠깐 늦어졌어. 한 번만 다시 눌러줄래?"는
 * 긴 풀이 시간 초과에서 학생이 4번 다시 눌러 4번 52초를 기다리게 했다. 같은 사진은 다시 눌러도 같게 실패한다 —
 * 재시도를 권하지 않고 판단을 못 했다는 사실만 말한다.
 */
describe('requestAnalyze — 서버가 못 답했을 때 학생이 읽는 말', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function respondWith(status: number) {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status }) as unknown as typeof fetch;
  }

  it.each([500, 502, 503, 504, 429])('%d면 판단을 못 했다고 말한다 — 다시 누르라고 안 한다', async (status) => {
    respondWith(status);
    await expect(requestAnalyze('data:image/jpeg;base64,AAAA')).rejects.toThrow(
      '분석을 끝내지 못했어. 이번에는 풀이가 맞는지 틀렸는지 판단하지 못했어.',
    );
  });

  it('195초 마감에 끊기면 같은 말을 한다 — "Aborted" 같은 원문이 학생 화면에 안 나간다', async () => {
    jest.useFakeTimers();
    try {
      global.fetch = jest.fn(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
          }),
      ) as unknown as typeof fetch;

      const pending = requestAnalyze('data:image/jpeg;base64,AAAA');
      const assertion = expect(pending).rejects.toThrow(
        '분석을 끝내지 못했어. 이번에는 풀이가 맞는지 틀렸는지 판단하지 못했어.',
      );
      jest.advanceTimersByTime(194_999);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
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

  // 1.0.10 — 이 표식이 없으면 서버는 옛 57초 예산으로 돌아 통과 사진(65~110초)이 거의 다 끊긴다
  it('긴 마감 표식 clientDeadlineMs 195000을 싣는다 (웹과 같은 값)', async () => {
    const read = captureRequest();

    await requestAnalyze('data:image/jpeg;base64,AAAA');

    expect(read().body.clientDeadlineMs).toBe(195_000);
  });

  it('사진 번호와 다시 찍기 번호를 싣고, 없으면 null로 보낸다', async () => {
    const read = captureRequest();
    await requestAnalyze('data:image/jpeg;base64,AAAA', { submissionId: 'sub-new-1', retakeOf: 'sub-old-1' });
    expect(read().body).toMatchObject({ submissionId: 'sub-new-1', retakeOf: 'sub-old-1' });

    const readBare = captureRequest();
    await requestAnalyze('data:image/jpeg;base64,AAAA');
    expect(readBare().body).toMatchObject({ submissionId: null, retakeOf: null });
  });
});

/**
 * 10.01 웹에서 고친 구멍 — 긴 변 1568로 줄이면 세로 긴 사진(스크린샷)의 짧은 변이 800 밑으로 눌려
 * 원본이 커도 서버 거르기에 걸렸다. 1.0.10부터 앱도 픽셀 총량 1176×1568 + 긴 변 2048.
 * 서버는 줄인 사진의 짧은 변 800 미만을 거른다(functions/src/analyze-photo.ts).
 */
describe('downscaleRatio — 웹과 같은 축소 규칙', () => {
  function shrunk(width: number, height: number) {
    const scale = downscaleRatio(width, height);
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
  }

  it('카메라 3:4 원본은 지금과 같은 1176×1568', () => {
    expect(shrunk(3024, 4032)).toEqual({ width: 1176, height: 1568 });
  });

  it('아이폰 스크린샷은 짧은 변이 800을 넘어 거르기를 통과한다 (옛 규칙은 723)', () => {
    const { width } = shrunk(1179, 2556);
    expect(width).toBeGreaterThanOrEqual(800);
    expect(width).toBe(922);
  });

  it('아주 긴 사진은 긴 변 2048에서 멈춘다', () => {
    expect(shrunk(1000, 5000)).toEqual({ width: 410, height: 2048 });
  });

  it('이미 작은 사진은 키우지 않는다', () => {
    expect(downscaleRatio(800, 1000)).toBe(1);
  });
});
