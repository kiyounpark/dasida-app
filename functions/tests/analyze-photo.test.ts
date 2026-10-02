import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPhotoRouterResult, type VisionRawResult } from '../src/analyze-photo-core';
import { handleAnalyzePhoto, type AnalyzePhotoDeps } from '../src/analyze-photo';
import { buildPhotoAnalysisRunDoc, type PhotoAnalysisRunDoc, type RunAuth } from '../src/photo-analysis-run-log';
import { buildGateBlockedResult, photoGateView, type PhotoGateRecord } from '../src/photo-gate';
import type { ConsentDoc } from '../src/photo-store-contract';

// 1.0.11 2줄 — analyzePhoto에 동의 기록·검토본을 더했다.
// 묶는 것: 동의 문서가 없는 요청(1.0.9·1.0.10·웹)은 지금과 같은 응답 · 검토본을 안 만든다 · 분석을 동의로 막지 않는다.

const IMAGE = 'data:image/jpeg;base64,/9j/AAAA';
const SUBMISSION = '8f14e45f-ceea-467a-9575-1b2c3d4e5f60';

const RAW: VisionRawResult = {
  hasSolvingWork: true,
  userAnswer: '3',
  transcription: 'x^2-4x+3=0',
  predictedMethodId: 'quadratic',
  confidence: 0.9,
  candidateMethodIds: ['quadratic'],
  reason: 'r',
  errorCandidates: [],
  errorConfidence: 0,
};

function gateOf(decision: PhotoGateRecord['decision']): PhotoGateRecord {
  return {
    decision,
    rotationCheck: 'done',
    rotation: decision === 'blocked_rotation' ? 'rotated_left' : 'upright',
    width: 1176,
    height: 1568,
    shortSide: 1176,
    gateMs: 3000,
    gateUsage: null,
    model: 'gpt-5.4-mini',
    responseId: 'resp_gate',
  };
}

const ON = { version: 1, agreedAt: '2026-10-10T00:00:00.000Z', revokedAt: null };
const OFF = { version: 0, agreedAt: null, revokedAt: null };

function consentDoc(review: boolean): ConsentDoc {
  return {
    schemaVersion: 1,
    accountKey: 'user:abc',
    analysis: ON,
    store: ON,
    review: review ? ON : OFF,
    via: 'individual',
    updatedAt: '2026-10-10T00:00:00.000Z',
    appVersion: '1.0.11',
  };
}

const VERIFIED: RunAuth = { accountKey: 'user:abc', authVerified: true, authKind: 'firebase', authError: null };
const NO_ACCOUNT: RunAuth = { accountKey: null, authVerified: false, authKind: null, authError: null };

type Calls = {
  runs: PhotoAnalysisRunDoc[];
  consentReads: string[];
  reviewSaves: { photoPath: string; submissionId: string }[];
};

function makeDeps(
  overrides: Partial<AnalyzePhotoDeps> & { auth?: RunAuth; consent?: ConsentDoc | null } = {},
): { deps: AnalyzePhotoDeps; calls: Calls } {
  const calls: Calls = { runs: [], consentReads: [], reviewSaves: [] };
  const { auth = NO_ACCOUNT, consent = null, ...rest } = overrides;
  const deps: AnalyzePhotoDeps = {
    modelRequested: 'gpt-5.4-mini',
    reasoningEffort: 'medium',
    runGate: async () => gateOf('pass'),
    analyze: async () => ({ result: RAW, responseId: 'resp_main', model: 'gpt-5.4-mini-2026-03-17', usage: null }),
    resolveAuth: async () => auth,
    readConsent: async (accountKey) => {
      calls.consentReads.push(accountKey);
      return consent;
    },
    findFirstReview: async () => null,
    saveReviewPhoto: async (photoPath, _image, submissionId) => {
      calls.reviewSaves.push({ photoPath, submissionId });
      return 'saved';
    },
    // 실물 writePhotoAnalysisRun도 이 함수로 문서를 만든다 — 같은 함수로 만들어 칸을 본다
    writeRun: async (input) => {
      calls.runs.push(buildPhotoAnalysisRunDoc(input));
    },
    ...rest,
  };
  return { deps, calls };
}

function fakeResponse() {
  const sent: { status: number | null; body: unknown } = { status: null, body: undefined };
  return {
    sent,
    response: {
      status(code: number) {
        sent.status = code;
        return {
          json(body: unknown) {
            sent.body = body;
          },
        };
      },
    },
  };
}

