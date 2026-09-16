import type { ActiveReviewTaskSummary } from '@/features/learner/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

/**
 * 홈은 "오늘 복습할 것"이다 (🔒 2026.09.15 결정 B).
 *
 * 여정보드(4노드 · 8 state)를 대신한다. 여정보드는 진단을 출발칸으로 삼았는데
 * 진단이 B칸에서 사라져서, 8 state 중 7개가 도달 불가가 됐다.
 *
 * ## mode 3갈래
 *
 * - `review`  — 오늘 할 복습이 있다. 리스트가 주인공이고 사진은 끝에 한 줄로 남는다.
 * - `resting` — 재료는 있는데 오늘 차례가 아니다. "다음 복습 D-N"과 사진 카드.
 * - `empty`   — 재료가 아예 없다. 사진 카드만.
 *
 * ## 졸업은 없다
 *
 * 재료가 떨어지면 `empty`로 돌아와 다시 사진을 요구한다.
 * 이전 `practiceGraduatedAt`은 약점연습·step-complete 화면이 계속 쓰므로 남겨두되,
 * 홈은 이 값을 보지 않는다.
 */
export type HomeTodayMode = 'review' | 'resting' | 'empty';

export type HomeTodayState = {
  mode: HomeTodayMode;
  /** mode가 'review'일 때만 1개 이상. 오늘 차례가 된 복습 전부. */
  dueTasks: ActiveReviewTaskSummary[];
  /** 다음 복습 1개. 'resting'에서 D-N을 계산하는 재료. */
  nextTask?: ActiveReviewTaskSummary;
  title: string;
  body: string;
};

export function buildHomeTodayState(summary: LearnerSummaryCurrent): HomeTodayState {
  const dueTasks = summary.dueReviewTasks ?? [];
  const nextTask = summary.nextReviewTask;

  if (dueTasks.length > 0) {
    return {
      mode: 'review',
      dueTasks,
      nextTask,
      title: `오늘 복습할 게 ${dueTasks.length}개 있어요`,
      body:
        dueTasks.length === 1
          ? '하나만 짧게 다시 보면 돼요.'
          : '위에서부터 차례로 보면 돼요.',
    };
  }

  if (nextTask) {
    return {
      mode: 'resting',
      dueTasks: [],
      nextTask,
      title: '오늘은 복습 없는 날이에요',
      body: '새로 틀린 문제를 찍어두면 다음 복습이 늘어나요.',
    };
  }

  return {
    mode: 'empty',
    dueTasks: [],
    title: '아직 복습할 게 없어요',
    body: '틀린 문제를 찍어서 올리면 여기에 쌓여요.',
  };
}
