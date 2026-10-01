/** @jest-environment jsdom */
// 웹 대화 골든 — 실제 web-proto 파일(flow-bundle.js·app.js, 있으면 survey-data.js)을 jsdom에서 돌려
// 단계마다 말풍선·버튼·카드·이벤트를 적고 골든과 비교한다. GOLDEN_RECORD=1이면 비교 대신 새로 쓴다.
// new JSDOM()을 따로 만들지 않는다 — jest의 jsdom 전역에서 window.eval로 돌려야 app.js의 setTimeout이 가짜 시계에 잡힌다.
// 설계 docs/research/2026-10-01-b-shared-script-design.md §4.2
import fs from 'node:fs';
import path from 'node:path';

import {
  goldenEvent,
  loadGoldens,
  RECORD,
  saveGolden,
  type GoldenDoc,
  type GoldenEntry,
  type GoldenNote,
} from './golden';

const WEB = path.join(__dirname, '../../../../web-proto');
const read = (file: string) => fs.readFileSync(path.join(WEB, file), 'utf8');
// survey-data.js는 웹이 대본 모듈로 옮겨지면 없어진다(B 커밋 4) — 있을 때만 싣는다
const SOURCES = ['flow-bundle.js', 'survey-data.js', 'app.js'].filter((file) =>
  fs.existsSync(path.join(WEB, file)),
);
const MAIN = (() => {
  const html = read('index.html');
  return html.slice(html.indexOf('<main'), html.indexOf('</main>') + '</main>'.length);
})();

// 곡선(웹 결말)의 첫 문장 → 결말 종류. 곡선 뒤 말·스토어 버튼은 웹 몫이라 안 적는다
const CURVE_FIRST_LINES: Record<string, 'note:success' | 'note:fail' | 'weakness'> = {
  '지금은 잡았어. 근데 뇌는 내일이면 이 감각의 절반을 지워 — 네 의지 문제가 아니라 원래 그래.': 'note:success',
  '지금 헷갈린 건 내일이면 더 흐려져. 네 의지 문제가 아니라 뇌가 원래 그래.': 'note:fail',
  '네가 짚어준 이 약점, 내일이면 감각의 절반이 사라져. 네 의지 문제가 아니라 뇌가 원래 그래.': 'weakness',
};
// "오늘은 여기까지" 뒤 — 웹은 버튼 없이 끝난다(앱 대본은 end({kind:'closed'}))
const CLOSED_LINE = '알겠어. 다른 문제 생기면 또 올려줘.';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

type Page = { events: { name: string; params: Record<string, unknown> }[]; reloads: number };

function loadWeb(doc: GoldenDoc): Page {
  const w = window as any;
  const page: Page = { events: [], reloads: 0 };
  localStorage.clear();
  document.body.innerHTML = MAIN;

  // jsdom에 없는 것 (node로 확인 — 설계 §0)
  (AbortSignal as any).timeout = () => new AbortController().signal;
  Element.prototype.scrollIntoView = () => {};
  w.createImageBitmap = async () => ({ width: 1176, height: 1568, close() {} });
  (HTMLCanvasElement.prototype as any).getContext = () => ({ drawImage() {} });
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,R09MREVO';
  Object.defineProperty(w.crypto, 'randomUUID', {
    configurable: true,
    value: () => '00000000-0000-4000-8000-000000000000',
  });
  w.alert = jest.fn();
  w.open = jest.fn();
  // GA 대신 — 운영 히트 0
  w.track = (name: string, params?: Record<string, unknown>) =>
    page.events.push({ name, params: JSON.parse(JSON.stringify(params ?? {})) });
  // jsdom의 location.reload는 바꿔 끼울 수 없다(Unforgeable) — 소스에서 부르는 자리를 바꿔 센다
  w.__goldenReload = () => {
    page.reloads += 1;
  };

  const diagnose = [...doc.diagnose];
  w.fetch = async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    if (url.endsWith('/analyzePhoto')) return ok(doc.result);
    if (url.endsWith('/diagnoseMethod')) {
      if (diagnose.length === 0) throw new Error('골든에 없는 diagnoseMethod 호출');
      const reply = diagnose.shift();
      if (reply === null) throw new TypeError('Failed to fetch');
      return ok(reply);
    }
    if (url.endsWith('/verifyQuiz')) {
      const verdict = doc.verdicts[body.kind as 'check' | 'retry'];
      if (verdict === 'pending') return new Promise(() => {});
      return ok({ verdict: verdict ?? 'unset' });
    }
    throw new Error(`골든에 없는 요청: ${url}`);
  };

  for (const file of SOURCES) {
    let src = read(file);
    if (file === 'app.js') src = src.replace(/window\.location\.reload\(\)/g, 'window.__goldenReload()');
    // 번들은 "use strict"로 시작해 eval 안의 var가 전역에 안 붙는다(script 태그와 다른 점) — 같은 eval 안에서 붙인다
    if (file === 'flow-bundle.js') src += '\n;window.DasidaFlow = DasidaFlow;';
    w.eval(src);
  }
  return page;
}

// await 사이사이(축소·fetch·json·검산)를 다 흘려보낸다. 1ms씩만 밀어 5초 검산 대기는 안 건드린다 —
// 가짜 시계는 틱 도중에 건 setTimeout(0)을 1ms 뒤로 미룬다(재도전의 0초 대기가 여기 걸린다)
async function settle() {
  for (let i = 0; i < 6; i += 1) await jest.advanceTimersByTimeAsync(1);
}

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const text = (el: Element | null) => el?.textContent ?? '';

