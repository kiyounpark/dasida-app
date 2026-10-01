// 시간 경합 — 골든은 검산을 바로 돌려줘서 못 잰다. 가짜 시계 + 손으로 푸는 Promise로 잰다 (설계 §4.3)
import type { QuizVerdict, QuizVerifyBody } from '../../flow/verify-quiz-request';
import { makeCandidate, makeResult } from '../../flow/__fixtures__/analysis';
import { createPhotoScript } from '../photo-script';
import { createQuizVerifyRunner, VERIFY_WAIT_MS } from '../quiz-verify-runner';
import type { ScriptIO } from '../script-io';

const MATCH: QuizVerdict = { verdict: 'match', reason: 'match', ms: 120 };

/** kind별로 손으로 푸는 검산 */
function controlledVerify() {
  const resolvers: Partial<Record<'check' | 'retry', (v: QuizVerdict) => void>> = {};
  const bodies: QuizVerifyBody[] = [];
  const verifyQuiz = jest.fn(
    (body: QuizVerifyBody) =>
      new Promise<QuizVerdict>((resolve) => {
        bodies.push(body);
        resolvers[body.kind] = resolve;
      }),
  );
  return { verifyQuiz, resolvers, bodies };
}

const base = { submissionId: 'sub-1', qa: true };
const result = makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.8 });

beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-01T03:00:00Z') }));
afterEach(() => jest.useRealTimers());

describe('검산 러너 — 5초 경계', () => {
  it('4,999ms에 도착하면 그 판정을 쓴다', async () => {
    const { verifyQuiz, resolvers } = controlledVerify();
    const runner = createQuizVerifyRunner(verifyQuiz, base);
    runner.start(result);
    const pending = runner.verdict('check');
    await jest.advanceTimersByTimeAsync(4_999);
    resolvers.check!(MATCH);
    const v = await pending;
    expect(v).toEqual({ verdict: 'match', reason: 'match', ms: 120, waitedMs: 4_999 });
  });

  it('5,000ms까지 안 오면 wait_timeout — 재도전은 안 기다리고 바로 건너뛴다(빈 화면 10초 방지)', async () => {
    const { verifyQuiz, resolvers } = controlledVerify();
    const runner = createQuizVerifyRunner(verifyQuiz, base);
    runner.start(result);
    const check = runner.verdict('check');
    await jest.advanceTimersByTimeAsync(VERIFY_WAIT_MS);
    expect(await check).toEqual({ verdict: 'skip', reason: 'wait_timeout', ms: null, waitedMs: 5_000 });

    const retry = runner.verdict('retry');
    await jest.advanceTimersByTimeAsync(1);
    // 늦게 온 match는 버려진다 — 이미 건너뛰었다
    resolvers.check!(MATCH);
    resolvers.retry!(MATCH);
    const v = await retry;
    expect(v.reason).toBe('wait_timeout');
    expect(v.waitedMs).toBeLessThanOrEqual(1);
  });

  it('출발 조건 미달이면 not_started — 요청도 안 나간다', async () => {
    const cases = [
      makeResult({ errorCandidates: [], errorConfidence: 0.8 }), // 후보 없음
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.4 }), // 자신감 미달
      makeResult({ hasSolvingWork: false, errorCandidates: [makeCandidate()], errorConfidence: 0.8 }),
    ];
    for (const r of cases) {
      const { verifyQuiz } = controlledVerify();
      const runner = createQuizVerifyRunner(verifyQuiz, base);
      runner.start(r);
      expect(await runner.verdict('check')).toEqual({ verdict: 'skip', reason: 'not_started', ms: null, waitedMs: 0 });
      expect(verifyQuiz).not.toHaveBeenCalled();
    }
  });

  it('보기가 3개가 아니거나 정답 번호가 보기 밖이면 그 문제만 출발 안 한다', async () => {
    const { verifyQuiz, bodies } = controlledVerify();
    const runner = createQuizVerifyRunner(verifyQuiz, base);
    runner.start(
      makeResult({
        errorCandidates: [makeCandidate({ checkOptions: ['a', 'b'], checkAnswerIndex: 0, retryAnswerIndex: 7 })],
        errorConfidence: 0.8,
      }),
    );
    expect(bodies).toEqual([]);
    expect((await runner.verdict('check')).reason).toBe('not_started');
    expect((await runner.verdict('retry')).reason).toBe('not_started');
  });

  it('검산 요청에 문제·정답 번호·제출 번호를 싣는다', () => {
    const { verifyQuiz, bodies } = controlledVerify();
    createQuizVerifyRunner(verifyQuiz, base).start(result);
    const candidate = makeCandidate();
    expect(bodies).toEqual([
      {
        kind: 'check',
        setup: candidate.checkSetup,
        prompt: candidate.checkPrompt,
        options: candidate.checkOptions,
        marked: candidate.checkAnswerIndex,
        ...base,
      },
      {
        kind: 'retry',
        setup: candidate.retrySetup,
        prompt: candidate.retryPrompt,
        options: candidate.retryOptions,
        marked: candidate.retryAnswerIndex,
        ...base,
      },
    ]);
  });
});

