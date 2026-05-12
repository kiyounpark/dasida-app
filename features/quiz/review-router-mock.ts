// features/quiz/review-router-mock.ts
export type ReviewRouterMockInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  userText: string;
  candidateNodes: ReadonlyArray<{
    id: string;
    summary: string;
    triggers: ReadonlyArray<string>;
  }>;
};

export type ReviewRouterMockResult = {
  predictedNodeId: string;
  confidence: number;
  reason: string;
  candidateNodeIds: string[];
  source: 'mock-router';
};

function normalize(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

export async function analyzeReviewMethodWithMock(
  input: ReviewRouterMockInput,
): Promise<ReviewRouterMockResult> {
  const normalizedUser = normalize(input.userText);
  if (!normalizedUser) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'Empty input',
      candidateNodeIds: [],
      source: 'mock-router',
    };
  }

  const scored = input.candidateNodes.map((node) => {
    const score = node.triggers.reduce((total, trigger) => {
      return normalizedUser.includes(normalize(trigger)) ? total + 1 : total;
    }, 0);
    return { id: node.id, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];

  if (!top || top.score === 0) {
    return {
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'No trigger match',
      candidateNodeIds: [],
      source: 'mock-router',
    };
  }

  const gap = top.score - (second?.score ?? 0);
  let confidence = 0.4;
  if (gap >= 2) {
    confidence = 0.8;
  } else if (gap === 1) {
    confidence = 0.65;
  }

  return {
    predictedNodeId: top.id,
    confidence,
    reason: `top=${top.id}(${top.score}), gap=${gap}`,
    candidateNodeIds: scored.filter((entry) => entry.score > 0).map((entry) => entry.id),
    source: 'mock-router',
  };
}
