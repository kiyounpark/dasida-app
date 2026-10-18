// 같은 사진·운영 지시문으로 OpenRouter 모델을 비교한다. 예산 예약 후에만 전송한다.
// 사용: node scripts/measure-model-compare/run.cjs --cases cases.json --out 결과폴더 --plan
// --dry-run은 키·네트워크 없이 요청 저장. 실측은 해당 옵션을 빼고 실행한다.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { loadProd } = require('./load-prod.cjs');
const verifiedPhoto = Symbol('verifiedPhoto');

// Sonnet은 effort: medium을 주면 생각 토큰 0이었다(10.18 첫 6회, 9호·08 둘 다). OpenRouter 문서의 medium 환산
// (max_tokens × 0.5)을 숫자로 직접 준다 — 9호 진단 1회에서 생각 1,287토큰 · strict 스키마 그대로(diag.jsonl).
const MODELS = {
  mini:   { id: 'openai/gpt-5.4-mini',          price: { in: 0.75, out: 4.5 },  projectCallUsd: 0.15, reasoning: { effort: 'medium' },
    provider: { only: ['openai'],        allow_fallbacks: false, require_parameters: true, data_collection: 'deny' } },
  sonnet: { id: 'anthropic/claude-sonnet-5.5',  price: { in: 2,    out: 10 },   projectCallUsd: 0.35, reasoning: { max_tokens: 16000 },
    provider: { only: ['google-vertex'], allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true } },
  gemini: { id: 'google/gemini-3.8-flash',      price: { in: 0.75, out: 3.75 }, projectCallUsd: 0.15, reasoning: { effort: 'medium' },
    provider: { only: ['google-vertex'], allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true } },
  // 10.18 저녁 기윤 「중국 모델도 재 보고 싶다」 — 싼 셋 · 학생 사진은 미국 ZDR 제공자로만(중국 회사 자체 서버는 ZDR ✗ · chinese-models.md)
  // GLM도 effort: medium이면 생각이 32000토큰 상한까지 가서 답 0자(10.18 08 1회 · excluded-glm-effort.jsonl) → Sonnet처럼 예산을 숫자로
  glm:      { id: 'z-ai/glm-5.3-flash',               price: { in: 0.15,  out: 0.5 },   projectCallUsd: 0.03, reasoning: { max_tokens: 16000 },
    provider: { only: ['together'],      allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true } },
  deepseek: { id: 'deepseek/deepseek-v4.1-flash-1017', price: { in: 0.098, out: 0.294 }, projectCallUsd: 0.03, reasoning: { effort: 'medium' },
    provider: { only: ['deepinfra'],     allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true } },
  ling:     { id: 'inclusionai/ling-3.0-flash-vl',    price: { in: 0.06,  out: 0.18 },  projectCallUsd: 0.03, reasoning: { effort: 'medium' },
    provider: { only: ['deepinfra'],     allow_fallbacks: false, require_parameters: true, data_collection: 'deny', zdr: true } },
};

function buildBody(modelKey, prod, dataUrl) {
  if (!Object.hasOwn(MODELS, modelKey)) throw new Error(`알 수 없는 모델: ${modelKey}`);
  return {
    model: MODELS[modelKey].id,
    messages: [
      { role: 'system', content: prod.prompt },
      { role: 'user', content: [
        { type: 'text', text: prod.methodContext },
        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
      ] },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'photo_analysis_result', strict: true, schema: prod.schema } },
    reasoning: MODELS[modelKey].reasoning,
    max_tokens: 32000,
    usage: { include: true },
    provider: MODELS[modelKey].provider,
  };
}

