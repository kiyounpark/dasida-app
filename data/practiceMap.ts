import type { WeaknessId } from './diagnosisMap';

export type PracticeProblem = {
  id: string;
  weaknessId: WeaknessId;
  question: string;
  choices: string[];
  answerIndex: number;
  hint: string;
  explanation: string;
};

export const practiceMap: Record<WeaknessId, PracticeProblem> = {
  formula_understanding: {
    id: 'p_formula_understanding',
    weaknessId: 'formula_understanding',
    question: 'x^2 - 6x를 완전제곱식으로 만들기 위해 더하고 빼야 하는 수는?',
    choices: ['3', '6', '9', '12', '36'],
    answerIndex: 2,
    hint: 'x 계수 -6의 절반은 -3, 제곱하면 9입니다.',
    explanation: 'x^2 - 6x + 9 - 9 = (x-3)^2 - 9로 변형됩니다.',
  },
  calc_repeated_error: {
    id: 'p_calc_repeated_error',
    weaknessId: 'calc_repeated_error',
    question: 'f(x)=x^2-6x+10에서 x=3일 때 f(3)은?',
    choices: ['-1', '0', '1', '3', '10'],
    answerIndex: 2,
    hint: '9 - 18 + 10 순서로 계산해보세요.',
    explanation: 'f(3)=9-18+10=1 입니다.',
  },
  min_value_read_confusion: {
    id: 'p_min_value_read_confusion',
    weaknessId: 'min_value_read_confusion',
    question: 'f(x)=(x-5)^2+3의 최솟값은?',
    choices: ['0', '3', '5', '8', '-5'],
    answerIndex: 1,
    hint: '(x-a)^2+b 형태에서 최솟값은 b입니다.',
    explanation: '(x-5)^2의 최솟값 0에 3을 더해 최솟값은 3입니다.',
  },
  vertex_formula_memorization: {
    id: 'p_vertex_formula_memorization',
    weaknessId: 'vertex_formula_memorization',
    question: 'f(x)=2x^2-8x+5의 꼭짓점 x좌표는?',
    choices: ['1', '2', '3', '4', '-2'],
    answerIndex: 1,
    hint: 'x = -b/(2a), 여기서 a=2, b=-8입니다.',
    explanation: '-(-8)/(2*2)=8/4=2입니다.',
  },
  coefficient_sign_confusion: {
    id: 'p_coefficient_sign_confusion',
    weaknessId: 'coefficient_sign_confusion',
    question: 'f(x)=-3x^2+6x-2의 a,b,c는?',
    choices: ['a=-3,b=6,c=-2', 'a=3,b=6,c=2', 'a=-3,b=-6,c=2', 'a=3,b=-6,c=-2', 'a=-3,b=6,c=2'],
    answerIndex: 0,
    hint: '계수는 부호를 포함해 읽습니다.',
    explanation: 'x^2 계수=-3, x 계수=6, 상수=-2입니다.',
  },
  derivative_calculation: {
    id: 'p_derivative_calculation',
    weaknessId: 'derivative_calculation',
    question: "f(x)=x^3-3x^2+2x 일 때 f'(x)는?",
    choices: ['3x^2-6x+2', 'x^2-6x+2', '3x^2-3x+2', '3x^3-6x+2', '3x^2+6x+2'],
    answerIndex: 0,
    hint: 'x^n은 n*x^(n-1), 상수항의 미분은 0입니다.',
    explanation: '항별로 미분하면 3x^2-6x+2가 됩니다.',
  },
  solving_order_confusion: {
    id: 'p_solving_order_confusion',
    weaknessId: 'solving_order_confusion',
    question: '미분으로 최솟값을 구하는 올바른 순서는?',
    choices: [
      "f'(x)=0으로 x를 구한 뒤 f(x)에 대입",
      '먼저 f(x)를 임의값 대입',
      '최솟값을 추정 후 대입',
      'x값을 최솟값으로 사용',
      '상수항만 확인',
    ],
    answerIndex: 0,
    hint: '극값의 x를 먼저 구하고 원함수 값으로 변환해야 합니다.',
    explanation: 'x를 구한 뒤 f(x)에 대입해야 최솟값/최댓값이 나옵니다.',
  },
  max_min_judgement_confusion: {
    id: 'p_max_min_judgement_confusion',
    weaknessId: 'max_min_judgement_confusion',
    question: 'f(x)=-x^2+4x-3에서 꼭짓점은 최댓값일까 최솟값일까?',
    choices: ['최솟값', '최댓값', '둘 다 아님', '항상 0', '판단 불가'],
    answerIndex: 1,
    hint: 'a<0이면 그래프는 위로 볼록(∩)입니다.',
    explanation: 'a가 음수이므로 꼭짓점은 최댓값입니다.',
  },
  basic_concept_needed: {
    id: 'p_basic_concept_needed',
    weaknessId: 'basic_concept_needed',
    question: 'f(x)=(x-1)^2+2에 대한 설명으로 옳은 것은?',
    choices: ['최솟값은 1', '최솟값은 2', '최댓값은 2', '최솟값이 없다', 'x=2에서 최솟값'],
    answerIndex: 1,
    hint: '(x-a)^2는 항상 0 이상입니다.',
    explanation: '최솟값은 x=1일 때 2입니다.',
  },
  factoring_pattern_recall: {
    id: 'p_factoring_pattern_recall',
    weaknessId: 'factoring_pattern_recall',
    question: 'x^2 - 5x + 6을 인수분해하면?',
    choices: ['(x-2)(x-3)', '(x+2)(x+3)', '(x-1)(x-6)', '(x+1)(x-6)', '(x-2)(x+3)'],
    answerIndex: 0,
    hint: '곱이 6, 합이 -5인 두 수를 찾아보세요.',
    explanation: '-2×-3=6, -2+(-3)=-5이므로 (x-2)(x-3)입니다.',
  },
  complex_factoring_difficulty: {
    id: 'p_complex_factoring_difficulty',
    weaknessId: 'complex_factoring_difficulty',
    question: 'x^2(x+1) - 4(x+1)을 인수분해하면?',
    choices: ['(x+1)(x-2)(x+2)', '(x-1)(x^2-4)', '(x+1)(x^2+4)', '(x-2)(x+2)(x-1)', '인수분해 불가'],
    answerIndex: 0,
    hint: '(x+1)을 공통인수로 묶어보세요.',
    explanation: '(x+1)(x^2-4) = (x+1)(x-2)(x+2)입니다.',
  },
  quadratic_formula_memorization: {
    id: 'p_quadratic_formula_memorization',
    weaknessId: 'quadratic_formula_memorization',
    question: '근의 공식으로 x^2 - 3x + 2 = 0의 해를 구하면?',
    choices: ['x=1 또는 x=2', 'x=-1 또는 x=-2', 'x=1 또는 x=-2', 'x=-1 또는 x=2', 'x=3 또는 x=2'],
    answerIndex: 0,
    hint: 'a=1, b=-3, c=2를 근의 공식에 대입하세요.',
    explanation: 'x=(3±√(9-8))/2=(3±1)/2이므로 x=2 또는 x=1입니다.',
  },
  discriminant_calculation: {
    id: 'p_discriminant_calculation',
    weaknessId: 'discriminant_calculation',
    question: '2x^2 - 4x + 3 = 0의 판별식 D의 값은?',
    choices: ['-8', '8', '-4', '4', '0'],
    answerIndex: 0,
    hint: 'D = b^2 - 4ac = (-4)^2 - 4×2×3',
    explanation: '16 - 24 = -8이므로 D=-8입니다. (허근)',
  },
};
