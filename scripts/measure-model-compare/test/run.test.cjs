// 가짜 fetch로 요청·재시도·예산·재개를 확인한다. 외부 호출은 없다.
// 사용: node --test 'scripts/measure-model-compare/test/*.test.cjs'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { loadProd } = require('../load-prod.cjs');
const { MODELS, buildBody, shuffle, prepareCases, makeTasks, readRows, runTasks } = require('../run.cjs');
const repoRoot = path.resolve(__dirname, '../../..');
const prod = loadProd({ repoRoot });
const key = 'FAKE-KEY-NEVER-PERSIST-123';

function fixture(t) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'model-compare-test-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const file = path.join(out, 'tiny.jpg');
  fs.writeFileSync(file, 'fake-photo');
  const cases = [{ id: 'G9', path: file, sha256: crypto.createHash('sha256').update('fake-photo').digest('hex') }];
  return { out, cases, prod, key, budgetUsd: 5, maxCalls: Infinity, concurrency: 1, remaining: 100 };
}
const response = (cost = 0.03, extra = {}) => ({
  ok: true, status: 200, json: async () => ({ id: 'generation', provider: 'fake-provider', model: 'fake',
    choices: [{ message: { content: '{}' }, finish_reason: 'stop', native_finish_reason: 'stop' }],
    usage: { prompt_tokens: 100, completion_tokens: 50, cost }, ...extra }),
});
const twoTasks = () => makeTasks([{ id: 'G9' }], ['mini'], 2);

test('세 모델 요청은 운영 prompt/schema와 지정 provider만 쓴다', () => {
  for (const modelKey of Object.keys(MODELS)) {
    const body = buildBody(modelKey, prod, 'data:image/jpeg;base64,eA==');
    assert.deepEqual(body.provider, MODELS[modelKey].provider);
    assert.deepEqual(body.response_format.json_schema.schema, prod.schema);
    assert.equal(body.messages[0].content, prod.prompt);
    assert.equal(body.messages[1].content[0].text, prod.methodContext);
    assert.equal(body.messages[1].content[1].image_url.detail, 'high');
    // Sonnet(effort면 생각 0)·GLM(effort면 생각이 상한까지)만 생각 예산을 숫자로
    assert.deepEqual(body.reasoning, ['sonnet', 'glm'].includes(modelKey) ? { max_tokens: 16000 } : { effort: 'medium' });
    assert.equal(body.max_tokens, 32000);
    assert.equal(body.provider.allow_fallbacks, false);
    assert.equal(body.provider.data_collection, 'deny');
    // mini만 운영과 같은 OpenAI(ZDR 아님) · 나머지는 학생 사진이라 ZDR 제공자로만
    const only = { mini: ['openai'], sonnet: ['google-vertex'], gemini: ['google-vertex'],
      glm: ['together'], deepseek: ['deepinfra'], ling: ['deepinfra'] }[modelKey];
    assert.deepEqual(body.provider.only, only);
    if (modelKey === 'mini') assert.equal(Object.hasOwn(body.provider, 'zdr'), false);
    else assert.equal(body.provider.zdr, true);
  }
});

test('shuffle은 seed가 같으면 같고 입력은 바꾸지 않는다', () => {
  const arr = Array.from({ length: 30 }, (_, i) => i);
  assert.deepEqual(shuffle(arr, 123), shuffle(arr, 123));
  assert.notDeepEqual(shuffle(arr, 123), shuffle(arr, 124));
  assert.deepEqual(arr, Array.from({ length: 30 }, (_, i) => i));
});