function shuffle(arr, seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function prepareCases(cases) {
  const ids = new Set();
  return cases.map((item) => {
    if (!/^[A-Za-z0-9_-]+$/.test(item.id) || ids.has(item.id)) throw new Error(`사례 id 오류: ${item.id}`);
    ids.add(item.id);
    const bytes = fs.readFileSync(item.path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== item.sha256) throw new Error(`사진 sha256 불일치: ${item.id}`);
    const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[path.extname(item.path).toLowerCase()];
    if (!mime) throw new Error(`지원하지 않는 사진 확장자: ${item.id}`);
    return { ...item, sha256, mime, bytes: bytes.length, dataUrl: `data:${mime};base64,${bytes.toString('base64')}`, [verifiedPhoto]: true };
  });
}

function loadCases(filename) {
  const input = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const cases = Array.isArray(input) ? input : input.cases;
  if (!Array.isArray(cases) || !cases.length) throw new Error('cases는 비어 있지 않은 배열이어야 합니다');
  return cases.map((item) => ({ ...item, path: path.resolve(path.dirname(filename), item.path) }));
}

function makeTasks(cases, models, reps) {
  return cases.flatMap((item) => models.flatMap((modelKey) => Array.from({ length: reps }, (_, i) => ({
    taskKey: `${item.id}|${modelKey}|${i + 1}`, caseId: item.id, modelKey, rep: i + 1,
  }))));
}

const nonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function withCost(row) {
  const usage = { ...row.usage };
  let costEstimated = row.costEstimated === true;
  if (!nonnegative(usage.cost)) {
    const price = MODELS[row.modelKey]?.price;
    const hasTokens = nonnegative(usage.prompt_tokens) || nonnegative(usage.completion_tokens);
    if (price && hasTokens) {
      usage.cost = ((nonnegative(usage.prompt_tokens) ? usage.prompt_tokens : 0) * price.in +
        (nonnegative(usage.completion_tokens) ? usage.completion_tokens : 0) * price.out) / 1e6;
      costEstimated = true;
    } else if (price && row.error?.kind === 'timeout') {
      // 끊어도 OpenRouter가 생성을 끝까지 청구할 수 있다 — 모르면 예약액으로 잡아 예산을 보수적으로 센다.
      usage.cost = MODELS[row.modelKey].projectCallUsd;
      costEstimated = true;
    } else usage.cost = null;
  }
  return { ...row, usage, costEstimated };
}

function readRows(out) {
  const file = path.join(out, 'runs.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line, i) => {
    try { return withCost(JSON.parse(line)); }
    catch { throw new Error(`runs.jsonl ${i + 1}행 JSON 손상: 비용을 확인한 뒤 다시 실행하세요`); }
  });
}

function finalRows(rows) {
  const final = new Map();
  for (const row of rows) if (!row.retryable || row.attempt >= 2) final.set(row.taskKey, row);
  return [...final.values()];
}

function projected(modelKey, rows) {
  const costs = rows.filter((r) => r.modelKey === modelKey && nonnegative(r.usage?.cost)).map((r) => r.usage.cost);
  return costs.length ? Math.max(...costs) : MODELS[modelKey].projectCallUsd;
}

function pendingTasks(tasks, rows) {
  const done = new Set(finalRows(rows).map((r) => r.taskKey));
  const latest = new Map(rows.map((r) => [r.taskKey, r]));
  const seen = new Set();
  return tasks.filter((task) => {
    if (seen.has(task.taskKey)) throw new Error(`중복 작업: ${task.taskKey}`);
    seen.add(task.taskKey);
    return !done.has(task.taskKey);
  }).map((task) => ({ ...task, attempt: latest.has(task.taskKey) ? 2 : 1 }));
}

const redact = (value, key) => key ? String(value).split(key).join('[REDACTED]') : String(value);
const authHeaders = (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'dasida-measure' });

