import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { authenticateLearningHistoryRequest, LearningHistoryAuthError } from './learning-history-auth';

const DeleteAccountBodySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export const deleteAccountHandler = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    cors: true,
    invoker: 'public',
  },
  async (request, response) => {
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
      await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        accountKey,
      );

      // accountKey형태: "user:{firebaseUid}" → 두 경로 모두 삭제
      // 1. 학습 기록: users/{accountKey} (user: prefix 포함) — Cloud Functions에서 이 경로 사용
      // 2. 프로필: users/{uid} (user: prefix 제거) — 클라이언트 JS SDK에서 이 경로 사용
      const uid = accountKey.startsWith('user:') ? accountKey.slice(5) : accountKey;
      const learningHistoryRef = getFirestore().collection('users').doc(accountKey);
      const profileRef = getFirestore().collection('users').doc(uid);
      await Promise.all([
        getFirestore().recursiveDelete(learningHistoryRef),
        getFirestore().recursiveDelete(profileRef),
      ]);

      response.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('deleteAccount failed', { accountKey, error });
      response.status(500).json({ error: 'Failed to delete account' });
    }
  },
);
