import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import OpenAI from 'openai';

import {
  buildQuizVerifyInput,
  gateQuizVerdict,
  judgeQuizVerify,
  QUIZ_VERIFY_INSTRUCTIONS,
  QUIZ_VERIFY_SCHEMA,
  VERIFY_QUIZ_OPENAI_TIMEOUT_MS,
  VERIFY_QUIZ_TIMEOUT_SECONDS,
  VerifyQuizModelResultSchema,
  VerifyQuizRequestSchema,
} from './verify-quiz-core';

// 쪽지·재도전 검산(요청 2). 호출자는 웹 프로토뿐 — 문항 하나당 요청 하나.
// openai-client.ts·analyze-photo*.ts는 import하지 않는다 — 다른 세션이 요청 1을 고쳐도 이쪽 빌드는 안 깨진다.
const openAiApiKey = defineSecret('OPENAI_API_KEY');
const verifyModel = defineString('OPENAI_VERIFY_MODEL', { default: 'gpt-5.4-mini' });
// 09.30 측정: low가 medium보다 빠르고(가운데 1.6초 vs 2.4초) 오탐도 적었다(0/54 vs 2/54).
const verifyReasoningEffort = defineString('OPENAI_VERIFY_REASONING_EFFORT', { default: 'low' });

export const verifyQuiz = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: VERIFY_QUIZ_TIMEOUT_SECONDS,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
    // 비용 가드: 사진 없는 짧은 호출(입력 ~245·출력 ~289 토큰)이라도 공개 엔드포인트라 상한을 건다
    maxInstances: 2,
    concurrency: 10,
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsedRequest = VerifyQuizRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const { kind, setup, prompt, options, marked, submissionId, qa } = parsedRequest.data;
    const model = verifyModel.value();
    const effort = verifyReasoningEffort.value();
    const startedAt = Date.now();

    try {
      const client = new OpenAI({
        apiKey: openAiApiKey.value(),
        timeout: VERIFY_QUIZ_OPENAI_TIMEOUT_MS,
        maxRetries: 0,
      });
      const openAiResponse = await client.responses.create({
        model,
        ...(effort ? { reasoning: { effort: effort as 'low' | 'medium' | 'high' } } : {}),
        instructions: QUIZ_VERIFY_INSTRUCTIONS,
        // marked는 여기 안 넣는다 — buildQuizVerifyInput은 setup·prompt·options만 받는다
        input: [{ role: 'user', content: [{ type: 'input_text', text: buildQuizVerifyInput({ setup, prompt, options }) }] }],
        text: {
          format: {
            type: 'json_schema',
            name: 'quiz_verify',
            schema: QUIZ_VERIFY_SCHEMA as unknown as Record<string, unknown>,
            strict: true,
          },
        },
      });

      const outputText = openAiResponse.output_text?.trim();
      if (!outputText) throw new Error('OpenAI response did not include output_text');
      const result = VerifyQuizModelResultSchema.parse(JSON.parse(outputText));
      const rawVerdict = judgeQuizVerify(result.answerIndex, marked);
      const verdict = gateQuizVerdict(rawVerdict);
      const durationMs = Date.now() - startedAt;

      // 문항 본문·solved는 안 남긴다 — 판정과 비용만
      logger.info('verifyQuiz done', {
        kind,
        verdict,
        rawVerdict,
        answerIndex: result.answerIndex,
        marked,
        durationMs,
        model,
        responseId: openAiResponse.id,
        usage: openAiResponse.usage
          ? {
              input: openAiResponse.usage.input_tokens,
              output: openAiResponse.usage.output_tokens,
              reasoning: openAiResponse.usage.output_tokens_details?.reasoning_tokens ?? null,
            }
          : null,
        qa: qa ?? false,
        submissionId: submissionId ?? null,
      });

      response.status(200).json({ verdict, answerIndex: result.answerIndex, model, durationMs });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logger.error('verifyQuiz failed', {
        kind,
        durationMs,
        timeout: error instanceof OpenAI.APIConnectionTimeoutError,
        message: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
        qa: qa ?? false,
        submissionId: submissionId ?? null,
      });
      response.status(500).json({ error: 'verify_failed' });
    }
  }
);
