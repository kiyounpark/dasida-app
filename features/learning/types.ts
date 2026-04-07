import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { DiagnosisTraceSource } from '@/features/quiz/types';
import type {
  ActiveReviewTaskSummary,
  DiagnosticSummarySnapshot,
  FeaturedExamState,
  LearnerGrade,
} from '@/features/learner/types';

import type { LearningSource, ReviewStage } from './history-types';

export type ReviewTask = {
  id: string;
  accountKey: string;
  weaknessId: WeaknessId;
  source: LearningSource;
  sourceId: string;
  scheduledFor: string;
  stage: ReviewStage;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export type LearningAttempt = {
  id: string;
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
  reviewStage?: ReviewStage;
  schemaVersion: 1;
  createdAt: string;
};

export type LearningAttemptResult = {
  id: string;
  attemptId: string;
  accountKey: string;
  source: LearningSource;
  sourceEntityId: string | null;
  questionId: string;
  questionNumber: number;
  topic: string;
  firstSelectedIndex?: number | null;
  selectedIndex: number | null;
  isCorrect: boolean;
  finalWeaknessId: WeaknessId | null;
  methodId: SolveMethodId | null;
  diagnosisSource: DiagnosisTraceSource | null;
  finalMethodSource: 'router' | 'manual' | null;
  diagnosisCompleted: boolean;
  usedDontKnow: boolean;
  usedAiHelp: boolean;
  wrongAttempts?: number;
  usedCoaching?: boolean;
  resolvedBy?: 'solved' | 'answer_revealed' | null;
  schemaVersion: 1;
  resolvedAt: string;
};

export type LearnerSummaryCurrent = {
  accountKey: string;
  updatedAt: string;
  lastAttemptAt?: string;
  latestDiagnosticSummary?: DiagnosticSummarySnapshot;
  repeatedWeaknesses: Array<{
    weaknessId: WeaknessId;
    count: number;
    lastSeenAt: string;
  }>;
  nextReviewTask?: ActiveReviewTaskSummary;
  dueReviewTasks: ActiveReviewTaskSummary[];
  featuredExamState: FeaturedExamState;
  totals: {
    diagnosticAttempts: number;
    featuredExamAttempts: number;
  };
  recentActivity: Array<{
    id: string;
    kind: 'diagnostic' | 'review' | 'exam';
    title: string;
    subtitle: string;
    occurredAt: string;
  }>;
};

export type PeerPresenceItem = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  avatarSeed?: string;
  statusText: string;
};

export type PeerPresenceSnapshot = {
  peers: PeerPresenceItem[];
  updatedAt: string;
};

export type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;
  weaknessLabel: string;
  stage: ReviewStage;
  completed: boolean;
  diagnosticAccuracy?: number;
  reviewAccuracyByStage: Partial<Record<ReviewStage, number>>;
};
