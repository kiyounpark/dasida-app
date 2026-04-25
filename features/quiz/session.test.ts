import { reducer } from '@/features/quiz/session';
import type { WeaknessId } from '@/data/diagnosisMap';

const baseState = {
  hasStarted: false,
  totalQuestions: 10,
  attemptId: undefined,
  startedAt: undefined,
  currentQuestionIndex: 0,
  answers: [],
  isDiagnosing: false,
  diagnosisQueue: [],
  weaknessScores: {} as Record<WeaknessId, number>,
  result: undefined,
  practiceMode: undefined as 'weakness' | 'challenge' | undefined,
  practiceQueue: [] as WeaknessId[],
  practiceIndex: 0,
  practiceCompleted: false,
  challengeCompleted: false,
};

const weaknesses: WeaknessId[] = ['formula_understanding', 'calc_repeated_error'];

describe('SEED_PRACTICE_QUEUE', () => {
  it('빈 큐에 약점 목록을 채운다', () => {
    const next = reducer(baseState, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses },
    });
    expect(next.practiceQueue).toEqual(weaknesses);
    expect(next.practiceIndex).toBe(0);
    expect(next.practiceMode).toBe('weakness');
    expect(next.practiceCompleted).toBe(false);
  });

  it('result가 이미 있으면 무시한다', () => {
    const stateWithResult = {
      ...baseState,
      result: { allCorrect: false, topWeaknesses: weaknesses } as any,
    };
    const next = reducer(stateWithResult, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses },
    });
    expect(next).toBe(stateWithResult);
  });

  it('practiceQueue가 이미 차 있으면 무시한다', () => {
    const stateWithQueue = { ...baseState, practiceQueue: ['formula_understanding'] as WeaknessId[] };
    const next = reducer(stateWithQueue, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses },
    });
    expect(next).toBe(stateWithQueue);
  });

  it('weaknesses가 빈 배열이면 무시한다', () => {
    const next = reducer(baseState, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses: [] },
    });
    expect(next).toBe(baseState);
  });
});

describe('ADVANCE_PRACTICE (가드 완화)', () => {
  it('state.result 없어도 practiceMode=weakness + 큐 있으면 인덱스를 증가시킨다', () => {
    const seededState = {
      ...baseState,
      practiceMode: 'weakness' as const,
      practiceQueue: weaknesses,
      practiceIndex: 0,
    };
    const next = reducer(seededState, { type: 'ADVANCE_PRACTICE' });
    expect(next.practiceIndex).toBe(1);
  });

  it('마지막 약점에서 advance하면 practiceCompleted가 true가 된다', () => {
    const seededState = {
      ...baseState,
      practiceMode: 'weakness' as const,
      practiceQueue: weaknesses,
      practiceIndex: 1, // 마지막 인덱스
    };
    const next = reducer(seededState, { type: 'ADVANCE_PRACTICE' });
    expect(next.practiceCompleted).toBe(true);
  });

  it('practiceMode가 weakness가 아니면 무시한다', () => {
    const challengeState = {
      ...baseState,
      practiceMode: 'challenge' as const,
      practiceQueue: [],
    };
    const next = reducer(challengeState, { type: 'ADVANCE_PRACTICE' });
    expect(next).toBe(challengeState);
  });

  it('practiceQueue가 비어있으면 무시한다', () => {
    const emptyQueueState = {
      ...baseState,
      practiceMode: 'weakness' as const,
      practiceQueue: [],
    };
    const next = reducer(emptyQueueState, { type: 'ADVANCE_PRACTICE' });
    expect(next).toBe(emptyQueueState);
  });
});
