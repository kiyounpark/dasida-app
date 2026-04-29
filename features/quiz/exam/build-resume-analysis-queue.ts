import type { DiagnosedNote } from './exam-analysis-in-progress';

/**
 * 홈 "이어서 분석하기" 진입 시 진단 세션에 전달할 큐를 만든다.
 *
 * 동작:
 * - 미진단 문제만 원래 번호 순서(wrongProblemNumbers의 순서)대로 추출.
 * - 진단 순서와 무관하게 일관된 결과를 반환 (비순차 진단 시에도 안전).
 *
 * `buildDiagnosisQueue`와 차이점:
 * - 클릭한 문제를 첫 자리로 옮기지 않음 (재개 시 항상 첫 미진단 문제부터).
 */
export function buildResumeAnalysisQueue(
  wrongProblemNumbers: number[],
  diagnosedNotes: DiagnosedNote[],
): number[] {
  const diagnosedSet = new Set(diagnosedNotes.map((n) => n.problemNumber));
  return wrongProblemNumbers.filter((n) => !diagnosedSet.has(n));
}
