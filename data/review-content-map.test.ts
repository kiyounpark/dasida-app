import { weaknessOrder } from './diagnosisMap';
import { getReviewThinkingSteps } from './review-content-map';

describe('review-content-map 콘텐츠 무결성', () => {
  it('콘텐츠가 있는 모든 약점의 선택지 feedback이 비어있지 않다', () => {
    for (const weaknessId of weaknessOrder) {
      const steps = getReviewThinkingSteps(weaknessId);
      if (!steps || steps.length === 0) continue;

      for (const step of steps) {
        for (const choice of step.choices) {
          expect(choice.feedback.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('review-content-map 신규 필드', () => {
  it('콘텐츠가 있는 모든 ThinkingStep이 고유한 id를 가진다', () => {
    const allIds: string[] = [];
    for (const weaknessId of weaknessOrder) {
      const steps = getReviewThinkingSteps(weaknessId);
      if (!steps || steps.length === 0) continue;
      for (const step of steps) {
        expect(typeof step.id).toBe('string');
        expect(step.id.length).toBeGreaterThan(0);
        allIds.push(step.id);
      }
    }
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it('모든 오답 Choice는 remedialFlowStartNodeId를 가진다 (콘텐츠 작성된 약점만 검증)', () => {
    const authoredWeaknesses: string[] = ['formula_understanding'];
    for (const weaknessId of authoredWeaknesses) {
      const steps = getReviewThinkingSteps(weaknessId as any);
      for (const step of steps) {
        for (const choice of step.choices) {
          if (!choice.correct) {
            expect(typeof choice.remedialFlowStartNodeId).toBe('string');
            expect(choice.remedialFlowStartNodeId!.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
