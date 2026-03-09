export type WeaknessId =
  | 'formula_understanding'
  | 'calc_repeated_error'
  | 'min_value_read_confusion'
  | 'vertex_formula_memorization'
  | 'coefficient_sign_confusion'
  | 'derivative_calculation'
  | 'solving_order_confusion'
  | 'max_min_judgement_confusion'
  | 'basic_concept_needed'
  | 'factoring_pattern_recall'
  | 'complex_factoring_difficulty'
  | 'quadratic_formula_memorization'
  | 'discriminant_calculation';

export type DiagnosisItem = {
  id: WeaknessId;
  labelKo: string;
  desc: string;
  tip: string;
};

export const weaknessOrder: WeaknessId[] = [
  'formula_understanding',
  'calc_repeated_error',
  'min_value_read_confusion',
  'vertex_formula_memorization',
  'coefficient_sign_confusion',
  'derivative_calculation',
  'solving_order_confusion',
  'max_min_judgement_confusion',
  'basic_concept_needed',
  'factoring_pattern_recall',
  'complex_factoring_difficulty',
  'quadratic_formula_memorization',
  'discriminant_calculation',
];

export const diagnosisMap: Record<WeaknessId, DiagnosisItem> = {
  formula_understanding: {
    id: 'formula_understanding',
    labelKo: '공식 이해 부족',
    desc: '완전제곱식 변환 원리를 아직 충분히 체화하지 못한 상태입니다.',
    tip: 'x 계수의 절반을 제곱하는 규칙을 먼저 고정하고, 변형을 한 줄씩 적어 보세요.',
  },
  calc_repeated_error: {
    id: 'calc_repeated_error',
    labelKo: '계산 실수 반복',
    desc: '개념은 알고 있지만 부호/사칙연산에서 반복 실수가 발생했습니다.',
    tip: '음수 계산 구간을 분리해서 검산하고, 마지막 한 줄을 반드시 다시 확인하세요.',
  },
  min_value_read_confusion: {
    id: 'min_value_read_confusion',
    labelKo: '최솟값 읽기 혼동',
    desc: '(x-a)^2+b 형태에서 최솟값 b와 최솟값을 갖는 x=a를 혼동하는 패턴입니다.',
    tip: '최솟값(y)과 그때의 x값을 따로 적는 습관을 들이면 실수가 줄어듭니다.',
  },
  vertex_formula_memorization: {
    id: 'vertex_formula_memorization',
    labelKo: '공식 암기 부족',
    desc: '꼭짓점 x좌표 공식 -b/2a 적용이 아직 불안정합니다.',
    tip: 'b의 부호를 포함해 읽고, -b를 먼저 계산한 뒤 2a로 나누는 순서를 고정하세요.',
  },
  coefficient_sign_confusion: {
    id: 'coefficient_sign_confusion',
    labelKo: '계수 구분 혼동',
    desc: 'a, b, c 계수를 부호 포함으로 읽는 단계에서 혼동이 발생했습니다.',
    tip: '식을 ax^2+bx+c 형태로 직접 다시 쓰고 계수를 부호 포함으로 체크하세요.',
  },
  derivative_calculation: {
    id: 'derivative_calculation',
    labelKo: '미분 계산 부족',
    desc: 'x^n 미분 규칙 적용이 흔들려 계산 단계에서 오답이 났습니다.',
    tip: '지수는 앞으로 곱하고 지수는 1 감소한다는 패턴을 항별로 분리해 적용하세요.',
  },
  solving_order_confusion: {
    id: 'solving_order_confusion',
    labelKo: '풀이 순서 혼동',
    desc: "f'(x)=0으로 x를 구한 뒤 f(x)에 대입하는 순서가 누락되었습니다.",
    tip: 'x 도출 -> 원함수 대입 -> 최댓값/최솟값 판정의 3단계를 체크리스트로 유지하세요.',
  },
  max_min_judgement_confusion: {
    id: 'max_min_judgement_confusion',
    labelKo: '최댓값/최솟값 판단 혼동',
    desc: 'a의 부호로 그래프 볼록 방향을 해석하는 단계에서 오판이 있었습니다.',
    tip: 'a>0은 최솟값, a<0은 최댓값을 먼저 판단한 뒤 값을 계산하세요.',
  },
  basic_concept_needed: {
    id: 'basic_concept_needed',
    labelKo: '기초 개념 학습 필요',
    desc: '핵심 개념 정리가 부족해 문제 접근 자체가 어려운 상태입니다.',
    tip: '완전제곱식과 꼭짓점 해석을 먼저 짧은 문제로 반복해 기반을 만든 뒤 확장하세요.',
  },
  factoring_pattern_recall: {
    id: 'factoring_pattern_recall',
    labelKo: '인수분해 패턴 암기 부족',
    desc: '인수분해 공식이나 기본 패턴을 떠올리는데 어려움이 있습니다.',
    tip: '자주 쓰이는 인수분해 공식(합차, 완전제곱 등)을 반복해서 쓰고 외워보세요.',
  },
  complex_factoring_difficulty: {
    id: 'complex_factoring_difficulty',
    labelKo: '복잡한 식 인수분해 어려움',
    desc: '항이 많거나 치환이 필요한 복잡한 형태의 식을 적절히 묶어내지 못했습니다.',
    tip: '공통인수가 보이도록 식을 묶거나, 공통부분을 다른 문자로 치환해 간단히 만드세요.',
  },
  quadratic_formula_memorization: {
    id: 'quadratic_formula_memorization',
    labelKo: '근의공식 암기 부족',
    desc: '근의 공식을 정확하게 기억하지 못해 대입 단계에서 문제가 발생합니다.',
    tip: '근의 공식을 적어두고, 계수 a, b, c를 찾은 후 하나씩 대입하는 연습을 하세요.',
  },
  discriminant_calculation: {
    id: 'discriminant_calculation',
    labelKo: '판별식 계산 실수',
    desc: '근호 안의 판별식(b^2 - 4ac)을 계산하는 도중 실수가 자주 발생합니다.',
    tip: 'b^2과 4ac를 각각 따로 계산한 뒤 빼는 방식으로, 부호 실수를 방지하세요.',
  },
};

export const weaknessLabelToId: Record<string, WeaknessId> = weaknessOrder.reduce(
  (acc, id) => {
    acc[diagnosisMap[id].labelKo] = id;
    return acc;
  },
  {} as Record<string, WeaknessId>,
);

export function resolveWeaknessId(value?: string | null): WeaknessId | undefined {
  if (!value) return undefined;

  if (weaknessOrder.includes(value as WeaknessId)) {
    return value as WeaknessId;
  }

  return weaknessLabelToId[value];
}
