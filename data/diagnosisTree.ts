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
  | 'counting';

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
        weaknessId: 'g2_integral_basic',
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
};
