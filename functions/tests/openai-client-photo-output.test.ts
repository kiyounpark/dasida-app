import assert from 'node:assert/strict';
import test from 'node:test';

import { ANALYZE_PHOTO_TIMEOUT_SECONDS, RESPONSE_DEADLINE_MS } from '../src/analyze-photo-core';
import {
  PHOTO_ANALYSIS_DEADLINE_MS,
  PHOTO_ANALYSIS_TIMEOUT_MS,
  parsePhotoAnalysisResponse,
  PhotoAnalysisOutputError,
} from '../src/openai-client';
import { RUN_AUTH_WAIT_MS, RUN_LOG_WRITE_MIN_MS } from '../src/photo-analysis-run-log';

const USAGE = {
  input_tokens: 1200,
  input_tokens_details: { cached_tokens: 800 },
  output_tokens: 300,
  output_tokens_details: { reasoning_tokens: 200 },
  total_tokens: 1500,
};

test('usage를 입력·캐시·출력·추론·합계로 읽는다 (사진 1장 원가의 재료)', () => {
  const parsed = parsePhotoAnalysisResponse({
    id: 'resp_1',
    model: 'gpt-5.4-mini-2026-03-17',
    output_text: '{"ok":true}',
    usage: USAGE,
  });

  assert.deepEqual(parsed.usage, { input: 1200, cached: 800, output: 300, reasoning: 200, total: 1500 });
  assert.deepEqual(parsed.result, { ok: true });
  assert.equal(parsed.responseId, 'resp_1');
});

test('model은 요청값이 아니라 응답이 준 실제 스냅샷이다', () => {
  const parsed = parsePhotoAnalysisResponse({
    id: 'resp_1',
    model: 'gpt-5.4-mini-2026-03-17',
    output_text: '{}',
    usage: USAGE,
  });

  assert.equal(parsed.model, 'gpt-5.4-mini-2026-03-17');
});

test('usage가 없는 응답은 null — 0으로 채우면 원가가 싸게 잡힌다', () => {
  const parsed = parsePhotoAnalysisResponse({ id: 'resp_1', model: 'm', output_text: '{}' });

  assert.equal(parsed.usage, null);
});

test('JSON이 깨져도 usage·responseId를 에러에 싣는다 — 돈은 이미 나갔다', () => {
  assert.throws(
    () =>
      parsePhotoAnalysisResponse({
        id: 'resp_broken',
        model: 'm',
        output_text: '{"transcription": "학생 글씨',
        usage: USAGE,
      }),
    (error: unknown) => {
      assert.ok(error instanceof PhotoAnalysisOutputError);
      assert.equal(error.kind, 'parse_failed');
      assert.equal(error.responseId, 'resp_broken');
      // 실패 행도 실제 스냅샷을 남긴다 — 원가를 모델별로 낼 때 빠지지 않게
      assert.equal(error.model, 'm');
      assert.deepEqual(error.usage, { input: 1200, cached: 800, output: 300, reasoning: 200, total: 1500 });
      // 학생 글씨가 로그로 새면 안 된다
      assert.ok(!error.message.includes('학생 글씨'));
      return true;
    },
  );
});

test('출력이 비어 있으면 empty_output으로 던지고 usage를 싣는다', () => {
  assert.throws(
    () => parsePhotoAnalysisResponse({ id: 'resp_empty', model: 'm', output_text: '   ', usage: USAGE }),
    (error: unknown) => {
      assert.ok(error instanceof PhotoAnalysisOutputError);
      assert.equal(error.kind, 'empty_output');
      assert.equal(error.usage?.total, 1500);
      return true;
    },
  );
});

// 넘치면 분석이 성공해도 학생은 504, 원장엔 행이 없다 (09.23~24 astra·Fable 코드리뷰)
test('예산 ①: AI 마감 + 인증 대기 뒤에도 원장 쓰기에 최소 3초가 남는다 (응답 마감 57초 안)', () => {
  assert.ok(PHOTO_ANALYSIS_DEADLINE_MS > PHOTO_ANALYSIS_TIMEOUT_MS);
  assert.ok(PHOTO_ANALYSIS_DEADLINE_MS + RUN_AUTH_WAIT_MS + RUN_LOG_WRITE_MIN_MS <= RESPONSE_DEADLINE_MS);
});

test('예산 ②: 응답 마감 + 파싱·응답 여유(3초)가 함수 한도(60초) 안에 든다', () => {
  assert.ok(RESPONSE_DEADLINE_MS + 3_000 <= ANALYZE_PHOTO_TIMEOUT_SECONDS * 1000);
});
