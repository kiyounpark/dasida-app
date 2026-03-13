import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';

export type DiagnosisRouterSource = 'mock-router' | 'openai-router';
export type DiagnosisTraceSource = DiagnosisRouterSource | 'manual-selection';

export type DiagnosisRoutingTrace = {
  rawText: string;
  predictedMethodId?: SolveMethodId;
  confidence?: number;
  reason?: string;
  source: DiagnosisTraceSource;
  needsManualSelection: boolean;
  candidateMethodIds: SolveMethodId[];
  finalMethodId: SolveMethodId;
  finalMethodSource: 'router' | 'manual';
};

export type DiagnosisFlowEvent =
  | { kind: 'branch'; nodeId: string; optionId: string; weaknessId?: WeaknessId }
  | { kind: 'explain_continue'; nodeId: string }
  | { kind: 'dont_know'; nodeId: string }
  | { kind: 'check'; nodeId: string; optionId: string; isCorrect: boolean; weaknessId?: WeaknessId }
  | { kind: 'ai_help_requested'; nodeId: string; nodeKind: 'explain' | 'check' }
  | { kind: 'ai_help_continue'; nodeId: string; nodeKind: 'explain' | 'check' }
  | { kind: 'ai_help_fallback'; nodeId: string; nodeKind: 'explain' | 'check' };

export type DiagnosisDetailTrace = {
  methodId: SolveMethodId;
  flowId: SolveMethodId;
  visitedNodeIds: string[];
  events: DiagnosisFlowEvent[];
  usedDontKnow: boolean;
  usedAiHelp: boolean;
  finalWeaknessId: WeaknessId;
};

export type QuizAnswer = {
  problemId: string;
  selectedIndex: number;
  isCorrect: boolean;
  methodId?: SolveMethodId;
  weaknessId?: WeaknessId;
  diagnosisRouting?: DiagnosisRoutingTrace;
  diagnosisDetailTrace?: DiagnosisDetailTrace;
};

export type QuizResultSummary = {
  attemptId: string;
  startedAt: string;
  completedAt: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  allCorrect: boolean;
  topWeaknesses: WeaknessId[];
};

export type PracticeMode = 'weakness' | 'challenge';

export type QuizSessionState = {
  hasStarted: boolean;
  attemptId?: string;
  startedAt?: string;
  currentQuestionIndex: number;
  answers: QuizAnswer[];

  isDiagnosing: boolean;
  diagnosisQueue: number[];

  weaknessScores: Record<WeaknessId, number>;
  result?: QuizResultSummary;
  practiceMode?: PracticeMode;
  practiceQueue: WeaknessId[];
  practiceIndex: number;
  practiceCompleted: boolean;
  challengeCompleted: boolean;
};
