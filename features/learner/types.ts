import type { WeaknessId } from '@/data/diagnosisMap';

export type ReviewStage = 'day1' | 'day3' | 'day7';
export type PreviewSeedState =
  | 'fresh'
  | 'diagnostic-complete'
  | 'review-available'
  | 'exam-in-progress';

export type DiagnosticSummarySnapshot = {
  completedAt: string;
  topWeaknesses: WeaknessId[];
  accuracy: number;
};

export type ActiveReviewTaskSummary = {
  id: string;
  weaknessId: WeaknessId;
  stage: ReviewStage;
  scheduledFor: string;
  source: 'diagnostic' | 'exam';
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
  grade: 'g1' | 'g2' | 'g3' | 'unknown';
  createdAt: string;
  updatedAt: string;
  latestDiagnosticSummary?: DiagnosticSummarySnapshot;
  activeReviewTask?: ActiveReviewTaskSummary;
  featuredExamState?: FeaturedExamState;
};

