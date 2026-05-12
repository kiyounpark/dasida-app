// features/quiz/review-router-mock.test.ts
import { analyzeReviewMethodWithMock } from './review-router-mock';

const baseCandidates = [
  {
    id: 'fu_step1_A_explain',
    summary: '왜 절반',
    triggers: ['왜 절반인지', 'b를 그대로 쓰면'],
  },
  {
    id: 'fu_step2_A_explain',
    summary: '제곱이 핵심',
    triggers: ['왜 제곱하는지', '왜 한 번 더 제곱'],
  },
];

const baseInput = {
  weaknessId: 'formula_understanding',
  stepTitle: '완전제곱식',
  stepBody: 'x² + bx + c = (x + b/2)² + (c − (b/2)²)',
  userText: '',
  candidateNodes: baseCandidates,
};

describe('analyzeReviewMethodWithMock', () => {
  it('빈 입력은 fallback', async () => {
    const result = await analyzeReviewMethodWithMock({ ...baseInput, userText: '' });
    expect(result.predictedNodeId).toBe('fallback');
    expect(result.confidence).toBe(0);
    expect(result.source).toBe('mock-router');
  });

  it('트리거 키워드 매칭 시 해당 노드 반환', async () => {
    const result = await analyzeReviewMethodWithMock({
      ...baseInput,
      userText: '왜 절반인지 모르겠어요',
    });
    expect(result.predictedNodeId).toBe('fu_step1_A_explain');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('매칭되는 트리거가 없으면 fallback', async () => {
    const result = await analyzeReviewMethodWithMock({
      ...baseInput,
      userText: '오늘 점심 뭐 먹지',
    });
    expect(result.predictedNodeId).toBe('fallback');
  });

  it('동률일 때는 confidence 가 낮게 잡힘', async () => {
    const result = await analyzeReviewMethodWithMock({
      ...baseInput,
      userText: '왜 절반 왜 제곱',
    });
    expect(result.confidence).toBeLessThan(0.65);
  });
});
