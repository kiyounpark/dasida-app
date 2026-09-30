import assert from 'node:assert/strict';
import test from 'node:test';

import { APIConnectionTimeoutError } from 'openai';

import {
  ANALYZE_PHOTO_TIMEOUT_SECONDS,
  LEGACY_RESPONSE_DEADLINE_MS,
  RESPONSE_DEADLINE_MS,
  responseBudgetMs,
} from '../src/analyze-photo-core';
import {
  PHOTO_ROTATION_TIMEOUT_MS,
  PhotoAnalysisOutputError,
  requestPhotoAnalysisFromOpenAI,
  requestPhotoRotationFromOpenAI,
  type PhotoRotation,
  type PhotoRotationRead,
} from '../src/openai-client';
import {
  buildPhotoAnalysisRunDoc,
  classifyAnalyzeError,
  photoAiDeadlineMs,
  readRunRequestContext,
  RUN_AUTH_WAIT_MS,
  RUN_LOG_WRITE_MAX_WAIT_MS,
  RUN_LOG_WRITE_MIN_MS,
  runLogWriteWaitMs,
} from '../src/photo-analysis-run-log';
import {
  buildGateBlockedResult,
  decideGate,
  GATE_MIN_SHORT_SIDE,
  readImageSize,
  runPhotoGate,
  type PhotoGateRecord,
} from '../src/photo-gate';

// ── 가짜 이미지 — 헤더만 진짜 모양으로 만든다 ──

function segment(marker: number, payload: Buffer | number[]): Buffer {
  const body = Buffer.from(payload);
  const length = body.length + 2;
  return Buffer.concat([Buffer.from([0xff, marker, length >> 8, length & 0xff]), body]);
}

// SOI → APP0(JFIF) → [앞에 끼울 세그먼트] → DQT → SOF → DHT → SOS → 압축 데이터 → EOI
function jpeg(width: number, height: number, { sof = 0xc0, before = [] as Buffer[] } = {}): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    ...before,
    segment(0xdb, Buffer.alloc(65)),
    segment(sof, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
    segment(0xc4, Buffer.alloc(20)),
    segment(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0]),
    Buffer.alloc(200, 0x55),
    Buffer.from([0xff, 0xd9]),
  ]);
}

function png(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    length,
    Buffer.from('IHDR', 'latin1'),
    ihdr,
    Buffer.alloc(4), // CRC — 안 본다
  ]);
}

const dataUrl = (mime: string, bytes: Buffer) => `data:image/${mime};base64,${bytes.toString('base64')}`;
// 폰 사진처럼 EXIF(APP1)가 SOF 앞에 있는 꼴
const EXIF = segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), Buffer.alloc(2000, 0x11)]));

// 10.01 실측 사진 셋의 서버 도착 크기: 06(작음) · 08(누움) · 08-upright
const SMALL_06 = dataUrl('jpeg', jpeg(524, 813, { before: [EXIF] }));
const LYING_08 = dataUrl('jpeg', jpeg(1568, 1074));
const UPRIGHT_08 = dataUrl('jpeg', jpeg(1074, 1568, { sof: 0xc2 }));

// ── 헤더 크기 읽기 ──

test('readImageSize: 고정값 3개 — 524×813(SOF0·EXIF 뒤) · 1568×1074 · 1074×1568(SOF2)', () => {
  assert.deepEqual(readImageSize(SMALL_06), { width: 524, height: 813 });
  assert.deepEqual(readImageSize(LYING_08), { width: 1568, height: 1074 });
  assert.deepEqual(readImageSize(UPRIGHT_08), { width: 1074, height: 1568 });
});

test('readImageSize: PNG는 IHDR에서 읽는다', () => {
  assert.deepEqual(readImageSize(dataUrl('png', png(1200, 900))), { width: 1200, height: 900 });
});

test('readImageSize: SOF 없이 SOS가 오면 null', () => {
  const noSof = Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.alloc(14)),
    segment(0xdb, Buffer.alloc(65)),
    segment(0xda, [1, 1, 0, 0, 0x3f, 0]),
    Buffer.alloc(100, 0x55),
    Buffer.from([0xff, 0xd9]),
  ]);
  assert.equal(readImageSize(dataUrl('jpeg', noSof)), null);
});

