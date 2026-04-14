import type { WeaknessId } from './diagnosisMap';

export type SolveMethodId =
  | 'cps'
  | 'vertex'
  | 'diff'
  | 'unknown'
  | 'factoring'
  | 'quadratic'
  | 'radical'
  | 'polynomial'
  | 'complex_number'
  | 'remainder_theorem'
  | 'set'
  | 'proposition'
  | 'trig'
  | 'integral'
  | 'linear_eq'
  | 'counting'
  | 'sequence'
  | 'log_exp'
  | 'conic'
  | 'limit'
  | 'vector'
  | 'probability'
  | 'space_geometry'
  | 'function'
  | 'statistics'
  | 'geometry'
  | 'permutation'
  | 'sequence_limit'
  | 'integral_advanced'
  | 'diff_advanced';

export type MethodOption = {
  id: SolveMethodId;
  labelKo: string;
};

export type DiagnosisSubChoice = {
  id: string;
  text: string;
  weaknessId: WeaknessId;
};

export type DiagnosisMethodStep = {
  methodId: SolveMethodId;
  prompt: string;
  choices: DiagnosisSubChoice[];
};

export const methodOptions: MethodOption[] = [
  { id: 'cps', labelKo: '완전제곱식' },
  { id: 'vertex', labelKo: '꼭짓점 공식' },
  { id: 'diff', labelKo: '미분' },
  { id: 'factoring', labelKo: '인수분해' },
  { id: 'quadratic', labelKo: '근의 공식' },
  { id: 'radical', labelKo: '무리수 계산' },
  { id: 'polynomial', labelKo: '다항식 전개' },
  { id: 'complex_number', labelKo: '복소수 계산' },
  { id: 'remainder_theorem', labelKo: '나머지정리' },
  { id: 'counting', labelKo: '경우의 수' },
  { id: 'set', labelKo: '집합 연산' },
  { id: 'proposition', labelKo: '명제 판별' },
  { id: 'trig', labelKo: '삼각함수' },
  { id: 'integral', labelKo: '적분' },
  { id: 'linear_eq', labelKo: '부등식·함수' },
  { id: 'sequence', labelKo: '수열' },
  { id: 'log_exp', labelKo: '지수·로그' },
  { id: 'conic', labelKo: '이차곡선' },
  { id: 'limit', labelKo: '극한' },
  { id: 'vector', labelKo: '벡터' },
  { id: 'probability', labelKo: '확률' },
  { id: 'space_geometry', labelKo: '공간기하' },
  { id: 'function', labelKo: '함수' },
  { id: 'statistics', labelKo: '통계' },
  { id: 'geometry', labelKo: '도형' },
  { id: 'permutation', labelKo: '순열·조합' },
  { id: 'sequence_limit', labelKo: '수열의 극한' },
  { id: 'integral_advanced', labelKo: '심화 적분' },
  { id: 'diff_advanced', labelKo: '심화 미분' },
  { id: 'unknown', labelKo: '잘 모르겠어' },
];

