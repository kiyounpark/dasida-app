import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';

import {
  photoStoreUrl,
  readApiErrorBody,
  RETRYABLE_CODES,
  SUBMISSION_ID_PATTERN,
  type ApiErrorCode,
  type CloudNoteState,
  type PhotoNoteQuizWire,
  type PhotoNoteWire,
  type SavePhotoNoteRequest,
  type SavePhotoNoteResponse,
} from '@/functions/src/photo-store-contract';

import type { PhotoQuiz } from '../flow/quiz-guard';
import { setPhotoNoteCloudStoredAt } from '../note-store';
import type { PhotoNote } from '../types';

/**
 * 노트 한 장을 서버(savePhotoNote)에 올린다 — 1.0.11 2줄.
 *
 * ☁ 「저장됨」은 서버 응답으로만 정한다. 로컬 저장 성공은 증거가 아니다(약속 파일 「저장 규칙」).
 * 타임아웃은 성공도 실패도 아니다 — 같은 요청을 다시 보낸다(서버가 같은 내용이면 alreadyStored로 받는다).
 *
 * 부르는 곳: 흐름 끝(use-photo-flow의 showNote) · 4 「서버에 없는 노트 올리기」 — 둘 다 uploadPhotoNote.
 */

/** 축소본(~700KB)을 느린 망으로 올려도 되게. 서버 함수 한도는 60초 */
const SAVE_TIMEOUT_MS = 45_000;
/** 재시도 가능한 실패(망·타임아웃·500)만 다시 — 처음 포함 최대 3번 */
const RETRY_DELAYS_MS: readonly number[] = [1_000, 3_000];
const APP_VERSION_MAX_LENGTH = 32;

/** 폰 노트 → 서버로 가는 모양. 폰 전용 칸 셋(photoUri·submissionId·cloudStoredAt)과 모르는 칸은 싣지 않는다(서버가 .strict) */
export function toPhotoNoteWire(note: PhotoNote): PhotoNoteWire {
  return {
    id: note.id,
    createdAt: note.createdAt,
    schemaVersion: 1,
    dateLabel: note.dateLabel,
    quote: note.quote,
    why: note.why,
    fix: note.fix,
    methodLabel: note.methodLabel,
    typeLabel: note.typeLabel,
    methodId: note.methodId,
    mistakeType: note.mistakeType,
    weaknessIds: note.weaknessIds,
    // 옛 노트엔 이 칸이 아예 없을 수 있다 — 카드(photo-note-card.tsx)도 같은 자리에서 null로 본다
    primaryWeaknessId: note.primaryWeaknessId ?? null,
    checkPassed: note.checkPassed,
    // 1.0.9까지 저장된 노트엔 없다 — 없는 칸은 없는 채로(서버 비교가 undefined 칸에 안 흔들린다)
    ...(typeof note.checkSkipped === 'boolean' ? { checkSkipped: note.checkSkipped } : {}),
    retryResult: note.retryResult,
    // 1.0.12 ⑵ — 여기서 빠지면 서버엔 영영 없다(본문 불변). 1.0.11까지의 노트엔 없는 칸이라 없는 채로
    ...(note.checkQuiz ? { checkQuiz: toQuizWire(note.checkQuiz) } : {}),
    ...(note.retryQuiz ? { retryQuiz: toQuizWire(note.retryQuiz) } : {}),
    ...(note.concept?.rule && note.concept.violation
      ? { concept: { rule: note.concept.rule, violation: note.concept.violation } }
      : {}),
  };
}

/**
 * 칸을 손으로 고른다 — 서버가 안쪽 객체도 .strict()라 모르는 칸이 섞이면 노트째 400이다.
 * setup은 글자가 있을 때만(null이 오면 서버가 거절한다) — 앱이 서버보다 먼저 거른다
 */
function toQuizWire(quiz: PhotoQuiz): PhotoNoteQuizWire {
  return {
    ...(typeof quiz.setup === 'string' && quiz.setup.length > 0 ? { setup: quiz.setup } : {}),
    prompt: quiz.prompt,
    options: [...quiz.options],
    answerIndex: quiz.answerIndex,
  };
}

export type SaveNoteRemoteOutcome =
  | { ok: true; response: SavePhotoNoteResponse }
  | {
      ok: false;
      /** 서버 응답 코드. 응답을 못 받았으면 null */
      status: number | null;
      code: ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'NO_AUTH';
      retryable: boolean;
    };

function buildRequest(accountKey: string, note: PhotoNote, imageDataUrl: string | null): SavePhotoNoteRequest {
  const appVersion = Constants.expoConfig?.version ?? null;
  return {
    accountKey,
    note: toPhotoNoteWire(note),
    imageDataUrl,
    // 서버 패턴에 안 맞으면 노트까지 400이 된다 — 그럴 바엔 번호만 뺀다(지어내지 않는다)
    submissionId: note.submissionId && SUBMISSION_ID_PATTERN.test(note.submissionId) ? note.submissionId : null,
    appVersion: appVersion && appVersion.length <= APP_VERSION_MAX_LENGTH ? appVersion : null,
  };
}

function isSaveResponse(value: unknown): value is SavePhotoNoteResponse {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Partial<SavePhotoNoteResponse>;
  return (
    typeof body.noteId === 'string' &&
    typeof body.storedAt === 'string' &&
    (body.photoPath === null || typeof body.photoPath === 'string') &&
    typeof body.alreadyStored === 'boolean'
  );
}