test('readImageSize: SOF가 앞 64KB 밖에 있으면 null — 앞부분만 푼다 (astra 권고)', () => {
  const farSof = jpeg(1074, 1568, { before: [segment(0xe1, Buffer.alloc(65_000)), segment(0xe2, Buffer.alloc(2_000))] });
  assert.equal(readImageSize(dataUrl('jpeg', farSof)), null);
  // 64KB 안이면 찾는다
  const nearSof = jpeg(1074, 1568, { before: [segment(0xe1, Buffer.alloc(60_000))] });
  assert.deepEqual(readImageSize(dataUrl('jpeg', nearSof)), { width: 1074, height: 1568 });
});

test('readImageSize: SOF1 등 다른 SOF는 안 읽는다 → null (크기 판정만 건너뜀)', () => {
  assert.equal(readImageSize(dataUrl('jpeg', jpeg(1074, 1568, { sof: 0xc1 }))), null);
});

test('readImageSize: WebP는 null — 크기 판정을 건너뛴다', () => {
  assert.equal(readImageSize(dataUrl('webp', Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1'))), null);
});

test('readImageSize: 잘린 base64·빈 본문·쓰레기·data URL 아님 → null, 던지지 않는다', () => {
  const bytes = jpeg(1074, 1568);
  const sofAt = bytes.indexOf(Buffer.from([0xff, 0xc0]));
  const full = dataUrl('jpeg', bytes);
  const prefix = 'data:image/jpeg;base64,';
  // SOF 한가운데(높이까지만)에서 자르고, 4의 배수도 아니게
  const cut = prefix + full.slice(prefix.length, prefix.length + Math.floor((sofAt + 6) / 3) * 4 + 1);
  assert.equal(readImageSize(cut), null);
  assert.equal(readImageSize(prefix), null);
  assert.equal(readImageSize(prefix + '!!!!@@@@'), null);
  assert.equal(readImageSize('https://example.com/a.jpg'), null);
  // 폭·높이 0은 크기가 아니다
  assert.equal(readImageSize(dataUrl('jpeg', jpeg(0, 1568))), null);
});

// ── 판정 ──

test('decideGate: 판정 표 — 작은 게 먼저, 판독 실패(null)는 막지 않는다', () => {
  const rows: Array<[number | null, PhotoRotation | null, string]> = [
    [524, null, 'blocked_small'],
    [524, 'rotated_left', 'blocked_small'], // 작은 사진은 세워도 못 읽는다
    [799, 'upright', 'blocked_small'],
    [800, 'upright', 'pass'],
    [1074, 'upright', 'pass'],
    [1074, 'rotated_left', 'blocked_rotation'],
    [1074, 'rotated_right', 'blocked_rotation'],
    [1074, 'upside_down', 'blocked_rotation'],
    [1074, null, 'pass'], // astra ③ — 판독 실패는 열어 둔다
    [null, 'upright', 'pass'], // WebP 등 크기 모름
    [null, 'rotated_right', 'blocked_rotation'],
    [null, null, 'pass'],
  ];
  for (const [shortSide, rotation, expected] of rows) {
    assert.equal(decideGate({ shortSide, rotation }), expected, `${shortSide}/${rotation}`);
  }
  assert.equal(GATE_MIN_SHORT_SIDE, 800);
});

// ── 게이트 흐름 (헤더 → 판독 → 판정) ──

const USAGE = { input: 2434, cached: 0, output: 700, reasoning: 500, total: 3134 };
function reader(rotation: PhotoRotation, calls: { n: number }) {
  return async (): Promise<PhotoRotationRead> => {
    calls.n += 1;
    return { rotation, usage: USAGE, ms: 5000, model: 'gpt-5.4-mini-2026-03-17', responseId: 'resp_rot' };
  };
}

test('runPhotoGate: 작은 사진(06)은 판독을 안 돌리고 blocked_small·skipped_small', async () => {
  const calls = { n: 0 };
  const gate = await runPhotoGate(SMALL_06, reader('upright', calls));

  assert.equal(calls.n, 0);
  assert.equal(gate.decision, 'blocked_small');
  assert.equal(gate.rotationCheck, 'skipped_small');
  assert.equal(gate.rotation, null);
  assert.deepEqual([gate.width, gate.height, gate.shortSide], [524, 813, 524]);
  assert.equal(gate.gateUsage, null);
});

test('runPhotoGate: 누운 사진(08)은 blocked_rotation·done, 판독 usage·모델·응답 id를 남긴다', async () => {
  const calls = { n: 0 };
  const gate = await runPhotoGate(LYING_08, reader('rotated_left', calls));

  assert.equal(calls.n, 1);
  assert.equal(gate.decision, 'blocked_rotation');
  assert.equal(gate.rotationCheck, 'done');
  assert.equal(gate.rotation, 'rotated_left');
  assert.equal(gate.shortSide, 1074);
  assert.deepEqual(gate.gateUsage, USAGE);
  assert.equal(gate.model, 'gpt-5.4-mini-2026-03-17');
  assert.equal(gate.responseId, 'resp_rot');
});

test('runPhotoGate: 세운 사진(08-upright)은 pass·done', async () => {
  const gate = await runPhotoGate(UPRIGHT_08, reader('upright', { n: 0 }));
  assert.equal(gate.decision, 'pass');
  assert.equal(gate.rotationCheck, 'done');
});

test('runPhotoGate: 판독이 실패하면 rotation null → pass·skipped_error (astra ③ 오차단 없음)', async () => {
  const gate = await runPhotoGate(LYING_08, async () => {
    throw new Error('boom');
  });
  assert.equal(gate.decision, 'pass');
  assert.equal(gate.rotationCheck, 'skipped_error');
  assert.equal(gate.rotation, null);
});

test('runPhotoGate: 판독 시간 초과는 pass·skipped_timeout', async () => {
  const gate = await runPhotoGate(LYING_08, async () => {
    throw new APIConnectionTimeoutError();
  });
  assert.equal(gate.decision, 'pass');
  assert.equal(gate.rotationCheck, 'skipped_timeout');
});

test('runPhotoGate: 판독 출력이 깨져도 pass·skipped_error, 청구된 usage는 남긴다', async () => {
  const gate = await runPhotoGate(LYING_08, async () => {
    throw new PhotoAnalysisOutputError('parse_failed', 'resp_bad', 'gpt-5.4-mini-2026-03-17', USAGE);
  });
  assert.equal(gate.decision, 'pass');
  assert.equal(gate.rotationCheck, 'skipped_error');
  assert.deepEqual(gate.gateUsage, USAGE);
  assert.equal(gate.responseId, 'resp_bad');
});

test('runPhotoGate: 크기를 모르면(WebP) 판독은 돌린다', async () => {
  const calls = { n: 0 };
  const gate = await runPhotoGate(dataUrl('webp', Buffer.from('RIFF')), reader('upside_down', calls));
  assert.equal(calls.n, 1);
  assert.equal(gate.shortSide, null);
  assert.equal(gate.decision, 'blocked_rotation');
});

// ── 걸림 응답 — 1.0.9 앱도 retake 갈래로 가게 ──

function blockedGate(decision: 'blocked_small' | 'blocked_rotation'): PhotoGateRecord {
  return {
    decision,
    rotationCheck: decision === 'blocked_small' ? 'skipped_small' : 'done',
    rotation: decision === 'blocked_small' ? null : 'rotated_left',
    width: 1568,
    height: 1074,
    shortSide: 1074,
    gateMs: 5200,
    gateUsage: decision === 'blocked_small' ? null : USAGE,
    model: decision === 'blocked_small' ? null : 'gpt-5.4-mini-2026-03-17',
    responseId: decision === 'blocked_small' ? null : 'resp_rot',
  };
}

test('buildGateBlockedResult: hasSolvingWork:false + gate — 옛 앱은 다시 찍기로, 새 웹은 gate로 가른다', () => {
  const result = buildGateBlockedResult(blockedGate('blocked_rotation'));

  assert.equal(result.hasSolvingWork, false);
  assert.equal(result.needsManualSelection, true);
  assert.equal(result.predictedMethodId, 'unknown');
  assert.deepEqual(result.candidateMethodIds, ['unknown']);
  assert.deepEqual(result.errorCandidates, []);
  assert.equal(result.errorConfidence, 0);
  assert.equal(result.userAnswer, null);
  assert.equal(result.reason, 'gate');
  assert.equal(result.source, 'openai-vision');
  // 응답엔 원장보다 좁게 — usage·응답 id는 안 나간다
  assert.deepEqual(result.gate, { decision: 'blocked_rotation', rotation: 'rotated_left', width: 1568, height: 1074 });
  // web-proto/app.js routeFromAnalysis가 보는 조건
  assert.equal(result.gate.decision.startsWith('blocked'), true);
});

// ── 예산 — clientDeadlineMs 표식 (astra ①⑤) ──

test('readRunRequestContext: clientDeadlineMs는 30~300초 정수만, retakeOf는 submissionId 형식만', () => {
  const read = (body: Record<string, unknown>) => readRunRequestContext({ imageDataUrl: 'x', ...body });

  assert.equal(read({ clientDeadlineMs: 195_000 }).clientDeadlineMs, 195_000);
  assert.equal(read({ clientDeadlineMs: 30_000 }).clientDeadlineMs, 30_000);
  assert.equal(read({ clientDeadlineMs: 300_000 }).clientDeadlineMs, 300_000);
  for (const bad of [29_999, 300_001, 195_000.5, '195000', -1, Number.NaN, null, undefined]) {
    assert.equal(read({ clientDeadlineMs: bad }).clientDeadlineMs, null, String(bad));
  }
  assert.equal(read({ retakeOf: '8f14e45f-ceea-467a-9575-1b2c3d4e5f60' }).retakeOf, '8f14e45f-ceea-467a-9575-1b2c3d4e5f60');
  for (const bad of ['<script>', 'short', 42, null]) {
    assert.equal(read({ retakeOf: bad }).retakeOf, null, String(bad));
  }
});

test('responseBudgetMs: 표식 있으면 min(clientDeadlineMs − 15초, 177초), 없으면 57초(지금과 같음)', () => {
  assert.equal(responseBudgetMs(null), LEGACY_RESPONSE_DEADLINE_MS);
  assert.equal(LEGACY_RESPONSE_DEADLINE_MS, 57_000);
  assert.equal(responseBudgetMs(195_000), 177_000); // 웹·1.0.10
  assert.equal(responseBudgetMs(300_000), RESPONSE_DEADLINE_MS);
  assert.equal(responseBudgetMs(60_000), 45_000);
  // 범위 밖 값은 readRunRequestContext가 null로 바꿔 둔다 → 57초
  assert.equal(responseBudgetMs(readRunRequestContext({ clientDeadlineMs: 999_999 }).clientDeadlineMs), 57_000);
});

test('photoAiDeadlineMs: 게이트가 쓴 시간을 빼고 준다 — 상한 165초, 바닥 0', () => {
  assert.equal(photoAiDeadlineMs(177_000, 5_000), 165_000);
  assert.equal(photoAiDeadlineMs(177_000, 20_000), 152_000);
  assert.equal(photoAiDeadlineMs(57_000, 4_000), 48_000);
  assert.equal(photoAiDeadlineMs(57_000, 11_000), 41_000);
  assert.equal(photoAiDeadlineMs(57_000, 60_000), 0);
});

// 최악: 게이트가 판독 상한(20초)을 다 쓰고, AI가 제 마감을 다 쓰고, 인증도 2초를 다 쓴다.
// 그래도 원장에 3초 이상이 남고 전체가 예산 안에 든다 — 1.0.9(75초에 끊음)는 57초 안, 웹(195초)은 177초 안.
for (const [label, clientDeadlineMs, clientAbortMs] of [
  ['표식 없음(1.0.9·옛 웹 탭)', null, 75_000],
  ['웹 195초', 195_000, 195_000],
] as const) {
  test(`예산 사슬 — ${label}: 게이트 20초 + AI + 인증 + 원장이 예산 안, 클라이언트가 끊기 전에 응답`, () => {
    const budget = responseBudgetMs(clientDeadlineMs);
    const receivedAt = new Date('2026-10-01T00:00:00.000Z');
    const gateEnd = PHOTO_ROTATION_TIMEOUT_MS;
    const aiEnd = gateEnd + photoAiDeadlineMs(budget, gateEnd);
    const authEnd = aiEnd + RUN_AUTH_WAIT_MS;
    const logWait = runLogWriteWaitMs(receivedAt, budget, receivedAt.getTime() + authEnd);

    assert.ok(logWait >= RUN_LOG_WRITE_MIN_MS, `원장 몫 ${logWait}`);
    assert.ok(authEnd + logWait <= budget, `${authEnd + logWait} > ${budget}`);
    // 파싱·응답 여유 3초까지 함수 한도 안, 클라이언트가 끊기 전
    assert.ok(budget + 3_000 <= ANALYZE_PHOTO_TIMEOUT_SECONDS * 1000);
    assert.ok(budget + 3_000 < clientAbortMs);
  });
}

test('runLogWriteWaitMs: 예산이 많이 남아도 원장은 10초까지만 기다린다', () => {
  const receivedAt = new Date('2026-10-01T00:00:00.000Z');
  assert.equal(RUN_LOG_WRITE_MAX_WAIT_MS, 10_000);
  assert.equal(runLogWriteWaitMs(receivedAt, 177_000, receivedAt.getTime() + 6_000), 10_000);
  assert.equal(runLogWriteWaitMs(receivedAt, 57_000, receivedAt.getTime() + 6_000), 10_000);
});

// ── 긴 Retry-After — 재시도 없이 즉시 실패 (astra ④) ──

function rateLimitedFetch(calls: { n: number }) {
  return async () => {
    calls.n += 1;
    return new Response(JSON.stringify({ error: { message: 'Rate limit reached', type: 'requests' } }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '30' },
    });
  };
}

test('본 호출: 가짜 OpenAI가 429 + Retry-After 30을 주면 기다리지 않고 한 번에 실패 — openai_error', async () => {
  const calls = { n: 0 };
  const startedAt = Date.now();
  await assert.rejects(
    requestPhotoAnalysisFromOpenAI({
      apiKey: 'test-key',
      model: 'gpt-5.4-mini',
      reasoningEffort: 'medium',
      imageDataUrl: UPRIGHT_08,
      methodContextText: '',
      fetch: rateLimitedFetch(calls),
    }),
    (error: unknown) => {
      assert.equal(classifyAnalyzeError(error), 'openai_error');
      return true;
    },
  );
  assert.equal(calls.n, 1);
  assert.ok(Date.now() - startedAt < 2_000);
});

test('회전 판독: 429 + Retry-After 30도 한 번에 실패 → 게이트는 pass·skipped_error', async () => {
  const calls = { n: 0 };
  const startedAt = Date.now();
  const gate = await runPhotoGate(LYING_08, () =>
    requestPhotoRotationFromOpenAI({
      apiKey: 'test-key',
      model: 'gpt-5.4-mini',
      imageDataUrl: LYING_08,
      fetch: rateLimitedFetch(calls),
    }),
  );
  assert.equal(calls.n, 1);
  assert.ok(Date.now() - startedAt < 2_000);
  assert.equal(gate.decision, 'pass');
  assert.equal(gate.rotationCheck, 'skipped_error');
});

test('회전 판독: 스키마 밖 rotation이 오면 parse_failed로 던진다 (usage 실음)', async () => {
  const fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'resp_x',
        object: 'response',
        model: 'gpt-5.4-mini-2026-03-17',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: '{"rotation":"sideways","hasSolvingWork":true,"lines":[]}' }],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  await assert.rejects(
    requestPhotoRotationFromOpenAI({ apiKey: 'k', model: 'm', imageDataUrl: LYING_08, fetch }),
    (error: unknown) => {
      assert.ok(error instanceof PhotoAnalysisOutputError);
      assert.equal(error.kind, 'parse_failed');
      assert.equal(error.usage?.total, 15);
      return true;
    },
  );
});

