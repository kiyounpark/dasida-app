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
// 손글씨 시험지 실측(같은 사진 3회씩): 생각 끈 모델은 인수분해 오류를 못 잡는다.
// gpt-4.1 1/3 · gpt-5.4-mini(생각 off) 1/3 · gpt-5.4-nano(off) 0/3 → 생각 켜면 전부 3/3.
// .env.dasida-app은 gitignore라 값이 로컬에만 있다 → 기본값을 운영값과 맞춰 새 체크아웃에서 조용히 강등되지 않게.
const openAiVisionModel = defineString('OPENAI_VISION_MODEL', { default: 'gpt-5.4-mini' });
// 빈 문자열이면 reasoning을 아예 안 보낸다(gpt-4.1 등 비추론 모델로 되돌릴 때 400 방지).
// high는 3배 느리고(38초) 출력 토큰 3배인데 적중률이 medium과 같아 살 이유가 없었다.
const openAiVisionReasoningEffort = defineString('OPENAI_VISION_REASONING_EFFORT', { default: 'medium' });

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
  errorCandidates: z.array(z.unknown()).max(2),
  errorConfidence: z.number().min(0).max(1),
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
        reasoningEffort: openAiVisionReasoningEffort.value(),
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
        errorCandidateCount: result.errorCandidates.length,
        errorConfidence: result.errorConfidence,
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
