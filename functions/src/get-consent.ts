import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 줄 0 껍데기 — 본문은 1줄이 채운다(users/{accountKey}/private/consent 읽기 → GetConsentResponse).

export const GetConsentQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export const getConsentHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = GetConsentQuerySchema.safeParse(request.query);
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
      logger.error('getConsent failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to read consent');
    }
  },
);
