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

      // accountKey is "user:{firebaseUid}" format
      const uid = accountKey.startsWith('user:') ? accountKey.slice(5) : accountKey;
      const userRef = getFirestore().collection('users').doc(uid);
      await getFirestore().recursiveDelete(userRef);

      response.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('deleteAccount failed', error);
      response.status(500).json({ error: 'Failed to delete account' });
    }
  },
);