function readNote(el: Element): GoldenNote {
  const q = (selector: string) => el.querySelector(selector);
  const weakness = q('.note-weakness');
  return {
    date: text(q('.note-date')),
    photo: q('.note-photo') !== null,
    quote: text(q('.note-quote')),
    why: text(q('.note-why')),
    fix: text(q('.note-fix')),
    checks: text(q('.note-checks')),
    tags: text(q('.note-tags')),
    weakness: weakness ? text(weakness).replace(/^🏷️ /, '').split(' 또는 ') : [],
    askLine: q('.note-ask') !== null,
  };
}

function paras(bubble: Element) {
  return [...bubble.children].filter((child) => child.classList.contains('p')).map(text);
}

/** 지난 단계 뒤로 화면에 생긴 것을 적는다 */
function makeRecorder(page: Page) {
  let seen = 0;
  let seenParas = 0;
  let seenAsk = false;
  let seenEvents = 0;
  let seenReloads = 0;

  return function snapshot(): GoldenEntry[] {
    const out: GoldenEntry[] = [];
    const kids = [...byId('thread').children];
    if (kids.length < seen) {
      // resetUpload가 대화를 비웠다
      seen = 0;
      seenParas = 0;
      seenAsk = false;
    }
    let ending: GoldenEntry | null = null;

    for (let i = Math.max(seen - 1, 0); i < kids.length && !ending; i += 1) {
      const el = kids[i];
      const isOld = i < seen;
      if (el.classList.contains('bubble') && el.classList.contains('coach')) {
        const all = paras(el);
        const ask = el.classList.contains('ask');
        if (isOld) {
          const fresh = all.slice(seenParas);
          if (fresh.length > 0 || ask !== seenAsk) out.push({ coach: fresh, ask, cont: true });
          continue;
        }
        const curve = CURVE_FIRST_LINES[all[0]];
        if (curve && kids[i + 1]?.classList.contains('curve-card')) {
          ending = { ending: curve };
          break;
        }
        out.push({ coach: all, ask });
      } else if (isOld) {
        continue;
      } else if (el.classList.contains('bubble') && el.classList.contains('me')) {
        out.push({ me: paras(el).join('\n') });
      } else if (el.classList.contains('note-card')) {
        out.push({ note: readNote(el) });
      } else if (el.classList.contains('card') && el.classList.contains('final')) {
        out.push({ card: { title: text(el.querySelector('.card-title')), body: text(el.querySelector('.card-body')) } });
      } else {
        throw new Error(`모르는 대화 칸: ${el.className}`);
      }
    }
    seen = kids.length;
    const last = kids.at(-1);
    const lastIsCoach = Boolean(last?.classList.contains('coach'));
    seenParas = last && lastIsCoach ? paras(last).length : 0;
    seenAsk = Boolean(last?.classList.contains('ask'));

    for (const { name, params } of page.events.slice(seenEvents)) {
      const entry = goldenEvent(name, params);
      if (entry) out.push(entry);
    }
    seenEvents = page.events.length;

    const actions = byId('actions');
    const input = actions.querySelector('.fallback-input') as HTMLInputElement | null;
    const buttons = [...actions.querySelectorAll('button')];
    if (page.reloads > seenReloads) {
      out.push({ effect: 'restart' });
    } else if (!byId('screen-upload').hidden) {
      out.push({ effect: 'retake_from_gate' });
    } else if (ending) {
      out.push(ending);
    } else if (input) {
      out.push({
        input: { placeholder: input.placeholder, maxLength: input.maxLength, submit: text(buttons[0]) },
      });
    } else if (buttons.length > 0) {
      out.push({ buttons: buttons.map((b) => [text(b), b.className || null]) });
    } else if (last && lastIsCoach && paras(last).at(-1) === CLOSED_LINE) {
      out.push({ ending: 'closed' });
    }
    seenReloads = page.reloads;
    return out;
  };
}

function press(label: string) {
  const buttons = [...byId('actions').querySelectorAll('button')];
  const button = buttons.find((b) => text(b) === label);
  if (!button) throw new Error(`버튼 없음: ${label} (있는 것: ${buttons.map(text).join(' / ')})`);
  button.click();
}

function type(value: string) {
  const input = byId('actions').querySelector('.fallback-input') as HTMLInputElement | null;
  if (!input) throw new Error(`입력칸 없음: ${value}`);
  input.value = value;
  (byId('actions').querySelector('button') as HTMLButtonElement).click();
}

async function runWebScenario(doc: GoldenDoc): Promise<GoldenEntry[]> {
  const page = loadWeb(doc);
  const snapshot = makeRecorder(page);

  const fileInput = byId('file') as HTMLInputElement;
  Object.defineProperty(fileInput, 'files', {
    configurable: true,
    value: [new File(['x'], 'golden.jpg', { type: 'image/jpeg' })],
  });
  fileInput.dispatchEvent(new Event('change'));
  byId('cta').click();
  await settle();
  const transcript = snapshot();

  for (const step of doc.steps) {
    if (typeof step === 'string') {
      transcript.push({ press: step });
      press(step);
    } else if ('text' in step) {
      transcript.push({ type: step.text });
      type(step.text);
    } else {
      transcript.push({ wait: step.wait });
      await jest.advanceTimersByTimeAsync(step.wait);
    }
    await settle();
    transcript.push(...snapshot());
  }
  return transcript;
}

describe('웹 대화 골든', () => {
  it.each(loadGoldens())('%s', async (id, doc) => {
    jest.useFakeTimers({ now: new Date('2026-10-01T03:00:00Z') });
    try {
      const transcript = await runWebScenario(doc);
      if (RECORD) {
        saveGolden(id, { ...doc, transcript });
      } else {
        expect(transcript).toEqual(doc.transcript);
      }
    } finally {
      // RNTL 정리 훅이 가짜 시계에서 멈춘다 — 테스트 안에서 돌려놓는다
      jest.useRealTimers();
    }
  });
});