function appRequest(extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return {
    method: 'POST',
    headers,
    body: { imageDataUrl: IMAGE, channel: 'app', appVersion: '1.0.10', qa: false, submissionId: SUBMISSION, clientDeadlineMs: 195_000, ...extra },
  };
}

const APP_HEADERS = { 'x-dasida-account-key': 'user:abc', authorization: 'Bearer t' };
const SUCCESS_BODY = { ...buildPhotoRouterResult(RAW), gate: photoGateView(gateOf('pass')) };

// ── 동의 문서가 없을 때 = 지금과 같다 ──

test('웹(계정 없음): 응답은 분석 결과 그대로 · 동의 문서를 안 읽고 검토본도 없다', async () => {
  const { deps, calls } = makeDeps({ auth: NO_ACCOUNT });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(
    { method: 'POST', headers: {}, body: { imageDataUrl: IMAGE, channel: 'web', participantId: 'k7Q2mX9p', submissionId: SUBMISSION } },
    response,
    deps,
  );

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.deepEqual(calls.consentReads, []);
  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs.length, 1);
  assert.equal(calls.runs[0].analysisConsent, 'unknown');
  assert.equal(calls.runs[0].reviewConsent, 'unknown');
  assert.deepEqual(calls.runs[0].review, { status: 'skipped', photoPath: null, expiresAt: null });
});

test('1.0.10 앱(인증됨·동의 문서 없음): 응답이 같고 검토본은 안 만든다 — 원장엔 unknown', async () => {
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: null });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.deepEqual(calls.consentReads, ['user:abc']);
  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs[0].authVerified, true);
  assert.equal(calls.runs[0].analysisConsent, 'unknown');
  assert.equal(calls.runs[0].reviewConsent, 'unknown');
  assert.equal(calls.runs[0].review.status, 'skipped');
  assert.equal(calls.runs[0].ok, true);
});

test('1.0.9 앱(표식·submissionId 없음): 응답이 같다', async () => {
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: null });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(
    { method: 'POST', headers: APP_HEADERS, body: { imageDataUrl: IMAGE, channel: 'app', appVersion: '1.0.9', qa: false } },
    response,
    deps,
  );

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.deepEqual(calls.reviewSaves, []);
});

test('동의 문서 없음 + 거르기에 걸림: 걸린 응답 그대로 · 검토본 없음', async () => {
  const gate = gateOf('blocked_rotation');
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: null, runGate: async () => gate });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, buildGateBlockedResult(gate));
  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs[0].durationMs, 0);
  assert.equal(calls.runs[0].review.status, 'skipped');
});

test('동의 문서 없음 + 분석 실패: 500 {error} 그대로 · 검토본 없음', async () => {
  const { deps, calls } = makeDeps({
    auth: VERIFIED,
    consent: null,
    analyze: async () => {
      throw new Error('boom');
    },
  });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(sent.status, 500);
  assert.deepEqual(sent.body, { error: 'Failed to analyze photo' });
  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs[0].ok, false);
});

test('동의 문서를 못 읽어도(Firestore 오류) 분석 응답은 그대로 — 원장은 unknown', async () => {
  const { deps, calls } = makeDeps({
    auth: VERIFIED,
    readConsent: async () => {
      throw new Error('firestore down');
    },
  });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.equal(calls.runs[0].analysisConsent, 'unknown');
  assert.equal(calls.runs[0].review.status, 'skipped');
});

test('잘못된 본문은 지금처럼 400, POST 아니면 405', async () => {
  const { deps } = makeDeps();
  const bad = fakeResponse();
  await handleAnalyzePhoto({ method: 'POST', headers: {}, body: { imageDataUrl: 'nope' } }, bad.response, deps);
  assert.equal(bad.sent.status, 400);
  assert.equal((bad.sent.body as { error: string }).error, 'Invalid request body');

  const get = fakeResponse();
  await handleAnalyzePhoto({ method: 'GET', headers: {}, body: {} }, get.response, deps);
  assert.equal(get.sent.status, 405);
});

// ── 동의한 학생 ──

