#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATE_PATH = join(__dirname, 'state.json');

type Args = {
  id?: string;
  result?: 'passed' | 'manual-review' | 'failed';
  tokens?: number;
  retries?: number;
  rejectionGate?: string;
  rejectionReason?: string;
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

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

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

console.log(`recorded: ${args.id} -> ${args.result} (count=${state.completedCount}, tokens=${state.totalTokens})`);