async function callTask({ task, prod, photo, fetchImpl, key, seq, inflightAtStart }) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let httpStatus = null;
  let body = {};
  let error = null;
  let retryStatus = null;
  const signal = AbortSignal.timeout(170_000);
  try {
    const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: authHeaders(key), signal,
      body: JSON.stringify(buildBody(task.modelKey, prod, photo.dataUrl)),
    });
    httpStatus = response.status;
    // 본문 오류도 상태·비용을 잃지 않도록 가능한 JSON을 먼저 읽는다.
    let decodeError;
    try { body = await response.json(); }
    catch (err) { if (signal.aborted || /^(AbortError|TimeoutError)$/.test(err.name)) throw err; decodeError = err; }
    if (!body || typeof body !== 'object') body = {};
    if (httpStatus < 200 || httpStatus >= 300) {
      retryStatus = httpStatus;
      error = { kind: 'http', status: httpStatus,
        message: body.error?.message || body.error || `HTTP ${httpStatus}` };
    } else if (body.error) {
      retryStatus = Number(body.error.code);
      error = { kind: 'provider_error', status: httpStatus, message: body.error.message || body.error };
    } else if (decodeError) {
      error = { kind: 'network', status: httpStatus, message: '응답 본문 JSON 해독 실패' };
    }
  } catch (err) {
    const timeout = signal.aborted || /^(AbortError|TimeoutError)$/.test(err.name);
    error = { kind: timeout ? 'timeout' : 'network', status: httpStatus, message: err.message || String(err) };
  }
  const ms = Math.round(performance.now() - start);
  const usage = body.usage || {};
  const choice = body.choices?.[0];
  const row = withCost({
    ...task, modelId: MODELS[task.modelKey].id, seq, startedAt, ms, inflightAtStart, httpStatus,
    provider: body.provider ?? null, responseModel: body.model ?? null, generationId: body.id ?? null,
    finishReason: choice?.finish_reason ?? null, nativeFinishReason: choice?.native_finish_reason ?? null,
    usage: {
      prompt_tokens: usage.prompt_tokens ?? null, completion_tokens: usage.completion_tokens ?? null,
      reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? null,
      cached_tokens: usage.prompt_tokens_details?.cached_tokens ?? null, cost: usage.cost ?? null,
    },
    content: typeof choice?.message?.content === 'string' ? choice.message.content : '',
    error: error ? { ...error, message: redact(typeof error.message === 'string' ? error.message : JSON.stringify(error.message), key).slice(0, 300) } : null,
    overDeadline: ms > 165000,
  });
  const billed = [usage.prompt_tokens, usage.completion_tokens, usage.total_tokens,
    usage.completion_tokens_details?.reasoning_tokens, usage.prompt_tokens_details?.cached_tokens, usage.cost]
    .some((value) => typeof value === 'number' && value > 0);
  // 402: 잔액이 줄면 OpenRouter가 진행 중 요청의 최대 비용까지 쳐서 거절한다(10.18 대조 10회 · 청구 0) — 큐 뒤로 한 번 더.
  row.retryable = Boolean(error && !billed && (error.kind === 'network' || retryStatus === 402 ||
    retryStatus === 429 || retryStatus === 408 || (retryStatus >= 500 && retryStatus <= 599)));
  return JSON.parse(redact(JSON.stringify(row), key));
}

