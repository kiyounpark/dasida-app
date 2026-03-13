import { problemData } from '@/data/problemData';
import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
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
