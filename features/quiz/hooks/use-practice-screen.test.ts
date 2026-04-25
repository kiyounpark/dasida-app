import { computeCanGraduate } from './use-practice-screen';

describe('computeCanGraduate', () => {
  const base = {
    activeMode: 'weakness' as const,
    questionCount: 3,
    solvedCount: 3,
    practiceGraduatedAt: undefined as string | undefined,
  };

  it('모든 문제를 풀었을 때 true를 반환한다', () => {
    expect(computeCanGraduate({ ...base, solvedCount: 3 })).toBe(true);
  });

  it('일부만 풀었을 때 false를 반환한다', () => {
    expect(computeCanGraduate({ ...base, solvedCount: 1 })).toBe(false);
    expect(computeCanGraduate({ ...base, solvedCount: 2 })).toBe(false);
  });

  it('한 문제도 안 풀었을 때 false를 반환한다', () => {
    expect(computeCanGraduate({ ...base, solvedCount: 0 })).toBe(false);
  });

  it('이미 졸업한 경우 false를 반환한다', () => {
    expect(
      computeCanGraduate({ ...base, practiceGraduatedAt: '2026-04-25T00:00:00Z' }),
    ).toBe(false);
  });

  it('weakness 모드가 아닌 경우 false를 반환한다', () => {
    expect(computeCanGraduate({ ...base, activeMode: 'review' as const })).toBe(false);
    expect(computeCanGraduate({ ...base, activeMode: 'challenge' as const })).toBe(false);
  });

  it('questionCount가 0인 경우 false를 반환한다 (빈 큐 보호)', () => {
    expect(computeCanGraduate({ ...base, questionCount: 0, solvedCount: 0 })).toBe(false);
  });
});
