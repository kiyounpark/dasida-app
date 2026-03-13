import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { getLearnerSummary } from './learning-history';

const AccountKeyQuerySchema = z.object({
  accountKey: z.string().min(1).max(200),
});

export const getLearnerSummaryHandler = onRequest(
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

    const parsedQuery = AccountKeyQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      response.status(400).json({
        error: 'Invalid accountKey',
        details: parsedQuery.error.flatten(),
      });
      return;
    }

    try {
      const summary = await getLearnerSummary(parsedQuery.data.accountKey);
      response.status(200).json({ summary });
    } catch (error) {
      logger.error('getLearnerSummary failed', error);
      response.status(500).json({
        error: 'Failed to load learner summary',
      });
    }
  },
);
