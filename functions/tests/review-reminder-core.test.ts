import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeReminderDateBounds,
  dedupeAccountKeys,
} from '../src/review-reminder-core';

// scheduledFor는 UTC ...Z ISO (addDays = new Date().toISOString()).
// 현행 로컬 due 판정 scheduledFor.slice(0,10) === todayLabel 과 1:1.
test('computeReminderDateBounds: 라벨 D 기준 [D T00:00:00.000Z, Dnext T00:00:00.000Z)', () => {
  const { gte, lt } = computeReminderDateBounds('2026-05-19');
  assert.equal(gte, '2026-05-19T00:00:00.000Z');
  assert.equal(lt, '2026-05-20T00:00:00.000Z');
});

test('computeReminderDateBounds: 월말 경계 롤오버', () => {
  const { gte, lt } = computeReminderDateBounds('2026-05-31');
  assert.equal(gte, '2026-05-31T00:00:00.000Z');
  assert.equal(lt, '2026-06-01T00:00:00.000Z');
});

test('경계 의미: UTC 15:00~23:59 완료 task가 누락되지 않음', () => {
  // 완료 2026-05-18T16:00Z → day1 scheduledFor 2026-05-19T16:00:00.000Z.
  // 로컬은 slice(0,10)="2026-05-19"를 due로 봄. 같은 라벨 범위에 포함돼야.
  const { gte, lt } = computeReminderDateBounds('2026-05-19');
  const scheduledFor = '2026-05-19T16:00:00.000Z';
  assert.equal(scheduledFor >= gte && scheduledFor < lt, true);
});

test('dedupeAccountKeys: 중복 제거, 입력 순서 보존', () => {
  assert.deepEqual(
    dedupeAccountKeys(['user:a', 'user:b', 'user:a', 'user:c']),
    ['user:a', 'user:b', 'user:c'],
  );
});
