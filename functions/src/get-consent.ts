import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  CONSENT_VIA,
  type ConsentDoc,
  type ConsentEntry,
  type GetConsentResponse,
} from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 1줄 — users/{accountKey}/private/consent 읽기 → GetConsentResponse.
// 읽기 도우미(consentDocRef·readConsentDoc)는 saveConsent와 같이 쓴다.

export const GetConsentQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

const ConsentEntrySchema = z.object({
  version: z.number().int().min(0),
  agreedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
}) satisfies z.ZodType<ConsentEntry>;

export const ConsentDocSchema = z.object({
  schemaVersion: z.literal(1),
  accountKey: z.string(),
  analysis: ConsentEntrySchema,
  store: ConsentEntrySchema,
  review: ConsentEntrySchema,
  via: z.enum(CONSENT_VIA),
  updatedAt: z.string(),
  appVersion: z.string().nullable(),
}) satisfies z.ZodType<ConsentDoc>;

/** private/auth 옆. 탈퇴 recursiveDelete(users/{accountKey})가 같이 지운다 */
export function consentDocRef(firestore: Firestore, accountKey: string) {
  return firestore.collection('users').doc(accountKey).collection('private').doc('consent');
}

/** 깨진 문서는 null — "한 번도 안 봄"과 같게 다뤄 화면을 다시 띄운다(동의를 지어내지 않는다) */
export function parseConsentDoc(data: unknown): ConsentDoc | null {
  const parsed = ConsentDocSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function readConsentDoc(firestore: Firestore, accountKey: string): Promise<ConsentDoc | null> {
  const snapshot = await consentDocRef(firestore, accountKey).get();
  return snapshot.exists ? parseConsentDoc(snapshot.data()) : null;
}

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

      const body: GetConsentResponse = { consent: await readConsentDoc(getFirestore(), accountKey) };
      response.status(200).json(body);
    } catch (error) {
      logger.error('getConsent failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to read consent');
    }
  },
);
