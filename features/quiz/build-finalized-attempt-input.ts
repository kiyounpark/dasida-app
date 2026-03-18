import { problemData } from '@/data/problemData';
import type { WeaknessId } from '@/data/diagnosisMap';
import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type { ReviewStage } from '@/features/learning/history-types';
import type { LearnerProfile } from '@/features/learner/types';

import type { QuizAnswer, QuizResultSummary } from './types';

const problemById = new Map(
  problemData.map((problem, index) => [
    problem.id,
    {
      topic: problem.topic,
      questionNumber: index + 1,
    },
  ]),
);

export function buildDiagnosticAttemptInput(params: {
  session: AuthSession;
  profile: LearnerProfile;
  answers: QuizAnswer[];
  result: QuizResultSummary;
}): FinalizedAttemptInput {
  const { answers, profile, result, session } = params;

  return {
    attemptId: result.attemptId,
    accountKey: session.accountKey,
    learnerId: profile.learnerId,
    source: 'diagnostic',
    sourceEntityId: null,
    gradeSnapshot: profile.grade,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    questionCount: result.total,
    correctCount: result.correct,
    wrongCount: result.wrong,
    accuracy: result.accuracy,
    primaryWeaknessId: result.topWeaknesses[0] ?? null,
    topWeaknesses: result.topWeaknesses,
    questions: answers.map((answer, index) => {
      const problem = problemById.get(answer.problemId);
      const finalWeaknessId = answer.weaknessId ?? answer.diagnosisDetailTrace?.finalWeaknessId ?? null;
      const diagnosisSource = answer.diagnosisRouting?.source ?? null;
      const finalMethodSource = answer.diagnosisRouting?.finalMethodSource ?? null;

      return {
        questionId: answer.problemId,
        questionNumber: problem?.questionNumber ?? index + 1,
        topic: problem?.topic ?? 'unknown',
        selectedIndex: answer.selectedIndex ?? null,
        isCorrect: answer.isCorrect,
        finalWeaknessId,
        methodId: answer.methodId ?? answer.diagnosisDetailTrace?.methodId ?? null,
        diagnosisSource,
        finalMethodSource,
        diagnosisCompleted: answer.isCorrect ? true : finalWeaknessId !== null,
        usedDontKnow: answer.diagnosisDetailTrace?.usedDontKnow ?? false,
        usedAiHelp: answer.diagnosisDetailTrace?.usedAiHelp ?? false,
      };
    }),
  };
}

function createWeaknessPracticeAttemptId(problemId: string, weaknessId: WeaknessId, startedAt: string) {
  const startedAtKey = startedAt.replace(/[^\d]/g, '');
  return `weakness-practice-${weaknessId}-${problemId}-${startedAtKey}`;
}

export function buildWeaknessPracticeAttemptInput(params: {
  session: AuthSession;
  profile: LearnerProfile;
  weaknessId: WeaknessId;
  weaknessLabel: string;
  problemId: string;
  startedAt: string;
  completedAt: string;
  firstSelectedIndex: number | null;
  finalSelectedIndex: number | null;
  wrongAttempts: number;
  resolvedBy: 'solved' | 'answer_revealed';
  reviewContext?: {
    reviewTaskId: string;
    reviewStage: ReviewStage;
  };
}): FinalizedAttemptInput {
  const {
    completedAt,
    finalSelectedIndex,
    firstSelectedIndex,
    problemId,
    profile,
    resolvedBy,
    reviewContext,
    session,
    startedAt,
    weaknessId,
    weaknessLabel,
    wrongAttempts,
  } = params;

  const isCorrect = resolvedBy === 'solved';

  return {
    attemptId: createWeaknessPracticeAttemptId(problemId, weaknessId, startedAt),
    accountKey: session.accountKey,
    learnerId: profile.learnerId,
    source: 'weakness-practice',
    sourceEntityId: weaknessId,
    gradeSnapshot: profile.grade,
    startedAt,
    completedAt,
    questionCount: 1,
    correctCount: isCorrect ? 1 : 0,
    wrongCount: isCorrect ? 0 : 1,
    accuracy: isCorrect ? 100 : 0,
    primaryWeaknessId: weaknessId,
    topWeaknesses: [weaknessId],
    reviewContext,
    questions: [
      {
        questionId: problemId,
        questionNumber: 1,
        topic: weaknessLabel,
        firstSelectedIndex,
        selectedIndex: finalSelectedIndex,
        isCorrect,
        finalWeaknessId: weaknessId,
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
        wrongAttempts,
        usedCoaching: wrongAttempts > 0,
        resolvedBy,
      },
    ],
  };
}
