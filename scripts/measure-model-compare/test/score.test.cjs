// 운영 후처리 뒤 채점·탈락 기준·블라인드 누출을 확인한다.
// 사용: node --test 'scripts/measure-model-compare/test/*.test.cjs'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadProd } = require('../load-prod.cjs');
const { scoreRows, makeReport, writeBlind, norm } = require('../score.cjs');
const prod = loadProd({ repoRoot: path.resolve(__dirname, '../../..') });
const cases = [
  { id: 'G9', kind: 'error', hitLine: 'L6', looseLines: ['L7'], reasonKey: '상수항 부호',
    lines: [{ id: 'L6', pattern: '-2x-4=-4x\\+10|2x=6' }, { id: 'L7', pattern: '21' }] },
  { id: 'Y06', kind: 'error', hitLine: 'gprime', lines: [{ id: 'gprime', pattern: "g'=-2f" }] },
  { id: 'C08', kind: 'control', lines: [], reasonKey: '틀린 줄 없음' },
];
const candidate = (extra = {}) => ({ quote: '−2x−4 = −4x+10', why: '상수항의 부호를 확인해.',
  mistakeType: 'calc_slip', fix: '상수를 옮기면 → 부호를 표시하자', checkSetup: null,
  checkPrompt: '2x−4=10에서 상수항을 옮긴 식은?', checkOptions: ['2x=14', '2x=6', '2x=10'], checkAnswerIndex: 0,
  retrySetup: null, retryPrompt: null, retryOptions: null, retryAnswerIndex: null, concept: null, ...extra });
const raw = (errorCandidates = [candidate()]) => ({ hasSolvingWork: true, userAnswer: null,
  transcription: '풀이', lineChecks: [], predictedMethodId: 'linear_eq', confidence: 1,
  candidateMethodIds: ['linear_eq'], reason: '분류', errorCandidates, errorConfidence: 1 });
const row = (extra = {}) => ({ taskKey: 'G9|mini|1', caseId: 'G9', modelKey: 'mini', modelId: 'openai/gpt-5.4-mini',
  rep: 1, attempt: 1, retryable: false, error: null, content: JSON.stringify(raw()), httpStatus: 200,
  ms: 1000, usage: { cost: 0.03, prompt_tokens: 100, completion_tokens: 50, reasoning_tokens: 10 },
  provider: 'openai', ...extra });

test('유니코드 정규화 뒤 G9 L6 적중, 대조 후보는 fp', () => {
  assert.equal(norm(' −2x−4 = −4x+10 '), '-2x-4=-4x+10');
  const rows = scoreRows({ cases, prod, rows: [row(), row({ taskKey: 'C08|mini|1', caseId: 'C08' })] });
  assert.equal(rows[0].line, 'L6');
  assert.equal(rows[0].correct, true);
  assert.equal(rows[1].fp, true);
  assert.equal(rows[1].correct, false);
});

test('깨진 JSON·울타리·zod·보기 두 개는 각각 표시한다', () => {
  const inputs = ['{', '```json\n' + JSON.stringify(raw()) + '\n```',
    JSON.stringify({ ...raw(), confidence: 2 }), JSON.stringify(raw([candidate({ checkOptions: ['a', 'b'] })]))];
  const rows = scoreRows({ cases, prod, rows: inputs.map((content, i) => row({ content, taskKey: `G9|mini|${i}` })) });
  assert.equal(rows[0].parse_failed, true);
  assert.equal(rows[1].parse_failed, true);
  assert.equal(rows[1].fenced, true);
  assert.equal(rows[2].zod_failed, true);
  assert.equal(rows[3].card_dropped, true);
  assert.equal(rows[3].line, 'blank');
  assert.ok(rows.every((r) => r.formatBroken));
});

test('실패·timeout은 대조라도 맞음 0, timeout은 시간 분포에 넣고 빠른 HTTP 오류는 뺀다', () => {
  const report = makeReport({ cases, prod, rows: [
    row({ caseId: 'C08', taskKey: 'C08|mini|1', httpStatus: null, ms: 170100, error: { kind: 'timeout' }, content: '' }),
    row({ caseId: 'C08', taskKey: 'C08|mini|2', httpStatus: 400, ms: 300, error: { kind: 'http', status: 400 }, content: '' }),
  ] });
  assert.equal(report.rows[0].callFailed, true);
  assert.equal(report.rows[0].timedOut, true);
  assert.equal(report.rows[0].correct, false);
  const c08 = report.groups.find((g) => g.caseId === 'C08');
  assert.equal(c08.time.median, 170100);
});

