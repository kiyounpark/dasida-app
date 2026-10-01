#!/usr/bin/env node
// 웹(web-proto) 사진 거르기 흉내: 실제 flow-bundle.js·app.js 전체를 가짜 DOM 위에서 돌린다.
// 네트워크 없음(fetch 가짜) · GA 없음(window.track 스파이 — 운영 히트 0) · analytics.js는 안 싣는다.
// 사용: node scripts/verify-web-proto-gate.mjs   (app.js 업로드·게이트·대기 문구를 만지면 다시 돌린다)
// 설계: dasida-measure/2026-09-29-real-student-timeout/astra-fable-1001/q8-gate-design-final.md (astra ② resetUpload)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../web-proto/', import.meta.url);
const read = (name) => readFileSync(new URL(name, ROOT), 'utf8');
const SOURCES = ['flow-bundle.js', 'app.js'].map((name) => [name, read(name)]);
const indexHtml = read('index.html');

// ── 가짜 DOM — app.js가 쓰는 만큼만 ──

class FakeText {
  constructor(text) { this.isText = true; this.parentNode = null; this.data = String(text); }
  get textContent() { return this.data; }
}

class FakeElement {
  constructor(tag, id = null) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.childNodes = [];
    this.parentNode = null;
    this.classes = new Set();
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.listeners = {};
    const self = this;
    this.classList = {
      add: (...names) => names.forEach((n) => self.classes.add(n)),
      remove: (...names) => names.forEach((n) => self.classes.delete(n)),
      contains: (name) => self.classes.has(name),
    };
  }
  get className() { return [...this.classes].join(' '); }
  set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
  appendChild(child) {
    if (child.isFragment) {
      for (const node of [...child.childNodes]) this.appendChild(node);
      child.childNodes = [];
      return child;
    }
    if (child.parentNode) child.parentNode.childNodes = child.parentNode.childNodes.filter((c) => c !== child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastElementChild() { return this.childNodes.filter((c) => !c.isText).at(-1) ?? null; }
  get children() { return this.childNodes.filter((c) => !c.isText); }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(value) {
    this.childNodes = [];
    if (value !== '' && value != null) this.appendChild(new FakeText(value));
  }
  set innerHTML(html) {
    this.childNodes = [];
    for (const [, cls] of String(html).matchAll(/<div class="([^"]*)"><\/div>/g)) {
      const div = new FakeElement('div');
      div.className = cls;
      this.appendChild(div);
    }
  }
  querySelector(selector) {
    const cls = selector.replace(/^\./, '');
    for (const child of this.children) {
      if (child.classes.has(cls)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type, extra = {}) { for (const fn of this.listeners[type] ?? []) fn({ preventDefault() {}, ...extra }); }
  click() { this.dispatch('click'); }
  scrollIntoView() {}
  focus() {}
  getContext() { return { drawImage() {} }; }
  toDataURL() { return 'data:image/jpeg;base64,/9j/AAAA'; }
}

function makePage({ fetchReplies, bitmap = { width: 1618, height: 1109 } }) {
  const ids = ['screen-upload', 'screen-analyzing', 'screen-chat', 'analyzing-step', 'thread', 'actions', 'drop', 'file', 'picked', 'cta'];
  const byId = Object.fromEntries(ids.map((id) => [id, new FakeElement('div', id)]));
  byId['screen-analyzing'].hidden = true;
  byId['screen-chat'].hidden = true;

  const tracked = [];
  const requests = [];
  const alerts = [];
  const abortTimeouts = [];
  const intervals = [];
  const canvases = [];
  const replies = [...fetchReplies];

  const ctx = {
    console,
    Date,
    Math,
    JSON,
    Promise,
    URLSearchParams,
    location: { search: '', hostname: 'localhost', reload() { throw new Error('reload은 게이트 경로에서 불리면 안 된다'); } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'node', platform: 'node', maxTouchPoints: 0 },
    crypto: { randomUUID },
    document: {
      getElementById: (id) => byId[id] ?? null,
      createElement: (tag) => { const el = new FakeElement(tag); if (tag === 'canvas') canvases.push(el); return el; },
      createTextNode: (text) => new FakeText(text),
      createDocumentFragment: () => Object.assign(new FakeElement('#fragment'), { isFragment: true }),
      addEventListener() {},
      visibilityState: 'visible',
    },
    addEventListener() {},
    scrollTo() {},
    alert: (message) => alerts.push(message),
    open() {},
    // 흐림 애니메이션(250ms)은 바로 돌린다. 문구 순환(setInterval)은 잡아 두고 손으로 돌린다
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout() {},
    setInterval: (fn, ms) => { intervals.push({ fn, ms, cleared: false }); return intervals.length; },
    clearInterval: (handle) => { if (intervals[handle - 1]) intervals[handle - 1].cleared = true; },
    createImageBitmap: async () => ({ ...bitmap, close() {} }),
    AbortSignal: { timeout: (ms) => { abortTimeouts.push(ms); return { aborted: false }; } },
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body), signal: init.signal });
      const reply = replies.shift();
      if (!reply) throw new Error('예상 밖 fetch');
      if (reply instanceof Error) throw reply;
      return { ok: true, status: 200, json: async () => reply };
    },
  };
  ctx.window = ctx; // flow-bundle의 `var DasidaFlow`가 window.DasidaFlow로 보이게
  // vm 안에서 만든 객체는 프로토타입이 달라 deepEqual이 어긋난다 — JSON으로 한 번 씻어 담는다(GA로 가는 것도 결국 이 값)
  ctx.track = (name, params) => tracked.push({ name, params: JSON.parse(JSON.stringify(params ?? {})) });
  vm.createContext(ctx);
  for (const [name, src] of SOURCES) vm.runInContext(src, ctx, { filename: name });

  const flush = () => new Promise((resolve) => setImmediate(resolve));
  return {
    byId, tracked, requests, alerts, abortTimeouts, intervals, canvases, flush,
    pick(name = 'IMG_0001.jpg') {
      byId.file.files = [{ name }];
      byId.file.dispatch('change');
    },
    async submit() {
      byId.cta.click();
      for (let i = 0; i < 5; i += 1) await flush();
    },
    visible() { return ['upload', 'analyzing', 'chat'].filter((s) => !byId[`screen-${s}`].hidden); },
    buttons() { return byId.actions.children.map((b) => b.textContent); },
    pressButton(label) {
      const button = byId.actions.children.find((b) => b.textContent === label);
      assert.ok(button, `버튼 없음: ${label} (있는 것: ${this.buttons().join(' / ')})`);
      button.click();
    },
  };
}

