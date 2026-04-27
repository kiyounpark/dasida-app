import {
  computeMilestoneThresholds,
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
