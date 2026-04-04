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
};

export function getReviewHeroPrompt(weaknessId: WeaknessId) {
  return reviewContentMap[weaknessId]?.heroPrompt ?? diagnosisMap[weaknessId].tip;
}

export function getReviewThinkingSteps(weaknessId: WeaknessId): readonly ThinkingStep[] {
  return reviewContentMap[weaknessId]?.thinkingSteps ?? [];
}
