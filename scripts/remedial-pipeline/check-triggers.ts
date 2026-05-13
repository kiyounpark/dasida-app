#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATE_PATH = join(__dirname, 'state.json');

if (!existsSync(STATE_PATH)) {
  console.error('state.json 없음. 먼저 init-state.ts 실행 필요.');
  process.exit(1);
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

const triggers: string[] = [];
if (state.completedCount - state.lastProgressReportAt >= 5) {
  triggers.push('progress_report');
}
if (state.completedCount - state.lastDriftCheckAt >= 10) {
  triggers.push('drift_check');
}

const output = {
  nextWeaknessId: state.queue.length > 0 ? state.queue[0] : null,
  triggers,
  summary: {
    queueRemaining: state.queue.length,
    completedCount: state.completedCount,
    passed: state.completed.length,
    manualReview: state.manualReview.length,
    failed: state.failed.length,
  },
};

console.log(JSON.stringify(output, null, 2));
