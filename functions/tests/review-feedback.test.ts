// functions/tests/review-feedback.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SYSTEM_PROMPT,
  ReviewFeedbackRequestSchema,
  decideMode,
  buildSystemPrompt,
} from '../src/review-feedback.js';

test('SYSTEM_PROMPT가 원칙 기반 판단 기준을 포함한다', () => {
  assert.ok(
    SYSTEM_PROMPT.includes('실질적인 시도'),
    'SYSTEM_PROMPT에 "실질적인 시도" 원칙 문구가 있어야 한다',
  );
  assert.ok(
    SYSTEM_PROMPT.includes('형태와 길이에 관계없이') || SYSTEM_PROMPT.includes('형태'),
    'SYSTEM_PROMPT에 형태·길이 무관 원칙이 있어야 한다',
  );
  assert.ok(
    SYSTEM_PROMPT.includes('명시적인 단어로 설명'),
    'SYSTEM_PROMPT에 명시적 설명 요구 원칙이 있어야 한다',
  );
  assert.ok(
    SYSTEM_PROMPT.includes('추임새'),
    'SYSTEM_PROMPT에 추임새 거부 규칙이 있어야 한다',
  );
});

test('decideMode: assistant 응답 0개면 explore', () => {
  const result = decideMode([{ role: 'user' }]);
  assert.equal(result, 'explore');
});

test('decideMode: assistant 응답 1개면 close', () => {
  const result = decideMode([
    { role: 'user' },
    { role: 'assistant' },
    { role: 'user' },
  ]);
  assert.equal(result, 'close');
});

test('buildSystemPrompt(explore)에는 탐색 모드 안내가 포함된다', () => {
  const prompt = buildSystemPrompt('explore');
  assert.ok(prompt.includes('탐색 모드'));
  assert.ok(prompt.includes('힌트'));
});

test('buildSystemPrompt(close)에는 마무리 모드 안내가 포함된다', () => {
  const prompt = buildSystemPrompt('close');
  assert.ok(prompt.includes('마무리 모드'));
  assert.ok(prompt.includes('인정'), 'close 모드는 학생 인정 비트를 강제해야 한다');
  assert.ok(prompt.includes('클로징'), 'close 모드는 따뜻한 클로징을 강제해야 한다');
  assert.ok(
    !prompt.includes('더 이상 떠넘기지'),
    '차가운 표현이 제거되어야 한다',
  );
});

test('buildSystemPrompt에 selectedChoice가 있으면 컨텍스트가 주입된다', () => {
  const prompt = buildSystemPrompt('explore', { text: '음수 부호', correct: false });
  assert.ok(prompt.includes('선택지 컨텍스트'));
  assert.ok(prompt.includes('음수 부호'));
  assert.ok(prompt.includes('오답'));
});

test('buildSystemPrompt에 selectedChoice가 없으면 컨텍스트가 없다', () => {
  const prompt = buildSystemPrompt('explore');
  assert.ok(!prompt.includes('선택지 컨텍스트'));
});

test('zod 스키마는 selectedChoiceText/selectedChoiceCorrect를 옵셔널로 받는다', () => {
  const baseInput = {
    weaknessId: 'discriminant_calculation',
    stepTitle: 'a, b, c 부호 확인',
    stepBody: '계수를 부호 포함해서 읽는다.',
    messages: [{ role: 'user', content: '음수 부호 때문이에요' }],
  };

  const withChoice = ReviewFeedbackRequestSchema.safeParse({
    ...baseInput,
    selectedChoiceText: '음수 부호를 빠뜨리면 결과가 달라지니까',
    selectedChoiceCorrect: true,
  });
  assert.equal(withChoice.success, true);

  const withoutChoice = ReviewFeedbackRequestSchema.safeParse(baseInput);
  assert.equal(withoutChoice.success, true);
});
