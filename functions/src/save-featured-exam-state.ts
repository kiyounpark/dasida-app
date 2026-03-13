import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import {
  FeaturedExamStateSchema,
  saveFeaturedExamStateSummary,
} from './learning-history';

const SaveFeaturedExamStateRequestSchema = z.object({
  accountKey: z.string().min(1).max(200),
  state: FeaturedExamStateSchema,
});

export const saveFeaturedExamStateHandler = onRequest(
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

    const parsedRequest = SaveFeaturedExamStateRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      const summary = await saveFeaturedExamStateSummary(
        parsedRequest.data.accountKey,
        parsedRequest.data.state,
      );
      response.status(200).json({ summary });
    } catch (error) {
      logger.error('saveFeaturedExamState failed', error);
      response.status(500).json({
        error: 'Failed to save featured exam state',
      });
    }
  },
);
