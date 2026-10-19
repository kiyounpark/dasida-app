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
  OPENROUTER_PHOTO_REASONING_LABEL,
  OpenRouterPhotoError,
  requestPhotoAnalysisFromOpenRouter,
} from './openrouter-client';
import {
  choosePhotoProvider,
  parsePhotoRoutingConfig,
  PHOTO_ROUTING_DOC_PATH,
  PHOTO_ROUTING_WAIT_MS,
  routingNeedsAuth,
  shouldFallbackToMini,
  type PhotoAnalysisProvider,
  type PhotoRoutingConfig,
} from './photo-analysis-routing';
import {
  classifyAnalyzeError,
  defaultRunRoute,
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
  type RunRoute,
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
// 10.19 새 길(OpenRouter → Vertex 미국 Sonnet 5.5). 켜고 끄는 건 env가 아니라 Firestore 스위치 문서(photo-analysis-routing.ts).
// 키는 측정 키와 따로 — OpenRouter 키 한도가 곧 운영 지출 상한이다
const openRouterApiKey = defineSecret('OPENROUTER_API_KEY');
const openRouterPhotoModel = defineString('OPENROUTER_PHOTO_MODEL', { default: 'anthropic/claude-sonnet-5.5' });

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
  // 10.19 새 길 — 스위치(config/photoAnalysis)가 켜져 있을 때만 부른다(onlyAccounts면 그 계정만)
  openRouterModelRequested: string;
  analyzeOpenRouter(input: {
    imageDataUrl: string;
    deadlineMs: number;
  }): Promise<{
    result: unknown;
    responseId: string;
    model: string;
    usage: PhotoAnalysisUsage | null;
    finishReason: string | null;
  }>;
  readRouting(): Promise<PhotoRoutingConfig | null>;
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
  // 10.19 본 분석 길 스위치(config/photoAnalysis) — 게이트와 같이 돌린다. 못 읽으면 null = mini
  const routingPromise: Promise<PhotoRoutingConfig | null> = deps.readRouting().catch(() => null);
  // 어느 길로 갈지 — 스위치(+ onlyAccounts면 인증)를 2초 안에 못 정하면 mini (photo-analysis-routing.ts)
  const resolveProvider = async (): Promise<PhotoAnalysisProvider> => {
    const deadline = Date.now() + PHOTO_ROUTING_WAIT_MS;
    const config = await withTimeout(routingPromise, PHOTO_ROUTING_WAIT_MS, () => null);
    const auth = routingNeedsAuth(config)
      ? await withTimeout<RunAuth | null>(authPromise, Math.max(0, deadline - Date.now()), () => null)
      : null;
    return choosePhotoProvider({ config, auth });
  };
  let openAi: { model: string; responseId: string; usage: PhotoAnalysisUsage | null } | null = null;
  let gate: PhotoGateRecord | null = null;
  let route: RunRoute = defaultRunRoute();
  let startedAt = Date.now();
  // 원장에 남길 요청 모델·생각 설정 — 결과를 낸(실패면 마지막으로 부른) 길 기준
  const requested = () =>
    route.provider === 'openrouter'
      ? { modelRequested: deps.openRouterModelRequested, reasoningEffort: OPENROUTER_PHOTO_REASONING_LABEL }
      : { modelRequested, reasoningEffort: reasoningEffort || null };
  // 한 길로 부르고 모양까지 확인한다 — 모양이 깨진 것도 그 길의 실패라 폴백 판단에 같이 든다.
  // openAi는 응답이 오자마자 채운다(모양이 깨져도 원장에 모델·토큰이 남게)
  const analyzeVia = async (provider: PhotoAnalysisProvider, deadlineMs: number) => {
    const call = provider === 'openrouter' ? deps.analyzeOpenRouter : deps.analyze;
    const analyzed: Awaited<ReturnType<AnalyzePhotoDeps['analyze']>> & { finishReason?: string | null } = await call({
      imageDataUrl,
      deadlineMs,
    });
    openAi = { model: analyzed.model, responseId: analyzed.responseId, usage: analyzed.usage };
    const raw = VisionRawResultSchema.parse(analyzed.result);
    return { analyzed, raw };
  };

  try {
    // 사진 거르기 — 헤더 크기 → (크기 통과면) 회전 판독 → 판정. 판독이 실패해도 던지지 않고 열어 둔다
    gate = await deps.runGate(imageDataUrl);
    if (gate.decision !== 'pass') {
      const { auth, consent } = await settleRun();
      // 본 호출이 안 돌았다 — durationMs 0, 게이트 시간은 gate.gateMs · provider null
      route = { ...defaultRunRoute(), provider: null };
      await deps.writeRun({
        ...runBase,
        auth,
        consent,
        route,
        durationMs: 0,
        openAi: null,
        gate,
        outcome: { ok: true, result: null },
      });
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

    route = { ...defaultRunRoute(), provider: await resolveProvider() };
    startedAt = Date.now();
    const deadlineMs = photoAiDeadlineMs(runBase.budgetMs, startedAt - receivedAt.getTime());
    let attempt: Awaited<ReturnType<typeof analyzeVia>>;
    if (route.provider === 'openrouter') {
      try {
        attempt = await analyzeVia('openrouter', deadlineMs);
      } catch (error) {
        // 빠른 실패(잔액 402·429·5xx·거절·모양 깨짐)면 같은 요청 안에서 mini 한 번 — 학생은 결과를 받는다.
        // 타임아웃 뒤엔 시간이 없다. 이 행은 새 길 실패로 센다(fallbackFrom)
        const kind = classifyAnalyzeError(error, 'openrouter');
        const remainingMs = deadlineMs - (Date.now() - startedAt);
        if (!shouldFallbackToMini(kind, remainingMs)) throw error;
        const message = error instanceof Error ? error.message : String(error);
        // 돈 든 실패(모양 깨짐·거절 등)의 Sonnet 청구는 원장 usage에 안 남는다(mini 것만) — 로그에 남겨 지출을 센다
        const usage = error instanceof OpenRouterPhotoError ? error.usage : null;
        logger.warn('analyzePhoto openrouter failed — falling back to mini', { kind, remainingMs, message, usage });
        route = {
          provider: 'openai',
          fallbackFrom: 'openrouter',
          fallbackReason: `${kind}: ${message}`.slice(0, 200),
          finishReason: null,
        };
        openAi = null;
        attempt = await analyzeVia('openai', remainingMs);
      }
    } else {
      attempt = await analyzeVia('openai', deadlineMs);
    }
    const { analyzed: openAiResponse, raw } = attempt;
    if (route.provider === 'openrouter') {
      route = { ...route, finishReason: openAiResponse.finishReason ?? null };
    }

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
    await deps.writeRun({
      ...runBase,
      ...requested(),
      auth,
      consent,
      route,
      durationMs,
      openAi,
      gate,
      outcome: { ok: true, result: summary },
    });
    logger.info('analyzePhoto done', {
      ...summary,
      provider: route.provider,
      fallbackFrom: route.fallbackFrom,
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
      ...requested(),
      auth,
      consent,
      route,
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
    openRouterModelRequested: openRouterPhotoModel.value(),
    analyzeOpenRouter: async ({ imageDataUrl, deadlineMs }) => {
      // 키가 비면 OpenAI SDK가 env의 OPENAI_API_KEY로 채워 OpenAI 키를 OpenRouter로 보낸다(Fable 리뷰 기록만 2) — 먼저 막는다
      const apiKey = openRouterApiKey.value();
      if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');
      return requestPhotoAnalysisFromOpenRouter({
        apiKey,
        model: openRouterPhotoModel.value(),
        imageDataUrl,
        methodContextText: METHOD_CONTEXT_TEXT,
        deadlineMs,
      });
    },
    readRouting: async () => parsePhotoRoutingConfig((await firestore.doc(PHOTO_ROUTING_DOC_PATH).get()).data()),
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
    secrets: [openAiApiKey, openRouterApiKey],
    // 비용 가드: 공개 엔드포인트라 병렬 vision 호출 상한을 걸어둔다 (3인스턴스 × 5동시 = 최대 15)
    maxInstances: 3,
    concurrency: 5,
  },
  (request, response) => handleAnalyzePhoto(request, response, liveDeps()),
);
