import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import {
  ANALYZE_PHOTO_TIMEOUT_SECONDS,
  buildMethodContextText,
  buildPhotoRouterResult,
  responseBudgetMs,
} from './analyze-photo-core';
import {
  requestPhotoAnalysisFromOpenAI,
  requestPhotoRotationFromOpenAI,
  type PhotoAnalysisUsage,
} from './openai-client';
import {
  photoAiDeadlineMs,
  readRunRequestContext,
  resolveRunAuth,
  RUN_AUTH_WAIT_MS,
  unresolvedRunAuth,
  withTimeout,
  writePhotoAnalysisRun,
  type RunResultSummary,
} from './photo-analysis-run-log';
import { buildGateBlockedResult, photoGateView, runPhotoGate, type PhotoGateRecord } from './photo-gate';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
// 손글씨 시험지 실측(같은 사진 3회씩): 생각 끈 모델은 인수분해 오류를 못 잡는다.
// gpt-4.1 1/3 · gpt-5.4-mini(생각 off) 1/3 · gpt-5.4-nano(off) 0/3 → 생각 켜면 전부 3/3.
// .env.dasida-app은 gitignore라 값이 로컬에만 있다 → 기본값을 운영값과 맞춰 새 체크아웃에서 조용히 강등되지 않게.
const openAiVisionModel = defineString('OPENAI_VISION_MODEL', { default: 'gpt-5.4-mini' });
// 빈 문자열이면 reasoning을 아예 안 보낸다(gpt-4.1 등 비추론 모델로 되돌릴 때 400 방지).
// high는 3배 느리고(38초) 출력 토큰 3배인데 적중률이 medium과 같아 살 이유가 없었다.
const openAiVisionReasoningEffort = defineString('OPENAI_VISION_REASONING_EFFORT', { default: 'medium' });
// 사진 거르기 회전 판독 모델 — 10.01 실측(회전 11/11·29/29)과 같은 모델. effort는 low 고정(openai-client.ts)
const openAiRotationModel = defineString('OPENAI_ROTATION_MODEL', { default: 'gpt-5.4-mini' });

