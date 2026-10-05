import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { stripUndefined } from './firestore-sanitize';
import {
  buildPhotoNoteDoc,
  canonicalNoteJson,
  DOMAIN_ID_PATTERN,
  IMAGE_DATA_URL_PATTERN,
  isConsentOn,
  MAX_IMAGE_DATA_URL_LENGTH,
  MISTAKE_TYPE_IDS,
  notePhotoPath,
  PHOTO_OBJECT_META_NOTE_ID,
  PHOTO_OBJECT_META_SUBMISSION_ID,
  SUBMISSION_ID_PATTERN,
  type ApiErrorCode,
  type ConsentDoc,
  type PhotoNoteDoc,
  type PhotoNoteWire,
  type SavePhotoNoteRequest,
  type SavePhotoNoteResponse,
} from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';
import {
  decodeImageDataUrl,
  firebasePhotoObjectStore,
  looksLikeJpeg,
  md5Base64,
  photoNoteDocRef,
  readConsentDoc,
  type PhotoObjectStore,
} from './photo-storage';

// 1.0.11 2줄 — 약속 파일 「저장 규칙」 ①~④ 그대로.
// .strict() — photoUri 같은 폰 전용 칸이 섞여 오면 조용히 버리지 않고 400으로 거절한다.

// 문서 id로 그대로 쓴다 — '/'가 있으면 다른 경로가 되고, '.'·'..'·__x__는 Firestore가 안 받는다
const NOTE_DOC_ID_PATTERN = /^(?!\.\.?$)(?!__.*__$)[^/]+$/;

// 1.0.12 ⑵ 쪽지·재도전 — 폰 quiz-guard.ts의 isAnswerable과 같은 규칙(보기 2개 이상 · 정답 번호가 보기 안).
// 상한은 다른 본문 칸(2,000자 · 배열 10개)에 맞춘다 — 분석 스키마보다 넉넉하게, 학생 노트가 400으로 통째 실패하지 않게
const PhotoNoteQuizWireSchema = z
  .object({
    setup: z.string().max(2000).optional(),
    prompt: z.string().min(1).max(2000),
    options: z.array(z.string().max(2000)).min(2).max(10),
    answerIndex: z.number().int().min(0),
  })
  .strict()
  .refine((quiz) => quiz.answerIndex < quiz.options.length, { message: 'answerIndex out of range' });

const PhotoNoteConceptWireSchema = z
  .object({
    rule: z.string().min(1).max(2000),
    violation: z.string().min(1).max(2000),
  })
  .strict();

export const PhotoNoteWireSchema = z
  .object({
    id: z.string().min(1).max(120).regex(NOTE_DOC_ID_PATTERN),
    createdAt: z.string().min(1).max(40),
    schemaVersion: z.literal(1),
    dateLabel: z.string().max(40),
    quote: z.string().max(2000),
    why: z.string().max(2000),
    fix: z.string().max(2000),
    methodLabel: z.string().max(80),
    typeLabel: z.string().max(80),
    methodId: z.string().regex(DOMAIN_ID_PATTERN),
    mistakeType: z.enum(MISTAKE_TYPE_IDS),
    weaknessIds: z.array(z.string().regex(DOMAIN_ID_PATTERN)).max(10),
    primaryWeaknessId: z.string().regex(DOMAIN_ID_PATTERN).nullable(),
    checkPassed: z.boolean(),
    checkSkipped: z.boolean().optional(),
    retryResult: z.enum(['pass', 'fail', 'skip', 'none']),
    // 1.0.12~ — 없어도 된다(1.0.11 앱 노트)
    checkQuiz: PhotoNoteQuizWireSchema.optional(),
    retryQuiz: PhotoNoteQuizWireSchema.optional(),
    concept: PhotoNoteConceptWireSchema.optional(),
  })
  .strict() satisfies z.ZodType<PhotoNoteWire>;

