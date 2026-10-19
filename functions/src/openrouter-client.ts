import OpenAI, { type ClientOptions } from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

import {
  PHOTO_ANALYSIS_DEADLINE_MS,
  PHOTO_ANALYSIS_SCHEMA,
  PHOTO_ANALYSIS_SYSTEM_PROMPT,
  PHOTO_ANALYSIS_TIMEOUT_MS,
  type PhotoAnalysisUsage,
} from './openai-client';

// 사진 본 분석을 OpenRouter → Google Vertex(미국) Claude Sonnet 5.5로 보내는 길 (10.19 astra·Fable → 기윤 (a)).
// 요청 본문은 10.18 측정 본문(scripts/measure-model-compare/run.cjs buildBody)과 글자 그대로 같아야 한다 —
// OpenRouter가 생각 예산·스키마를 Vertex에 어떻게 옮기는지는 밖에서 안 보여서, 본문이 다르면 「잰 길」이 아니다.
// 측정과 다른 건 provider.only 하나: 측정은 global로 청구됐고 운영은 방침에 「미국」으로 적으려고 us로 좁힌다.
// openrouter-client.test.ts가 측정 도구의 sonnet_us 본문과 deep-equal로 묶는다.
// openai-client.ts에 넣지 않은 이유: 측정 도구(load-prod.cjs)가 그 파일을 허용한 import만으로 컴파일한다.

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const OPENROUTER_PHOTO_PROVIDER = {
  only: ['google-vertex/us'],
  allow_fallbacks: false,
  require_parameters: true,
  data_collection: 'deny',
  zdr: true,
};

// Sonnet 5.5는 effort: medium이면 생각 0토큰이었다(10.18 측정) → 생각 예산을 숫자로 준다
export const OPENROUTER_PHOTO_REASONING = { max_tokens: 16000 };
export const OPENROUTER_PHOTO_MAX_TOKENS = 32000;
// 원장 reasoningEffort 칸에 남기는 글자 — effort 이름이 아니라 생각 예산 숫자로 보냈다는 표시
export const OPENROUTER_PHOTO_REASONING_LABEL = 'max_tokens:16000';

export function buildOpenRouterPhotoBody({
  model,
  imageDataUrl,
  methodContextText,
}: {
  model: string;
  imageDataUrl: string;
  methodContextText: string;
}) {
  return {
    model,
    messages: [
      { role: 'system', content: PHOTO_ANALYSIS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: methodContextText },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'photo_analysis_result', strict: true, schema: PHOTO_ANALYSIS_SCHEMA },
    },
    reasoning: OPENROUTER_PHOTO_REASONING,
    max_tokens: OPENROUTER_PHOTO_MAX_TOKENS,
    usage: { include: true },
    provider: OPENROUTER_PHOTO_PROVIDER,
  };
}

// 원장 errorKind로 그대로 간다. 메시지에 학생 글씨(content)를 넣지 않는다 — openai-client.ts의 PhotoAnalysisOutputError와 같은 선
export type OpenRouterPhotoErrorKind = 'provider_error' | 'refusal' | 'empty_output' | 'parse_failed';

export class OpenRouterPhotoError extends Error {
  constructor(
    public readonly kind: OpenRouterPhotoErrorKind,
    public readonly responseId: string | null,
    public readonly model: string | null,
    public readonly usage: PhotoAnalysisUsage | null,
    public readonly finishReason: string | null,
    detail: string,
  ) {
    super(`OpenRouter photo analysis ${kind}: ${detail}`);
    this.name = 'OpenRouterPhotoError';
  }
}

type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens?: number } | null;
  completion_tokens_details?: { reasoning_tokens?: number } | null;
};

type ChatChoice = {
  finish_reason?: string | null;
  native_finish_reason?: string | null;
  message?: { content?: unknown; refusal?: unknown } | null;
};

type ChatBody = {
  id?: unknown;
  model?: unknown;
  usage?: ChatUsage | null;
  choices?: ChatChoice[] | null;
  error?: { message?: unknown; code?: unknown } | null;
};

