// features/quiz/review-router.ts
import { reviewRouterTimeoutMs, reviewRouterUrl } from '@/constants/env';

import { analyzeReviewMethodWithMock, type ReviewRouterMockInput } from './review-router-mock';

export type ReviewRouterCandidate = {
  id: string;
  summary: string;
  triggers: ReadonlyArray<string>;
};

export type ReviewRouterInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  userText: string;
  candidateNodes: ReadonlyArray<ReviewRouterCandidate>;
};

export type ReviewRouterSource = 'openai-router' | 'mock-router' | 'skipped';

export type ReviewRouterResult = {
  predictedNodeId: string; // 노드 id 또는 'fallback'
  confidence: number;
  reason: string;
  candidateNodeIds: string[];
  source: ReviewRouterSource;
};

export const HIGH_CONFIDENCE_THRESHOLD = 0.65;

type RemoteResponse = {
  predictedNodeId: unknown;
  confidence: unknown;
  reason: unknown;
  candidateNodeIds: unknown;
};

function sanitizeNodeId(candidate: unknown, allowedIds: string[]): string {
  if (typeof candidate !== 'string') return 'fallback';
  if (candidate === 'fallback') return 'fallback';
  return allowedIds.includes(candidate) ? candidate : 'fallback';
}

function sanitizeCandidateIds(candidates: unknown, allowedIds: string[]): string[] {
  if (!Array.isArray(candidates)) return [];
  const next = new Set<string>();
  candidates.forEach((value) => {
    if (typeof value === 'string' && allowedIds.includes(value)) {
      next.add(value);
    }
  });
  return Array.from(next);
}

function parseRemote(payload: unknown, allowedIds: string[]): ReviewRouterResult | null {
  if (!payload || typeof payload !== 'object') return null;
  const response = payload as Partial<RemoteResponse>;
  const predictedNodeId = sanitizeNodeId(response.predictedNodeId, allowedIds);
  const confidence =
    typeof response.confidence === 'number' && Number.isFinite(response.confidence)
      ? Math.max(0, Math.min(1, response.confidence))
      : 0;
  const reason =
    typeof response.reason === 'string' && response.reason.trim()
      ? response.reason.trim()
      : 'remote router response';
  const candidateNodeIds = sanitizeCandidateIds(response.candidateNodeIds, allowedIds);

  return {
    predictedNodeId,
    confidence,
    reason,
    candidateNodeIds,
    source: 'openai-router',
  };
}

async function requestRemote(input: ReviewRouterInput): Promise<ReviewRouterResult | null> {
  if (!reviewRouterUrl) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), reviewRouterTimeoutMs);

  try {
    const response = await fetch(reviewRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const allowedIds = input.candidateNodes.map((node) => node.id);
    return parseRemote(payload, allowedIds);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isHighConfidence(result: ReviewRouterResult): boolean {
  return result.predictedNodeId !== 'fallback' && result.confidence >= HIGH_CONFIDENCE_THRESHOLD;
}

function toMockInput(input: ReviewRouterInput): ReviewRouterMockInput {
  return {
    weaknessId: input.weaknessId,
    stepTitle: input.stepTitle,
    stepBody: input.stepBody,
    selectedChoiceText: input.selectedChoiceText,
    selectedChoiceCorrect: input.selectedChoiceCorrect,
    userText: input.userText,
    candidateNodes: input.candidateNodes,
  };
}

export async function analyzeReviewMethod(input: ReviewRouterInput): Promise<ReviewRouterResult> {
  if (!input.userText.trim()) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'empty input',
      candidateNodeIds: [],
      source: 'skipped',
    };
  }

  const remote = await requestRemote(input);
  if (remote && isHighConfidence(remote)) {
    return remote;
  }

  const mock = await analyzeReviewMethodWithMock(toMockInput(input));
  if (isHighConfidence(mock as ReviewRouterResult)) {
    return mock as ReviewRouterResult;
  }

  // remote / mock 모두 못 잡았으면 fallback. remote 가 있으면 reason 만 차용.
  return {
    predictedNodeId: 'fallback',
    confidence: Math.max(remote?.confidence ?? 0, mock.confidence),
    reason: remote?.reason ?? mock.reason,
    candidateNodeIds: [],
    source: remote ? 'openai-router' : 'mock-router',
  };
}
