import { spawnMistakeReviewTasks } from './review-scheduler';
import type { ReviewTaskStore } from './review-task-store';
import type { ReviewTask } from './types';

function memStore(initial: ReviewTask[]): ReviewTaskStore & { all: () => ReviewTask[] } {
  let tasks = [...initial];
  return {
    load: async () => [...tasks],
    saveAll: async (_k, next) => {
      tasks = [...next];
    },
    reset: async () => {
      tasks = [];
    },
    all: () => tasks,
  };
}

function task(p: Partial<ReviewTask>): ReviewTask {
  return {
    id: `${p.sourceId}__${p.weaknessId}__${p.stage}`,
    accountKey: 'acc',
    source: 'weakness-practice',
    sourceId: 'src1',
    weaknessId: 'discriminant_calculation' as any,
    stage: 'day1',
    scheduledFor: '2026-05-01',
    completed: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...p,
  } as ReviewTask;
}

const TOMORROW = (() => {
  const d = new Date();
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`;
})();

describe('spawnMistakeReviewTasks', () => {
  it('약점 task 없으면 day1·내일로 신규 생성', async () => {
    const store = memStore([]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t).toHaveLength(1);
    expect(t[0].stage).toBe('day1');
    expect(t[0].id).toBe('src1__discriminant_calculation__day1');
    expect(t[0].scheduledFor).toBe(TOMORROW);
    expect(t[0].completed).toBe(false);
  });

  it('상위 단계 미완료 task는 삭제 후 day1 재생성 (in-place 변경 금지)', async () => {
    const store = memStore([
      task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day7', scheduledFor: '2026-09-01' }),
    ]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t).toHaveLength(1);
    expect(t[0].id).toBe('src1__discriminant_calculation__day1');
    expect(t[0].stage).toBe('day1');
    expect(t[0].scheduledFor).toBe(TOMORROW);
    expect(t.some((x) => x.id === 'src1__discriminant_calculation__day7')).toBe(false);
  });

  it('이미 day1이면 신규 생성 없이 scheduledFor만 내일로', async () => {
    const store = memStore([
      task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day1', scheduledFor: '2026-01-01' }),
    ]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t).toHaveLength(1);
    expect(t[0].stage).toBe('day1');
    expect(t[0].scheduledFor).toBe(TOMORROW);
  });

  it('완료된 task는 무시하고 신규 생성', async () => {
    const store = memStore([
      task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day7', completed: true }),
    ]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t.filter((x) => !x.completed)).toHaveLength(1);
    expect(t.find((x) => !x.completed)!.stage).toBe('day1');
  });

  it('같은 약점 중복 입력은 task 1개만', async () => {
    const store = memStore([]);
    await spawnMistakeReviewTasks(
      'acc',
      'src1',
      ['discriminant_calculation', 'discriminant_calculation'] as any,
      store,
    );
    expect(store.all()).toHaveLength(1);
  });

  it('상세 약점==큰 약점: completeReviewTask 직후 상태에서도 미완료 task 1개 (spec §Success Criteria)', async () => {
    // completeReviewTask가 day1 완료 처리 + 다음 단계(day3) pending 생성한 직후 상태를 시뮬레이션
    const store = memStore([
      task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day1', completed: true }),
      task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day3', scheduledFor: '2026-08-01' }),
    ]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const pending = store.all().filter((t) => !t.completed);
    expect(pending).toHaveLength(1);
    expect(pending[0].stage).toBe('day1');
    expect(pending[0].id).toBe('src1__discriminant_calculation__day1');
    expect(pending[0].scheduledFor).toBe(TOMORROW);
    expect(store.all().some((t) => t.id === 'src1__discriminant_calculation__day3')).toBe(false);
  });

  it('빈 입력이면 store 변경 없음', async () => {
    const store = memStore([task({ stage: 'day7' })]);
    await spawnMistakeReviewTasks('acc', 'src1', [], store);
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0].stage).toBe('day7');
  });
});
