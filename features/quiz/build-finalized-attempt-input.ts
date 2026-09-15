import type { WeaknessId } from '@/data/diagnosisMap';
import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type { ReviewStage } from '@/features/learning/history-types';
import type { LearnerProfile } from '@/features/learner/types';

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