test('retry 탈락·latex·질문 속 보기는 형식 깨짐, schema 오류는 참고만', () => {
  const rows = scoreRows({ cases, prod, rows: [
    row({ taskKey: 'G9|mini|1', content: JSON.stringify(raw([candidate({ retrySetup: '재료' })])) }),
    row({ taskKey: 'G9|mini|2', content: JSON.stringify(raw([candidate({ checkSetup: '\\frac{1}{2}' })])) }),
    row({ taskKey: 'G9|mini|3', content: JSON.stringify(raw([candidate({ checkPrompt: '① a ② b ③ c' })])) }),
    row({ taskKey: 'G9|mini|4', content: JSON.stringify({ ...raw(), lineChecks: undefined }) }),
  ] });
  assert.equal(rows[0].retry_dropped, true);
  assert.equal(rows[1].latex, true);
  assert.equal(rows[2].options_in_prompt, true);
  assert.ok(rows[3].schemaErrors.length > 0);
  assert.equal(rows[3].formatBroken, false);
});

function comparison(candidateHits, ms = 1000) {
  const rows = [];
  for (const modelKey of ['mini', 'sonnet']) {
    for (let rep = 1; rep <= 3; rep++) rows.push(row({ modelKey, rep, taskKey: `G9|${modelKey}|${rep}`, ms,
      content: JSON.stringify(raw(modelKey === 'mini' || rep <= candidateHits ? [candidate()] : [])) }));
  }
  return rows;
}

test('선별 3/3 대 1/3은 탈락, 같으면 통과', () => {
  assert.equal(makeReport({ cases, prod, rows: comparison(1) }).decisions.sonnet.pass, false);
  assert.equal(makeReport({ cases, prod, rows: comparison(3) }).decisions.sonnet.pass, true);
});

test('시간 record는 기록만, judge는 80초 중앙 초과 탈락', () => {
  const record = makeReport({ cases, prod, rows: comparison(3, 81000), timeRule: 'record' });
  assert.equal(record.decisions.sonnet.pass, true);
  assert.match(record.decisions.sonnet.timeNote, /기록만/);
  assert.equal(makeReport({ cases, prod, rows: comparison(3, 81000), timeRule: 'judge' }).decisions.sonnet.pass, false);
});

test('같은 taskKey는 마지막 최종 행만 채점한다', () => {
  const scored = scoreRows({ cases, prod, rows: [
    row({ attempt: 1, retryable: true, error: { kind: 'http' } }), row({ attempt: 2 }),
    row({ retryable: true, attempt: 1, content: '{' }),
  ] });
  assert.equal(scored.length, 1);
  assert.equal(scored[0].correct, true);
});

test('블라인드는 모델 메타정보 없이 정화 카드와 채점 키를 만든다', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'model-score-test-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const scored = scoreRows({ cases, prod, rows: comparison(3) });
  writeBlind({ rows: scored, cases, out });
  const sheet = fs.readFileSync(path.join(out, 'blind-sheet.md'), 'utf8');
  assert.doesNotMatch(sheet, /gpt-5\.4-mini|claude|gemini|openai|sonnet|provider|tokens|cost|\bms\b/i);
  const key = JSON.parse(fs.readFileSync(path.join(out, 'blind-key.json'), 'utf8'));
  const grades = JSON.parse(fs.readFileSync(path.join(out, 'grades-template.json'), 'utf8'));
  assert.equal(Object.keys(key).length, 6);
  assert.ok(Object.keys(key).every((label) => /^R[0-9a-f]{4}$/.test(label)));
  assert.equal(Object.values(grades)[0].reason, '');
  const [label] = Object.keys(key);
  const rescored = scoreRows({ cases, prod, rows: comparison(3), grades: { [label]: { line: '?', reason: 'wrong' } }, blindKey: key });
  assert.equal(rescored.find((r) => r.taskKey === key[label].taskKey).line, '?');
});

test('final은 Y06 60%, 대조 오탐, 이유, 형식, 40초/80초를 판정한다', () => {
  const inputs = [row({ caseId: 'Y06', taskKey: 'Y06|sonnet|1', modelKey: 'sonnet',
    content: JSON.stringify(raw([candidate({ quote: "g'=-2f" })])) }),
  row({ caseId: 'C08', taskKey: 'C08|sonnet|1', modelKey: 'sonnet', content: JSON.stringify(raw([])) })];
  const good = makeReport({ cases, prod, rows: inputs, stage: 'final', timeRule: 'judge' });
  assert.equal(good.decisions.sonnet.pass, true);
  const graded = makeReport({ cases, prod, rows: inputs, stage: 'final',
    grades: { 'Y06|sonnet|1': { line: 'gprime', reason: 'vague' } } });
  assert.equal(graded.decisions.sonnet.pass, false);
  // 대조 사진은 이유가 없다(na) — 후보 없음이면 최종에서도 맞음 그대로
  const okGrades = makeReport({ cases, prod, rows: inputs, stage: 'final',
    grades: { 'Y06|sonnet|1': { line: 'gprime', reason: 'ok' }, 'C08|sonnet|1': { line: 'blank', reason: 'na' } } });
  assert.equal(okGrades.rows.find((r) => r.caseId === 'C08').correct, true);
  const slow = makeReport({ cases, prod, rows: inputs.map((r) => ({ ...r, ms: 81000 })), stage: 'final', timeRule: 'judge' });
  assert.equal(slow.decisions.sonnet.pass, false);
});

