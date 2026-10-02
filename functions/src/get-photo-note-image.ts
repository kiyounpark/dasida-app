import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { accountNotePhotoPrefix, type PhotoNoteDoc } from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 1.0.11 3줄 — 문서의 photoPath를 서버가 읽어 JPEG 바이트로 준다.
// 앱은 경로를 보내지 않는다(쿼리는 accountKey·noteId뿐, 다른 칸은 zod가 버린다).

export const GetPhotoNoteImageQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
  // 문서 id = note.id 원문. '/'가 섞이면 Firestore가 경로로 읽으니 막는다
  noteId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[^/]+$/),
});

/** 응답에 쓰는 만큼만 — 테스트가 같은 모양의 가짜를 넣는다 */
export type PhotoImageResponse = {
  set(field: string, value: string): unknown;
  status(code: number): { json(body: unknown): unknown; send(body: Buffer): unknown };
};

export type NotePhotoSource = {
  /** 문서가 없으면 null */
  readNote(accountKey: string, noteId: string): Promise<Pick<PhotoNoteDoc, 'photoPath' | 'deletedAt'> | null>;
  /** 객체가 없으면 null */
  readPhoto(photoPath: string): Promise<Buffer | null>;
};

/**
 * 인증을 통과한 뒤의 몸통. 사진이 없으면(문서 없음·photoPath null·객체 없음) 404 PHOTO_MISSING.
 * 지운 노트(deletedAt)는 410 NOTE_DELETED — 1.0.11엔 지우는 길이 없어 늘 null이다.
 * photoPath가 이 계정 폴더 밖이면 주지 않는다 — 서버가 쓴 값이지만 남의 사진이 나가는 길은 0이어야 한다.
 */
export async function sendNotePhoto(
  source: NotePhotoSource,
  accountKey: string,
  noteId: string,
  response: PhotoImageResponse,
): Promise<void> {
  const note = await source.readNote(accountKey, noteId);
  if (note?.deletedAt) {
    sendApiError(response, 410, 'NOTE_DELETED', 'Note deleted');
    return;
  }

  const photoPath = note?.photoPath ?? null;
  if (!photoPath) {
    sendApiError(response, 404, 'PHOTO_MISSING', note ? 'Note has no photo' : 'Note not found');
    return;
  }

  if (!photoPath.startsWith(accountNotePhotoPrefix(accountKey))) {
    logger.error('getPhotoNoteImage: photoPath outside account folder', { accountKey, noteId });
    sendApiError(response, 404, 'PHOTO_MISSING', 'Photo not found');
    return;
  }

  const bytes = await source.readPhoto(photoPath);
  if (!bytes) {
    sendApiError(response, 404, 'PHOTO_MISSING', 'Photo not found');
    return;
  }

  response.set('Content-Type', 'image/jpeg');
  response.set('Cache-Control', 'private, no-store');
  response.status(200).send(bytes);
}

const firebaseNotePhotoSource: NotePhotoSource = {
  async readNote(accountKey, noteId) {
    const snapshot = await getFirestore()
      .collection('users')
      .doc(accountKey)
      .collection('photoNotes')
      .doc(noteId)
      .get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() as Partial<PhotoNoteDoc> | undefined;
    return { photoPath: data?.photoPath ?? null, deletedAt: data?.deletedAt ?? null };
  },
  async readPhoto(photoPath) {
    try {
      const [bytes] = await getStorage().bucket().file(photoPath).download();
      return bytes;
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code === 404) return null;
      throw error;
    }
  },
};

export const getPhotoNoteImageHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = GetPhotoNoteImageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      sendApiError(response, 400, 'INVALID_REQUEST', 'Invalid query');
      return;
    }

    try {
      const accountKey = await requireFirebaseAccount(
        request.headers as Record<string, string | string[] | undefined>,
        parsed.data.accountKey,
        response,
      );
      if (!accountKey) return;

      await sendNotePhoto(firebaseNotePhotoSource, accountKey, parsed.data.noteId, response);
    } catch (error) {
      logger.error('getPhotoNoteImage failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to read photo');
    }
  },
);
