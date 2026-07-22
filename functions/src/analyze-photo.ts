import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import {
  buildMethodContextText,
  buildPhotoRouterResult,
} from './analyze-photo-core';
import { requestPhotoAnalysisFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiVisionModel = defineString('OPENAI_VISION_MODEL', { default: 'gpt-4.1' });

// base64 +33% 감안 원본 약 6MB 상한 — 요청 크기·비용 가드 (웹은 1568px로 축소해 보냄)
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;

const AnalyzePhotoRequestSchema = z.object({
  imageDataUrl: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(MAX_IMAGE_DATA_URL_LENGTH),
});

// 정적 카탈로그 프롬프트 — 요청마다 재생성할 필요 없음
const METHOD_CONTEXT_TEXT = buildMethodContextText();

const VisionRawResultSchema = z.object({
  hasSolvingWork: z.boolean(),
  userAnswer: z.string().nullable(),
  transcription: z.string(),
  predictedMethodId: z.string(),
  confidence: z.number().min(0).max(1),
  candidateMethodIds: z.array(z.string()).min(1).max(4),
  reason: z.string(),
});

export const analyzePhoto = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
    // 비용 가드: 공개 엔드포인트라 병렬 vision 호출 상한을 걸어둔다 (3인스턴스 × 5동시 = 최대 15)
    maxInstances: 3,
    concurrency: 5,
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsedRequest = AnalyzePhotoRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      const openAiResponse = await requestPhotoAnalysisFromOpenAI({
        apiKey: openAiApiKey.value(),
        model: openAiVisionModel.value(),
        imageDataUrl: parsedRequest.data.imageDataUrl,
        methodContextText: METHOD_CONTEXT_TEXT,
      });

      const raw = VisionRawResultSchema.parse(openAiResponse.result);
      const result = buildPhotoRouterResult(raw);

      // Firestore 런 로그(diagnoseMethod의 logDiagnosisMethodRun 상당)는 프로토타입 단계라 의도적으로 생략.
      // 정확도 데이터가 필요해지면(검증 B 이후) 추가한다.
      logger.info('analyzePhoto done', {
        predictedMethodId: result.predictedMethodId,
        confidence: result.confidence,
        hasSolvingWork: result.hasSolvingWork,
        needsManualSelection: result.needsManualSelection,
        model: openAiResponse.model,
        responseId: openAiResponse.responseId,
      });

      response.status(200).json(result);
    } catch (error) {
      logger.error('analyzePhoto failed', error);
      response.status(500).json({ error: 'Failed to analyze photo' });
    }
  }
);