test('zod의 9개 필드 검사를 전부 지키고 줄 매칭 0개·여러 개는 ?다', () => {
  const invalid = [
    { hasSolvingWork: 1 }, { userAnswer: undefined }, { transcription: null }, { predictedMethodId: 1 },
    { confidence: -0.1 }, { confidence: 1.1 }, { candidateMethodIds: [] }, { candidateMethodIds: ['a', 'b', 'c', 'd', 'e'] },
    { candidateMethodIds: [1] }, { reason: null }, { errorCandidates: [{}, {}, {}] }, { errorConfidence: -1 },
  ];
  for (const fields of invalid) {
    const [scored] = scoreRows({ cases, prod, rows: [row({ content: JSON.stringify({ ...raw(), ...fields }) })] });
    assert.equal(scored.zod_failed, true, JSON.stringify(fields));
  }
  for (const quote of ['무슨 식', '−2x−4=−4x+10, 21']) {
    const [scored] = scoreRows({ cases, prod, rows: [row({ content: JSON.stringify(raw([candidate({ quote })])) })] });
    assert.equal(scored.line, '?');
  }
});

test('탈락한 첫 후보와 남은 두 번째 후보의 retry를 혼동하지 않는다', () => {
  const [scored] = scoreRows({ cases, prod, rows: [row({ content: JSON.stringify(raw([
    candidate({ checkOptions: ['a', 'b'], retrySetup: '깨진 후보 재료' }),
    candidate({ retrySetup: null, retryPrompt: null, retryOptions: null, retryAnswerIndex: null }),
  ])) })] });
  assert.equal(scored.card_dropped, true);
  assert.equal(scored.retry_dropped, false);
  assert.equal(scored.correct, true);
});

test('다른 표본 수에서도 회귀 기준은 비율 차이 × 작은 n이다', () => {
  const inputs = comparison(1);
  inputs.push(row({ rep: 4, taskKey: 'G9|mini|4' }));
  const report = makeReport({ cases, prod, rows: inputs });
  assert.equal(report.decisions.sonnet.pass, false);
  assert.equal(report.decisions.sonnet.regressions[0].drop, 2);
  assert.equal(report.groups.find((g) => g.modelKey === 'sonnet' && g.caseId === 'G9').time.p90, 1000);
});

test('score CLI도 블라인드·grades·최종 결과 파일을 만든다', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'model-score-cli-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const caseFile = path.join(out, 'cases.json');
  fs.writeFileSync(caseFile, JSON.stringify({ cases: cases.map((c) => ({ ...c, path: 'unused.jpg' })) }));
  fs.writeFileSync(path.join(out, 'runs.jsonl'), comparison(3).map(JSON.stringify).join('\n') + '\n');
  const { spawnSync } = require('node:child_process');
  const cli = path.resolve(__dirname, '../score.cjs');
  const screen = spawnSync(process.execPath, [cli, '--cases', caseFile, '--out', out, '--blind'], { encoding: 'utf8' });
  assert.equal(screen.status, 0, screen.stderr);
  assert.match(screen.stdout, /sonnet: 통과/);
  const grades = JSON.parse(fs.readFileSync(path.join(out, 'grades-template.json'), 'utf8'));
  for (const grade of Object.values(grades)) grade.reason = 'ok';
  const gradeFile = path.join(out, 'grades.json');
  fs.writeFileSync(gradeFile, JSON.stringify(grades));
  const final = spawnSync(process.execPath, [cli, '--cases', caseFile, '--out', out, '--stage', 'final',
    '--grades', gradeFile], { encoding: 'utf8' });
  assert.equal(final.status, 0, final.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(out, 'score-final.json'), 'utf8'));
  assert.equal(report.rows.every((r) => r.gradeReason === 'ok'), true);
  assert.equal(report.decisions.sonnet.pass, false); // Y06 표본이 없으므로 통과하지 않는다.
});
