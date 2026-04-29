import type { WeaknessId } from '@/data/diagnosisMap';
import type { LearningAttempt } from './types';
import { buildWeaknessAppearances } from './weakness-appearances';

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

const W1 = 'fn-limit' as WeaknessId;
const W2 = 'integral' as WeaknessId;

describe('buildWeaknessAppearances', () => {
  it('해당 약점이 포함된 attempt만 반환', () => {
    const attempts = [
      makeAttempt({ id: 'a1', topWeaknesses: [W1] }),
      makeAttempt({ id: 'a2', topWeaknesses: [W2] }),
      makeAttempt({ id: 'a3', topWeaknesses: [W1, W2] }),
    ];
    const result = buildWeaknessAppearances(W1, attempts);
    expect(result.map((a) => a.attemptId)).toEqual(['a1', 'a3']);
  });

  it('최신순(completedAt desc)으로 정렬', () => {
    const attempts = [
      makeAttempt({ id: 'a1', completedAt: '2026-02-10T00:00:00Z', topWeaknesses: [W1] }),
      makeAttempt({ id: 'a2', completedAt: '2026-04-15T00:00:00Z', topWeaknesses: [W1] }),
      makeAttempt({ id: 'a3', completedAt: '2026-03-20T00:00:00Z', topWeaknesses: [W1] }),
    ];
    const result = buildWeaknessAppearances(W1, attempts);
    expect(result.map((a) => a.attemptId)).toEqual(['a2', 'a3', 'a1']);
  });

  it('featured-exam source는 EXAM_CATALOG에서 제목 lookup', () => {
    const attempts = [
      makeAttempt({
        id: 'a1',
        source: 'featured-exam',
        sourceEntityId: 'g3-stats-mock-2025-09',
        topWeaknesses: [W1],
      }),
    ];
    const result = buildWeaknessAppearances(W1, attempts);
    expect(result[0].sourceLabel).toBe('2025년 9월 고3 확률과통계 모의고사');
  });

  it('featured-exam인데 카탈로그 lookup 실패 시 fallback', () => {
    const attempts = [
      makeAttempt({
        id: 'a1',
        source: 'featured-exam',
        sourceEntityId: 'unknown-exam-id',
        completedAt: '2026-04-15T00:00:00Z',
        topWeaknesses: [W1],
      }),
    ];
    const result = buildWeaknessAppearances(W1, attempts);
    expect(result[0].sourceLabel).toBe('2026년 4월 모의고사');
  });

  it('diagnostic source는 "YYYY년 M월 진단" 형식', () => {
    const attempts = [
      makeAttempt({
        id: 'a1',
        source: 'diagnostic',
        sourceEntityId: null,
        completedAt: '2026-04-15T05:30:00Z',
        topWeaknesses: [W1],
      }),
    ];
    const result = buildWeaknessAppearances(W1, attempts);
    expect(result[0].sourceLabel).toBe('2026년 4월 진단');
  });

  it('weakness-practice 등 그 외 source는 제외', () => {
    const attempts = [
      makeAttempt({ id: 'a1', source: 'weakness-practice', topWeaknesses: [W1] }),
    ];
    const result = buildWeaknessAppearances(W1, attempts);
    expect(result).toEqual([]);
  });
});
