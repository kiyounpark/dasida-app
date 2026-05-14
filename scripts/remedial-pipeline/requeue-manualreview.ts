#!/usr/bin/env tsx
/**
 * 일회성 스크립트: manualReview 에 있던 3개 약점을 queue 앞으로 되돌린다.
 * 페르소나 업데이트 후 학생 게이트 재시도 목적.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STATE_PATH = join(__dirname, 'state.json');
const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));

const REQUEUE = [
  'solving_order_confusion',
  'max_min_judgement_confusion',
  'factoring_pattern_recall',
];

let moved = 0;
for (const id of REQUEUE) {
  const idx = state.manualReview.indexOf(id);
  if (idx !== -1) {
    state.manualReview.splice(idx, 1);
    state.queue.unshift(id);
    state.completedCount -= 1;
    moved += 1;
  }
}

state.lastUpdateAt = new Date().toISOString();
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

console.log(`${moved} 개 약점을 manualReview → queue 앞으로 이동.`);
console.log(`queue head: ${state.queue.slice(0, 5).join(', ')}`);
console.log(`manualReview remaining: ${state.manualReview.length}`);
console.log(`completedCount: ${state.completedCount}`);
