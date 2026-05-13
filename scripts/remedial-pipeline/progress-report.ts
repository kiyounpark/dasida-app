#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const STATE_PATH = join(__dirname, 'state.json');
const SLACK_SCRIPT = join(__dirname, '..', 'slack-notify.js');

if (!existsSync(STATE_PATH)) {
  console.error('state.json 없음.');
  process.exit(1);
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

const TOTAL = 56;
const pct = Math.round((state.completedCount / TOTAL) * 100);
const tokensM = (state.totalTokens / 1_000_000).toFixed(2);
const avgRetries =
  state.retryStats && state.retryStats.length > 0
    ? (
        state.retryStats.reduce((s: number, r: any) => s + r.retries, 0) /
        state.retryStats.length
      ).toFixed(1)
    : '—';

const message = [
  `📊 진행률 (${state.completedCount}/${TOTAL}, ${pct}%)`,
  `✅ 통과: ${state.completed.length}  🟡 검토큐: ${state.manualReview.length}  🔴 실패: ${state.failed.length}`,
  `⏱️ 누적 토큰: ${tokensM}M`,
  `🔁 평균 재시도: ${avgRetries}회`,
].join('\n');

// slack-notify.js supports: start | done | test | progress | fail
// We use 'progress' which maps to "🔄 AI 작업 진행"
// The detail argument is passed as the message body
const result = spawnSync('node', [SLACK_SCRIPT, 'progress', message], {
  encoding: 'utf8',
  stdio: ['ignore', 'inherit', 'inherit'],
});

if (result.status !== 0) {
  console.error('Slack 발송 실패. (웹훅 미설정일 수 있음 — state.json은 그래도 갱신)');
}

state.lastProgressReportAt = state.completedCount;
state.lastUpdateAt = new Date().toISOString();
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

console.log(`progress-report 발송 완료 (count=${state.completedCount})`);
