import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { logDiagnosisMethodRun } from './firestore-log';
import { requestDiagnosisMethodFromOpenAI } from './openai-client';

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const openAiModel = defineString('OPENAI_MODEL', { default: 'gpt-4.1' });

const MethodDescriptorSchema = z.object({
  id: z.string().min(1),
  labelKo: z.string().min(1),
  summary: z.string().min(1),
  exampleUtterances: z.array(z.string().min(1)).max(5),
});

const DiagnosisMethodRequestSchema = z
  .object({
    problemId: z.string().min(1).max(100),
    rawText: z.string().trim().min(1).max(500),
    allowedMethodIds: z.array(z.string().min(1)).min(1).max(12),
    allowedMethods: z.array(MethodDescriptorSchema).min(1).max(12),
  })
  .superRefine((value, ctx) => {
    const descriptorIds = new Set(value.allowedMethods.map((method) => method.id));

    value.allowedMethodIds.forEach((methodId, index) => {
      if (!descriptorIds.has(methodId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowedMethods', index],
          message: `Missing descriptor for ${methodId}`,
        });
      }
    });
  });

const OpenAIDiagnosisResultSchema = z.object({
  predictedMethodId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  candidateMethodIds: z.array(z.string().min(1)).min(1).max(4),
  reason: z.string().min(1).max(120),
});

function sanitizeMethodId(candidate: string, allowedMethodIds: string[]) {
  return allowedMethodIds.includes(candidate) ? candidate : 'unknown';
}

function sanitizeCandidateMethodIds(
  candidateMethodIds: string[],
  allowedMethodIds: string[],
  predictedMethodId: string
) {
  const next = new Set<string>();

  if (predictedMethodId !== 'unknown') {
    next.add(predictedMethodId);
  }

  candidateMethodIds.forEach((candidateMethodId) => {
    if (allowedMethodIds.includes(candidateMethodId)) {
      next.add(candidateMethodId);
    }
  });

  if (next.size === 0) {
    next.add('unknown');
  }

  return Array.from(next);
}

export const diagnoseMethod = onRequest(
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

    const parsedRequest = DiagnosisMethodRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: 'Invalid request body',
        details: parsedRequest.error.flatten(),
      });
      return;
    }

    try {
      const model = openAiModel.value();
      const openAiResponse = await requestDiagnosisMethodFromOpenAI({
        apiKey: openAiApiKey.value(),
        model,
        body: parsedRequest.data,
      });

      const parsedResult = OpenAIDiagnosisResultSchema.parse(openAiResponse.result);
      const predictedMethodId = sanitizeMethodId(
        parsedResult.predictedMethodId,
        parsedRequest.data.allowedMethodIds
      );
      const candidateMethodIds = sanitizeCandidateMethodIds(
        parsedResult.candidateMethodIds,
        parsedRequest.data.allowedMethodIds,
        predictedMethodId
      );
      const needsManualSelection =
        predictedMethodId === 'unknown' || parsedResult.confidence < 0.74;

      try {
        await logDiagnosisMethodRun({
          problemId: parsedRequest.data.problemId,
          allowedMethodIds: parsedRequest.data.allowedMethodIds,
          predictedMethodId,
          confidence: parsedResult.confidence,
          candidateMethodIds,
          reason: parsedResult.reason,
          needsManualSelection,
          model: openAiResponse.model,
          responseId: openAiResponse.responseId,
        });
      } catch (logError) {
        logger.error('diagnoseMethod log write failed', logError);
      }

      response.status(200).json({
        predictedMethodId,
        confidence: parsedResult.confidence,
        reason: parsedResult.reason,
        candidateMethodIds,
        needsManualSelection,
        source: 'openai-router',
      });
    } catch (error) {
      logger.error('diagnoseMethod failed', error);
      response.status(500).json({
        error: 'Failed to diagnose solve method',
      });
    }
  }
);
