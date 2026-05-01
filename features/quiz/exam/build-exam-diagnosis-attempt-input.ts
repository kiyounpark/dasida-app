import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { AuthSession } from '@/features/auth/types';
import type { FinalizedAttemptInput } from '@/features/learning/history-repository';
import type { LearnerProfile } from '@/features/learner/types';

export const EXAM_DIAG_ATTEMPT_PREFIX = 'exam-diag-';

function createAttemptId(examId: string, problemNumber: number) {
  return `${EXAM_DIAG_ATTEMPT_PREFIX}${examId}-p${problemNumber}-${Date.now().toString(36)}`;
}

/**
 * @deprecated 2026-05-02부터 호출되지 않음. per-problem attempt 생성은
 * sync point #1~#4(회차 단위 갱신)와 redundant이므로 use-exam-diagnosis에서
 * 호출이 제거되었다. `EXAM_DIAG_ATTEMPT_PREFIX` 상수는 legacy 데이터 차폐
 * 필터(`features/learner/filter-legacy-per-problem-attempts.ts`)에서 사용 중.
 *
 * 함수 자체는 future re-introduction 또는 historical reference를 위해 retain.
 * 새 코드에서 호출하지 말 것.
 */
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
        questionId: `${examId}-${problemNumber}`,
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
