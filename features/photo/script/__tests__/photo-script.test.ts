// 대본 모듈 골든 — 웹 골든(옮기기 전 웹으로 녹음)과 같은 결과·같은 누름에서 같은 글자를 내는가.
// 검산·diagnose는 실제 요청 함수(requestQuizVerify·requestDiagnoseMethod)를 쓰고 fetch만 바꿔 끼운다 — 웹 녹음기와 같은 자리.
import { requestDiagnoseMethod } from '../../flow/diagnose-method-request';
import { readCheckQuiz, readRetryQuiz } from '../../flow/quiz-guard';
import { requestQuizVerify } from '../../flow/verify-quiz-request';
import { createPhotoScript } from '../photo-script';
import type { NoteView, ScriptDeps } from '../script-io';
import {
  APP_GOLDEN_DIR,
  loadGoldens,
  RECORD,
  saveGolden,
  type GoldenDoc,
  type GoldenEntry,
} from './golden';
import { createTranscriptRecorder } from './transcript-recorder';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

function stubFetch(doc: GoldenDoc) {
  const diagnose = [...doc.diagnose];
  return jest.fn(async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    if (url.endsWith('/diagnoseMethod')) {
      if (diagnose.length === 0) throw new Error('골든에 없는 diagnoseMethod 호출');
      const reply = diagnose.shift();
      if (reply === null) throw new TypeError('Failed to fetch');
      return ok(reply);
    }
    if (url.endsWith('/verifyQuiz')) {
      const verdict = doc.verdicts[body.kind as 'check' | 'retry'];
      if (verdict === 'pending') return new Promise<Response>(() => {});
      return ok({ verdict: verdict ?? 'unset' });
    }
    throw new Error(`골든에 없는 요청: ${url}`);
  });
}

// 웹 녹음기와 같은 흘려보내기 — 1ms씩(가짜 시계는 틱 도중의 setTimeout(0)을 1ms 뒤로 민다)
async function settle() {
  for (let i = 0; i < 6; i += 1) await jest.advanceTimersByTimeAsync(1);
}

async function runScript(doc: GoldenDoc, profile: ScriptDeps['profile']): Promise<GoldenEntry[]> {
  const recorder = createTranscriptRecorder({ appEvents: profile.picksWeakness });
  global.fetch = stubFetch(doc) as unknown as typeof fetch;
  const script = createPhotoScript(recorder.io, {
    verifyQuiz: requestQuizVerify,
    diagnoseMethod: (text) => requestDiagnoseMethod(text, { problemId: 'photo-flow-test' }),
    submissionId: '00000000-0000-4000-8000-000000000000',
    qa: true,
    photoUri: 'data:image/jpeg;base64,R09MREVO',
    profile,
  });
  script.start(doc.result);
  await settle();
  const transcript = recorder.snapshot();
  for (const step of doc.steps) {
    if (typeof step === 'string') {
      transcript.push({ press: step });
      recorder.press(step);
    } else if ('text' in step) {
      transcript.push({ type: step.text });
      recorder.type(step.text);
    } else {
      transcript.push({ wait: step.wait });
      await jest.advanceTimersByTimeAsync(step.wait);
    }
    await settle();
    transcript.push(...recorder.snapshot());
  }
  return transcript;
}

const realFetch = global.fetch;
beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-01T03:00:00Z') }));
afterEach(() => {
  jest.useRealTimers();
  global.fetch = realFetch;
});

describe('대본 모듈 = 웹 골든 (약점 고르기 끔 — 웹과 같은 대본)', () => {
  it.each(loadGoldens())('%s', async (_id, doc) => {
    expect(await runScript(doc, { picksWeakness: false, textInput: true })).toEqual(doc.transcript);
  });
});

// 앱 profile 그대로(use-photo-flow.ts) — 약점 고르기 + 짚기 0도 노트(🔒 10.08 C). 20~25는 웹 설문 결말 골든을 앱으로 다시 녹음
describe('앱 골든 (약점 고르기·설문 노트 켬 — 앱만의 갈래)', () => {
  it.each(loadGoldens(APP_GOLDEN_DIR))('%s', async (id, doc) => {
    const transcript = await runScript(doc, { picksWeakness: true, textInput: true, noteWithoutPointing: true });
    if (RECORD) {
      saveGolden(id, { ...doc, transcript }, APP_GOLDEN_DIR);
    } else {
      expect(transcript).toEqual(doc.transcript);
    }
  });
});

