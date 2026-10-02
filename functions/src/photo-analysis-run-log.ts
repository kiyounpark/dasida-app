import { createHash } from 'node:crypto';

import * as logger from 'firebase-functions/logger';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai';
import { ZodError } from 'zod';

import {
  authenticateLearningHistoryRequest,
  getLearningHistoryRequestAccountKey,
} from './learning-history-auth';
import { PHOTO_ANALYSIS_DEADLINE_MS, PhotoAnalysisOutputError, type PhotoAnalysisUsage } from './openai-client';
import type { PhotoGateRecord } from './photo-gate';
import {
  isConsentOn,
  reviewExpiresAt,
  reviewPhotoPath,
  type ConsentDoc,
  type PhotoRunConsentFields,
} from './photo-store-contract';

// 사진 분석 사용량 원장. 설계: docs/superpowers/specs/2026-09-23-photo-usage-log-design.md
// 사진 1장(호출 1번)당 문서 1개, 문서 id(자동)가 시도 id다. 보존은 영구 — Cloud Logging은 30일이면 사라져 판정을 못 센다.
//
// v2(10.01, 사진 거르기): gate · retakeOf · clientDeadlineMs 추가. 걸린 행 = ok:true · httpStatus 200 · result null ·
// durationMs 0(본 호출이 안 돌았다 — 게이트 시간은 gate.gateMs). 집계 규칙 둘 (v1·v2 공통, astra ⑥):
//   분석 성공 = ok && result !== null   — v1 행도, 게이트 판독이 실패(skipped_*)한 뒤 분석에 성공한 행도 들어간다
//   게이트 걸림 = gate.decision이 'blocked'로 시작 (v2만)
// "ok && gate.decision === 'pass'"로 세지 않는다 — v1 행과 skipped 뒤 성공이 빠진다.
//
// 1.0.11(같은 v2, 칸만 더함): analysisConsent · reviewConsent · review (약속 파일 PhotoRunConsentFields).
// 이 칸이 없는 옛 행 = unknown·skipped로 읽는다. 동의 문서가 없는 계정(1.0.10 이하·아직 동의 화면 전)도 unknown —
// "안 물어봄"은 "거부"가 아니다. 분석은 동의로 막지 않는다. 기록만 한다.
export const PHOTO_ANALYSIS_RUNS_COLLECTION = 'photoAnalysisRuns';

const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
// 링크 이름표(yt_short6_pin·insta·orbi10…). 대소문자는 그대로 둔다 — 소문자화는 버린 안 (09.27 Fable)
const UTM_SOURCE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// Date#toISOString() 꼴만 받는다
const UTM_SEEN_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
// 폰 시계가 조금 빠른 건 받아준다. 그보다 먼 미래는 시각만 버린다
const UTM_SEEN_AT_MAX_SKEW_MS = 5 * 60 * 1000;
const APP_VERSION_MAX_LENGTH = 32;
const ACCOUNT_KEY_MAX_LENGTH = 200;
const ERROR_MESSAGE_MAX_LENGTH = 200;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 대기 상한 — Firestore 쓰기·Firebase 인증은 걸리면 기본 60초라, 상한이 없으면 분석이 성공해도 학생은 504를 본다
export const RUN_AUTH_WAIT_MS = 2_000;
// AI 마감과 인증 대기(2초)를 다 써도 원장 쓰기에 남는 최소 시간 — 예산 테스트가 묶는다. 3초는 실측이 아니라 가정
export const RUN_LOG_WRITE_MIN_MS = 3_000;
// 원장 쓰기 대기 상한 — 예산이 177초로 늘어도 느린 원장 하나로 걸린 사진(보통 2~20초)이 3분을 기다리면 안 된다.
// 넘기면 응답을 먼저 보내고 문서를 로그에 남긴다(pending 경로)
export const RUN_LOG_WRITE_MAX_WAIT_MS = 10_000;
// clientDeadlineMs로 받는 범위 — 정수만. 밖이면 표식 없는 요청(57초)으로 본다
export const CLIENT_DEADLINE_MIN_MS = 30_000;
export const CLIENT_DEADLINE_MAX_MS = 300_000;

