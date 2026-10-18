// 운영 후처리를 거친 첫 후보로 채점하고 모델별 표·블라인드 채점지를 만든다.
// 사용: node scripts/measure-model-compare/score.cjs --cases cases.json --out 결과폴더 --blind
// 사람이 매긴 grades는 taskKey 또는 blind-key.json의 label로 연결한다.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { loadProd } = require('./load-prod.cjs');
const { loadCases, readRows, finalRows, withCost, median, parseArgs } = require('./run.cjs');
const Ajv = require(path.resolve(__dirname, '../../node_modules/ajv'));

const norm = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '').replace(/[−–—‐‑]/g, '-').replace(/[·∙×]/g, '*').replace(/⁄/g, '/').replace(/[_^{}]/g, '');
const latexPattern = /\\(int|frac|sqrt|left|right|cdot|times|\(|\[)/;
const retryFields = ['retrySetup', 'retryPrompt', 'retryOptions', 'retryAnswerIndex'];

// 출처: functions/src/analyze-photo.ts:63-73, VisionRawResultSchema. lineChecks 검사 없음도 그대로.
function validRaw(raw) {
  const unit = (value) => typeof value === 'number' && !Number.isNaN(value) && value >= 0 && value <= 1;
  return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw) &&
    typeof raw.hasSolvingWork === 'boolean' && (raw.userAnswer === null || typeof raw.userAnswer === 'string') &&
    typeof raw.transcription === 'string' && typeof raw.predictedMethodId === 'string' && unit(raw.confidence) &&
    Array.isArray(raw.candidateMethodIds) && raw.candidateMethodIds.length >= 1 && raw.candidateMethodIds.length <= 4 &&
    raw.candidateMethodIds.every((id) => typeof id === 'string') && typeof raw.reason === 'string' &&
    Array.isArray(raw.errorCandidates) && raw.errorCandidates.length <= 2 && unit(raw.errorConfidence));
}

function indexedGrades(grades, blindKey) {
  const result = new Map();
  if (!grades) return result;
  for (const [id, grade] of Object.entries(grades)) {
    const taskKey = blindKey?.[id]?.taskKey || id;
    if (!taskKey.includes('|')) throw new Error(`grades label에 대응하는 blind-key가 없습니다: ${id}`);
    if (!grade || typeof grade.line !== 'string' || !['', 'ok', 'vague', 'wrong', 'na'].includes(grade.reason)) {
      throw new Error(`grades 값 오류: ${id}`);
    }
    if (result.has(taskKey)) throw new Error(`중복 grades: ${taskKey}`);
    result.set(taskKey, grade);
  }
  return result;
}

