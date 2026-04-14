import { diagnosisMap, type WeaknessId } from './diagnosisMap';
import { diagnosisTree, methodOptions, type SolveMethodId } from './diagnosisTree';

export type DiagnosisFlowNode = ChoiceNode | ExplainNode | CheckNode | FinalNode;

export type ChoiceNode = {
  id: string;
  kind: 'choice';
  title: string;
  body?: string;
  options: Array<{
    id: string;
    text: string;
    nextNodeId: string;
    weaknessId?: WeaknessId;
  }>;
};

export type ExplainNode = {
  id: string;
  kind: 'explain';
  title: string;
  body: string;
  primaryLabel: '확인 문제로 넘어갈게요';
  primaryNextNodeId: string;
  secondaryLabel: '모르겠습니다';
  secondaryNextNodeId: string;
};

export type CheckNode = {
  id: string;
  kind: 'check';
  title: string;
  prompt?: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    nextNodeId: string;
    weaknessId?: WeaknessId;
  }>;
  dontKnowNextNodeId: string;
};

export type FinalNode = {
  id: string;
  kind: 'final';
  weaknessId: WeaknessId;
  title: string;
  body: string;
  ctaLabel: '이 약점으로 정리하기';
};

export type DetailedDiagnosisFlow = {
  methodId: SolveMethodId;
  startNodeId: string;
  nodes: Record<string, DiagnosisFlowNode>;
};

type ExplainCopy = {
  title: string;
  body: string;
  remedialTitle: string;
  remedialBody: string;
};

type CheckPromptDefinition = {
  title: string;
  prompt?: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
};

const CONTINUE_LABEL = '확인 문제로 넘어갈게요';
const DONT_KNOW_LABEL = '모르겠습니다';
const FINAL_LABEL = '이 약점으로 정리하기';

const methodFallbackWeakness: Record<SolveMethodId, WeaknessId> = {
  cps: 'formula_understanding',
  vertex: 'vertex_formula_memorization',
  diff: 'derivative_calculation',
  unknown: 'basic_concept_needed',
  factoring: 'factoring_pattern_recall',
  quadratic: 'quadratic_formula_memorization',
  radical: 'radical_simplification_error',
  polynomial: 'expansion_sign_error',
  complex_number: 'imaginary_unit_confusion',
  remainder_theorem: 'remainder_substitution_error',
  counting: 'counting_method_confusion',
  set: 'g2_set_operation',
  proposition: 'g2_prop_contrapositive',
  trig: 'g2_trig_unit_circle',
  integral: 'g2_integral_basic',
  linear_eq: 'g2_inequality_range',
  sequence: 'g3_sequence',
  log_exp: 'g3_log_exp',
  conic: 'g3_conic',
  limit: 'g3_limit',
  vector: 'g3_vector',
  probability: 'g3_probability',
  space_geometry: 'g3_space_geometry',
  function: 'g3_function',
  statistics: 'g3_statistics',
  geometry: 'g1_geometry',
  permutation: 'g3_counting',
  sequence_limit: 'g3_limit',
  integral_advanced: 'g3_integral',
  diff_advanced: 'g3_diff',
};

