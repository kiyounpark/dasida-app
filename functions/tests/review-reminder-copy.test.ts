import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewReminderCopy } from '../src/review-reminder-copy';

// 스펙 고정 문자열. 클라 review-reminder-copy.test.ts와 동일 기대값 —
// 한쪽 변경 시 양쪽 테스트가 깨져 드리프트 감지.
test('아침 + 라벨 있음', () => {
  const c = buildReviewReminderCopy('morning', '판별식 계산 실수');
  assert.equal(c.title, '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요');
  assert.equal(c.body, '오늘 안 하면 내일 처음부터예요');
});

test('아침 + 라벨 없음', () => {
  const c = buildReviewReminderCopy('morning', undefined);
  assert.equal(c.title, '벌써 잊혀지고 있어요. 지금 3분이면 돼요');
  assert.equal(c.body, '오늘 안 하면 내일 처음부터예요');
});

test('저녁 + 라벨 있음', () => {
  const c = buildReviewReminderCopy('evening', '판별식 계산 실수');
  assert.equal(c.title, '판별식 계산 실수, 오늘 자기 전 마지막 기회예요');
  assert.equal(c.body, '잠들기 전 3분, 기억이 굳어져요');
});

test('저녁 + 라벨 없음', () => {
  const c = buildReviewReminderCopy('evening', undefined);
  assert.equal(c.title, '오늘 복습 마감, 자기 전 3분만요');
  assert.equal(c.body, '잠들기 전 3분, 기억이 굳어져요');
});