type Headers = Record<string, string | string[] | undefined>;

export type RunRequestContext = {
  channel: 'app' | 'web' | 'unknown';
  appVersion: string | null;
  participantId: string | null;
  submissionId: string | null;
  qa: boolean;
  // 어느 링크로 왔나 — 웹이 URL의 utm_source를 저장해 싣는다. 사람을 가리키지 않는다(accountKey·participantId와 따로)
  utmSource: string | null;
  utmSeenAt: string | null;
  // 게이트 화면에서 [다시 찍기]로 온 제출이면 직전 submissionId (v2)
  retakeOf: string | null;
  // 클라이언트가 끊는 시각(ms) — 긴 마감을 아는 클라이언트라는 표식이기도 하다. 없으면 57초 예산 (v2)
  clientDeadlineMs: number | null;
};

export type RunAuth = {
  accountKey: string | null;
  authVerified: boolean;
  authKind: 'firebase' | 'anonymous' | null;
  authError: string | null;
};

export type RunResultSummary = {
  predictedMethodId: string;
  confidence: number;
  hasSolvingWork: boolean;
  needsManualSelection: boolean;
  errorCandidateCount: number;
  errorConfidence: number;
};

export type AnalyzeErrorKind =
  | 'openai_timeout'
  | 'openai_error'
  | 'empty_output'
  | 'parse_failed'
  | 'schema_failed'
  | 'unknown';

export type PhotoAnalysisRunDoc = RunRequestContext &
  RunAuth &
  PhotoRunConsentFields & {
    schemaVersion: 2;
    receivedAt: string;
    kstDate: string;
    ok: boolean;
    httpStatus: 200 | 500;
    errorKind: AnalyzeErrorKind | null;
    errorMessage: string | null;
    durationMs: number;
    modelRequested: string;
    model: string | null;
    reasoningEffort: string | null;
    responseId: string | null;
    usage: PhotoAnalysisUsage | null;
    imageBytes: number;
    imageMime: string;
    imageHash: string;
    result: RunResultSummary | null;
    // v2 — 게이트가 돌기 전에 실패한 행만 null
    gate: PhotoGateRecord | null;
  };