// 서버 응답 — functions/src/photo-gate.ts buildGateBlockedResult와 같은 모양
const blocked = (decision) => ({
  hasSolvingWork: false, userAnswer: null, transcription: '', predictedMethodId: 'unknown', confidence: 0,
  candidateMethodIds: ['unknown'], reason: 'gate', needsManualSelection: true, source: 'openai-vision',
  errorCandidates: [], errorConfidence: 0,
  gate: { decision, rotation: decision === 'blocked_rotation' ? 'rotated_left' : null, width: 1568, height: 1074 },
});

const results = [];
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    results.push('✔ ' + name);
  } catch (error) {
    failed += 1;
    results.push('✖ ' + name + '\n    ' + String(error.stack || error.message).split('\n').slice(0, 6).join('\n    '));
  }
}

await check('누운 사진 → 게이트 문구·버튼, analysis_gate만 찍히고 analysis_shown은 안 찍힘', async () => {
  const page = makePage({ fetchReplies: [blocked('blocked_rotation')] });
  page.pick();
  assert.ok(page.byId.cta.classList.contains('ready'));
  await page.submit();

  const [req] = page.requests;
  assert.equal(req.body.clientDeadlineMs, 195000);
  assert.equal(req.body.retakeOf, null);
  assert.equal(req.body.channel, 'web');
  assert.equal(req.body.qa, true); // localhost — 운영 원장에도 QA로 찍힌다
  assert.deepEqual(page.abortTimeouts, [195000]);

  assert.deepEqual(page.visible(), ['chat']);
  assert.match(page.byId.thread.textContent, /옆으로 누워 있어/);
  assert.deepEqual(page.buttons(), ['📷 세로로 다시 찍기', '오늘은 여기까지']);

  const names = page.tracked.map((e) => e.name);
  assert.deepEqual(names, ['photo_submit', 'analysis_gate']);
  // 첫 제출엔 retake_of 없음. 10.01부터 attempt·wait_ms·submission_id를 싣는다(재시도 뺀 분모 attempt=1)
  const submitEvent = page.tracked[0].params;
  assert.equal('retake_of' in submitEvent, false);
  assert.equal(submitEvent.attempt, 1);
  assert.equal(submitEvent.submission_id, req.body.submissionId);
  const gateEvent = page.tracked[1].params;
  assert.equal(gateEvent.decision, 'blocked_rotation');
  assert.equal(gateEvent.submission_id, req.body.submissionId);
  assert.equal(gateEvent.attempt, 1);
  assert.equal(typeof gateEvent.wait_ms, 'number');
});

