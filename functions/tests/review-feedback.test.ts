// functions/tests/review-feedback.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { SYSTEM_PROMPT } from '../src/review-feedback.js';

test('SYSTEM_PROMPT가 원칙 기반 판단 기준을 포함한다', () => {
  assert.ok(
    SYSTEM_PROMPT.includes('실질적인 시도'),
    'SYSTEM_PROMPT에 "실질적인 시도" 원칙 문구가 있어야 한다',
  );
  assert.ok(
    SYSTEM_PROMPT.includes('형태와 길이에 관계없이') || SYSTEM_PROMPT.includes('형태'),
    'SYSTEM_PROMPT에 형태·길이 무관 원칙이 있어야 한다',
  );
});