// 서버 전체가 KST 가정이다(send-review-reminders.ts). KST는 서머타임이 없어 +9h로 자르면 된다.
export function toKstDate(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// 선택 필드는 형식이 틀리면 버린다 — zod로 400을 내면 필드 하나 때문에 학생 사진 분석이 막힌다.
export function readRunRequestContext(body: unknown, receivedAt: Date = new Date()): RunRequestContext {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const channel = record.channel === 'app' || record.channel === 'web' ? record.channel : 'unknown';
  const appVersion =
    typeof record.appVersion === 'string' && record.appVersion.length <= APP_VERSION_MAX_LENGTH
      ? record.appVersion
      : null;
  const participantId =
    typeof record.participantId === 'string' && PARTICIPANT_ID_PATTERN.test(record.participantId)
      ? record.participantId
      : null;
  const submissionId =
    typeof record.submissionId === 'string' && SUBMISSION_ID_PATTERN.test(record.submissionId)
      ? record.submissionId
      : null;
  const utmSource =
    typeof record.utmSource === 'string' && UTM_SOURCE_PATTERN.test(record.utmSource) ? record.utmSource : null;
  // 시각이 깨져도 source는 살린다. 오래된 시각은 안 지운다 — 창은 집계에서 건다
  const utmSeenAt =
    typeof record.utmSeenAt === 'string' &&
    UTM_SEEN_AT_PATTERN.test(record.utmSeenAt) &&
    Date.parse(record.utmSeenAt) <= receivedAt.getTime() + UTM_SEEN_AT_MAX_SKEW_MS
      ? record.utmSeenAt
      : null;

  const retakeOf =
    typeof record.retakeOf === 'string' && SUBMISSION_ID_PATTERN.test(record.retakeOf) ? record.retakeOf : null;
  const clientDeadlineMs =
    Number.isInteger(record.clientDeadlineMs) &&
    (record.clientDeadlineMs as number) >= CLIENT_DEADLINE_MIN_MS &&
    (record.clientDeadlineMs as number) <= CLIENT_DEADLINE_MAX_MS
      ? (record.clientDeadlineMs as number)
      : null;

  return {
    channel,
    appVersion,
    participantId,
    submissionId,
    qa: record.qa === true,
    utmSource,
    utmSeenAt,
    retakeOf,
    clientDeadlineMs,
  };
}

// 200자를 넘는 키는 실계정일 수 없다(delete-account.ts 스키마와 같은 상한) — 없는 것으로 본다
function readClaimedAccountKey(headers: Headers): string | null {
  const accountKey = getLearningHistoryRequestAccountKey(headers);
  return accountKey && accountKey.length <= ACCOUNT_KEY_MAX_LENGTH ? accountKey : null;
}

// 검증을 못 기다렸거나 못 끝냈을 때 — 주장한 키만 남기고 authVerified false(집계에서 빠진다)
export function unresolvedRunAuth(headers: Headers, reason: string): RunAuth {
  return { accountKey: readClaimedAccountKey(headers), authVerified: false, authKind: null, authError: reason };
}

// 다른 함수와 같은 헤더 셋(x-dasida-account-key + Bearer/세션 시크릿)을 같은 함수로 검증한다.
// 1.0.9 계측판은 실패해도 분석을 계속한다 — 과금을 켤 때 여기서 막으면 앱을 다시 안 내도 된다.
export async function resolveRunAuth(
  headers: Headers,
  authenticate: typeof authenticateLearningHistoryRequest = authenticateLearningHistoryRequest,
): Promise<RunAuth> {
  const accountKey = readClaimedAccountKey(headers);
  if (!accountKey) {
    return { accountKey: null, authVerified: false, authKind: null, authError: null };
  }

  try {
    const context = await authenticate(headers, accountKey);
    return { accountKey, authVerified: true, authKind: context.kind, authError: null };
  } catch (error) {
    return {
      accountKey,
      authVerified: false,
      authKind: null,
      authError: error instanceof Error ? error.message : String(error),
    };
  }
}

// 상한 안에 끝나면 그 값, 아니면 대체값. 절대 던지지 않고, 원본은 뒤에서 계속 돌게 둔다.
// 원본에 거부 처리기를 바로 붙여서 늦은 실패가 unhandled rejection으로 인스턴스를 죽이지 않는다.
// fallback은 던지면 안 된다 — timeout 경로는 setTimeout 안이라 uncaught exception, rejected 경로는 unhandled rejection이 된다.
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: (reason: 'timeout' | 'rejected') => T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback('rejected'));
      },
    );
  });
}

export function classifyAnalyzeError(error: unknown): AnalyzeErrorKind {
  if (error instanceof PhotoAnalysisOutputError) return error.kind;
  if (error instanceof ZodError) return 'schema_failed';
  // 타임아웃이 APIError의 자식이라 먼저 본다. 55초 마감(PHOTO_ANALYSIS_DEADLINE_MS)에 끊긴 것도 타임아웃 —
  // 요청 중이면 APIUserAbortError, 본문을 받는 중이면 AbortError로 온다
  if (error instanceof APIConnectionTimeoutError || error instanceof APIUserAbortError) return 'openai_timeout';
  if (error instanceof Error && error.name === 'AbortError') return 'openai_timeout';
  if (error instanceof APIError) return 'openai_error';
  return 'unknown';
}