const customExplainCopyByChoice: Partial<Record<string, ExplainCopy>> = {
  cps_formula: {
    title: '완전제곱식 핵심부터 다시 짚어볼게요.',
    body: 'x² + bx를 완전제곱식으로 바꿀 때는 x 계수의 절반을 먼저 보고, 그 수를 제곱해서 더하고 빼면 됩니다.\n\n핵심은 "절반을 제곱한다"는 순서를 고정하는 거예요.',
    remedialTitle: '더 짧게 다시 볼게요.',
    remedialBody: 'x² + bx에서 필요한 수는 (b/2)²입니다.\n예를 들어 x² - 6x라면 절반은 -3, 제곱하면 9예요.\n이 흐름만 기억하면 됩니다.',
  },
  cps_calc: {
    title: '완전제곱식에서는 계산 실수가 자주 나는 자리가 정해져 있어요.',
    body: '더하고 뺀 수를 0으로 맞춰야 식이 유지됩니다.\n또 마지막 상수항 계산에서 부호를 자주 놓칩니다.\n\n식 변형과 상수항 계산을 한 줄씩 분리해서 보는 게 중요해요.',
    remedialTitle: '계산 흐름만 다시 좁혀볼게요.',
    remedialBody: '같은 수를 더하고 같은 수를 빼면 전체 값은 바뀌지 않습니다.\n마지막에는 상수끼리만 다시 계산해 보세요.',
  },
  cps_read: {
    title: '완전제곱식에서는 x값과 최솟값을 따로 읽어야 해요.',
    body: '(x-a)²+b 형태에서는 제곱 부분의 최솟값이 0이고, 전체 최솟값은 b입니다.\n\na는 최솟값이 되는 x이고, b는 실제 최솟값이에요.',
    remedialTitle: '딱 한 줄로 다시 정리할게요.',
    remedialBody: '완전제곱식에서 a는 위치, b는 값입니다.\n"x = a"와 "최솟값 = b"를 분리해서 보세요.',
  },
  vertex_formula: {
    title: '꼭짓점 공식은 -b/2a 순서만 흔들리지 않으면 돼요.',
    body: '이차함수 ax² + bx + c에서 꼭짓점의 x좌표는 -b/2a입니다.\n\n특히 b의 부호를 포함해서 읽는 것, 그리고 2a로 끝까지 나누는 것을 자주 놓칩니다.',
    remedialTitle: '더 짧게 기억해볼게요.',
    remedialBody: '먼저 b를 부호 포함으로 적고, 그다음 -b를 만든 뒤 2a로 나눕니다.\n이 순서만 고정하세요.',
  },
  vertex_sub: {
    title: '꼭짓점 공식을 쓴 뒤에는 x를 다시 f(x)에 대입해야 해요.',
    body: '꼭짓점 공식이 주는 것은 x좌표입니다.\n실제 최댓값이나 최솟값을 얻으려면 그 x를 원래 함수에 다시 넣어야 합니다.',
    remedialTitle: '핵심 두 단계만 다시 볼게요.',
    remedialBody: '1) -b/2a로 x를 구한다.\n2) 그 x를 f(x)에 대입해 값을 구한다.\n여기서 멈추면 안 됩니다.',
  },
  vertex_coeff: {
    title: 'a, b, c는 부호까지 포함해서 읽어야 해요.',
    body: 'ax² + bx + c 꼴에서 a는 x²의 계수, b는 x의 계수, c는 상수항입니다.\n\nb가 음수면 그대로 음수로 읽어야 합니다.',
    remedialTitle: '가장 많이 놓치는 부분만 볼게요.',
    remedialBody: 'b는 x 앞의 수를 부호 포함으로 적습니다.\n예를 들어 -8x면 b는 8이 아니라 -8입니다.',
  },
  diff_rule: {
    title: '미분은 항마다 따로 적용하면 훨씬 안정적이에요.',
    body: 'xⁿ을 미분하면 nxⁿ⁻¹이 됩니다.\n상수항은 0이 되고, 각 항을 따로 미분한 뒤 다시 정리하면 실수가 줄어듭니다.',
    remedialTitle: '미분 규칙만 다시 짧게 볼게요.',
    remedialBody: '지수는 앞으로 나오고, 지수는 1 줄어듭니다.\n상수항은 미분하면 0입니다.',
  },
  diff_order: {
    title: '미분 풀이에서는 순서가 더 중요해요.',
    body: "보통 f'(x)=0으로 먼저 x를 찾고, 그다음 그 x를 원래 함수 f(x)에 넣어 최댓값이나 최솟값을 구합니다.\n\n중간에 멈추면 값이 아니라 위치만 구한 상태예요.",
    remedialTitle: '미분 풀이 순서를 다시 적어볼게요.',
    remedialBody: "1) f'(x)=0\n2) x 구하기\n3) 그 x를 f(x)에 대입하기\n이 세 단계로 보면 됩니다.",
  },
  diff_judge: {
    title: '최댓값과 최솟값은 그래프 방향을 먼저 보면 돼요.',
    body: '이차함수에서는 a의 부호를 보면 위로 볼록인지 아래로 볼록인지 알 수 있습니다.\n\n위로 볼록이면 최솟값, 아래로 볼록이면 최댓값이에요.',
    remedialTitle: '판단 기준만 다시 볼게요.',
    remedialBody: 'a > 0이면 최솟값, a < 0이면 최댓값입니다.\n값을 계산하기 전에 이 판단부터 먼저 하세요.',
  },
  unknown_basic: {
    title: '지금은 풀이 이름보다 시작점이 더 중요해요.',
    body: '괜찮아요. 아직 방법 이름이 안 떠오를 수 있습니다.\n이럴 때는 "무엇을 먼저 구해야 하는지"부터 잡아보는 게 좋습니다.',
    remedialTitle: '더 쉬운 기준으로 다시 볼게요.',
    remedialBody: '방법 이름은 몰라도 됩니다.\n먼저 x를 구하는지, 식을 바꾸는지, 값을 대입하는지부터 떠올려 보세요.',
  },
  unknown_calc: {
    title: '방향은 맞는데 계산이 흔들리는 상태로 보여요.',
    body: '이 경우에는 개념이 완전히 없는 것이 아니라, 중간 계산과 부호 처리에서 자주 흔들리는 패턴일 가능성이 큽니다.',
    remedialTitle: '계산 쪽만 다시 좁혀볼게요.',
    remedialBody: '식을 한 줄씩 나누고, 음수 계산이나 분수 계산 구간만 따로 검산해 보세요.',
  },
  unknown_read: {
    title: '값을 읽는 해석 단계에서 흔들리는 경우가 많아요.',
    body: '문제에서 묻는 것이 x값인지, 함수값인지, 최댓값인지 최솟값인지 구분하는 단계가 흐려지면 마지막에 틀리기 쉽습니다.',
    remedialTitle: '질문이 무엇인지부터 다시 볼게요.',
    remedialBody: '문제에서 구하는 대상이 "x"인지 "값"인지 먼저 체크하고, 마지막 줄에 그 값을 따로 적어보세요.',
  },
};

