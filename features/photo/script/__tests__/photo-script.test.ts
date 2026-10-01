// 대본 모듈 골든 — 웹 골든(옮기기 전 웹으로 녹음)과 같은 결과·같은 누름에서 같은 글자를 내는가.
// 검산·diagnose는 실제 요청 함수(requestQuizVerify·requestDiagnoseMethod)를 쓰고 fetch만 바꿔 끼운다 — 웹 녹음기와 같은 자리.
import { requestDiagnoseMethod } from '../../flow/diagnose-method-request';
import { requestQuizVerify } from '../../flow/verify-quiz-request';
import { createPhotoScript } from '../photo-script';
import type { ScriptDeps } from '../script-io';
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

describe('앱 골든 (약점 고르기 켬 — 앱만의 갈래)', () => {
  it.each(loadGoldens(APP_GOLDEN_DIR))('%s', async (id, doc) => {
    const transcript = await runScript(doc, { picksWeakness: true, textInput: true });
    if (RECORD) {
      saveGolden(id, { ...doc, transcript }, APP_GOLDEN_DIR);
    } else {
      expect(transcript).toEqual(doc.transcript);
    }
  });
});