export function buildPhotoAnalysisRunDoc(input: {
  context: RunRequestContext;
  auth: RunAuth;
  receivedAt: Date;
  imageDataUrl: string;
  modelRequested: string;
  reasoningEffort: string | null;
  durationMs: number;
  openAi: { model: string | null; responseId: string | null; usage: PhotoAnalysisUsage | null } | null;
  gate: PhotoGateRecord | null;
  // 게이트에 걸리면 ok:true · result null (본 호출 없음)
  outcome: { ok: true; result: RunResultSummary | null } | { ok: false; error: unknown };
  // 1.0.11 — 없으면 unknown·skipped (동의를 안 읽은 자리)
  consent?: PhotoRunConsentFields;
}): PhotoAnalysisRunDoc {
  const { outcome } = input;
  // 출력이 깨진 실패는 OpenAI 응답 대신 에러가 model·usage·responseId를 들고 온다
  const outputError = !outcome.ok && outcome.error instanceof PhotoAnalysisOutputError ? outcome.error : null;
  const openAi = input.openAi ?? {
    model: outputError?.model ?? null,
    responseId: outputError?.responseId ?? null,
    usage: outputError?.usage ?? null,
  };

  return {
    schemaVersion: 2,
    ...input.context,
    ...input.auth,
    ...(input.consent ?? unknownRunConsent()),
    receivedAt: input.receivedAt.toISOString(),
    kstDate: toKstDate(input.receivedAt),
    ok: outcome.ok,
    httpStatus: outcome.ok ? 200 : 500,
    errorKind: outcome.ok ? null : classifyAnalyzeError(outcome.error),
    errorMessage: outcome.ok
      ? null
      : (outcome.error instanceof Error ? outcome.error.message : String(outcome.error)).slice(0, ERROR_MESSAGE_MAX_LENGTH),
    durationMs: input.durationMs,
    modelRequested: input.modelRequested,
    model: openAi.model,
    reasoningEffort: input.reasoningEffort,
    responseId: openAi.responseId,
    usage: openAi.usage,
    imageBytes: input.imageDataUrl.length,
    imageMime: /^data:image\/(\w+);/.exec(input.imageDataUrl)?.[1] ?? 'unknown',
    // 원본은 안 남긴다. 같은 사진 재전송을 1장으로 접는 데만 쓴다 (다시 찍은 사진은 못 접는다)
    imageHash: createHash('sha256').update(input.imageDataUrl).digest('hex'),
    result: outcome.ok ? outcome.result : null,
    gate: input.gate,
  };
}

// 원장 쓰기에 줄 수 있는 시간 — 이 요청의 응답 예산(요청 도착 + budgetMs)까지 남은 만큼, 10초 상한.
// 새 인스턴스에선 원장 add가 첫 Firestore 호출이라(토큰·gRPC 채널) 몇 초 걸릴 수 있다.
export function runLogWriteWaitMs(receivedAt: Date, budgetMs: number, now: number = Date.now()): number {
  return Math.max(0, Math.min(RUN_LOG_WRITE_MAX_WAIT_MS, budgetMs - (now - receivedAt.getTime())));
}

// 본 호출에 줄 마감 — 예산에서 이미 쓴 시간(게이트 포함)과 인증 대기·원장 최소 몫을 뺀 만큼, PHOTO_ANALYSIS_DEADLINE_MS 상한.
// 웹(177초 예산): 게이트 5초면 165초 · 게이트가 20초를 다 쓰면 152초. 1.0.9(57초): 게이트 4~11초면 41~48초.
export function photoAiDeadlineMs(budgetMs: number, elapsedMs: number): number {
  return Math.max(0, Math.min(PHOTO_ANALYSIS_DEADLINE_MS, budgetMs - elapsedMs - RUN_AUTH_WAIT_MS - RUN_LOG_WRITE_MIN_MS));
}

// ── 1.0.11 동의 칸·검토본 (약속 파일 §5) ──────────────────────────────────────

/** 검토본 올리기 대기 상한. 동의한 학생만 이 시간을 쓴다 — 동의 문서가 없는 요청은 0ms */
export const REVIEW_PHOTO_MAX_WAIT_MS = 5_000;

export type RunConsentLabels = Pick<PhotoRunConsentFields, 'analysisConsent' | 'reviewConsent'>;
type ReviewRecord = PhotoRunConsentFields['review'];

/** 동의를 안 읽은 자리(인증 미확인·문서 없음·못 읽음·옛 행) */
export function unknownRunConsent(): PhotoRunConsentFields {
  return {
    analysisConsent: 'unknown',
    reviewConsent: 'unknown',
    review: { status: 'skipped', photoPath: null, expiresAt: null },
  };
}

