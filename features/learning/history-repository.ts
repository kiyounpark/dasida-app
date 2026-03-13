import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { FeaturedExamState, LearnerGrade } from '@/features/learner/types';
import type { DiagnosisTraceSource } from '@/features/quiz/types';

import type { LearningSource } from './history-types';
import type {
  LearnerSummaryCurrent,
  LearningAttempt,
  LearningAttemptResult,
  ReviewTask,
} from './types';

export const DEFAULT_FEATURED_EXAM_ID = 'featured-mock-1';

export type FinalizedAttemptQuestionInput = {
  questionId: string;
  questionNumber: number;
  topic: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  finalWeaknessId: WeaknessId | null;
  methodId: SolveMethodId | null;
  diagnosisSource: DiagnosisTraceSource | null;
  finalMethodSource: 'router' | 'manual' | null;
  diagnosisCompleted: boolean;
  usedDontKnow: boolean;
  usedAiHelp: boolean;
};

export type FinalizedAttemptInput = {
  attemptId: string;
  accountKey: string;
  learnerId: string;
  source: LearningSource;
  sourceEntityId: string | null;
  gradeSnapshot: LearnerGrade;
  startedAt: string;
  completedAt: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  primaryWeaknessId: WeaknessId | null;
  topWeaknesses: WeaknessId[];
  questions: FinalizedAttemptQuestionInput[];
};

export type LearningHistoryRepository = {
  recordAttempt(input: FinalizedAttemptInput): Promise<{
    attempt: LearningAttempt;
    results: LearningAttemptResult[];
    summary: LearnerSummaryCurrent;
    reviewTasks: ReviewTask[];
  }>;
  loadCurrentSummary(accountKey: string): Promise<LearnerSummaryCurrent | null>;
  saveFeaturedExamState(
    accountKey: string,
    state: FeaturedExamState,
  ): Promise<LearnerSummaryCurrent>;
  listAttempts(
    accountKey: string,
    options?: { source?: LearningSource; limit?: number },
  ): Promise<LearningAttempt[]>;
  listAttemptResults(accountKey: string, attemptId: string): Promise<LearningAttemptResult[]>;
};

export function createDefaultFeaturedExamState(): FeaturedExamState {
  return {
    examId: DEFAULT_FEATURED_EXAM_ID,
    status: 'not_started',
  };
}

export function createEmptyLearnerSummary(accountKey: string): LearnerSummaryCurrent {
  return {
    accountKey,
    updatedAt: new Date().toISOString(),
    repeatedWeaknesses: [],
    featuredExamState: createDefaultFeaturedExamState(),
    totals: {
      diagnosticAttempts: 0,
      featuredExamAttempts: 0,
    },
    recentActivity: [],
  };
}
