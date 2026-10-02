import assert from 'node:assert/strict';
import test from 'node:test';

import type { Firestore } from 'firebase-admin/firestore';
import { APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai';
import { z } from 'zod';

import { LearningHistoryAuthError } from '../src/learning-history-auth';
import { PhotoAnalysisOutputError } from '../src/openai-client';
import {
  buildPhotoAnalysisRunDoc,
  classifyAnalyzeError,
  collectReviewPhotoPathsForAccount,
  deletePhotoAnalysisRunsForAccount,
  findFirstReviewCopy,
  PHOTO_ANALYSIS_RUNS_COLLECTION,
  planRunConsent,
  readRunRequestContext,
  resolveRunAuth,
  reviewPhotoWaitMs,
  runConsentLabels,
  runLogWriteWaitMs,
  storeReviewCopy,
  toKstDate,
  unresolvedRunAuth,
  withTimeout,
} from '../src/photo-analysis-run-log';
import type { ConsentDoc } from '../src/photo-store-contract';

const IMAGE = 'data:image/jpeg;base64,AAAA';
const USAGE = { input: 1200, cached: 800, output: 300, reasoning: 200, total: 1500 };

function baseInput() {
  return {
    context: readRunRequestContext({ imageDataUrl: IMAGE, channel: 'app', appVersion: '1.0.9', qa: false }),
    auth: { accountKey: 'user:abc', authVerified: true, authKind: 'firebase' as const, authError: null },
    receivedAt: new Date('2026-09-23T14:59:59.000Z'),
    imageDataUrl: IMAGE,
    modelRequested: 'gpt-5.4-mini',
    reasoningEffort: 'medium',
    durationMs: 18000,
    gate: null,
  };
}

// ── KST 날짜 — "다른 날 두 번째"의 날짜 경계 ──

test('toKstDate: UTC 14:59:59는 아직 KST 같은 날, 15:00부터 다음 날', () => {
  assert.equal(toKstDate(new Date('2026-09-23T14:59:59.999Z')), '2026-09-23');
  assert.equal(toKstDate(new Date('2026-09-23T15:00:00.000Z')), '2026-09-24');
});

// ── 요청 본문 — 형식이 틀린 선택 필드는 버리고 사진 분석은 막지 않는다 ──

test('readRunRequestContext: 아무 필드도 없으면 channel unknown·qa false (= 1.0.8 앱)', () => {
  assert.deepEqual(readRunRequestContext({ imageDataUrl: IMAGE }), {
    channel: 'unknown',
    appVersion: null,
    participantId: null,
    submissionId: null,
    qa: false,
    utmSource: null,
    utmSeenAt: null,
    retakeOf: null,
    clientDeadlineMs: null,
  });
});

test('readRunRequestContext: 웹 필드를 그대로 읽는다', () => {
  assert.deepEqual(
    readRunRequestContext({
      imageDataUrl: IMAGE,
      channel: 'web',
      participantId: 'k7Q2mX9p',
      submissionId: '8f14e45f-ceea-467a-9575-1b2c3d4e5f60',
      qa: true,
    }),
    {
      channel: 'web',
      appVersion: null,
      participantId: 'k7Q2mX9p',
      submissionId: '8f14e45f-ceea-467a-9575-1b2c3d4e5f60',
      qa: true,
      utmSource: null,
      utmSeenAt: null,
      retakeOf: null,
      clientDeadlineMs: null,
    },
  );
});

test('readRunRequestContext: 형식 틀린 participantId·channel·qa는 버린다', () => {
  const context = readRunRequestContext({
    imageDataUrl: IMAGE,
    channel: 'ios',
    participantId: '<script>',
    qa: 'yes',
  });

  assert.equal(context.channel, 'unknown');
  assert.equal(context.participantId, null);
  assert.equal(context.qa, false);
});

// ── 어느 링크로 왔나(utm_source) — 설계 docs/research/2026-09-27-utm-ledger-astra-fable.md ──

const RECEIVED_AT = new Date('2026-09-28T12:30:00.000Z');

test('readRunRequestContext: utmSource·utmSeenAt을 그대로 싣는다 — 대소문자도 안 바꾼다', () => {
  const context = readRunRequestContext(
    { imageDataUrl: IMAGE, channel: 'web', utmSource: 'yt_Short6_PIN', utmSeenAt: '2026-09-28T12:00:00.000Z' },
    RECEIVED_AT,
  );

  assert.equal(context.utmSource, 'yt_Short6_PIN');
  assert.equal(context.utmSeenAt, '2026-09-28T12:00:00.000Z');
});

test('readRunRequestContext: 형식 틀린 utmSource는 버린다 (태그·65자·배열·빈 문자열)', () => {
  for (const utmSource of ['<script>', 'a'.repeat(65), ['yt_short6_pin'], '', 'yt short6']) {
    assert.equal(readRunRequestContext({ imageDataUrl: IMAGE, utmSource }, RECEIVED_AT).utmSource, null);
  }
  assert.equal(readRunRequestContext({ imageDataUrl: IMAGE, utmSource: 'a'.repeat(64) }, RECEIVED_AT).utmSource, 'a'.repeat(64));
});

test('readRunRequestContext: 서버 수신 +5분을 넘는 미래 utmSeenAt은 시각만 버리고 source는 살린다', () => {
  const at = (ms: number) => new Date(RECEIVED_AT.getTime() + ms).toISOString();

  const future = readRunRequestContext({ imageDataUrl: IMAGE, utmSource: 'insta', utmSeenAt: at(5 * 60_000 + 1) }, RECEIVED_AT);
  assert.equal(future.utmSource, 'insta');
  assert.equal(future.utmSeenAt, null);

  // 폰 시계가 조금 빠른 건 받아준다 — 딱 +5분까지
  assert.equal(readRunRequestContext({ imageDataUrl: IMAGE, utmSource: 'insta', utmSeenAt: at(5 * 60_000) }, RECEIVED_AT).utmSeenAt, at(5 * 60_000));
});

test('readRunRequestContext: utmSeenAt만 깨져도 utmSource는 살아 있다', () => {
  for (const utmSeenAt of ['yesterday', 1790000000000, '2026-09-28T12:00:00Z', '2026-13-40T12:00:00.000Z', null]) {
    const context = readRunRequestContext({ imageDataUrl: IMAGE, utmSource: 'orbi10', utmSeenAt }, RECEIVED_AT);
    assert.equal(context.utmSource, 'orbi10');
    assert.equal(context.utmSeenAt, null);
  }
});

// ── 인증 — 검증은 하되 실패해도 분석은 계속 ──

test('resolveRunAuth: 계정 키 헤더가 없으면 검증을 안 부르고 accountKey null', async () => {
  let called = false;
  const auth = await resolveRunAuth({}, async () => {
    called = true;
    throw new Error('불리면 안 된다');
  });

  assert.equal(called, false);
  assert.deepEqual(auth, { accountKey: null, authVerified: false, authKind: null, authError: null });
});

test('resolveRunAuth: 200자를 넘는 키는 실계정일 수 없다 — 검증 없이 null (delete-account 스키마와 같은 상한)', async () => {
  let called = false;
  const auth = await resolveRunAuth({ 'x-dasida-account-key': 'user:' + 'a'.repeat(200) }, async () => {
    called = true;
    throw new Error('불리면 안 된다');
  });

  assert.equal(called, false);
  assert.equal(auth.accountKey, null);
});

test('resolveRunAuth: 검증을 통과하면 authVerified true와 종류를 남긴다', async () => {
  const auth = await resolveRunAuth({ 'x-dasida-account-key': 'user:abc' }, async (_headers, accountKey) => ({
    kind: 'firebase',
    accountKey,
    firebaseUid: 'abc',
  }));

  assert.deepEqual(auth, { accountKey: 'user:abc', authVerified: true, authKind: 'firebase', authError: null });
});

test('resolveRunAuth: 검증이 실패해도 던지지 않고 주장한 키와 사유를 남긴다', async () => {
  const auth = await resolveRunAuth({ 'x-dasida-account-key': 'user:abc' }, async () => {
    throw new LearningHistoryAuthError('Invalid Firebase ID token', 401);
  });

  assert.deepEqual(auth, {
    accountKey: 'user:abc',
    authVerified: false,
    authKind: null,
    authError: 'Invalid Firebase ID token',
  });
});

test('unresolvedRunAuth: 검증을 못 기다리면 주장한 키만 남기고 authVerified false (집계에서 빠진다)', () => {
  assert.deepEqual(unresolvedRunAuth({ 'x-dasida-account-key': 'user:abc' }, 'auth_timeout'), {
    accountKey: 'user:abc',
    authVerified: false,
    authKind: null,
    authError: 'auth_timeout',
  });
  assert.equal(unresolvedRunAuth({ 'x-dasida-account-key': 'user:' + 'a'.repeat(200) }, 'auth_timeout').accountKey, null);
  assert.equal(unresolvedRunAuth({}, 'auth_timeout').accountKey, null);
});

// ── 대기 상한 — 인증·원장 쓰기가 느려도 학생 응답은 60초 안에 나간다 ──

test('withTimeout: 제때 끝나면 그 값', async () => {
  assert.equal(await withTimeout(Promise.resolve('done'), 10, () => 'fallback'), 'done');
});

test('withTimeout: 안 끝나면 상한에서 대체값 — 원본은 계속 돌게 둔다', async () => {
  const never = new Promise<string>(() => {});
  assert.equal(await withTimeout(never, 10, (reason) => reason), 'timeout');
});

test('withTimeout: 실패해도 던지지 않고 대체값', async () => {
  assert.equal(await withTimeout(Promise.reject(new Error('x')), 10, (reason) => reason), 'rejected');
});

test('runLogWriteWaitMs: 원장 쓰기는 응답 예산까지 남은 시간만큼, 10초 상한으로 기다린다', () => {
  const receivedAt = new Date('2026-09-24T00:00:00.000Z');
  const at = (seconds: number) => receivedAt.getTime() + seconds * 1000;

  // 표식 없는 요청(57초 예산) — 보통 분석(18초)이면 39초가 남지만 10초까지만 준다
  assert.equal(runLogWriteWaitMs(receivedAt, 57_000, at(18)), 10_000);
  // AI가 마감과 인증 대기(2초)를 다 써도 3초는 남는다
  assert.equal(runLogWriteWaitMs(receivedAt, 57_000, at(54)), 3_000);
  assert.equal(runLogWriteWaitMs(receivedAt, 57_000, at(57)), 0);
  assert.equal(runLogWriteWaitMs(receivedAt, 57_000, at(59)), 0);
  // 웹(177초 예산)
  assert.equal(runLogWriteWaitMs(receivedAt, 177_000, at(172)), 5_000);
  assert.equal(runLogWriteWaitMs(receivedAt, 177_000, at(177)), 0);
});

// ── 실패 분류 ──

test('classifyAnalyzeError: 타임아웃·API 오류·출력 오류·스키마 오류를 가른다', () => {
  assert.equal(classifyAnalyzeError(new APIConnectionTimeoutError()), 'openai_timeout');
  assert.equal(classifyAnalyzeError(new APIError(500, undefined, 'boom', undefined)), 'openai_error');
  assert.equal(classifyAnalyzeError(new PhotoAnalysisOutputError('parse_failed', 'r', 'm', null)), 'parse_failed');
  assert.equal(classifyAnalyzeError(new PhotoAnalysisOutputError('empty_output', 'r', 'm', null)), 'empty_output');
  assert.equal(classifyAnalyzeError(z.object({ a: z.string() }).safeParse({}).error), 'schema_failed');
  assert.equal(classifyAnalyzeError(new Error('?')), 'unknown');
});

test('classifyAnalyzeError: 55초 마감에 끊긴 호출도 타임아웃이다 (요청 중·본문 받는 중 둘 다)', () => {
  assert.equal(classifyAnalyzeError(new APIUserAbortError()), 'openai_timeout');
  assert.equal(classifyAnalyzeError(new DOMException('This operation was aborted', 'AbortError')), 'openai_timeout');
});

// ── 문서 ──

test('buildPhotoAnalysisRunDoc: 성공 — 결과 요약·usage·KST 날짜·사진 해시를 남기고 undefined가 없다', () => {
  const doc = buildPhotoAnalysisRunDoc({
    ...baseInput(),
    openAi: { model: 'gpt-5.4-mini-2026-03-17', responseId: 'resp_1', usage: USAGE },
    outcome: {
      ok: true,
      result: {
        predictedMethodId: 'quadratic',
        confidence: 0.9,
        hasSolvingWork: true,
        needsManualSelection: false,
        errorCandidateCount: 1,
        errorConfidence: 0.8,
      },
    },
  });

  assert.equal(doc.schemaVersion, 2);
  assert.equal(doc.ok, true);
  assert.equal(doc.httpStatus, 200);
  assert.equal(doc.errorKind, null);
  assert.equal(doc.kstDate, '2026-09-23');
  assert.equal(doc.receivedAt, '2026-09-23T14:59:59.000Z');
  assert.equal(doc.channel, 'app');
  assert.equal(doc.appVersion, '1.0.9');
  assert.equal(doc.accountKey, 'user:abc');
  assert.equal(doc.imageMime, 'jpeg');
  assert.equal(doc.imageBytes, IMAGE.length);
  assert.match(doc.imageHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(doc.usage, USAGE);
  assert.equal(doc.model, 'gpt-5.4-mini-2026-03-17');
  assert.equal(doc.modelRequested, 'gpt-5.4-mini');
  assert.equal(doc.result?.predictedMethodId, 'quadratic');
  assert.ok(Object.values(doc).every((value) => value !== undefined));
});

test('buildPhotoAnalysisRunDoc: 같은 사진은 같은 해시, 다른 사진은 다른 해시 (재전송을 1장으로 접는다)', () => {
  const failed = { openAi: null, outcome: { ok: false as const, error: new Error('x') } };
  const a = buildPhotoAnalysisRunDoc({ ...baseInput(), ...failed });
  const b = buildPhotoAnalysisRunDoc({ ...baseInput(), ...failed });
  const c = buildPhotoAnalysisRunDoc({ ...baseInput(), imageDataUrl: 'data:image/png;base64,BBBB', ...failed });

  assert.equal(a.imageHash, b.imageHash);
  assert.notEqual(a.imageHash, c.imageHash);
  assert.equal(c.imageMime, 'png');
});

test('buildPhotoAnalysisRunDoc: 출력이 깨진 실패도 에러에 실린 usage·responseId를 남긴다', () => {
  const doc = buildPhotoAnalysisRunDoc({
    ...baseInput(),
    openAi: null,
    outcome: {
      ok: false,
      error: new PhotoAnalysisOutputError('parse_failed', 'resp_broken', 'gpt-5.4-mini-2026-03-17', USAGE),
    },
  });

  assert.equal(doc.ok, false);
  assert.equal(doc.httpStatus, 500);
  assert.equal(doc.errorKind, 'parse_failed');
  assert.equal(doc.responseId, 'resp_broken');
  assert.equal(doc.model, 'gpt-5.4-mini-2026-03-17');
  assert.deepEqual(doc.usage, USAGE);
  assert.equal(doc.result, null);
});

test('buildPhotoAnalysisRunDoc: 에러 메시지는 200자에서 자른다', () => {
  const doc = buildPhotoAnalysisRunDoc({
    ...baseInput(),
    openAi: null,
    outcome: { ok: false, error: new Error('x'.repeat(500)) },
  });

  assert.equal(doc.errorMessage?.length, 200);
  assert.equal(doc.usage, null);
});

// ── 계정 삭제 (기윤 A안 09.23) ──

test('deletePhotoAnalysisRunsForAccount: 그 계정 키로 찾은 행만 지우고 다 지운 뒤 닫는다', async () => {
  const deleted: string[] = [];
  let queried: { collection: string; field: string; op: string; value: unknown } | null = null;
  let closed = false;

  const fakeFirestore = {
    collection: (name: string) => ({
      where: (field: string, op: string, value: unknown) => ({
        get: async () => {
          queried = { collection: name, field, op, value };
          return { size: 2, docs: [{ ref: { path: 'runs/1' } }, { ref: { path: 'runs/2' } }] };
        },
      }),
    }),
    bulkWriter: () => ({
      delete: (ref: { path: string }) => {
        deleted.push(ref.path);
      },
      close: async () => {
        closed = true;
      },
    }),
  } as unknown as Firestore;

  const count = await deletePhotoAnalysisRunsForAccount(fakeFirestore, 'user:abc');

  assert.deepEqual(queried, {
    collection: PHOTO_ANALYSIS_RUNS_COLLECTION,
    field: 'accountKey',
    op: '==',
    value: 'user:abc',
  });
  assert.deepEqual(deleted, ['runs/1', 'runs/2']);
  assert.equal(closed, true);
  assert.equal(count, 2);
});

test('deletePhotoAnalysisRunsForAccount: 한 건이라도 못 지우면 실패로 끝난다 — 계정 삭제가 성공으로 보고되면 안 된다', async () => {
  const fakeFirestore = {
    collection: () => ({
      where: () => ({
        get: async () => ({ size: 1, docs: [{ ref: { path: 'runs/1' } }] }),
      }),
    }),
    bulkWriter: () => ({
      delete: () => Promise.reject(new Error('delete failed')),
      // 실물 BulkWriter.close()는 건별 실패에 reject하지 않는다
      close: async () => {},
    }),
  } as unknown as Firestore;

  await assert.rejects(deletePhotoAnalysisRunsForAccount(fakeFirestore, 'user:abc'), /delete failed/);
});

// ── 1.0.11 동의 칸·검토본 (약속 파일 §5) ──

const ON = { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null };
const NEVER = { version: 0, agreedAt: null, revokedAt: null };
const VERIFIED = { accountKey: 'user:abc', authVerified: true, authKind: 'firebase' as const, authError: null };

function consentDoc(review: typeof ON | typeof NEVER): ConsentDoc {
  return {
    schemaVersion: 1,
    accountKey: 'user:abc',
    analysis: ON,
    store: ON,
    review,
    via: 'all',
    updatedAt: '2026-10-10T00:00:00.000Z',
    appVersion: '1.0.11',
  };
}

test('buildPhotoAnalysisRunDoc: 동의 칸을 안 주면 unknown·skipped (1.0.10 이하·웹과 같은 값)', () => {
  const doc = buildPhotoAnalysisRunDoc({ ...baseInput(), openAi: null, outcome: { ok: true, result: null } });

  assert.equal(doc.schemaVersion, 2);
  assert.equal(doc.analysisConsent, 'unknown');
  assert.equal(doc.reviewConsent, 'unknown');
  assert.deepEqual(doc.review, { status: 'skipped', photoPath: null, expiresAt: null });
  assert.ok(Object.values(doc).every((value) => value !== undefined));
});

test('runConsentLabels: 문서가 없으면 unknown — 안 물어봄은 거부가 아니다', () => {
  assert.deepEqual(runConsentLabels(null), { analysisConsent: 'unknown', reviewConsent: 'unknown' });
  assert.deepEqual(runConsentLabels(consentDoc(ON)), { analysisConsent: 'agreed', reviewConsent: 'agreed' });
  assert.deepEqual(runConsentLabels(consentDoc(NEVER)), { analysisConsent: 'agreed', reviewConsent: 'not-agreed' });
});

test('planRunConsent: 인증이 안 됐으면 동의 문서를 안 읽는다', async () => {
  let read = false;
  const plan = await planRunConsent({
    auth: { accountKey: 'user:abc', authVerified: false, authKind: null, authError: 'x' },
    submissionId: 'sub_12345678',
    receivedAt: new Date('2026-10-10T15:30:00.000Z'),
    readConsent: async () => {
      read = true;
      return consentDoc(ON);
    },
    findFirstReview: async () => null,
  });

  assert.equal(read, false);
  assert.deepEqual(plan, { analysisConsent: 'unknown', reviewConsent: 'unknown', review: null });
});

test('planRunConsent: 경로 날짜는 받은 시각의 KST 날짜, 만료는 +30일', async () => {
  const plan = await planRunConsent({
    auth: VERIFIED,
    submissionId: 'sub_12345678',
    // UTC 15:30 = KST 다음 날 00:30
    receivedAt: new Date('2026-10-10T15:30:00.000Z'),
    readConsent: async () => consentDoc(ON),
    findFirstReview: async () => null,
  });

  assert.deepEqual(plan.review, {
    photoPath: 'review/2026-10-11/user:abc/sub_12345678.jpg',
    expiresAt: '2026-11-09T15:30:00.000Z',
  });
});

test('planRunConsent: 첫 검토본 찾기가 실패해도 오늘 경로로 간다', async () => {
  const plan = await planRunConsent({
    auth: VERIFIED,
    submissionId: 'sub_12345678',
    receivedAt: new Date('2026-10-10T03:00:00.000Z'),
    readConsent: async () => consentDoc(ON),
    findFirstReview: async () => {
      throw new Error('query failed');
    },
  });

  assert.equal(plan.review?.photoPath, 'review/2026-10-10/user:abc/sub_12345678.jpg');
});

test('storeReviewCopy: 상한 안에 안 끝나면 failed — 경로는 남긴다(늦게 도착해도 탈퇴가 지운다)', async () => {
  const review = await storeReviewCopy({
    plan: { analysisConsent: 'agreed', reviewConsent: 'agreed', review: { photoPath: 'review/p.jpg', expiresAt: 'e' } },
    imageDataUrl: IMAGE,
    save: () => new Promise(() => {}),
    waitMs: 10,
  });

  assert.deepEqual(review, { status: 'failed', photoPath: 'review/p.jpg', expiresAt: 'e' });
});

test('storeReviewCopy: save가 바로 던져도 던지지 않는다', async () => {
  const review = await storeReviewCopy({
    plan: { analysisConsent: 'agreed', reviewConsent: 'agreed', review: { photoPath: 'review/p.jpg', expiresAt: 'e' } },
    imageDataUrl: IMAGE,
    save: () => {
      throw new Error('sync throw');
    },
    waitMs: 1000,
  });

  assert.equal(review.status, 'failed');
});

test('reviewPhotoWaitMs: 원장 최소 몫(3초)을 남기고 5초 상한', () => {
  const receivedAt = new Date('2026-10-10T00:00:00.000Z');
  const at = (seconds: number) => receivedAt.getTime() + seconds * 1000;

  assert.equal(reviewPhotoWaitMs(receivedAt, 177_000, at(30)), 5_000);
  assert.equal(reviewPhotoWaitMs(receivedAt, 57_000, at(52)), 2_000);
  assert.equal(reviewPhotoWaitMs(receivedAt, 57_000, at(56)), 0);
});

function fakeRunsFirestore(rows: Record<string, unknown>[], seen: { filters: [string, unknown][] }) {
  const query = {
    where: (field: string, _op: string, value: unknown) => {
      seen.filters.push([field, value]);
      return query;
    },
    limit: () => query,
    get: async () => ({ docs: rows.map((row) => ({ data: () => row })) }),
  };
  return { collection: () => query } as unknown as Firestore;
}

test('collectReviewPhotoPathsForAccount: 이 계정 행의 검토본 경로만, 겹치면 한 번', async () => {
  const seen = { filters: [] as [string, unknown][] };
  const firestore = fakeRunsFirestore(
    [
      { review: { status: 'stored', photoPath: 'review/a.jpg', expiresAt: 'e' } },
      { review: { status: 'failed', photoPath: 'review/b.jpg', expiresAt: 'e' } },
      { review: { status: 'stored', photoPath: 'review/a.jpg', expiresAt: 'e' } },
      { review: { status: 'skipped', photoPath: null, expiresAt: null } },
      {}, // 1.0.10 이하 행 — review 칸 없음
    ],
    seen,
  );

  assert.deepEqual(await collectReviewPhotoPathsForAccount(firestore, 'user:abc'), ['review/a.jpg', 'review/b.jpg']);
  assert.deepEqual(seen.filters, [['accountKey', 'user:abc']]);
});

test('findFirstReviewCopy: 같은 계정·submissionId 중 가장 이른 행의 경로', async () => {
  const seen = { filters: [] as [string, unknown][] };
  const firestore = fakeRunsFirestore(
    [
      { receivedAt: '2026-10-10T15:10:00.000Z', review: { photoPath: 'review/2026-10-11/x.jpg', expiresAt: 'late' } },
      { receivedAt: '2026-10-10T14:50:00.000Z', review: { photoPath: 'review/2026-10-10/x.jpg', expiresAt: 'early' } },
      { receivedAt: '2026-10-10T14:00:00.000Z', review: { photoPath: null, expiresAt: null } },
    ],
    seen,
  );

  assert.deepEqual(await findFirstReviewCopy(firestore, 'user:abc', 'sub_12345678'), {
    photoPath: 'review/2026-10-10/x.jpg',
    expiresAt: 'early',
  });
  assert.deepEqual(seen.filters, [
    ['accountKey', 'user:abc'],
    ['submissionId', 'sub_12345678'],
  ]);
});