// base64 +33% 감안 원본 약 6MB 상한 — 요청 크기·비용 가드 (웹은 픽셀 총량 1176×1568로 축소해 보냄)
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
    timeoutSeconds: ANALYZE_PHOTO_TIMEOUT_SECONDS,
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

    // 사용량 원장(photoAnalysisRuns) — 누가·몇 토큰·성공했나. 설계: docs/superpowers/specs/2026-09-23-photo-usage-log-design.md
    // 앱(1.0.9~)은 계정 헤더를, 웹은 참여 코드를 body로 싣는다. 둘은 필드가 따로다(accountKey / participantId).
    const receivedAt = new Date();
    const imageDataUrl = parsedRequest.data.imageDataUrl;
    const modelRequested = openAiVisionModel.value();
    const reasoningEffort = openAiVisionReasoningEffort.value();
    const apiKey = openAiApiKey.value();
    // 인증 검증은 게이트·AI 호출과 동시에 돈다 — 학생 응답을 늦추지 않게.
    // .catch를 바로 붙인다 — AI를 기다리는 동안 처리기 없는 거부가 생기면 Node 22는 인스턴스를 죽인다
    const headers = request.headers as Record<string, string | string[] | undefined>;
    const authPromise = resolveRunAuth(headers).catch(() => unresolvedRunAuth(headers, 'auth_failed'));
    // AI가 끝난 뒤 인증은 2초까지만 더 기다린다 (Firebase 인증서 fetch·Firestore는 걸리면 60초)
    const settleAuth = () => withTimeout(authPromise, RUN_AUTH_WAIT_MS, () => unresolvedRunAuth(headers, 'auth_timeout'));
    const context = readRunRequestContext(request.body, receivedAt);
    const runBase = {
      context,
      receivedAt,
      imageDataUrl,
      modelRequested,
      reasoningEffort: reasoningEffort || null,
      // 게이트·AI·인증·원장이 이 예산 하나에서 나눠 쓴다. 표식(clientDeadlineMs) 없는 1.0.9·옛 웹 탭은 57초 그대로 (astra ①⑤)
      budgetMs: responseBudgetMs(context.clientDeadlineMs),
    };
    let openAi: { model: string; responseId: string; usage: PhotoAnalysisUsage | null } | null = null;
    let gate: PhotoGateRecord | null = null;
    let startedAt = Date.now();

    try {
      // 사진 거르기 — 헤더 크기 → (크기 통과면) 회전 판독 → 판정. 판독이 실패해도 던지지 않고 열어 둔다
      gate = await runPhotoGate(imageDataUrl, () =>
        requestPhotoRotationFromOpenAI({ apiKey, model: openAiRotationModel.value(), imageDataUrl }),
      );
      if (gate.decision !== 'pass') {
        const auth = await settleAuth();
        // 본 호출이 안 돌았다 — durationMs 0, 게이트 시간은 gate.gateMs
        await writePhotoAnalysisRun({ ...runBase, auth, durationMs: 0, openAi: null, gate, outcome: { ok: true, result: null } });
        logger.info('analyzePhoto gated', {
          gate,
          channel: context.channel,
          accountKey: auth.accountKey,
          participantId: context.participantId,
          qa: context.qa,
          retakeOf: context.retakeOf,
        });
        response.status(200).json(buildGateBlockedResult(gate));
        return;
      }

      startedAt = Date.now();
      const openAiResponse = await requestPhotoAnalysisFromOpenAI({
        apiKey,
        model: modelRequested,
        reasoningEffort,
        imageDataUrl,
        methodContextText: METHOD_CONTEXT_TEXT,
        deadlineMs: photoAiDeadlineMs(runBase.budgetMs, startedAt - receivedAt.getTime()),
      });
      openAi = {
        model: openAiResponse.model,
        responseId: openAiResponse.responseId,
        usage: openAiResponse.usage,
      };

      const raw = VisionRawResultSchema.parse(openAiResponse.result);
      const result = buildPhotoRouterResult(raw);
      const durationMs = Date.now() - startedAt;
      const summary: RunResultSummary = {
        predictedMethodId: result.predictedMethodId,
        confidence: result.confidence,
        hasSolvingWork: result.hasSolvingWork,
        needsManualSelection: result.needsManualSelection,
        errorCandidateCount: result.errorCandidates.length,
        errorConfidence: result.errorConfidence,
      };

      // 응답 전에 await — v2는 응답 뒤 작업이 잘릴 수 있다. writePhotoAnalysisRun은 안 던져서 응답을 막지 않는다
      const auth = await settleAuth();
      await writePhotoAnalysisRun({ ...runBase, auth, durationMs, openAi, gate, outcome: { ok: true, result: summary } });
      logger.info('analyzePhoto done', {
        ...summary,
        model: openAiResponse.model,
        responseId: openAiResponse.responseId,
        usage: openAiResponse.usage,
        durationMs,
        gateDecision: gate.decision,
        rotationCheck: gate.rotationCheck,
        gateMs: gate.gateMs,
        channel: context.channel,
        accountKey: auth.accountKey,
        authVerified: auth.authVerified,
        participantId: context.participantId,
        qa: context.qa,
        utmSource: context.utmSource,
      });

      response.status(200).json({ ...result, gate: photoGateView(gate) });
    } catch (error) {
      const durationMs = Date.now() - startedAt; // 인증 대기가 섞이지 않게 먼저 잰다
      logger.error('analyzePhoto failed', error);
      await writePhotoAnalysisRun({
        ...runBase,
        auth: await settleAuth(),
        durationMs,
        openAi,
        gate,
        outcome: { ok: false, error },
      });
      response.status(500).json({ error: 'Failed to analyze photo' });
    }
  }
);