export const SavePhotoNoteRequestSchema = z
  .object({
    accountKey: z.string().min(1).max(200),
    note: PhotoNoteWireSchema,
    imageDataUrl: z.string().regex(IMAGE_DATA_URL_PATTERN).max(MAX_IMAGE_DATA_URL_LENGTH).nullable(),
    submissionId: z.string().regex(SUBMISSION_ID_PATTERN).nullable(),
    appVersion: z.string().max(32).nullable(),
  })
  .strict() satisfies z.ZodType<SavePhotoNoteRequest>;

export type SavePhotoNoteDeps = {
  readConsent(accountKey: string): Promise<ConsentDoc | null>;
  readNote(accountKey: string, noteId: string): Promise<PhotoNoteDoc | null>;
  /** 'exists' = 같은 id 문서가 먼저 생겼다(ALREADY_EXISTS) */
  createNote(accountKey: string, noteId: string, doc: PhotoNoteDoc): Promise<'created' | 'exists'>;
  objects: Pick<PhotoObjectStore, 'readObjectInfo' | 'save'>;
  now(): Date;
};

export type SavePhotoNoteOutcome =
  | { status: 200; body: SavePhotoNoteResponse }
  | { status: 400 | 403 | 409 | 410 | 500; code: ApiErrorCode; error: string };

/** 서버 문서에서 서버 전용 칸을 떼면 노트 본문만 남는다 — 같은 내용인지 이걸로 가린다 */
function wireOf(doc: PhotoNoteDoc): PhotoNoteWire {
  const {
    accountKey: _accountKey,
    photoPath: _photoPath,
    submissionId: _submissionId,
    appVersion: _appVersion,
    storedAt: _storedAt,
    deletedAt: _deletedAt,
    ...note
  } = doc;
  return note;
}

/** ② 이미 있는 문서 앞에서의 판정 — 지웠음 410 · 같은 내용 200(아무것도 안 씀) · 다른 내용 409 */
function judgeExisting(existing: PhotoNoteDoc, note: PhotoNoteWire): SavePhotoNoteOutcome {
  if (existing.deletedAt) {
    return { status: 410, code: 'NOTE_DELETED', error: 'Note was deleted' };
  }
  if (canonicalNoteJson(wireOf(existing)) === canonicalNoteJson(note)) {
    return {
      status: 200,
      body: { noteId: note.id, photoPath: existing.photoPath, storedAt: existing.storedAt, alreadyStored: true },
    };
  }
  return { status: 409, code: 'NOTE_CONFLICT', error: 'Different note with the same id' };
}

/**
 * 저장 규칙 ①~④ (인증은 부르는 쪽이 끝냈다). 던지면 부르는 쪽이 500 TEMPORARY_FAILURE.
 * 사진을 먼저 올리고, 사진이 실패하면 문서를 안 쓴다 — "문서가 있음" = 사진·글 둘 다 남음.
 */
