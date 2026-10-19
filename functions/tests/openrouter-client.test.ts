import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

import { buildMethodContextText } from '../src/analyze-photo-core';
import { PHOTO_ANALYSIS_SCHEMA, PHOTO_ANALYSIS_SYSTEM_PROMPT } from '../src/openai-client';
import {
  buildOpenRouterPhotoBody,
  OpenRouterPhotoError,
  parseOpenRouterPhotoResponse,
  requestPhotoAnalysisFromOpenRouter,
} from '../src/openrouter-client';
import { classifyAnalyzeError } from '../src/photo-analysis-run-log';

// 10.19 새 길. 묶는 것: 운영 본문 = 10.18 측정 본문(측정 도구 sonnet_us) — 「잰 길과 같다」의 유일한 증거.
// test-lib/tests/ 에서 돈다 → 저장소 루트는 세 칸 위
const requireCjs = createRequire(__filename);
const measure = requireCjs(path.resolve(__dirname, '../../../scripts/measure-model-compare/run.cjs')) as {
  MODELS: Record<string, { id: string; provider: unknown }>;
  buildBody: (modelKey: string, prod: { prompt: string; methodContext: string; schema: unknown }, dataUrl: string) => unknown;
};

const IMAGE = 'data:image/jpeg;base64,/9j/AAAA';
const PROD = { prompt: PHOTO_ANALYSIS_SYSTEM_PROMPT, methodContext: buildMethodContextText(), schema: PHOTO_ANALYSIS_SCHEMA };

function bodyOf(model = measure.MODELS.sonnet_us.id) {
  return buildOpenRouterPhotoBody({ model, imageDataUrl: IMAGE, methodContextText: PROD.methodContext });
}

test('운영 본문 = 측정 도구 sonnet_us 본문 (지시문·스키마·생각 예산·max_tokens·provider 다섯 칸까지)', () => {
  assert.deepEqual(bodyOf(), measure.buildBody('sonnet_us', PROD, IMAGE));
});

test('10.18에 잰 sonnet(global)과는 provider.only 한 칸만 다르다', () => {
  const measured = measure.buildBody('sonnet', PROD, IMAGE) as { provider: Record<string, unknown> };
  const prod = bodyOf() as unknown as { provider: Record<string, unknown> };
  assert.deepEqual({ ...prod, provider: { ...prod.provider, only: null } }, {
    ...measured,
    provider: { ...measured.provider, only: null },
  });
  assert.deepEqual(prod.provider.only, ['google-vertex/us']);
  assert.deepEqual(measured.provider.only, ['google-vertex']);
});

test('학생 사진은 ZDR 길로만 · 다른 제공자로 새지 않는다', () => {
  const { provider } = bodyOf();
  assert.equal(provider.zdr, true);
  assert.equal(provider.allow_fallbacks, false);
  assert.equal(provider.data_collection, 'deny');
});

const OK_BODY = {
  id: 'gen-1',
  model: 'anthropic/claude-sonnet-5.5',
  provider: 'Google',
  usage: {
    prompt_tokens: 12696,
    completion_tokens: 4410,
    total_tokens: 17106,
    cost: 0.0764,
    prompt_tokens_details: { cached_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 3200 },
  },
  choices: [{ finish_reason: 'stop', native_finish_reason: 'end_turn', message: { content: '{"ok":true}' } }],
};

test('응답 읽기: usage 옮기기(청구액 포함) · 상류 finish 이름 · 결과', () => {
  const parsed = parseOpenRouterPhotoResponse(OK_BODY);
  assert.deepEqual(parsed.usage, { input: 12696, cached: 0, output: 4410, reasoning: 3200, total: 17106, costUsd: 0.0764 });
  assert.deepEqual(parsed.result, { ok: true });
  assert.equal(parsed.responseId, 'gen-1');
  assert.equal(parsed.model, 'anthropic/claude-sonnet-5.5');
  assert.equal(parsed.finishReason, 'end_turn');
});

function expectKind(body: unknown, kind: string) {
  assert.throws(
    () => parseOpenRouterPhotoResponse(body),
    (error: unknown) => {
      assert.ok(error instanceof OpenRouterPhotoError);
      assert.equal(error.kind, kind);
      assert.equal(classifyAnalyzeError(error, 'openrouter'), kind);
      // 학생 글씨가 에러 메시지로 새지 않는다
      assert.doesNotMatch(error.message, /학생 글씨/);
      return true;
    },
  );
}

test('HTTP 200 + error 본문 → provider_error (usage는 남긴다)', () => {
  expectKind({ ...OK_BODY, choices: [], error: { code: 502, message: 'Provider returned error' } }, 'provider_error');
  try {
    parseOpenRouterPhotoResponse({ ...OK_BODY, error: { code: 502, message: 'x' } });
  } catch (error) {
    assert.equal((error as OpenRouterPhotoError).usage?.costUsd, 0.0764);
  }
});

test('거절 → refusal · 빈 출력 → empty_output · 깨진 JSON → parse_failed', () => {
  expectKind({ ...OK_BODY, choices: [{ finish_reason: 'stop', native_finish_reason: 'refusal', message: { content: '' } }] }, 'refusal');
  expectKind({ ...OK_BODY, choices: [{ finish_reason: 'content_filter', message: { content: null } }] }, 'refusal');
  expectKind({ ...OK_BODY, choices: [{ finish_reason: 'stop', message: { content: '  ' } }] }, 'empty_output');
  expectKind(
    { ...OK_BODY, choices: [{ finish_reason: 'length', native_finish_reason: 'max_tokens', message: { content: '{"transcription": "학생 글씨' } }] },
    'parse_failed',
  );
});

test('보내는 곳·키·이름표·본문 — 가짜 fetch로 실제 요청을 본다', async () => {
  const seen: { url: string; headers: Headers; body: unknown }[] = [];
  const parsed = await requestPhotoAnalysisFromOpenRouter({
    apiKey: 'or-test-key',
    model: 'anthropic/claude-sonnet-5.5',
    imageDataUrl: IMAGE,
    methodContextText: PROD.methodContext,
    fetch: async (url, init) => {
      seen.push({ url: String(url), headers: new Headers(init?.headers as HeadersInit), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify(OK_BODY), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(seen[0].headers.get('authorization'), 'Bearer or-test-key');
  assert.equal(seen[0].headers.get('x-title'), 'dasida-app');
  assert.deepEqual(seen[0].body, JSON.parse(JSON.stringify(bodyOf('anthropic/claude-sonnet-5.5'))));
  assert.deepEqual(parsed.result, { ok: true });
});

test('402(잔액)·429는 재시도 없이 한 번에 실패 → provider_error', async () => {
  for (const status of [402, 429]) {
    const calls = { n: 0 };
    await assert.rejects(
      requestPhotoAnalysisFromOpenRouter({
        apiKey: 'k',
        model: 'anthropic/claude-sonnet-5.5',
        imageDataUrl: IMAGE,
        methodContextText: '',
        fetch: async () => {
          calls.n += 1;
          return new Response(JSON.stringify({ error: { message: 'Insufficient credits', code: status } }), {
            status,
            headers: { 'content-type': 'application/json', 'retry-after': '30' },
          });
        },
      }),
      (error: unknown) => {
        assert.equal(classifyAnalyzeError(error, 'openrouter'), 'provider_error');
        // 같은 에러라도 옛 길이면 옛 이름 — 옛 행과 이어 센다
        assert.equal(classifyAnalyzeError(error, 'openai'), 'openai_error');
        return true;
      },
    );
    assert.equal(calls.n, 1);
  }
});
