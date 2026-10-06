import {
  addDaysToToday,
  completeReviewTask,
  daysUntilScheduled,
  spawnMistakeReviewTasks,
  stepDownMissedReviewTasks,
} from './review-scheduler';
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
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}T00:00:00.000Z`;
})();

describe('addDaysToToday', () => {
  it('서버 스키마 z.string().datetime()가 받는 ISO datetime을 만든다', () => {
    expect(addDaysToToday(1)).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
  });

  it('앞 10글자는 기기 시간대 기준 날짜다 — due 판정이 slice(0, 10)으로 읽는다', () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    expect(addDaysToToday(1).slice(0, 10)).toBe(
      `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`,
    );
  });
});

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

  it('source를 안 넘기면 weakness-practice — 기존 호출부 동작 불변', async () => {
    const store = memStore([]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    expect(store.all()[0].source).toBe('weakness-practice');
  });

  it("source를 넘기면 그대로 박는다 — 사진 노트 과제는 'photo' (E칸)", async () => {
    const store = memStore([]);
    await spawnMistakeReviewTasks('acc', 'photo-x', ['discriminant_calculation'] as any, store, 'photo');
    expect(store.all()[0].source).toBe('photo');
    expect(store.all()[0].id).toBe('photo-x__discriminant_calculation__day1');
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

describe('stepDownMissedReviewTasks — 놓친 복습은 열 때 한 칸 내린다 (🔒 10.06)', () => {
  // 기기 시각 10/6 09:00 — 과제 날짜는 기기 날짜로 센다(addDaysToToday·daysUntilScheduled와 같은 기준)
  const NOW = new Date(2026, 9, 6, 9, 0);
  const TODAY = '2026-10-06T00:00:00.000Z';
  const ID = (stage: string) => `src1__discriminant_calculation__${stage}`;

  it('하루 놓친 day7은 day3으로 한 칸 — id도 새 단계로, 날짜는 오늘', async () => {
    const store = memStore([
      task({ id: ID('day7'), stage: 'day7', scheduledFor: '2026-10-05T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const all = store.all();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(ID('day3'));
    expect(all[0].stage).toBe('day3');
    expect(all[0].scheduledFor).toBe(TODAY);
    expect(all[0].completed).toBe(false);
  });

  it('같은 날 두 번 열어도 한 칸 — 날짜가 오늘이 돼 두 번째엔 안 내려간다', async () => {
    const store = memStore([
      task({ id: ID('day7'), stage: 'day7', scheduledFor: '2026-10-05T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    await stepDownMissedReviewTasks('acc', store, new Date(2026, 9, 6, 22, 0));
    const [t] = store.all();
    expect(t.id).toBe(ID('day3'));
    expect(t.stage).toBe('day3');
    expect(t.scheduledFor).toBe(TODAY);
  });

  it('일주일 안 열다 열어도 한 칸 — day30은 day7까지만', async () => {
    const store = memStore([
      task({ id: ID('day30'), stage: 'day30', scheduledFor: '2026-09-29T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const [t] = store.all();
    expect(t.id).toBe(ID('day7'));
    expect(t.stage).toBe('day7');
    expect(t.scheduledFor).toBe(TODAY);
  });

  it('매일 열고 안 하면 매일 한 칸 — day30이 사흘 뒤 day1, 그 뒤로는 day1에 머문다', async () => {
    const store = memStore([
      task({ id: ID('day30'), stage: 'day30', scheduledFor: '2026-10-05T00:00:00.000Z' }),
    ]);
    const stages: string[] = [];
    for (const date of [6, 7, 8, 9]) {
      await stepDownMissedReviewTasks('acc', store, new Date(2026, 9, date, 9, 0));
      stages.push(store.all()[0].stage);
    }
    expect(stages).toEqual(['day7', 'day3', 'day1', 'day1']);
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0].id).toBe(ID('day1'));
  });

  it('day1은 그대로 — 내려갈 칸이 없어 단계·id·날짜 모두 안 바뀌고 저장도 안 한다', async () => {
    const store = memStore([
      task({ id: ID('day1'), stage: 'day1', scheduledFor: '2026-10-01T00:00:00.000Z' }),
    ]);
    const saveAll = jest.spyOn(store, 'saveAll');
    await stepDownMissedReviewTasks('acc', store, NOW);
    const [t] = store.all();
    expect(t.id).toBe(ID('day1'));
    expect(t.stage).toBe('day1');
    expect(t.scheduledFor).toBe('2026-10-01T00:00:00.000Z');
    expect(saveAll).not.toHaveBeenCalled();
  });

  it('오늘·미래 과제와 완료된 과제는 안 건드린다 — 바뀐 게 없으면 저장하지 않는다', async () => {
    const store = memStore([
      task({ id: ID('day3'), stage: 'day3', scheduledFor: TODAY }),
      task({ sourceId: 'src2', id: 'src2__discriminant_calculation__day7', stage: 'day7', scheduledFor: '2026-10-09T00:00:00.000Z' }),
      task({ sourceId: 'src3', id: 'src3__discriminant_calculation__day7', stage: 'day7', scheduledFor: '2026-09-01T00:00:00.000Z', completed: true }),
    ]);
    const before = store.all();
    const saveAll = jest.spyOn(store, 'saveAll');
    await stepDownMissedReviewTasks('acc', store, NOW);
    expect(store.all()).toEqual(before);
    expect(saveAll).not.toHaveBeenCalled();
  });

  it('완료된 같은 id는 제자리 교체 — 같은 id가 둘 남지 않는다(둘이면 find가 완료본을 잡는다)', async () => {
    const store = memStore([
      task({ id: ID('day1'), stage: 'day1', scheduledFor: '2026-09-20T00:00:00.000Z', completed: true }),
      task({ id: ID('day3'), stage: 'day3', scheduledFor: '2026-09-23T00:00:00.000Z', completed: true }),
      task({ id: ID('day7'), stage: 'day7', scheduledFor: '2026-10-05T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const all = store.all();
    expect(all.map((t) => t.id)).toEqual([ID('day1'), ID('day3')]);
    const day3 = all.find((t) => t.id === ID('day3'))!;
    expect(day3.completed).toBe(false);
    expect(day3.stage).toBe('day3');
    expect(day3.scheduledFor).toBe(TODAY);
    expect(all.find((t) => t.id === ID('day1'))!.completed).toBe(true);
  });

  it('1.0.11이 내려 둔 과제(id day3 · stage day1)는 id를 stage로 다시 만든다 — 날짜가 안 지났으면 날짜 그대로', async () => {
    const store = memStore([
      task({ id: ID('day3'), stage: 'day1', scheduledFor: '2026-10-07T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const [t] = store.all();
    expect(t.id).toBe(ID('day1'));
    expect(t.stage).toBe('day1');
    expect(t.scheduledFor).toBe('2026-10-07T00:00:00.000Z');
  });

  it('1.0.11이 내려 둔 과제(id day3 · stage day1)가 날짜도 지났으면 — day1이라 더 안 내려가고 날짜 그대로, 완료된 day1은 제자리 교체', async () => {
    const store = memStore([
      task({ id: ID('day1'), stage: 'day1', scheduledFor: '2026-09-20T00:00:00.000Z', completed: true }),
      task({ id: ID('day3'), stage: 'day1', scheduledFor: '2026-10-02T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const all = store.all();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(ID('day1'));
    expect(all[0].stage).toBe('day1');
    expect(all[0].completed).toBe(false);
    expect(all[0].scheduledFor).toBe('2026-10-02T00:00:00.000Z');
  });

  it('1.0.11이 내려 둔 과제(id day7 · stage day3)가 날짜도 지났으면 — stage로 맞춘 뒤 그날 또 한 칸(day1, 오늘)', async () => {
    const store = memStore([
      task({ id: ID('day7'), stage: 'day3', scheduledFor: '2026-10-04T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const [t] = store.all();
    expect(t.id).toBe(ID('day1'));
    expect(t.stage).toBe('day1');
    expect(t.scheduledFor).toBe(TODAY);
  });

  it('노트 과제(weaknessId null)도 같은 규칙 — id는 {노트id}__note__{단계}', async () => {
    const store = memStore([
      task({ id: 'photo-1__note__day3', source: 'photo', sourceId: 'photo-1', weaknessId: null, stage: 'day3', scheduledFor: '2026-10-05T00:00:00.000Z' }),
    ]);
    await stepDownMissedReviewTasks('acc', store, NOW);
    const [t] = store.all();
    expect(t.id).toBe('photo-1__note__day1');
    expect(t.stage).toBe('day1');
    expect(t.weaknessId).toBeNull();
    expect(t.scheduledFor).toBe(TODAY);
  });
});

describe('completeReviewTask — 다음 복습이 생긴다', () => {
  it('day3을 끝내면 day7 과제가 생긴다', async () => {
    const store = memStore([task({ id: 'src1__discriminant_calculation__day3', stage: 'day3' })]);
    await completeReviewTask('acc', 'src1__discriminant_calculation__day3', store);
    const next = store.all().find((t) => !t.completed);
    expect(next?.id).toBe('src1__discriminant_calculation__day7');
    expect(next?.stage).toBe('day7');
  });

  it('내려간 채 안 고쳐진 과제(id day3 · stage day1)를 끝내도 day7이 생긴다 — 예전엔 다음 id가 자기와 겹쳐 0개', async () => {
    const store = memStore([
      task({ id: 'src1__discriminant_calculation__day3', stage: 'day1' }),
    ]);
    await completeReviewTask('acc', 'src1__discriminant_calculation__day3', store);
    const all = store.all();
    expect(all.find((t) => t.id === 'src1__discriminant_calculation__day3')?.completed).toBe(true);
    const next = all.find((t) => !t.completed);
    expect(next?.id).toBe('src1__discriminant_calculation__day7');
    expect(next?.stage).toBe('day7');
  });

  it('다음 단계 id의 완료본이 있어도 다음 복습이 생긴다 — 완료본 자리를 제자리 교체(리셋 뒤 다시 올라갈 때)', async () => {
    const store = memStore([
      task({ id: 'src1__discriminant_calculation__day3', stage: 'day3', completed: true }),
      task({ id: 'src1__discriminant_calculation__day1', stage: 'day1' }),
    ]);
    await completeReviewTask('acc', 'src1__discriminant_calculation__day1', store);
    const all = store.all();
    expect(all).toHaveLength(2);
    const day3s = all.filter((t) => t.id === 'src1__discriminant_calculation__day3');
    expect(day3s).toHaveLength(1);
    expect(day3s[0].completed).toBe(false);
    expect(day3s[0].stage).toBe('day3');
    expect(all.find((t) => t.id === 'src1__discriminant_calculation__day1')?.completed).toBe(true);
  });

  it('다음 단계 미완료 과제가 이미 있으면 새로 안 만든다', async () => {
    const store = memStore([
      task({ id: 'src1__discriminant_calculation__day1', stage: 'day1' }),
      task({ id: 'src1__discriminant_calculation__day3', stage: 'day3', scheduledFor: '2026-10-09T00:00:00.000Z' }),
    ]);
    await completeReviewTask('acc', 'src1__discriminant_calculation__day1', store);
    const day3s = store.all().filter((t) => t.id === 'src1__discriminant_calculation__day3');
    expect(day3s).toHaveLength(1);
    expect(day3s[0].scheduledFor).toBe('2026-10-09T00:00:00.000Z');
  });
});

describe('daysUntilScheduled — 기기 날짜로 센다', () => {
  it('한국 아침 8시에 내일 과제면 1이다 (UTC로 세면 2가 나오던 자리)', () => {
    const now = new Date(2026, 9, 3, 8, 0); // 기기 시각 10/3 08:00
    expect(daysUntilScheduled('2026-10-04T00:00:00.000Z', now)).toBe(1);
  });

  it('사흘 뒤면 3이다', () => {
    const now = new Date(2026, 9, 3, 23, 30);
    expect(daysUntilScheduled('2026-10-06T00:00:00.000Z', now)).toBe(3);
  });

  it('오늘·지난 날짜는 0·음수 그대로 — 막으면 오늘 과제가 「내일」로 둔갑한다', () => {
    const now = new Date(2026, 9, 3, 12, 0);
    expect(daysUntilScheduled('2026-10-03T00:00:00.000Z', now)).toBe(0);
    expect(daysUntilScheduled('2026-10-01T00:00:00.000Z', now)).toBe(-2);
  });
});

describe('노트 과제 (weaknessId null · 1.0.12 서버 과제 모양 (가))', () => {
  const note = () =>
    task({ id: 'photo-1__note__day1', source: 'photo', sourceId: 'photo-1', weaknessId: null, stage: 'day1' });

  it('completeReviewTask: 다음 단계 id가 {노트id}__note__{단계} — 문자열로 붙인 `__null__`이 아니다', async () => {
    const store = memStore([note()]);
    await completeReviewTask('acc', 'photo-1__note__day1', store);
    const next = store.all().find((t) => !t.completed);
    expect(next?.id).toBe('photo-1__note__day3');
    expect(next?.weaknessId).toBeNull();
    expect(next?.source).toBe('photo');
  });

  it('spawnMistakeReviewTasks: 같은 노트에서 약점 과제가 생겨도 노트 과제는 그대로 둔다', async () => {
    const store = memStore([note()]);
    await spawnMistakeReviewTasks('acc', 'photo-1', ['discriminant_calculation'] as any, store, 'photo');
    expect(store.all().map((t) => t.id).sort()).toEqual([
      'photo-1__discriminant_calculation__day1',
      'photo-1__note__day1',
    ]);
    expect(store.all().find((t) => t.id === 'photo-1__note__day1')).toEqual(note());
  });
});