test('검토 동의 + 인증 + submissionId: 응답 전에 review/{KST 날짜}/{계정}/{submissionId}.jpg로 남긴다', async () => {
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: consentDoc(true) });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  // 응답은 동의 여부와 무관하게 같다
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.equal(calls.reviewSaves.length, 1);
  assert.match(calls.reviewSaves[0].photoPath, /^review\/\d{4}-\d{2}-\d{2}\/user:abc\/8f14e45f-ceea-467a-9575-1b2c3d4e5f60\.jpg$/);
  assert.equal(calls.reviewSaves[0].submissionId, SUBMISSION);
  const run = calls.runs[0];
  assert.equal(run.analysisConsent, 'agreed');
  assert.equal(run.reviewConsent, 'agreed');
  assert.equal(run.review.status, 'stored');
  assert.equal(run.review.photoPath, calls.reviewSaves[0].photoPath);
  // 경로의 날짜 = 원장 kstDate · 만료 = 받은 시각 + 30일
  assert.ok(run.review.photoPath?.startsWith(`review/${run.kstDate}/`));
  assert.equal(Date.parse(run.review.expiresAt!) - Date.parse(run.receivedAt), 30 * 86_400_000);
});

test('검토 동의 + 거르기에 걸림: 걸린 사진도 검토본 대상', async () => {
  const gate = gateOf('blocked_small');
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: consentDoc(true), runGate: async () => gate });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.deepEqual(sent.body, buildGateBlockedResult(gate));
  assert.equal(calls.reviewSaves.length, 1);
  assert.equal(calls.runs[0].review.status, 'stored');
});

test('검토 동의 + 분석 실패: 실패한 사진도 검토본 대상, 응답은 500 그대로', async () => {
  const { deps, calls } = makeDeps({
    auth: VERIFIED,
    consent: consentDoc(true),
    analyze: async () => {
      throw new Error('boom');
    },
  });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(sent.status, 500);
  assert.equal(calls.reviewSaves.length, 1);
  assert.equal(calls.runs[0].review.status, 'stored');
});

test('검토 안 함(필수 둘만): 분석은 그대로 · 검토본 없음 · 원장 agreed/not-agreed', async () => {
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: consentDoc(false) });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs[0].analysisConsent, 'agreed');
  assert.equal(calls.runs[0].reviewConsent, 'not-agreed');
  assert.equal(calls.runs[0].review.status, 'skipped');
});

test('검토 동의여도 submissionId가 없으면 안 남긴다', async () => {
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: consentDoc(true) });
  const { response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({ submissionId: null }, APP_HEADERS), response, deps);

  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs[0].reviewConsent, 'agreed');
  assert.equal(calls.runs[0].review.status, 'skipped');
});

test('검토 동의여도 인증이 안 되면 안 남긴다 — 원장 unknown', async () => {
  const unverified: RunAuth = { accountKey: 'user:abc', authVerified: false, authKind: null, authError: 'Invalid Firebase ID token' };
  const { deps, calls } = makeDeps({ auth: unverified, consent: consentDoc(true) });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.deepEqual(calls.consentReads, []);
  assert.deepEqual(calls.reviewSaves, []);
  assert.equal(calls.runs[0].analysisConsent, 'unknown');
});

test('검토본 올리기가 실패해도 응답은 그대로 — 원장에 failed와 시도한 경로(탈퇴가 지울 수 있게)', async () => {
  const { deps, calls } = makeDeps({
    auth: VERIFIED,
    consent: consentDoc(true),
    saveReviewPhoto: async () => {
      throw new Error('storage down');
    },
  });
  const { sent, response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(sent.status, 200);
  assert.deepEqual(sent.body, SUCCESS_BODY);
  assert.equal(calls.runs[0].ok, true);
  assert.equal(calls.runs[0].review.status, 'failed');
  assert.match(calls.runs[0].review.photoPath ?? '', /^review\//);
});

test('같은 submissionId의 첫 검토본이 원장에 있으면 그 경로·만료를 다시 쓴다 (자정 넘긴 재시도)', async () => {
  const first = { photoPath: `review/2026-10-09/user:abc/${SUBMISSION}.jpg`, expiresAt: '2026-11-08T14:59:00.000Z' };
  const { deps, calls } = makeDeps({ auth: VERIFIED, consent: consentDoc(true), findFirstReview: async () => first });
  const { response } = fakeResponse();

  await handleAnalyzePhoto(appRequest({}, APP_HEADERS), response, deps);

  assert.equal(calls.reviewSaves[0].photoPath, first.photoPath);
  assert.equal(calls.runs[0].review.photoPath, first.photoPath);
  assert.equal(calls.runs[0].review.expiresAt, first.expiresAt);
});