const checkPromptByWeakness: Partial<Record<WeaknessId, CheckPromptDefinition>> = {
  formula_understanding: {
    title: '완전제곱식 핵심 확인',
    prompt: 'x² - 6x를 완전제곱식으로 만들 때 더하고 빼야 하는 수는?',
    options: [
      { id: 'correct', text: '9', isCorrect: true },
      { id: 'half', text: '6', isCorrect: false },
      { id: 'square', text: '36', isCorrect: false },
    ],
  },
  calc_repeated_error: {
    title: '계산 실수 포인트 확인',
    prompt: '9 - 18 + 10을 계산하면?',
    options: [
      { id: 'correct', text: '1', isCorrect: true },
      { id: 'wrong_sign', text: '19', isCorrect: false },
      { id: 'skip_step', text: '7', isCorrect: false },
    ],
  },
  min_value_read_confusion: {
    title: '최솟값 읽기 확인',
    prompt: '(x - 3)² + 2에서 최솟값은?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'x_value', text: '3', isCorrect: false },
      { id: 'square', text: '0', isCorrect: false },
    ],
  },
  vertex_formula_memorization: {
    title: '꼭짓점 공식 확인',
    prompt: 'f(x) = x² - 8x + 1일 때 꼭짓점의 x좌표는?',
    options: [
      { id: 'correct', text: '4', isCorrect: true },
      { id: 'miss_sign', text: '-4', isCorrect: false },
      { id: 'no_divide', text: '8', isCorrect: false },
    ],
  },
  coefficient_sign_confusion: {
    title: '계수 읽기 확인',
    prompt: 'f(x) = 2x² - 8x + 3에서 b는?',
    options: [
      { id: 'correct', text: '-8', isCorrect: true },
      { id: 'drop_sign', text: '8', isCorrect: false },
      { id: 'wrong_term', text: '3', isCorrect: false },
    ],
  },
  derivative_calculation: {
    title: '미분 규칙 확인',
    prompt: 'f(x) = x² - 6x + 3을 미분하면?',
    options: [
      { id: 'correct', text: "2x - 6", isCorrect: true },
      { id: 'constant', text: "2x - 6 + 3", isCorrect: false },
      { id: 'power', text: "x - 6", isCorrect: false },
    ],
  },
  solving_order_confusion: {
    title: '풀이 순서 확인',
    prompt: "f'(x)=0으로 x를 구한 뒤 다음으로 해야 하는 것은?",
    options: [
      { id: 'correct', text: '그 x를 f(x)에 대입해 값 구하기', isCorrect: true },
      { id: 'stop', text: '거기서 바로 최댓값이라고 결론내기', isCorrect: false },
      { id: 'differentiate', text: '한 번 더 미분하기', isCorrect: false },
    ],
  },
  max_min_judgement_confusion: {
    title: '최댓값/최솟값 판단 확인',
    prompt: '이차함수에서 a < 0이면 그래프는?',
    options: [
      { id: 'correct', text: '아래로 볼록이라 최댓값을 가진다', isCorrect: true },
      { id: 'min', text: '위로 볼록이라 최솟값을 가진다', isCorrect: false },
      { id: 'none', text: '최댓값도 최솟값도 없다', isCorrect: false },
    ],
  },
  basic_concept_needed: {
    title: '현재 상태 다시 확인',
    prompt: '지금 가장 가까운 상태는?',
    options: [
      { id: 'correct', text: '시작 방법 자체가 아직 잘 안 떠올라요', isCorrect: true },
      { id: 'calc', text: '방향은 알겠는데 계산에서만 틀려요', isCorrect: false },
      { id: 'read', text: '마지막에 값을 읽는 것만 헷갈려요', isCorrect: false },
    ],
  },
  factoring_pattern_recall: {
    title: '인수분해 패턴 확인',
    prompt: 'x² - 5x + 6을 인수분해하면?',
    options: [
      { id: 'correct', text: '(x-2)(x-3)', isCorrect: true },
      { id: 'sign', text: '(x+2)(x+3)', isCorrect: false },
      { id: 'wrong_pair', text: '(x-1)(x-6)', isCorrect: false },
    ],
  },
  complex_factoring_difficulty: {
    title: '복잡한 인수분해 확인',
    prompt: 'x³ - 4x를 묶으면?',
    options: [
      { id: 'correct', text: 'x(x²-4)', isCorrect: true },
      { id: 'drop', text: 'x²-4', isCorrect: false },
      { id: 'sign', text: 'x(x²+4)', isCorrect: false },
    ],
  },
  quadratic_formula_memorization: {
    title: '근의 공식 확인',
    prompt: '근의 공식에서 분모는 무엇인가요?',
    options: [
      { id: 'correct', text: '2a', isCorrect: true },
      { id: 'b', text: 'b', isCorrect: false },
      { id: 'square', text: 'b²', isCorrect: false },
    ],
  },
  discriminant_calculation: {
    title: '판별식 확인',
    prompt: 'ax² + bx + c의 판별식은?',
    options: [
      { id: 'correct', text: 'b² - 4ac', isCorrect: true },
      { id: 'sign', text: 'b² + 4ac', isCorrect: false },
      { id: 'missing', text: 'b - 4ac', isCorrect: false },
    ],
  },
  radical_simplification_error: {
    title: '루트 간소화 확인',
    prompt: '√75를 간단히 하면?',
    options: [
      { id: 'correct', text: '5√3', isCorrect: true },
      { id: 'wrong_factor', text: '√25 + √3', isCorrect: false },
      { id: 'keep', text: '15√5', isCorrect: false },
    ],
  },
  rationalization_error: {
    title: '유리화 확인',
    prompt: '6/√3을 유리화하면?',
    options: [
      { id: 'correct', text: '2√3', isCorrect: true },
      { id: 'half', text: '3√3', isCorrect: false },
      { id: 'keep', text: '6√3', isCorrect: false },
    ],
  },
  expansion_sign_error: {
    title: '전개 부호 확인',
    prompt: '(x-2)(x+3)을 전개하면?',
    options: [
      { id: 'correct', text: 'x² + x - 6', isCorrect: true },
      { id: 'sign', text: 'x² - x - 6', isCorrect: false },
      { id: 'middle', text: 'x² + 5x - 6', isCorrect: false },
    ],
  },
  like_terms_error: {
    title: '동류항 정리 확인',
    prompt: '2x + 3x - x를 정리하면?',
    options: [
      { id: 'correct', text: '4x', isCorrect: true },
      { id: 'drop', text: '5x', isCorrect: false },
      { id: 'sign', text: '2x', isCorrect: false },
    ],
  },
  imaginary_unit_confusion: {
    title: '허수 단위 확인',
    prompt: 'i²의 값은?',
    options: [
      { id: 'correct', text: '-1', isCorrect: true },
      { id: 'identity', text: '1', isCorrect: false },
      { id: 'imaginary', text: 'i', isCorrect: false },
    ],
  },
  complex_calc_error: {
    title: '복소수 정리 확인',
    prompt: '(2 + i) + (3 - 2i)를 정리하면?',
    options: [
      { id: 'correct', text: '5 - i', isCorrect: true },
      { id: 'drop', text: '5 + i', isCorrect: false },
      { id: 'sign', text: '-1 + i', isCorrect: false },
    ],
  },
  remainder_substitution_error: {
    title: '나머지정리 확인',
    prompt: 'P(x)를 x-2로 나눌 때 나머지는?',
    options: [
      { id: 'correct', text: 'P(2)', isCorrect: true },
      { id: 'neg', text: 'P(-2)', isCorrect: false },
      { id: 'zero', text: 'P(0)', isCorrect: false },
    ],
  },
  simultaneous_equation_error: {
    title: '조건 정리 확인',
    prompt: '두 조건이 주어졌을 때 먼저 해야 하는 것은?',
    options: [
      { id: 'correct', text: '식 두 개를 따로 세운 뒤 연립으로 묶기', isCorrect: true },
      { id: 'guess', text: '값을 감으로 넣어 보기', isCorrect: false },
      { id: 'skip', text: '한 식만으로 바로 결론내기', isCorrect: false },
    ],
  },
  counting_method_confusion: {
    title: '경우의 수 방법 확인',
    prompt: '순서가 중요하지 않을 때 먼저 떠올릴 방법은?',
    options: [
      { id: 'correct', text: '조합', isCorrect: true },
      { id: 'perm', text: '순열', isCorrect: false },
      { id: 'none', text: '아무 기준 없이 전부 나열', isCorrect: false },
    ],
  },
  counting_overcounting: {
    title: '중복 처리 확인',
    prompt: '같은 경우를 두 번 세지 않으려면 무엇이 중요할까요?',
    options: [
      { id: 'correct', text: '기준을 정하고 한 번만 세기', isCorrect: true },
      { id: 'double', text: '중복이어도 먼저 다 더하기', isCorrect: false },
      { id: 'ignore', text: '조건은 마지막에 한 번만 보기', isCorrect: false },
    ],
  },
  g3_sequence: {
    title: '수열 공식 확인',
    prompt: '등차수열 {aₙ}에서 a₁=2, 공차 d=3일 때 a₅는?',
    options: [
      { id: 'correct', text: '14', isCorrect: true },
      { id: 'wrong1', text: '12', isCorrect: false },
      { id: 'wrong2', text: '17', isCorrect: false },
    ],
  },
  g3_log_exp: {
    title: '로그 계산 확인',
    prompt: 'log₂8의 값은?',
    options: [
      { id: 'correct', text: '3', isCorrect: true },
      { id: 'wrong1', text: '4', isCorrect: false },
      { id: 'wrong2', text: '2', isCorrect: false },
    ],
  },
  g3_conic: {
    title: '이차곡선 초점 확인',
    prompt: '포물선 y²=8x의 초점의 x좌표는?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'wrong1', text: '4', isCorrect: false },
      { id: 'wrong2', text: '8', isCorrect: false },
    ],
  },
  g3_limit: {
    title: '극한값 확인',
    prompt: 'lim(x→∞) (2x+1)/x의 값은?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'wrong1', text: '1', isCorrect: false },
      { id: 'wrong2', text: '∞', isCorrect: false },
    ],
  },
  g3_vector: {
    title: '벡터 내적 확인',
    prompt: '벡터 a=(3,4), b=(1,0)일 때 a·b는?',
    options: [
      { id: 'correct', text: '3', isCorrect: true },
      { id: 'wrong1', text: '7', isCorrect: false },
      { id: 'wrong2', text: '4', isCorrect: false },
    ],
  },
  g3_probability: {
    title: '조건부확률 확인',
    prompt: 'P(A)=0.4, P(A∩B)=0.2일 때 P(B|A)는?',
    options: [
      { id: 'correct', text: '0.5', isCorrect: true },
      { id: 'wrong1', text: '0.2', isCorrect: false },
      { id: 'wrong2', text: '0.8', isCorrect: false },
    ],
  },
  g3_space_geometry: {
    title: '정사영 개념 확인',
    prompt: '평면에 수직으로 세운 선분의 정사영 길이는?',
    options: [
      { id: 'correct', text: '0', isCorrect: true },
      { id: 'wrong1', text: '원래 길이', isCorrect: false },
      { id: 'wrong2', text: '반', isCorrect: false },
    ],
  },
  g3_function: {
    title: '역함수 확인',
    prompt: 'f(x)=3x-1일 때 f⁻¹(5)는?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'wrong1', text: '14', isCorrect: false },
      { id: 'wrong2', text: '6', isCorrect: false },
    ],
  },
  g3_statistics: {
    title: '정규분포 표준화 확인',
    prompt: 'X~N(50, 4²)일 때 P(X≤58)을 구하려면 표준화 Z는?',
    options: [
      { id: 'correct', text: 'Z=2', isCorrect: true },
      { id: 'wrong1', text: 'Z=1.5', isCorrect: false },
      { id: 'wrong2', text: 'Z=8', isCorrect: false },
    ],
  },
  g1_geometry: {
    title: '피타고라스 정리 확인',
    prompt: '직각삼각형에서 두 변이 3, 4일 때 빗변의 길이는?',
    options: [
      { id: 'correct', text: '5', isCorrect: true },
      { id: 'wrong1', text: '7', isCorrect: false },
      { id: 'wrong2', text: '√7', isCorrect: false },
    ],
  },
  g3_counting: {
    title: '순열·조합 구분 확인',
    prompt: '5명 중 대표 2명을 뽑을 때 (순서 무관) 경우의 수는?',
    options: [
      { id: 'correct', text: '10', isCorrect: true },
      { id: 'wrong1', text: '20', isCorrect: false },
      { id: 'wrong2', text: '5', isCorrect: false },
    ],
  },
  g3_integral: {
    title: '정적분 계산 확인',
    prompt: '∫₀² 2x dx의 값은?',
    options: [
      { id: 'correct', text: '4', isCorrect: true },
      { id: 'wrong1', text: '2', isCorrect: false },
      { id: 'wrong2', text: '8', isCorrect: false },
    ],
  },
  g3_diff: {
    title: '합성함수 미분 확인',
    prompt: 'f(x)=(2x+1)³을 미분하면?',
    options: [
      { id: 'correct', text: '6(2x+1)²', isCorrect: true },
      { id: 'wrong1', text: '3(2x+1)²', isCorrect: false },
      { id: 'wrong2', text: '2(2x+1)³', isCorrect: false },
    ],
  },
};

