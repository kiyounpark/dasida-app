import { diagnosisMap, type WeaknessId } from '@/data/diagnosisMap';
import type { LearnerProfile } from '@/features/learner/types';

import type { ReviewTask } from './types';

export type HomeLearningState = {
  hero: 'diagnostic' | 'review';
  latestDiagnosticSummary?: {
    topWeaknesses: WeaknessId[];
    accuracy: number;
    completedAt: string;
  };
  nextReviewTask?: ReviewTask;
  featuredExamCard: {
    examId: string;
    status: 'not_started' | 'in_progress' | 'completed';
  };
  recentActivity: Array<{
    id: string;
    kind: 'diagnostic' | 'review' | 'exam';
    title: string;
    subtitle: string;
  }>;
};

function sortReviewTasks(tasks: ReviewTask[]) {
  return [...tasks].sort((left, right) =>
    left.scheduledFor.localeCompare(right.scheduledFor),
  );
}

export function buildHomeLearningState(
  profile: LearnerProfile,
  reviewTasks: ReviewTask[],
): HomeLearningState {
  const pendingTasks = sortReviewTasks(reviewTasks.filter((task) => !task.completed));
  const nextReviewTask =
    pendingTasks[0] ??
    (profile.activeReviewTask
      ? {
          ...profile.activeReviewTask,
          sourceId: `preview-${profile.activeReviewTask.id}`,
          completed: false,
          createdAt: profile.updatedAt,
        }
      : undefined);

  const recentActivity: HomeLearningState['recentActivity'] = [];

  if (profile.latestDiagnosticSummary) {
    recentActivity.push({
      id: 'latest-diagnostic',
      kind: 'diagnostic',
      title: '최근 진단 결과',
      subtitle:
        profile.latestDiagnosticSummary.topWeaknesses.length > 0
          ? diagnosisMap[profile.latestDiagnosticSummary.topWeaknesses[0]].labelKo
          : '오답 분석 없음',
    });
  }

  if (nextReviewTask) {
    recentActivity.push({
      id: `review-${nextReviewTask.id}`,
      kind: 'review',
      title: '다음 복습',
      subtitle: diagnosisMap[nextReviewTask.weaknessId].labelKo,
    });
  }

  if (profile.featuredExamState) {
    recentActivity.push({
      id: `exam-${profile.featuredExamState.examId}`,
      kind: 'exam',
      title: '대표 모의고사',
      subtitle:
        profile.featuredExamState.status === 'in_progress'
          ? '이어 풀기 가능'
          : profile.featuredExamState.status === 'completed'
            ? '최근 완료'
            : '아직 시작 전',
    });
  }

  return {
    hero: nextReviewTask ? 'review' : 'diagnostic',
    latestDiagnosticSummary: profile.latestDiagnosticSummary,
    nextReviewTask,
    featuredExamCard: {
      examId: profile.featuredExamState?.examId ?? 'featured-mock-1',
      status: profile.featuredExamState?.status ?? 'not_started',
    },
    recentActivity,
  };
}
