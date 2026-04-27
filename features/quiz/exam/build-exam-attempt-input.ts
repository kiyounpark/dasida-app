import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type { LearnerProfile } from '@/features/learner/types';

import { computeExamTopWeaknesses } from './compute-exam-top-weaknesses';
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';
import type { ExamResultSummary } from './types';

export function buildExamAttemptInput(params: {
  session: AuthSession;
  profile: LearnerProfile;
  result: ExamResultSummary;
}): FinalizedAttemptInput {
  const { profile, result, session } = params;

  return {
    attemptId: result.attemptId,
    accountKey: session.accountKey,
    learnerId: profile.learnerId,
    source: 'featured-exam',
    sourceEntityId: result.examId,
    gradeSnapshot: profile.grade,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    questionCount: result.total,
    correctCount: result.correct,
    wrongCount: result.wrong + result.unanswered,
    accuracy: result.accuracy,
    primaryWeaknessId: null,
    topWeaknesses: [],
    questions: result.perProblem.map((p) => ({
      questionId: `${result.examId}/${p.number}`,
      questionNumber: p.number,
      topic: 'exam',
      selectedIndex: p.userAnswer,
      isCorrect: p.isCorrect,
      finalWeaknessId: null,
      methodId: null,
      diagnosisSource: null,
      finalMethodSource: null,
      diagnosisCompleted: false,
      usedDontKnow: false,
      usedAiHelp: false,
    })),
  };
}

export function buildExamAttemptInputWithDiagnosis(params: {
  session: AuthSession;
  profile: LearnerProfile;
  result: ExamResultSummary;
  diagnosedProblems: ExamDiagnosisProgress;
}): FinalizedAttemptInput {
  const { session, profile, result, diagnosedProblems } = params;
  const topWeaknesses = computeExamTopWeaknesses(diagnosedProblems);
  const base = buildExamAttemptInput({ session, profile, result });

  return {
    ...base,
    primaryWeaknessId: topWeaknesses[0] ?? null,
    topWeaknesses,
    questions: base.questions.map((q) => {
      const weaknessId = diagnosedProblems[q.questionNumber] ?? null;
      return {
        ...q,
        finalWeaknessId: weaknessId,
        diagnosisCompleted: weaknessId !== null,
      };
    }),
  };
}