export async function savePhotoNoteCore(
  deps: SavePhotoNoteDeps,
  accountKey: string,
  request: SavePhotoNoteRequest,
): Promise<SavePhotoNoteOutcome> {
  const { note } = request;

  // ① 보관 동의 — 탈퇴가 consent를 먼저 지우니 늦게 온 저장도 여기서 막힌다
  const consent = await deps.readConsent(accountKey);
  if (!isConsentOn(consent?.store, 'store')) {
    return { status: 403, code: 'CONSENT_REQUIRED', error: 'Store consent required' };
  }

  // ② 이미 있나
  const existing = await deps.readNote(accountKey, note.id);
  if (existing) return judgeExisting(existing, note);

  // ③ 사진 — 조건부 생성 하나로 올린다(덮어쓰기 금지). 검사 → 업로드 사이에 다른 요청이 끼어
  //    "A의 글 + B의 사진"이 남는 경합을 막는다(10.02 줄 0 리뷰). 412일 때만 객체를 읽어 판정한다
  let photoPath: string | null = null;
  if (request.imageDataUrl) {
    const { bytes, contentType } = decodeImageDataUrl(request.imageDataUrl);
    if (!looksLikeJpeg(bytes)) {
      return { status: 400, code: 'INVALID_REQUEST', error: 'Image is not a JPEG' };
    }
    photoPath = notePhotoPath(accountKey, note.id);

    let saved: 'saved' | 'exists';
    try {
      saved = await deps.objects.save(photoPath, bytes, {
        contentType,
        metadata: {
          [PHOTO_OBJECT_META_NOTE_ID]: note.id,
          ...(request.submissionId ? { [PHOTO_OBJECT_META_SUBMISSION_ID]: request.submissionId } : {}),
        },
        onlyIfAbsent: true,
      });
    } catch (error) {
      logger.error('savePhotoNote photo upload failed', { accountKey, noteId: note.id, error });
      return { status: 500, code: 'TEMPORARY_FAILURE', error: 'Failed to store photo' };
    }

    if (saved === 'exists') {
      const existingPhoto = await deps.objects.readObjectInfo(photoPath);
      // 412 뒤에 사라졌다 — 다시 보내면 새로 만든다
      if (!existingPhoto) return { status: 500, code: 'TEMPORARY_FAILURE', error: 'Photo object changed' };
      if (existingPhoto.metadata[PHOTO_OBJECT_META_NOTE_ID] !== note.id) {
        return { status: 409, code: 'PATH_CONFLICT', error: 'Photo path belongs to another note' };
      }
      if (existingPhoto.md5Hash !== md5Base64(bytes)) {
        return { status: 409, code: 'NOTE_CONFLICT', error: 'Different photo for the same note' };
      }
      // 같은 노트·같은 사진 — 앞선 시도가 사진만 올리고 끊겼다. 다시 안 올리고 문서로 간다
    }
  }

  // ④ 문서 — create 한 번. 그 사이 같은 id가 먼저 생겼으면 ②로 돌아가 판정
  const storedAt = deps.now().toISOString();
  const doc = buildPhotoNoteDoc(note, {
    accountKey,
    photoPath,
    submissionId: request.submissionId,
    appVersion: request.appVersion,
    storedAt,
  });
  if ((await deps.createNote(accountKey, note.id, stripUndefined(doc))) === 'exists') {
    const raced = await deps.readNote(accountKey, note.id);
    if (!raced) return { status: 500, code: 'TEMPORARY_FAILURE', error: 'Note write raced' };
    return judgeExisting(raced, note);
  }

  return { status: 200, body: { noteId: note.id, photoPath, storedAt, alreadyStored: false } };
}

/** gRPC ALREADY_EXISTS */
function isAlreadyExists(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 6;
}

function liveDeps(): SavePhotoNoteDeps {
  const firestore = getFirestore();
  return {
    readConsent: (accountKey) => readConsentDoc(firestore, accountKey),
    async readNote(accountKey, noteId) {
      const snapshot = await photoNoteDocRef(firestore, accountKey, noteId).get();
      return snapshot.exists ? (snapshot.data() as PhotoNoteDoc) : null;
    },
    async createNote(accountKey, noteId, doc) {
      try {
        await photoNoteDocRef(firestore, accountKey, noteId).create(doc);
        return 'created';
      } catch (error) {
        if (isAlreadyExists(error)) return 'exists';
        throw error;
      }
    },
    objects: firebasePhotoObjectStore(),
    now: () => new Date(),
  };
}

export const savePhotoNoteHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 60, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = SavePhotoNoteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendApiError(response, 400, 'INVALID_REQUEST', 'Invalid request body');
      return;
    }

    try {
      const accountKey = await requireFirebaseAccount(
        request.headers as Record<string, string | string[] | undefined>,
        parsed.data.accountKey,
        response,
      );
      if (!accountKey) return;

      const outcome = await savePhotoNoteCore(liveDeps(), accountKey, parsed.data);
      if (outcome.status !== 200) {
        logger.warn('savePhotoNote refused', { accountKey, noteId: parsed.data.note.id, code: outcome.code });
        sendApiError(response, outcome.status, outcome.code, outcome.error);
        return;
      }
      logger.info('savePhotoNote stored', {
        accountKey,
        noteId: outcome.body.noteId,
        hasPhoto: outcome.body.photoPath !== null,
        alreadyStored: outcome.body.alreadyStored,
      });
      response.status(200).json(outcome.body);
    } catch (error) {
      logger.error('savePhotoNote failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to save photo note');
    }
  },
);
