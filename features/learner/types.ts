import type { WeaknessId } from '@/data/diagnosisMap';
import type { LearningSource, ReviewStage } from '@/features/learning/history-types';

export type PreviewSeedState =
  | 'fresh'
  | 'diagnostic-complete'
  | 'review-available'
  | 'exam-in-progress';

export type LearnerGrade = 'g1' | 'g2' | 'g3' | 'unknown';

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
  createdAt: string;
  updatedAt: string;
};
