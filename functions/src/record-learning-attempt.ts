import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';

import { authenticateLearningHistoryRequest, LearningHistoryAuthError } from './learning-history-auth';
import { FinalizedAttemptInputSchema, recordLearningAttempt } from './learning-history';

export const recordLearningAttemptHandler = onRequest(
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

    const parsedRequest = FinalizedAttemptInputSchema.safeParse(request.body?.attempt);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        parsedRequest.data.accountKey,
      );

      const result = await recordLearningAttempt(parsedRequest.data);
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }

      logger.error('recordLearningAttempt failed', error);
      response.status(500).json({
        error: 'Failed to record learning attempt',
      });
    }
  },
);
