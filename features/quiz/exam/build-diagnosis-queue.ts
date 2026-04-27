import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

/**
 * 모의고사 결과 화면에서 진단 세션에 전달할 큐를 만든다.
 *
 * 동작:
 * - 이미 진단 완료된 문제는 제외 (allWrong - progress)
 * - 클릭한 문제를 큐의 첫 자리에 둔다
 * - 나머지 미진단 문제는 allWrong의 원래 순서를 유지한다
 *
 * 방어:
 * - 클릭한 문제가 이미 진단 완료됐거나 allWrong에 없으면 빈 배열을 반환한다.
 *   호출 측에서 빈 배열일 때 네비게이션을 막아야 한다.
 */
export function buildDiagnosisQueue(
  allWrong: number[],
  progress: ExamDiagnosisProgress,
  clickedProblemNumber: number,
): number[] {
  // `in` 연산자는 좌변을 string으로 강제 변환하므로 AsyncStorage JSON.parse 결과의 string 키도 안전하게 처리된다.
  const undone = allWrong.filter((n) => !(n in progress));
  if (!undone.includes(clickedProblemNumber)) return [];
  return [clickedProblemNumber, ...undone.filter((n) => n !== clickedProblemNumber)];
}
