import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { consentDocRef, parseConsentDoc } from './get-consent';
import { collectReviewPhotoPathsForAccount } from './photo-analysis-run-log';
import {
  CONSENT_KINDS,
  CONSENT_VIA,
  emptyConsentEntry,
  isConsentOn,
  type ConsentDoc,
  type ConsentEntry,
  type SaveConsentRequest,
  type SaveConsentResponse,
} from './photo-store-contract';
import { firebasePhotoObjectStore, type PhotoObjectStore } from './photo-storage';
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

export type ReviewPurgeDeps = {
  collectReviewPhotoPaths(accountKey: string): Promise<string[]>;
  objects: Pick<PhotoObjectStore, 'deleteIfExists'>;
};

/**
 * 🔒 10.02 기윤 — [선택] 「분석 정확도 높이기」를 끄면 그 계정의 검토본을 바로 지운다(30일 만료를 기다리지 않는다).
 * 검토가 꺼진 채로 저장될 때마다 돈다 — 지난번에 일부 못 지웠어도 같은 선택을 다시 보내면 마저 지운다.
 * 이미 없는 파일은 성공으로 친다. 하나라도 못 지우면 던진다(동의 문서는 이미 「꺼짐」이라 새 검토본은 안 생긴다).
 * 경로는 원장에서 모은다 — 검토본은 review/{날짜}/ 아래 흩어져 있어 prefix로 못 지운다(탈퇴와 같은 길).
 */
export async function purgeReviewPhotos(deps: ReviewPurgeDeps, accountKey: string): Promise<number> {
  const paths = await deps.collectReviewPhotoPaths(accountKey);
  const results = await Promise.allSettled(paths.map((path) => deps.objects.deleteIfExists(path)));
  const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`Review photo delete failed (${failed.length}/${results.length})`, { cause: failed[0].reason });
  }
  return paths.length;
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

      const firestore = getFirestore();
      const consent = await saveConsentDoc(firestore, { ...parsed.data, accountKey });
      if (!isConsentOn(consent.review, 'review')) {
        await purgeReviewPhotos(
          {
            collectReviewPhotoPaths: (key) => collectReviewPhotoPathsForAccount(firestore, key),
            objects: firebasePhotoObjectStore(),
          },
          accountKey,
        );
      }
      const body: SaveConsentResponse = { consent };
      response.status(200).json(body);
    } catch (error) {
      logger.error('saveConsent failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to save consent');
    }
  },
);
