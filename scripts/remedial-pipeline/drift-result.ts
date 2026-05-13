#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const STATE_PATH = join(__dirname, 'state.json');
const SLACK_SCRIPT = join(__dirname, '..', 'slack-notify.js');

function parseArgs(argv: string[]): { jsonFile?: string; json?: string } {
  const out: { jsonFile?: string; json?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json-file') out.jsonFile = argv[++i];
    else if (argv[i] === '--json') out.json = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const raw = args.jsonFile ? readFileSync(args.jsonFile, 'utf8') : args.json;
if (!raw) {
  console.error('Required: --json-file <path> or --json <inline>');
  process.exit(1);
}
const drift = JSON.parse(raw);

if (!existsSync(STATE_PATH)) {
  console.error('state.json 없음.');
  process.exit(1);
}
const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

const TOTAL = 56;
const lines: string[] = [];

if (drift.verdict === 'ok') {
  lines.push(`📐 드리프트 검수 (${state.completedCount}/${TOTAL})`);
  lines.push('✅ 정상');
  lines.push(`- 톤: ${drift.toneCompare.recent} (baseline 일치)`);
  lines.push(
    `- 분량: 평균 ${drift.lengthCompare.recentAvgSentences}문장 (baseline ${drift.lengthCompare.baselineAvgSentences})`
  );
  lines.push(`- 구조: ${drift.structureCompare.recentNotes}`);
} else {
  lines.push(`🔧 드리프트 감지 + 자동 조치 (${state.completedCount}/${TOTAL})`);
  const toneFlag = drift.toneCompare.drift ? ' ⚠️' : '';
  const lenFlag = drift.lengthCompare.drift ? ' ⚠️' : '';
  const strFlag = drift.structureCompare.drift ? ' ⚠️' : '';
  lines.push(
    `- 톤: ${drift.toneCompare.recent} (baseline: ${drift.toneCompare.baseline})${toneFlag}`
  );
  lines.push(
    `- 분량: 평균 ${drift.lengthCompare.recentAvgSentences}문장 (baseline ${drift.lengthCompare.baselineAvgSentences})${lenFlag}`
  );
  lines.push(`- 구조: ${drift.structureCompare.recentNotes}${strFlag}`);
  lines.push(`조치: ${drift.autoActionTaken || '없음'}`);
}

const message = lines.join('\n');

// slack-notify.js supports: start | done | test | progress | fail
// 'progress' maps to "🔄 AI 작업 진행"
const result = spawnSync('node', [SLACK_SCRIPT, 'progress', message], {
  encoding: 'utf8',
  stdio: ['ignore', 'inherit', 'inherit'],
});

if (result.status !== 0) {
  console.error('Slack 발송 실패. (웹훅 미설정일 수 있음 — state.json은 그래도 갱신)');
}

state.lastDriftCheckAt = state.completedCount;
state.lastUpdateAt = new Date().toISOString();
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

console.log(`drift-result 기록 완료 (count=${state.completedCount}, verdict=${drift.verdict})`);
