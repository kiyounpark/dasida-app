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
  deletePhotoAnalysisRunsForAccount,
  PHOTO_ANALYSIS_RUNS_COLLECTION,
  readRunRequestContext,
  resolveRunAuth,
  toKstDate,
} from '../src/photo-analysis-run-log';

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

  assert.equal(doc.schemaVersion, 1);
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
