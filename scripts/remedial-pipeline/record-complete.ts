#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ALL_GATE_IDS, isFullyPassed, type PassedGatesByWeakness } from './gates';

const STATE_PATH = join(__dirname, 'state.json');

type Args = {
  id?: string;
  result?: 'passed' | 'manual-review' | 'failed';
  tokens?: number;
  retries?: number;
  rejectionGate?: string;
  rejectionReason?: string;
  /** 콤마 구분 게이트 ID 목록. 예: "math-teacher,struggling-student,sympy" */
  gates?: string;
  /** backfill 모드: completed 큐 변경하지 않고 passedGates 만 갱신 */
  backfill?: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') out.id = argv[++i];
    else if (a === '--result') out.result = argv[++i] as Args['result'];
    else if (a === '--tokens') out.tokens = Number(argv[++i]);
    else if (a === '--retries') out.retries = Number(argv[++i]);
    else if (a === '--rejection-gate') out.rejectionGate = argv[++i];
    else if (a === '--rejection-reason') out.rejectionReason = argv[++i];
    else if (a === '--gates') out.gates = argv[++i];
    else if (a === '--backfill') out.backfill = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.id) {
  console.error('Required: --id <weaknessId>');
  process.exit(1);
}
if (!args.result || !['passed', 'manual-review', 'failed'].includes(args.result)) {
  console.error('Required: --result <passed|manual-review|failed>');
  process.exit(1);
}

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
  totalTokens: number;
  retryStats: Array<{ weaknessId: string; retries: number }>;
  rejectionHistory: Array<{ weaknessId: string; gate: string; reason: string }>;
  lastUpdateAt: string;
  passedGates?: PassedGatesByWeakness;
  backfillQueue?: string[];
};

// passedGates 갱신 (--gates 인자 기반)
state.passedGates ??= {};
if (args.gates) {
  const gateList = args.gates.split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = gateList.filter((g) => !ALL_GATE_IDS.includes(g));
  if (unknown.length > 0) {
    console.error(`Unknown gates: ${unknown.join(', ')}`);
    console.error(`Known: ${ALL_GATE_IDS.join(', ')}`);
    process.exit(1);
  }
  state.passedGates[args.id] ??= {};
  for (const g of gateList) {
    state.passedGates[args.id][g] = true;
  }
}

if (args.backfill) {
  // backfill 모드: 메인 큐 변경 없음, backfillQueue 에서만 제거
  state.backfillQueue ??= [];
  const bidx = state.backfillQueue.indexOf(args.id);
  if (bidx !== -1) state.backfillQueue.splice(bidx, 1);

  // 게이트 전부 통과 시 result 무관하게 fully passed 표시 (로그용)
  const fullyPassed = isFullyPassed(state.passedGates[args.id]);
  state.lastUpdateAt = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  console.log(
    `backfilled: ${args.id} -> ${args.result}, fullyPassed=${fullyPassed}, backfillQueueRemaining=${state.backfillQueue.length}`,
  );
  process.exit(0);
}

const idx = state.queue.indexOf(args.id);
if (idx === -1) {
  console.error(`'${args.id}' 큐에 없음 (이미 처리됐거나 유효하지 않은 ID)`);
  process.exit(1);
}
state.queue.splice(idx, 1);

if (args.result === 'passed') state.completed.push(args.id);
else if (args.result === 'manual-review') state.manualReview.push(args.id);
else state.failed.push(args.id);

state.completedCount += 1;
state.totalTokens += args.tokens ?? 0;
state.retryStats.push({ weaknessId: args.id, retries: args.retries ?? 1 });

if (args.rejectionGate && args.rejectionReason) {
  state.rejectionHistory.push({
    weaknessId: args.id,
    gate: args.rejectionGate,
    reason: args.rejectionReason,
  });
}

state.lastUpdateAt = new Date().toISOString();

writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

const fullyPassed = isFullyPassed(state.passedGates[args.id]);
console.log(
  `recorded: ${args.id} -> ${args.result} (count=${state.completedCount}, tokens=${state.totalTokens}, fullyPassed=${fullyPassed})`,
);
