import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { authenticateLearningHistoryRequest, LearningHistoryAuthError } from './learning-history-auth';
import { listReviewTasks } from './learning-history';

const ListReviewTasksQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export const listReviewTasksHandler = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 30,
    cors: true,
    invoker: 'public',
  },
  async (request, response) => {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsedQuery = ListReviewTasksQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      response.status(400).json({
        error: 'Invalid query',
        details: parsedQuery.error.flatten(),
      });
      return;
    }

    try {
      await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        parsedQuery.data.accountKey,
      );

      const reviewTasks = await listReviewTasks(parsedQuery.data.accountKey);
      response.status(200).json({ reviewTasks });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('listReviewTasks failed', error);
      response.status(500).json({
        error: 'Failed to list review tasks',
      });
    }
  },
);
