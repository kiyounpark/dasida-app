import type { WeaknessId } from '@/data/diagnosisMap';
import type { LearningSource, ReviewStage } from '@/features/learning/history-types';

export type PreviewSeedState =
  | 'fresh'
  | 'diagnostic-complete'
  | 'review-available'
  | 'review-day3-available'
  | 'review-day7-available'
  | 'review-day30-available'
  | 'exam-in-progress';

export type LearnerGrade = 'g1' | 'g2' | 'g3' | 'unknown';
export type LearnerTrack = 'calc' | 'stats' | 'geom'; // 고3 수능 선택과목

export type DiagnosticSummarySnapshot = {
  attemptId: string;
  completedAt: string;
  topWeaknesses: WeaknessId[];
  accuracy: number;
};

export type ActiveReviewTaskSummary = {
  id: string;
  weaknessId: WeaknessId;
  stage: ReviewStage;
  scheduledFor: string;
  source: LearningSource;
  sourceId: string;
};

export type FeaturedExamState = {
  examId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  questionIndex?: number;
  lastOpenedAt?: string;
};

export type LearnerProfile = {
  accountKey: string;
  learnerId: string;
  nickname: string;
  grade: LearnerGrade;
  track?: LearnerTrack; // 고3 전용: 'calc' | 'stats' | 'geom'
  createdAt: string;
  updatedAt: string;
  practiceGraduatedAt?: string; // ISO 타임스탬프. 약점 연습 완료 버튼을 처음 누른 시각.
};
