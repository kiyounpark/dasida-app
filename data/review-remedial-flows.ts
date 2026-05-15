import type { WeaknessId } from './diagnosisMap';

export type ExplainNode = {
  id: string;
  kind: 'explain';
  title: string;
  body: string;
  primaryLabel: '다음으로';
  primaryNextNodeId: string;
  secondaryLabel: '모르겠어요';
  secondaryNextNodeId: string;
  // Phase 2 review-router 라우팅 메타데이터 (스펙 §5.1).
  // - summary: 노드가 다루는 학습 요지 한 줄.
  // - triggers: 라우터가 매칭할 사용자 발화 예시.
  // 모두 optional 이며, 채워진 explain 노드만 라우팅 후보로 사용된다.
  summary?: string;
  triggers?: readonly string[];
  /** 이 노드에 도달한 학생에게 매핑되는 약점 신호 (spec §2.1). 진단의 동일 필드와 모양 일치. */
  weaknessId?: WeaknessId;
};

export type CheckNode = {
  id: string;
  kind: 'check';
  title: string;
  prompt: string;
  options: ReadonlyArray<{
    id: string;
    text: string;
    isCorrect: boolean;
    nextNodeId: string;
    /** 이 옵션을 누른 학생에게 매핑되는 약점 신호 (spec §2.1). */
    weaknessId?: WeaknessId;
  }>;
  dontKnowNextNodeId: string;
};

export type ExitNode = {
  id: string;
  kind: 'exit';
};

/**
 * 학생 사유 진단 카드 (deep 보완 흐름 전용, 본 스펙 §0).
 * 정답·오답 개념 없음 — 모든 옵션이 동등하게 다음 노드로 분기.
 */
export type DiagnoseNode = {
  id: string;
  kind: 'diagnose';
  title: string;
  body: string;
  options: ReadonlyArray<{
    id: string;
    text: string;
    nextNodeId: string;
  }>;
};

/**
 * 보완 흐름 정리 카드 (deep 보완 흐름 전용, 본 스펙 §0).
 * "여기까지 왔다"는 성취 신호. nextNodeId 는 보통 exit 노드.
 */
export type SummaryNode = {
  id: string;
  kind: 'summary';
  title: string;
  body: string;
  nextNodeId: string;
};

export type RemedialNode = ExplainNode | CheckNode | ExitNode | DiagnoseNode | SummaryNode;

export type RemedialFlow = {
  nodes: Record<string, RemedialNode>;
};