test('성공 즉시 두 행을 기록하고 요청에는 제한 시간과 헤더를 넣는다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  const result = await runTasks({ ...args, tasks: twoTasks(), fetchImpl: async (url, opts) => {
    calls++;
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(opts.headers.Authorization, `Bearer ${key}`);
    assert.equal(opts.headers['X-Title'], 'dasida-measure');
    assert.ok(opts.signal instanceof AbortSignal);
    return response();
  } });
  const rows = readRows(args.out);
  assert.equal(calls, 2);
  assert.equal(rows.length, 2);
  assert.equal(result.calls, 2);
  assert.equal(result.spentThisRun, 0.06);
  assert.equal(rows[1].inflightAtStart, 1);
  assert.equal(rows[1].seq, 2);
  assert.equal(rows[1].costEstimated, false);
});

test('503 무청구는 한 번만 큐 뒤로 재시도한다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  await runTasks({ ...args, tasks: twoTasks().slice(0, 1), fetchImpl: async () => ++calls === 1
    ? { status: 503, ok: false, json: async () => ({ error: { message: 'busy' } }) } : response() });
  const rows = readRows(args.out);
  assert.equal(calls, 2);
  assert.equal(rows[0].retryable, true);
  assert.equal(rows[0].error.kind, 'http');
  assert.equal(rows[1].attempt, 2);
  assert.equal(rows[1].error, null);
});

test('잔액 바닥 여유는 floorUsd로 바꾼다(기본 0.25)', async (t) => {
  const run = async (extra) => {
    const args = fixture(t);
    let calls = 0;
    await runTasks({ ...args, remaining: 0.3, tasks: twoTasks(), ...extra, fetchImpl: async () => { calls++; return response(0.03); } });
    return calls;
  };
  // 첫 예약 = mini projectCallUsd 0.15 · 그다음은 실측 최대 0.03
  assert.equal(await run({}), 0); // limit 0.3 − 0.25 = 0.05 < 0.15 → 한 번도 안 보냄
  assert.equal(await run({ floorUsd: 0.05 }), 2); // limit 0.25 → 0.15 예약 통과 · 둘째 0.03+0.03 통과
});

test('402 무청구(진행 중 요청 때문에 잔액 부족)도 한 번 재시도한다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  await runTasks({ ...args, tasks: twoTasks().slice(0, 1), fetchImpl: async () => ++calls === 1
    ? { status: 402, ok: false, json: async () => ({ error: { message: 'would exceed your available credits' } }) } : response() });
  const rows = readRows(args.out);
  assert.equal(calls, 2);
  assert.equal(rows[0].retryable, true);
  assert.equal(rows[1].error, null);
});

test('예산 0.05, 회당 예약 0.03이면 두 번째 전송 전에 멈춘다', async (t) => {
  const args = fixture(t);
  const original = MODELS.mini.projectCallUsd;
  MODELS.mini.projectCallUsd = 0.03;
  try {
    let calls = 0;
    const result = await runTasks({ ...args, budgetUsd: 0.05, tasks: twoTasks(), fetchImpl: async () => {
      calls++; return response();
    } });
    assert.equal(calls, 1);
    assert.match(result.stopReason, /예산/);
  } finally { MODELS.mini.projectCallUsd = original; }
});

test('동시 호출 예약금과 credits 여유 0.25를 지킨다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  const result = await runTasks({ ...args, remaining: 0.55, concurrency: 3,
    tasks: makeTasks(args.cases, ['mini'], 5), fetchImpl: async () => {
      calls++; await new Promise((resolve) => setImmediate(resolve)); return response();
    } });
  assert.equal(calls, 2);
  assert.equal(result.limit, 0.30000000000000004);
  assert.deepEqual(readRows(args.out).map((r) => r.inflightAtStart), [1, 2]);
});

test('최종 행은 재호출하지 않고 이전 비용도 예산에서 뺀다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(); };
  await runTasks({ ...args, tasks: twoTasks(), maxCalls: 1, fetchImpl });
  await runTasks({ ...args, tasks: twoTasks(), fetchImpl });
  assert.equal(calls, 2);
  assert.equal(readRows(args.out).length, 2);
  await runTasks({ ...args, tasks: twoTasks(), fetchImpl });
  assert.equal(calls, 2);
});

