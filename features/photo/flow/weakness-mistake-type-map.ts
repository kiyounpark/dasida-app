import { diagnosisTree, type SolveMethodId } from '@/data/diagnosisTree';
import type { WeaknessId } from '@/data/diagnosisMap';

import type { MistakeTypeId } from '../types';

/**
 * 통역표 — 약점 59개에 실수 유형 6개 중 하나를 붙인 것.
 *
 * 원본은 `docs/weakness-type-map/05-final.md` (2026.08.02 확정, 검증 3회 · 반박 16→6→1).
 * 이 파일은 그 표를 손이 아니라 기계로 옮긴 것이고, 문서가 여전히 정본이다.
 * 태그를 바꿀 일이 생기면 문서를 먼저 고치고 여기를 맞춘다.
 *
 * 쓰는 자리: 사진 flow가 (풀이법, 실수 유형)을 내놓으면 그 풀이법에 달린 약점들 중
 * 태그가 같은 것을 골라낸다 (문서 ④). 학생이 직접 선택지를 고르는 진단 flow는 이 표를 안 쓴다.
 *
 * Record<WeaknessId, …>라서 약점이 늘거나 줄면 컴파일이 깨진다 — 그게 목적이다.
 */
export const weaknessMistakeType: Record<WeaknessId, MistakeTypeId> = {
  formula_understanding: 'concept_gap', // 공식 이해 부족
  calc_repeated_error: 'calc_slip', // 계산 실수 반복
  min_value_read_confusion: 'answer_read', // 최솟값 읽기 혼동
  vertex_formula_memorization: 'formula_recall', // 공식 암기 부족
  coefficient_sign_confusion: 'setup_error', // 계수 구분 혼동
  derivative_calculation: 'formula_recall', // 미분 계산 부족
  solving_order_confusion: 'procedure_miss', // 풀이 순서 혼동
  // ⚠️ 아래 둘은 태그는 맞는데 diagnosisMap의 desc·tip이 딴 얘기를 한다 (문서 ②).
  // max_min: 미분에서 막힌 학생에게 이차함수 처방 — diff+concept_gap의 유일 후보라 피할 길이 없다.
  // basic_concept: 경우의 수에서 막힌 학생에게 완전제곱식 처방.
  // 고칠 자리는 이 표가 아니라 diagnosisMap의 문구다. 저장을 붙이기 전에 손봐야 한다.
  max_min_judgement_confusion: 'concept_gap', // 최댓값/최솟값 판단 혼동
  basic_concept_needed: 'concept_gap', // 기초 개념 학습 필요
  factoring_pattern_recall: 'formula_recall', // 인수분해 패턴 암기 부족
  complex_factoring_difficulty: 'concept_gap', // 복잡한 식 인수분해 어려움
  quadratic_formula_memorization: 'formula_recall', // 근의공식 암기 부족
  discriminant_calculation: 'calc_slip', // 판별식 계산 실수
  radical_simplification_error: 'calc_slip', // √ 간소화 실수
  rationalization_error: 'calc_slip', // 분모 유리화 실수
  expansion_sign_error: 'calc_slip', // 전개 부호 실수
  like_terms_error: 'calc_slip', // 동류항 정리 실수
  imaginary_unit_confusion: 'formula_recall', // i² = -1 혼동
  complex_calc_error: 'calc_slip', // 복소수 실수부/허수부 정리 실수
  remainder_substitution_error: 'calc_slip', // 나머지정리 대입 실수
  simultaneous_equation_error: 'setup_error', // 연립방정식 설정 실수
  counting_method_confusion: 'concept_gap', // 경우의 수 방법 혼동
  counting_overcounting: 'procedure_miss', // 중복 처리 실수
  g2_set_operation: 'calc_slip', // 집합 연산 오류
  g2_set_complement: 'concept_gap', // 여집합 범위 혼동
  g2_set_count: 'procedure_miss', // 원소 개수 계산 오류
  g2_prop_contrapositive: 'concept_gap', // 역·이·대우 혼동
  g2_prop_necessary_sufficient: 'concept_gap', // 필요충분조건 오류
  g2_prop_quantifier: 'concept_gap', // 전칭·존재 명제 혼동
  g2_trig_unit_circle: 'concept_gap', // 단위원 좌표 혼동
  g2_trig_equation_range: 'answer_read', // 삼각방정식 범위 오류 (문서 🌙 — 08.02 밤 판정)
  g2_trig_identity: 'formula_recall', // 삼각함수 항등식 오류
  g2_poly_factoring: 'formula_recall', // 인수분해 패턴 누락
  g2_poly_remainder: 'concept_gap', // 나머지정리 적용 오류
  g2_eq_setup: 'setup_error', // 방정식 세우기·순서 오류
  // 학생 문장 없이 desc·tip만 보고 정한 태그 두 개 (문서 ③, PR #47에서 진단 선택지 삭제).
  // 지금은 diagnosisTree에 안 달려 있어서 후보로 안 나오는데, 그건 코드가 막는 게 아니라
  // 데이터가 우연히 막는 것이다. 선택지를 되살리면 사진 flow가 조용히 신규 부착을 시작한다.
  g2_radical_simplify: 'formula_recall', // 무리식 간소화 오류 (근거 얇음 · v2에서 계산→공식으로 뒤집힘)
  g2_radical_rationalize: 'calc_slip', // 유리화 계산 오류
  g2_diff_application: 'procedure_miss', // 미분 활용 오류
  g2_integral_basic: 'formula_recall', // 부정적분 공식 오류
  g2_integral_definite: 'calc_slip', // 정적분 끝값 대입 오류
  g2_counting_method: 'concept_gap', // 경우의 수 방법 선택 오류 (근거 얇음 — 위 ③과 같은 짝)
  g2_counting_overcounting: 'formula_recall', // 중복 계산 오류
  g2_inequality_range: 'concept_gap', // 이차부등식 범위 오류
  g2_function_domain: 'concept_gap', // 정의역·치역 혼동
  g3_diff: 'formula_recall', // 미분 계산
  g3_sequence: 'formula_recall', // 수열 계산
  g3_log_exp: 'formula_recall', // 지수·로그 계산
  g3_log_exp_base: 'formula_recall', // 지수법칙·밑 통일 오류
  g3_integral: 'concept_gap', // 적분 계산
  g3_trig: 'formula_recall', // 삼각함수 계산
  g3_limit: 'concept_gap', // 극한 계산
  g3_conic: 'formula_recall', // 이차곡선
  g3_counting: 'concept_gap', // 경우의 수·순열·조합
  g3_probability: 'formula_recall', // 확률 계산
  g3_statistics: 'formula_recall', // 통계 (정규분포·이항분포)
  g3_vector: 'formula_recall', // 벡터 연산
  g3_space_geometry: 'formula_recall', // 공간도형·정사영
  g1_geometry: 'concept_gap', // 평면기하
  g3_function: 'concept_gap', // 함수 분석
};

