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

export type ReviewRouterSource = 'openai-router' | 'mock-router' | 'skipped' | 'fallback';

export type ReviewRouterFallbackReason =
  | 'empty_input'
  | 'low_confidence'
  | 'network_error';

export type ReviewRouterResult = {
  predictedNodeId: string; // 노드 id 또는 'fallback'
  confidence: number;
  reason: string;
  candidateNodeIds: string[];
  source: ReviewRouterSource;
  fallbackReason?: ReviewRouterFallbackReason;
};

// Remote LLM confidence는 자체 캘리브레이션, mock은 키워드 매칭 휴리스틱이라
// 의도적으로 다른 임계값을 둔다.
export const REMOTE_HIGH_CONFIDENCE_THRESHOLD = 0.7;
export const MOCK_HIGH_CONFIDENCE_THRESHOLD = 0.65;
// Deprecated — 외부 호환을 위해 유지. 새 코드는 위 두 상수 사용.
export const HIGH_CONFIDENCE_THRESHOLD = MOCK_HIGH_CONFIDENCE_THRESHOLD;

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
  const rawPredictedNodeId = response.predictedNodeId;
  const predictedNodeId = sanitizeNodeId(rawPredictedNodeId, allowedIds);
  // 백엔드가 정상이라면 이미 sanitize됐지만, 방어 차원에서 다시 거른다.
  // 원래 high-confidence였더라도 id가 허용 목록 밖이면 confidence를 0으로 떨어뜨려
  // 잘못된 시그널이 analytics에 새지 않게 한다.
  const idWasSanitized =
    typeof rawPredictedNodeId === 'string' &&
    rawPredictedNodeId !== 'fallback' &&
    predictedNodeId === 'fallback';
  const rawConfidence =
    typeof response.confidence === 'number' && Number.isFinite(response.confidence)
      ? Math.max(0, Math.min(1, response.confidence))
      : 0;
  const confidence = idWasSanitized ? 0 : rawConfidence;
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

async function requestRemote(
  input: ReviewRouterInput,
  externalSignal?: AbortSignal,
): Promise<ReviewRouterResult | null> {
  if (!reviewRouterUrl) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), reviewRouterTimeoutMs);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

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
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

function isRemoteHighConfidence(result: ReviewRouterResult): boolean {
  return (
    result.predictedNodeId !== 'fallback' &&
    result.confidence >= REMOTE_HIGH_CONFIDENCE_THRESHOLD
  );
}

function isMockHighConfidence(result: { predictedNodeId: string; confidence: number }): boolean {
  return (
    result.predictedNodeId !== 'fallback' &&
    result.confidence >= MOCK_HIGH_CONFIDENCE_THRESHOLD
  );
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

export type AnalyzeReviewMethodOptions = {
  signal?: AbortSignal;
};

export async function analyzeReviewMethod(
  input: ReviewRouterInput,
  options: AnalyzeReviewMethodOptions = {},
): Promise<ReviewRouterResult> {
  if (!input.userText.trim()) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'empty input',
      candidateNodeIds: [],
      source: 'skipped',
      fallbackReason: 'empty_input',
    };
  }

  const remote = await requestRemote(input, options.signal);
  if (remote && isRemoteHighConfidence(remote)) {
    return remote;
  }

  const mock = await analyzeReviewMethodWithMock(toMockInput(input));
  if (isMockHighConfidence(mock)) {
    return {
      ...mock,
      source: 'mock-router' as ReviewRouterSource,
    };
  }

  // remote / mock 모두 못 잡았으면 fallback.
  // fallbackReason은 호출자가 analytics에 그대로 쓸 수 있도록 여기서 결정한다.
  // remote === null = 네트워크 실패(또는 URL 미설정/timeout/abort). 그 외(remote가 응답했지만
  // confidence가 낮거나 id가 sanitize되어 떨어진 경우)는 low_confidence로 묶는다.
  const fallbackReason: ReviewRouterFallbackReason =
    remote === null && mock.confidence === 0 ? 'network_error' : 'low_confidence';

  return {
    predictedNodeId: 'fallback',
    confidence: Math.max(remote?.confidence ?? 0, mock.confidence),
    reason: remote?.reason ?? mock.reason,
    candidateNodeIds: [],
    source: 'fallback',
    fallbackReason,
  };
}
