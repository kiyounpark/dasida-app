import type { WeaknessId } from '@/data/diagnosisMap';
import type { LearningSource, ReviewStage } from '@/features/learning/history-types';
import type { QuizAnswer } from '@/features/quiz/types';

export type PreviewSeedState =
  | 'fresh'
  | 'diagnostic-complete'
  | 'review-available'
  | 'review-day3-available'
  | 'review-day7-available'
  | 'review-day30-available'
  | 'exam-in-progress'
  | 'practice-graduated'
  | 'history-full';

export type LearnerGrade = 'g1' | 'g2' | 'g3' | 'unknown';
export type LearnerTrack = 'calc' | 'stats' | 'geom'; // 고3 수능 선택과목

export type DiagnosticSummarySnapshot = {
  attemptId: string;
  completedAt: string;
  topWeaknesses: WeaknessId[];
  accuracy: number;
  weaknessAccuracies: Partial<Record<WeaknessId, number>>;
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

export type PendingDiagnosisResumeState = {
  schemaVersion: 1;
  attemptId: string;
  startedAt: string;   // ISO
  savedAt: string;     // ISO, stale 판정용
  totalQuestions: number;
  answers: QuizAnswer[];
  weaknessScores: Record<WeaknessId, number>;
  diagnosisQueue: number[];
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
  latestDiagnosticResultViewedAt?: string; // ISO 타임스탬프. 가장 최근 진단의 결과 화면을 처음 본 시각. 새 진단 완료 시 리셋된다.
  pendingDiagnosticStartedAt?: string; // ISO 타임스탬프. 진단 진입 시 SET, 완료 시 CLEAR. stale 판정은 latestDiagnosticSummary.completedAt과 비교.
  pendingPracticeStartedAt?: string; // ISO 타임스탬프. weakness 연습 진입 시 SET, 완료 시 CLEAR. stale 판정은 최신 진단 완료 시각과 비교.
  pendingDiagnosisResume?: PendingDiagnosisResumeState;
};
