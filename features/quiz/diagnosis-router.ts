import { diagnosisRouterTimeoutMs, diagnosisRouterUrl } from '@/constants/env';
import type { SolveMethodId } from '@/data/diagnosisTree';

import type { DiagnosisRouterSource } from './types';
import { analyzeDiagnosisMethodWithMock } from './diagnosis-router-mock';

export type DiagnosisMethodDescriptor = {
  id: SolveMethodId;
  labelKo: string;
  summary: string;
  exampleUtterances: string[];
};

export type DiagnosisRouterInput = {
  problemId: string;
  rawText: string;
  allowedMethodIds: SolveMethodId[];
  allowedMethods: DiagnosisMethodDescriptor[];
};

export type DiagnosisRouterResult = {
  predictedMethodId: SolveMethodId;
  confidence: number;
  reason: string;
  needsManualSelection: boolean;
  candidateMethodIds: SolveMethodId[];
  source: DiagnosisRouterSource;
  scores?: Partial<Record<SolveMethodId, number>>;
};

const HIGH_CONFIDENCE_THRESHOLD = 0.74;

type RemoteDiagnosisResponse = {
  predictedMethodId: string;
  confidence: number;
  reason: string;
  candidateMethodIds: string[];
};

function sanitizeMethodId(
  candidate: unknown,
  allowedMethodIds: SolveMethodId[]
): SolveMethodId {
  if (typeof candidate !== 'string') {
    return 'unknown';
  }

  return allowedMethodIds.includes(candidate as SolveMethodId) ? (candidate as SolveMethodId) : 'unknown';
}

function sanitizeCandidateMethodIds(
  candidateMethodIds: unknown,
  allowedMethodIds: SolveMethodId[],
  predictedMethodId: SolveMethodId
): SolveMethodId[] {
  const next = new Set<SolveMethodId>();

  if (predictedMethodId !== 'unknown') {
    next.add(predictedMethodId);
  }

  if (Array.isArray(candidateMethodIds)) {
    candidateMethodIds.forEach((candidate) => {
      const methodId = sanitizeMethodId(candidate, allowedMethodIds);
      if (methodId !== 'unknown') {
        next.add(methodId);
      }
    });
  }

  if (next.size === 0) {
    next.add('unknown');
  }

  return Array.from(next);
}

function parseRemoteDiagnosisResponse(
  payload: unknown,
  allowedMethodIds: SolveMethodId[]
): DiagnosisRouterResult | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const response = payload as Partial<RemoteDiagnosisResponse>;
  const predictedMethodId = sanitizeMethodId(response.predictedMethodId, allowedMethodIds);
  const confidence =
    typeof response.confidence === 'number' && Number.isFinite(response.confidence)
      ? Math.max(0, Math.min(1, response.confidence))
      : 0;
  const reason = typeof response.reason === 'string' && response.reason.trim()
    ? response.reason.trim()
    : 'OpenAI router response';
  const candidateMethodIds = sanitizeCandidateMethodIds(
    response.candidateMethodIds,
    allowedMethodIds,
    predictedMethodId
  );
  const needsManualSelection =
    predictedMethodId === 'unknown' || confidence < HIGH_CONFIDENCE_THRESHOLD;

  return {
    predictedMethodId,
    confidence,
    reason,
    needsManualSelection,
    candidateMethodIds,
    source: 'openai-router',
  };
}

function mergeCandidateMethodIds(
  allowedMethodIds: SolveMethodId[],
  results: Array<DiagnosisRouterResult | null>
): SolveMethodId[] {
  const merged = new Set<SolveMethodId>();

  results.forEach((result) => {
    if (!result) {
      return;
    }

    if (result.predictedMethodId !== 'unknown') {
      merged.add(result.predictedMethodId);
    }

    result.candidateMethodIds.forEach((candidateMethodId) => {
      if (candidateMethodId !== 'unknown') {
        merged.add(candidateMethodId);
      }
    });
  });

  const validCandidateCount = () => Array.from(merged).filter((methodId) => methodId !== 'unknown').length;

  allowedMethodIds.forEach((methodId) => {
    if (methodId !== 'unknown' && validCandidateCount() < 2) {
      merged.add(methodId);
    }
  });

  if (validCandidateCount() === 0) {
    merged.add('unknown');
  }

  return Array.from(merged);
}

function buildManualSelectionResult(
  input: DiagnosisRouterInput,
  remoteResult: DiagnosisRouterResult | null,
  mockResult: DiagnosisRouterResult
): DiagnosisRouterResult {
  const candidateMethodIds = mergeCandidateMethodIds(input.allowedMethodIds, [remoteResult, mockResult]);
  const predictedMethodId = candidateMethodIds[0] ?? 'unknown';

  return {
    predictedMethodId,
    confidence: Math.max(remoteResult?.confidence ?? 0, mockResult.confidence),
    reason: remoteResult?.reason ?? mockResult.reason,
    needsManualSelection: true,
    candidateMethodIds,
    source: remoteResult?.source ?? mockResult.source,
    scores: mockResult.scores,
  };
}

async function requestOpenAiDiagnosis(
  input: DiagnosisRouterInput
): Promise<DiagnosisRouterResult | null> {
  if (!diagnosisRouterUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), diagnosisRouterTimeoutMs);

  try {
    const response = await fetch(diagnosisRouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return parseRemoteDiagnosisResponse(payload, input.allowedMethodIds);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeDiagnosisMethod(
  input: DiagnosisRouterInput
): Promise<DiagnosisRouterResult> {
  if (!input.rawText.trim()) {
    return analyzeDiagnosisMethodWithMock(input);
  }

  const remoteResult = await requestOpenAiDiagnosis(input);
  if (remoteResult && !remoteResult.needsManualSelection) {
    return remoteResult;
  }

  const mockResult = await analyzeDiagnosisMethodWithMock(input);
  if (!remoteResult) {
    return mockResult;
  }

  if (!mockResult.needsManualSelection) {
    return mockResult;
  }

  return buildManualSelectionResult(input, remoteResult, mockResult);
}