function scoreRows({ cases, prod, rows, grades, blindKey }) {
  const byCase = new Map(cases.map((c) => [c.id, c]));
  const byGrade = indexedGrades(grades, blindKey);
  const validate = new Ajv({ allErrors: true }).compile(prod.schema);
  return finalRows(rows).map(withCost).map((row) => {
    const item = byCase.get(row.caseId);
    if (!item) throw new Error(`cases에 없는 실행 행: ${row.caseId}`);
    const scored = { ...row, callFailed: Boolean(row.error), timedOut: row.error?.kind === 'timeout',
      parse_failed: false, fenced: false, zod_failed: false, card_dropped: false, retry_dropped: false,
      latex: false, options_in_prompt: false, schemaErrors: [], router: null, line: 'blank',
      correct: false, loose: false, fp: false };
    if (!scored.callFailed) {
      let raw;
      try { raw = JSON.parse(row.content); }
      catch {
        scored.parse_failed = true;
        if (typeof row.content === 'string') {
          const match = row.content.trim().match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
          if (match) {
            try { JSON.parse(match[1]); scored.fenced = true; } catch { /* 운영처럼 파싱 실패로 둔다 */ }
          }
        }
      }
      if (!scored.parse_failed) {
        validate(raw);
        scored.schemaErrors = validate.errors ? JSON.parse(JSON.stringify(validate.errors)) : [];
        if (!validRaw(raw)) scored.zod_failed = true;
        else {
          const router = prod.buildPhotoRouterResult(raw);
          scored.router = router;
          scored.card_dropped = raw.hasSolvingWork && raw.errorCandidates.length > router.errorCandidates.length;
          // 먼저 탈락한 후보가 있어도 raw·정화 후보의 위치를 혼동하지 않는다.
          scored.retry_dropped = raw.errorCandidates.some((candidate) => {
            const clean = prod.buildPhotoRouterResult({ ...raw, errorCandidates: [candidate] }).errorCandidates[0];
            return Boolean(clean && retryFields.some((field) => candidate[field] != null) && !Object.hasOwn(clean, 'retryPrompt'));
          });
          const first = router.errorCandidates[0];
          if (first) {
            const texts = [first.checkSetup, first.checkPrompt, ...(first.checkOptions || []), first.retrySetup,
              first.retryPrompt, ...(first.retryOptions || []), first.concept?.rule, first.concept?.violation];
            scored.latex = texts.some((value) => typeof value === 'string' && latexPattern.test(value));
            scored.options_in_prompt = [first.checkPrompt, first.retryPrompt].some((value) => /[①②③]/.test(value || ''));
            const hits = (item.lines || []).filter((line) => new RegExp(line.pattern, 'i').test(norm(first.quote)));
            scored.line = hits.length === 1 ? hits[0].id : '?';
          }
        }
      }
    }
    scored.formatBroken = ['parse_failed', 'zod_failed', 'card_dropped', 'retry_dropped', 'latex', 'options_in_prompt']
      .some((flag) => scored[flag]);
    const grade = byGrade.get(row.taskKey);
    if (grade) scored.line = grade.line;
    scored.gradeReason = grade?.reason ?? null;
    const usable = !scored.callFailed && !scored.parse_failed && !scored.zod_failed;
    const hasFirst = Boolean(scored.router?.errorCandidates[0]);
    scored.correct = usable && (item.kind === 'control' ? !hasFirst : scored.line === item.hitLine);
    scored.loose = usable && item.kind === 'error' && !scored.correct && (item.looseLines || []).includes(scored.line);
    scored.fp = usable && item.kind === 'control' && hasFirst;
    return scored;
  });
}

function distribution(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] || 0) + 1;
  return result;
}
function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
}
function timeStats(rows) {
  // 응답이 온 행 + 시간 초과(학생은 그만큼 기다렸다). 빨리 끝난 HTTP 오류만 뺀다.
  const values = rows.filter((r) => !r.error || r.error.kind === 'timeout').map((r) => r.ms).filter(Number.isFinite);
  return { median: median(values), p90: percentile(values, 0.9), max: values.length ? Math.max(...values) : null };
}
function summarize(rows, modelKey, caseId) {
  const costs = rows.map((r) => r.usage.cost || 0);
  const sum = costs.reduce((a, b) => a + b, 0);
  return {
    modelKey, caseId, n: rows.length, correct: rows.filter((r) => r.correct).length,
    loose: rows.filter((r) => r.loose).length, blank: rows.filter((r) => r.line === 'blank').length,
    unknown: rows.filter((r) => r.line === '?').length, lines: distribution(rows.map((r) => r.line)),
    fp: rows.filter((r) => r.fp).length, formatBroken: rows.filter((r) => r.formatBroken).length,
    callFailed: rows.filter((r) => r.callFailed).length, timedOut: rows.filter((r) => r.timedOut).length,
    time: timeStats(rows), cost: { sum, average: rows.length ? sum / rows.length : null },
    tokens: Object.fromEntries(['prompt_tokens', 'completion_tokens', 'reasoning_tokens'].map((field) =>
      [field, median(rows.map((r) => r.usage[field]))])),
    providers: distribution(rows.map((r) => typeof r.provider === 'string' ? r.provider : r.provider == null ? '(없음)' : JSON.stringify(r.provider))),
  };
}