async function postOnce(
  accountKey: string,
  payload: string,
  getHeaders: (accountKey: string) => Promise<Record<string, string>>,
): Promise<SaveNoteRemoteOutcome> {
  // getRemoteAuthHeaders는 토큰을 못 받으면 계정 키만 준다 — 그대로 보내면 서버는 401, 사진 700KB만 버린다
  const headers = await getHeaders(accountKey).catch(() => ({}) as Record<string, string>);
  if (!headers.Authorization && !headers.authorization) {
    return { ok: false, status: null, code: 'NO_AUTH', retryable: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
  try {
    const response = await fetch(photoStoreUrl('savePhotoNote'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: payload,
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && isSaveResponse(data)) return { ok: true, response: data };

    // 오류는 code로 가른다 — 403 CONSENT_REQUIRED는 인증 실패가 아니라서 토큰 갱신·재전송 길로 안 보낸다
    const error = readApiErrorBody(data);
    if (error) return { ok: false, status: response.status, code: error.code, retryable: error.retryable };
    // code가 없는 응답(게이트웨이 5xx 등) — 서버가 말하지 않았으니 상태 코드로만 본다
    const code = response.ok || response.status >= 500 ? 'TEMPORARY_FAILURE' : 'INVALID_REQUEST';
    return { ok: false, status: response.status, code, retryable: RETRYABLE_CODES.has(code) || response.status === 429 };
  } catch {
    return { ok: false, status: null, code: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR', retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 서버에 한 번 저장(재시도 가능한 실패는 같은 요청으로 두 번 더). 던지지 않는다 */
export async function saveNoteRemote(input: {
  accountKey: string;
  note: PhotoNote;
  /** downscaleToDataUrl 결과 그대로. 폰에도 사진이 없으면 null */
  imageDataUrl: string | null;
  getHeaders: (accountKey: string) => Promise<Record<string, string>>;
  retryDelaysMs?: readonly number[];
}): Promise<SaveNoteRemoteOutcome> {
  const payload = JSON.stringify(buildRequest(input.accountKey, input.note, input.imageDataUrl));
  let outcome = await postOnce(input.accountKey, payload, input.getHeaders);
  for (const delay of input.retryDelaysMs ?? RETRY_DELAYS_MS) {
    if (outcome.ok || !outcome.retryable) break;
    await wait(delay);
    outcome = await postOnce(input.accountKey, payload, input.getHeaders);
  }
  return outcome;
}

/** 서버 응답 → 카드 ☁ 줄의 입력. alreadyStored도 「저장됨」이다(같은 내용이 이미 있다) */
export function cloudStateFromOutcome(outcome: SaveNoteRemoteOutcome): CloudNoteState {
  return outcome.ok
    ? { kind: 'stored', storedAt: outcome.response.storedAt, hasPhoto: outcome.response.photoPath !== null }
    : { kind: 'failed', retryable: outcome.retryable };
}

// ── ☁ 줄 상태 — 이번 실행 동안만. 카드가 note.id로 구독한다(대화 말풍선을 다시 그리지 않고 줄만 바뀐다) ──

const cloudStates = new Map<string, CloudNoteState>();
const listeners = new Set<() => void>();

export function setCloudNoteState(noteId: string, state: CloudNoteState): void {
  cloudStates.set(noteId, state);
  listeners.forEach((listener) => listener());
}

export function getCloudNoteState(noteId: string): CloudNoteState | null {
  return cloudStates.get(noteId) ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 이번 실행에서 올린 노트면 그 상태, 아니면 null */
export function useCloudNoteState(noteId: string): CloudNoteState | null {
  return useSyncExternalStore(subscribe, () => getCloudNoteState(noteId));
}

/**
 * 노트 한 장을 올리고 ☁ 줄을 「저장 중」 → 결과로 바꾼다. 성공하면 로컬 노트에 cloudStoredAt(서버 storedAt)을 적는다 —
 * 「서버에 없는 노트 올리기」(4)가 이 칸으로 거른다. 던지지 않는다.
 *
 * 4에서 부르는 법: uploadPhotoNote({ accountKey, note, imageDataUrl, getHeaders: getRemoteAuthHeaders })
 *   — imageDataUrl은 JPEG data URL(서버가 jpeg만 받는다) 또는 null(「저장됨 · 사진 없음」).
 */
export async function uploadPhotoNote(input: {
  accountKey: string;
  note: PhotoNote;
  imageDataUrl: string | null;
  getHeaders: (accountKey: string) => Promise<Record<string, string>>;
  /** 흐름 끝은 로컬 저장을 기다리지 않고 부른다 — 그 저장이 끝난 뒤에 cloudStoredAt을 적어야 덮이지 않는다 */
  localSaved?: Promise<unknown>;
  retryDelaysMs?: readonly number[];
}): Promise<CloudNoteState> {
  setCloudNoteState(input.note.id, { kind: 'saving' });
  const outcome = await saveNoteRemote(input);
  const state = cloudStateFromOutcome(outcome);
  setCloudNoteState(input.note.id, state);

  if (outcome.ok) {
    await input.localSaved?.catch(() => undefined);
    await setPhotoNoteCloudStoredAt(input.accountKey, input.note.id, outcome.response.storedAt);
  }
  return state;
}
