import type { WeaknessId } from '@/data/diagnosisMap';
import { computeCanGraduate } from './can-graduate';
import { pickActiveWeaknessId, resolveQueueSeed } from './practice-weakness-helpers';

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

describe('pickActiveWeaknessId', () => {
  const baseArgs = {
    activeMode: 'weakness' as const,
    practiceQueue: [] as WeaknessId[],
    practiceIndex: 0,
  };

  it('fallbackWeaknessId가 있으면 recoveryWeakness보다 우선한다', () => {
    const result = pickActiveWeaknessId({
      ...baseArgs,
      fallbackWeaknessId: 'calc_repeated_error',
      recoveryWeakness: 'formula_understanding',
    });
    expect(result).toBe('calc_repeated_error');
  });

  it('fallbackWeaknessId가 없으면 recoveryWeakness를 사용한다', () => {
    const result = pickActiveWeaknessId({
      ...baseArgs,
      fallbackWeaknessId: undefined,
      recoveryWeakness: 'formula_understanding',
    });
    expect(result).toBe('formula_understanding');
  });

  it('practiceQueue가 채워져 있으면 queue 항목을 우선 반환한다', () => {
    const result = pickActiveWeaknessId({
      ...baseArgs,
      practiceQueue: ['calc_repeated_error', 'formula_understanding'] as WeaknessId[],
      practiceIndex: 1,
      fallbackWeaknessId: 'vertex_formula_memorization',
      recoveryWeakness: 'formula_understanding',
    });
    expect(result).toBe('formula_understanding');
  });

  it('review 모드이면 activeReviewTaskWeaknessId를 반환한다', () => {
    const result = pickActiveWeaknessId({
      activeMode: 'review',
      activeReviewTaskWeaknessId: 'formula_understanding',
      practiceQueue: ['calc_repeated_error'] as WeaknessId[],
      practiceIndex: 0,
      fallbackWeaknessId: 'calc_repeated_error',
      recoveryWeakness: 'calc_repeated_error',
    });
    expect(result).toBe('formula_understanding');
  });
});

describe('resolveQueueSeed', () => {
  const baseArgs = {
    activeMode: 'weakness' as const,
    hasResult: false,
    practiceQueueLength: 0,
    topWeaknesses: ['formula_understanding', 'calc_repeated_error'] as WeaknessId[],
  };

  it('fallbackWeaknessId가 있으면 null을 반환한다 (시딩 생략)', () => {
    const result = resolveQueueSeed({
      ...baseArgs,
      fallbackWeaknessId: 'calc_repeated_error',
    });
    expect(result).toBeNull();
  });

  it('fallbackWeaknessId가 없으면 topWeaknesses를 반환한다', () => {
    const result = resolveQueueSeed({
      ...baseArgs,
      fallbackWeaknessId: undefined,
    });
    expect(result).toEqual(['formula_understanding', 'calc_repeated_error']);
  });

  it('weakness 모드가 아니면 null을 반환한다', () => {
    expect(resolveQueueSeed({ ...baseArgs, activeMode: 'review' })).toBeNull();
    expect(resolveQueueSeed({ ...baseArgs, activeMode: 'challenge' })).toBeNull();
  });

  it('result가 있으면 null을 반환한다', () => {
    expect(resolveQueueSeed({ ...baseArgs, hasResult: true })).toBeNull();
  });

  it('큐에 이미 항목이 있으면 null을 반환한다', () => {
    expect(resolveQueueSeed({ ...baseArgs, practiceQueueLength: 1 })).toBeNull();
  });

  it('topWeaknesses가 비어 있으면 null을 반환한다', () => {
    expect(resolveQueueSeed({ ...baseArgs, topWeaknesses: [] })).toBeNull();
    expect(resolveQueueSeed({ ...baseArgs, topWeaknesses: undefined })).toBeNull();
  });
});
