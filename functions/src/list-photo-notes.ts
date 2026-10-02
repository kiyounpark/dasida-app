import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { LIST_PHOTO_NOTES_MAX_LIMIT } from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 줄 0 껍데기 — 본문은 3줄이 채운다(users/{accountKey}/photoNotes를 createdAt 내림차순으로,
// deletedAt 있는 문서도 포함 → ListPhotoNotesResponse).

export const ListPhotoNotesQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(LIST_PHOTO_NOTES_MAX_LIMIT).optional(),
  before: z.string().min(1).max(40).optional(),
});

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

      response.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      logger.error('listPhotoNotes failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to list photo notes');
    }
  },
);
