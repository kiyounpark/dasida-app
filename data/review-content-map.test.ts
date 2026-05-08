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