import { g2_prop_contrapositive_flow } from './remedial-flows/g2_prop_contrapositive';
import { g2_prop_necessary_sufficient_flow } from './remedial-flows/g2_prop_necessary_sufficient';
import { g2_prop_quantifier_flow } from './remedial-flows/g2_prop_quantifier';
import { g2_poly_factoring_flow } from './remedial-flows/g2_poly_factoring';
import { g2_eq_setup_flow } from './remedial-flows/g2_eq_setup';
import { g2_poly_remainder_flow } from './remedial-flows/g2_poly_remainder';
import { formula_understanding_flow } from './remedial-flows/formula_understanding';
import { discriminant_calculation_flow } from './remedial-flows/discriminant_calculation';
import { calc_repeated_error_flow } from './remedial-flows/calc_repeated_error';
import { radical_simplification_error_flow } from './remedial-flows/radical_simplification_error';
import { min_value_read_confusion_flow } from './remedial-flows/min_value_read_confusion';
import { vertex_formula_memorization_flow } from './remedial-flows/vertex_formula_memorization';
import { coefficient_sign_confusion_flow } from './remedial-flows/coefficient_sign_confusion';
import { derivative_calculation_flow } from './remedial-flows/derivative_calculation';
import { factoring_pattern_recall_flow } from './remedial-flows/factoring_pattern_recall';
import { max_min_judgement_confusion_flow } from './remedial-flows/max_min_judgement_confusion';
import { solving_order_confusion_flow } from './remedial-flows/solving_order_confusion';
import { complex_factoring_difficulty_flow } from './remedial-flows/complex_factoring_difficulty';
import { quadratic_formula_memorization_flow } from './remedial-flows/quadratic_formula_memorization';
import { rationalization_error_flow } from './remedial-flows/rationalization_error';
import { expansion_sign_error_flow } from './remedial-flows/expansion_sign_error';
import { like_terms_error_flow } from './remedial-flows/like_terms_error';
import { imaginary_unit_confusion_flow } from './remedial-flows/imaginary_unit_confusion';
import { remainder_substitution_error_flow } from './remedial-flows/remainder_substitution_error';
import { simultaneous_equation_error_flow } from './remedial-flows/simultaneous_equation_error';
import { counting_overcounting_flow } from './remedial-flows/counting_overcounting';
import { counting_method_confusion_flow } from './remedial-flows/counting_method_confusion';
import { g3_diff_flow } from './remedial-flows/g3_diff';
import { g3_sequence_flow } from './remedial-flows/g3_sequence';
import { g3_log_exp_flow } from './remedial-flows/g3_log_exp';
import { g3_integral_flow } from './remedial-flows/g3_integral';
import { g3_trig_flow } from './remedial-flows/g3_trig';
import { g3_conic_flow } from './remedial-flows/g3_conic';
import { g3_limit_flow } from './remedial-flows/g3_limit';
import { g3_counting_flow } from './remedial-flows/g3_counting';
import { g3_probability_flow } from './remedial-flows/g3_probability';
import { g3_statistics_flow } from './remedial-flows/g3_statistics';
import { g2_set_operation_flow } from './remedial-flows/g2_set_operation';
import { g2_set_complement_flow } from './remedial-flows/g2_set_complement';
import { g2_set_count_flow } from './remedial-flows/g2_set_count';
import { g2_trig_unit_circle_flow } from './remedial-flows/g2_trig_unit_circle';
import { g2_trig_equation_range_flow } from './remedial-flows/g2_trig_equation_range';
import { g2_trig_identity_flow } from './remedial-flows/g2_trig_identity';
import { g2_radical_simplify_flow } from './remedial-flows/g2_radical_simplify';
import { g2_radical_rationalize_flow } from './remedial-flows/g2_radical_rationalize';
import { g2_diff_application_flow } from './remedial-flows/g2_diff_application';
import { g2_integral_basic_flow } from './remedial-flows/g2_integral_basic';
import { g2_integral_definite_flow } from './remedial-flows/g2_integral_definite';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
  discriminant_calculation: discriminant_calculation_flow,
  calc_repeated_error: calc_repeated_error_flow,
  radical_simplification_error: radical_simplification_error_flow,
  min_value_read_confusion: min_value_read_confusion_flow,
  vertex_formula_memorization: vertex_formula_memorization_flow,
  coefficient_sign_confusion: coefficient_sign_confusion_flow,
  derivative_calculation: derivative_calculation_flow,
  factoring_pattern_recall: factoring_pattern_recall_flow,
  max_min_judgement_confusion: max_min_judgement_confusion_flow,
  solving_order_confusion: solving_order_confusion_flow,
  complex_factoring_difficulty: complex_factoring_difficulty_flow,
  quadratic_formula_memorization: quadratic_formula_memorization_flow,
  rationalization_error: rationalization_error_flow,
  expansion_sign_error: expansion_sign_error_flow,
  like_terms_error: like_terms_error_flow,
  imaginary_unit_confusion: imaginary_unit_confusion_flow,
  remainder_substitution_error: remainder_substitution_error_flow,
  simultaneous_equation_error: simultaneous_equation_error_flow,
  counting_overcounting: counting_overcounting_flow,
  counting_method_confusion: counting_method_confusion_flow,
  g3_diff: g3_diff_flow,
  g3_sequence: g3_sequence_flow,
  g3_log_exp: g3_log_exp_flow,
  g3_integral: g3_integral_flow,
  g3_trig: g3_trig_flow,
  g3_conic: g3_conic_flow,
  g3_limit: g3_limit_flow,
  g3_counting: g3_counting_flow,
  g3_probability: g3_probability_flow,
  g3_statistics: g3_statistics_flow,
  g2_set_operation: g2_set_operation_flow,
  g2_set_complement: g2_set_complement_flow,
  g2_set_count: g2_set_count_flow,
  g2_trig_unit_circle: g2_trig_unit_circle_flow,
  g2_trig_equation_range: g2_trig_equation_range_flow,
  g2_trig_identity: g2_trig_identity_flow,
  g2_prop_contrapositive: g2_prop_contrapositive_flow,
  g2_prop_necessary_sufficient: g2_prop_necessary_sufficient_flow,
  g2_prop_quantifier: g2_prop_quantifier_flow,
  g2_poly_factoring: g2_poly_factoring_flow,
  g2_eq_setup: g2_eq_setup_flow,
  g2_poly_remainder: g2_poly_remainder_flow,
  g2_radical_simplify: g2_radical_simplify_flow,
  g2_radical_rationalize: g2_radical_rationalize_flow,
  g2_diff_application: g2_diff_application_flow,
  g2_integral_basic: g2_integral_basic_flow,
  g2_integral_definite: g2_integral_definite_flow,
};

export function getRemedialNode(
  weaknessId: WeaknessId,
  nodeId: string,
): RemedialNode | undefined {
  return remedialFlows[weaknessId]?.nodes[nodeId];
}