function makeReport({ cases, prod, rows, baseline = 'mini', stage = 'screen', timeRule = 'record', grades, blindKey }) {
  if (!['screen', 'final'].includes(stage) || !['record', 'judge'].includes(timeRule)) throw new Error('stage/time-rule 값 오류');
  const scored = scoreRows({ cases, prod, rows, grades, blindKey });
  // 최종에서는 형식과 사람이 매긴 이유까지 맞아야 적중이다. 선별 점수는 줄 적중을 보존한다.
  for (const row of scored) {
    row.lineCorrect = row.correct;
    // 이유는 틀린 사진에만 있다 — 대조 사진(후보 없음이 맞음)은 reason na라도 맞음 그대로.
    const isError = cases.find((c) => c.id === row.caseId).kind === 'error';
    if (stage === 'final' && (row.formatBroken || grades && isError && row.gradeReason !== 'ok')) row.correct = false;
  }
  const models = [...new Set(scored.map((r) => r.modelKey))];
  const groups = models.flatMap((modelKey) => cases.map((c) => summarize(
    scored.filter((r) => r.modelKey === modelKey && r.caseId === c.id), modelKey, c.id)));
  const decisions = {};
  for (const modelKey of models.filter((key) => key !== baseline)) {
    const own = scored.filter((r) => r.modelKey === modelKey);
    const regressions = [];
    for (const item of cases) {
      const b = groups.find((g) => g.modelKey === baseline && g.caseId === item.id);
      const m = groups.find((g) => g.modelKey === modelKey && g.caseId === item.id);
      if (b?.n && m?.n) {
        const drop = (b.correct / b.n - m.correct / m.n) * Math.min(b.n, m.n);
        if (drop >= 2 - 1e-12) regressions.push({ caseId: item.id, drop, baseline: `${b.correct}/${b.n}`, model: `${m.correct}/${m.n}` });
      }
    }
    const time = timeStats(own);
    const reasons = [];
    const timeNote = timeRule === 'record' ? `시간 기록만: 중앙 ${seconds(time.median)}, 90% ${seconds(time.p90)}` : '';
    const checks = [];
    if (stage === 'screen') {
      if (regressions.length) reasons.push(...regressions.map((r) => `${r.caseId} 기준보다 2 이상 낮음 (${r.baseline} → ${r.model})`));
      if (own.some((r) => r.formatBroken)) reasons.push('formatBroken 행 있음');
      if (timeRule === 'judge' && time.median > 80000) reasons.push('시간 중앙 > 80초');
    } else {
      const controlRows = own.filter((r) => cases.find((c) => c.id === r.caseId).kind === 'control');
      const y06 = groups.find((g) => g.modelKey === modelKey && g.caseId === 'Y06');
      const yRate = y06?.n ? y06.correct / y06.n : null;
      checks.push({ name: '대조 오탐 합 0', pass: controlRows.every((r) => !r.fp), value: controlRows.filter((r) => r.fp).length });
      checks.push({ name: '기준보다 2 이상 낮은 사례 0', pass: regressions.length === 0, value: regressions });
      checks.push({ name: 'Y06 맞음 비율 ≥ 0.6', pass: yRate !== null && yRate >= 0.6, value: yRate });
      checks.push({ name: '시간 중앙 ≤ 40초 · 90% ≤ 80초',
        pass: timeRule === 'record' ? null : time.median !== null && time.p90 !== null && time.median <= 40000 && time.p90 <= 80000,
        value: time, note: timeNote });
      checks.push({ name: '형식·이유를 반영해 적중 다시 셈', pass: true,
        value: { gradesApplied: Boolean(grades), correct: own.filter((r) => r.correct).length,
          disallowed: own.filter((r) => r.lineCorrect && !r.correct).length } });
      reasons.push(...checks.filter((check) => check.pass === false).map((check) => check.name));
    }
    decisions[modelKey] = { pass: reasons.length === 0, reasons, regressions, time, timeNote, checks };
  }
  return { stage, timeRule, baseline, promptSha256: prod.promptSha256, gitHead: prod.gitHead,
    functionsSrcDirty: prod.functionsSrcDirty, groups, decisions, rows: scored };
}

