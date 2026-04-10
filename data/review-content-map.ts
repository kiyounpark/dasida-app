import { diagnosisMap, type WeaknessId } from './diagnosisMap';

export type ThinkingStep = {
  title: string;
  body: string;
  example?: string;
  choices: Array<{ text: string; correct: boolean }>;
};

type ReviewContent = {
  heroPrompt: string;
  thinkingSteps: ThinkingStep[];
};

// g3_* 약점은 이 맵에 포함되지 않음 — 해당 약점의 복습 세션은 별도로 구현 예정
// getReviewThinkingSteps는 g3_* weaknessId에 대해 [] 반환
const reviewContentMap: Partial<Record<WeaknessId, ReviewContent>> = {
  discriminant_calculation: {
    heroPrompt: '판별식은 b^2와 4ac를 따로 계산한 뒤 빼야 한다는 흐름이 떠오르나요?',
    thinkingSteps: [
      {
        title: 'a, b, c 부호 확인',
        body: 'ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.',
        example: '예) 2x²−3x+1 → a=2, b=−3, c=1',
        choices: [
          { text: '계산 실수를 줄이기 위해서', correct: false },
          { text: '음수 부호를 빠뜨리면 결과가 달라지니까', correct: true },
          { text: '근의 공식을 외우기 쉽게 하기 위해서', correct: false },
        ],
      },
      {
        title: 'b² 먼저, 4ac 나중',
        body: 'b²를 먼저 계산하고, 그 다음 4×a×c를 따로 계산한다.',
        example: '예) b=−3 → b²=9 / 4×2×1=8',
        choices: [
          { text: 'b²는 b 하나만 써서 가장 단순하니까', correct: true },
          { text: '4ac가 더 중요해서 나중에 집중하려고', correct: false },
          { text: '순서는 상관없고 습관적으로', correct: false },
        ],
      },
      {
        title: '빼고 나서 판단',
        body: 'b²−4ac의 결과가 양수/0/음수인지 보고 근의 개수를 결론짓는다.',
        example: '9−8=1 > 0 → 서로 다른 두 실근',
        choices: [
          { text: '결과의 숫자 크기로 근의 종류를 결정한다', correct: false },
          { text: '결과의 부호(양수/0/음수)만 보면 된다', correct: true },
          { text: '결과가 0보다 크면 항상 두 근이 같다', correct: false },
        ],
      },
    ],
  },
  formula_understanding: {
    heroPrompt: '완전제곱식으로 바꿀 때 왜 x 계수의 절반을 제곱해야 하는지 기억나나요?',
    thinkingSteps: [
      {
        title: 'x 계수의 절반 추출',
        body: 'ax²+bx+c에서 x 계수 b를 확인하고 b/2를 먼저 구한다.',
        example: '예) x²+6x+5 → b=6, b/2=3',
        choices: [
          { text: 'b를 그대로 쓰면 된다', correct: false },
          { text: 'b/2를 먼저 계산해야 한다', correct: true },
          { text: '계수는 신경 쓰지 않아도 된다', correct: false },
        ],
      },
      {
        title: '(x + b/2)² 완성',
        body: '(x + b/2)²을 전개하면 x²+bx+(b/2)²이므로 원식에서 (b/2)²을 더하고 뺀다.',
        example: '예) x²+6x → (x+3)²−9',
        choices: [
          { text: '(b/2)²을 더하고 뺀다', correct: true },
          { text: 'b를 그대로 제곱한다', correct: false },
          { text: '상수항은 변하지 않는다', correct: false },
        ],
      },
      {
        title: '상수항 정리',
        body: '원래 상수항 c와 −(b/2)²을 합산하여 완전제곱식 꼴로 완성한다.',
        example: '예) (x+3)²−9+5 = (x+3)²−4',
        choices: [
          { text: '상수를 무시하고 계수만 본다', correct: false },
          { text: 'c − (b/2)²을 최종 상수로 쓴다', correct: true },
          { text: '상수항은 항상 0이다', correct: false },
        ],
      },
    ],
  },
  calc_repeated_error: {
    heroPrompt: '대입 계산에서 음수 구간을 따로 끊어 보는 순서, 아직 떠오르나요?',
    thinkingSteps: [
      {
        title: '대입할 값을 식에서 먼저 정리',
        body: '대입 전에 계산할 값 x=a를 식에서 읽고, 음수인지 확인한다.',
        example: '예) f(−2) 구하기 → x=−2 확인 후 대입',
        choices: [
          { text: '값을 바로 대입하면 된다', correct: false },
          { text: '대입 전 부호를 먼저 확인한다', correct: true },
          { text: '양수일 때만 조심하면 된다', correct: false },
        ],
      },
      {
        title: '음수 구간 괄호 처리',
        body: '음수를 대입할 때 반드시 괄호로 감싸서 부호 실수를 막는다.',
        example: '예) f(x)=x²+2x → f(−2)=(−2)²+2(−2)=4−4=0',
        choices: [
          { text: '음수는 괄호 없이 써도 된다', correct: false },
          { text: '음수 대입 시 괄호로 감싼다', correct: true },
          { text: '제곱이면 부호가 사라진다', correct: false },
        ],
      },
      {
        title: '항별 계산 후 합산',
        body: '각 항을 따로 계산한 뒤 마지막에 합산한다.',
        example: '예) (−2)²=4, 2(−2)=−4 → 4+(−4)=0',
        choices: [
          { text: '전체를 한 번에 계산한다', correct: false },
          { text: '항별로 나눠서 계산 후 합친다', correct: true },
          { text: '계산 순서는 중요하지 않다', correct: false },
        ],
      },
    ],
  },
  min_value_read_confusion: {
    heroPrompt: '(x-a)^2+b 꼴에서 최솟값과 그 값을 갖는 x를 어떻게 나눠서 읽었는지 기억나나요?',
    thinkingSteps: [
      {
        title: '완전제곱식 꼴 확인',
        body: '식을 (x−a)²+b 꼴로 변환하거나 이미 그 꼴인지 확인한다.',
        example: '예) (x−3)²+2 → a=3, b=2',
        choices: [
          { text: '표준형으로 바꿀 필요 없다', correct: false },
          { text: '(x−a)²+b 꼴로 먼저 파악한다', correct: true },
          { text: 'a와 b는 어차피 같은 값이다', correct: false },
        ],
      },
      {
        title: '최솟값은 상수항 b',
        body: '(x−a)²≥0이므로 최솟값은 제곱 항이 0일 때의 값 b이다.',
        example: '예) (x−3)²+2 → 최솟값 = 2',
        choices: [
          { text: '최솟값은 a이다', correct: false },
          { text: '최솟값은 상수항 b이다', correct: true },
          { text: '최솟값은 a+b이다', correct: false },
        ],
      },
      {
        title: '최솟값이 되는 x는 a',
        body: '제곱 항이 0이 되려면 x=a여야 하므로, 최솟값을 갖는 x는 a이다.',
        example: '예) (x−3)²+2 → x=3일 때 최솟값 2',
        choices: [
          { text: 'x=b일 때 최솟값이 된다', correct: false },
          { text: 'x=a일 때 최솟값 b를 갖는다', correct: true },
          { text: 'x=0일 때 항상 최솟값이다', correct: false },
        ],
      },
    ],
  },
  vertex_formula_memorization: {
    heroPrompt: '꼭짓점 x좌표를 구할 때 -b를 먼저 읽고 2a로 나누는 순서가 떠오르나요?',
    thinkingSteps: [
      {
        title: 'a, b 부호 포함 읽기',
        body: 'ax²+bx+c에서 a와 b를 부호 포함해서 읽는다.',
        example: '예) 2x²−6x+1 → a=2, b=−6',
        choices: [
          { text: '계수만 읽고 부호는 나중에 본다', correct: false },
          { text: 'a와 b를 부호 포함해서 먼저 읽는다', correct: true },
          { text: 'c는 꼭짓점에 영향을 준다', correct: false },
        ],
      },
      {
        title: '꼭짓점 x좌표 = −b / 2a',
        body: '꼭짓점 x좌표는 −b를 2a로 나눈 값이다.',
        example: '예) a=2, b=−6 → x = −(−6)/(2×2) = 6/4 = 3/2',
        choices: [
          { text: '꼭짓점 x좌표 = b/a이다', correct: false },
          { text: '꼭짓점 x좌표 = −b/(2a)이다', correct: true },
          { text: '꼭짓점 x좌표 = 2b/a이다', correct: false },
        ],
      },
      {
        title: 'y좌표는 원래 식에 x 대입',
        body: '꼭짓점 x좌표를 원래 식에 대입하여 y좌표(최솟값/최댓값)를 구한다.',
        example: '예) f(3/2) = 2(3/2)²−6(3/2)+1 계산',
        choices: [
          { text: 'y좌표는 c와 같다', correct: false },
          { text: 'x좌표를 원래 식에 대입한다', correct: true },
          { text: 'y좌표는 따로 공식이 있다', correct: false },
        ],
      },
    ],
  },
  coefficient_sign_confusion: {
    heroPrompt: 'ax^2+bx+c로 다시 쓸 때 계수를 부호까지 포함해 읽는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '각 항의 계수와 부호 함께 읽기',
        body: '식에서 x², x, 상수항 앞에 붙은 부호(+/−)를 계수의 일부로 읽는다.',
        example: '예) 3x²−5x+2 → a=3, b=−5, c=2',
        choices: [
          { text: '부호는 공식 대입 시 붙인다', correct: false },
          { text: '계수를 부호 포함해서 읽는다', correct: true },
          { text: '부호는 따로 기억한다', correct: false },
        ],
      },
      {
        title: 'a, b, c를 명시적으로 기록',
        body: '풀기 전에 a=_, b=_, c=_ 를 여백에 써두고 시작한다.',
        example: '예) a=3, b=−5, c=2 → 공식에 대입 준비',
        choices: [
          { text: '암산으로 바로 대입한다', correct: false },
          { text: '여백에 a, b, c를 먼저 쓴다', correct: true },
          { text: '공식만 알면 쓸 필요 없다', correct: false },
        ],
      },
      {
        title: '공식에 부호 포함 대입',
        body: '공식에 a, b, c를 괄호로 감싸서 대입하면 부호 실수를 막는다.',
        example: '예) −b/(2a) = −(−5)/(2×3) = 5/6',
        choices: [
          { text: '괄호 없이 숫자만 대입한다', correct: false },
          { text: '괄호로 감싸서 부호 포함 대입한다', correct: true },
          { text: '부호는 결과에서 조정한다', correct: false },
        ],
      },
    ],
  },
  derivative_calculation: {
    heroPrompt: 'x^n을 미분할 때 지수는 앞으로, 지수는 하나 감소한다는 규칙이 떠오르나요?',
    thinkingSteps: [
      {
        title: 'xⁿ의 미분 규칙 확인',
        body: 'xⁿ을 미분하면 n·xⁿ⁻¹이다. 지수를 계수 앞으로 내리고 지수를 1 줄인다.',
        example: '예) x³ → 3x²',
        choices: [
          { text: 'xⁿ → xⁿ⁺¹ / (n+1)', correct: false },
          { text: 'xⁿ → n·xⁿ⁻¹', correct: true },
          { text: 'xⁿ → n·xⁿ', correct: false },
        ],
      },
      {
        title: '각 항을 따로 미분',
        body: '다항식은 각 항을 독립적으로 미분한 뒤 합산한다.',
        example: "예) f(x)=3x³+2x → f'(x)=9x²+2",
        choices: [
          { text: '전체를 한 번에 미분한다', correct: false },
          { text: '각 항을 따로 미분 후 합산한다', correct: true },
          { text: '상수항도 미분하면 계수가 나온다', correct: false },
        ],
      },
      {
        title: '상수항 미분 결과는 0',
        body: '상수항(숫자만 있는 항)을 미분하면 0이 된다.',
        example: "예) f(x)=x²+3 → f'(x)=2x+0=2x",
        choices: [
          { text: '상수항은 미분하면 1이 된다', correct: false },
          { text: '상수항을 미분하면 0이 된다', correct: true },
          { text: '상수항은 미분하지 않는다', correct: false },
        ],
      },
    ],
  },
  solving_order_confusion: {
    heroPrompt: "f'(x)=0으로 x를 구한 뒤 원함수에 대입하는 순서, 다시 떠올릴 수 있나요?",
    thinkingSteps: [
      {
        title: "f'(x) = 0 방정식 세우기",
        body: "극값을 구하려면 먼저 도함수 f'(x)를 구하고 f'(x)=0으로 놓는다.",
        example: "예) f(x)=x³−3x → f'(x)=3x²−3=0",
        choices: [
          { text: 'f(x)=0으로 놓는다', correct: false },
          { text: "f'(x)=0으로 놓는다", correct: true },
          { text: "f''(x)=0으로 놓는다", correct: false },
        ],
      },
      {
        title: 'x 값 구하기',
        body: "f'(x)=0을 풀어서 극값 후보 x를 구한다.",
        example: '예) 3x²−3=0 → x²=1 → x=±1',
        choices: [
          { text: 'x 값은 부호에 관계없이 하나다', correct: false },
          { text: '방정식을 풀어 후보 x 값을 모두 구한다', correct: true },
          { text: 'x는 항상 양수만 구한다', correct: false },
        ],
      },
      {
        title: '원함수에 대입해 극값 계산',
        body: '구한 x를 원래 f(x)에 대입하여 극댓값/극솟값을 구한다.',
        example: '예) f(1)=1−3=−2, f(−1)=−1+3=2',
        choices: [
          { text: "f'(x)에 x를 대입한다", correct: false },
          { text: '원함수 f(x)에 x를 대입한다', correct: true },
          { text: '대입 없이 x만 답으로 쓴다', correct: false },
        ],
      },
    ],
  },
  max_min_judgement_confusion: {
    heroPrompt: 'a의 부호를 보고 최댓값인지 최솟값인지 먼저 판단하는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: 'a의 부호 확인',
        body: 'ax²+bx+c에서 a의 부호를 먼저 읽는다.',
        example: '예) −2x²+4x+1 → a=−2 (음수)',
        choices: [
          { text: 'c의 부호를 본다', correct: false },
          { text: 'a의 부호를 먼저 확인한다', correct: true },
          { text: 'b의 부호를 본다', correct: false },
        ],
      },
      {
        title: 'a>0이면 최솟값, a<0이면 최댓값',
        body: 'a>0이면 아래로 볼록 → 꼭짓점이 최솟값. a<0이면 위로 볼록 → 꼭짓점이 최댓값.',
        example: '예) a=−2 → 위로 볼록 → 꼭짓점이 최댓값',
        choices: [
          { text: 'a>0이면 최댓값이다', correct: false },
          { text: 'a>0이면 최솟값, a<0이면 최댓값이다', correct: true },
          { text: 'a의 부호와 극값 유형은 무관하다', correct: false },
        ],
      },
      {
        title: '꼭짓점의 y좌표가 극값',
        body: '판단 후 꼭짓점 x좌표를 구해 원래 식에 대입하여 실제 극값을 계산한다.',
        example: '예) a=−2, b=4 → x=1 → f(1)=−2+4+1=3 (최댓값)',
        choices: [
          { text: '꼭짓점 x좌표가 극값이다', correct: false },
          { text: '꼭짓점 y좌표(f(x))가 극값이다', correct: true },
          { text: '극값은 상수항 c이다', correct: false },
        ],
      },
    ],
  },
  basic_concept_needed: {
    heroPrompt: '완전제곱식에서 값과 위치를 나눠 보는 기본 해석부터 다시 떠올려볼까요?',
    thinkingSteps: [
      {
        title: '완전제곱식이란?',
        body: '(x−a)²+b 꼴로 표현된 식. 제곱 부분은 항상 0 이상이다.',
        example: '예) (x−2)²+3 → 최솟값 3, x=2일 때',
        choices: [
          { text: '완전제곱식은 ax²+bx+c 꼴이다', correct: false },
          { text: '완전제곱식은 (x−a)²+b 꼴이다', correct: true },
          { text: '완전제곱식은 항상 양수이다', correct: false },
        ],
      },
      {
        title: '값(b)과 위치(a) 구분',
        body: '극값은 b(상수항), 그 위치는 x=a이다. 두 가지를 혼동하지 않는다.',
        example: '예) (x−2)²+3 → 극값=3, 위치=x=2',
        choices: [
          { text: '극값은 a이고 위치는 b이다', correct: false },
          { text: '극값은 b이고 위치는 x=a이다', correct: true },
          { text: '극값과 위치는 모두 a이다', correct: false },
        ],
      },
      {
        title: 'a의 부호로 최대/최소 구분',
        body: 'a>0이면 (x−a)² 부분이 최소 0이므로 전체 최솟값이 b. a<0이면 최댓값.',
        example: '예) a>0 → 최솟값=b, a<0 → 최댓값=b',
        choices: [
          { text: 'a 부호와 무관하게 b가 최솟값이다', correct: false },
          { text: 'a>0이면 b가 최솟값, a<0이면 최댓값이다', correct: true },
          { text: 'a<0이면 최솟값이 존재하지 않는다', correct: false },
        ],
      },
    ],
  },
  factoring_pattern_recall: {
    heroPrompt: '곱과 합을 동시에 보며 인수분해 두 수를 찾는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '상수항 c와 x계수 b 동시에 읽기',
        body: 'x²+bx+c에서 b(합)와 c(곱)를 동시에 파악한다.',
        example: '예) x²+5x+6 → 합=5, 곱=6',
        choices: [
          { text: '계수 b만 보면 된다', correct: false },
          { text: '합 b와 곱 c를 동시에 파악한다', correct: true },
          { text: 'c만 보면 인수를 알 수 있다', correct: false },
        ],
      },
      {
        title: '곱이 c, 합이 b인 두 정수 찾기',
        body: 'c를 만드는 두 수의 조합 중 합이 b가 되는 쌍을 찾는다.',
        example: '예) 곱=6, 합=5 → 2와 3 (2×3=6, 2+3=5)',
        choices: [
          { text: '두 수의 차가 b가 되어야 한다', correct: false },
          { text: '두 수의 곱=c, 합=b인 쌍을 찾는다', correct: true },
          { text: '두 수는 항상 양수여야 한다', correct: false },
        ],
      },
      {
        title: '(x+p)(x+q) 꼴로 작성',
        body: '찾은 두 수 p, q로 (x+p)(x+q)를 쓰고 전개해서 검산한다.',
        example: '예) (x+2)(x+3) = x²+5x+6 ✓',
        choices: [
          { text: '(x−p)(x−q)로 쓴다', correct: false },
          { text: '(x+p)(x+q)로 쓰고 전개 검산한다', correct: true },
          { text: '검산은 필요 없다', correct: false },
        ],
      },
    ],
  },
  complex_factoring_difficulty: {
    heroPrompt: '공통부분을 먼저 묶거나 치환해서 단순화하는 출발점이 떠오르나요?',
    thinkingSteps: [
      {
        title: '공통인수 또는 공통부분 찾기',
        body: '모든 항에 공통으로 들어 있는 인수나 식을 먼저 찾아 앞으로 빼낸다.',
        example: '예) 2x²+4x = 2x(x+2)',
        choices: [
          { text: '공통인수 없이 바로 전개한다', correct: false },
          { text: '공통인수를 먼저 찾아 묶는다', correct: true },
          { text: '계수가 다르면 공통인수가 없다', correct: false },
        ],
      },
      {
        title: '복잡한 식은 치환으로 단순화',
        body: '반복되는 식 묶음을 A 등으로 치환하면 기본 인수분해 패턴으로 바뀐다.',
        example: '예) (x+1)²+3(x+1)+2 → A²+3A+2 → (A+1)(A+2)',
        choices: [
          { text: '치환하면 더 복잡해진다', correct: false },
          { text: '반복 묶음을 치환해 단순화한다', correct: true },
          { text: '치환은 방정식에서만 쓴다', correct: false },
        ],
      },
      {
        title: '치환 후 인수분해, 역치환',
        body: '치환한 식을 인수분해한 뒤 원래 식으로 되돌려 최종 답을 완성한다.',
        example: '예) (A+1)(A+2) → (x+2)(x+3)',
        choices: [
          { text: '치환 결과를 그대로 답으로 쓴다', correct: false },
          { text: '인수분해 후 원래 식으로 역치환한다', correct: true },
          { text: '역치환 없이 A로 남겨도 된다', correct: false },
        ],
      },
    ],
  },
  quadratic_formula_memorization: {
    heroPrompt: '근의 공식을 쓰기 전에 a, b, c를 부호 포함으로 확인하는 순서가 기억나나요?',
    thinkingSteps: [
      {
        title: 'a, b, c 부호 포함 읽기',
        body: 'ax²+bx+c에서 a, b, c를 부호 포함해서 먼저 기록한다.',
        example: '예) 2x²−3x−2 → a=2, b=−3, c=−2',
        choices: [
          { text: '부호 없이 숫자만 읽는다', correct: false },
          { text: '부호를 포함해서 a, b, c를 기록한다', correct: true },
          { text: 'a만 부호를 신경 쓴다', correct: false },
        ],
      },
      {
        title: '판별식 b²−4ac 먼저 계산',
        body: '근의 공식을 쓰기 전에 b²−4ac를 따로 계산해서 근의 종류를 파악한다.',
        example: '예) b=−3, a=2, c=−2 → (−3)²−4(2)(−2)=9+16=25',
        choices: [
          { text: '판별식 계산은 선택 사항이다', correct: false },
          { text: '판별식을 먼저 계산하고 근의 종류를 파악한다', correct: true },
          { text: 'b²만 계산하면 된다', correct: false },
        ],
      },
      {
        title: '근의 공식에 대입',
        body: 'x = (−b ± √(b²−4ac)) / 2a에 a, b, 판별식 값을 대입한다.',
        example: '예) x = (3 ± √25) / 4 = (3 ± 5) / 4 → x=2 또는 x=−1/2',
        choices: [
          { text: 'x = (b ± √(b²−4ac)) / 2a이다', correct: false },
          { text: 'x = (−b ± √(b²−4ac)) / 2a이다', correct: true },
          { text: 'x = (−b ± √(b²+4ac)) / 2a이다', correct: false },
        ],
      },
    ],
  },
  radical_simplification_error: {
    heroPrompt: '근호 안 수를 소인수분해하고 제곱 묶음을 밖으로 꺼내는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '소인수분해로 내부 분석',
        body: '근호 안의 수를 소인수분해하여 제곱 묶음을 찾는다.',
        example: '예) √72 → √(4×18) → √(4×9×2)',
        choices: [
          { text: '근호 안을 그대로 둔다', correct: false },
          { text: '소인수분해로 제곱 묶음을 찾는다', correct: true },
          { text: '약분만 하면 단순화된다', correct: false },
        ],
      },
      {
        title: '제곱 묶음을 근호 밖으로',
        body: '√(a²×b) = a√b 규칙으로 완전제곱인 부분을 근호 밖으로 꺼낸다.',
        example: '예) √(4×9×2) = 2×3×√2 = 6√2',
        choices: [
          { text: '√(a²×b) = a²×√b이다', correct: false },
          { text: '√(a²×b) = a√b이다', correct: true },
          { text: '제곱은 근호 안에 그대로 둔다', correct: false },
        ],
      },
      {
        title: '계수끼리 곱해서 정리',
        body: '근호 밖으로 나온 수들을 모두 곱하여 최종 계수를 구한다.',
        example: '예) 6√2 → 계수 6, 근호 안 2',
        choices: [
          { text: '계수를 더해서 정리한다', correct: false },
          { text: '근호 밖 수를 모두 곱한다', correct: true },
          { text: '계수는 마지막에 구한다', correct: false },
        ],
      },
    ],
  },
  rationalization_error: {
    heroPrompt: '분모 유리화에서 같은 근호를 분자와 분모에 함께 곱하는 이유가 떠오르나요?',
    thinkingSteps: [
      {
        title: '분모의 근호 확인',
        body: '분모에 √a가 있으면 유리화가 필요한지 확인한다.',
        example: '예) 3/√2 → 분모에 √2 존재',
        choices: [
          { text: '분자에 근호가 있으면 유리화한다', correct: false },
          { text: '분모에 근호가 있으면 유리화한다', correct: true },
          { text: '근호가 있으면 항상 유리화한다', correct: false },
        ],
      },
      {
        title: '분자, 분모에 √a를 곱하기',
        body: '값을 바꾸지 않으려면 분자와 분모에 같은 √a를 곱해야 한다(×1과 동일).',
        example: '예) 3/√2 × √2/√2 = 3√2/2',
        choices: [
          { text: '분모에만 √a를 곱한다', correct: false },
          { text: '분자와 분모 모두에 √a를 곱한다', correct: true },
          { text: '분자에만 √a를 곱한다', correct: false },
        ],
      },
      {
        title: '√a × √a = a로 분모 정리',
        body: '√a × √a = a이므로 분모가 유리수(정수)가 된다.',
        example: '예) √2 × √2 = 2 → 분모 2',
        choices: [
          { text: '√a × √a = 2a이다', correct: false },
          { text: '√a × √a = a이다', correct: true },
          { text: '√a × √a = √(2a)이다', correct: false },
        ],
      },
    ],
  },
  expansion_sign_error: {
    heroPrompt: '괄호 앞 음수는 첫 항이 아니라 괄호 전체에 분배된다는 기준이 기억나나요?',
    thinkingSteps: [
      {
        title: '괄호 앞 부호 확인',
        body: '전개 전에 괄호 앞에 있는 부호(+/−)를 먼저 확인한다.',
        example: '예) −(2x+3) → 앞에 −1이 곱해진 것',
        choices: [
          { text: '괄호 앞 부호는 첫 항에만 적용된다', correct: false },
          { text: '괄호 앞 부호를 먼저 확인한다', correct: true },
          { text: '부호는 전개 후에 붙인다', correct: false },
        ],
      },
      {
        title: '부호를 괄호 안 모든 항에 분배',
        body: '−(a+b) = −a−b처럼 부호가 괄호 안 모든 항에 분배된다.',
        example: '예) −(2x+3) = −2x−3',
        choices: [
          { text: '−(a+b) = −a+b이다', correct: false },
          { text: '−(a+b) = −a−b이다', correct: true },
          { text: '부호는 첫 항에만 붙는다', correct: false },
        ],
      },
      {
        title: '전개 결과 검산',
        body: '전개한 결과를 다시 괄호로 묶어 원래 식과 같은지 확인한다.',
        example: '예) −2x−3을 묶으면 −(2x+3) → 원식과 동일 ✓',
        choices: [
          { text: '검산은 시간이 오래 걸려 생략한다', correct: false },
          { text: '전개 후 역으로 묶어서 검산한다', correct: true },
          { text: '전개만 맞으면 검산은 불필요하다', correct: false },
        ],
      },
    ],
  },
  like_terms_error: {
    heroPrompt: '전개 뒤에는 차수별로 묶어서 합산해야 한다는 순서가 아직 떠오르나요?',
    thinkingSteps: [
      {
        title: '전개 후 모든 항 나열',
        body: '괄호를 모두 전개한 뒤 모든 항을 나열한다.',
        example: '예) (x+2)(x+3) = x²+3x+2x+6',
        choices: [
          { text: '전개와 동시에 합친다', correct: false },
          { text: '전개 후 항을 먼저 나열한다', correct: true },
          { text: '괄호 안 항만 합산한다', correct: false },
        ],
      },
      {
        title: '차수별로 묶기',
        body: '동류항끼리(같은 차수끼리) 묶어서 정리한다.',
        example: '예) x², 3x+2x, 6 → x²+5x+6',
        choices: [
          { text: '모든 항을 순서대로 더한다', correct: false },
          { text: '같은 차수의 항끼리 묶는다', correct: true },
          { text: '계수가 같은 항끼리 묶는다', correct: false },
        ],
      },
      {
        title: '계수 합산으로 정리',
        body: '묶인 동류항의 계수를 합산하여 최종 식을 완성한다.',
        example: '예) 3x+2x = (3+2)x = 5x',
        choices: [
          { text: '계수를 곱해서 합친다', correct: false },
          { text: '계수를 더해서 동류항을 합친다', correct: true },
          { text: '계수는 그대로 나열한다', correct: false },
        ],
      },
    ],
  },
  imaginary_unit_confusion: {
    heroPrompt: 'i^2가 보이면 바로 -1로 바꿔 쓰는 습관, 다시 떠올릴 수 있나요?',
    thinkingSteps: [
      {
        title: 'i² = −1 기억',
        body: '허수 단위 i는 i²=−1로 정의된다. 이 규칙 하나로 모든 허수 계산이 시작된다.',
        example: '예) i²=−1, i³=−i, i⁴=1',
        choices: [
          { text: 'i²=1이다', correct: false },
          { text: 'i²=−1이다', correct: true },
          { text: 'i²=i이다', correct: false },
        ],
      },
      {
        title: 'i² 발견 즉시 −1로 교체',
        body: '식에서 i²가 나오는 순간 −1로 바꿔 쓴다. 미루지 않는다.',
        example: '예) 3i²+2i = 3(−1)+2i = −3+2i',
        choices: [
          { text: 'i²를 마지막에 치환한다', correct: false },
          { text: 'i²가 보이면 바로 −1로 교체한다', correct: true },
          { text: 'i²는 계산 마지막에 처리한다', correct: false },
        ],
      },
      {
        title: '실수부와 허수부 분리 확인',
        body: '교체 후 실수부(i 없는 항)와 허수부(i 있는 항)가 올바르게 분리됐는지 확인한다.',
        example: '예) −3+2i → 실수부 −3, 허수부 2i',
        choices: [
          { text: '실수부와 허수부를 더한다', correct: false },
          { text: '실수부와 허수부를 분리해서 확인한다', correct: true },
          { text: '허수부는 무시하고 실수부만 쓴다', correct: false },
        ],
      },
    ],
  },
  complex_calc_error: {
    heroPrompt: '복소수 계산은 전개 뒤 실수부와 허수부를 따로 모아 정리하는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        title: '괄호 전개 후 i² 처리',
        body: '복소수 곱셈은 괄호를 전개한 뒤 나타나는 i²를 −1로 교체한다.',
        example: '예) (2+i)(1+3i) = 2+6i+i+3i² = 2+7i−3',
        choices: [
          { text: 'i²는 그대로 남긴다', correct: false },
          { text: '전개 후 i²를 −1로 교체한다', correct: true },
          { text: 'i²=1로 교체한다', correct: false },
        ],
      },
      {
        title: '실수부끼리 합산',
        body: 'i 없는 항(실수부)끼리 모아서 합산한다.',
        example: '예) 2+(−3) = −1',
        choices: [
          { text: '실수부와 허수부를 함께 더한다', correct: false },
          { text: '실수부끼리 먼저 합산한다', correct: true },
          { text: '실수부는 변하지 않는다', correct: false },
        ],
      },
      {
        title: '허수부끼리 합산 후 최종 정리',
        body: 'i가 붙은 항(허수부)끼리 모아서 합산하여 최종 복소수를 완성한다.',
        example: '예) 6i+i = 7i → 최종: −1+7i',
        choices: [
          { text: '허수부 계수를 곱한다', correct: false },
          { text: '허수부 계수를 더해서 정리한다', correct: true },
          { text: '허수부는 실수부보다 작아야 한다', correct: false },
        ],
      },
    ],
  },
  remainder_substitution_error: {
    heroPrompt: '나머지정리에서는 x-a=0에서 a를 먼저 구해 P(a)에 넣는다는 기준이 떠오르나요?',
    thinkingSteps: [
      {
        title: 'x−a=0에서 a 구하기',
        body: '제수(나누는 식)가 x−a이면 x−a=0에서 x=a를 구한다.',
        example: '예) x−2로 나눌 때 → x=2',
        choices: [
          { text: 'x=−a를 구한다', correct: false },
          { text: 'x−a=0에서 x=a를 구한다', correct: true },
          { text: 'x=0을 대입한다', correct: false },
        ],
      },
      {
        title: 'P(a)에 a 대입하여 계산',
        body: '나머지는 P(a)이므로 구한 x=a를 다항식 P(x)에 대입하여 계산한다.',
        example: '예) P(x)=x²+3, a=2 → P(2)=4+3=7 (나머지=7)',
        choices: [
          { text: 'P(0)을 계산한다', correct: false },
          { text: 'P(a)에 x=a를 대입한다', correct: true },
          { text: 'P(x)에 제수를 대입한다', correct: false },
        ],
      },
      {
        title: '결과가 나머지임을 확인',
        body: 'P(a)의 계산 결과가 P(x)를 (x−a)로 나눈 나머지이다.',
        example: '예) P(2)=7 → 나머지 7',
        choices: [
          { text: 'P(a)는 몫이다', correct: false },
          { text: 'P(a)가 바로 나머지이다', correct: true },
          { text: 'P(a)에서 1을 빼면 나머지이다', correct: false },
        ],
      },
    ],
  },
  simultaneous_equation_error: {
    heroPrompt: '조건을 식 두 개로 먼저 정리하고 연립으로 푸는 시작점이 기억나나요?',
    thinkingSteps: [
      {
        title: '조건을 식 두 개로 변환',
        body: '문제에서 주어진 두 조건을 각각 x, y에 대한 방정식으로 옮겨 쓴다.',
        example: '예) 합=10, 차=4 → x+y=10, x−y=4',
        choices: [
          { text: '조건 하나만 식으로 변환한다', correct: false },
          { text: '두 조건 모두 방정식으로 변환한다', correct: true },
          { text: '조건은 암산으로 처리한다', correct: false },
        ],
      },
      {
        title: '한 변수 소거',
        body: '두 식을 더하거나 빼서 변수 하나를 없애 단일 방정식으로 만든다.',
        example: '예) (x+y=10)+(x−y=4) → 2x=14 → x=7',
        choices: [
          { text: '두 식을 곱해서 소거한다', correct: false },
          { text: '두 식을 더하거나 빼서 변수를 소거한다', correct: true },
          { text: '두 식 중 하나를 버린다', correct: false },
        ],
      },
      {
        title: '구한 값을 대입해 나머지 변수 계산',
        body: '구한 x를 한 식에 대입하여 y를 구하고, 두 식 모두 성립하는지 검산한다.',
        example: '예) x=7을 x+y=10에 대입 → y=3',
        choices: [
          { text: '한 식에만 검산한다', correct: false },
          { text: '두 식 모두 대입해 검산한다', correct: true },
          { text: '대입 없이 x만 답으로 쓴다', correct: false },
        ],
      },
    ],
  },
  counting_method_confusion: {
    heroPrompt: '경우의 수는 먼저 순서가 중요한지부터 확인해야 한다는 기준이 떠오르나요?',
    thinkingSteps: [
      {
        title: '순서 중요 여부 먼저 판단',
        body: 'AB와 BA가 다른 경우인지(순열) 같은 경우인지(조합) 먼저 판단한다.',
        example: '예) 줄 세우기 → 순서 중요 → 순열, 모둠 구성 → 순서 무관 → 조합',
        choices: [
          { text: '항상 순열을 쓴다', correct: false },
          { text: '순서 중요 여부를 먼저 판단한다', correct: true },
          { text: '항상 조합을 쓴다', correct: false },
        ],
      },
      {
        title: '순열: nPr = n!/(n−r)!',
        body: '순서가 중요하면 nPr 공식으로 경우의 수를 구한다.',
        example: '예) 5명 중 3명 줄 세우기 → 5P3 = 5×4×3 = 60',
        choices: [
          { text: '순열 = nCr이다', correct: false },
          { text: '순열 = nPr = n!/(n−r)!이다', correct: true },
          { text: '순열 = n!이다', correct: false },
        ],
      },
      {
        title: '조합: nCr = n!/(r!(n−r)!)',
        body: '순서가 무관하면 nCr 공식으로 경우의 수를 구한다.',
        example: '예) 5명 중 3명 모둠 구성 → 5C3 = 10',
        choices: [
          { text: '조합 = nPr이다', correct: false },
          { text: '조합 = nCr = n!/(r!(n−r)!)이다', correct: true },
          { text: '조합 = n×r이다', correct: false },
        ],
      },
    ],
  },
  counting_overcounting: {
    heroPrompt: '경우를 셀 때 중복을 막으려면 직접 나열하거나 표로 확인해야 한다는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        title: '모든 경우 나열 또는 표 작성',
        body: '경우의 수가 적으면 직접 나열하고, 많으면 표로 정리하여 시각적으로 파악한다.',
        example: '예) 동전 2개: HH, HT, TH, TT → 4가지',
        choices: [
          { text: '항상 공식으로만 계산한다', correct: false },
          { text: '나열 또는 표로 경우를 파악한다', correct: true },
          { text: '나열은 시간 낭비다', correct: false },
        ],
      },
      {
        title: '중복 패턴 찾기',
        body: '나열된 경우 중 동일한 경우를 찾아 표시한다.',
        example: '예) AB와 BA가 같은 경우면 → 중복 1쌍 발생',
        choices: [
          { text: '중복은 항상 없다', correct: false },
          { text: '나열 후 동일 경우를 직접 찾는다', correct: true },
          { text: '중복은 공식으로만 처리한다', correct: false },
        ],
      },
      {
        title: '중복 제거 후 최종 집계',
        body: '중복으로 셀 위험이 있는 경우를 제거하거나, 조합 공식으로 나눠서 최종 답을 낸다.',
        example: '예) 3명 중 2명 선택: 나열 6가지 ÷ 2 = 3가지 (조합)',
        choices: [
          { text: '중복을 포함해서 답으로 쓴다', correct: false },
          { text: '중복을 제거하거나 나눠서 최종 답을 낸다', correct: true },
          { text: '중복은 더하면 된다', correct: false },
        ],
      },
    ],
  },

  // ─── 고2 공통 ────────────────────────────────────────────────────
  g2_set_operation: {
    heroPrompt: '합집합과 교집합 계산에서 원소를 세는 순서를 다시 떠올려볼게요.',
    thinkingSteps: [
      {
        title: '두 집합 원소 나열',
        body: 'A와 B의 원소를 각각 적고, 공통 원소를 먼저 찾는다.',
        example: '예) A={1,2,3}, B={2,3,4} → 공통: {2,3}',
        choices: [
          { text: '공통 원소를 먼저 찾아야 한다', correct: true },
          { text: '두 집합을 그냥 합쳐서 세면 된다', correct: false },
          { text: '원소 개수만 더하면 된다', correct: false },
        ],
      },
      {
        title: '합집합 구성',
        body: 'A∪B는 A와 B의 모든 원소를 중복 없이 모은 집합이다.',
        example: '예) A∪B = {1,2,3,4}',
        choices: [
          { text: '중복 원소는 한 번만 쓴다', correct: true },
          { text: '중복 원소는 두 번 써야 한다', correct: false },
          { text: '합집합은 더 큰 집합만 가리킨다', correct: false },
        ],
      },
      {
        title: 'n(A∪B) 공식 적용',
        body: 'n(A∪B) = n(A) + n(B) - n(A∩B)로 원소 개수를 계산한다.',
        example: '예) n(A)=3, n(B)=3, n(A∩B)=2 → n(A∪B)=4',
        choices: [
          { text: '공통 원소 개수를 한 번 뺀다', correct: true },
          { text: '공통 원소 개수를 더한다', correct: false },
          { text: '공통 원소가 없어도 빼야 한다', correct: false },
        ],
      },
    ],
  },
  g2_set_complement: {
    heroPrompt: '여집합을 구할 때 전체집합 U를 기준으로 생각하는 흐름을 확인해볼게요.',
    thinkingSteps: [
      {
        title: '전체집합 U 확인',
        body: '문제에서 전체집합 U가 무엇인지 먼저 명시적으로 적는다.',
        example: '예) U={1,2,3,4,5,6}',
        choices: [
          { text: 'U를 먼저 확인해야 한다', correct: true },
          { text: 'U 없이 여집합을 바로 구할 수 있다', correct: false },
          { text: 'U는 항상 자연수 전체이다', correct: false },
        ],
      },
      {
        title: 'A의 원소 제거',
        body: 'A^c = U에서 A의 원소를 모두 제거한 나머지 집합이다.',
        example: '예) A={2,4} → A^c = {1,3,5,6}',
        choices: [
          { text: 'U에서 A를 빼면 A^c가 된다', correct: true },
          { text: 'A에서 U를 빼면 A^c가 된다', correct: false },
          { text: 'A^c는 A의 원소를 뒤집은 것이다', correct: false },
        ],
      },
      {
        title: '검증',
        body: 'A와 A^c를 합하면 반드시 U가 되어야 한다.',
        example: '예) A∪A^c = {1,2,3,4,5,6} = U 확인',
        choices: [
          { text: 'A와 A^c를 합치면 U가 된다', correct: true },
          { text: 'A와 A^c의 교집합이 U이다', correct: false },
          { text: 'A와 A^c의 원소 개수는 항상 같다', correct: false },
        ],
      },
    ],
  },
  g2_set_count: {
    heroPrompt: '원소 개수 공식 n(A∪B) = n(A)+n(B)-n(A∩B)를 단계별로 적용해볼게요.',
    thinkingSteps: [
      {
        title: 'n(A∩B) 먼저',
        body: '공식에서 빼야 하는 n(A∩B)를 먼저 구한다.',
        example: '예) A={1,2,3,4}, B={3,4,5} → n(A∩B)=2',
        choices: [
          { text: 'n(A∩B)를 먼저 구해야 한다', correct: true },
          { text: 'n(A∪B)를 먼저 세면 된다', correct: false },
          { text: 'n(A)와 n(B)만 알면 충분하다', correct: false },
        ],
      },
      {
        title: '공식 대입',
        body: 'n(A∪B) = n(A)+n(B)-n(A∩B)에 각 값을 대입한다.',
        example: '예) 4+3-2 = 5',
        choices: [
          { text: 'n(A∩B)를 한 번만 뺀다', correct: true },
          { text: 'n(A∩B)를 두 번 뺀다', correct: false },
          { text: 'n(A∩B)를 더한다', correct: false },
        ],
      },
      {
        title: '검증',
        body: '결과가 max(n(A), n(B)) 이상이고 n(A)+n(B) 이하인지 확인한다.',
        example: '예) n(A∪B)=5: 4≤5≤7 ✓',
        choices: [
          { text: 'n(A∪B) ≤ n(A)+n(B)이어야 한다', correct: true },
          { text: 'n(A∪B)는 항상 n(A)+n(B)와 같다', correct: false },
          { text: 'n(A∪B)는 두 집합 중 작은 것보다 작을 수 있다', correct: false },
        ],
      },
    ],
  },
  g2_prop_contrapositive: {
    heroPrompt: '역·이·대우 중 어느 것인지 헷갈릴 때는 표를 직접 채워보는 게 가장 빠릅니다.',
    thinkingSteps: [
      {
        title: 'p→q 원래 명제 확인',
        body: '주어진 명제에서 가설 p와 결론 q를 분리한다.',
        example: '예) "짝수이면 정수이다" → p:짝수, q:정수',
        choices: [
          { text: '가설과 결론을 먼저 분리한다', correct: true },
          { text: '명제 전체를 통째로 뒤집는다', correct: false },
          { text: 'p와 q의 구분은 중요하지 않다', correct: false },
        ],
      },
      {
        title: '역·이·대우 정의 적용',
        body: '역: q→p, 이: ~p→~q, 대우: ~q→~p',
        example: '역: "정수이면 짝수이다" / 대우: "정수가 아니면 짝수가 아니다"',
        choices: [
          { text: '대우는 p와 q를 모두 부정하고 순서를 바꾼다', correct: true },
          { text: '역은 p와 q를 모두 부정한다', correct: false },
          { text: '이는 p와 q의 순서만 바꾼다', correct: false },
        ],
      },
      {
        title: '참·거짓 관계',
        body: '원명제와 대우는 항상 참·거짓이 같다. 역과 이도 서로 참·거짓이 같다.',
        example: '원명제 참 → 대우 참 / 역은 별도 판단',
        choices: [
          { text: '원명제가 참이면 대우도 참이다', correct: true },
          { text: '원명제가 참이면 역도 반드시 참이다', correct: false },
          { text: '원명제와 이는 항상 참·거짓이 같다', correct: false },
        ],
      },
    ],
  },
  g2_prop_necessary_sufficient: {
    heroPrompt: '필요조건·충분조건은 화살표 방향으로 정리하면 헷갈리지 않아요.',
    thinkingSteps: [
      {
        title: 'p→q 화살표 방향 확인',
        body: 'p→q가 참이면 p는 q의 충분조건, q는 p의 필요조건이다.',
        example: '예) "정삼각형 → 이등변삼각형": 정삼각형은 이등변삼각형의 충분조건',
        choices: [
          { text: 'p→q이면 p가 충분조건이다', correct: true },
          { text: 'p→q이면 p가 필요조건이다', correct: false },
          { text: '화살표 방향은 조건 판단과 무관하다', correct: false },
        ],
      },
      {
        title: '역방향 q→p 확인',
        body: 'q→p도 참이면 p와 q는 서로 필요충분조건(동치)이다.',
        example: '예) 이등변삼각형이 정삼각형은 아니므로 q→p는 거짓 → 충분조건만',
        choices: [
          { text: '두 방향 모두 참이어야 필요충분조건이다', correct: true },
          { text: '한 방향만 참이어도 필요충분조건이다', correct: false },
          { text: '필요충분조건은 반례가 있어도 성립한다', correct: false },
        ],
      },
      {
        title: '결론 도출',
        body: '화살표 방향을 정리하여 필요조건·충분조건·필요충분조건 중 하나를 선택한다.',
        example: 'p→q만 참: p는 충분조건, q는 필요조건',
        choices: [
          { text: 'p→q만 참이면 p는 충분조건, q는 필요조건이다', correct: true },
          { text: 'p→q만 참이면 p는 필요조건이다', correct: false },
          { text: '두 방향 중 하나만 참이면 동치이다', correct: false },
        ],
      },
    ],
  },
  g2_prop_quantifier: {
    heroPrompt: '"모든"과 "어떤" 명제를 판별할 때는 반례 또는 예시 하나로 판단할 수 있어요.',
    thinkingSteps: [
      {
        title: '명제 유형 파악',
        body: '"모든 x에 대해 P(x)"는 전칭 명제, "어떤 x에 대해 P(x)"는 존재 명제이다.',
        example: '"모든 실수 x에 대해 x²≥0" vs "어떤 실수 x에 대해 x²<0"',
        choices: [
          { text: '"모든"은 전칭, "어떤"은 존재 명제이다', correct: true },
          { text: '"어떤"은 전칭, "모든"은 존재 명제이다', correct: false },
          { text: '두 유형은 판별 방법이 같다', correct: false },
        ],
      },
      {
        title: '거짓/참 판별 전략',
        body: '전칭 명제는 반례 하나로 거짓. 존재 명제는 예시 하나로 참.',
        example: '"모든 정수 n에서 n²은 짝수" → n=1: 1²=1(홀수) → 반례 → 거짓',
        choices: [
          { text: '전칭 명제는 반례 하나로 거짓이 된다', correct: true },
          { text: '전칭 명제는 예시 하나로 참이 된다', correct: false },
          { text: '존재 명제는 반례로 참을 판별한다', correct: false },
        ],
      },
      {
        title: '부정 명제 확인',
        body: '"모든 x에 대해 P(x)"의 부정은 "어떤 x에 대해 ~P(x)"이다.',
        example: '"모든 x: x²≥0"의 부정 → "어떤 x: x²<0"',
        choices: [
          { text: '"모든"의 부정은 "어떤 ~"이다', correct: true },
          { text: '"모든"의 부정은 "모든 ~"이다', correct: false },
          { text: '전칭 명제의 부정은 전칭 명제이다', correct: false },
        ],
      },
    ],
  },
  g2_trig_unit_circle: {
    heroPrompt: '삼각함수 단위원에서 좌표를 읽는 방법을 다시 떠올려볼게요.',
    thinkingSteps: [
      {
        title: '단위원의 기본',
        body: '각도 θ에서 단위원 위 점의 좌표는 (cosθ, sinθ)이다.',
        example: '예) θ=90° → (cos90°, sin90°) = (0, 1)',
        choices: [
          { text: 'x좌표=cosθ, y좌표=sinθ이다', correct: true },
          { text: 'x좌표=sinθ, y좌표=cosθ이다', correct: false },
          { text: '좌표는 각도와 무관하다', correct: false },
        ],
      },
      {
        title: '사분면 부호 판단',
        body: '각도가 속한 사분면에 따라 sin·cos·tan의 부호가 결정된다.',
        example: '2사분면: sinθ>0, cosθ<0, tanθ<0',
        choices: [
          { text: '사분면을 먼저 확인하고 부호를 결정한다', correct: true },
          { text: '부호는 항상 양수이다', correct: false },
          { text: '사분면은 값에 영향을 주지 않는다', correct: false },
        ],
      },
      {
        title: '특수각 값 적용',
        body: '30°·45°·60°의 sin·cos값을 기억에서 꺼내 대입한다.',
        example: 'sin30°=1/2, cos30°=√3/2, sin45°=√2/2',
        choices: [
          { text: '특수각 값을 외워두어야 한다', correct: true },
          { text: '특수각 값은 매번 계산한다', correct: false },
          { text: '특수각 외 각도는 같은 값을 쓴다', correct: false },
        ],
      },
    ],
  },
  g2_trig_equation_range: {
    heroPrompt: '삼각방정식 풀이에서 범위 설정이 핵심입니다. 단위원에서 해를 모두 찾아볼게요.',
    thinkingSteps: [
      {
        title: '기본 해 구하기',
        body: '단위원에서 주어진 삼각함수 값을 만족하는 각도를 먼저 찾는다.',
        example: 'sinθ=1/2 → θ=30° (1사분면 기본각)',
        choices: [
          { text: '기본각을 먼저 구한다', correct: true },
          { text: '범위부터 먼저 확인한다', correct: false },
          { text: '해는 항상 하나이다', correct: false },
        ],
      },
      {
        title: '대칭 해 추가',
        body: '단위원의 대칭성으로 같은 값을 갖는 각도를 추가로 찾는다.',
        example: 'sinθ=1/2 → 1사분면 30°, 2사분면 150° (두 해)',
        choices: [
          { text: '대칭 각도를 추가로 찾아야 한다', correct: true },
          { text: '기본각 하나만으로 충분하다', correct: false },
          { text: '대칭 해는 항상 존재하지 않는다', correct: false },
        ],
      },
      {
        title: '주어진 범위로 필터링',
        body: '찾은 해 중 문제에서 주어진 θ의 범위에 해당하는 것만 최종 답으로 선택한다.',
        example: '0≤θ<2π → 30°(=π/6), 150°(=5π/6) 모두 포함',
        choices: [
          { text: '범위를 벗어난 해는 제외한다', correct: true },
          { text: '모든 해를 답으로 쓴다', correct: false },
          { text: '범위는 확인하지 않아도 된다', correct: false },
        ],
      },
    ],
  },
  g2_trig_identity: {
    heroPrompt: '삼각함수 항등식을 적용하기 전에 sin·cos·tan의 관계를 먼저 적어볼게요.',
    thinkingSteps: [
      {
        title: '기본 항등식 확인',
        body: 'sin²θ+cos²θ=1, tanθ=sinθ/cosθ를 먼저 적는다.',
        example: 'sin²θ+cos²θ=1 → cos²θ=1-sin²θ로 변환 가능',
        choices: [
          { text: '기본 항등식을 먼저 적어야 한다', correct: true },
          { text: '항등식 없이 바로 계산한다', correct: false },
          { text: '항등식은 특정 각도에서만 성립한다', correct: false },
        ],
      },
      {
        title: '치환 방향 결정',
        body: '식에서 sin과 cos 중 하나로 통일할지, 아니면 tan으로 변환할지 결정한다.',
        example: '1-cos²θ → sin²θ로 치환하여 단순화',
        choices: [
          { text: '하나의 함수로 통일하면 계산이 쉬워진다', correct: true },
          { text: '항상 tanθ로 변환해야 한다', correct: false },
          { text: '치환 없이 원형을 유지해야 한다', correct: false },
        ],
      },
      {
        title: '변환 후 계산',
        body: '치환 후 식을 정리하고 최종 값을 계산한다.',
        example: 'sin²θ+sinθ·cosθ = sinθ(sinθ+cosθ)로 인수분해',
        choices: [
          { text: '치환 후 인수분해나 간소화를 시도한다', correct: true },
          { text: '치환 후 바로 답이 나온다', correct: false },
          { text: '변환 후에도 항등식을 다시 쓴다', correct: false },
        ],
      },
    ],
  },
  g2_poly_factoring: {
    heroPrompt: '고차 다항식 인수분해에서는 인수정리를 활용해 근을 먼저 찾아볼게요.',
    thinkingSteps: [
      {
        title: '상수항 약수 대입',
        body: '상수항의 약수를 x에 대입하여 f(x)=0이 되는 값을 찾는다.',
        example: 'f(x)=x³-6x²+11x-6에서 f(1)=0 → (x-1)이 인수',
        choices: [
          { text: '상수항 약수를 대입해 근을 찾는다', correct: true },
          { text: '최고차 계수 약수를 대입한다', correct: false },
          { text: '대입 없이 인수를 바로 쓴다', correct: false },
        ],
      },
      {
        title: '조립제법으로 나누기',
        body: '찾은 근 a로 조립제법 또는 다항식 나눗셈을 수행한다.',
        example: 'f(x) ÷ (x-1) = x²-5x+6',
        choices: [
          { text: '조립제법으로 나머지 없이 나누어진다', correct: true },
          { text: '조립제법에서 나머지가 남아도 된다', correct: false },
          { text: '나눗셈 없이 인수를 바로 적는다', correct: false },
        ],
      },
      {
        title: '몫 추가 인수분해',
        body: '나눗셈의 몫을 다시 인수분해하여 완전히 분해한다.',
        example: 'x²-5x+6 = (x-2)(x-3) → f(x)=(x-1)(x-2)(x-3)',
        choices: [
          { text: '몫을 다시 인수분해해야 완성된다', correct: true },
          { text: '첫 번째 인수 하나면 충분하다', correct: false },
          { text: '몫은 더 이상 인수분해할 수 없다', correct: false },
        ],
      },
    ],
  },
  g2_poly_remainder: {
    heroPrompt: '나머지정리: f(x)를 (x-a)로 나눈 나머지는 f(a)입니다. 이 흐름을 확인해볼게요.',
    thinkingSteps: [
      {
        title: '나누는 식의 근 확인',
        body: '(x-a)로 나눌 때 나머지는 f(a). 근 a를 먼저 구한다.',
        example: '(x-2)로 나누면 근=2 → 나머지=f(2)',
        choices: [
          { text: '나누는 식의 근을 먼저 구한다', correct: true },
          { text: '나누는 식의 계수를 대입한다', correct: false },
          { text: '나머지는 항상 0이다', correct: false },
        ],
      },
      {
        title: 'f(a) 계산',
        body: 'x=a를 f(x)에 대입하여 나머지 값을 계산한다.',
        example: 'f(x)=x³-2x+1에서 f(2)=8-4+1=5 → 나머지=5',
        choices: [
          { text: 'x=a를 f(x)에 대입한다', correct: true },
          { text: 'x=0을 대입한다', correct: false },
          { text: 'f(x)를 직접 나눈 값을 구한다', correct: false },
        ],
      },
      {
        title: '인수정리 활용',
        body: 'f(a)=0이면 (x-a)는 f(x)의 인수. 이를 활용해 인수분해와 연결한다.',
        example: 'f(2)=0 → (x-2)는 f(x)의 인수 → 조립제법으로 분해',
        choices: [
          { text: 'f(a)=0이면 (x-a)가 인수이다', correct: true },
          { text: 'f(a)=0이어도 인수가 아닐 수 있다', correct: false },
          { text: '인수정리는 나머지정리와 다른 개념이다', correct: false },
        ],
      },
    ],
  },
  g2_eq_setup: {
    heroPrompt: '방정식을 세우는 단계에서 조건을 하나씩 식으로 옮기는 연습을 해볼게요.',
    thinkingSteps: [
      {
        title: '구하는 값 정의',
        body: '문제에서 구하는 것을 x(또는 다른 변수)로 놓고 명시적으로 적는다.',
        example: '"두 수의 합이 10" → 작은 수를 x, 큰 수를 10-x로 놓기',
        choices: [
          { text: '구하는 값을 변수로 먼저 정의한다', correct: true },
          { text: '바로 방정식을 세운다', correct: false },
          { text: '변수 없이 풀 수 있다', correct: false },
        ],
      },
      {
        title: '조건을 식으로 변환',
        body: '문제의 각 조건을 변수를 이용한 등식·부등식으로 변환한다.',
        example: '"두 수의 곱이 21" → x(10-x)=21',
        choices: [
          { text: '조건 하나씩 식으로 적는다', correct: true },
          { text: '모든 조건을 한 번에 식으로 쓴다', correct: false },
          { text: '조건은 무시하고 풀이 공식을 쓴다', correct: false },
        ],
      },
      {
        title: '풀기 + 검증',
        body: '방정식을 풀어 x 값을 구하고, 원래 조건에 대입하여 검증한다.',
        example: 'x(10-x)=21 → x=3 또는 7. 조건 확인: 3×7=21 ✓',
        choices: [
          { text: '답을 원래 조건에 대입해 검증한다', correct: true },
          { text: '방정식의 해가 바로 최종 답이다', correct: false },
          { text: '검증은 필요하지 않다', correct: false },
        ],
      },
    ],
  },
  g2_radical_simplify: {
    heroPrompt: '무리식 간소화는 소인수분해에서 시작합니다. 순서를 확인해볼게요.',
    thinkingSteps: [
      {
        title: '근호 안 소인수분해',
        body: '근호 안의 수를 소인수분해하여 제곱수를 찾는다.',
        example: '√18 = √(2·3²) → 3²을 밖으로 꺼낼 수 있다',
        choices: [
          { text: '소인수분해로 제곱수를 찾는다', correct: true },
          { text: '근호 안 수를 반으로 나눈다', correct: false },
          { text: '소인수분해 없이 간소화할 수 있다', correct: false },
        ],
      },
      {
        title: '제곱수 밖으로 꺼내기',
        body: '√(a²·b) = a√b 규칙으로 제곱수의 제곱근을 근호 밖으로 꺼낸다.',
        example: '√18 = √(9·2) = 3√2',
        choices: [
          { text: '제곱수의 양의 제곱근을 밖으로 꺼낸다', correct: true },
          { text: '제곱수를 그대로 근호 안에 둔다', correct: false },
          { text: '제곱수를 나누기로 처리한다', correct: false },
        ],
      },
      {
        title: '동류항 합산',
        body: '간소화 후 √a 형태가 같은 항끼리 계수를 더하거나 뺀다.',
        example: '3√2 - 2√2 + √2 = (3-2+1)√2 = 2√2',
        choices: [
          { text: '√a 앞 계수끼리만 더하거나 뺀다', correct: true },
          { text: '근호 안 수도 함께 더한다', correct: false },
          { text: '√a가 같아도 합산할 수 없다', correct: false },
        ],
      },
    ],
  },
  g2_radical_rationalize: {
    heroPrompt: '분모 유리화는 켤레식을 곱하는 것부터 시작합니다. 단계별로 확인해볼게요.',
    thinkingSteps: [
      {
        title: '분모 유형 확인',
        body: '분모가 √a이면 √a를, a+√b이면 켤레 a-√b를 곱한다.',
        example: '1/(2+√3) → 켤레: (2-√3)',
        choices: [
          { text: '분모의 켤레를 분자·분모 모두 곱한다', correct: true },
          { text: '분자에만 켤레를 곱한다', correct: false },
          { text: '분모에만 켤레를 곱한다', correct: false },
        ],
      },
      {
        title: '분모 전개',
        body: '(a+√b)(a-√b) = a²-b 공식으로 분모를 계산한다.',
        example: '(2+√3)(2-√3) = 4-3 = 1',
        choices: [
          { text: '(a+√b)(a-√b) = a²-b 공식으로 분모를 계산한다', correct: true },
          { text: '분모를 (a+√b)²으로 전개한다', correct: false },
          { text: '분모 전개 결과는 항상 1이다', correct: false },
        ],
      },
      {
        title: '분자 전개 후 정리',
        body: '분자도 전개하고, 분모가 유리수가 된 분수를 최종 정리한다.',
        example: '1·(2-√3)/1 = 2-√3',
        choices: [
          { text: '분자를 전개하고 분모로 나눈다', correct: true },
          { text: '분자는 그대로 두고 분모만 정리한다', correct: false },
          { text: '유리화 후 분자에도 근호가 남아야 한다', correct: false },
        ],
      },
    ],
  },
  g2_diff_application: {
    heroPrompt: "미분으로 최댓·최솟값을 찾으려면 f'(x)=0 → 증감표 → 극값 결정의 3단계가 핵심입니다.",
    thinkingSteps: [
      {
        title: "f'(x) 구하기",
        body: "f(x)를 미분하여 f'(x)를 구한다. 각 항을 항별로 미분한다.",
        example: "f(x)=x³-3x+2 → f'(x)=3x²-3",
        choices: [
          { text: '각 항의 지수를 앞으로 내리고 지수를 1 감소시킨다', correct: true },
          { text: 'f(x) 전체에 지수를 곱한다', correct: false },
          { text: '상수항도 미분하면 값이 남는다', correct: false },
        ],
      },
      {
        title: "f'(x)=0 풀기 + 증감표",
        body: "f'(x)=0이 되는 x를 구하고, 그 주위에서 f'(x)의 부호 변화로 증감표를 작성한다.",
        example: "3x²-3=0 → x=±1. x<-1: +, -1~1: -, x>1: + → 극대 x=-1, 극소 x=1",
        choices: [
          { text: "f'(x) 부호 변화로 극대·극소를 결정한다", correct: true },
          { text: "f'(x)=0인 점이 반드시 극값이다", correct: false },
          { text: '증감표 없이 극값을 바로 판단할 수 있다', correct: false },
        ],
      },
      {
        title: '극값 계산 + 최종 판단',
        body: '극대·극소에서 f(x)값을 계산하고, 주어진 범위가 있으면 끝점도 확인한다.',
        example: 'f(-1)=4(극대), f(1)=0(극소). 범위 [-2,2]이면 f(-2), f(2)도 확인',
        choices: [
          { text: '닫힌 구간이면 끝점도 반드시 확인한다', correct: true },
          { text: '극값만 확인하면 충분하다', correct: false },
          { text: '끝점은 항상 극값보다 작다', correct: false },
        ],
      },
    ],
  },
  g2_integral_basic: {
    heroPrompt: '부정적분 ∫xⁿdx = xⁿ⁺¹/(n+1)에서 지수와 계수를 어떻게 처리하는지 확인해볼게요.',
    thinkingSteps: [
      {
        title: '부정적분 공식 적용',
        body: '∫xⁿdx = xⁿ⁺¹/(n+1)+C (n≠-1). 지수를 1 올리고, 올린 지수로 나눈다.',
        example: '∫(3x²-2x+1)dx = x³-x²+x+C',
        choices: [
          { text: '지수를 1 증가시키고 증가된 지수로 나눈다', correct: true },
          { text: '지수를 앞으로 내리고 1을 뺀다 (미분 공식)', correct: false },
          { text: '상수항은 적분해도 사라진다', correct: false },
        ],
      },
      {
        title: '계수 처리 확인',
        body: '∫axⁿdx = a·xⁿ⁺¹/(n+1). 계수 a는 그대로 유지한 뒤 새 지수로 나눈다.',
        example: '∫6x²dx = 6·x³/3 = 2x³ (계수 6을 올린 지수 3으로 나눔)',
        choices: [
          { text: '계수는 그대로 두고 새 지수로 나눈다', correct: true },
          { text: '계수는 지수처럼 앞으로 내린다', correct: false },
          { text: '계수는 지수를 올리기 전 값으로 나눈다', correct: false },
        ],
      },
      {
        title: '미분으로 역검증',
        body: '구한 F(x)를 미분하면 원래 f(x)가 나와야 한다. 틀렸다면 적분 공식 적용에 실수가 있는 것이다.',
        example: '∫3x²dx = x³+C → (x³)′=3x² ✓',
        choices: [
          { text: 'F(x)를 미분해서 f(x)가 나오면 정확하다', correct: true },
          { text: '미분과 적분은 역관계가 아니다', correct: false },
          { text: '상수 C는 미분하면 1이 된다', correct: false },
        ],
      },
    ],
  },
  g2_integral_definite: {
    heroPrompt: '부정적분은 구했는데 끝값 대입에서 실수했나요? 아래 끝값이 0이 아닐 때를 집중적으로 확인해봅시다.',
    thinkingSteps: [
      {
        title: '아래 끝값도 반드시 대입',
        body: '[F(x)]ₐᵇ = F(b)-F(a). 아래 끝값 a가 0이 아닌 경우에도 F(a)를 반드시 계산하여 뺀다.',
        example: '[x³]₁³ → F(3)=27, F(1)=1 → 27-1=26. (F(1)을 빼지 않으면 27로 오답)',
        choices: [
          { text: '아래 끝값이 0이 아닌 경우에도 F(a)를 뺀다', correct: true },
          { text: '아래 끝값이 0이 아닌 경우 F(a)를 빼지 않아도 된다', correct: false },
          { text: 'F(아래끝)-F(위끝) 순서이다', correct: false },
        ],
      },
      {
        title: 'F(b), F(a) 각각 별도 계산',
        body: 'F(b)와 F(a)를 한꺼번에 계산하면 부호 실수가 생긴다. 두 값을 먼저 따로 구한 뒤 뺀다.',
        example: '[2x³]₁² → F(2)=16, F(1)=2 → 16-2=14. (한꺼번에 계산 시 부호 실수 위험)',
        choices: [
          { text: 'F(b)와 F(a)를 따로 계산한 뒤 뺀다', correct: true },
          { text: '한 번에 전개해도 실수가 없다', correct: false },
          { text: 'F(0)=0이므로 아래끝이 0이면 생략해도 된다', correct: false },
        ],
      },
      {
        title: '빼기 부호 전파 확인',
        body: 'F(a)에 여러 항이 있을 때 빼기 부호가 모든 항에 적용되는지 확인한다.',
        example: '[x²+2x]₁³ = (9+6)-(1+2) = 15-3 = 12. F(1)=3을 빠뜨리면 15로 오답 ✓',
        choices: [
          { text: '빼기 부호가 F(a)의 모든 항에 적용된다', correct: true },
          { text: '빼기 부호는 F(a)의 첫 항에만 적용된다', correct: false },
          { text: 'F(a)가 양수이면 빼지 않아도 된다', correct: false },
        ],
      },
    ],
  },
  g2_counting_method: {
    heroPrompt: '경우의 수 방법 선택은 순서·중복·독립 여부로 결정합니다. 체크해볼게요.',
    thinkingSteps: [
      {
        title: '순서 있음/없음 판단',
        body: '선택 순서가 중요하면 순열(P), 순서 무관하면 조합(C)을 쓴다.',
        example: '"회장·부회장 선출" → 순서 있음 → ₅P₂=20',
        choices: [
          { text: '순서가 있으면 순열(P)을 쓴다', correct: true },
          { text: '순서가 있으면 조합(C)을 쓴다', correct: false },
          { text: '순서는 경우의 수와 무관하다', correct: false },
        ],
      },
      {
        title: '독립/배타 사건 판단',
        body: '두 사건이 동시에 일어나면 곱의 법칙, 어느 한 쪽만 일어나면 합의 법칙을 쓴다.',
        example: '"A 또는 B" → 합의 법칙 / "A 그리고 B" → 곱의 법칙',
        choices: [
          { text: '"또는"이면 합, "그리고"이면 곱의 법칙이다', correct: true },
          { text: '"또는"이면 곱, "그리고"이면 합의 법칙이다', correct: false },
          { text: '항상 곱의 법칙을 쓴다', correct: false },
        ],
      },
      {
        title: '공식 대입',
        body: '결정한 방법으로 ₙPr = n!/(n-r)! 또는 ₙCr = n!/(r!(n-r)!)를 계산한다.',
        example: '₅P₂ = 5×4 = 20 / ₅C₂ = 5×4/2 = 10',
        choices: [
          { text: 'P는 나누지 않고, C는 r!로 나눈다', correct: true },
          { text: 'P와 C의 계산 방법이 같다', correct: false },
          { text: 'C는 P보다 항상 크다', correct: false },
        ],
      },
    ],
  },
  g2_counting_overcounting: {
    heroPrompt: '중복 계산 오류는 포함-배제 원리로 해결합니다. 겹치는 경우를 명시적으로 찾아볼게요.',
    thinkingSteps: [
      {
        title: '각 경우의 수 계산',
        body: '조건 A, B 각각의 경우의 수를 따로 구한다.',
        example: '"3의 배수 또는 5의 배수": A=3의 배수 개수, B=5의 배수 개수',
        choices: [
          { text: 'A와 B를 각각 먼저 구한다', correct: true },
          { text: 'A와 B를 한 번에 구한다', correct: false },
          { text: '조건이 두 개면 그냥 더하면 된다', correct: false },
        ],
      },
      {
        title: '겹치는 경우 찾기',
        body: 'A와 B 조건을 동시에 만족하는 경우(A∩B)를 구한다.',
        example: '"3과 5의 공배수 = 15의 배수": n(A∩B) 계산',
        choices: [
          { text: '두 조건을 동시에 만족하는 경우를 찾는다', correct: true },
          { text: '겹치는 경우는 항상 없다', correct: false },
          { text: '겹치는 경우는 무시한다', correct: false },
        ],
      },
      {
        title: '포함-배제 원리 적용',
        body: 'n(A∪B) = n(A)+n(B)-n(A∩B)로 중복을 제거한다.',
        example: 'n(A)=33, n(B)=20, n(A∩B)=6 → 33+20-6=47',
        choices: [
          { text: '겹치는 경우를 정확히 한 번 뺀다', correct: true },
          { text: '겹치는 경우를 두 번 뺀다', correct: false },
          { text: '겹치는 경우를 더한다', correct: false },
        ],
      },
    ],
  },
  g2_inequality_range: {
    heroPrompt: '이차부등식 풀이는 포물선 그래프 방향으로 해의 범위를 결정합니다.',
    thinkingSteps: [
      {
        title: '이차방정식 풀어 근 구하기',
        body: '부등식을 =으로 바꿔 이차방정식의 두 근 α, β를 구한다 (α<β).',
        example: 'x²-3x-4=0 → (x-4)(x+1)=0 → x=-1, x=4',
        choices: [
          { text: '먼저 =으로 바꿔 근을 구한다', correct: true },
          { text: '부등식을 직접 풀 수 있다', correct: false },
          { text: '근을 구하지 않아도 범위를 쓸 수 있다', correct: false },
        ],
      },
      {
        title: '포물선 방향과 해 범위 결정',
        body: 'a>0일 때: >0이면 x<α 또는 x>β, <0이면 α<x<β',
        example: 'x²-3x-4<0, a=1>0 → -1<x<4 (근의 안쪽)',
        choices: [
          { text: 'a>0이고 <0이면 두 근 사이가 해이다', correct: true },
          { text: 'a>0이고 <0이면 두 근 바깥이 해이다', correct: false },
          { text: 'a의 부호는 해 범위에 영향을 주지 않는다', correct: false },
        ],
      },
      {
        title: '부등호 방향 최종 확인',
        body: '등호 포함(≤,≥) 여부에 따라 등호를 포함하거나 제외한다.',
        example: '<이면 등호 제외: -1<x<4 / ≤이면 등호 포함: -1≤x≤4',
        choices: [
          { text: '<이면 등호를 제외한다', correct: true },
          { text: '<이면 등호를 포함한다', correct: false },
          { text: '등호 포함 여부는 중요하지 않다', correct: false },
        ],
      },
    ],
  },
  g2_function_domain: {
    heroPrompt: '합성함수나 역함수의 정의역·치역은 단계별로 범위를 추적해야 합니다.',
    thinkingSteps: [
      {
        title: '내부 함수의 치역 확인',
        body: '합성함수 f∘g에서 g(x)의 치역이 f의 정의역 안에 있어야 한다.',
        example: 'g(x)=x² (치역: x≥0), f(x)=√x (정의역: x≥0) → 문제없음',
        choices: [
          { text: 'g의 치역이 f의 정의역 안에 있어야 한다', correct: true },
          { text: 'f의 치역이 g의 정의역 안에 있어야 한다', correct: false },
          { text: '정의역 확인 없이 합성할 수 있다', correct: false },
        ],
      },
      {
        title: '역함수의 정의역·치역 교환',
        body: '역함수 f⁻¹의 정의역 = f의 치역, f⁻¹의 치역 = f의 정의역이다.',
        example: 'f: [1,3]→[2,8] 이면 f⁻¹: [2,8]→[1,3]',
        choices: [
          { text: '역함수에서 정의역과 치역이 서로 바뀐다', correct: true },
          { text: '역함수에서 정의역과 치역이 같다', correct: false },
          { text: '역함수는 항상 모든 실수가 정의역이다', correct: false },
        ],
      },
      {
        title: '함수 성립 조건 확인',
        body: '하나의 x에 대해 f(x) 값이 오직 하나여야 함수이다.',
        example: 'f(x)=±√x는 x=4에서 f=2, -2 두 값 → 함수가 아님',
        choices: [
          { text: '한 x에 하나의 y값이 대응되어야 한다', correct: true },
          { text: '한 y에 여러 x가 대응될 수 없다', correct: false },
          { text: '모든 식은 함수이다', correct: false },
        ],
      },
    ],
  },
};

export function getReviewHeroPrompt(weaknessId: WeaknessId) {
  return reviewContentMap[weaknessId]?.heroPrompt ?? diagnosisMap[weaknessId].tip;
}

export function getReviewThinkingSteps(weaknessId: WeaknessId): readonly ThinkingStep[] {
  return reviewContentMap[weaknessId]?.thinkingSteps ?? [];
}
