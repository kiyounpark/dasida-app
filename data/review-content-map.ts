import { diagnosisMap, type WeaknessId } from './diagnosisMap';

type ReviewContent = {
  heroPrompt: string;
};

const reviewContentMap: Partial<Record<WeaknessId, ReviewContent>> = {
  formula_understanding: {
    heroPrompt: '완전제곱식으로 바꿀 때 왜 x 계수의 절반을 제곱해야 하는지 기억나나요?',
  },
  calc_repeated_error: {
    heroPrompt: '대입 계산에서 음수 구간을 따로 끊어 보는 순서, 아직 떠오르나요?',
  },
  min_value_read_confusion: {
    heroPrompt: '(x-a)^2+b 꼴에서 최솟값과 그 값을 갖는 x를 어떻게 나눠서 읽었는지 기억나나요?',
  },
  vertex_formula_memorization: {
    heroPrompt: '꼭짓점 x좌표를 구할 때 -b를 먼저 읽고 2a로 나누는 순서가 떠오르나요?',
  },
  coefficient_sign_confusion: {
    heroPrompt: 'ax^2+bx+c로 다시 쓸 때 계수를 부호까지 포함해 읽는 기준이 기억나나요?',
  },
  derivative_calculation: {
    heroPrompt: 'x^n을 미분할 때 지수는 앞으로, 지수는 하나 감소한다는 규칙이 떠오르나요?',
  },
  solving_order_confusion: {
    heroPrompt: "f'(x)=0으로 x를 구한 뒤 원함수에 대입하는 순서, 다시 떠올릴 수 있나요?",
  },
  max_min_judgement_confusion: {
    heroPrompt: 'a의 부호를 보고 최댓값인지 최솟값인지 먼저 판단하는 기준이 기억나나요?',
  },
  basic_concept_needed: {
    heroPrompt: '완전제곱식에서 값과 위치를 나눠 보는 기본 해석부터 다시 떠올려볼까요?',
  },
  factoring_pattern_recall: {
    heroPrompt: '곱과 합을 동시에 보며 인수분해 두 수를 찾는 기준이 기억나나요?',
  },
  complex_factoring_difficulty: {
    heroPrompt: '공통부분을 먼저 묶거나 치환해서 단순화하는 출발점이 떠오르나요?',
  },
  quadratic_formula_memorization: {
    heroPrompt: '근의 공식을 쓰기 전에 a, b, c를 부호 포함으로 확인하는 순서가 기억나나요?',
  },
  discriminant_calculation: {
    heroPrompt: '판별식은 b^2와 4ac를 따로 계산한 뒤 빼야 한다는 흐름이 떠오르나요?',
  },
  radical_simplification_error: {
    heroPrompt: '근호 안 수를 소인수분해하고 제곱 묶음을 밖으로 꺼내는 기준이 기억나나요?',
  },
  rationalization_error: {
    heroPrompt: '분모 유리화에서 같은 근호를 분자와 분모에 함께 곱하는 이유가 떠오르나요?',
  },
  expansion_sign_error: {
    heroPrompt: '괄호 앞 음수는 첫 항이 아니라 괄호 전체에 분배된다는 기준이 기억나나요?',
  },
  like_terms_error: {
    heroPrompt: '전개 뒤에는 차수별로 묶어서 합산해야 한다는 순서가 아직 떠오르나요?',
  },
  imaginary_unit_confusion: {
    heroPrompt: 'i^2가 보이면 바로 -1로 바꿔 쓰는 습관, 다시 떠올릴 수 있나요?',
  },
  complex_calc_error: {
    heroPrompt: '복소수 계산은 전개 뒤 실수부와 허수부를 따로 모아 정리하는 흐름이 기억나나요?',
  },
  remainder_substitution_error: {
    heroPrompt: '나머지정리에서는 x-a=0에서 a를 먼저 구해 P(a)에 넣는다는 기준이 떠오르나요?',
  },
  simultaneous_equation_error: {
    heroPrompt: '조건을 식 두 개로 먼저 정리하고 연립으로 푸는 시작점이 기억나나요?',
  },
  counting_method_confusion: {
    heroPrompt: '경우의 수는 먼저 순서가 중요한지부터 확인해야 한다는 기준이 떠오르나요?',
  },
  counting_overcounting: {
    heroPrompt: '경우를 셀 때 중복을 막으려면 직접 나열하거나 표로 확인해야 한다는 흐름이 기억나나요?',
  },
};

export function getReviewHeroPrompt(weaknessId: WeaknessId) {
  return reviewContentMap[weaknessId]?.heroPrompt ?? diagnosisMap[weaknessId].tip;
}