/** 문서가 없으면 unknown — "안 물어봄"은 "거부"가 아니다 */
export function runConsentLabels(doc: ConsentDoc | null): RunConsentLabels {
  if (!doc) return { analysisConsent: 'unknown', reviewConsent: 'unknown' };
  return {
    analysisConsent: isConsentOn(doc.analysis, 'analysis') ? 'agreed' : 'not-agreed',
    reviewConsent: isConsentOn(doc.review, 'review') ? 'agreed' : 'not-agreed',
  };
}

/** 검토본을 남길지·어디에. review가 null이면 안 남긴다 */
export type RunConsentPlan = RunConsentLabels & { review: { photoPath: string; expiresAt: string } | null };

/**
 * 검토본 조건 = authVerified ∧ 검토 동의 ∧ submissionId. 분석·인증과 같이 돌린다(학생 응답을 늦추지 않게).
 * 같은 submissionId의 첫 검토본이 원장에 있으면 그 경로·만료를 다시 쓴다 — 자정을 넘긴 재시도도 첫 날짜, 만료는 안 늘린다.
 * 던질 수 있다 — 부르는 쪽이 unknown으로 받는다.
 */
export async function planRunConsent(input: {
  auth: RunAuth;
  submissionId: string | null;
  receivedAt: Date;
  readConsent: (accountKey: string) => Promise<ConsentDoc | null>;
  findFirstReview: (accountKey: string, submissionId: string) => Promise<{ photoPath: string; expiresAt: string } | null>;
}): Promise<RunConsentPlan> {
  const { auth, submissionId, receivedAt } = input;
  if (!auth.authVerified || !auth.accountKey) {
    return { analysisConsent: 'unknown', reviewConsent: 'unknown', review: null };
  }

  const labels = runConsentLabels(await input.readConsent(auth.accountKey));
  if (labels.reviewConsent !== 'agreed' || !submissionId) return { ...labels, review: null };

  const first = await input.findFirstReview(auth.accountKey, submissionId).catch(() => null);
  return {
    ...labels,
    review: first ?? {
      photoPath: reviewPhotoPath(toKstDate(receivedAt), auth.accountKey, submissionId),
      expiresAt: reviewExpiresAt(receivedAt.toISOString()),
    },
  };
}

/** 검토본 올리기에 줄 시간 — 응답 예산에서 원장 최소 몫을 남기고, 5초 상한 */
export function reviewPhotoWaitMs(receivedAt: Date, budgetMs: number, now: number = Date.now()): number {
  return Math.max(
    0,
    Math.min(REVIEW_PHOTO_MAX_WAIT_MS, budgetMs - (now - receivedAt.getTime()) - RUN_LOG_WRITE_MIN_MS),
  );
}

/**
 * 받은 축소본을 검토본 경로에 남긴다(응답 전). 절대 던지지 않는다 — 검토본이 학생 응답을 막으면 안 된다.
 * 실패·시간 초과여도 경로는 원장에 남긴다 — 늦게 도착한 객체도 탈퇴가 이 경로로 지운다.
 */
export async function storeReviewCopy(input: {
  plan: RunConsentPlan;
  imageDataUrl: string;
  save: (photoPath: string, imageDataUrl: string) => Promise<unknown>;
  waitMs: number;
}): Promise<ReviewRecord> {
  const { review } = input.plan;
  if (!review) return { status: 'skipped', photoPath: null, expiresAt: null };

  const upload = Promise.resolve()
    .then(() => input.save(review.photoPath, input.imageDataUrl))
    .then(
      () => 'stored' as const,
      (error) => {
        logger.error('analyzePhoto review copy failed', { photoPath: review.photoPath, error });
        return 'failed' as const;
      },
    );
  const status = await withTimeout(upload, input.waitMs, () => 'failed' as const);
  return { status, photoPath: review.photoPath, expiresAt: review.expiresAt };
}