await check('작은 사진 → "화면에선 괜찮아 보여도" 문구와 다른 사진 버튼 (10.01)', async () => {
  const page = makePage({ fetchReplies: [blocked('blocked_small')] });
  page.pick();
  await page.submit();
  assert.match(page.byId.thread.textContent, /화면에선 괜찮아 보여도, 이 사진은 내가 글씨를 또렷하게 못 읽어/);
  assert.deepEqual(page.buttons(), ['다른 사진 올리기', '오늘은 여기까지']);
});

await check('축소: 픽셀 총량 1176×1568 + 긴 변 2048 — 세로 긴 스크린샷이 짧은 변 800 밑으로 안 눌린다 (10.01)', async () => {
  const sizes = [
    [{ width: 3024, height: 4032 }, [1176, 1568]], // 카메라 3:4 — 옛 규칙과 같다
    [{ width: 1179, height: 2556 }, [922, 1999]], // 아이폰 스크린샷 — 옛 규칙은 723×1568(거르기에 걸림)
    [{ width: 524, height: 813 }, [524, 813]], // 원본이 작은 사진 — 키우지 않는다
    [{ width: 1000, height: 4000 }, [512, 2048]], // 아주 긴 자른 사진 — 긴 변 2048에서 멈춘다
  ];
  for (const [bitmap, [w, h]] of sizes) {
    const page = makePage({ fetchReplies: [blocked('blocked_small')], bitmap });
    page.pick();
    await page.submit();
    assert.deepEqual([page.canvases[0].width, page.canvases[0].height], [w, h], `${bitmap.width}×${bitmap.height}`);
  }
});

await check('다시 찍기 → resetUpload: 버튼 풀림·선택 비움·대화 비움, 새 사진 제출이 되고 retakeOf가 이어진다 (astra ②)', async () => {
  const pass = {
    hasSolvingWork: true, userAnswer: '3', transcription: 'x^2-4x+3=0', predictedMethodId: 'unknown', confidence: 0.2,
    candidateMethodIds: ['unknown'], reason: 'r', needsManualSelection: true, source: 'openai-vision',
    errorCandidates: [], errorConfidence: 0, gate: { decision: 'pass', rotation: 'upright', width: 1074, height: 1568 },
  };
  const page = makePage({ fetchReplies: [blocked('blocked_rotation'), pass] });
  page.pick('누운.jpg');
  await page.submit();
  const first = page.requests[0].body.submissionId;
  assert.ok(first);
  assert.equal(page.byId.cta.disabled, true); // 제출 때 막힌 채로 게이트 화면에 온다

  page.pressButton('📷 세로로 다시 찍기');
  assert.deepEqual(page.visible(), ['upload']);
  assert.equal(page.byId.cta.disabled, false);
  assert.equal(page.byId.cta.classList.contains('ready'), false);
  assert.equal(page.byId.picked.style.display, 'none');
  assert.equal(page.byId.picked.textContent, '');
  assert.equal(page.byId.file.value, '');
  assert.equal(page.byId.thread.textContent, '');
  assert.equal(page.byId.actions.children.length, 0);

  // 사진 없이 누르면 아무 일도 없다 (selectedFile 비움)
  await page.submit();
  assert.equal(page.requests.length, 1);

  page.pick('세운.jpg');
  assert.ok(page.byId.cta.classList.contains('ready'));
  await page.submit();
  assert.equal(page.requests.length, 2);
  const second = page.requests[1].body;
  assert.notEqual(second.submissionId, first); // 사진 고를 때마다 새 id
  assert.equal(second.retakeOf, first);
  assert.equal(second.clientDeadlineMs, 195000);

  const submits = page.tracked.filter((e) => e.name === 'photo_submit');
  assert.deepEqual(submits.map((e) => e.params.retake_of ?? null), [null, first]);
  assert.ok(page.tracked.some((e) => e.name === 'analysis_shown'));
  assert.deepEqual(page.visible(), ['chat']);
  assert.doesNotMatch(page.byId.thread.textContent, /옆으로 누워 있어/); // 게이트 말풍선이 남지 않는다
});

