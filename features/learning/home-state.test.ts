import type { WeaknessId } from '@/data/diagnosisMap';

import { buildHomeLearningState } from './home-state';
import type { LearnerSummaryCurrent, ReviewTask } from './types';

// 1.0.12 서버 과제 모양 (가) — 노트 과제(source photo + weaknessId null)가 섞여도 홈이 안 깨진다.
const noteTask: ReviewTask = {
  id: 'photo-1__note__day1',
  accountKey: 'acc1',
  weaknessId: null,
  source: 'photo',
  sourceId: 'photo-1',
  scheduledFor: '2026-04-30T00:00:00.000Z',
  stage: 'day1',
  completed: false,
  createdAt: '2026-04-29T00:00:00.000Z',
};
const weaknessTask: ReviewTask = {
  ...noteTask,
  id: 'src-1__formula_understanding__day1',
  weaknessId: 'formula_understanding' as WeaknessId,
  source: 'diagnostic',
  sourceId: 'src-1',
};

function makeSummary(tasks: ReviewTask[]): LearnerSummaryCurrent {
  const summaries = tasks.map(({ id, weaknessId, stage, scheduledFor, source, sourceId }) => ({
    id,
    weaknessId,
    stage,
    scheduledFor,
    source,
    sourceId,
  }));
  return {
    accountKey: 'acc1',
    updatedAt: '2026-04-30T00:00:00.000Z',
    repeatedWeaknesses: [],
    nextReviewTask: summaries[0],
    dueReviewTasks: summaries,
    featuredExamState: { examId: 'featured-mock-1', status: 'not_started' },
    totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
    recentActivity: [],
  };
}

describe('buildHomeLearningState — 노트 과제', () => {
  it('노트 과제가 맨 앞이어도 홈 상태를 만든다 — 이름 자리는 이름 없는 문구로', () => {
    const state = buildHomeLearningState(makeSummary([noteTask, weaknessTask]), null, [noteTask, weaknessTask]);

    expect(state.todayReviewCount).toBe(2);
    expect(state.heroTitle).toBe('지난번에 어디서 막혔는지 떠오르나요?');
  });

  it('약점 진행에는 약점 과제만 — 노트 과제끼리 null로 한 줄에 뭉치지 않는다', () => {
    const secondNote = { ...noteTask, id: 'photo-2__note__day1', sourceId: 'photo-2' };
    const state = buildHomeLearningState(
      makeSummary([noteTask, secondNote, weaknessTask]),
      null,
      [noteTask, secondNote, weaknessTask],
    );

    expect(state.weaknessProgressItems.map((item) => item.weaknessId)).toEqual(['formula_understanding']);
  });
});
