import { requestQuizVerify, type QuizVerifyBody } from '../verify-quiz-request';

const BODY: QuizVerifyBody = {
  kind: 'check',
  setup: 'x^2 + 6x 를 완전제곱식으로 바꾼다고 하자.',
  prompt: '뭘 더하고 빼야 할까?',
  options: ['3을 더하고 뺀다', '9를 더하고 뺀다', '6을 더하고 뺀다'],
  marked: 1,
  submissionId: 'sub-1',
  qa: false,
};

/**
 * 검산은 학생 흐름을 절대 멈추면 안 된다 — 무슨 일이 나도 match 아니면 skip으로 돌아오고,
 * skip이면 그 문제만 건너뛴다(정답을 바꿔 넣지 않는다). 원본 web-proto app.js verifyQuizFetch.
 */
describe('requestQuizVerify', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  function respond(status: number, json: unknown) {
    const mockFetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => json });
    global.fetch = mockFetch as unknown as typeof fetch;
    return mockFetch;
  }

  it('서버가 match면 match', async () => {
    respond(200, { verdict: 'match', answerIndex: 1 });
    await expect(requestQuizVerify(BODY)).resolves.toMatchObject({ verdict: 'match', reason: 'match' });
  });

  it.each(['none', 'multiple', 'ambiguous'])('서버가 %s면 skip이고 이유를 남긴다', async (verdict) => {
    respond(200, { verdict });
    await expect(requestQuizVerify(BODY)).resolves.toMatchObject({ verdict: 'skip', reason: verdict });
  });

  it('5xx면 던지지 않고 skip(error)', async () => {
    respond(500, { error: 'verify_failed' });
    await expect(requestQuizVerify(BODY)).resolves.toMatchObject({ verdict: 'skip', reason: 'error' });
  });

  it('네트워크가 끊겨도 던지지 않고 skip(error)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    await expect(requestQuizVerify(BODY)).resolves.toMatchObject({ verdict: 'skip', reason: 'error' });
  });

  it('15초 안에 안 오면 끊고 skip(timeout)', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    ) as unknown as typeof fetch;

    const pending = requestQuizVerify(BODY);
    jest.advanceTimersByTime(15_000);
    await expect(pending).resolves.toMatchObject({ verdict: 'skip', reason: 'timeout' });
  });

  it('정답 번호(marked)는 본문에 실어 보낸다 — 서버가 모델에 안 보여주고 대조에만 쓴다', async () => {
    const mockFetch = respond(200, { verdict: 'match' });
    await requestQuizVerify(BODY);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://asia-northeast3-dasida-app.cloudfunctions.net/verifyQuiz');
    expect(JSON.parse(init.body)).toEqual(BODY);
  });
});
