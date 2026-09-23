import { createHash } from 'node:crypto';

import * as logger from 'firebase-functions/logger';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai';
import { ZodError } from 'zod';

import {
  authenticateLearningHistoryRequest,
  getLearningHistoryRequestAccountKey,
} from './learning-history-auth';
import { PhotoAnalysisOutputError, type PhotoAnalysisUsage } from './openai-client';

// 사진 분석 사용량 원장. 설계: docs/superpowers/specs/2026-09-23-photo-usage-log-design.md
// 사진 1장(호출 1번)당 문서 1개, 문서 id(자동)가 시도 id다. 보존은 영구 — Cloud Logging은 30일이면 사라져 판정을 못 센다.
export const PHOTO_ANALYSIS_RUNS_COLLECTION = 'photoAnalysisRuns';

const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const APP_VERSION_MAX_LENGTH = 32;
const ACCOUNT_KEY_MAX_LENGTH = 200;
const ERROR_MESSAGE_MAX_LENGTH = 200;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// 대기 상한 — Firestore 쓰기·Firebase 인증은 걸리면 기본 60초라, 상한이 없으면 분석이 성공해도 학생은 504를 본다
export const RUN_AUTH_WAIT_MS = 2_000;
export const RUN_LOG_WRITE_TIMEOUT_MS = 3_000;

type Headers = Record<string, string | string[] | undefined>;

export type RunRequestContext = {
  channel: 'app' | 'web' | 'unknown';
  appVersion: string | null;
  participantId: string | null;
  submissionId: string | null;
  qa: boolean;
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
  RunAuth & {
    schemaVersion: 1;
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
  };

// 서버 전체가 KST 가정이다(send-review-reminders.ts). KST는 서머타임이 없어 +9h로 자르면 된다.
export function toKstDate(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// 선택 필드는 형식이 틀리면 버린다 — zod로 400을 내면 필드 하나 때문에 학생 사진 분석이 막힌다.
export function readRunRequestContext(body: unknown): RunRequestContext {
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

  return { channel, appVersion, participantId, submissionId, qa: record.qa === true };
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
  outcome: { ok: true; result: RunResultSummary } | { ok: false; error: unknown };
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
    schemaVersion: 1,
    ...input.context,
    ...input.auth,
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
  };
}

// 원장 기록은 절대 던지지 않는다 — 기록 실패가 학생 응답을 막으면 안 된다 (diagnosis-method.ts와 같은 규약).
// 문서 만들기도 보호 안에 둔다 — 여기가 던지면 분석 성공이 학생에게 500으로 간다.
// 쓰기는 3초까지만 기다리고 응답을 먼저 보낸다. 쓰기는 뒤에서 계속 돌아 늦게라도 한 줄 남는다(문서는 여전히 최대 1개).
export async function writePhotoAnalysisRun(input: Parameters<typeof buildPhotoAnalysisRunDoc>[0]): Promise<void> {
  let write: Promise<'written' | 'failed'>;
  try {
    write = getFirestore()
      .collection(PHOTO_ANALYSIS_RUNS_COLLECTION)
      .add(buildPhotoAnalysisRunDoc(input))
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

  const outcome = await withTimeout(write, RUN_LOG_WRITE_TIMEOUT_MS, () => 'pending' as const);
  if (outcome === 'pending') {
    logger.warn('analyzePhoto run log write still pending — responding first');
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
