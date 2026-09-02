import { requestAnalyze } from '../analyze-photo-request';

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