/** 무엇이든 부르면 센다 */
function countingIO() {
  const calls: string[] = [];
  let actions: { label: string; onPress: () => void }[] = [];
  let submit: ((text: string) => void) | null = null;
  const io: ScriptIO = {
    say: () => calls.push('say'),
    mySay: () => calls.push('mySay'),
    ask: (next) => {
      calls.push('ask');
      actions = next;
    },
    askText: (prompt) => {
      calls.push('askText');
      submit = prompt.onSubmit;
    },
    showNote: () => calls.push('showNote'),
    showWeaknessCard: () => calls.push('showWeaknessCard'),
    end: () => calls.push('end'),
    run: () => calls.push('run'),
    log: () => calls.push('log'),
  };
  const press = (label: string) => {
    const action = actions.find((a) => a.label === label);
    if (!action) throw new Error(`버튼 없음: ${label}`);
    actions = [];
    action.onPress();
  };
  return { io, calls, press, type: (text: string) => submit!(text) };
}

describe('dispose 뒤엔 아무것도 안 나간다 — 화면 이탈·새 사진 (astra 4)', () => {
  it('쪽지 검산을 기다리는 중에 떠나면, 늦게 온 판정이 말·로그·노트를 안 만든다', async () => {
    const { verifyQuiz, resolvers } = controlledVerify();
    const { io, calls, press } = countingIO();
    const script = createPhotoScript(io, {
      verifyQuiz,
      diagnoseMethod: async () => null,
      submissionId: 'sub-1',
      qa: true,
      photoUri: null,
      profile: { picksWeakness: true, textInput: true },
    });
    script.start(result);
    press('맞아, 시작하자');
    press('아, 이거였구나'); // showCheck가 검산을 기다린다
    const before = calls.length;
    script.dispose();
    resolvers.check!(MATCH);
    resolvers.retry!(MATCH);
    await jest.advanceTimersByTimeAsync(VERIFY_WAIT_MS + 1);
    expect(calls.length).toBe(before);
  });

  it('방법을 학생 말로 받아 diagnose를 기다리는 중에 떠나면, 늦게 온 답이 아무것도 안 만든다', async () => {
    let resolveDiagnose!: (v: null) => void;
    const { io, calls, press, type } = countingIO();
    const script = createPhotoScript(io, {
      verifyQuiz: async () => MATCH,
      diagnoseMethod: () => new Promise((resolve) => (resolveDiagnose = resolve)),
      submissionId: null,
      qa: true,
      photoUri: null,
      profile: { picksWeakness: true, textInput: true },
    });
    script.start(makeResult({ hasSolvingWork: false, predictedMethodId: 'unknown', errorCandidates: [] }));
    press('✏️ 직접 알려줄게');
    type('완전제곱식으로 묶었어');
    const before = calls.length;
    script.dispose();
    resolveDiagnose(null);
    await jest.advanceTimersByTimeAsync(1);
    expect(calls.length).toBe(before);
  });

  it('dispose 뒤에 남은 버튼을 눌러도 아무것도 안 나간다', () => {
    const { io, calls, press } = countingIO();
    const script = createPhotoScript(io, {
      verifyQuiz: async () => MATCH,
      diagnoseMethod: async () => null,
      submissionId: null,
      qa: true,
      photoUri: null,
      profile: { picksWeakness: true, textInput: true },
    });
    script.start(result);
    const before = calls.length;
    script.dispose();
    press('맞아, 시작하자');
    expect(calls.length).toBe(before);
  });
});
