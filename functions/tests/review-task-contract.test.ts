import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReviewTaskId,
  isWeaknessReviewTask,
  reviewTaskKind,
} from '../src/review-task-contract';

// 1.0.12 서버 과제 모양 (가) — 종류는 (출처, 약점) 쌍에서 읽는다. null은 사진 과제에만 있다.

test('종류: 약점이 있으면 약점 과제 — 사진 복습에서 틀려 생긴 과제(source photo)도 여기다', () => {
  assert.equal(reviewTaskKind({ weaknessId: 'formula_understanding' }), 'weakness');
  assert.equal(isWeaknessReviewTask({ weaknessId: 'formula_understanding' }), true);
});

test('종류: 약점이 null이면 노트 과제', () => {
  assert.equal(reviewTaskKind({ weaknessId: null }), 'note');
  assert.equal(isWeaknessReviewTask({ weaknessId: null }), false);
});

test('과제 id: 약점 과제는 지금 꼴 그대로, 노트 과제는 가운데 칸이 note', () => {
  assert.equal(
    buildReviewTaskId('src-1', 'formula_understanding', 'day3'),
    'src-1__formula_understanding__day3',
  );
  assert.equal(
    buildReviewTaskId('photo-2026-10-05T01:02:03.000Z', null, 'day1'),
    'photo-2026-10-05T01:02:03.000Z__note__day1',
  );
});