/** 같은 계정·같은 submissionId의 가장 이른 검토본 경로 */
export async function findFirstReviewCopy(
  firestore: Firestore,
  accountKey: string,
  submissionId: string,
): Promise<{ photoPath: string; expiresAt: string } | null> {
  const snapshot = await firestore
    .collection(PHOTO_ANALYSIS_RUNS_COLLECTION)
    .where('accountKey', '==', accountKey)
    .where('submissionId', '==', submissionId)
    .limit(20)
    .get();

  let first: { receivedAt: string; photoPath: string; expiresAt: string } | null = null;
  for (const doc of snapshot.docs) {
    const data = doc.data() as Partial<PhotoAnalysisRunDoc>;
    const photoPath = data.review?.photoPath;
    const expiresAt = data.review?.expiresAt;
    if (typeof photoPath !== 'string' || typeof expiresAt !== 'string' || typeof data.receivedAt !== 'string') continue;
    if (!first || data.receivedAt < first.receivedAt) first = { receivedAt: data.receivedAt, photoPath, expiresAt };
  }
  return first && { photoPath: first.photoPath, expiresAt: first.expiresAt };
}

/** 탈퇴 ② — 원장을 지우기 전에 이 계정의 검토본 경로를 모은다(날짜 아래 흩어져 prefix로 못 지운다) */
export async function collectReviewPhotoPathsForAccount(firestore: Firestore, accountKey: string): Promise<string[]> {
  const snapshot = await firestore
    .collection(PHOTO_ANALYSIS_RUNS_COLLECTION)
    .where('accountKey', '==', accountKey)
    .get();

  const paths = new Set<string>();
  for (const doc of snapshot.docs) {
    const photoPath = (doc.data() as Partial<PhotoAnalysisRunDoc>).review?.photoPath;
    if (typeof photoPath === 'string') paths.add(photoPath);
  }
  return [...paths];
}

// 원장 기록은 절대 던지지 않는다 — 기록 실패가 학생 응답을 막으면 안 된다 (diagnosis-method.ts와 같은 규약).
// 문서 만들기도 보호 안에 둔다 — 여기가 던지면 분석 성공이 학생에게 500으로 간다.
// 쓰기는 응답 예산까지(10초 상한) 기다린다. 그래도 안 끝나면 응답을 먼저 보내고 문서를 로그에 통째로 남긴다 —
// v2는 응답 뒤 CPU를 줄여 뒤에서 도는 쓰기가 사라질 수 있으니, 30일 안에 로그에서 손으로 되살린다.
export async function writePhotoAnalysisRun(
  input: Parameters<typeof buildPhotoAnalysisRunDoc>[0] & { budgetMs: number },
): Promise<void> {
  let doc: PhotoAnalysisRunDoc;
  let write: Promise<'written' | 'failed'>;
  try {
    doc = buildPhotoAnalysisRunDoc(input);
    write = getFirestore()
      .collection(PHOTO_ANALYSIS_RUNS_COLLECTION)
      .add(doc)
      .then(
        () => 'written' as const,
        (error) => {
          logger.error('analyzePhoto run log write failed', error);
          return 'failed' as const;
        },
      );
  } catch (error) {
    logger.error('analyzePhoto run log write failed', error);
    return;
  }

  const outcome = await withTimeout(write, runLogWriteWaitMs(input.receivedAt, input.budgetMs), () => 'pending' as const);
  if (outcome === 'pending') {
    // 사진·학생 글씨는 문서에 없다(요약·해시·200자 에러뿐). accountKey는 'analyzePhoto done' 로그에도 이미 있다
    logger.warn('analyzePhoto run log write still pending — responding first', { doc });
  }
}

// 계정을 지우면 그 계정의 사진 분석 기록도 같이 지운다 (기윤 A안 09.23).
export async function deletePhotoAnalysisRunsForAccount(firestore: Firestore, accountKey: string): Promise<number> {
  const snapshot = await firestore
    .collection(PHOTO_ANALYSIS_RUNS_COLLECTION)
    .where('accountKey', '==', accountKey)
    .get();

  // 건별 promise를 close와 같이 기다린다 — 버리면 실패가 unhandled rejection으로 새고 계정 삭제가 성공으로 끝난다
  const writer = firestore.bulkWriter();
  await Promise.all([...snapshot.docs.map((doc) => writer.delete(doc.ref)), writer.close()]);

  return snapshot.size;
}
