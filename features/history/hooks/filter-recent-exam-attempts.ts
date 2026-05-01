import type { LearningAttempt } from '@/features/learning/types';
import { EXAM_DIAG_ATTEMPT_PREFIX } from '@/features/quiz/exam/build-exam-diagnosis-attempt-input';

/**
 * `recentExamAttempts` 목록에서 per-problem 진단 attempt(`exam-diag-` prefix)를 제외하고
 * 상한 `take`개만 남긴다. Firestore 쿼리에서 source가 같아 섞여 들어오기 때문에
 * 클라이언트에서 한 번 더 시맨틱 필터를 적용한다.
 *
 * 입력 순서를 그대로 유지하므로 호출자가 정렬을 책임진다.
 */
export function filterRecentExamAttempts(
  attempts: LearningAttempt[],
  take: number,
): LearningAttempt[] {
  return attempts
    .filter((a) => !a.id.startsWith(EXAM_DIAG_ATTEMPT_PREFIX))
    .slice(0, take);
}