function readOpenRouterUsage(usage: ChatUsage | null | undefined): PhotoAnalysisUsage | null {
  if (!usage || typeof usage.prompt_tokens !== 'number' || typeof usage.completion_tokens !== 'number') {
    return null;
  }

  return {
    input: usage.prompt_tokens,
    cached: usage.prompt_tokens_details?.cached_tokens ?? 0,
    output: usage.completion_tokens,
    reasoning: usage.completion_tokens_details?.reasoning_tokens ?? 0,
    total: usage.total_tokens ?? usage.prompt_tokens + usage.completion_tokens,
    costUsd: typeof usage.cost === 'number' ? usage.cost : null,
  };
}

// usage를 먼저 읽는다 — 실패해도 이미 청구된 비용이 원장에 남게(openai-client.ts parsePhotoAnalysisResponse와 같은 순서)
export function parseOpenRouterPhotoResponse(body: unknown): {
  result: unknown;
  responseId: string;
  model: string;
  usage: PhotoAnalysisUsage | null;
  finishReason: string | null;
} {
  const record = (typeof body === 'object' && body !== null ? body : {}) as ChatBody;
  const usage = readOpenRouterUsage(record.usage);
  const responseId = typeof record.id === 'string' ? record.id : null;
  const model = typeof record.model === 'string' ? record.model : null;
  const choice = record.choices?.[0];
  // OpenRouter가 고른 이름(stop·length·content_filter·error)보다 상류 이름(end_turn·max_tokens·refusal)이 더 말해 준다
  const finishReason = choice?.native_finish_reason ?? choice?.finish_reason ?? null;
  const fail = (kind: OpenRouterPhotoErrorKind, detail: string): never => {
    throw new OpenRouterPhotoError(kind, responseId, model, usage, finishReason, detail);
  };

  // 상류 실패를 HTTP 200 + error 본문으로 줄 때가 있다(OpenRouter 문서 「Check the body for an error field even on a 200」)
  if (record.error) {
    const message = typeof record.error.message === 'string' ? record.error.message : 'unknown';
    fail('provider_error', `${String(record.error.code ?? '')} ${message}`.trim().slice(0, 160));
  }

  const refusal = choice?.message?.refusal;
  if ((typeof refusal === 'string' && refusal.trim()) || finishReason === 'refusal' || choice?.finish_reason === 'content_filter') {
    fail('refusal', finishReason ?? 'refusal');
  }

  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) fail('empty_output', finishReason ?? 'no content');

  let result: unknown;
  try {
    result = JSON.parse((content as string).trim());
  } catch {
    fail('parse_failed', finishReason ?? 'invalid json');
  }

  return { result, responseId: responseId ?? '', model: model ?? '', usage, finishReason };
}

export async function requestPhotoAnalysisFromOpenRouter({
  apiKey,
  model,
  imageDataUrl,
  methodContextText,
  deadlineMs = PHOTO_ANALYSIS_DEADLINE_MS,
  fetch,
}: {
  apiKey: string;
  model: string;
  imageDataUrl: string;
  methodContextText: string;
  // 이 호출에 남은 시간 — 부르는 쪽이 예산에서 게이트·라우팅이 쓴 시간을 빼서 준다
  deadlineMs?: number;
  // 테스트가 가짜 응답을 꽂는 자리. 운영은 비운다
  fetch?: ClientOptions['fetch'];
}): Promise<{
  result: unknown;
  responseId: string;
  model: string;
  usage: PhotoAnalysisUsage | null;
  finishReason: string | null;
}> {
  // 재시도 0 · 시도당 150초 · 본문까지 마감 — mini 길(requestPhotoAnalysisFromOpenAI)과 같은 규약
  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    timeout: PHOTO_ANALYSIS_TIMEOUT_MS,
    maxRetries: 0,
    // OpenRouter 사용량 화면에서 운영 호출을 측정(dasida-measure)과 가르는 이름표. 본문은 안 바꾼다
    defaultHeaders: { 'X-Title': 'dasida-app' },
    ...(fetch ? { fetch } : {}),
  });

  // provider·reasoning·usage는 SDK 타입에 없는 OpenRouter 칸이다 — SDK는 본문을 그대로 보낸다
  const body = buildOpenRouterPhotoBody({ model, imageDataUrl, methodContextText });
  const response = await client.chat.completions.create(body as unknown as ChatCompletionCreateParamsNonStreaming, {
    signal: AbortSignal.timeout(deadlineMs),
  });

  return parseOpenRouterPhotoResponse(response);
}