/**
 * 처방이 두루뭉술해서 뒷순위로 미는 약점 둘.
 *
 * 기윤 판정 (2026.08.11) — 근거는 새로 만든 게 아니라 08.08에 이미 잠근 규칙이다:
 * 커밋 a76a9db "fix 뒤칸에 마음가짐 문구 금지 (손으로 할 동작만)".
 * 그 근거였던 08.07 오르비 조사(현월 칼럼[2] · 조회 5,732)가 이렇게 적고 있다 —
 * "'정신 차리자', '똑바로 읽자', '반드시 한 번 더 보자'는 실수 노트에서 피해야 한다".
 *
 * 이 둘의 tip이 정확히 그 문구다 ("마지막 한 줄을 반드시 다시 확인하세요").
 * 구체적인 약점만 학생이 손으로 할 동작을 준다. 그래서 구체적인 게 있으면 이 둘은 안 고른다.
 */
const VAGUE_WEAKNESSES: readonly WeaknessId[] = ['calc_repeated_error', 'basic_concept_needed'];

/**
 * (풀이법, 실수 유형) → 후보 약점들.
 *
 * 55개 조합 중 49개는 하나로 좁혀지고, 6개가 여럿으로 남는다:
 * 무리수+계산(3) · 명제+개념(3) · 다항식+계산(2) · 미분+절차(2) · 부등식·함수+개념(2) ·
 * 지수·로그+공식(2, g3_log_exp / g3_log_exp_base).
 *
 * 🔒 남는 자리 처리 = **학생한테 물어본다** (기윤 판정 2026.08.11).
 * 남은 후보들은 전부 "같은 풀이의 다른 순간"이라(전개 중 vs 정리 중) 기계가 못 가른다.
 * 틀린 약점을 저장하면 그 뒤 복습이 통째로 헛도는데, 말풍선 한 번이 그것보다 싸다.
 * 55개 중 5개에서만 뜨니 귀찮음 축도 거의 안 건드린다.
 *
 * 그래서 여기서는 고르지 않고 남은 후보를 그대로 돌려준다.
 * 물어보는 말풍선은 저장 경로를 붙일 때 만든다 — 지금은 부를 사람이 없다.
 */
export function weaknessCandidatesFor(
  methodId: SolveMethodId,
  mistakeType: MistakeTypeId,
): WeaknessId[] {
  const choices = diagnosisTree[methodId]?.choices ?? [];
  const seen = new Set<WeaknessId>();
  const candidates: WeaknessId[] = [];

  for (const choice of choices) {
    // 같은 약점이 한 풀이법 안에 두 번 달린 경우가 있어 중복을 걷는다
    if (seen.has(choice.weaknessId)) continue;
    if (weaknessMistakeType[choice.weaknessId] !== mistakeType) continue;
    seen.add(choice.weaknessId);
    candidates.push(choice.weaknessId);
  }

  // 두루뭉술한 것뿐이면 그거라도 준다 — 여기서 비우면 막다른 길이 된다
  const specific = candidates.filter((id) => !VAGUE_WEAKNESSES.includes(id));
  return specific.length > 0 ? specific : candidates;
}