// ── 원장 v2 ──

function v2Input(gate: PhotoGateRecord | null) {
  return {
    context: readRunRequestContext({
      channel: 'web',
      submissionId: '9a1b2c3d-0000-4000-8000-000000000002',
      retakeOf: '9a1b2c3d-0000-4000-8000-000000000001',
      clientDeadlineMs: 195_000,
    }),
    auth: { accountKey: null, authVerified: false, authKind: null, authError: null },
    receivedAt: new Date('2026-10-01T03:00:00.000Z'),
    imageDataUrl: LYING_08,
    modelRequested: 'gpt-5.4-mini',
    reasoningEffort: 'medium',
    gate,
  };
}
// 집계 규칙 둘 — photo-analysis-run-log.ts 맨 위 주석과 같게 (astra ⑥)
const countsAsAnalysis = (doc: { ok: boolean; result: unknown }) => doc.ok && doc.result !== null;
const countsAsGated = (doc: { gate?: { decision: string } | null }) => doc.gate?.decision.startsWith('blocked') === true;

test('원장 v2: 걸린 행 — ok·200·result null·durationMs 0, gate 전 필드·retakeOf·clientDeadlineMs, undefined 없음', () => {
  const gate = blockedGate('blocked_rotation');
  const doc = buildPhotoAnalysisRunDoc({ ...v2Input(gate), durationMs: 0, openAi: null, outcome: { ok: true, result: null } });

  assert.equal(doc.schemaVersion, 2);
  assert.equal(doc.ok, true);
  assert.equal(doc.httpStatus, 200);
  assert.equal(doc.errorKind, null);
  assert.equal(doc.result, null);
  assert.equal(doc.durationMs, 0);
  assert.equal(doc.model, null); // 본 호출 없음 — 판독 모델은 gate.model
  assert.deepEqual(doc.gate, gate);
  assert.deepEqual(Object.keys(doc.gate!).sort(), [
    'decision', 'gateMs', 'gateUsage', 'height', 'model', 'responseId', 'rotation', 'rotationCheck', 'shortSide', 'width',
  ]);
  assert.equal(doc.retakeOf, '9a1b2c3d-0000-4000-8000-000000000001');
  assert.equal(doc.clientDeadlineMs, 195_000);
  assert.ok(Object.values(doc).every((value) => value !== undefined));
  assert.equal(countsAsAnalysis(doc), false);
  assert.equal(countsAsGated(doc), true);
});