async function runTasks({ cases, prod, tasks, out, budgetUsd = 4.5, maxCalls = Infinity,
  concurrency = 3, fetchImpl = globalThis.fetch, key, remaining = Infinity, floorUsd = 0.25 }) {
  if (!nonnegative(budgetUsd) || !(Number.isFinite(remaining) || remaining === Infinity) ||
      !Number.isInteger(concurrency) || concurrency < 1 || !(maxCalls === Infinity || Number.isInteger(maxCalls) && maxCalls >= 0)) {
    throw new Error('예산·credits·동시성·호출 상한 값 오류');
  }
  // 사진은 전송 전에 한 번 고정한다. CLI에서 준비한 경우 같은 바이트를 재사용한다.
  const photos = cases.every((c) => c[verifiedPhoto]) ? cases : prepareCases(cases);
  const byId = new Map(photos.map((c) => [c.id, c]));
  const rows = readRows(out);
  const queue = pendingTasks(tasks, rows);
  for (const task of queue) {
    if (!Object.hasOwn(MODELS, task.modelKey) || !byId.has(task.caseId)) throw new Error(`작업 대상 오류: ${task.taskKey}`);
  }
  fs.mkdirSync(out, { recursive: true });
  const spent = rows.reduce((sum, r) => sum + (r.usage.cost || 0), 0);
  const limit = Math.min(budgetUsd - spent, remaining - floorUsd);
  let calls = 0, spentThisRun = 0, inflight = 0, reserved = 0;
  let seq = Math.max(0, ...rows.map((r) => r.seq || 0));
  let stopReason = null;
  const stop = (reason) => { if (!stopReason) { stopReason = reason; console.log(`중단: ${reason}`); } };
  async function worker() {
    while (queue.length && !stopReason) {
      if (calls >= maxCalls) { stop('max-calls 상한'); break; }
      const task = queue[0];
      const reserve = projected(task.modelKey, rows);
      if (spentThisRun + reserved + reserve > limit + 1e-12) {
        stop(`예산 가드: 사용 $${spentThisRun.toFixed(4)} + 진행 예약 $${reserved.toFixed(4)} + 다음 $${reserve.toFixed(4)} > limit $${limit.toFixed(4)}`);
        break;
      }
      queue.shift();
      // 이 구간은 await 없이 예약한다. 다른 worker가 같은 예산을 쓰지 못한다.
      calls++; inflight++; reserved += reserve; seq++;
      const row = await callTask({ task, prod, photo: byId.get(task.caseId), fetchImpl, key, seq, inflightAtStart: inflight });
      fs.appendFileSync(path.join(out, 'runs.jsonl'), JSON.stringify(row) + '\n');
      rows.push(row);
      spentThisRun += row.usage.cost || 0;
      inflight--; reserved -= reserve;
      console.log(`${row.seq} ${row.caseId} ${row.modelKey}#${row.rep} ${(row.ms / 1000).toFixed(1)}s $${(row.usage.cost || 0).toFixed(4)} ${typeof row.provider === 'string' ? row.provider : '-'} in=${row.usage.prompt_tokens ?? '-'} out=${row.usage.completion_tokens ?? '-'}`);
      if (row.retryable && row.attempt < 2) queue.push({ ...task, attempt: 2 });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const summary = { calls, spentThisRun, spent: spent + spentThisRun, limit,
    remainingLimit: limit - spentThisRun, stopReason, pending: queue.length, models: {} };
  for (const modelKey of Object.keys(MODELS)) {
    const group = rows.filter((r) => r.modelKey === modelKey);
    if (!group.length) continue;
    const costs = group.map((r) => r.usage.cost || 0);
    summary.models[modelKey] = { n: group.length, averageCost: costs.reduce((a, b) => a + b, 0) / group.length,
      maxCost: Math.max(...costs), medianMs: median(group.filter((r) => !r.error || r.error.kind === 'timeout').map((r) => r.ms)) };
  }
  console.log(`요약: 이번 호출 ${calls} · 이번 $${spentThisRun.toFixed(4)} · 누적 $${summary.spent.toFixed(4)} · 남은 limit $${summary.remainingLimit.toFixed(4)}`);
  for (const [model, stats] of Object.entries(summary.models)) {
    console.log(`${model}: 회당 평균 $${stats.averageCost.toFixed(4)} / 최대 $${stats.maxCost.toFixed(4)} · 시간 중앙 ${stats.medianMs == null ? '-' : (stats.medianMs / 1000).toFixed(1) + 's'} (누적 ${stats.n}회)`);
  }
  return summary;
}

function median(values) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : null;
}

function parseArgs(argv, { values, flags = [] }) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (argv[i] === `--${name}` && flags.includes(name)) options[name] = true;
    else if (argv[i] === `--${name}` && values.includes(name) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[name] = argv[++i];
    else throw new Error(`잘못된 옵션: ${argv[i]}`);
  }
  return options;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv, { values: ['cases', 'out', 'models', 'case-ids', 'reps', 'concurrency', 'seed', 'budget-usd', 'max-calls', 'floor-usd'], flags: ['dry-run', 'plan'] });
  if (!options.cases || !options.out) throw new Error('--cases와 --out이 필요합니다');
  if (options.plan && options['dry-run']) throw new Error('--plan과 --dry-run은 각각 실행하세요');
  const models = (options.models || 'mini,sonnet,gemini').split(',');
  if (new Set(models).size !== models.length || models.some((k) => !Object.hasOwn(MODELS, k))) throw new Error('models 값 오류');
  const reps = Number(options.reps ?? 3), concurrency = Number(options.concurrency ?? 3);
  const seed = Number(options.seed ?? Date.now()), budgetUsd = Number(options['budget-usd'] ?? 4.5);
  // 잔액 바닥에서 몇 달러를 남기고 멈추나(기본 0.25 · 10.18 저녁 기윤 A안에서 0.05로 낮춤)
  const floorUsd = Number(options['floor-usd'] ?? 0.25);
  const maxCalls = Number(options['max-calls'] ?? Infinity);
  if (!Number.isSafeInteger(seed) || !Number.isInteger(reps) || reps < 1 || !Number.isInteger(concurrency) || concurrency < 1 ||
      !nonnegative(budgetUsd) || !nonnegative(floorUsd) || !(maxCalls === Infinity || Number.isInteger(maxCalls) && maxCalls >= 0)) throw new Error('숫자 옵션 범위 오류');
  const allCases = prepareCases(loadCases(path.resolve(options.cases)));
  const ids = options['case-ids']?.split(',');
  if (ids?.some((id) => !allCases.some((c) => c.id === id))) throw new Error('알 수 없는 case-ids');
  const cases = ids ? allCases.filter((c) => ids.includes(c.id)) : allCases;
  const prod = loadProd({ repoRoot: path.resolve(__dirname, '../..') });
  const out = path.resolve(options.out), rows = readRows(out);
  const tasks = shuffle(makeTasks(cases, models, reps), seed);
  const pending = pendingTasks(tasks, rows);
  const spent = rows.reduce((sum, r) => sum + (r.usage.cost || 0), 0);
  const expectedUsd = pending.reduce((sum, t) => sum + projected(t.modelKey, rows), 0);
  const plan = { createdAt: new Date().toISOString(), seed, promptSha256: prod.promptSha256,
    gitHead: prod.gitHead, functionsSrcDirty: prod.functionsSrcDirty,
    photos: allCases.map(({ id, path: photoPath, sha256, mime, bytes }) => ({ id, path: photoPath, sha256, mime, bytes })),
    tasks, pendingTasks: pending, expectedUsd, spent, budgetUsd, concurrency, maxCalls: Number.isFinite(maxCalls) ? maxCalls : null,
    mode: options.plan ? 'plan' : options['dry-run'] ? 'dry-run' : 'live' };
  let key, remaining = Infinity;
  if (!options.plan && !options['dry-run']) {
    key = (process.env.OPENROUTER_API_KEY || fs.readFileSync(path.join(os.homedir(), '.config/dasida/openrouter-key'), 'utf8')).trim();
    if (!key) throw new Error('OpenRouter 키가 비어 있습니다');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/credits', { headers: authHeaders(key), signal: AbortSignal.timeout(170_000) });
      if (!response.ok) throw new Error(`credits HTTP ${response.status}`);
      const credits = (await response.json()).data;
      if (!nonnegative(credits?.total_credits) || !nonnegative(credits?.total_usage)) throw new Error('credits 응답 숫자 누락');
      remaining = credits.total_credits - credits.total_usage;
      plan.credits = { total_credits: credits.total_credits, total_usage: credits.total_usage, remaining };
      console.log(`OpenRouter 잔액: $${remaining.toFixed(4)}`);
    } catch (err) { throw new Error(redact(err.message, key)); }
  }
  plan.remaining = Number.isFinite(remaining) ? remaining : null;
  plan.floorUsd = floorUsd;
  plan.limit = Math.min(budgetUsd - spent, remaining - floorUsd);
  fs.mkdirSync(out, { recursive: true });
  const planFile = path.join(out, `plan-${plan.createdAt.replace(/:/g, '-')}.json`);
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  console.log(`작업 ${tasks.length}개 · 새 작업 ${pending.length}개 · seed ${seed}`);
  console.log(`예상액 $${expectedUsd.toFixed(4)} · 누적 $${spent.toFixed(4)} · limit $${plan.limit.toFixed(4)}`);
  console.log(`사진 sha256 ${allCases.length}장 일치 · prompt ${prod.promptSha256}`);
  console.log(`git ${prod.gitHead} · functions/src dirty=${prod.functionsSrcDirty}`);
  console.log(`plan ${planFile}`);
  if (options.plan) {
    for (const [i, task] of pending.entries()) console.log(`${i + 1} ${task.taskKey} 예약 $${projected(task.modelKey, rows).toFixed(4)}`);
    return plan;
  }
  if (options['dry-run']) {
    const dryOut = path.join(out, 'dry-run');
    fs.mkdirSync(dryOut, { recursive: true });
    const photos = new Map(cases.map((c) => [c.id, c]));
    for (const task of pending) {
      const photo = photos.get(task.caseId);
      const placeholder = `<${photo.mime} ${photo.bytes} bytes sha256:${photo.sha256}>`;
      fs.writeFileSync(path.join(dryOut, `${task.taskKey.replace(/\|/g, '_')}.json`), JSON.stringify(buildBody(task.modelKey, prod, placeholder), null, 2) + '\n');
    }
    console.log(`dry-run 요청 ${pending.length}개 저장`);
    return plan;
  }
  return runTasks({ cases, prod, tasks, out, budgetUsd, maxCalls, concurrency, fetchImpl: globalThis.fetch, key, remaining, floorUsd });
}

module.exports = { MODELS, buildBody, shuffle, prepareCases, loadCases, makeTasks, withCost,
  readRows, finalRows, projected, pendingTasks, runTasks, median, parseArgs, main };
if (require.main === module) main().catch((err) => { console.error(err.message); process.exitCode = 1; });
