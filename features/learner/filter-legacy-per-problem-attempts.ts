import type { LearningAttempt } from '@/features/learning/types';
import { EXAM_DIAG_ATTEMPT_PREFIX } from '@/features/quiz/exam/build-exam-diagnosis-attempt-input';

/**
 * `featured-exam` source 쿼리 결과에서 legacy per-problem 진단 attempt
 * (`exam-diag-` prefix)를 제외한다.
 *
 * 2026-05-02 이전 코드가 약점 선택 시 redundant per-problem record를 생성했고,
 * 이미 쌓인 데이터는 client에서 영구 차폐한다. 새 record는 더 이상 생성되지 않는다
 * (Option B에서 `recordAttempt` 호출 제거).
 *
 * 입력 순서를 그대로 유지하며 limit/slice는 호출자가 책임진다.
 */
export function filterLegacyPerProblemAttempts(
  attempts: LearningAttempt[],
): LearningAttempt[] {
  return attempts.filter((a) => !a.id.startsWith(EXAM_DIAG_ATTEMPT_PREFIX));
}
