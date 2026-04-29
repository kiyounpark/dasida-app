import type { LearningAttempt } from './types';
import { computeRecentAppearanceCount, computeSeverity } from './weakness-severity';

function makeAttempt(overrides: Partial<LearningAttempt>): LearningAttempt {
  return {
    id: 'a',
    accountKey: 'k',
    learnerId: 'l',
    source: 'featured-exam',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-04-01T00:00:00.000Z',
    completedAt: '2026-04-01T00:30:00.000Z',
    questionCount: 30,
    correctCount: 25,
    wrongCount: 5,
    accuracy: 83,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2026-04-01T00:30:00.000Z',
    ...overrides,
  };
}

describe('computeRecentAppearanceCount', () => {
  it('최근 5번의 학습 중 약점이 등장한 횟수를 센다', () => {
    const attempts = [
      makeAttempt({ id: 'a1', completedAt: '2026-04-05T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a2', completedAt: '2026-04-04T00:00:00Z', topWeaknesses: ['fn-limit', 'integral'] }),
      makeAttempt({ id: 'a3', completedAt: '2026-04-03T00:00:00Z', topWeaknesses: [] }),
      makeAttempt({ id: 'a4', completedAt: '2026-04-02T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a5', completedAt: '2026-04-01T00:00:00Z', topWeaknesses: ['integral'] }),
    ];
    expect(computeRecentAppearanceCount('fn-limit', attempts)).toBe(3);
    expect(computeRecentAppearanceCount('integral', attempts)).toBe(2);
  });

  it('5번을 초과하는 attempt는 최신 5번만 본다', () => {
    const attempts = Array.from({ length: 8 }, (_, i) =>
      makeAttempt({
        id: `a${i}`,
        completedAt: `2026-04-${String(20 - i).padStart(2, '0')}T00:00:00Z`,
        topWeaknesses: i < 3 ? ['fn-limit'] : [],
      }),
    );
    expect(computeRecentAppearanceCount('fn-limit', attempts)).toBe(3);
  });

  it('diagnostic / featured-exam 외 source는 무시한다', () => {
    const attempts = [
      makeAttempt({ id: 'a1', source: 'weakness-practice', completedAt: '2026-04-05T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a2', source: 'featured-exam', completedAt: '2026-04-04T00:00:00Z', topWeaknesses: ['fn-limit'] }),
    ];
    expect(computeRecentAppearanceCount('fn-limit', attempts)).toBe(1);
  });
});

describe('computeSeverity', () => {
  it('4번 이상 등장이면 frequent', () => {
    expect(computeSeverity(5)).toBe('frequent');
    expect(computeSeverity(4)).toBe('frequent');
  });
  it('2~3번 등장이면 often', () => {
    expect(computeSeverity(3)).toBe('often');
    expect(computeSeverity(2)).toBe('often');
  });
  it('1번 등장이면 occasional', () => {
    expect(computeSeverity(1)).toBe('occasional');
  });
  it('0번 등장이어도 occasional (방어)', () => {
    expect(computeSeverity(0)).toBe('occasional');
  });
});