// 검증: 13개 약점 모두 checkPromptByWeakness에 등록 확인
// 컴파일 타임: WeaknessId에 없는 오타 → tsc 에러
// 런타임: checkPromptByWeakness에 실제로 없으면 → 모듈 로드 시 throw
const _requiredCheckNodeWeaknesses = [
  'g3_sequence',
  'g3_log_exp',
  'g3_conic',
  'g3_limit',
  'g3_vector',
  'g3_probability',
  'g3_space_geometry',
  'g3_function',
  'g3_statistics',
  'g1_geometry',
  'g3_counting',
  'g3_integral',
  'g3_diff',
] as const satisfies ReadonlyArray<WeaknessId>;

_requiredCheckNodeWeaknesses.forEach((id) => {
  if (!(id in checkPromptByWeakness)) {
    throw new Error(`[detailedDiagnosisFlows] checkPromptByWeakness missing entry: ${id}`);
  }
});

function getMethodLabel(methodId: SolveMethodId) {
  return methodOptions.find((option) => option.id === methodId)?.labelKo ?? methodId;
}

function buildDefaultExplainCopy(
  methodId: SolveMethodId,
  choiceId: string,
  weaknessId: WeaknessId,
): ExplainCopy {
  const custom = customExplainCopyByChoice[choiceId];
  if (custom) {
    return custom;
  }

  const weakness = diagnosisMap[weaknessId];
  const methodLabel = getMethodLabel(methodId);

  return {
    title: `${methodLabel} 풀이를 더 짧게 정리해볼게요.`,
    body: `${weakness.desc}\n\n핵심 팁: ${weakness.tip}`,
    remedialTitle: '더 쉬운 설명으로 다시 볼게요.',
    remedialBody: `${methodLabel} 풀이에서는 이 지점을 먼저 안정시키는 것이 중요해요.\n\n${weakness.tip}`,
  };
}

