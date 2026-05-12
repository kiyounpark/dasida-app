// features/quiz/review-router.test.ts
jest.mock('@/constants/env', () => ({
  reviewRouterUrl: 'https://test-router.example.com',
  reviewRouterTimeoutMs: 8000,
}));

import { analyzeReviewMethod, HIGH_CONFIDENCE_THRESHOLD } from './review-router';

const baseCandidates = [
  { id: 'fu_step1_A_explain', summary: '왜 절반', triggers: ['왜 절반인지'] },
  { id: 'fu_step2_A_explain', summary: '제곱이 핵심', triggers: ['왜 제곱하는지'] },
];

const baseInput = {
  weaknessId: 'formula_understanding',
  stepTitle: '완전제곱식',
  stepBody: 'x² + bx + c = ...',
  userText: '왜 절반인지 모르겠어요',
  candidateNodes: baseCandidates,
};

describe('analyzeReviewMethod', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('빈 입력은 fallback (라우터 호출 스킵)', async () => {
    global.fetch = jest.fn();
    const result = await analyzeReviewMethod({ ...baseInput, userText: '' });
    expect(result.predictedNodeId).toBe('fallback');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('원격 라우터가 high-confidence를 반환하면 그대로 사용', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        predictedNodeId: 'fu_step1_A_explain',
        confidence: 0.85,
        reason: 'matched 왜 절반',
        candidateNodeIds: ['fu_step1_A_explain', 'fu_step2_A_explain'],
        source: 'openai-router',
      }),
    });
    const result = await analyzeReviewMethod(baseInput);
    expect(result.predictedNodeId).toBe('fu_step1_A_explain');
    expect(result.source).toBe('openai-router');
    expect(result.confidence).toBeGreaterThanOrEqual(HIGH_CONFIDENCE_THRESHOLD);
  });

  it('원격 라우터 confidence가 낮으면 mock으로 폴백', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        predictedNodeId: 'fu_step2_A_explain',
        confidence: 0.4,
        reason: 'low',
        candidateNodeIds: ['fu_step2_A_explain'],
        source: 'openai-router',
      }),
    });
    const result = await analyzeReviewMethod(baseInput);
    // mock은 '왜 절반인지' 트리거를 잡아 fu_step1_A 를 반환할 것
    expect(result.source).toBe('mock-router');
    expect(result.predictedNodeId).toBe('fu_step1_A_explain');
  });

  it('네트워크 실패 시 mock으로 폴백', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    const result = await analyzeReviewMethod(baseInput);
    expect(result.source).toBe('mock-router');
  });

  it('mock 도 매칭 못 하면 fallback', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    const result = await analyzeReviewMethod({
      ...baseInput,
      userText: '오늘 점심 뭐 먹지',
    });
    expect(result.predictedNodeId).toBe('fallback');
  });
});