test('토큰 추정 비용을 저장하며 청구 토큰 있는 실패는 재시도하지 않는다', async (t) => {
  const args = fixture(t);
  await runTasks({ ...args, tasks: twoTasks().slice(0, 1), fetchImpl: async () => ({
    status: 503, ok: false, json: async () => ({ error: { message: 'charged failure' },
      usage: { prompt_tokens: 1000, completion_tokens: 1000 } }),
  }) });
  const [row] = readRows(args.out);
  assert.equal(row.retryable, false);
  assert.equal(row.costEstimated, true);
  assert.equal(row.usage.cost, 0.00525);
});

test('에러가 키를 되돌려줘도 콘솔·원장에는 남기지 않는다', async (t) => {
  const args = fixture(t);
  const logs = [];
  const log = console.log;
  console.log = (...x) => logs.push(x.join(' '));
  try {
    await runTasks({ ...args, tasks: twoTasks().slice(0, 1), fetchImpl: async () => {
      throw new Error(`connection ${key}`);
    } });
  } finally { console.log = log; }
  assert.equal(logs.join('\n').includes(key), false);
  assert.equal(fs.readFileSync(path.join(args.out, 'runs.jsonl'), 'utf8').includes(key), false);
  assert.equal(readRows(args.out).length, 2);
});

test('사진 sha256 불일치는 fetch보다 먼저 멈춘다', async (t) => {
  const args = fixture(t);
  args.cases[0].sha256 = '0'.repeat(64);
  assert.throws(() => prepareCases(args.cases), /sha256/);
  let calls = 0;
  await assert.rejects(runTasks({ ...args, tasks: twoTasks(), fetchImpl: async () => {
    calls++; return response();
  } }), /sha256/);
  assert.equal(calls, 0);
});

