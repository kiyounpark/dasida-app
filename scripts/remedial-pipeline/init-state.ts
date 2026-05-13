#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const DIAGNOSIS_PATH = join(ROOT, 'data', 'diagnosisMap.ts');
const FLOWS_PATH = join(ROOT, 'data', 'review-remedial-flows.ts');
const STATE_PATH = join(__dirname, 'state.json');

const FALLBACK_EXCLUDED = 'basic_concept_needed';

function extractWeaknessIds(source: string): string[] {
  // diagnosisMap.ts has `export type WeaknessId = | 'id1' | 'id2' | ...`
  // Match all single-quoted strings between `export type WeaknessId =` and the next `;`
  const startIdx = source.indexOf('export type WeaknessId');
  if (startIdx === -1) throw new Error('WeaknessId type not found');
  const endIdx = source.indexOf(';', startIdx);
  const block = source.slice(startIdx, endIdx);
  const matches = block.matchAll(/'([a-zA-Z0-9_]+)'/g);
  return Array.from(matches, (m) => m[1]);
}

function extractRegisteredFlows(source: string): string[] {
  // review-remedial-flows.ts has `export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = { foo_id: foo_flow, ... };`
  const match = source.match(/remedialFlows:\s*Partial<Record<WeaknessId,\s*RemedialFlow>>\s*=\s*\{([^}]+)\}/s);
  if (!match) return [];
  const inner = match[1];
  const ids = inner.matchAll(/^\s*([a-z_0-9]+):/gm);
  return Array.from(ids, (m) => m[1]);
}

const diagnosisSrc = readFileSync(DIAGNOSIS_PATH, 'utf8');
const flowsSrc = readFileSync(FLOWS_PATH, 'utf8');

const allIds = extractWeaknessIds(diagnosisSrc);
const registered = new Set(extractRegisteredFlows(flowsSrc));
const queue = allIds.filter((id) => id !== FALLBACK_EXCLUDED && !registered.has(id));

if (existsSync(STATE_PATH)) {
  console.error(`이미 state.json 존재함: ${STATE_PATH}`);
  console.error('재시작하려면 먼저 삭제: rm scripts/remedial-pipeline/state.json');
  process.exit(1);
}

const now = new Date().toISOString();
const state = {
  version: 1,
  createdAt: now,
  lastUpdateAt: now,
  queue,
  completed: [],
  manualReview: [],
  failed: [],
  totalTokens: 0,
  completedCount: 0,
  lastProgressReportAt: 0,
  lastDriftCheckAt: 0,
  retryStats: [],
  rejectionHistory: [],
};

writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

console.log(`state.json 생성 완료: ${STATE_PATH}`);
console.log(`총 약점: ${allIds.length}`);
console.log(`제외 (fallback): ${FALLBACK_EXCLUDED}`);
console.log(`이미 등록 (${registered.size}개): ${Array.from(registered).join(', ')}`);
console.log(`큐 (${queue.length}개): ${queue.slice(0, 5).join(', ')}${queue.length > 5 ? ', ...' : ''}`);
