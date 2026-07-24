#!/usr/bin/env node
// 검증 A 도구: 사진을 analyzePhoto 함수에 보내 분류 결과를 표로 출력한다.
// 사용: node scripts/verify-photo-analysis.mjs <사진1.jpg> [사진2.jpg ...]
// URL 재정의: ANALYZE_PHOTO_URL=... node scripts/verify-photo-analysis.mjs ...
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'dasida-app';
const url =
  process.env.ANALYZE_PHOTO_URL ??
  `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('사용: node scripts/verify-photo-analysis.mjs <사진.jpg> [...]');
  process.exit(1);
}

const mimeByExt = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

for (const file of files) {
  const mime = mimeByExt[extname(file).toLowerCase()];
  if (!mime) {
    console.error(`건너뜀 (지원 안 함): ${file}`);
    continue;
  }
  const buffer = await readFile(file);
  const imageDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (!response.ok) {
    console.error(`✗ ${basename(file)} — HTTP ${response.status}: ${await response.text()}`);
    continue;
  }

  const r = await response.json();
  console.log(`\n=== ${basename(file)} (${elapsed}s) ===`);
  console.log(`  풀이흔적: ${r.hasSolvingWork}  답: ${r.userAnswer ?? '(못 읽음)'}`);
  console.log(`  방식: ${r.predictedMethodId}  confidence: ${r.confidence}  되물음: ${r.needsManualSelection}`);
  console.log(`  후보: ${r.candidateMethodIds.join(', ')}`);
  console.log(`  전사: ${r.transcription || '(없음)'}`);
  console.log(`  reason: ${r.reason}`);
}
