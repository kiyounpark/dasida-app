import { APIConnectionTimeoutError, APIUserAbortError } from 'openai';

import type { PhotoRouterResult } from './analyze-photo-core';
import {
  PhotoAnalysisOutputError,
  type PhotoAnalysisUsage,
  type PhotoRotation,
  type PhotoRotationRead,
} from './openai-client';

// 사진 거르기 — 본 호출 앞에서 "읽을 수 없는 사진"을 돌려보낸다. 서버 analyzePhoto 한 곳에서만 한다(클라이언트 선검사 없음).
// 설계: dasida-measure/2026-09-29-real-student-timeout/astra-fable-1001/q8-gate-design-final.md (10.01 Fable, astra q9 반영)

// 짧은 변 하한. 🚧 임시값 — 축소 뒤 서버가 받은 이미지의 짧은 변 기준(웹은 10.01부터 픽셀 총량 1176×1568 + 긴 변 2048로 줄여 보낸다 · 앱 1.0.9는 아직 긴 변 1568).
// 근거(08 세운 사진을 줄여 5회씩, step12/log-res.txt·log-control1074.txt): 524 첫 후보 빗나감 3·빈칸 2 ·
// 700 빗나감 2·빈칸 2 · 900 빈칸 5/5 · 1074 첫 후보 적중 4/5. 800~1000 사이는 안 쟀다 — 게이트 원장의 width 분포를 보고 옮긴다.
export const GATE_MIN_SHORT_SIDE = 800;

// 크기만 읽으면 된다 — base64 앞 64KB만 푼다. SOF가 그 뒤에 있는 JPEG은 null(크기 판정 건너뜀)
const HEADER_SCAN_BYTES = 64 * 1024;
const HEADER_SCAN_BASE64_CHARS = Math.ceil(HEADER_SCAN_BYTES / 3) * 4;

export type GateDecision = 'pass' | 'blocked_small' | 'blocked_rotation';
// done = 판독이 돌았다 · skipped_small = 작아서 판독 안 돌림 · skipped_timeout/error = 판독 실패(열어 둔다 → pass)
export type RotationCheck = 'done' | 'skipped_small' | 'skipped_timeout' | 'skipped_error';

// 원장 v2 gate 칸 (photo-analysis-run-log.ts). 필드 이름은 예약급 — 바꾸면 지난 행과 못 이어 센다
export type PhotoGateRecord = {
  decision: GateDecision;
  rotationCheck: RotationCheck;
  rotation: PhotoRotation | null;
  width: number | null;
  height: number | null;
  shortSide: number | null;
  gateMs: number;
  gateUsage: PhotoAnalysisUsage | null;
  model: string | null;
  responseId: string | null;
};

// 학생 쪽 응답에 싣는 gate — 원장보다 좁게
export type PhotoGateView = Pick<PhotoGateRecord, 'decision' | 'rotation' | 'width' | 'height'>;

// 의존성 0(sharp 안 넣는다 — 배포 무게·콜드스타트). JPEG SOF0/SOF2 · PNG IHDR만 본다. WebP·못 찾음·깨짐은 null.
export function readImageSize(dataUrl: string): { width: number; height: number } | null {
  const match = /^data:image\/(jpeg|png|webp);base64,/.exec(dataUrl);
  if (!match || match[1] === 'webp') return null;
  const bytes = Buffer.from(dataUrl.slice(match[0].length, match[0].length + HEADER_SCAN_BASE64_CHARS), 'base64');
  const size = match[1] === 'png' ? readPngSize(bytes) : readJpegSize(bytes);
  return size && size.width > 0 && size.height > 0 ? size : null;
}

