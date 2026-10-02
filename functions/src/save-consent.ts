import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { consentDocRef, parseConsentDoc } from './get-consent';
import {
  CONSENT_KINDS,
  CONSENT_VIA,
  emptyConsentEntry,
  type ConsentDoc,
  type ConsentEntry,
  type SaveConsentRequest,
  type SaveConsentResponse,
} from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 1줄 — 동의 문서 읽기 → 전이 규칙(약속 파일 §1 주석)대로 시각 찍기 → 쓰기.
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

/** 판과 상관없이 지금 켜져 있나 — 같은 시각에 켜고 껐으면 꺼짐(isConsentOn과 같은 비교) */
function isSwitchedOn(entry: ConsentEntry): boolean {
  if (!entry.agreedAt) return false;
  return !(entry.revokedAt && entry.revokedAt >= entry.agreedAt);
}

/**
 * 칸 하나의 전이. 약속 파일 §1:
 *   처음 거부 = 둘 다 null · 켬 = agreedAt=now, revokedAt=null · 끔 = agreedAt 유지, revokedAt=now
 *   같은 선택 재전송 = 시각 안 바꿈 · version은 보낸 판으로.
 * "같은 선택"은 같은 답 + 같은 판으로 읽는다 — 문구 판이 올라 다시 켠 건 새 동의라 agreedAt을 새로 찍는다.
 */
export function nextConsentEntry(
  prev: ConsentEntry,
  decision: boolean,
  version: number,
  nowIso: string,
): ConsentEntry {
  const wasOn = isSwitchedOn(prev);

  if (decision) {
    if (wasOn && prev.version === version) return prev;
    return { version, agreedAt: nowIso, revokedAt: null };
  }

  if (wasOn) return { version, agreedAt: prev.agreedAt, revokedAt: nowIso };
  if (prev.version === version) return prev;
  return { version, agreedAt: prev.agreedAt, revokedAt: prev.revokedAt };
}

/**
 * 다음 문서. 세 칸·via·appVersion이 전부 그대로면 prev를 그대로 돌려준다(쓰기도 안 한다) —
 * 재시도·중복 전송이 updatedAt까지 안 흔든다.
 */
export function buildNextConsentDoc(
  prev: ConsentDoc | null,
  request: SaveConsentRequest,
  nowIso: string,
): ConsentDoc {
  const entries = {} as Record<(typeof CONSENT_KINDS)[number], ConsentEntry>;
  let changed = prev === null || prev.via !== request.via || prev.appVersion !== request.appVersion;

  for (const kind of CONSENT_KINDS) {
    const before = prev?.[kind] ?? emptyConsentEntry();
    const after = nextConsentEntry(before, request.decisions[kind], request.copyVersion[kind], nowIso);
    entries[kind] = after;
    if (after !== before) changed = true;
  }

  if (prev && !changed) return prev;

  return {
    schemaVersion: 1,
    accountKey: request.accountKey,
    ...entries,
    via: request.via,
    updatedAt: nowIso,
    appVersion: request.appVersion,
  };
}

/** 읽기·쓰기를 한 트랜잭션에 — 두 기기가 동시에 넘겨도 전이가 한 번씩 적용된다 */
export async function saveConsentDoc(
  firestore: Firestore,
  request: SaveConsentRequest,
  now: Date = new Date(),
): Promise<ConsentDoc> {
  const ref = consentDocRef(firestore, request.accountKey);
  const nowIso = now.toISOString();

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const prev = snapshot.exists ? parseConsentDoc(snapshot.data()) : null;
    const next = buildNextConsentDoc(prev, request, nowIso);
    if (next !== prev) transaction.set(ref, next);
    return next;
  });
}

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

      const consent = await saveConsentDoc(getFirestore(), { ...parsed.data, accountKey });
      const body: SaveConsentResponse = { consent };
      response.status(200).json(body);
    } catch (error) {
      logger.error('saveConsent failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to save consent');
    }
  },
);
