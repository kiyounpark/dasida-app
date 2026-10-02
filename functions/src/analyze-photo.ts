import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
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
  findFirstReviewCopy,
  photoAiDeadlineMs,
  planRunConsent,
  readRunRequestContext,
  resolveRunAuth,
  reviewPhotoWaitMs,
  RUN_AUTH_WAIT_MS,
  storeReviewCopy,
  unknownRunConsent,
  unresolvedRunAuth,
  withTimeout,
  writePhotoAnalysisRun,
  type RunAuth,
  type RunConsentPlan,
  type RunResultSummary,
} from './photo-analysis-run-log';
import { buildGateBlockedResult, photoGateView, runPhotoGate, type PhotoGateRecord } from './photo-gate';
import { PHOTO_OBJECT_META_SUBMISSION_ID, type ConsentDoc, type PhotoRunConsentFields } from './photo-store-contract';
import { decodeImageDataUrl, firebasePhotoObjectStore, readConsentDoc } from './photo-storage';

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

type Headers = Record<string, string | string[] | undefined>;

/**
 * 바깥(OpenAI·Firestore·Storage)과 닿는 자리. 운영은 liveDeps, 테스트는 가짜를 끼운다 —
 * 1.0.11 동의·검토본을 더하면서 "동의 문서가 없는 요청(1.0.9·1.0.10·웹)은 지금과 같은 응답"을 테스트로 묶으려고 뺐다.
 */
export type AnalyzePhotoDeps = {
  modelRequested: string;
  reasoningEffort: string;
  runGate(imageDataUrl: string): Promise<PhotoGateRecord>;
  analyze(input: {
    imageDataUrl: string;
    deadlineMs: number;
  }): Promise<{ result: unknown; responseId: string; model: string; usage: PhotoAnalysisUsage | null }>;
  resolveAuth(headers: Headers): Promise<RunAuth>;
  readConsent(accountKey: string): Promise<ConsentDoc | null>;
  findFirstReview(accountKey: string, submissionId: string): Promise<{ photoPath: string; expiresAt: string } | null>;
  saveReviewPhoto(photoPath: string, imageDataUrl: string, submissionId: string): Promise<unknown>;
  writeRun: typeof writePhotoAnalysisRun;
};

type AnalyzePhotoRequest = { method: string; body: unknown; headers: unknown };
type AnalyzePhotoResponse = { status(code: number): { json(body: unknown): unknown } };

