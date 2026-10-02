import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { authenticateLearningHistoryRequest, LearningHistoryAuthError } from './learning-history-auth';
import { collectReviewPhotoPathsForAccount, deletePhotoAnalysisRunsForAccount } from './photo-analysis-run-log';
import { accountNotePhotoPrefix } from './photo-store-contract';
import { consentDocRef, firebasePhotoObjectStore, type PhotoObjectStore } from './photo-storage';

const DeleteAccountBodySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export type DeleteAccountDeps = {
  deleteConsent(accountKey: string): Promise<void>;
  collectReviewPhotoPaths(accountKey: string): Promise<string[]>;
  /** users/{accountKey} · users/{uid} · 원장 행 */
  deleteFirestoreData(accountKey: string): Promise<void>;
  objects: Pick<PhotoObjectStore, 'deletePrefix' | 'deleteIfExists'>;
};

/**
 * 탈퇴 순서 (약속 파일 §6):
 *  ① private/consent 삭제 — 늦게 온 savePhotoNote가 여기서 403으로 막힌다
 *  ② 원장에서 검토본 경로 모으기 — 원장을 지우기 전에 (날짜 아래 흩어져 prefix로 못 지운다)
 *  ③ Firestore recursiveDelete + 원장 삭제
 *  ④ Storage — 노트 사진 prefix 전부 + ②의 경로들. 하나라도 실패하면 던진다(= 탈퇴 실패, 500)
 * Storage에 파일이 0개인 학생(1.0.10 이하)은 ④가 그냥 지나간다.
 */
export async function deleteAccountData(deps: DeleteAccountDeps, accountKey: string): Promise<void> {
  await deps.deleteConsent(accountKey);
  const reviewPhotoPaths = await deps.collectReviewPhotoPaths(accountKey);
  await deps.deleteFirestoreData(accountKey);

  // 다 시도한 뒤에 실패를 알린다 — 지울 수 있는 건 지운다
  const results = await Promise.allSettled([
    deps.objects.deletePrefix(accountNotePhotoPrefix(accountKey)),
    ...reviewPhotoPaths.map((path) => deps.objects.deleteIfExists(path)),
  ]);
  const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`Storage delete failed (${failed.length}/${results.length})`, { cause: failed[0].reason });
  }
}

function liveDeps(): DeleteAccountDeps {
  const firestore = getFirestore();
  return {
    deleteConsent: async (accountKey) => {
      await consentDocRef(firestore, accountKey).delete();
    },
    collectReviewPhotoPaths: (accountKey) => collectReviewPhotoPathsForAccount(firestore, accountKey),
    deleteFirestoreData: async (accountKey) => {
      // accountKey형태: "user:{firebaseUid}" → 두 경로 모두 삭제
      // 1. 학습 기록: users/{accountKey} (user: prefix 포함) — Cloud Functions에서 이 경로 사용
      // 2. 프로필: users/{uid} (user: prefix 제거) — 클라이언트 JS SDK에서 이 경로 사용
      // 3. 사진 분석 사용량 원장: photoAnalysisRuns의 이 계정 행 (users/ 밖에 있다 — 기윤 A안 09.23)
      const uid = accountKey.startsWith('user:') ? accountKey.slice(5) : accountKey;
      await Promise.all([
        firestore.recursiveDelete(firestore.collection('users').doc(accountKey)),
        firestore.recursiveDelete(firestore.collection('users').doc(uid)),
        deletePhotoAnalysisRunsForAccount(firestore, accountKey),
      ]);
    },
    objects: firebasePhotoObjectStore(),
  };
}

type DeleteAccountRequest = { method: string; body: unknown; headers: unknown };
type DeleteAccountResponse = { status(code: number): { json(body: unknown): unknown } };

export async function handleDeleteAccount(
  request: DeleteAccountRequest,
  response: DeleteAccountResponse,
  deps: { authenticate: typeof authenticateLearningHistoryRequest; data: () => DeleteAccountDeps },
): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsedBody = DeleteAccountBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      error: 'Invalid request body',
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const { accountKey } = parsedBody.data;

  try {
    await deps.authenticate(request.headers as Record<string, string | string[] | undefined>, accountKey);
    await deleteAccountData(deps.data(), accountKey);
    response.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof LearningHistoryAuthError) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    logger.error('deleteAccount failed', { accountKey, error });
    response.status(500).json({ error: 'Failed to delete account' });
  }
}

export const deleteAccountHandler = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    cors: true,
    invoker: 'public',
  },
  (request, response) =>
    handleDeleteAccount(request, response, { authenticate: authenticateLearningHistoryRequest, data: liveDeps }),
);
