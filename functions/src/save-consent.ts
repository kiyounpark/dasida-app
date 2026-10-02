import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { CONSENT_VIA, type SaveConsentRequest } from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 줄 0 껍데기 — 본문은 1줄이 채운다(동의 문서 읽기 → 전이 규칙대로 시각 찍기 → 쓰기).
// 시각은 서버가 찍는다. 앱이 보낸 시각은 받지 않는다.

const consentFlags = z.object({ analysis: z.boolean(), store: z.boolean(), review: z.boolean() }).strict();
const consentVersions = z
  .object({
    analysis: z.number().int().min(1),
    store: z.number().int().min(1),
    review: z.number().int().min(1),
  })
  .strict();

export const SaveConsentRequestSchema = z
  .object({
    accountKey: z.string().min(1).max(200),
    decisions: consentFlags,
    copyVersion: consentVersions,
    via: z.enum(CONSENT_VIA),
    appVersion: z.string().max(32).nullable(),
  })
  .strict() satisfies z.ZodType<SaveConsentRequest>;

export const saveConsentHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = SaveConsentRequestSchema.safeParse(request.body);
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

      response.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      logger.error('saveConsent failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to save consent');
    }
  },
);