// 1.0.12 ⑵ — 노트에 실리는 것. 골든 시나리오를 돌려 대본이 showNote에 넘긴 NoteView를 그대로 본다
const goldenById = new Map(loadGoldens());

async function noteViewOf(id: string, steps?: GoldenDoc['steps']): Promise<{ view: NoteView | null; doc: GoldenDoc }> {
  const doc = goldenById.get(id);
  if (!doc) throw new Error(`골든 없음: ${id}`);
  const recorder = createTranscriptRecorder();
  let view: NoteView | null = null;
  global.fetch = stubFetch(doc) as unknown as typeof fetch;
  const script = createPhotoScript(
    {
      ...recorder.io,
      showNote: (note) => {
        view = note;
        recorder.io.showNote(note);
      },
    },
    {
      verifyQuiz: requestQuizVerify,
      diagnoseMethod: (text) => requestDiagnoseMethod(text, { problemId: 'photo-flow-test' }),
      submissionId: '00000000-0000-4000-8000-000000000000',
      qa: true,
      photoUri: null,
      profile: { picksWeakness: false, textInput: true },
    },
  );
  script.start(doc.result);
  await settle();
  for (const step of steps ?? doc.steps) {
    if (typeof step === 'string') recorder.press(step);
    else if ('text' in step) recorder.type(step.text);
    else await jest.advanceTimersByTimeAsync(step.wait);
    await settle();
    recorder.snapshot();
  }
  return { view, doc };
}

// 쪽지·재도전은 학생 화면에 나간 것만 — 검산을 통과 못 해 건너뛴 문제는 안 실린다(🔒 09.30 확인 문제 정답)
describe('노트에 남기는 문제 (⑵)', () => {
  it.each(['04-assert-got-it-pass-pass', '05-check-fail-retry-fail', '16-soft-yes-retry-skip'])(
    '%s — 쪽지·재도전 둘 다 화면에 나갔으니 둘 다 남는다(넘어갈래 포함)',
    async (id) => {
      const { view, doc } = await noteViewOf(id);
      const cand = doc.result.errorCandidates[0];
      expect(view?.checkQuiz).toEqual(readCheckQuiz(cand));
      expect(view?.retryQuiz).toEqual(readRetryQuiz(cand));
    },
  );

  it.each(['13-verify-wait-timeout-check-skipped', '14-check-not-started-retry-unverified'])(
    '%s — 검산을 통과 못 해 안 보여준 문제는 안 남는다',
    async (id) => {
      const { view } = await noteViewOf(id);
      expect(view).not.toBeNull();
      expect(view).not.toHaveProperty('checkQuiz');
      expect(view).not.toHaveProperty('retryQuiz');
    },
  );
});

// 개념 설명은 검산이 없는 글이라 「봤다」가 품질을 거르지 않는다 — 후보에 있으면 늘 담는다(astra·Fable 10.05)
describe('노트에 남기는 개념 설명 (⑵)', () => {
  const CONCEPT_ID = '06-dont-get-why-concept';

  it('[모르겠어]로 개념 설명을 본 학생 노트에 남는다', async () => {
    const { view, doc } = await noteViewOf(CONCEPT_ID);
    expect(view?.concept).toEqual(doc.result.errorCandidates[0].concept);
  });

  it('[아, 이거였구나]로 안 본 학생 노트에도 남는다 — 「노트 다시 보기」가 나중에 꺼낼 수 있게', async () => {
    const { view, doc } = await noteViewOf(CONCEPT_ID, ['맞아, 시작하자', '아, 이거였구나', '9를 더한다', '25를 더한다']);
    expect(view).not.toBeNull();
    expect(view?.concept).toEqual(doc.result.errorCandidates[0].concept);
  });

  it('후보에 개념 설명이 없으면 칸도 없다', async () => {
    const { view } = await noteViewOf('07-dont-get-why-fix');
    expect(view).not.toBeNull();
    expect(view).not.toHaveProperty('concept');
  });
});
