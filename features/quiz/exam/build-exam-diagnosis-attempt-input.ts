import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type { LearnerProfile } from '@/features/learner/types';

function createAttemptId(examId: string, problemNumber: number) {
  return `exam-diag-${examId}-p${problemNumber}-${Date.now().toString(36)}`;
}

export function buildExamDiagnosisAttemptInput(params: {
  session: AuthSession;
  profile: LearnerProfile;
  examId: string;
  problemNumber: number;
  topic: string;
  methodId: SolveMethodId;
  weaknessId: WeaknessId;
  startedAt: string;
  completedAt: string;
}): FinalizedAttemptInput {
  const {
    session,
    profile,
    examId,
    problemNumber,
    topic,
    methodId,
    weaknessId,
    startedAt,
    completedAt,
  } = params;

  return {
    attemptId: createAttemptId(examId, problemNumber),
    accountKey: session.accountKey,
    learnerId: profile.learnerId,
    source: 'featured-exam',
    sourceEntityId: examId,
    gradeSnapshot: profile.grade,
    startedAt,
    completedAt,
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: weaknessId,
    topWeaknesses: [weaknessId],
    questions: [
      {
        questionId: `${examId}/${problemNumber}`,
        questionNumber: problemNumber,
        topic,
        selectedIndex: null,
        isCorrect: false,
        finalWeaknessId: weaknessId,
        methodId,
        diagnosisSource: 'manual-selection',
        finalMethodSource: 'manual',
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
      },
    ],
  };
}
