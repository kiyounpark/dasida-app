import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';

import {
  authenticateLearningHistoryRequest,
  LearningHistoryAuthError,
} from './learning-history-auth';
import { SaveReviewTasksRequestSchema, saveReviewTasks } from './learning-history';

export const saveReviewTasksHandler = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 30,
    cors: true,
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = SaveReviewTasksRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const authContext = await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        parsed.data.accountKey,
      );

      if (authContext.kind !== 'firebase') {
        response.status(403).json({ error: 'Authenticated users only' });
        return;
      }

      const reviewTasks = await saveReviewTasks(
        authContext.accountKey,
        parsed.data.reviewTasks,
      );
      response.status(200).json({ reviewTasks });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('saveReviewTasks failed', error);
      response.status(500).json({
        error: 'Failed to save review tasks',
      });
    }
  },
);
