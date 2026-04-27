import {
  computeMilestoneThresholds,
  detectMilestoneReached,
  type MilestoneFraction,
} from '@/features/quiz/exam/diagnosis-milestone';

describe('computeMilestoneThresholds', () => {
  it('오답 수 9 이하면 마일스톤 없음', () => {
    expect(computeMilestoneThresholds(9)).toEqual({ at33: null, at67: null });
    expect(computeMilestoneThresholds(1)).toEqual({ at33: null, at67: null });
    expect(computeMilestoneThresholds(0)).toEqual({ at33: null, at67: null });
  });

  it('오답 15개일 때 33%=4 (floor 4.95), 67%=10 (floor 10.05)', () => {
    expect(computeMilestoneThresholds(15)).toEqual({ at33: 4, at67: 10 });
  });

  it('오답 12개일 때 33%=3 (floor 3.96), 67%=8 (floor 8.04)', () => {
    expect(computeMilestoneThresholds(12)).toEqual({ at33: 3, at67: 8 });
  });

  it('오답 10개일 때 33%=3 (floor 3.3), 67%=6 (floor 6.7)', () => {
    expect(computeMilestoneThresholds(10)).toEqual({ at33: 3, at67: 6 });
  });

  it('오답 11개일 때 33%=3 (floor 3.63), 67%=7 (floor 7.37)', () => {
    expect(computeMilestoneThresholds(11)).toEqual({ at33: 3, at67: 7 });
  });
});

describe('detectMilestoneReached', () => {
  it('현재 노트 수가 33% 도달 시점이면 33 반환', () => {
    expect(
      detectMilestoneReached({ totalWrong: 15, currentNoteCount: 4 }),
    ).toBe<MilestoneFraction>(33);
  });

  it('현재 노트 수가 67% 도달 시점이면 67 반환', () => {
    expect(
      detectMilestoneReached({ totalWrong: 15, currentNoteCount: 10 }),
    ).toBe<MilestoneFraction>(67);
  });

  it('임계값 미만이면 null 반환', () => {
    // at33=4, at67=10 — 3은 둘 다 미달
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 3 })).toBeNull();
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 0 })).toBeNull();
  });

  it('임계값을 초과(dot-jump)해도 해당 마일스톤 반환 (>= 비교)', () => {
    // at33=4: count=5도 33 반환, at67=10: count=11도 67 반환
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 5 })).toBe(33);
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 11 })).toBe(67);
  });

  it('67 임계값 이상이면 항상 67 반환 (33보다 우선)', () => {
    // at67=10 이상은 33이 함께 충족돼도 67 우선
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 10 })).toBe(67);
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 15 })).toBe(67);
  });

  it('오답 9개 이하는 항상 null', () => {
    expect(detectMilestoneReached({ totalWrong: 9, currentNoteCount: 3 })).toBeNull();
    expect(detectMilestoneReached({ totalWrong: 9, currentNoteCount: 6 })).toBeNull();
  });

  it('오답 10개: floor(3.3)=3, floor(6.7)=6 — 안 겹침', () => {
    expect(detectMilestoneReached({ totalWrong: 10, currentNoteCount: 3 })).toBe(33);
    expect(detectMilestoneReached({ totalWrong: 10, currentNoteCount: 6 })).toBe(67);
  });
});
