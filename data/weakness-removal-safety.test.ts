import {
  diagnosisMap,
  resolveWeaknessLabel,
  weaknessOrder,
  type WeaknessId,
} from './diagnosisMap';
import { getReviewHeroPrompt } from './review-content-map';

// 약점 목록을 정리하면 이미 저장된 기록(Firestore·로컬)에 옛 id가 남는다.
// 그 id가 화면으로 흘러와도 죽지 않아야 한다.
const REMOVED_ID = 'g2_radical_simplify_removed' as WeaknessId;

describe('resolveWeaknessLabel', () => {
  it('목록에 있는 약점 id는 그대로 이름표를 돌려준다', () => {
    for (const weaknessId of weaknessOrder) {
      expect(resolveWeaknessLabel(weaknessId)).toBe(diagnosisMap[weaknessId].labelKo);
    }
  });

  it('목록에서 사라진 id가 와도 던지지 않는다', () => {
    expect(() => resolveWeaknessLabel(REMOVED_ID)).not.toThrow();
    expect(resolveWeaknessLabel(REMOVED_ID)).toBe('알 수 없음');
  });

  it('id가 없을 때도 던지지 않는다', () => {
    expect(resolveWeaknessLabel(null)).toBe('알 수 없음');
    expect(resolveWeaknessLabel(undefined)).toBe('알 수 없음');
    expect(resolveWeaknessLabel('')).toBe('알 수 없음');
  });
});

describe('getReviewHeroPrompt', () => {
  it('목록에 있는 약점은 문구가 비지 않는다', () => {
    for (const weaknessId of weaknessOrder) {
      expect(getReviewHeroPrompt(weaknessId).length).toBeGreaterThan(0);
    }
  });

  it('사라진 약점이 복습 과제에 남아 있어도 홈이 던지지 않는다', () => {
    // home-state.ts 의 heroTitle 이 이 함수를 그대로 쓴다 — 여기서 던지면 홈이 죽는다.
    expect(() => getReviewHeroPrompt(REMOVED_ID)).not.toThrow();
    expect(getReviewHeroPrompt(REMOVED_ID)).toBe('지난번에 어디서 막혔는지 떠오르나요?');
  });
});
