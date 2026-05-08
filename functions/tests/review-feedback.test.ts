// functions/tests/review-feedback.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { SYSTEM_PROMPT, ReviewFeedbackRequestSchema } from '../src/review-feedback.js';

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