function writeBlind({ rows, cases, out }) {
  fs.mkdirSync(out, { recursive: true });
  const used = new Set();
  const labeled = rows.map((row) => {
    let label;
    do { label = 'R' + randomBytes(2).toString('hex'); } while (used.has(label));
    used.add(label);
    return { label, row };
  }).sort((a, b) => a.row.caseId.localeCompare(b.row.caseId) || a.label.localeCompare(b.label));
  const key = {}, template = {}, lines = ['# 사진 짚기 블라인드 채점', '', 'reason: ok / vague / wrong / na', ''];
  const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/\r?\n/g, '<br>');
  for (const { label, row } of labeled) {
    key[label] = { taskKey: row.taskKey, modelKey: row.modelKey };
    template[label] = { line: row.line, reason: '' };
    const first = row.router?.errorCandidates[0];
    const item = cases.find((c) => c.id === row.caseId);
    lines.push(`## ${label} · ${escape(row.caseId)}`, '', '| 항목 | 내용 |', '| --- | --- |',
      `| reasonKey | ${escape(item.reasonKey)} |`, `| 자동 줄 분류 | ${escape(row.line)} |`);
    const fields = ['quote', 'why', 'mistakeType', 'fix', 'checkSetup', 'checkPrompt', 'checkOptions', 'checkAnswerIndex', ...retryFields];
    for (const field of fields) {
      const value = first?.[field];
      lines.push(`| ${field} | ${escape(Array.isArray(value) ? JSON.stringify(value) : value)} |`);
    }
    lines.push(`| concept.rule | ${escape(first?.concept?.rule)} |`, `| concept.violation | ${escape(first?.concept?.violation)} |`,
      `| 두 번째 후보 quote | ${escape(row.router?.errorCandidates[1]?.quote)} |`, '');
  }
  fs.writeFileSync(path.join(out, 'blind-sheet.md'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'blind-key.json'), JSON.stringify(key, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'grades-template.json'), JSON.stringify(template, null, 2) + '\n');
  return { key, template };
}

const seconds = (ms) => ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`;
function printReport(report) {
  const table = report.groups.map((g) => ({
    모델: g.modelKey, 사례: g.caseId, n: g.n, 맞음: g.correct, 느슨: g.loose, blank: g.blank, '?': g.unknown,
    줄분포: JSON.stringify(g.lines), formatBroken: g.formatBroken, callFailed: g.callFailed, fp: g.fp,
    '시간 중앙/90%/최대': [g.time.median, g.time.p90, g.time.max].map(seconds).join('/'),
    '비용 합/평균': `$${g.cost.sum.toFixed(4)}/${g.cost.average == null ? '-' : '$' + g.cost.average.toFixed(4)}`,
    '토큰 입력/출력/생각 중앙': Object.values(g.tokens).map((v) => v ?? '-').join('/'),
    provider: JSON.stringify(g.providers),
  }));
  console.table(table);
  for (const [model, decision] of Object.entries(report.decisions)) {
    console.log(`${model}: ${decision.pass ? '통과' : '탈락 — ' + decision.reasons.join(' · ')}`);
    if (decision.timeNote) console.log(`  ${decision.timeNote}`);
    for (const check of decision.checks) console.log(`  ${check.pass === null ? '기록만' : check.pass ? '✅' : '❌'} ${check.name}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv, { values: ['cases', 'out', 'baseline', 'stage', 'time-rule', 'grades'], flags: ['blind'] });
  if (!options.cases || !options.out) throw new Error('--cases와 --out이 필요합니다');
  const out = path.resolve(options.out);
  const cases = loadCases(path.resolve(options.cases));
  const prod = loadProd({ repoRoot: path.resolve(__dirname, '../..') });
  const rows = readRows(out);
  if (!finalRows(rows).length) throw new Error('채점할 최종 행이 없습니다');
  const grades = options.grades ? JSON.parse(fs.readFileSync(options.grades, 'utf8')) : undefined;
  const keyFile = path.join(out, 'blind-key.json');
  const blindKey = grades && fs.existsSync(keyFile) ? JSON.parse(fs.readFileSync(keyFile, 'utf8')) : undefined;
  const report = makeReport({ cases, prod, rows, grades, blindKey,
    baseline: options.baseline || 'mini', stage: options.stage || 'screen', timeRule: options['time-rule'] || 'record' });
  // grades가 참조하는 기존 label을 덮어쓰지 않는다.
  if (options.blind) {
    if (grades && fs.existsSync(keyFile)) throw new Error('grades 적용 시 --blind를 빼세요: 기존 label을 보존합니다');
    writeBlind({ rows: report.rows, cases, out });
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `score-${report.stage}.json`), JSON.stringify(report, null, 2) + '\n');
  printReport(report);
  return report;
}

module.exports = { norm, validRaw, scoreRows, summarize, percentile, makeReport, writeBlind, printReport, main };
if (require.main === module) {
  try { main(); } catch (err) { console.error(err.message); process.exitCode = 1; }
}
