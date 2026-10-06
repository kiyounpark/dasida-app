import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewReminderCopy } from '../src/review-reminder-copy';

// 스펙 고정 문자열. 클라 review-reminder-copy.test.ts와 동일 기대값 —
// 한쪽 변경 시 양쪽 테스트가 깨져 드리프트 감지.
// 1.0.12 — 아침 본문은 과제 단계로 갈린다(기윤 10.06). 놓친 복습은 다음에 열 때 한 칸 내려가고(🔒 10.06)
// day1은 더 안 내려간다 — 그래서 「돌아가요」는 day3 이상에만, 숫자로 말한다.

test('아침 + 라벨 있음 · day1', () => {
  const c = buildReviewReminderCopy('morning', '판별식 계산 실수', { kind: 'due', stage: 'day1' });
  assert.equal(c.title, '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요');
  assert.equal(c.body, '틀린 거, 하루 만에 벌써 절반 넘게 잊었어요');
});

test('아침 + 라벨 없음 · day1', () => {
  const c = buildReviewReminderCopy('morning', undefined, { kind: 'due', stage: 'day1' });
  assert.equal(c.title, '벌써 잊혀지고 있어요. 지금 3분이면 돼요');
  assert.equal(c.body, '틀린 거, 하루 만에 벌써 절반 넘게 잊었어요');
});

test('아침 · day3·day7·day30은 내려갈 단계를 숫자로', () => {
  assert.equal(
    buildReviewReminderCopy('morning', undefined, { kind: 'due', stage: 'day3' }).body,
    '오늘 놓치면 1일차로 돌아가요',
  );
  assert.equal(
    buildReviewReminderCopy('morning', undefined, { kind: 'due', stage: 'day7' }).body,
    '오늘 놓치면 3일차로 돌아가요',
  );
  assert.equal(
    buildReviewReminderCopy('morning', undefined, { kind: 'due', stage: 'day30' }).body,
    '오늘 놓치면 7일차로 돌아가요',
  );
});

test('아침 · 어제 놓친 과제 — 열면 이미 내려가니 「오늘 놓치면」은 안 쓴다', () => {
  const c = buildReviewReminderCopy('morning', undefined, { kind: 'missed' });
  assert.equal(c.body, '어제 못 한 복습, 지금 이어서 해요');
});

test('저녁 + 라벨 있음 (단계와 무관)', () => {
  const c = buildReviewReminderCopy('evening', '판별식 계산 실수', { kind: 'due', stage: 'day7' });
  assert.equal(c.title, '판별식 계산 실수, 오늘 자기 전 마지막 기회예요');
  assert.equal(c.body, '잠들기 전 3분, 기억이 굳어져요');
});

test('저녁 + 라벨 없음 (단계와 무관)', () => {
  const c = buildReviewReminderCopy('evening', undefined, { kind: 'due', stage: 'day1' });
  assert.equal(c.title, '오늘 복습 마감, 자기 전 3분만요');
  assert.equal(c.body, '잠들기 전 3분, 기억이 굳어져요');
});