test('원장 v2: 판독 실패(skipped) 뒤 분석 성공은 성공으로 센다 — gate.decision===pass로 세면 안 된다', () => {
  const gate: PhotoGateRecord = { ...blockedGate('blocked_rotation'), decision: 'pass', rotationCheck: 'skipped_timeout', rotation: null };
  const doc = buildPhotoAnalysisRunDoc({
    ...v2Input(gate),
    durationMs: 80_000,
    openAi: { model: 'gpt-5.4-mini-2026-03-17', responseId: 'resp_main', usage: USAGE },
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

  assert.equal(countsAsAnalysis(doc), true);
  assert.equal(countsAsGated(doc), false);
  // v1 행(gate 칸 없음)도 같은 규칙으로 성공을 센다
  assert.equal(countsAsAnalysis({ ok: true, result: { predictedMethodId: 'x' } }), true);
  assert.equal(countsAsGated({}), false);
});

test('원장 v2: 본 호출 실패 행은 gate를 싣고 ok:false·500', () => {
  const gate: PhotoGateRecord = { ...blockedGate('blocked_rotation'), decision: 'pass', rotation: 'upright' };
  const doc = buildPhotoAnalysisRunDoc({
    ...v2Input(gate),
    durationMs: 150_000,
    openAi: null,
    outcome: { ok: false, error: new APIConnectionTimeoutError() },
  });
  assert.equal(doc.ok, false);
  assert.equal(doc.httpStatus, 500);
  assert.equal(doc.errorKind, 'openai_timeout');
  assert.equal(doc.gate?.decision, 'pass');
  assert.equal(countsAsAnalysis(doc), false);
});
