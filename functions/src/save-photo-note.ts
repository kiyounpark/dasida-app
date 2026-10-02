import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';

import {
  DOMAIN_ID_PATTERN,
  IMAGE_DATA_URL_PATTERN,
  MAX_IMAGE_DATA_URL_LENGTH,
  MISTAKE_TYPE_IDS,
  SUBMISSION_ID_PATTERN,
  type PhotoNoteWire,
  type SavePhotoNoteRequest,
} from './photo-store-contract';
import { requireFirebaseAccount, sendApiError } from './photo-store-http';

// 줄 0 껍데기 — 본문은 2줄이 채운다(약속 파일 「저장 규칙」 ①~④).
// .strict() — photoUri 같은 폰 전용 칸이 섞여 오면 조용히 버리지 않고 400으로 거절한다.

export const PhotoNoteWireSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().min(1).max(40),
    schemaVersion: z.literal(1),
    dateLabel: z.string().max(40),
    quote: z.string().max(2000),
    why: z.string().max(2000),
    fix: z.string().max(2000),
    methodLabel: z.string().max(80),
    typeLabel: z.string().max(80),
    methodId: z.string().regex(DOMAIN_ID_PATTERN),
    mistakeType: z.enum(MISTAKE_TYPE_IDS),
    weaknessIds: z.array(z.string().regex(DOMAIN_ID_PATTERN)).max(10),
    primaryWeaknessId: z.string().regex(DOMAIN_ID_PATTERN).nullable(),
    checkPassed: z.boolean(),
    checkSkipped: z.boolean().optional(),
    retryResult: z.enum(['pass', 'fail', 'skip', 'none']),
  })
  .strict() satisfies z.ZodType<PhotoNoteWire>;

export const SavePhotoNoteRequestSchema = z
  .object({
    accountKey: z.string().min(1).max(200),
    note: PhotoNoteWireSchema,
    imageDataUrl: z.string().regex(IMAGE_DATA_URL_PATTERN).max(MAX_IMAGE_DATA_URL_LENGTH).nullable(),
    submissionId: z.string().regex(SUBMISSION_ID_PATTERN).nullable(),
    appVersion: z.string().max(32).nullable(),
  })
  .strict() satisfies z.ZodType<SavePhotoNoteRequest>;

export const savePhotoNoteHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 60, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = SavePhotoNoteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendApiError(response, 400, 'INVALID_REQUEST', 'Invalid request body');
      return;
    }

    try {
      const accountKey = await requireFirebaseAccount(
        request.headers as Record<string, string | string[] | undefined>,
        parsed.data.accountKey,
        response,
      );
      if (!accountKey) return;

      response.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      logger.error('savePhotoNote failed', error);
      sendApiError(response, 500, 'TEMPORARY_FAILURE', 'Failed to save photo note');
    }
  },
);