export async function handleAnalyzePhoto(
  request: AnalyzePhotoRequest,
  response: AnalyzePhotoResponse,
  deps: AnalyzePhotoDeps,
): Promise<void> {
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
  const { modelRequested, reasoningEffort } = deps;
  // 인증 검증은 게이트·AI 호출과 동시에 돈다 — 학생 응답을 늦추지 않게.
  // .catch를 바로 붙인다 — AI를 기다리는 동안 처리기 없는 거부가 생기면 Node 22는 인스턴스를 죽인다
  const headers = request.headers as Headers;
  const authPromise = deps.resolveAuth(headers).catch(() => unresolvedRunAuth(headers, 'auth_failed'));
  const context = readRunRequestContext(request.body, receivedAt);
  // 1.0.11 동의 읽기도 인증 뒤에 같이 돈다(분석은 동의로 막지 않는다 — 기록과 검토본만). 실패하면 unknown
  const consentPromise: Promise<RunConsentPlan> = authPromise
    .then((auth) =>
      planRunConsent({
        auth,
        submissionId: context.submissionId,
        receivedAt,
        readConsent: deps.readConsent,
        findFirstReview: deps.findFirstReview,
      }),
    )
    .catch((): RunConsentPlan => ({ analysisConsent: 'unknown', reviewConsent: 'unknown', review: null }));
  const runBase = {
    context,
    receivedAt,
    imageDataUrl,
    modelRequested,
    reasoningEffort: reasoningEffort || null,
    // 게이트·AI·인증·원장이 이 예산 하나에서 나눠 쓴다. 표식(clientDeadlineMs) 없는 1.0.9·옛 웹 탭은 57초 그대로 (astra ①⑤)
    budgetMs: responseBudgetMs(context.clientDeadlineMs),
  };
  // AI가 끝난 뒤 인증은 2초까지만 더 기다린다 (Firebase 인증서 fetch·Firestore는 걸리면 60초).
  // 동의 읽기도 같은 2초 안에서 — 동의 때문에 기다림이 늘지 않는다. 그다음 검토본(동의한 학생만, 응답 전)
  const settleRun = async (): Promise<{ auth: RunAuth; consent: PhotoRunConsentFields }> => {
    const deadline = Date.now() + RUN_AUTH_WAIT_MS;
    const auth = await withTimeout(authPromise, RUN_AUTH_WAIT_MS, () => unresolvedRunAuth(headers, 'auth_timeout'));
    if (!auth.authVerified) return { auth, consent: unknownRunConsent() };
    const plan = await withTimeout<RunConsentPlan | null>(consentPromise, Math.max(0, deadline - Date.now()), () => null);
    if (!plan) return { auth, consent: unknownRunConsent() };
    const review = await storeReviewCopy({
      plan,
      imageDataUrl,
      save: (photoPath, dataUrl) => deps.saveReviewPhoto(photoPath, dataUrl, context.submissionId ?? ''),
      waitMs: reviewPhotoWaitMs(receivedAt, runBase.budgetMs),
    });
    return {
      auth,
      consent: { analysisConsent: plan.analysisConsent, reviewConsent: plan.reviewConsent, review },
    };
  };
  let openAi: { model: string; responseId: string; usage: PhotoAnalysisUsage | null } | null = null;
  let gate: PhotoGateRecord | null = null;
  let startedAt = Date.now();

  try {
    // 사진 거르기 — 헤더 크기 → (크기 통과면) 회전 판독 → 판정. 판독이 실패해도 던지지 않고 열어 둔다
    gate = await deps.runGate(imageDataUrl);
    if (gate.decision !== 'pass') {
      const { auth, consent } = await settleRun();
      // 본 호출이 안 돌았다 — durationMs 0, 게이트 시간은 gate.gateMs
      await deps.writeRun({ ...runBase, auth, consent, durationMs: 0, openAi: null, gate, outcome: { ok: true, result: null } });
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
    const openAiResponse = await deps.analyze({
      imageDataUrl,
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

    // 응답 전에 await — v2는 응답 뒤 작업이 잘릴 수 있다. writePhotoAnalysisRun·검토본은 안 던져서 응답을 막지 않는다
    const { auth, consent } = await settleRun();
    await deps.writeRun({ ...runBase, auth, consent, durationMs, openAi, gate, outcome: { ok: true, result: summary } });
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
      review: consent.review.status,
    });

    response.status(200).json({ ...result, gate: photoGateView(gate) });
  } catch (error) {
    const durationMs = Date.now() - startedAt; // 인증 대기가 섞이지 않게 먼저 잰다
    logger.error('analyzePhoto failed', error);
    const { auth, consent } = await settleRun();
    await deps.writeRun({
      ...runBase,
      auth,
      consent,
      durationMs,
      openAi,
      gate,
      outcome: { ok: false, error },
    });
    response.status(500).json({ error: 'Failed to analyze photo' });
  }
}

function liveDeps(): AnalyzePhotoDeps {
  const apiKey = openAiApiKey.value();
  const reasoningEffort = openAiVisionReasoningEffort.value();
  const modelRequested = openAiVisionModel.value();
  const firestore = getFirestore();
  return {
    modelRequested,
    reasoningEffort,
    runGate: (imageDataUrl) =>
      runPhotoGate(imageDataUrl, () =>
        requestPhotoRotationFromOpenAI({ apiKey, model: openAiRotationModel.value(), imageDataUrl }),
      ),
    analyze: ({ imageDataUrl, deadlineMs }) =>
      requestPhotoAnalysisFromOpenAI({
        apiKey,
        model: modelRequested,
        reasoningEffort,
        imageDataUrl,
        methodContextText: METHOD_CONTEXT_TEXT,
        deadlineMs,
      }),
    resolveAuth: (headers) => resolveRunAuth(headers),
    readConsent: (accountKey) => readConsentDoc(firestore, accountKey),
    findFirstReview: (accountKey, submissionId) => findFirstReviewCopy(firestore, accountKey, submissionId),
    saveReviewPhoto: (photoPath, imageDataUrl, submissionId) => {
      const { bytes, contentType } = decodeImageDataUrl(imageDataUrl);
      // 이미 있으면 덮지 않는다 — 버킷 수명(생성 후 30일)이 재시도로 늘지 않게
      return firebasePhotoObjectStore().save(photoPath, bytes, {
        contentType,
        metadata: { [PHOTO_OBJECT_META_SUBMISSION_ID]: submissionId },
        onlyIfAbsent: true,
      });
    },
    writeRun: writePhotoAnalysisRun,
  };
}

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
  (request, response) => handleAnalyzePhoto(request, response, liveDeps()),
);
