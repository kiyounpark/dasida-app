import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildQuizVerifyInput,
  judgeQuizVerify,
  QUIZ_VERIFY_INSTRUCTIONS,
  QUIZ_VERIFY_SCHEMA,
  VERIFY_QUIZ_OPENAI_TIMEOUT_MS,
  VERIFY_QUIZ_TIMEOUT_SECONDS,
  VerifyQuizRequestSchema,
} from '../src/verify-quiz-core';

test('입력 포맷이 09.30 측정(verify.cjs)과 글자 단위로 같다', () => {
  const text = buildQuizVerifyInput({
    setup: '9 + x = 2/3 x + 5에서 x항을 왼쪽으로 모으는 단계야.',
    prompt: '여기서 다음 한 수는?',
    options: ['1/3 x = 4', '5/3 x = 4', 'x = 4'],
  });
  assert.equal(
    text,
    '[상황]\n9 + x = 2/3 x + 5에서 x항을 왼쪽으로 모으는 단계야.\n\n[질문]\n여기서 다음 한 수는?\n\n[보기]\n0. 1/3 x = 4\n1. 5/3 x = 4\n2. x = 4'
  );
});

test('정답 번호는 프롬프트에 못 들어간다 — marked를 같이 넘겨도 입력이 같다', () => {
  const base = { setup: 's', prompt: 'p', options: ['a', 'b', 'c'] };
  const withMarked = { ...base, marked: 2 } as typeof base & { marked: number };
  assert.equal(buildQuizVerifyInput(withMarked), buildQuizVerifyInput(base));
});

test('setup이 비면 [상황] 블록을 뺀다', () => {
  assert.equal(buildQuizVerifyInput({ setup: '  ', prompt: 'p', options: ['a', 'b', 'c'] }).startsWith('[질문]'), true);
  assert.equal(buildQuizVerifyInput({ prompt: 'p', options: ['a', 'b', 'c'] }).startsWith('[질문]'), true);
});

test('지시문은 측정 원문 그대로다 — 바꾸면 09.30 측정이 무효', () => {
  assert.equal(
    QUIZ_VERIFY_INSTRUCTIONS,
    '너는 고등학교 수학 문제 검산기다. 아래 [상황]과 [질문]을 직접 풀어라.\n' +
      '보기 중 정답인 보기의 번호(0, 1, 2)를 고른다.\n' +
      '정답이 보기에 없으면 -1, 정답이 둘 이상이면 -2, 상황만으로 답이 정해지지 않으면 -3.\n' +
      '보기를 먼저 보지 말고 스스로 답을 구한 뒤 보기와 맞춰라. solved에는 네가 구한 답을 짧게 적는다.'
  );
});

test('스키마 strict 불변식 — properties 전부 required, additionalProperties false', () => {
  assert.equal(QUIZ_VERIFY_SCHEMA.additionalProperties, false);
  assert.deepEqual([...QUIZ_VERIFY_SCHEMA.required].sort(), Object.keys(QUIZ_VERIFY_SCHEMA.properties).sort());
});

test('judgeQuizVerify — 번호가 같을 때만 match', () => {
  assert.equal(judgeQuizVerify(2, 2), 'match');
  assert.equal(judgeQuizVerify(0, 2), 'mismatch');
  assert.equal(judgeQuizVerify(-1, 0), 'none');
  assert.equal(judgeQuizVerify(-2, 0), 'multiple');
  assert.equal(judgeQuizVerify(-3, 0), 'ambiguous');
  assert.equal(judgeQuizVerify(3, 0), 'invalid');
  assert.equal(judgeQuizVerify(-4, 0), 'invalid');
  assert.equal(judgeQuizVerify(1.5, 1), 'invalid');
  assert.equal(judgeQuizVerify('1', 1), 'invalid');
});

test('요청 검사 — 보기 3개·번호 0~2만 받는다', () => {
  const ok = { kind: 'check', prompt: 'p', options: ['a', 'b', 'c'], marked: 0 };
  assert.equal(VerifyQuizRequestSchema.safeParse(ok).success, true);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, setup: 's', submissionId: null, qa: true }).success, true);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, options: ['a', 'b'] }).success, false);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, options: ['a', 'b', 'c', 'd'] }).success, false);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, options: ['a', '', 'c'] }).success, false);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, marked: 3 }).success, false);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, marked: null }).success, false);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, setup: 'x'.repeat(601) }).success, false);
  assert.equal(VerifyQuizRequestSchema.safeParse({ ...ok, kind: 'foo' }).success, false);
});

test('예산 — OpenAI 대기가 함수 타임아웃 안에 여유 있게 든다', () => {
  assert.ok(VERIFY_QUIZ_OPENAI_TIMEOUT_MS < VERIFY_QUIZ_TIMEOUT_SECONDS * 1000 - 3_000);
});
