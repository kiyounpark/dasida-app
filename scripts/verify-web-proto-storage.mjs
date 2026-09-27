#!/usr/bin/env node
// 웹(web-proto) 저장소 흉내: 실제 analytics.js 전체 → app.js 윗블록(참여 코드·qa·utm 읽기)을 같은 저장소로 차례로 돌린다.
// 배포 주소(비로컬)로 돈다 — localhost면 isLocal이 qa를 항상 true로 만들어 브라우저로는 못 잰다.
// 사용: node scripts/verify-web-proto-storage.mjs   (app.js 윗블록·analytics.js를 만지면 다시 돌린다)
// 설계·경우 목록: docs/research/2026-09-27-utm-ledger-astra-fable.md
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../web-proto/', import.meta.url);
const appSrc = readFileSync(new URL('app.js', ROOT), 'utf8');
const analyticsSrc = readFileSync(new URL('analytics.js', ROOT), 'utf8');

// app.js에서 PARTICIPANT_ID_PATTERN부터 isLocal 줄까지 잘라 쓴다 — 이 두 줄이 바뀌면 여기서 먼저 깨진다
const start = appSrc.indexOf('  const PARTICIPANT_ID_PATTERN');
const endLine = appSrc.indexOf("const isLocal = host === 'localhost'");
if (start < 0 || endLine < 0) throw new Error('app.js 윗블록 경계를 못 찾았다 — 이 스크립트의 자르는 자리를 고쳐라');
const block = appSrc.slice(start, appSrc.indexOf('\n', endLine));

const HOST = 'dasida-proto.netlify.app';

// mode: 'ok' 정상 · 'blocked' 접근부터 던짐(쿠키 차단) · 'readonly' 쓰기·지우기가 던짐(옛 사파리 프라이빗)
// failSetKey: 그 키에 쓸 때만 던짐, 지우기는 됨 (용량 초과 흉내)
function makeStore(mode, initial = {}, failSetKey = null) {
  const map = new Map(Object.entries(initial));
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (mode === 'readonly' || k === failSetKey) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
    removeItem: (k) => {
      if (mode === 'readonly') throw new Error('QuotaExceededError');
      map.delete(k);
    },
  };
  return { mode, map, storage };
}

// 한 번 방문 = analytics.js → app.js 윗블록 (index.html의 defer 순서)
function visit(search, store) {
  const appended = [];
  const ctx = {
    location: { search, hostname: HOST },
    URLSearchParams,
    Date,
    window: {},
    document: { createElement: () => ({}), head: { appendChild: (el) => appended.push(el) } },
  };
  if (store.mode === 'blocked') {
    Object.defineProperty(ctx, 'localStorage', { get() { throw new Error('SecurityError'); } });
  } else {
    ctx.localStorage = store.storage;
  }
  vm.createContext(ctx);
  vm.runInContext(analyticsSrc, ctx);
  const out = vm.runInContext(`(function(){${block}\nreturn { participantId, isQa, utmSource, utmSeenAt, isLocal };})()`, ctx);
  return { ...out, gaLoaded: appended.length > 0 };
}

const results = [];
let failed = 0;
function check(name, fn) {
  try {
    fn();
    results.push('✔ ' + name);
  } catch (error) {
    failed += 1;
    results.push('✖ ' + name + '\n    ' + String(error.message).split('\n').slice(0, 4).join('\n    '));
  }
}
const isRecent = (iso, since) => Date.parse(iso) >= since && Date.parse(iso) <= Date.now();
const OLD = '2026-09-20T00:00:00.000Z';

// ── 저장소가 막혀도 이번 주소의 값은 이번 제출에 싣는다 ──

check('완전 차단 + ?qa=1&p&utm → 셋 다 실림, 시각은 지금, GA 안 켬', () => {
  const since = Date.now();
  const r = visit('?qa=1&p=k7Q2mX9p&utm_source=yt_short6_pin', makeStore('blocked'));
  assert.equal(r.isLocal, false);
  assert.equal(r.isQa, true);
  assert.equal(r.participantId, 'k7Q2mX9p');
  assert.equal(r.utmSource, 'yt_short6_pin');
  assert.ok(isRecent(r.utmSeenAt, since));
  assert.equal(r.gaLoaded, false);
});

check('쓰기만 막힘(빈 저장소) + ?qa=1&utm → qa·utm 실림, GA 안 켬', () => {
  const r = visit('?qa=1&utm_source=insta', makeStore('readonly'));
  assert.equal(r.isQa, true);
  assert.equal(r.utmSource, 'insta');
  assert.ok(r.utmSeenAt);
  assert.equal(r.gaLoaded, false);
});