test('plan·dry-run은 키 읽기·fetch 없이 실행한다', (t) => {
  const args = fixture(t);
  const caseFile = path.join(args.out, 'cases.json');
  fs.writeFileSync(caseFile, JSON.stringify({ cases: args.cases }));
  const guard = path.join(args.out, 'guard.cjs');
  fs.writeFileSync(guard, `const fs=require('node:fs'); const read=fs.readFileSync;
    fs.readFileSync=function(file,...args){if(String(file).includes('openrouter-key'))throw Error('KEY READ');return read.call(this,file,...args)};
    global.fetch=()=>{throw Error('NETWORK CALL')};`);
  for (const mode of ['--plan', '--dry-run']) {
    const result = spawnSync(process.execPath, ['--require', guard, path.join(__dirname, '../run.cjs'),
      '--cases', caseFile, '--out', args.out, '--seed', '42', mode], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const dryFiles = fs.readdirSync(path.join(args.out, 'dry-run'));
  assert.equal(dryFiles.length, 9);
  const body = JSON.parse(fs.readFileSync(path.join(args.out, 'dry-run', dryFiles[0]), 'utf8'));
  assert.match(body.messages[1].content[1].image_url.url, /^<image\/jpeg 10 bytes sha256:[a-f0-9]{64}>$/);
});

test('이전 모든 시도의 비용을 더하고 모델별 최대 비용으로 예약한다', async (t) => {
  const args = fixture(t);
  const prior = [
    { taskKey: 'old|mini|1', modelKey: 'mini', attempt: 1, retryable: true, usage: { cost: 0.02 } },
    { taskKey: 'old|mini|1', modelKey: 'mini', attempt: 2, retryable: false, usage: { cost: 0.04 } },
    { taskKey: 'old|mini|2', modelKey: 'mini', attempt: 1, retryable: false,
      usage: { prompt_tokens: 1000, completion_tokens: 1000 } },
  ];
  fs.writeFileSync(path.join(args.out, 'runs.jsonl'), prior.map(JSON.stringify).join('\n') + '\n');
  let calls = 0;
  const result = await runTasks({ ...args, budgetUsd: 0.10, tasks: twoTasks(), fetchImpl: async () => {
    calls++; return response();
  } });
  assert.equal(calls, 0);
  assert.ok(Math.abs(result.spent - 0.06525) < 1e-12);
  assert.equal(readRows(args.out)[2].costEstimated, true);
});

test('재시도는 새 작업 뒤에 보내며 재개해도 최대 attempt 2다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  const fetchImpl = async () => ++calls === 1
    ? { status: 429, json: async () => ({ error: { message: 'rate limit' } }) } : response();
  await runTasks({ ...args, tasks: twoTasks(), maxCalls: 1, fetchImpl });
  assert.equal(readRows(args.out)[0].retryable, true);
  await runTasks({ ...args, tasks: twoTasks(), fetchImpl });
  const rows = readRows(args.out);
  assert.equal(rows.filter((r) => r.taskKey === 'G9|mini|1').at(-1).attempt, 2);
  const next = fixture(t);
  calls = 0;
  await runTasks({ ...next, tasks: twoTasks(), fetchImpl });
  assert.deepEqual(readRows(next.out).map((r) => [r.rep, r.attempt]), [[1, 1], [2, 1], [1, 2]]);
});

test('200 provider_error와 abort를 구분하고 긴 오류를 300자로 자른다', async (t) => {
  const args = fixture(t);
  let calls = 0;
  await runTasks({ ...args, tasks: twoTasks(), fetchImpl: async () => {
    if (++calls === 1) return response(null, { error: { code: 400, message: 'x'.repeat(400) } });
    const error = new Error('deadline'); error.name = 'TimeoutError'; throw error;
  } });
  const rows = readRows(args.out);
  assert.equal(rows[0].error.kind, 'provider_error');
  assert.equal(rows[0].error.message.length, 300);
  assert.equal(rows[0].retryable, false);
  assert.equal(rows[1].error.kind, 'timeout');
  assert.equal(rows[1].retryable, false);
  // 끊긴 호출도 청구될 수 있다 — 예약액으로 잡아 예산에 넣는다
  assert.equal(rows[1].usage.cost, MODELS.mini.projectCallUsd);
  assert.equal(rows[1].costEstimated, true);
});

test('이미 dataUrl이 있어도 sha256 검증을 우회하지 못한다', async (t) => {
  const args = fixture(t);
  args.cases[0].dataUrl = 'data:image/jpeg;base64,eA==';
  args.cases[0].sha256 = 'bad';
  await assert.rejects(runTasks({ ...args, tasks: twoTasks(), fetchImpl: async () => response() }), /sha256/);
});

test('실측 진입점의 credits 조회도 가짜 fetch로만 확인한다', async (t) => {
  const args = fixture(t);
  const caseFile = path.join(args.out, 'cases.json');
  fs.writeFileSync(caseFile, JSON.stringify({ cases: args.cases }));
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = key;
  const urls = [];
  global.fetch = async (url, opts) => {
    urls.push(url);
    assert.equal(opts.headers.Authorization, `Bearer ${key}`);
    if (url.endsWith('/credits')) return { ok: true, json: async () => ({ data: {
      total_credits: 1, total_usage: 0.5, unexpected: key,
    } }) };
    return response();
  };
  try {
    const { main } = require('../run.cjs');
    const result = await main(['--cases', caseFile, '--out', args.out, '--models', 'mini', '--max-calls', '1', '--seed', '123']);
    assert.equal(result.calls, 1);
    assert.equal(result.limit, 0.25);
    assert.equal(urls[0], 'https://openrouter.ai/api/v1/credits');
    assert.equal(urls.length, 2);
    const plan = fs.readdirSync(args.out).find((f) => f.startsWith('plan-'));
    const text = fs.readFileSync(path.join(args.out, plan), 'utf8');
    assert.equal(JSON.parse(text).remaining, 0.5);
    assert.equal(text.includes(key), false);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});
