import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { logDiagnosisExplainRun } from './firestore-log';
import { requestDiagnosisExplanationFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const DiagnosisExplainRequestSchema = z.object({
  problemId: z.string().min(1).max(100),
  problemQuestion: z.string().min(1).max(400),
  methodId: z.string().min(1).max(40),
  methodLabelKo: z.string().min(1).max(60),
  nodeKind: z.enum(['explain', 'check']),
  nodeId: z.string().min(1).max(120),
  nodeTitle: z.string().min(1).max(160),
  nodeBody: z.string().min(1).max(600).optional(),
  nodePrompt: z.string().min(1).max(300).optional(),
  nodeOptions: z.array(z.string().min(1).max(160)).max(6).optional(),
  userQuestion: z.string().trim().min(1).max(300),
});

const DiagnosisExplainResultSchema = z.object({
  replyText: z.string().trim().min(1).max(500),
});

export const explainDiagnosisNode = onRequest(
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

    const parsedRequest = DiagnosisExplainRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      const model = openAiModel.value();
      const openAiResponse = await requestDiagnosisExplanationFromOpenAI({
        apiKey: openAiApiKey.value(),
        model,
        body: parsedRequest.data,
      });

      const parsedResult = DiagnosisExplainResultSchema.parse(openAiResponse.result);

      try {
        await logDiagnosisExplainRun({
          problemId: parsedRequest.data.problemId,
          methodId: parsedRequest.data.methodId,
          nodeId: parsedRequest.data.nodeId,
          nodeKind: parsedRequest.data.nodeKind,
          model: openAiResponse.model,
          responseId: openAiResponse.responseId,
        });
      } catch (logError) {
        logger.error('explainDiagnosisNode log write failed', logError);
      }

      response.status(200).json({
        replyText: parsedResult.replyText,
        source: 'openai-explainer',
      });
    } catch (error) {
      logger.error('explainDiagnosisNode failed', error);
      response.status(500).json({
        error: 'Failed to explain diagnosis node',
      });
    }
  }
);
