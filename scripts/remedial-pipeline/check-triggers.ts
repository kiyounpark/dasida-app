#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ALL_GATE_IDS, missingGates, type PassedGatesByWeakness } from './gates';

const STATE_PATH = join(__dirname, 'state.json');

if (!existsSync(STATE_PATH)) {
  console.error('state.json 없음. 먼저 init-state.ts 실행 필요.');
  process.exit(1);
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8')) as {
  queue: string[];
  completed: string[];
  manualReview: string[];
  failed: string[];
  completedCount: number;
  lastProgressReportAt: number;
  lastDriftCheckAt: number;
  passedGates?: PassedGatesByWeakness;
  backfillQueue?: string[];
};

const passedGates = state.passedGates ?? {};

// backfill 큐 자동 산출: completed 인데 누락 게이트 있는 약점.
// 항상 자동 탐지를 신뢰 — backfillQueue 필드는 캐시일 뿐 누락 게이트가 진짜 출처.
const backfillQueue = state.completed.filter(
  (id) => missingGates(passedGates[id]).length > 0,
);

const triggers: string[] = [];
if (state.completedCount - state.lastProgressReportAt >= 5) {
  triggers.push('progress_report');
}
if (state.completedCount - state.lastDriftCheckAt >= 10) {
  triggers.push('drift_check');
}

let nextAction: 'backfill' | 'main' | 'done';
let nextWeaknessId: string | null;
let gatesToRun: string[];

if (backfillQueue.length > 0) {
  nextAction = 'backfill';
  nextWeaknessId = backfillQueue[0];
  gatesToRun = missingGates(passedGates[nextWeaknessId]);
} else if (state.queue.length > 0) {
  nextAction = 'main';
  nextWeaknessId = state.queue[0];
  gatesToRun = [...ALL_GATE_IDS];
} else {
  nextAction = 'done';
  nextWeaknessId = null;
  gatesToRun = [];
}

const output = {
  nextAction,
  nextWeaknessId,
  gatesToRun,
  triggers,
  summary: {
    mainQueueRemaining: state.queue.length,
    backfillQueueRemaining: backfillQueue.length,
    completedCount: state.completedCount,
    passed: state.completed.length,
    manualReview: state.manualReview.length,
    failed: state.failed.length,
  },
  note:
    nextAction === 'backfill'
      ? `본 큐 진행 전 backfill 처리 필요. ${nextWeaknessId} 에 누락 게이트 ${gatesToRun.length}개 실행.`
      : nextAction === 'main'
        ? `${nextWeaknessId} 신규 약점 — 6개 게이트 전부 실행.`
        : '모든 큐 비움. 56개 batch 완료.',
};

console.log(JSON.stringify(output, null, 2));