function buildFinalNode(
  nodeId: string,
  weaknessId: WeaknessId,
  emphasis?: string,
): FinalNode {
  const weakness = diagnosisMap[weaknessId];

  return {
    id: nodeId,
    kind: 'final',
    weaknessId,
    title: emphasis ?? `${weakness.labelKo} 쪽 보완이 가장 먼저 필요해 보여요.`,
    body: `${weakness.desc}\n\n다음 팁: ${weakness.tip}`,
    ctaLabel: FINAL_LABEL,
  };
}

function buildCheckNode(
  nodeId: string,
  weaknessId: WeaknessId,
  onCorrectNextNodeId: string,
  onWrongNextNodeId: string,
): CheckNode {
  // Guarded by hasCheckNode above — if we reach here, the entry is always present
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const definition = checkPromptByWeakness[weaknessId]!;

  return {
    id: nodeId,
    kind: 'check',
    title: definition.title,
    prompt: definition.prompt,
    options: definition.options.map((option) => ({
      ...option,
      nextNodeId: option.isCorrect ? onCorrectNextNodeId : onWrongNextNodeId,
      weaknessId: option.isCorrect ? undefined : weaknessId,
    })),
    dontKnowNextNodeId: onWrongNextNodeId,
  };
}

function createMethodFlow(methodId: SolveMethodId): DetailedDiagnosisFlow {
  const definition = diagnosisTree[methodId];
  const methodLabel = getMethodLabel(methodId);
  const fallbackWeaknessId = methodFallbackWeakness[methodId];
  const nodes: Record<string, DiagnosisFlowNode> = {};

  nodes.root = {
    id: 'root',
    kind: 'choice',
    title: definition.prompt,
    body:
      methodId === 'unknown'
        ? '가장 가까운 상태를 고르면, 그다음 질문을 더 구체적으로 좁혀볼게요.'
        : `막힌 지점을 하나 고르면 ${methodLabel} 풀이를 더 자세히 짚어볼게요.`,
    options: definition.choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
      nextNodeId: `${choice.id}_explain`,
      weaknessId: choice.weaknessId,
    })),
  };

  definition.choices.forEach((choice) => {
    const hasCheckNode = choice.weaknessId in checkPromptByWeakness;
    const explainCopy = buildDefaultExplainCopy(methodId, choice.id, choice.weaknessId);
    const finalNodeId = `${choice.id}_final`;
    const fallbackFinalNodeId = `${choice.id}_fallback_final`;

    nodes[`${choice.id}_explain`] = {
      id: `${choice.id}_explain`,
      kind: 'explain',
      title: explainCopy.title,
      body: explainCopy.body,
      primaryLabel: CONTINUE_LABEL,
      primaryNextNodeId: hasCheckNode ? `${choice.id}_check` : finalNodeId,
      secondaryLabel: DONT_KNOW_LABEL,
      secondaryNextNodeId: hasCheckNode ? `${choice.id}_remedial` : fallbackFinalNodeId,
    };

    if (hasCheckNode) {
      nodes[`${choice.id}_remedial`] = {
        id: `${choice.id}_remedial`,
        kind: 'explain',
        title: explainCopy.remedialTitle,
        body: explainCopy.remedialBody,
        primaryLabel: CONTINUE_LABEL,
        primaryNextNodeId: `${choice.id}_retry_check`,
        secondaryLabel: DONT_KNOW_LABEL,
        secondaryNextNodeId: fallbackFinalNodeId,
      };

      nodes[`${choice.id}_check`] = buildCheckNode(
        `${choice.id}_check`,
        choice.weaknessId,
        finalNodeId,
        `${choice.id}_remedial`,
      );

      nodes[`${choice.id}_retry_check`] = buildCheckNode(
        `${choice.id}_retry_check`,
        choice.weaknessId,
        finalNodeId,
        fallbackFinalNodeId,
      );
    }

    nodes[finalNodeId] = buildFinalNode(finalNodeId, choice.weaknessId);
    nodes[fallbackFinalNodeId] = buildFinalNode(
      fallbackFinalNodeId,
      fallbackWeaknessId,
      `${methodLabel} 풀이의 기초를 먼저 다지는 것이 좋아 보여요.`,
    );
  });

  return {
    methodId,
    startNodeId: 'root',
    nodes,
  };
}

const flowEntries = methodOptions.map((option) => [option.id, createMethodFlow(option.id)] as const);

export const detailedDiagnosisFlows: Record<SolveMethodId, DetailedDiagnosisFlow> =
  Object.fromEntries(flowEntries) as Record<SolveMethodId, DetailedDiagnosisFlow>;