export const diagnosisTree: Record<SolveMethodId, DiagnosisMethodStep> = {
  cps: {
    methodId: 'cps',
    prompt: '완전제곱식 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'cps_formula',
        text: '4를 더하고 빼는 완전제곱식 원리가 헷갈렸어요.',
        weaknessId: 'formula_understanding',
      },
      {
        id: 'cps_calc',
        text: '식 변형은 했지만 계산에서 실수했어요.',
        weaknessId: 'calc_repeated_error',
      },
      {
        id: 'cps_read',
        text: '완성 후 최솟값 읽는 단계가 헷갈렸어요.',
        weaknessId: 'min_value_read_confusion',
      },
    ],
  },
  vertex: {
    methodId: 'vertex',
    prompt: '꼭짓점 공식 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'vertex_formula',
        text: '-b/2a 공식 적용이 헷갈렸어요.',
        weaknessId: 'vertex_formula_memorization',
      },
      {
        id: 'vertex_sub',
        text: 'x를 구한 뒤 f(x) 대입에서 실수했어요.',
        weaknessId: 'calc_repeated_error',
      },
      {
        id: 'vertex_coeff',
        text: 'a, b, c 계수/부호를 읽는 게 헷갈렸어요.',
        weaknessId: 'coefficient_sign_confusion',
      },
    ],
  },
  diff: {
    methodId: 'diff',
    prompt: '미분 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'diff_rule',
        text: '미분 계산 규칙 적용에서 막혔어요.',
        weaknessId: 'derivative_calculation',
      },
      {
        id: 'diff_order',
        text: "f'(x)=0 이후 풀이 순서가 헷갈렸어요.",
        weaknessId: 'solving_order_confusion',
      },
      {
        id: 'diff_judge',
        text: '최댓값/최솟값 판단이 헷갈렸어요.',
        weaknessId: 'max_min_judgement_confusion',
      },
      {
        id: 'g2_diff_application',
        text: '증감표 작성 후 최댓·최솟값 결정에서 막혔어요.',
        weaknessId: 'g2_diff_application',
      },
    ],
  },
  unknown: {
    methodId: 'unknown',
    prompt: '현재 상태에 가장 가까운 설명을 골라주세요.',
    choices: [
      {
        id: 'unknown_basic',
        text: '풀이 방법 자체를 아직 잘 모르겠어요.',
        weaknessId: 'basic_concept_needed',
      },
      {
        id: 'unknown_calc',
        text: '방향은 알겠는데 계산에서 자주 틀려요.',
        weaknessId: 'calc_repeated_error',
      },
      {
        id: 'unknown_read',
        text: '최솟값/최댓값 해석이 헷갈려요.',
        weaknessId: 'min_value_read_confusion',
      },
    ],
  },
  factoring: {
    methodId: 'factoring',
    prompt: '인수분해 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'factoring_pattern',
        text: '인수분해 공식 패턴을 떠올리기 어려웠어요.',
        weaknessId: 'factoring_pattern_recall',
      },
      {
        id: 'factoring_calc',
        text: '인수분해는 했지만 계산에서 실수했어요.',
        weaknessId: 'calc_repeated_error',
      },
      {
        id: 'factoring_complex',
        text: '복잡한 식을 묶는 게 어려웠어요.',
        weaknessId: 'complex_factoring_difficulty',
      },
    ],
  },
  quadratic: {
    methodId: 'quadratic',
    prompt: '근의 공식 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'quadratic_formula',
        text: '근의 공식 자체가 기억이 안 났어요.',
        weaknessId: 'quadratic_formula_memorization',
      },
      {
        id: 'quadratic_discriminant',
        text: '판별식 계산에서 실수했어요.',
        weaknessId: 'discriminant_calculation',
      },
      {
        id: 'quadratic_simplify',
        text: '근을 구한 뒤 정리에서 틀렸어요.',
        weaknessId: 'calc_repeated_error',
      },
    ],
  },
  radical: {
    methodId: 'radical',
    prompt: '무리수 계산에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'radical_simplify',
        text: '√를 간소화하거나 묶는 단계가 헷갈렸어요.',
        weaknessId: 'radical_simplification_error',
      },
      {
        id: 'radical_rationalize',
        text: '분모 유리화 과정에서 실수했어요.',
        weaknessId: 'rationalization_error',
      },
      {
        id: 'radical_calc',
        text: '변형 후 덧셈/뺄셈에서 계산 실수를 했어요.',
        weaknessId: 'calc_repeated_error',
      },
      {
        id: 'g2_radical_simplify',
        text: '근호 안 수를 간소화하는 단계가 헷갈렸어요.',
        weaknessId: 'g2_radical_simplify',
      },
      {
        id: 'g2_radical_rationalize',
        text: '켤레식으로 유리화하는 계산에서 실수했어요.',
        weaknessId: 'g2_radical_rationalize',
      },
    ],
  },
  polynomial: {
    methodId: 'polynomial',
    prompt: '다항식 전개/정리에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'polynomial_sign',
        text: '전개 과정에서 부호 실수를 했어요.',
        weaknessId: 'expansion_sign_error',
      },
      {
        id: 'polynomial_like_terms',
        text: '동류항을 정리하는 단계에서 틀렸어요.',
        weaknessId: 'like_terms_error',
      },
      {
        id: 'polynomial_calc',
        text: '전개 자체는 했지만 계산에서 실수했어요.',
        weaknessId: 'calc_repeated_error',
      },
      {
        id: 'g2_poly_factoring',
        text: '고차 다항식 인수분해 패턴이 안 떠올랐어요.',
        weaknessId: 'g2_poly_factoring',
      },
      {
        id: 'g2_poly_remainder',
        text: '나머지정리를 어디에 어떻게 쓰는지 헷갈렸어요.',
        weaknessId: 'g2_poly_remainder',
      },
    ],
  },
  complex_number: {
    methodId: 'complex_number',
    prompt: '복소수 계산에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'complex_i_squared',
        text: 'i² = -1 적용이 헷갈렸어요.',
        weaknessId: 'imaginary_unit_confusion',
      },
      {
        id: 'complex_expand',
        text: '전개 후 실수부/허수부 정리에서 실수했어요.',
        weaknessId: 'complex_calc_error',
      },
      {
        id: 'complex_calc',
        text: '계산 자체에서 부호나 곱셈 실수를 했어요.',
        weaknessId: 'calc_repeated_error',
      },
    ],
  },
  remainder_theorem: {
    methodId: 'remainder_theorem',
    prompt: '나머지정리 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'remainder_sub',
        text: '나눗값을 대입하는 단계에서 실수했어요.',
        weaknessId: 'remainder_substitution_error',
      },
      {
        id: 'remainder_system',
        text: '조건 두 개로 연립방정식을 세우는 게 어려웠어요.',
        weaknessId: 'simultaneous_equation_error',
      },
      {
        id: 'remainder_calc',
        text: '풀이 방향은 맞지만 계산에서 실수했어요.',
        weaknessId: 'calc_repeated_error',
      },
    ],
  },
  counting: {
    methodId: 'counting',
    prompt: '경우의 수 풀이에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'counting_method',
        text: '어떤 방법(순열/조합/수형도)을 써야 할지 몰랐어요.',
        weaknessId: 'counting_method_confusion',
      },
      {
        id: 'counting_overcount',
        text: '중복을 제대로 처리하지 못했어요.',
        weaknessId: 'counting_overcounting',
      },
      {
        id: 'counting_basic',
        text: '경우의 수 개념 자체가 아직 부족해요.',
        weaknessId: 'basic_concept_needed',
      },
      {
        id: 'g2_counting_method',
        text: '순열·조합·곱·합 중 어느 방법을 써야 할지 헷갈렸어요.',
        weaknessId: 'g2_counting_method',
      },
      {
        id: 'g2_counting_overcounting',
        text: '겹치는 경우를 중복으로 세거나 빠뜨렸어요.',
        weaknessId: 'g2_counting_overcounting',
      },
    ],
  },
  set: {
    methodId: 'set',
    prompt: '집합 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'set_operation',
        text: '합집합·교집합 계산에서 원소를 잘못 셌어요.',
        weaknessId: 'g2_set_operation',
      },
      {
        id: 'set_complement',
        text: '여집합 범위를 잘못 잡았어요.',
        weaknessId: 'g2_set_complement',
      },
      {
        id: 'set_count',
        text: 'n(A∪B) 공식에서 중복 원소 처리가 헷갈렸어요.',
        weaknessId: 'g2_set_count',
      },
    ],
  },
  proposition: {
    methodId: 'proposition',
    prompt: '명제 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'prop_contrapositive',
        text: '역·이·대우 중 어느 것인지 헷갈렸어요.',
        weaknessId: 'g2_prop_contrapositive',
      },
      {
        id: 'prop_necessary_sufficient',
        text: '필요조건·충분조건 구분이 어려웠어요.',
        weaknessId: 'g2_prop_necessary_sufficient',
      },
      {
        id: 'prop_quantifier',
        text: '"모든"과 "어떤" 명제 판단이 헷갈렸어요.',
        weaknessId: 'g2_prop_quantifier',
      },
    ],
  },
  trig: {
    methodId: 'trig',
    prompt: '삼각함수 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'trig_unit_circle',
        text: '단위원에서 sinθ·cosθ 값을 읽는 게 헷갈렸어요.',
        weaknessId: 'g2_trig_unit_circle',
      },
      {
        id: 'trig_equation_range',
        text: '삼각방정식의 해 범위를 잘못 설정했어요.',
        weaknessId: 'g2_trig_equation_range',
      },
      {
        id: 'trig_identity',
        text: '삼각함수 항등식 적용에서 막혔어요.',
        weaknessId: 'g2_trig_identity',
      },
    ],
  },
  integral: {
    methodId: 'integral',
    prompt: '적분 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'integral_basic',
        text: '부정적분 공식 적용에서 실수했어요.',
        weaknessId: 'g2_integral_basic',
      },
      {
        id: 'integral_definite',
        text: 'F(b)-F(a) 계산에서 끝값 대입을 잘못했어요.',
        weaknessId: 'g2_integral_definite',
      },
      {
        id: 'integral_diff',
        text: '적분보다 미분 활용(최댓·최솟값) 단계에서 막혔어요.',
        weaknessId: 'g2_diff_application',
      },
    ],
  },
  linear_eq: {
    methodId: 'linear_eq',
    prompt: '부등식·함수 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'linear_eq_range',
        text: '이차부등식 해의 범위를 반대로 썼어요.',
        weaknessId: 'g2_inequality_range',
      },
      {
        id: 'linear_eq_domain',
        text: '함수의 정의역·치역 설정이 헷갈렸어요.',
        weaknessId: 'g2_function_domain',
      },
      {
        id: 'linear_eq_setup',
        text: '조건을 방정식·부등식으로 세우는 단계가 막혔어요.',
        weaknessId: 'g2_eq_setup',
      },
    ],
  },
  sequence: {
    methodId: 'sequence',
    prompt: '수열 문제에서 어디가 가장 막혔나요?',
    choices: [
      {
        id: 'seq_general',
        text: '일반항 aₙ 공식(등차·등비)을 어디에 써야 할지 몰랐어요.',
        weaknessId: 'g3_sequence',
      },
      {
        id: 'seq_sum',
        text: '합 Sₙ 공식 적용 방법에서 막혔어요.',
        weaknessId: 'g3_sequence',
      },
      {
        id: 'seq_recurrence',
        text: '점화식을 세우거나 일반항으로 바꾸는 방법이 어려웠어요.',
        weaknessId: 'g3_sequence',
      },
    ],
  },
  log_exp: {
    methodId: 'log_exp',
    prompt: '지수·로그 문제에서 어디서 막혔나요?',
    choices: [
      {
        id: 'log_law',
        text: '로그 성질(덧셈·뺄셈·지수 변환) 적용이 어려웠어요.',
        weaknessId: 'g3_log_exp',
      },
      {
        id: 'exp_law',
        text: '지수 법칙 변환이나 밑 통일이 어려웠어요.',
        weaknessId: 'g3_log_exp',
      },
      {
        id: 'log_eq',
        text: '지수방정식·로그방정식으로 변환해서 푸는 흐름이 헷갈렸어요.',
        weaknessId: 'g3_log_exp',
      },
    ],
  },
  conic: {
    methodId: 'conic',
    prompt: '이차곡선 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'conic_std',
        text: '포물선·타원·쌍곡선 표준형을 어떻게 쓰는지 몰랐어요.',
        weaknessId: 'g3_conic',
      },
      {
        id: 'conic_focus',
        text: '초점이나 점근선 공식이 기억나지 않았어요.',
        weaknessId: 'g3_conic',
      },
      {
        id: 'conic_setup',
        text: '조건을 이차곡선 식으로 세우는 과정이 어려웠어요.',
        weaknessId: 'g3_conic',
      },
    ],
  },
  limit: {
    methodId: 'limit',
    prompt: '극한 문제에서 어디서 막혔나요?',
    choices: [
      {
        id: 'lim_zero',
        text: '0/0 꼴이 나왔을 때 어떻게 처리할지 몰랐어요.',
        weaknessId: 'g3_limit',
      },
      {
        id: 'lim_factor',
        text: '인수분해로 공통인수를 약분하는 과정이 막혔어요.',
        weaknessId: 'g3_limit',
      },
      {
        id: 'lim_inf',
        text: '∞/∞ 꼴에서 최고차항으로 나누는 처리가 어려웠어요.',
        weaknessId: 'g3_limit',
      },
    ],
  },
  vector: {
    methodId: 'vector',
    prompt: '벡터 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'vec_calc',
        text: '두 벡터의 덧셈·뺄셈·크기 계산이 어려웠어요.',
        weaknessId: 'g3_vector',
      },
      {
        id: 'vec_dot',
        text: '내적 계산이나 공식 적용이 막혔어요.',
        weaknessId: 'g3_vector',
      },
      {
        id: 'vec_setup',
        text: '벡터로 도형 조건을 식으로 세우는 과정이 어려웠어요.',
        weaknessId: 'g3_vector',
      },
    ],
  },
  probability: {
    methodId: 'probability',
    prompt: '확률 문제에서 어디가 막혔나요?',
    choices: [
      {
        id: 'prob_conditional',
        text: '조건부확률 P(A|B) 공식 적용이 헷갈렸어요.',
        weaknessId: 'g3_probability',
      },
      {
        id: 'prob_independent',
        text: '독립·종속 사건 판단이나 곱의 법칙이 어려웠어요.',
        weaknessId: 'g3_probability',
      },
      {
        id: 'prob_complement',
        text: '여사건을 활용해 계산하는 방법을 몰랐어요.',
        weaknessId: 'g3_probability',
      },
    ],
  },
  space_geometry: {
    methodId: 'space_geometry',
    prompt: '공간기하 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'sg_projection',
        text: '정사영이나 두 평면이 이루는 각 계산이 어려웠어요.',
        weaknessId: 'g3_space_geometry',
      },
      {
        id: 'sg_relation',
        text: '직선과 평면의 위치 관계 파악이 헷갈렸어요.',
        weaknessId: 'g3_space_geometry',
      },
      {
        id: 'sg_coord',
        text: '공간도형을 좌표로 설정하는 방법이 어려웠어요.',
        weaknessId: 'g3_space_geometry',
      },
    ],
  },
  function: {
    methodId: 'function',
    prompt: '함수 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'fn_inverse',
        text: '역함수나 합성함수를 구하는 방법이 어려웠어요.',
        weaknessId: 'g3_function',
      },
      {
        id: 'fn_condition',
        text: '전사·단사 조건 판단이 헷갈렸어요.',
        weaknessId: 'g3_function',
      },
      {
        id: 'fn_graph',
        text: '그래프에서 조건을 읽어내는 과정이 어려웠어요.',
        weaknessId: 'g3_function',
      },
    ],
  },
  statistics: {
    methodId: 'statistics',
    prompt: '통계 문제에서 어디가 막혔나요?',
    choices: [
      {
        id: 'stat_normalize',
        text: '정규분포 표준화 Z=(X-μ)/σ 과정이 어려웠어요.',
        weaknessId: 'g3_statistics',
      },
      {
        id: 'stat_binomial',
        text: '이항분포 공식(평균 np, 분산 npq) 적용이 막혔어요.',
        weaknessId: 'g3_statistics',
      },
      {
        id: 'stat_table',
        text: '표준정규분포표에서 확률값을 읽는 방법이 헷갈렸어요.',
        weaknessId: 'g3_statistics',
      },
    ],
  },
  geometry: {
    methodId: 'geometry',
    prompt: '도형 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'geo_pythagorean',
        text: '피타고라스 정리를 어떤 삼각형에 적용할지 몰랐어요.',
        weaknessId: 'g1_geometry',
      },
      {
        id: 'geo_auxiliary',
        text: '보조선을 어디에 그어야 할지 몰랐어요.',
        weaknessId: 'g1_geometry',
      },
      {
        id: 'geo_trig',
        text: '삼각비로 변의 길이를 구하는 방법이 어려웠어요.',
        weaknessId: 'g1_geometry',
      },
    ],
  },
  permutation: {
    methodId: 'permutation',
    prompt: '순열·조합 문제에서 어디가 막혔나요?',
    choices: [
      {
        id: 'perm_choice',
        text: '순열과 조합 중 어느 것을 써야 할지 판단이 어려웠어요.',
        weaknessId: 'g3_counting',
      },
      {
        id: 'perm_restrict',
        text: '중복 허용·제한 조건 처리가 어려웠어요.',
        weaknessId: 'g3_counting',
      },
      {
        id: 'perm_special',
        text: '원순열이나 같은 것이 있는 순열 공식이 헷갈렸어요.',
        weaknessId: 'g3_counting',
      },
    ],
  },
  sequence_limit: {
    methodId: 'sequence_limit',
    prompt: '수열의 극한 문제에서 어디가 막혔나요?',
    choices: [
      {
        id: 'sl_converge',
        text: '수열이 수렴하는지 발산하는지 판단이 어려웠어요.',
        weaknessId: 'g3_limit',
      },
      {
        id: 'sl_inf',
        text: '∞/∞ 꼴에서 극한값을 구하는 처리가 막혔어요.',
        weaknessId: 'g3_limit',
      },
      {
        id: 'sl_geom',
        text: '등비수열 극한 조건(|r|<1이면 수렴)이 헷갈렸어요.',
        weaknessId: 'g3_limit',
      },
    ],
  },
  integral_advanced: {
    methodId: 'integral_advanced',
    prompt: '적분 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'ia_substitution',
        text: '치환적분·부분적분을 어디에 써야 할지 몰랐어요.',
        weaknessId: 'g3_integral',
      },
      {
        id: 'ia_area',
        text: '정적분으로 넓이 계산할 때 절댓값 처리가 어려웠어요.',
        weaknessId: 'g3_integral',
      },
      {
        id: 'ia_ftc',
        text: '∫f(t)dt를 미분하는 관계식 활용이 막혔어요.',
        weaknessId: 'g3_integral',
      },
    ],
  },
  diff_advanced: {
    methodId: 'diff_advanced',
    prompt: '미분 문제에서 어디가 어려웠나요?',
    choices: [
      {
        id: 'da_chain',
        text: '합성함수 미분(chain rule) 적용이 어려웠어요.',
        weaknessId: 'g3_diff',
      },
      {
        id: 'da_extremum',
        text: '극값(최댓값·최솟값)을 미분으로 찾는 과정이 막혔어요.',
        weaknessId: 'g3_diff',
      },
      {
        id: 'da_tangent',
        text: '접선의 방정식 구하는 방법이 헷갈렸어요.',
        weaknessId: 'g3_diff',
      },
    ],
  },
};