await check('통과 응답(gate.decision pass)은 기존 라우팅 그대로 — analysis_shown', async () => {
  const page = makePage({
    fetchReplies: [{
      hasSolvingWork: false, userAnswer: null, transcription: '', predictedMethodId: 'unknown', confidence: 0,
      candidateMethodIds: ['unknown'], reason: 'no work', needsManualSelection: true, source: 'openai-vision',
      errorCandidates: [], errorConfidence: 0, gate: { decision: 'pass', rotation: 'upright', width: 1074, height: 1568 },
    }],
  });
  page.pick();
  await page.submit();
  assert.deepEqual(page.tracked.map((e) => e.name), ['photo_submit', 'analysis_shown']);
  assert.match(page.byId.thread.textContent, /풀이 과정을 못 찾았어/); // 옛 갈래 3 (gate 없는 서버·1.0.9와 같은 길)
});

await check('옛 서버(gate 칸 없음) 응답도 그대로 돈다', async () => {
  const page = makePage({
    fetchReplies: [{
      hasSolvingWork: false, userAnswer: null, transcription: '', predictedMethodId: 'unknown', confidence: 0,
      candidateMethodIds: ['unknown'], reason: 'x', needsManualSelection: true, source: 'openai-vision',
      errorCandidates: [], errorConfidence: 0,
    }],
  });
  page.pick();
  await page.submit();
  assert.deepEqual(page.tracked.map((e) => e.name), ['photo_submit', 'analysis_shown']);
});

await check('요청 실패 → 업로드 화면·버튼 풀림·실패 문구 (기존 길 유지)', async () => {
  const page = makePage({ fetchReplies: [new Error('HTTP 500')] });
  page.pick();
  await page.submit();
  assert.deepEqual(page.visible(), ['upload']);
  assert.equal(page.byId.cta.disabled, false);
  assert.equal(page.alerts.length, 1);
  assert.deepEqual(page.tracked.map((e) => e.name), ['photo_submit', 'analysis_failed']);
});

await check('대기 문구: 20초 간격, 4문구 뒤(80초) 숫자 상한 없는 고정 문구, index.html "30초" 없음', async () => {
  assert.ok(indexHtml.includes('<div class="spinner-note">보통 1~2분 걸려. 길면 더 걸리기도 해</div>'));
  assert.ok(!indexHtml.includes('30초 안에 끝나'));

  const page = makePage({ fetchReplies: [] });
  page.pick();
  page.byId.cta.click(); // 응답을 안 기다리고 대기 화면만 본다
  const timer = page.intervals.at(-1);
  assert.equal(timer.ms, 20000);
  const step = page.byId['analyzing-step'];
  assert.equal(step.textContent, '사진에서 네 손글씨 읽는 중…');
  for (let i = 0; i < 4; i += 1) timer.fn();
  assert.equal(step.textContent, '아직 보는 중이야. 너무 오래 걸리면 내가 멈추고 알려줄게');
  assert.ok(!/\d/.test(step.textContent));
  assert.equal(timer.cleared, true);
  await page.flush();
});

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
