#!/usr/bin/env tsx
/**
 * state.json 1회성 마이그레이션 스크립트.
 *
 * 변경: passedGates 필드 추가.
 * - 기존 completed 약점: 구 4개 게이트(math-teacher / struggling-student / sympy / appearance-reviewer)
 *   는 통과한 것으로 추정 기록. 신규 2개 게이트(remedial-flow / thinkingstep-flow)는 미검증으로 false.
 * - 신규 2개 게이트는 commit 14d49c0 (multi-pilot wrap-up) 에 추가됐고, 그 시점에 이미 completed 였던 3개
 *   약점은 신규 게이트를 거치지 않음.
 *
 * 멱등성: 이미 passedGates 가 있으면 종료 (덮어쓰지 않음).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PassedGatesByWeakness } from './gates';

const STATE_PATH = join(__dirname, 'state.json');

if (!existsSync(STATE_PATH)) {
  console.error('state.json 없음.');
  process.exit(1);
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

if (state.passedGates) {
  console.log('이미 마이그레이션됨. passedGates 존재. 변경 없음.');
  process.exit(0);
}

const LEGACY_PASSED_GATES = {
  'math-teacher': true,
  'struggling-student': true,
  'sympy': true,
  'appearance-reviewer': true,
  'remedial-flow': false,
  'thinkingstep-flow': false,
};

const passedGates: PassedGatesByWeakness = {};
for (const id of state.completed as string[]) {
  passedGates[id] = { ...LEGACY_PASSED_GATES };
}

state.passedGates = passedGates;
state.backfillQueue = [...state.completed]; // 모두 backfill 대상

state.lastUpdateAt = new Date().toISOString();
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

console.log('migration 완료:');
console.log(`  passedGates 항목: ${Object.keys(passedGates).length}`);
console.log(`  backfillQueue: ${state.backfillQueue.join(', ')}`);
