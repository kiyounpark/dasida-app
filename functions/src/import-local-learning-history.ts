import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';

import {
  authenticateLearningHistoryRequest,
  getLearningHistoryRequestAccountKey,
  LearningHistoryAuthError,
} from './learning-history-auth';
import {
  ImportLocalLearningHistoryRequestSchema,
  importLocalLearningHistory,
} from './learning-history';

export const importLocalLearningHistoryHandler = onRequest(
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

    const accountKey = getLearningHistoryRequestAccountKey(
      request.headers as Record<string, string | string[] | undefined>,
    );
    if (!accountKey) {
      response.status(400).json({ error: 'Missing account key' });
      return;
    }

    const parsedRequest = ImportLocalLearningHistoryRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      const authContext = await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        accountKey,
      );

      if (authContext.kind !== 'firebase') {
        response.status(403).json({ error: 'Authenticated users only' });
        return;
      }

      const result = await importLocalLearningHistory({
        targetAccountKey: authContext.accountKey,
        sourceAnonymousAccountKey: parsedRequest.data.sourceAnonymousAccountKey,
        attempts: parsedRequest.data.attempts,
        resultsByAttemptId: parsedRequest.data.resultsByAttemptId,
        reviewTasks: parsedRequest.data.reviewTasks,
        featuredExamState: parsedRequest.data.featuredExamState,
      });
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('importLocalLearningHistory failed', error);
      response.status(500).json({
        error: 'Failed to import local learning history',
      });
    }
  },
);
