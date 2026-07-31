#!/usr/bin/env node
// 검증 배치 도구: 시험지 사진 묶음을 analyzePhoto에 N회씩 보내
// ① 풀이 인식 일관성 ② 오류 짚기 ③ 쪽지시험·재도전 문제 원문을 한 번에 뽑는다.
// 사용: node scripts/verify-photo-analysis-batch.mjs <사진폴더|사진파일> [--runs 3] [--concurrency 3]
// URL 재정의: ANALYZE_PHOTO_URL=... node scripts/verify-photo-analysis-batch.mjs ...
import { readdir, readFile, mkdtemp, writeFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, basename } from 'node:path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'dasida-app';
const url =
  process.env.ANALYZE_PHOTO_URL ??
  `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const RUNS = flag('runs', 3);
const CONCURRENCY = flag('concurrency', 3);
if (!target) {
  console.error('사용: node scripts/verify-photo-analysis-batch.mjs <사진폴더|사진파일> [--runs 3] [--concurrency 3]');
  process.exit(1);
}

const mimeByExt = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const st = await stat(target);
const files = st.isDirectory()
  ? (await readdir(target)).filter((f) => mimeByExt[extname(f).toLowerCase()]).sort().map((f) => join(target, f))
  : [target];
if (files.length === 0) {
  console.error('사진이 없습니다');
  process.exit(1);
}

// 운영과 같은 조건으로 재기: 웹은 1568px로 축소해 보내므로 여기서도 맞춘다
const workdir = await mkdtemp(join(tmpdir(), 'dasida-verify-'));
const resizedPath = new Map();
for (const file of files) {
  const out = join(workdir, basename(file));
  const r = spawnSync('sips', ['-Z', '1568', file, '--out', out], { stdio: 'ignore' });
  resizedPath.set(file, r.status === 0 ? out : file); // sips 실패 시 원본
}

async function callOnce(file, run) {
  const mime = mimeByExt[extname(file).toLowerCase()];
  const buffer = await readFile(resizedPath.get(file));
  const imageDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  if (imageDataUrl.length > 8_000_000) {
    return { file, run, error: `이미지가 서버 상한 초과 (${imageDataUrl.length})` };
  }
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl }),
      signal: AbortSignal.timeout(90_000),
    });
    const elapsed = (Date.now() - started) / 1000;
    if (!res.ok) {
      return { file, run, elapsed, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 120)}` };
    }
    return { file, run, elapsed, result: await res.json() };
  } catch (error) {
    return { file, run, elapsed: (Date.now() - started) / 1000, error: error.message };
  }
}

const tasks = [];
for (const f of files) for (let r = 1; r <= RUNS; r++) tasks.push({ f, r });
const results = [];
let next = 0;
async function worker() {
  while (next < tasks.length) {
    const t = tasks[next++];
    const out = await callOnce(t.f, t.r);
    results.push(out);
    const name = basename(t.f);
    if (out.error) {
      console.log(`✗ ${name} #${t.r} — ${out.error}`);
    } else {
      const R = out.result;
      const err0 = R.errorCandidates?.[0];
      console.log(
        `· ${name} #${t.r} (${out.elapsed.toFixed(0)}s) 풀이:${R.hasSolvingWork ? 'O' : 'X'} 방법:${R.predictedMethodId}(${R.confidence}) 오류:${R.errorCandidates?.length ?? 0}${err0 ? `[${err0.mistakeType}]` : ''} 재도전:${R.errorCandidates?.some((c) => c.retryPrompt) ? 'O' : 'X'}`
      );
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log('\n===== 요약 (사진별 일관성) =====');
for (const f of files) {
  const rs = results.filter((x) => x.file === f);
  const ok = rs.filter((x) => x.result);
  const name = basename(f);
  if (ok.length === 0) {
    console.log(`${name}: 전부 실패`);
    continue;
  }
  const solving = ok.filter((x) => x.result.hasSolvingWork).length;
  const methods = [...new Set(ok.map((x) => x.result.predictedMethodId))];
  const errCounts = ok.map((x) => x.result.errorCandidates.length);
  const retries = ok.filter((x) => x.result.errorCandidates.some((c) => c.retryPrompt)).length;
  const failed = rs.length - ok.length;
  console.log(
    `${name}: 풀이인식 ${solving}/${ok.length} · 방법 ${methods.join('/')} · 오류수 [${errCounts.join(',')}] · 재도전 ${retries}/${ok.length}${failed ? ` · 호출실패 ${failed}` : ''}`
  );
}

console.log('\n===== 쪽지시험·재도전 원문 (성립 검수용) =====');
for (const f of files) {
  for (const x of results.filter((x) => x.file === f && x.result)) {
    const R = x.result;
    console.log(`\n### ${basename(f)} #${x.run} — 답:${R.userAnswer ?? '(못읽음)'} 전사: ${R.transcription || '(없음)'}`);
    if (R.errorCandidates.length === 0) {
      console.log(`  (오류 후보 없음, errorConfidence ${R.errorConfidence})`);
      continue;
    }
    R.errorCandidates.forEach((c, i) => {
      console.log(`  --- 후보${i + 1} [${c.mistakeType}]`);
      console.log(`  인용: ${c.quote}`);
      if (c.checkSetup) console.log(`  쪽지 상황: ${c.checkSetup}`);
      console.log(`  쪽지: ${c.checkPrompt}`);
      c.checkOptions.forEach((o, j) => console.log(`    ${j === c.checkAnswerIndex ? '✓' : '·'} ${o}`));
      if (c.retryPrompt) {
        console.log(`  재도전 상황: ${c.retrySetup}`);
        console.log(`  재도전 질문: ${c.retryPrompt}`);
        c.retryOptions.forEach((o, j) => console.log(`    ${j === c.retryAnswerIndex ? '✓' : '·'} ${o}`));
      } else {
        console.log('  재도전: (없음)');
      }
    });
  }
}

const outPath = join(workdir, 'batch-results.jsonl');
await writeFile(outPath, results.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`\n전체 JSON: ${outPath}`);