check('완전 차단 + 파라미터 없음 → qa false·utm null, GA 켬 (일반 방문자)', () => {
  const r = visit('', makeStore('blocked'));
  assert.equal(r.isQa, false);
  assert.equal(r.utmSource, null);
  assert.equal(r.utmSeenAt, null);
  assert.equal(r.gaLoaded, true);
});

check('완전 차단 + ?qa=0 · ?qa=off → qa false, GA 켬', () => {
  for (const q of ['?qa=0', '?qa=off']) {
    const r = visit(q, makeStore('blocked'));
    assert.equal(r.isQa, false, q);
    assert.equal(r.gaLoaded, true, q);
  }
});

check('완전 차단 + 틀린 utm → null', () => {
  assert.equal(visit('?utm_source=%3Cscript%3E', makeStore('blocked')).utmSource, null);
});

check('쓰기만 막힘 + 저장된 qa=1 + ?p&utm → qa true (참여 코드 쓰기가 던져도 qa 읽기를 안 건너뜀, astra ①)', () => {
  const r = visit('?p=k7Q2mX9p&utm_source=yt_short6_pin', makeStore('readonly', { dasida_qa: '1' }));
  assert.equal(r.isQa, true);
  assert.equal(r.participantId, 'k7Q2mX9p');
  assert.equal(r.utmSource, 'yt_short6_pin');
});

check('시각 쓰기만 실패(용량 초과) → 새 이름표에 옛 링크 시각이 안 붙고 null (astra ②)', () => {
  const since = Date.now();
  const store = makeStore('ok', { dasida_utm_source: 'insta', dasida_utm_seen_at: OLD }, 'dasida_utm_seen_at');
  const first = visit('?utm_source=yt_short6_pin', store);
  assert.equal(first.utmSource, 'yt_short6_pin');
  assert.ok(isRecent(first.utmSeenAt, since));
  for (const search of ['?utm_source=yt_short6_pin', '']) {
    const next = visit(search, store);
    assert.equal(next.utmSource, 'yt_short6_pin', search);
    assert.equal(next.utmSeenAt, null, search);
  }
});

// ── 저장소 정상 ──

check('저장된 값 → 파라미터 없이 와도 그대로', () => {
  const r = visit('', makeStore('ok', { dasida_utm_source: 'insta', dasida_utm_seen_at: OLD, dasida_qa: '1', dasida_participant: 'k7Q2mX9p' }));
  assert.equal(r.utmSource, 'insta');
  assert.equal(r.utmSeenAt, OLD);
  assert.equal(r.isQa, true);
  assert.equal(r.participantId, 'k7Q2mX9p');
});

check('같은 이름표로 다시 → 시각 안 밀림 (reload()가 쿼리를 들고 다시 연다)', () => {
  const store = makeStore('ok', { dasida_utm_source: 'insta', dasida_utm_seen_at: OLD });
  const r = visit('?utm_source=insta', store);
  assert.equal(r.utmSeenAt, OLD);
  assert.equal(store.map.get('dasida_utm_seen_at'), OLD);
});

check('다른 이름표 → 덮고 시각 새로', () => {
  const since = Date.now();
  const store = makeStore('ok', { dasida_utm_source: 'insta', dasida_utm_seen_at: OLD });
  const r = visit('?utm_source=yt_short6_pin', store);
  assert.equal(r.utmSource, 'yt_short6_pin');
  assert.ok(isRecent(r.utmSeenAt, since));
  assert.equal(store.map.get('dasida_utm_source'), 'yt_short6_pin');
});

check('틀린 이름표 → 무시, 저장된 값 유지', () => {
  const store = makeStore('ok', { dasida_utm_source: 'insta', dasida_utm_seen_at: OLD });
  const r = visit('?utm_source=%3Cscript%3E', store);
  assert.equal(r.utmSource, 'insta');
  assert.equal(r.utmSeenAt, OLD);
});

check('저장된 qa=1 + ?qa=0 · ?qa=off → 해제되고 다음 방문도 false, GA 켬', () => {
  for (const q of ['?qa=0', '?qa=off']) {
    const store = makeStore('ok', { dasida_qa: '1' });
    const r = visit(q, store);
    assert.equal(r.isQa, false, q);
    assert.equal(r.gaLoaded, true, q);
    assert.equal(visit('', store).isQa, false, q + ' 다음 방문');
  }
});

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