function readPngSize(bytes: Buffer): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b)) return null;
  if (bytes.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readJpegSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) return null; // 세그먼트 경계가 어긋났다 — 깨진 파일
    const marker = bytes[i + 1];
    if (marker === 0xff) { i += 1; continue; } // 채움 바이트
    // 길이 없는 표식: TEM·RST0~7
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    // EOI·SOS를 SOF 전에 만나면 크기가 없다
    if (marker === 0xd9 || marker === 0xda) return null;
    if (i + 3 >= bytes.length) return null;
    const length = bytes.readUInt16BE(i + 2);
    if (length < 2) return null;
    if (marker === 0xc0 || marker === 0xc2) {
      if (i + 8 >= bytes.length) return null;
      return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
    }
    i += 2 + length;
  }
  return null;
}

// 작은 사진이 먼저 — 작은 사진은 세워도 못 읽는다(step-c 4/10). 판독 실패(rotation null)는 막지 않는다 —
// 게이트 장애가 모든 학생을 막으면 안 된다 (astra ③)
export function decideGate({
  shortSide,
  rotation,
}: {
  shortSide: number | null;
  rotation: PhotoRotation | null;
}): GateDecision {
  if (shortSide !== null && shortSide < GATE_MIN_SHORT_SIDE) return 'blocked_small';
  if (rotation !== null && rotation !== 'upright') return 'blocked_rotation';
  return 'pass';
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIUserAbortError ||
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  );
}

// 헤더 크기 → (크기 통과면) 회전 판독 → 판정. 절대 던지지 않는다 — 판독이 실패하면 rotation null로 열어 둔다.
export async function runPhotoGate(
  imageDataUrl: string,
  readRotation: () => Promise<PhotoRotationRead>,
): Promise<PhotoGateRecord> {
  const startedAt = Date.now();
  const size = readImageSize(imageDataUrl);
  const shortSide = size ? Math.min(size.width, size.height) : null;
  const base = {
    width: size?.width ?? null,
    height: size?.height ?? null,
    shortSide,
  };

  if (shortSide !== null && shortSide < GATE_MIN_SHORT_SIDE) {
    return {
      ...base,
      decision: decideGate({ shortSide, rotation: null }),
      rotationCheck: 'skipped_small',
      rotation: null,
      gateMs: Date.now() - startedAt,
      gateUsage: null,
      model: null,
      responseId: null,
    };
  }

  try {
    const read = await readRotation();
    return {
      ...base,
      decision: decideGate({ shortSide, rotation: read.rotation }),
      rotationCheck: 'done',
      rotation: read.rotation,
      gateMs: Date.now() - startedAt,
      gateUsage: read.usage,
      model: read.model,
      responseId: read.responseId,
    };
  } catch (error) {
    // 출력이 깨진 실패도 토큰은 나갔다 — 에러가 싣고 온 usage를 남긴다
    const outputError = error instanceof PhotoAnalysisOutputError ? error : null;
    return {
      ...base,
      decision: decideGate({ shortSide, rotation: null }),
      rotationCheck: isTimeoutError(error) ? 'skipped_timeout' : 'skipped_error',
      rotation: null,
      gateMs: Date.now() - startedAt,
      gateUsage: outputError?.usage ?? null,
      model: outputError?.model ?? null,
      responseId: outputError?.responseId ?? null,
    };
  }
}

export function photoGateView(gate: PhotoGateRecord): PhotoGateView {
  return { decision: gate.decision, rotation: gate.rotation, width: gate.width, height: gate.height };
}

// 걸리면 HTTP 200 + hasSolvingWork:false. 1.0.9 앱은 gate를 몰라도 hasSolvingWork:false만 보고
// retake 갈래로 간다(route-from-analysis.ts). 4xx면 1.0.9가 "분석 서버가 422로 답했어"를 띄운다 — 그래서 200.
export function buildGateBlockedResult(gate: PhotoGateRecord): PhotoRouterResult & { gate: PhotoGateView } {
  return {
    hasSolvingWork: false,
    userAnswer: null,
    transcription: '',
    predictedMethodId: 'unknown',
    confidence: 0,
    candidateMethodIds: ['unknown'],
    reason: 'gate',
    needsManualSelection: true,
    source: 'openai-vision',
    errorCandidates: [],
    errorConfidence: 0,
    gate: photoGateView(gate),
  };
}
