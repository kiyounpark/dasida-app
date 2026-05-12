import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requestReviewRouterFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const ReviewRouterCandidateSchema = z.object({
  id: z.string().min(1).max(80),
  summary: z.string().min(1).max(300),
  triggers: z.array(z.string().min(1).max(120)).min(1).max(8),
});

export const ReviewRouterRequestSchema = z.object({
  weaknessId: z.string().min(1).max(64),
  stepTitle: z.string().min(1).max(160),
  stepBody: z.string().min(1).max(2000),
  selectedChoiceText: z.string().min(1).max(500).optional(),
  selectedChoiceCorrect: z.boolean().optional(),
  userText: z.string().trim().min(1).max(500),
  candidateNodes: z.array(ReviewRouterCandidateSchema).min(1).max(12),
});

export type ReviewRouterRequest = z.infer<typeof ReviewRouterRequestSchema>;

export const OpenAIReviewRouterResultSchema = z.object({
  predictedNodeId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  candidateNodeIds: z.array(z.string().min(1)).min(1).max(6),
  reason: z.string().min(1).max(160),
});

export type OpenAIReviewRouterResult = z.infer<typeof OpenAIReviewRouterResultSchema>;

export const reviewRouter = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 30,
    cors: true,
    invoker: 'public',
    secrets: [openAiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = ReviewRouterRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const model = openAiModel.value();
      const openAiResponse = await requestReviewRouterFromOpenAI({
        apiKey: openAiApiKey.value(),
        model,
        body: parsed.data,
      });

      const parsedResult = OpenAIReviewRouterResultSchema.parse(openAiResponse.result);
      const allowedIds = parsed.data.candidateNodes.map((node) => node.id);

      const predictedNodeId =
        allowedIds.includes(parsedResult.predictedNodeId) ||
        parsedResult.predictedNodeId === 'fallback'
          ? parsedResult.predictedNodeId
          : 'fallback';

      const candidateNodeIds = Array.from(
        new Set(
          parsedResult.candidateNodeIds.filter((nodeId) => allowedIds.includes(nodeId)),
        ),
      );

      logger.info('reviewRouter result', {
        weaknessId: parsed.data.weaknessId,
        predictedNodeId,
        confidence: parsedResult.confidence,
      });

      response.status(200).json({
        predictedNodeId,
        confidence: parsedResult.confidence,
        reason: parsedResult.reason,
        candidateNodeIds,
        source: 'openai-router',
      });
    } catch (error) {
      logger.error('reviewRouter failed', error);
      response.status(500).json({ error: 'Failed to route review request' });
    }
  }
);
