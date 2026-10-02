import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import {
  LIST_PHOTO_NOTES_DEFAULT_LIMIT,
  LIST_PHOTO_NOTES_MAX_LIMIT,
  type ListPhotoNotesResponse,
  type PhotoNoteDoc,
} from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 1.0.11 3줄 — users/{accountKey}/photoNotes를 createdAt 내림차순으로 준다.
// deletedAt 있는 문서도 준다(약속 파일 ListPhotoNotesResponse) — 거르는 건 앱 화면이다.

export const ListPhotoNotesQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(LIST_PHOTO_NOTES_MAX_LIMIT).optional(),
  before: z.string().min(1).max(40).optional(),
});

/**
 * Firestore Query에서 쓰는 만큼만. 테스트가 같은 모양의 가짜를 넣는다.
 * createdAt 한 칸 정렬·범위라 자동 단일 필드 색인으로 돈다(복합 색인 없음).
 */
export type PhotoNotesQuery = {
  orderBy(field: 'createdAt', direction: 'desc'): PhotoNotesQuery;
  where(field: 'createdAt', op: '<', value: string): PhotoNotesQuery;
  limit(count: number): PhotoNotesQuery;
  get(): Promise<{ docs: { data(): unknown }[] }>;
};

/**
 * 한 쪽을 읽는다. before는 createdAt 커서 — 그보다 앞(오래된) 것만.
 * limit+1개를 읽어 "더 있나"를 빈 쪽 요청 없이 안다.
 * 노트 id = photo-{createdAt}라 createdAt이 겹치지 않는다는 전제 위의 커서다.
 */
export async function listPhotoNotePage(
  notes: PhotoNotesQuery,
  options: { limit?: number; before?: string },
): Promise<ListPhotoNotesResponse> {
  const limit = options.limit ?? LIST_PHOTO_NOTES_DEFAULT_LIMIT;

  let query = notes.orderBy('createdAt', 'desc');
  if (options.before) {
    query = query.where('createdAt', '<', options.before);
  }

  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.map((doc) => doc.data() as PhotoNoteDoc);
  const page = docs.slice(0, limit);

  return {
    notes: page,
    nextBefore: docs.length > limit ? page[page.length - 1].createdAt : null,
  };
}

export const listPhotoNotesHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = ListPhotoNotesQuerySchema.safeParse(request.query);
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

      const notes: PhotoNotesQuery = getFirestore()
        .collection('users')
        .doc(accountKey)
        .collection('photoNotes');
      const page = await listPhotoNotePage(notes, {
        limit: parsed.data.limit,
        before: parsed.data.before,
      });
      response.status(200).json(page);
    } catch (error) {
      logger.error('listPhotoNotes failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to list photo notes');
    }
  },
);
