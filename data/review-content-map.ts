import { diagnosisMap, type WeaknessId } from './diagnosisMap';

export type Choice = {
  text: string;
  correct: boolean;
  feedback: string;
  /** 오답 선택 시 진입할 보완 노드 그래프의 시작 노드 id. 정답 Choice는 없어야 함. */
  remedialFlowStartNodeId?: string;
  /** 학생이 이 오답을 누르면 발견되는 약점 신호 (spec §2.1). */
  weaknessId?: WeaknessId;
};

export type ThinkingStep = {
  /** 약점 prefix를 포함한 고유 키. 예: "formula_understanding.step1" */
  id: string;
  title: string;
  body: string;
  example?: string;
  choices: Choice[];
};

type ReviewContent = {
  heroPrompt: string;
  thinkingSteps: ThinkingStep[];
};

export const reviewContentMap: Partial<Record<WeaknessId, ReviewContent>> = {
  discriminant_calculation: {
    heroPrompt: '판별식은 b^2와 4ac를 따로 계산한 뒤 빼야 한다는 흐름이 떠오르나요?',
    thinkingSteps: [
      {
        id: 'discriminant_calculation.step1',
        title: 'a, b, c 부호 확인',
        body: 'ax²+bx+c에서 각 계수를 부호 포함해서 먼저 읽는다.',
        example: '예) 2x²−3x+1 → a=2, b=−3, c=1',
        choices: [
          {
            text: '계산 실수를 줄이기 위해서',
            correct: false,
            feedback: '계산 실수도 있겠지만, 더 본질적인 이유가 있어요. 부호 자체가 결과를 어떻게 바꾸는지에 주목해봐요.',
            remedialFlowStartNodeId: 'disc_step1_A_explain',
            weaknessId: 'discriminant_calculation',
          },
          {
            text: '음수 부호를 빠뜨리면 결과가 달라지니까',
            correct: true,
            feedback: '맞아요! 부호 하나로 b²−4ac 결과가 완전히 뒤바뀌니까, 시작부터 정확히 읽는 게 핵심이에요.',
          },
          {
            text: '근의 공식을 외우기 쉽게 하기 위해서',
            correct: false,
            feedback: '암기 편의보다는, 부호의 정확성이 결과에 직접 영향을 주기 때문이에요.',
            remedialFlowStartNodeId: 'disc_step1_C_explain',
            weaknessId: 'discriminant_calculation',
          },
        ],
      },
      {
        id: 'discriminant_calculation.step2',
        title: 'b² 먼저, 4ac 나중',
        body: 'b²를 먼저 계산하고, 그 다음 4×a×c를 따로 계산한다.',
        example: '예) b=−3 → b²=9 / 4×2×1=8',
        choices: [
          {
            text: 'b²는 b 하나만 써서 가장 단순하니까',
            correct: true,
            feedback: '맞아요! 단일 항을 먼저 정리하면 머릿속이 가벼워지고, 그 다음 4ac에 집중할 수 있어요.',
          },
          {
            text: '4ac가 더 중요해서 나중에 집중하려고',
            correct: false,
            feedback: '중요도 차이는 아니에요. 단순한 것부터 처리해 실수를 줄이는 게 목적이에요.',
            remedialFlowStartNodeId: 'disc_step2_B_explain',
            weaknessId: 'discriminant_calculation',
          },
          {
            text: '순서는 상관없고 습관적으로',
            correct: false,
            feedback: '습관도 영향이 있지만, 단순한 항을 먼저 처리해 부담을 줄이는 합리적 이유가 있어요.',
            remedialFlowStartNodeId: 'disc_step2_C_explain',
            weaknessId: 'discriminant_calculation',
          },
        ],
      },
      {
        id: 'discriminant_calculation.step3',
        title: '빼고 나서 판단',
        body: 'b²−4ac의 결과가 양수/0/음수인지 보고 근의 개수를 결론짓는다.',
        example: '9−8=1 > 0 → 서로 다른 두 실근',
        choices: [
          {
            text: '결과의 숫자 크기로 근의 종류를 결정한다',
            correct: false,
            feedback: '크기보다는 부호가 핵심이에요. 양수/0/음수 세 가지 경우만 판단하면 돼요.',
            remedialFlowStartNodeId: 'disc_step3_A_explain',
            weaknessId: 'discriminant_calculation',
          },
          {
            text: '결과의 부호(양수/0/음수)만 보면 된다',
            correct: true,
            feedback: '맞아요! 양수면 두 실근, 0이면 중근, 음수면 허근. 부호 하나로 종류가 결정돼요.',
          },
          {
            text: '결과가 0보다 크면 항상 두 근이 같다',
            correct: false,
            feedback: '두 근이 같은 건 0일 때예요. 양수일 때는 서로 다른 두 실근이 나와요.',
            remedialFlowStartNodeId: 'disc_step3_C_explain',
            weaknessId: 'discriminant_calculation',
          },
        ],
      },
    ],
  },
  formula_understanding: {
    heroPrompt: '완전제곱식으로 바꿀 때 왜 x 계수의 절반을 제곱해야 하는지 기억나나요?',
    thinkingSteps: [
      {
        id: 'formula_understanding.step1',
        title: 'x 계수의 절반 추출',
        body: 'ax²+bx+c에서 x 계수 b를 확인하고 b/2를 먼저 구한다.',
        example: '예) x²+6x+5 → b=6, b/2=3',
        choices: [
          { text: 'b를 그대로 쓰면 된다', correct: false, feedback: 'b를 그대로 쓰면 완전제곱 꼴이 만들어지지 않아요. (x+?)²을 만들려면 b/2가 필요하다는 점에 다시 주목해봐요.', remedialFlowStartNodeId: 'fu_step1_A_explain', weaknessId: 'basic_concept_needed' },
          { text: 'b/2를 먼저 계산해야 한다', correct: true, feedback: '맞아요! (x+b/2)²을 만들려면 b/2가 출발점이에요.' },
          { text: '계수는 신경 쓰지 않아도 된다', correct: false, feedback: 'x 계수가 (x+?)²의 ?를 결정하니까, 계수를 빼놓고는 완전제곱이 만들어지지 않아요.', remedialFlowStartNodeId: 'fu_step1_C_explain', weaknessId: 'basic_concept_needed' },
        ],
      },
      {
        id: 'formula_understanding.step2',
        title: '(x + b/2)² 완성',
        body: '(x + b/2)²을 전개하면 x²+bx+(b/2)²이므로 원식에서 (b/2)²을 더하고 뺀다.',
        example: '예) x²+6x → (x+3)²−9',
        choices: [
          { text: '(b/2)²을 더하고 뺀다', correct: true, feedback: '맞아요! 더한 만큼 다시 빼야 원래 식과 같은 값이 유지돼요.' },
          { text: 'b를 그대로 제곱한다', correct: false, feedback: 'b를 그대로 제곱하면 (x+b)²이 되어 x 계수가 2b로 어긋나요. 절반인 b/2를 제곱해야 맞아요.', remedialFlowStartNodeId: 'fu_step2_B_explain', weaknessId: 'basic_concept_needed' },
          { text: '상수항은 변하지 않는다', correct: false, feedback: '더한 만큼을 보상하지 않으면 식의 값이 달라져요. (b/2)²을 빼주는 단계가 빠지면 안 돼요.', remedialFlowStartNodeId: 'fu_step2_C_explain', weaknessId: 'basic_concept_needed' },
        ],
      },
      {
        id: 'formula_understanding.step3',
        title: '상수항 정리',
        body: '원래 상수항 c와 −(b/2)²을 합산하여 완전제곱식 꼴로 완성한다.',
        example: '예) (x+3)²−9+5 = (x+3)²−4',
        choices: [
          { text: '상수를 무시하고 계수만 본다', correct: false, feedback: '원래 상수항 c가 빠지면 식 자체가 달라져요. c와 −(b/2)²을 같이 모아야 마무리돼요.', remedialFlowStartNodeId: 'fu_step3_A_explain', weaknessId: 'basic_concept_needed' },
          { text: 'c − (b/2)²을 최종 상수로 쓴다', correct: true, feedback: '맞아요! 더했다가 뺀 만큼을 c와 함께 정리해야 등가식이 유지돼요.' },
          { text: '상수항은 항상 0이다', correct: false, feedback: '원래 식의 c가 살아 있어야 해요. 0으로 놓으면 다른 식이 돼버려요.', remedialFlowStartNodeId: 'fu_step3_C_explain', weaknessId: 'basic_concept_needed' },
        ],
      },
    ],
  },
  calc_repeated_error: {
    heroPrompt: '대입 계산에서 음수 구간을 따로 끊어 보는 순서, 아직 떠오르나요?',
    thinkingSteps: [
      {
        id: 'calc_repeated_error.step1',
        title: '대입할 값을 식에서 먼저 정리',
        body: '대입 전에 계산할 값 x=a를 식에서 읽고, 음수인지 확인한다.',
        example: '예) f(−2) 구하기 → x=−2 확인 후 대입',
        choices: [
          { text: '값을 바로 대입하면 된다', correct: false, feedback: '급하게 대입하면 부호 실수가 잘 생겨요. 음수인지 먼저 확인하는 한 박자가 결과를 좌우해요.', remedialFlowStartNodeId: 'calc_step1_A_diagnose', weaknessId: 'calc_repeated_error' },
          { text: '대입 전 부호를 먼저 확인한다', correct: true, feedback: '맞아요! 부호를 먼저 인지해두면 괄호 처리도 자연스럽게 따라와요.' },
          { text: '양수일 때만 조심하면 된다', correct: false, feedback: '오히려 음수일 때 부호 실수가 자주 일어나요. 음수 대입을 가장 조심해야 해요.', remedialFlowStartNodeId: 'calc_step1_C_diagnose', weaknessId: 'calc_repeated_error' },
        ],
      },
      {
        id: 'calc_repeated_error.step2',
        title: '음수 구간 괄호 처리',
        body: '음수를 대입할 때 반드시 괄호로 감싸서 부호 실수를 막는다.',
        example: '예) f(x)=x²+2x → f(−2)=(−2)²+2(−2)=4−4=0',
        choices: [
          { text: '음수는 괄호 없이 써도 된다', correct: false, feedback: '괄호 없이 쓰면 −2²처럼 부호가 어디까지 묶이는지 헷갈려요. 괄호로 감싸는 게 안전해요.', remedialFlowStartNodeId: 'calc_step2_A_diagnose', weaknessId: 'calc_repeated_error' },
          { text: '음수 대입 시 괄호로 감싼다', correct: true, feedback: '맞아요! 괄호 하나로 부호 실수를 거의 다 막을 수 있어요.' },
          { text: '제곱이면 부호가 사라진다', correct: false, feedback: '제곱하면 결과는 양수지만, 괄호 없이 쓰면 −2²와 (−2)²가 달라져요. 괄호로 묶어서 처리해야 해요.', remedialFlowStartNodeId: 'calc_step2_C_diagnose', weaknessId: 'calc_repeated_error' },
        ],
      },
      {
        id: 'calc_repeated_error.step3',
        title: '항별 계산 후 합산',
        body: '각 항을 따로 계산한 뒤 마지막에 합산한다.',
        example: '예) (−2)²=4, 2(−2)=−4 → 4+(−4)=0',
        choices: [
          { text: '전체를 한 번에 계산한다', correct: false, feedback: '한 번에 처리하면 어디서 부호가 꼬였는지 추적이 어려워요. 항별로 끊어 가는 게 실수를 줄여요.', remedialFlowStartNodeId: 'calc_step3_A_diagnose', weaknessId: 'calc_repeated_error' },
          { text: '항별로 나눠서 계산 후 합친다', correct: true, feedback: '맞아요! 항별로 끊어 계산하면 어느 한 항에서 실수가 나도 바로 보여요.' },
          { text: '계산 순서는 중요하지 않다', correct: false, feedback: '결과는 같아도, 항별로 처리하는 순서가 부호 실수를 막아줘요.', remedialFlowStartNodeId: 'calc_step3_C_diagnose', weaknessId: 'calc_repeated_error' },
        ],
      },
    ],
  },
  min_value_read_confusion: {
    heroPrompt: '(x-a)^2+b 꼴에서 최솟값과 그 값을 갖는 x를 어떻게 나눠서 읽었는지 기억나나요?',
    thinkingSteps: [
      {
        id: 'min_value_read_confusion.step1',
        title: '완전제곱식 꼴 확인',
        body: '식을 (x−a)²+b 꼴로 바꾸거나 이미 그 꼴인지 확인해요.',
        example: '예) (x−3)²+2 → a=3, b=2',
        choices: [
          { text: '표준형으로 바꿀 필요 없다', correct: false, feedback: '이미 표준형처럼 보여도 꼴을 먼저 확인해야 a와 b가 헷갈리지 않아요. (x−a)²+b 꼴이어야 a와 b가 한눈에 보여요.', remedialFlowStartNodeId: 'minv_step1_A_diagnose', weaknessId: 'min_value_read_confusion' },
          { text: '(x−a)²+b 꼴로 먼저 파악한다', correct: true, feedback: '맞아요! 이 꼴이 보이면 최솟값과 그 위치를 그대로 읽을 수 있어요.' },
          { text: 'a가 최솟값이고 b는 그 위치이다', correct: false, feedback: 'a와 b의 역할이 반대예요. a는 최솟값이 되는 x의 위치, b는 최솟값(값 자체)이에요.', remedialFlowStartNodeId: 'minv_step1_C_diagnose', weaknessId: 'min_value_read_confusion' },
        ],
      },
      {
        id: 'min_value_read_confusion.step2',
        title: '최솟값은 상수항 b',
        body: '(x−a)²는 항상 0 이상이에요. 가장 작을 때는 0이고, 그러면 식에서 남는 건 b뿐이에요. 그래서 최솟값은 b예요.',
        example: '예) (x−3)²+2 → 최솟값 = 2',
        choices: [
          { text: '최솟값은 a이다', correct: false, feedback: 'a는 최솟값을 갖는 x의 위치예요. 값과 위치를 헷갈리기 쉬워서 한 번 더 짚어봐요.', remedialFlowStartNodeId: 'minv_step2_A_diagnose', weaknessId: 'min_value_read_confusion' },
          { text: '최솟값은 상수항 b이다', correct: true, feedback: '맞아요! 제곱 항이 0일 때 남는 b가 곧 최솟값이에요.' },
          { text: '최솟값은 -b이다', correct: false, feedback: '부호를 바꿀 필요는 없어요. 제곱 항이 0이 될 때 식에 그대로 남아 있는 b가 최솟값이에요.', remedialFlowStartNodeId: 'minv_step2_C_diagnose', weaknessId: 'min_value_read_confusion' },
        ],
      },
      {
        id: 'min_value_read_confusion.step3',
        title: '최솟값이 되는 x는 a',
        body: '제곱 항이 0이 되려면 x=a여야 해요. 그래서 최솟값을 갖는 x의 위치는 a예요.',
        example: '예) (x−3)²+2 → x=3일 때 최솟값 2',
        choices: [
          { text: 'x=b일 때 최솟값이 된다', correct: false, feedback: 'b는 값이지 위치가 아니에요. 제곱 항이 0이 되는 x를 다시 찾아봐요.', remedialFlowStartNodeId: 'minv_step3_A_diagnose', weaknessId: 'min_value_read_confusion' },
          { text: 'x=a일 때 최솟값 b를 갖는다', correct: true, feedback: '맞아요! 위치는 a, 값은 b — 둘을 깔끔하게 분리해서 읽었어요.' },
          { text: 'x=a일 때 최솟값도 a이다', correct: false, feedback: 'x=a일 때가 최솟값을 갖는 위치는 맞아요. 하지만 그때의 값은 a가 아니라 b예요. 위치와 값을 구분해봐요.', remedialFlowStartNodeId: 'minv_step3_C_diagnose', weaknessId: 'min_value_read_confusion' },
        ],
      },
    ],
  },
  vertex_formula_memorization: {
    heroPrompt: '꼭짓점 x좌표를 구할 때 -b를 먼저 읽고 2a로 나누는 순서가 떠오르나요?',
    thinkingSteps: [
      {
        id: 'vertex_formula_memorization.step1',
        title: 'a, b 부호 포함 읽기',
        body: 'ax²+bx+c에서 a, b 앞의 +/− 도 같이 묶어 읽어요. 다음 단계에서 −b/(2a) 에 그대로 넣을 거라 부호를 미리 챙겨두는 게 안전해요.',
        example: '예) 2x²−6x+1 → a=2, b=−6',
        choices: [
          { text: '계수만 읽고 부호는 나중에 본다', correct: false, feedback: '부호를 미루면 −b/(2a)에 대입할 때 마이너스를 한 번 더 뒤집어야 해서 실수가 생겨요. 처음부터 묶어 읽는 게 안전해요.', remedialFlowStartNodeId: 'vfm_step1_A_explain', weaknessId: 'vertex_formula_memorization' },
          { text: 'a와 b를 부호 포함해서 먼저 읽는다', correct: true, feedback: '맞아요! 부호까지 묶어서 읽으면 공식 대입이 한결 깔끔해져요.' },
          { text: 'b 는 부호 빼고 절댓값만 읽는다', correct: false, feedback: '절댓값만 읽으면 −b 자리에 +값이 들어가 답이 부호 반대로 나와요. b 는 마이너스도 같이 묶어 b = −6 으로 적어둬요.', remedialFlowStartNodeId: 'vfm_step1_C_explain', weaknessId: 'vertex_formula_memorization' },
        ],
      },
      {
        id: 'vertex_formula_memorization.step2',
        title: '꼭짓점 x좌표 = −b / 2a',
        body: '꼭짓점 x좌표는 −b 를 2a 로 나눈 값이에요.',
        example: '예) a=2, b=−6 → x = −(−6)/(2×2) = 6/4 = 3/2',
        choices: [
          { text: '꼭짓점 x좌표 = b/a이다', correct: false, feedback: '공식의 모양이 살짝 달라요. 부호와 분모의 2를 다시 확인해봐요.', remedialFlowStartNodeId: 'vfm_step2_A_explain', weaknessId: 'vertex_formula_memorization' },
          { text: '꼭짓점 x좌표 = −b/(2a)이다', correct: true, feedback: '맞아요! −b를 2a로 나눈 값이 꼭짓점의 x좌표예요.' },
          { text: '꼭짓점 x좌표 = 2b/a이다', correct: false, feedback: '분자와 분모가 뒤바뀌고 부호도 빠졌어요. −b/(2a)로 다시 정리해봐요.', remedialFlowStartNodeId: 'vfm_step2_C_explain', weaknessId: 'vertex_formula_memorization' },
        ],
      },
      {
        id: 'vertex_formula_memorization.step3',
        title: '부호 헷갈리는 식에도 그대로 적용',
        body: 'a 가 음수거나 b 가 양수여도 같은 공식 −b/(2a) 를 그대로 써요. 부호만 꼼꼼히 챙기면 어떤 식이든 같은 한 줄로 끝나요.',
        example: '예) −x²+4x+1 → a=−1, b=4 → −4/(2·(−1)) = −4/(−2) = 2',
        choices: [
          { text: 'a 가 음수면 공식을 뒤집어 쓴다', correct: false, feedback: '공식은 그대로예요. 음수 a 를 그냥 분모 2a 자리에 넣으면 분모도 음수가 돼 자동으로 부호가 정리돼요.', remedialFlowStartNodeId: 'vfm_step3_A_explain', weaknessId: 'vertex_formula_memorization' },
          { text: '부호 그대로 −b/(2a)에 대입한다', correct: true, feedback: '맞아요! 공식을 바꿀 필요 없이 부호만 살려 그대로 넣으면 정답이 나와요.' },
          { text: 'b 가 양수면 −b 자리에 +b 를 넣는다', correct: false, feedback: '−b 자리에는 마이너스를 반드시 한 번 붙여야 해요. b 가 양수면 −b 는 음수가 돼요.', remedialFlowStartNodeId: 'vfm_step3_C_explain', weaknessId: 'vertex_formula_memorization' },
        ],
      },
    ],
  },
  coefficient_sign_confusion: {
    heroPrompt: 'ax^2+bx+c로 다시 쓸 때 계수를 부호까지 포함해 읽는 기준이 기억나나요?',
    thinkingSteps: [
      {
        id: 'coefficient_sign_confusion.step1',
        title: '각 항의 계수와 부호 함께 읽기',
        body: '식에서 x², x, 상수항 앞에 붙은 부호(+/−)를 계수의 일부로 읽는다.',
        example: '예) 3x²−5x+2 → a=3, b=−5, c=2',
        choices: [
          { text: '부호는 공식 대입 시 붙인다', correct: false, feedback: '대입할 때 부호를 떠올리려 하면 한 박자 늦어요. 식을 읽는 순간부터 부호를 묶어두는 게 안전해요.', remedialFlowStartNodeId: 'csc_step1_A_explain', weaknessId: 'coefficient_sign_confusion' },
          { text: '계수를 부호 포함해서 읽는다', correct: true, feedback: '맞아요! 부호를 계수의 일부로 보는 습관이 가장 큰 실수를 막아줘요.' },
          { text: '부호는 따로 기억한다', correct: false, feedback: '기억에만 의존하면 대입 단계에서 잊기 쉬워요. 식 옆에 a=, b=, c= 로 적어두면 더 든든해요.', remedialFlowStartNodeId: 'csc_step1_C_explain', weaknessId: 'coefficient_sign_confusion' },
        ],
      },
      {
        id: 'coefficient_sign_confusion.step2',
        title: 'a, b, c를 명시적으로 기록',
        body: '풀기 전에 a=_, b=_, c=_ 를 여백에 써두고 시작한다.',
        example: '예) a=3, b=−5, c=2 → 공식에 대입 준비',
        choices: [
          { text: '암산으로 바로 대입한다', correct: false, feedback: '암산으로 진행하면 어느 단계에서 어긋났는지 보이지 않아요. 한 줄 적는 시간이 결과를 살려줘요.', remedialFlowStartNodeId: 'csc_step2_A_explain', weaknessId: 'coefficient_sign_confusion' },
          { text: '여백에 a, b, c를 먼저 쓴다', correct: true, feedback: '맞아요! 여백에 적어두면 공식 대입이 거의 자동으로 따라와요.' },
          { text: '공식만 알면 쓸 필요 없다', correct: false, feedback: '공식은 알지만 부호를 빠뜨리면 답이 틀려요. a, b, c를 명시적으로 적어두는 게 안전망이 돼요.', remedialFlowStartNodeId: 'csc_step2_C_explain', weaknessId: 'coefficient_sign_confusion' },
        ],
      },
      {
        id: 'coefficient_sign_confusion.step3',
        title: '공식에 부호 포함 대입',
        body: '공식에 a, b, c를 괄호로 감싸서 대입하면 부호 실수를 막는다.',
        example: '예) −b/(2a) = −(−5)/(2×3) = 5/6',
        choices: [
          { text: '괄호 없이 숫자만 대입한다', correct: false, feedback: '괄호가 빠지면 −b 같은 자리에서 부호가 자주 사라져요. 괄호 하나로 실수를 막을 수 있어요.', remedialFlowStartNodeId: 'csc_step3_A_explain', weaknessId: 'coefficient_sign_confusion' },
          { text: '괄호로 감싸서 부호 포함 대입한다', correct: true, feedback: '맞아요! 괄호로 묶어 대입하면 부호가 자연스럽게 살아남아요.' },
          { text: '부호는 결과에서 조정한다', correct: false, feedback: '결과에서 맞춰 가는 건 어려워요. 처음부터 부호를 살려서 대입하는 게 정석이에요.', remedialFlowStartNodeId: 'csc_step3_C_explain', weaknessId: 'coefficient_sign_confusion' },
        ],
      },
    ],
  },
  derivative_calculation: {
    heroPrompt: 'x^n을 미분할 때 지수는 앞으로, 지수는 하나 감소한다는 규칙이 떠오르나요?',
    thinkingSteps: [
      {
        id: 'derivative_calculation.step1',
        title: 'xⁿ의 미분 규칙 확인',
        body: 'xⁿ을 미분하면 n·xⁿ⁻¹이다. 지수를 계수 앞으로 내리고 지수를 1 줄인다.',
        example: '예) x³ → 3x²',
        choices: [
          { text: 'xⁿ → xⁿ⁺¹ / (n+1)', correct: false, feedback: '그건 적분 공식이에요. 미분은 지수가 1 줄어드는 방향이에요.', remedialFlowStartNodeId: 'dvc_step1_A_explain', weaknessId: 'derivative_calculation' },
          { text: 'xⁿ → n·xⁿ⁻¹', correct: true, feedback: '맞아요! 지수를 앞으로 내리고, 지수에서 1을 뺀다 — 두 동작이 한 셋이에요.' },
          { text: 'xⁿ → n·xⁿ', correct: false, feedback: '지수를 그대로 두면 차수가 줄지 않아요. 미분은 차수를 한 단계 낮춘다는 점이 핵심이에요.', remedialFlowStartNodeId: 'dvc_step1_C_explain', weaknessId: 'derivative_calculation' },
        ],
      },
      {
        id: 'derivative_calculation.step2',
        title: '각 항을 따로 미분',
        body: '다항식은 각 항을 독립적으로 미분한 뒤 합산한다.',
        example: "예) f(x)=3x³+2x → f'(x)=9x²+2",
        choices: [
          { text: '전체를 한 번에 미분한다', correct: false, feedback: '다항식은 항별로 따로 미분해도 결과가 같아요. 항별로 처리하는 게 실수를 줄여줘요.', remedialFlowStartNodeId: 'dvc_step2_A_explain', weaknessId: 'derivative_calculation' },
          { text: '각 항을 따로 미분 후 합산한다', correct: true, feedback: '맞아요! 각 항을 독립적으로 처리한 뒤 합치는 흐름이 안전해요.' },
          { text: 'ax^n 형태에서 계수 a 도 함께 미분된다', correct: false, feedback: '계수는 미분 대상이 아니에요. 지수만 변하고 계수는 그대로 곱해져요 (예: 3x² → 3·2·x¹ = 6x).', remedialFlowStartNodeId: 'dvc_step2_C_explain', weaknessId: 'derivative_calculation' },
        ],
      },
      {
        id: 'derivative_calculation.step3',
        title: '상수항 미분 결과는 0',
        body: '상수항(숫자만 있는 항)을 미분하면 0이 된다.',
        example: "예) f(x)=x²+3 → f'(x)=2x+0=2x",
        choices: [
          { text: '상수항은 미분하면 1이 된다', correct: false, feedback: '상수항은 변화율이 없어서 미분하면 0이에요. 1이 나오는 건 x¹의 미분이에요.', remedialFlowStartNodeId: 'dvc_step3_A_explain', weaknessId: 'derivative_calculation' },
          { text: '상수항을 미분하면 0이 된다', correct: true, feedback: '맞아요! 상수는 변하지 않으니 미분 결과가 0이에요.' },
          { text: '상수항은 미분하지 않는다', correct: false, feedback: '미분은 하지만 결과가 0이에요. 빼놓는 게 아니라 0이 더해진다고 생각하면 돼요.', remedialFlowStartNodeId: 'dvc_step3_C_explain', weaknessId: 'derivative_calculation' },
        ],
      },
    ],
  },
  solving_order_confusion: {
    heroPrompt: '극값을 구할 때 어떤 식을 0 으로 놓고, 그 답을 어디에 다시 넣어야 했는지 떠올릴 수 있나요?',
    thinkingSteps: [
      {
        id: 'solving_order_confusion.step1',
        title: "기울기 식 f'(x) = 0 으로 놓기",
        body: "f' (작은 따옴표 하나 붙은 거) 는 f 를 미분해서 만든 기울기 식이에요. 극값(그래프가 잠깐 멈추는 자리) 후보를 찾으려면 기울기가 0 인 자리, 즉 f'(x)=0 을 풀어야 해요.",
        example: "예) f(x) = x² − 4x + 1 → 미분하면 f'(x) = 2x − 4 → f'(x) = 0 으로 놓기",
        choices: [
          { text: '원래 식 f(x) = 0 으로 놓는다', correct: false, feedback: 'f(x)=0 은 그래프가 x 축에 닿는 자리(영점) 를 구하는 식이에요. 극값 후보 자리와는 달라요. 기울기 식 f\'(x)=0 으로 놓아야 해요.', remedialFlowStartNodeId: 'soc_step1_A_explain', weaknessId: 'solving_order_confusion' },
          { text: "기울기 식 f'(x) = 0 으로 놓는다", correct: true, feedback: '맞아요! 기울기가 0 인 자리가 극값 후보예요.' },
          { text: '원래 식에 x=0 을 대입한다 (f(0) 계산)', correct: false, feedback: 'f(0) 은 그래프가 y 축과 만나는 시작값 (y 절편) 이라 극값과 달라요. 기울기 식을 0 으로 놓고 풀어야 해요.', remedialFlowStartNodeId: 'soc_step1_C_explain', weaknessId: 'solving_order_confusion' },
        ],
      },
      {
        id: 'solving_order_confusion.step2',
        title: '후보 x 를 빠짐없이 구하기',
        body: "f'(x) = 0 을 풀면 후보 x 가 한 개 또는 여러 개 나와요. x² 같은 제곱이 들어가면 양수·음수 한 쌍이 같이 답이라 ± 둘 다 챙겨야 해요.",
        example: "예) f'(x) = x² − 9 = 0 → x² = 9 → x = 3 또는 x = −3",
        choices: [
          { text: '후보 x 는 항상 하나만 있다', correct: false, feedback: '방정식 모양에 따라 후보가 여러 개일 수 있어요. ± 까지 모두 챙겨야 빠뜨리지 않아요.', remedialFlowStartNodeId: 'soc_step2_A_explain', weaknessId: 'solving_order_confusion' },
          { text: '방정식을 풀어 후보 x 를 모두 구한다', correct: true, feedback: '맞아요! 후보를 모두 모아둬야 극대·극소를 빠짐없이 검토할 수 있어요.' },
          { text: 'x 는 양수만 답이 된다', correct: false, feedback: '음수 해도 극값 자리가 될 수 있어요. 부호로 미리 거르지 말고 모두 후보로 두세요.', remedialFlowStartNodeId: 'soc_step2_C_explain', weaknessId: 'solving_order_confusion' },
        ],
      },
      {
        id: 'solving_order_confusion.step3',
        title: '원함수 f(x) 에 후보 x 를 대입해 극값 구하기',
        body: '구한 후보 x 를 원래 함수 f(x) 에 다시 넣어야 극값(그 자리의 함수값) 이 나와요. x 만 적고 끝나면 극값 자체를 구한 게 아니에요.',
        example: '예) f(x) = x² − 4x + 1, x = 2 → f(2) = 4 − 8 + 1 = −3 (극솟값)',
        choices: [
          { text: "f'(x) 에 후보 x 를 다시 대입한다", correct: false, feedback: "f' 에 넣으면 0 이 다시 나올 뿐이에요. 실제 극값은 원함수 f 에 넣어야 보여요.", remedialFlowStartNodeId: 'soc_step3_A_explain', weaknessId: 'solving_order_confusion' },
          { text: '원함수 f(x) 에 후보 x 를 대입한다', correct: true, feedback: '맞아요! 후보 x 를 원함수에 다시 넣어야 극값이 나와요.' },
          { text: '대입 없이 x 만 답으로 쓴다', correct: false, feedback: 'x 는 위치고, 극값은 그 위치에서의 함수값이에요. 대입 한 단계가 빠져 있어요.', remedialFlowStartNodeId: 'soc_step3_C_explain', weaknessId: 'solving_order_confusion' },
        ],
      },
    ],
  },
  max_min_judgement_confusion: {
    heroPrompt: 'a의 부호를 보고 최댓값인지 최솟값인지 먼저 판단하는 기준이 기억나나요?',
    thinkingSteps: [
      {
        id: 'max_min_judgement_confusion.step1',
        title: 'a의 부호 확인',
        body: 'ax²+bx+c에서 a의 부호를 먼저 읽는다.',
        example: '예) −2x²+4x+1 → a=−2 (음수)',
        choices: [
          { text: 'c의 부호를 본다', correct: false, feedback: 'c는 y절편이라 극값 유형과는 직접 상관이 없어요. 볼록 방향을 결정하는 a를 먼저 보세요.', remedialFlowStartNodeId: 'mmj_step1_A_explain', weaknessId: 'max_min_judgement_confusion' },
          { text: 'a의 부호를 먼저 확인한다', correct: true, feedback: '맞아요! a 한 글자만 보면 위로 볼록인지 아래로 볼록인지 결정돼요.' },
          { text: 'b의 부호를 본다', correct: false, feedback: 'b는 꼭짓점의 위치에 영향을 주지만, 최대·최소 유형 자체는 a가 결정해요.', remedialFlowStartNodeId: 'mmj_step1_B_explain', weaknessId: 'max_min_judgement_confusion' },
        ],
      },
      {
        id: 'max_min_judgement_confusion.step2',
        title: 'a>0이면 최솟값, a<0이면 최댓값',
        body: 'a>0이면 아래로 볼록 → 꼭짓점이 최솟값. a<0이면 위로 볼록 → 꼭짓점이 최댓값.',
        example: '예) a=−2 → 위로 볼록 → 꼭짓점이 최댓값',
        choices: [
          { text: 'a>0이면 최댓값이다', correct: false, feedback: 'a>0이면 아래로 볼록이라 꼭짓점이 가장 낮은 점, 즉 최솟값이에요.', remedialFlowStartNodeId: 'mmj_step2_A_explain', weaknessId: 'max_min_judgement_confusion' },
          { text: 'a>0이면 최솟값, a<0이면 최댓값이다', correct: true, feedback: '맞아요! 볼록 방향이 그대로 극값 유형으로 이어져요.' },
          { text: 'a의 부호와 극값 유형은 무관하다', correct: false, feedback: 'a의 부호가 그래프의 볼록 방향을 결정하니까 직접 영향을 줘요. 다시 a를 살펴봐요.', remedialFlowStartNodeId: 'mmj_step2_B_explain', weaknessId: 'max_min_judgement_confusion' },
        ],
      },
      {
        id: 'max_min_judgement_confusion.step3',
        title: '꼭짓점의 y좌표가 극값',
        body: '판단 후 꼭짓점 x좌표를 구해 원래 식에 대입하여 실제 극값을 계산한다.',
        example: '예) a=−2, b=4 → x=1 → f(1)=−2+4+1=3 (최댓값)',
        choices: [
          { text: '꼭짓점 x좌표가 극값이다', correct: false, feedback: 'x좌표는 위치예요. 실제 극값은 그 위치의 y값, 즉 함수값이에요.', remedialFlowStartNodeId: 'mmj_step3_A_explain', weaknessId: 'max_min_judgement_confusion' },
          { text: '꼭짓점 y좌표(f(x))가 극값이다', correct: true, feedback: '맞아요! 위치는 x, 값은 y(=f(x))로 자리를 잘 나눴어요.' },
          { text: '극값은 상수항 c이다', correct: false, feedback: 'c는 y절편이에요. 꼭짓점은 보통 c와 다른 값이라 따로 계산해야 해요.', remedialFlowStartNodeId: 'mmj_step3_B_explain', weaknessId: 'max_min_judgement_confusion' },
        ],
      },
    ],
  },
  basic_concept_needed: {
    heroPrompt: '완전제곱식에서 값과 위치를 나눠 보는 기본 해석부터 다시 떠올려볼까요?',
    thinkingSteps: [
      {
        id: 'basic_concept_needed.step1',
        title: '완전제곱식이란?',
        body: '(x−a)²+b 꼴로 표현된 식. 제곱 부분은 항상 0 이상이다.',
        example: '예) (x−2)²+3 → 최솟값 3, x=2일 때',
        choices: [
          { text: '완전제곱식은 ax²+bx+c 꼴이다', correct: false, feedback: '그건 일반형이에요. 완전제곱식은 (x−a)²+b처럼 제곱과 상수가 분리된 꼴이에요.' },
          { text: '완전제곱식은 (x−a)²+b 꼴이다', correct: true, feedback: '맞아요! 이 꼴이면 극값과 위치를 한눈에 읽을 수 있어요.' },
          { text: '완전제곱식은 항상 양수이다', correct: false, feedback: '(x−a)²은 0 이상이지만 식 전체는 b의 부호에 따라 음수일 수도 있어요.' },
        ],
      },
      {
        id: 'basic_concept_needed.step2',
        title: '값(b)과 위치(a) 구분',
        body: '극값은 b(상수항), 그 위치는 x=a이다. 두 가지를 혼동하지 않는다.',
        example: '예) (x−2)²+3 → 극값=3, 위치=x=2',
        choices: [
          { text: '극값은 a이고 위치는 b이다', correct: false, feedback: '역할이 뒤바뀌었어요. 제곱 항이 0이 되는 자리(a)가 위치, 남는 b가 값이에요.' },
          { text: '극값은 b이고 위치는 x=a이다', correct: true, feedback: '맞아요! 값과 위치를 깔끔하게 분리해서 읽는 감각이 핵심이에요.' },
          { text: '극값과 위치는 모두 a이다', correct: false, feedback: '한 글자가 두 역할을 동시에 하지는 않아요. 값(b)과 위치(a)를 분리해봐요.' },
        ],
      },
      {
        id: 'basic_concept_needed.step3',
        title: 'a의 부호로 최대/최소 구분',
        body: 'a>0이면 (x−a)² 부분이 최소 0이므로 전체 최솟값이 b. a<0이면 최댓값.',
        example: '예) a>0 → 최솟값=b, a<0 → 최댓값=b',
        choices: [
          { text: 'a 부호와 무관하게 b가 최솟값이다', correct: false, feedback: 'a<0이면 그래프가 위로 볼록해서 b가 최댓값이 돼요. a의 부호가 결정적이에요.' },
          { text: 'a>0이면 b가 최솟값, a<0이면 최댓값이다', correct: true, feedback: '맞아요! a 한 글자가 최대·최소를 가르는 스위치 역할을 해요.' },
          { text: 'a<0이면 최솟값이 존재하지 않는다', correct: false, feedback: '위로 볼록이면 최댓값이 생기고, 정의역이 닫혀 있으면 최솟값도 따로 정해져요. 없다고 단정할 수는 없어요.' },
        ],
      },
    ],
  },
  factoring_pattern_recall: {
    heroPrompt: '곱과 합을 동시에 보며 인수분해 두 수를 찾는 기준이 기억나나요?',
    thinkingSteps: [
      {
        id: 'factoring_pattern_recall.step1',
        title: '상수항 c와 x계수 b 동시에 읽기',
        body: 'x²+bx+c에서 b(합)와 c(곱)를 동시에 파악한다.',
        example: '예) x²+5x+6 → 합=5, 곱=6',
        choices: [
          { text: '계수 b만 보면 된다', correct: false, feedback: 'b만 보면 후보가 너무 많이 나와요. 곱인 c와 함께 봐야 두 수가 빠르게 좁혀져요.', remedialFlowStartNodeId: 'fpr_step1_A_explain', weaknessId: 'factoring_pattern_recall' },
          { text: '합 b와 곱 c를 동시에 파악한다', correct: true, feedback: '맞아요! 합과 곱을 짝지어 읽는 게 인수분해의 출발점이에요.' },
          { text: 'c만 보면 인수를 알 수 있다', correct: false, feedback: 'c의 약수 후보 중 합이 b가 되는 쌍을 골라야 해요. b도 같이 봐야 해요.', remedialFlowStartNodeId: 'fpr_step1_C_explain', weaknessId: 'factoring_pattern_recall' },
        ],
      },
      {
        id: 'factoring_pattern_recall.step2',
        title: '곱이 c, 합이 b인 두 정수 찾기',
        body: 'c를 만드는 두 수의 조합 중 합이 b가 되는 쌍을 찾는다.',
        example: '예) 곱=6, 합=5 → 2와 3 (2×3=6, 2+3=5)',
        choices: [
          { text: '두 수의 차가 b가 되어야 한다', correct: false, feedback: '차가 아니라 합이 b예요. 두 수 곱=c, 두 수 합=b로 다시 한 번 정리해봐요.', remedialFlowStartNodeId: 'fpr_step2_A_explain', weaknessId: 'factoring_pattern_recall' },
          { text: '두 수의 곱=c, 합=b인 쌍을 찾는다', correct: true, feedback: '맞아요! 곱과 합 두 조건을 동시에 만족시키는 쌍이 정답이에요.' },
          { text: '두 수는 항상 양수여야 한다', correct: false, feedback: 'c가 음수면 두 수 부호가 달라지고, b가 음수면 두 수가 모두 음수일 수도 있어요.', remedialFlowStartNodeId: 'fpr_step2_C_explain', weaknessId: 'factoring_pattern_recall' },
        ],
      },
      {
        id: 'factoring_pattern_recall.step3',
        title: '(x+p)(x+q) 꼴로 작성',
        body: '찾은 두 수 p, q로 (x+p)(x+q)를 쓰고 전개해서 검산한다.',
        example: '예) (x+2)(x+3) = x²+5x+6 ✓',
        choices: [
          { text: '(x−p)(x−q)로 쓴다', correct: false, feedback: '두 수가 양수인 경우엔 (x+p)(x+q)예요. 부호는 찾은 두 수에 맞춰 바뀌어요.', remedialFlowStartNodeId: 'fpr_step3_A_explain', weaknessId: 'factoring_pattern_recall' },
          { text: '(x+p)(x+q)로 쓰고 전개 검산한다', correct: true, feedback: '맞아요! 전개 검산까지 해두면 부호 실수도 함께 잡혀요.' },
          { text: '검산은 필요 없다', correct: false, feedback: '한 줄 전개로 부호 실수를 잡을 수 있어요. 짧은 검산이 큰 실수를 막아줘요.', remedialFlowStartNodeId: 'fpr_step3_C_explain', weaknessId: 'factoring_pattern_recall' },
        ],
      },
    ],
  },
  complex_factoring_difficulty: {
    heroPrompt: '공통부분을 먼저 묶거나 치환해서 단순화하는 출발점이 떠오르나요?',
    thinkingSteps: [
      {
        id: 'complex_factoring_difficulty.step1',
        title: '공통인수 또는 공통부분 찾기',
        body: '모든 항에 공통으로 들어 있는 인수나 식을 먼저 찾아 앞으로 빼낸다.',
        example: '예) 2x²+4x = 2x(x+2)',
        choices: [
          { text: '공통인수 없이 바로 전개한다', correct: false, feedback: '전개부터 들어가면 식이 길어져 실수가 늘어요. 공통인수를 먼저 빼면 모양이 단순해져요.', remedialFlowStartNodeId: 'cfd_step1_A_explain', weaknessId: 'complex_factoring_difficulty' },
          { text: '공통인수를 먼저 찾아 묶는다', correct: true, feedback: '맞아요! 모든 항을 가볍게 만들어두면 다음 단계가 한결 쉬워져요.' },
          { text: '계수가 다르면 공통인수가 없다', correct: false, feedback: '계수가 달라도 공통 변수나 식이 묶일 수 있어요. 변수와 계수를 따로 살펴봐요.', remedialFlowStartNodeId: 'cfd_step1_C_explain', weaknessId: 'complex_factoring_difficulty' },
        ],
      },
      {
        id: 'complex_factoring_difficulty.step2',
        title: '복잡한 식은 치환으로 단순화',
        body: '반복되는 식 묶음을 A 등으로 치환하면 기본 인수분해 패턴으로 바뀐다.',
        example: '예) (x+1)²+3(x+1)+2 → A²+3A+2 → (A+1)(A+2)',
        choices: [
          { text: '치환하면 더 복잡해진다', correct: false, feedback: '반복되는 묶음이 있다면 치환이 오히려 식을 단순화해줘요. 같은 모양을 한 글자로 바꿔봐요.', remedialFlowStartNodeId: 'cfd_step2_A_explain', weaknessId: 'complex_factoring_difficulty' },
          { text: '반복 묶음을 치환해 단순화한다', correct: true, feedback: '맞아요! 반복 패턴을 한 글자로 바꾸면 익숙한 인수분해 형태로 보여요.' },
          { text: '치환은 방정식에서만 쓴다', correct: false, feedback: '인수분해에서도 치환을 자주 써요. 보이는 패턴을 단순화하는 일반 도구라고 생각해도 돼요.', remedialFlowStartNodeId: 'cfd_step2_C_explain', weaknessId: 'complex_factoring_difficulty' },
        ],
      },
      {
        id: 'complex_factoring_difficulty.step3',
        title: '치환 후 인수분해, 역치환',
        body: '치환한 식을 인수분해한 뒤 원래 식으로 되돌려 최종 답을 완성한다.',
        example: '예) (A+1)(A+2) → (x+2)(x+3)',
        choices: [
          { text: '치환 결과를 그대로 답으로 쓴다', correct: false, feedback: '치환은 중간 도구라 마지막엔 원래 식으로 돌려야 해요. 역치환이 빠지면 답이 아니에요.', remedialFlowStartNodeId: 'cfd_step3_A_explain', weaknessId: 'complex_factoring_difficulty' },
          { text: '인수분해 후 원래 식으로 역치환한다', correct: true, feedback: '맞아요! 치환·인수분해·역치환의 세 박자가 마무리예요.' },
          { text: '역치환 없이 A로 남겨도 된다', correct: false, feedback: 'A는 임시 변수라 답에 남으면 안 돼요. 원래 식으로 되돌려야 의미가 살아나요.', remedialFlowStartNodeId: 'cfd_step3_C_explain', weaknessId: 'complex_factoring_difficulty' },
        ],
      },
    ],
  },
  quadratic_formula_memorization: {
    heroPrompt: '근의 공식을 쓰기 전에 a, b, c를 부호 포함으로 확인하는 순서가 기억나나요?',
    thinkingSteps: [
      {
        id: 'quadratic_formula_memorization.step1',
        title: 'a, b, c 부호 포함 읽기',
        body: 'ax²+bx+c에서 a, b, c를 부호 포함해서 먼저 기록한다.',
        example: '예) 2x²−3x−2 → a=2, b=−3, c=−2',
        choices: [
          { text: '부호 없이 숫자만 읽는다', correct: false, feedback: '근의 공식은 부호에 매우 민감해요. 숫자만 읽으면 거의 항상 한 곳에서 어긋나요.', remedialFlowStartNodeId: 'qfm_step1_A_explain', weaknessId: 'quadratic_formula_memorization' },
          { text: '부호를 포함해서 a, b, c를 기록한다', correct: true, feedback: '맞아요! 부호를 묶어 기록해두는 한 단계가 공식의 정확도를 좌우해요.' },
          { text: 'a만 부호를 신경 쓴다', correct: false, feedback: 'b의 부호도 −b 자리에서 결정적인 영향을 줘요. 세 글자 모두 부호와 함께 챙겨야 해요.', remedialFlowStartNodeId: 'qfm_step1_C_explain', weaknessId: 'quadratic_formula_memorization' },
        ],
      },
      {
        id: 'quadratic_formula_memorization.step2',
        title: '판별식 b²−4ac 먼저 계산',
        body: '근의 공식을 쓰기 전에 b²−4ac를 따로 계산해서 근의 종류를 파악한다.',
        example: '예) b=−3, a=2, c=−2 → (−3)²−4(2)(−2)=9+16=25',
        choices: [
          { text: '판별식 계산은 선택 사항이다', correct: false, feedback: '판별식이 곧 근의 종류를 알려줘서 풀이의 방향이 잡혀요. 빼놓을 단계가 아니에요.', remedialFlowStartNodeId: 'qfm_step2_A_explain', weaknessId: 'quadratic_formula_memorization' },
          { text: '판별식을 먼저 계산하고 근의 종류를 파악한다', correct: true, feedback: '맞아요! 미리 종류를 알면 전체 계산 흐름이 안정돼요.' },
          { text: 'b²만 계산하면 된다', correct: false, feedback: 'b²만 보면 4ac를 빠뜨려요. 두 값을 따로 구하고 빼는 단계가 필요해요.', remedialFlowStartNodeId: 'qfm_step2_C_explain', weaknessId: 'quadratic_formula_memorization' },
        ],
      },
      {
        id: 'quadratic_formula_memorization.step3',
        title: '근의 공식에 대입',
        body: 'x = (−b ± √(b²−4ac)) / 2a에 a, b, 판별식 값을 대입한다.',
        example: '예) x = (3 ± √25) / 4 = (3 ± 5) / 4 → x=2 또는 x=−1/2',
        choices: [
          { text: 'x = (b ± √(b²−4ac)) / 2a이다', correct: false, feedback: '분자의 부호가 −b여야 해요. b가 그대로면 결과의 부호가 통째로 어긋나요.', remedialFlowStartNodeId: 'qfm_step3_A_explain', weaknessId: 'quadratic_formula_memorization' },
          { text: 'x = (−b ± √(b²−4ac)) / 2a이다', correct: true, feedback: '맞아요! 부호와 분모까지 정확히 들어맞은 공식이에요.' },
          { text: 'x = (−b ± √(b²+4ac)) / 2a이다', correct: false, feedback: '판별식은 b²−4ac라 빼는 게 맞아요. 부호 하나 차이로 결과가 완전히 달라져요.', remedialFlowStartNodeId: 'qfm_step3_C_explain', weaknessId: 'quadratic_formula_memorization' },
        ],
      },
    ],
  },
  radical_simplification_error: {
    heroPrompt: '근호 안 수를 소인수분해하고 제곱 묶음을 밖으로 꺼내는 기준이 기억나나요?',
    thinkingSteps: [
      {
        id: 'radical_simplification_error.step1',
        title: '소인수분해로 내부 분석',
        body: '근호 안 수를 작은 소수의 곱으로 끝까지 쪼개야 제곱 묶음이 보여요. 어중간하게 멈추면 제곱 모양이 안 드러나서 다음 단계로 못 넘어가요.',
        example: '예) 72 = 2³×3² = (2²)×(3²)×2 → 제곱 묶음: 2², 3² → √72 = √(4×9×2)',
        choices: [
          { text: '72 = 8×9 까지만 쪼개고 멈춘다', correct: false, feedback: '8×9 까지 쪼개면 제곱 모양이 안 보여요. 8 = 2³, 9 = 3² 처럼 소수까지 더 쪼개야 2², 3² 묶음이 드러나요.', remedialFlowStartNodeId: 'rad_step1_A_explain', weaknessId: 'radical_simplification_error' },
          { text: '소인수분해로 제곱 묶음을 찾는다', correct: true, feedback: '맞아요! 소수까지 끝까지 쪼개면 제곱 묶음이 자동으로 보여요.' },
          { text: '분수처럼 약분으로 줄인다', correct: false, feedback: '근호 안의 정수는 약분 대상이 아니에요. 약분은 분수에서 쓰는 도구라 √72 같은 정수 근호에는 안 통해요. 제곱 묶음을 찾아 밖으로 꺼내는 게 맞는 도구예요.', remedialFlowStartNodeId: 'rad_step1_C_explain', weaknessId: 'radical_simplification_error' },
        ],
      },
      {
        id: 'radical_simplification_error.step2',
        title: '제곱 묶음을 근호 밖으로',
        body: '√(a²×b) = a√b 규칙으로 완전제곱인 부분을 근호 밖으로 꺼내요. 왜 a² 이 a 로 나올까요? √(a²) 자체가 a 이기 때문이에요 (예: √(3²) = 3). 그래서 곱해진 a² 만 한 단계 풀려 a 가 돼요.',
        example: '예) √(4×9×2) = √(2²×3²×2) = 2×3×√2 = 6√2',
        choices: [
          { text: '√(a²×b) = a²×√b이다', correct: false, feedback: '근호를 벗어나면 a² 이 아니라 a 로 나와요. √(a²) = a 이라서 한 단계 풀려요 (예: √(9) = 3).', remedialFlowStartNodeId: 'rad_step2_A_explain', weaknessId: 'radical_simplification_error' },
          { text: '√(a²×b) = a√b이다', correct: true, feedback: '맞아요! √(a²) = a 라는 사실 덕분에 제곱 부분만 한 단계 풀어 밖으로 보내요.' },
          { text: '제곱은 근호 안에 그대로 둔다', correct: false, feedback: '제곱이 안에 그대로 있으면 단순화가 안 돼요. 밖으로 꺼낼 수 있는 부분은 보내야 해요.', remedialFlowStartNodeId: 'rad_step2_C_explain', weaknessId: 'radical_simplification_error' },
        ],
      },
      {
        id: 'radical_simplification_error.step3',
        title: '계수끼리 곱해서 정리',
        body: '근호 밖으로 나온 수들을 모두 곱하여 최종 계수를 구해요. 곱하지 않고 나열만 하면 답이 한 수로 모이지 않아요.',
        example: '예) √(4×9×2) → 밖으로 나온 수: 2, 3 → 계수 = 2×3 = 6 → 6√2',
        choices: [
          { text: '계수를 더해서 정리한다', correct: false, feedback: '근호 밖으로 나온 수들은 곱해서 모아야 해요. 더하면 단위가 어긋나요.', remedialFlowStartNodeId: 'rad_step3_A_explain', weaknessId: 'radical_simplification_error' },
          { text: '근호 밖 수를 모두 곱한다', correct: true, feedback: '맞아요! 밖으로 나온 수는 모두 곱해 한 계수로 합쳐요.' },
          { text: '근호 밖 수를 그대로 2×3×√2 로 나열만 한다', correct: false, feedback: '나열만 하면 답이 6√2 한 줄로 모이지 않아요. 밖으로 나온 2 와 3 을 곱해 6 으로 합쳐야 정리가 끝나요.', remedialFlowStartNodeId: 'rad_step3_C_explain', weaknessId: 'radical_simplification_error' },
        ],
      },
    ],
  },
  rationalization_error: {
    heroPrompt: '분모 유리화에서 같은 근호를 분자와 분모에 함께 곱하는 이유가 떠오르나요?',
    thinkingSteps: [
      {
        id: 'rationalization_error.step1',
        title: '분모의 근호 확인',
        body: '분모에 √a가 있으면 유리화가 필요한지 확인한다.',
        example: '예) 3/√2 → 분모에 √2 존재',
        choices: [
          { text: '분자에 근호가 있으면 유리화한다', correct: false, feedback: '유리화의 표적은 분모예요. 분자에 근호가 있어도 분모가 깔끔하면 유리화는 필요 없어요.', remedialFlowStartNodeId: 're_step1_A_explain', weaknessId: 'rationalization_error' },
          { text: '분모에 근호가 있으면 유리화한다', correct: true, feedback: '맞아요! 분모를 유리수로 만드는 게 유리화의 목적이에요.' },
          { text: '근호가 있으면 항상 유리화한다', correct: false, feedback: '분모가 깔끔하면 굳이 건드릴 필요는 없어요. 분모에 근호가 있을 때만 유리화해요.', remedialFlowStartNodeId: 're_step1_C_explain', weaknessId: 'rationalization_error' },
        ],
      },
      {
        id: 'rationalization_error.step2',
        title: '분자, 분모에 √a를 곱하기',
        body: '값을 바꾸지 않으려면 분자와 분모에 같은 √a를 곱해야 한다(×1과 동일).',
        example: '예) 3/√2 × √2/√2 = 3√2/2',
        choices: [
          { text: '분모에만 √a를 곱한다', correct: false, feedback: '분모만 바꾸면 분수의 값이 달라져요. 분자와 분모에 같은 수를 곱해야 ×1과 같아요.', remedialFlowStartNodeId: 're_step2_A_explain', weaknessId: 'rationalization_error' },
          { text: '분자와 분모 모두에 √a를 곱한다', correct: true, feedback: '맞아요! 같은 수를 분자·분모에 곱하면 값은 그대로, 분모만 깔끔해져요.' },
          { text: '분자에만 √a를 곱한다', correct: false, feedback: '분자만 곱하면 분수의 값 자체가 달라져요. 분모도 같이 곱해야 해요.', remedialFlowStartNodeId: 're_step2_C_explain', weaknessId: 'rationalization_error' },
        ],
      },
      {
        id: 'rationalization_error.step3',
        title: '√a × √a = a로 분모 정리',
        body: '√a × √a = a이므로 분모가 유리수(정수)가 된다.',
        example: '예) √2 × √2 = 2 → 분모 2',
        choices: [
          { text: '√a × √a = 2a이다', correct: false, feedback: '두 √a를 곱하면 2a가 아니라 a가 돼요. 지수의 합이 1+1=2이니 a¹=a로 정리돼요.', remedialFlowStartNodeId: 're_step3_A_explain', weaknessId: 'rationalization_error' },
          { text: '√a × √a = a이다', correct: true, feedback: '맞아요! 이 한 줄이 분모를 유리수로 만들어주는 핵심이에요.' },
          { text: '√a × √a = √(2a)이다', correct: false, feedback: '곱셈은 근호 안 수의 곱이라 √(a·a)=√a²=a로 정리돼요.', remedialFlowStartNodeId: 're_step3_C_explain', weaknessId: 'rationalization_error' },
        ],
      },
    ],
  },
  expansion_sign_error: {
    heroPrompt: '괄호 앞 음수는 첫 항이 아니라 괄호 전체에 분배된다는 기준이 기억나나요?',
    thinkingSteps: [
      {
        id: 'expansion_sign_error.step1',
        title: '괄호 앞 부호 확인',
        body: '전개 전에 괄호 앞에 있는 부호(+/−)를 먼저 확인한다.',
        example: '예) −(2x+3) → 앞에 −1이 곱해진 것',
        choices: [
          { text: '괄호 앞 부호는 첫 항에만 적용된다', correct: false, feedback: '분배는 모든 항에 적용돼요. 첫 항에만 적용하면 뒤 항의 부호가 통째로 어긋나요.', remedialFlowStartNodeId: 'exp_step1_A_explain', weaknessId: 'expansion_sign_error' },
          { text: '괄호 앞 부호를 먼저 확인한다', correct: true, feedback: '맞아요! 분배 시작 전 부호를 의식하는 한 박자가 결과를 살려요.' },
          { text: '부호는 전개 후에 붙인다', correct: false, feedback: '전개 중에 부호가 사라지면 다시 살리기 어려워요. 처음부터 함께 분배해야 해요.', remedialFlowStartNodeId: 'exp_step1_C_explain', weaknessId: 'expansion_sign_error' },
        ],
      },
      {
        id: 'expansion_sign_error.step2',
        title: '부호를 괄호 안 모든 항에 분배',
        body: '−(a+b) = −a−b처럼 부호가 괄호 안 모든 항에 분배된다.',
        example: '예) −(2x+3) = −2x−3',
        choices: [
          { text: '−(a+b) = −a+b이다', correct: false, feedback: '분배는 두 항 모두에 적용돼요. b 앞 부호도 −가 분배되어 −b가 돼야 해요.', remedialFlowStartNodeId: 'exp_step2_A_explain', weaknessId: 'expansion_sign_error' },
          { text: '−(a+b) = −a−b이다', correct: true, feedback: '맞아요! 부호가 모든 항에 들어간다는 분배의 본질이 잘 드러나요.' },
          { text: '부호는 첫 항에만 붙는다', correct: false, feedback: '괄호 앞 부호는 모든 항에 분배돼요. 첫 항만 바꾸면 뒤 항이 잘못 남아요.', remedialFlowStartNodeId: 'exp_step2_C_explain', weaknessId: 'expansion_sign_error' },
        ],
      },
      {
        id: 'expansion_sign_error.step3',
        title: '전개 결과 검산',
        body: '전개한 결과를 다시 괄호로 묶어 원래 식과 같은지 확인한다.',
        example: '예) −2x−3을 묶으면 −(2x+3) → 원식과 동일 ✓',
        choices: [
          { text: '검산은 시간이 오래 걸려 생략한다', correct: false, feedback: '역으로 묶어보는 검산은 짧아요. 그 한 줄이 부호 실수를 거의 다 잡아줘요.', remedialFlowStartNodeId: 'exp_step3_A_explain', weaknessId: 'expansion_sign_error' },
          { text: '전개 후 역으로 묶어서 검산한다', correct: true, feedback: '맞아요! 묶어서 원식과 같은지 확인하는 습관이 큰 힘이 돼요.' },
          { text: '전개만 맞으면 검산은 불필요하다', correct: false, feedback: '맞다고 느낀 전개에 부호 실수가 숨어 있을 때가 많아요. 검산이 그 안전망이 돼요.', remedialFlowStartNodeId: 'exp_step3_C_explain', weaknessId: 'expansion_sign_error' },
        ],
      },
    ],
  },
  like_terms_error: {
    heroPrompt: '전개 뒤에는 차수별로 묶어서 합산해야 한다는 순서가 아직 떠오르나요?',
    thinkingSteps: [
      {
        id: 'like_terms_error.step1',
        title: '전개 후 모든 항 나열',
        body: '괄호를 모두 전개한 뒤 모든 항을 나열한다.',
        example: '예) (x+2)(x+3) = x²+3x+2x+6',
        choices: [
          { text: '전개와 동시에 합친다', correct: false, feedback: '전개 중에 합치면 어떤 항이 같은 차수인지 시야에서 사라지기 쉬워요. 우선 전부 펼쳐놓는 게 안전해요.', remedialFlowStartNodeId: 'lte_step1_A_explain', weaknessId: 'like_terms_error' },
          { text: '전개 후 항을 먼저 나열한다', correct: true, feedback: '맞아요! 전부 늘어놓아야 동류항이 한눈에 보여요.' },
          { text: '괄호 안 항만 합산한다', correct: false, feedback: '괄호 밖에도 같은 차수의 항이 있을 수 있어요. 전체 항을 함께 봐야 해요.', remedialFlowStartNodeId: 'lte_step1_C_explain', weaknessId: 'like_terms_error' },
        ],
      },
      {
        id: 'like_terms_error.step2',
        title: '차수별로 묶기',
        body: '동류항끼리(같은 차수끼리) 묶어서 정리한다.',
        example: '예) x², 3x+2x, 6 → x²+5x+6',
        choices: [
          { text: '모든 항을 순서대로 더한다', correct: false, feedback: '차수가 다른 항을 합치면 식이 어긋나요. 같은 차수끼리 묶는 단계가 필요해요.', remedialFlowStartNodeId: 'lte_step2_A_explain', weaknessId: 'like_terms_error' },
          { text: '같은 차수의 항끼리 묶는다', correct: true, feedback: '맞아요! 차수가 묶음의 기준이 돼야 동류항이 정확히 모여요.' },
          { text: '계수가 같은 항끼리 묶는다', correct: false, feedback: '동류항의 기준은 차수예요. 계수가 같아도 차수가 다르면 합칠 수 없어요.', remedialFlowStartNodeId: 'lte_step2_C_explain', weaknessId: 'like_terms_error' },
        ],
      },
      {
        id: 'like_terms_error.step3',
        title: '계수 합산으로 정리',
        body: '묶인 동류항의 계수를 합산하여 최종 식을 완성한다.',
        example: '예) 3x+2x = (3+2)x = 5x',
        choices: [
          { text: '계수를 곱해서 합친다', correct: false, feedback: '동류항은 계수의 합으로 정리돼요. 곱하면 다른 항이 만들어져요.', remedialFlowStartNodeId: 'lte_step3_A_explain', weaknessId: 'like_terms_error' },
          { text: '계수를 더해서 동류항을 합친다', correct: true, feedback: '맞아요! 차수는 그대로, 계수만 더해서 정리하는 흐름이에요.' },
          { text: '계수는 그대로 나열한다', correct: false, feedback: '정리 단계에서 계수를 더하지 않으면 식이 길게 남아요. 동류항을 한 항으로 합쳐야 깔끔해져요.', remedialFlowStartNodeId: 'lte_step3_C_explain', weaknessId: 'like_terms_error' },
        ],
      },
    ],
  },
  imaginary_unit_confusion: {
    heroPrompt: 'i^2가 보이면 바로 -1로 바꿔 쓰는 습관, 다시 떠올릴 수 있나요?',
    thinkingSteps: [
      {
        id: 'imaginary_unit_confusion.step1',
        title: 'i² = −1 기억',
        body: '허수 단위 i는 i²=−1로 정의된다. 이 규칙 하나로 모든 허수 계산이 시작된다.',
        example: '예) i²=−1, i³=−i, i⁴=1',
        choices: [
          { text: 'i²=1이다', correct: false, feedback: 'i는 √(−1)로 정의되니 제곱하면 −1이 돼요. 부호 하나로 결과가 완전히 달라져요.', remedialFlowStartNodeId: 'iuc_step1_A_explain', weaknessId: 'imaginary_unit_confusion' },
          { text: 'i²=−1이다', correct: true, feedback: '맞아요! 이 한 줄이 모든 복소수 계산의 출발점이에요.' },
          { text: 'i²=i이다', correct: false, feedback: 'i²은 i를 두 번 곱한 거예요. 정의에 따라 −1이 나와야 해요.', remedialFlowStartNodeId: 'iuc_step1_C_explain', weaknessId: 'imaginary_unit_confusion' },
        ],
      },
      {
        id: 'imaginary_unit_confusion.step2',
        title: 'i² 발견 즉시 −1로 교체',
        body: '식에서 i²가 나오는 순간 −1로 바꿔 쓴다. 미루지 않는다.',
        example: '예) 3i²+2i = 3(−1)+2i = −3+2i',
        choices: [
          { text: 'i²를 마지막에 치환한다', correct: false, feedback: 'i²이 보이는 즉시 −1로 바꿔야 식이 단순해져요. 미루면 항이 늘어나기 쉬워요.', remedialFlowStartNodeId: 'iuc_step2_A_explain', weaknessId: 'imaginary_unit_confusion' },
          { text: 'i²가 보이면 바로 −1로 교체한다', correct: true, feedback: '맞아요! 발견 즉시 교체하는 습관이 식을 깔끔하게 유지해줘요.' },
          { text: 'i²는 계산 마지막에 처리한다', correct: false, feedback: '마지막에 처리하면 중간 식이 길어져 실수가 늘어요. 보이는 순간 바꾸는 게 정석이에요.', remedialFlowStartNodeId: 'iuc_step2_C_explain', weaknessId: 'imaginary_unit_confusion' },
        ],
      },
      {
        id: 'imaginary_unit_confusion.step3',
        title: '실수부와 허수부 분리 확인',
        body: '교체 후 실수부(i 없는 항)와 허수부(i 있는 항)가 올바르게 분리됐는지 확인한다.',
        example: '예) −3+2i → 실수부 −3, 허수부 2i',
        choices: [
          { text: '실수부와 허수부를 더한다', correct: false, feedback: '실수부와 허수부는 단위가 달라 그냥 더할 수 없어요. 분리해서 따로 정리해야 해요.', remedialFlowStartNodeId: 'iuc_step3_A_explain', weaknessId: 'imaginary_unit_confusion' },
          { text: '실수부와 허수부를 분리해서 확인한다', correct: true, feedback: '맞아요! 두 부분을 분리하면 결과 형태가 한눈에 보여요.' },
          { text: '허수부는 무시하고 실수부만 쓴다', correct: false, feedback: '허수부도 답의 일부예요. 무시하면 복소수가 아닌 다른 답이 돼요.', remedialFlowStartNodeId: 'iuc_step3_C_explain', weaknessId: 'imaginary_unit_confusion' },
        ],
      },
    ],
  },
  complex_calc_error: {
    heroPrompt: '복소수 계산은 전개 뒤 실수부와 허수부를 따로 모아 정리하는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        id: 'complex_calc_error.step1',
        title: '괄호 전개 후 i² 처리',
        body: '복소수 곱셈은 괄호를 전개한 뒤 나타나는 i²를 −1로 교체한다.',
        example: '예) (2+i)(1+3i) = 2+6i+i+3i² = 2+7i−3',
        choices: [
          { text: 'i²는 그대로 남긴다', correct: false, feedback: '남겨두면 식이 정리되지 않아요. 전개하자마자 −1로 바꿔야 깔끔해져요.' },
          { text: '전개 후 i²를 −1로 교체한다', correct: true, feedback: '맞아요! 전개와 i² 처리가 한 묶음이 되는 흐름이에요.' },
          { text: 'i²=1로 교체한다', correct: false, feedback: 'i²은 −1이에요. 부호 하나가 바뀌면 결과 전체가 달라져요.' },
        ],
      },
      {
        id: 'complex_calc_error.step2',
        title: '실수부끼리 합산',
        body: 'i 없는 항(실수부)끼리 모아서 합산한다.',
        example: '예) 2+(−3) = −1',
        choices: [
          { text: '실수부와 허수부를 함께 더한다', correct: false, feedback: '단위가 달라 그냥 더할 수 없어요. 두 부분을 분리해서 모아야 해요.' },
          { text: '실수부끼리 먼저 합산한다', correct: true, feedback: '맞아요! 같은 단위끼리 모으는 게 정리의 첫 단계예요.' },
          { text: '실수부는 변하지 않는다', correct: false, feedback: 'i² 처리에서 실수부에도 변화가 생겨요. 새로 더해진 항을 빠뜨리지 마세요.' },
        ],
      },
      {
        id: 'complex_calc_error.step3',
        title: '허수부끼리 합산 후 최종 정리',
        body: 'i가 붙은 항(허수부)끼리 모아서 합산하여 최종 복소수를 완성한다.',
        example: '예) 6i+i = 7i → 최종: −1+7i',
        choices: [
          { text: '허수부 계수를 곱한다', correct: false, feedback: '허수부는 같은 i 단위라 계수의 합으로 정리돼요. 곱하면 차수가 달라져요.' },
          { text: '허수부 계수를 더해서 정리한다', correct: true, feedback: '맞아요! 같은 i 단위끼리 합치는 흐름이 자연스러워요.' },
          { text: '허수부는 실수부보다 작아야 한다', correct: false, feedback: '두 부분의 크기 관계는 정해져 있지 않아요. 각 부분을 그대로 정리하면 돼요.' },
        ],
      },
    ],
  },
  remainder_substitution_error: {
    heroPrompt: '나머지정리에서는 x-a=0에서 a를 먼저 구해 P(a)에 넣는다는 기준이 떠오르나요?',
    thinkingSteps: [
      {
        id: 'remainder_substitution_error.step1',
        title: 'x−a=0에서 a 구하기',
        body: '제수(나누는 식)가 x−a이면 x−a=0에서 x=a를 구한다.',
        example: '예) x−2로 나눌 때 → x=2',
        choices: [
          { text: 'x=−a를 구한다', correct: false, feedback: 'x−a=0에서 풀리는 값은 +a예요. 부호 방향을 한 번 더 살펴봐요.', remedialFlowStartNodeId: 'rse_step1_A_explain', weaknessId: 'remainder_substitution_error' },
          { text: 'x−a=0에서 x=a를 구한다', correct: true, feedback: '맞아요! 제수를 0으로 만드는 x=a가 곧 P에 넣을 값이에요.' },
          { text: 'x=0을 대입한다', correct: false, feedback: 'x=0은 (x−a)와 무관한 값이에요. 제수가 0이 되는 x를 찾아야 해요.', remedialFlowStartNodeId: 'rse_step1_C_explain', weaknessId: 'remainder_substitution_error' },
        ],
      },
      {
        id: 'remainder_substitution_error.step2',
        title: 'P(a)에 a 대입하여 계산',
        body: '나머지는 P(a)이므로 구한 x=a를 다항식 P(x)에 대입하여 계산한다.',
        example: '예) P(x)=x²+3, a=2 → P(2)=4+3=7 (나머지=7)',
        choices: [
          { text: 'P(0)을 계산한다', correct: false, feedback: 'P(0)은 x=0에서의 함수값이에요. 나머지정리는 x=a에서의 값을 봐야 해요.', remedialFlowStartNodeId: 'rse_step2_A_explain', weaknessId: 'remainder_substitution_error' },
          { text: 'P(a)에 x=a를 대입한다', correct: true, feedback: '맞아요! 제수의 영점을 다항식에 넣으면 곧 나머지가 나와요.' },
          { text: 'P(x)에 제수를 대입한다', correct: false, feedback: '제수 자체가 아니라, 제수가 0이 되는 x값을 대입해야 해요.', remedialFlowStartNodeId: 'rse_step2_C_explain', weaknessId: 'remainder_substitution_error' },
        ],
      },
      {
        id: 'remainder_substitution_error.step3',
        title: '결과가 나머지임을 확인',
        body: 'P(a)의 계산 결과가 P(x)를 (x−a)로 나눈 나머지이다.',
        example: '예) P(2)=7 → 나머지 7',
        choices: [
          { text: 'P(a)는 몫이다', correct: false, feedback: 'P(a)는 (x−a)로 나눈 나머지예요. 몫은 다항식 나눗셈으로 따로 구해요.', remedialFlowStartNodeId: 'rse_step3_A_explain', weaknessId: 'remainder_substitution_error' },
          { text: 'P(a)가 바로 나머지이다', correct: true, feedback: '맞아요! 나머지정리의 핵심 결과예요.' },
          { text: 'P(a)에서 1을 빼면 나머지이다', correct: false, feedback: '보정 없이 P(a) 그 값이 곧 나머지예요. 따로 빼지 않아도 돼요.', remedialFlowStartNodeId: 'rse_step3_C_explain', weaknessId: 'remainder_substitution_error' },
        ],
      },
    ],
  },
  simultaneous_equation_error: {
    heroPrompt: '조건을 식 두 개로 먼저 정리하고 연립으로 푸는 시작점이 기억나나요?',
    thinkingSteps: [
      {
        id: 'simultaneous_equation_error.step1',
        title: '조건을 식 두 개로 변환',
        body: '문제에서 주어진 두 조건을 각각 x, y에 대한 방정식으로 옮겨 쓴다.',
        example: '예) 합=10, 차=4 → x+y=10, x−y=4',
        choices: [
          { text: '조건 하나만 식으로 변환한다', correct: false, feedback: '변수가 두 개면 식도 두 개가 필요해요. 한쪽만 옮기면 풀 수 없어요.', remedialFlowStartNodeId: 'see_step1_A_diagnose', weaknessId: 'simultaneous_equation_error' },
          { text: '두 조건 모두 방정식으로 변환한다', correct: true, feedback: '맞아요! 변수 수만큼 식을 모아야 연립의 출발점이 만들어져요.' },
          { text: '조건은 암산으로 처리한다', correct: false, feedback: '암산으로 풀면 어디서 어긋났는지 추적이 어려워요. 한 줄씩 적는 게 안전해요.', remedialFlowStartNodeId: 'see_step1_C_diagnose', weaknessId: 'simultaneous_equation_error' },
        ],
      },
      {
        id: 'simultaneous_equation_error.step2',
        title: '한 변수 소거',
        body: '두 식을 더하거나 빼서 변수 하나를 없애 단일 방정식으로 만든다.',
        example: '예) (x+y=10)+(x−y=4) → 2x=14 → x=7',
        choices: [
          { text: '두 식을 곱해서 소거한다', correct: false, feedback: '곱하면 식이 더 복잡해져요. 한 변수를 없애려면 더하거나 빼는 게 자연스러워요.', remedialFlowStartNodeId: 'see_step2_A_diagnose', weaknessId: 'simultaneous_equation_error' },
          { text: '두 식을 더하거나 빼서 변수를 소거한다', correct: true, feedback: '맞아요! 한 변수가 사라지면 익숙한 1변수 방정식이 돼요.' },
          { text: '두 식 중 하나를 버린다', correct: false, feedback: '두 식이 서로의 정보를 줘서 같이 써야 해결돼요. 하나만 두면 답을 정할 수 없어요.', remedialFlowStartNodeId: 'see_step2_C_diagnose', weaknessId: 'simultaneous_equation_error' },
        ],
      },
      {
        id: 'simultaneous_equation_error.step3',
        title: '구한 값을 대입해 나머지 변수 계산',
        body: '구한 x를 한 식에 대입하여 y를 구하고, 두 식 모두 성립하는지 검산한다.',
        example: '예) x=7을 x+y=10에 대입 → y=3',
        choices: [
          { text: '한 식에만 검산한다', correct: false, feedback: '다른 식도 만족하는지 확인해야 진짜 해예요. 두 식 모두 통과해야 안심할 수 있어요.', remedialFlowStartNodeId: 'see_step3_A_diagnose', weaknessId: 'simultaneous_equation_error' },
          { text: '두 식 모두 대입해 검산한다', correct: true, feedback: '맞아요! 두 식 모두 만족해야 연립 방정식의 해라고 할 수 있어요.' },
          { text: '대입 없이 x만 답으로 쓴다', correct: false, feedback: 'y도 답의 일부예요. 한 변수만 적고 끝내면 문제의 답이 절반 남아요.', remedialFlowStartNodeId: 'see_step3_C_diagnose', weaknessId: 'simultaneous_equation_error' },
        ],
      },
    ],
  },
  counting_method_confusion: {
    heroPrompt: '경우의 수는 먼저 순서가 중요한지부터 확인해야 한다는 기준이 떠오르나요?',
    thinkingSteps: [
      {
        id: 'counting_method_confusion.step1',
        title: '순서 중요 여부 먼저 판단',
        body: 'AB와 BA가 다른 경우인지(순열) 같은 경우인지(조합) 먼저 판단한다.',
        example: '예) 줄 세우기 → 순서 중요 → 순열, 모둠 구성 → 순서 무관 → 조합',
        choices: [
          { text: '항상 순열을 쓴다', correct: false, feedback: '순서가 무관한 문제도 많아요. 그럴 때 순열을 쓰면 같은 경우를 여러 번 세게 돼요.', remedialFlowStartNodeId: 'cmc_step1_A_diagnose', weaknessId: 'counting_method_confusion' },
          { text: '순서 중요 여부를 먼저 판단한다', correct: true, feedback: '맞아요! 이 한 가지 판단이 공식 선택을 결정해요.' },
          { text: '항상 조합을 쓴다', correct: false, feedback: '줄 세우기처럼 순서가 중요한 문제는 조합으로 세면 부족하게 잡혀요.', remedialFlowStartNodeId: 'cmc_step1_C_diagnose', weaknessId: 'counting_method_confusion' },
        ],
      },
      {
        id: 'counting_method_confusion.step2',
        title: '순열: nPr = n!/(n−r)!',
        body: '순서가 중요하면 nPr 공식으로 경우의 수를 구한다.',
        example: '예) 5명 중 3명 줄 세우기 → 5P3 = 5×4×3 = 60',
        choices: [
          { text: '순열 = nCr이다', correct: false, feedback: 'nCr은 조합의 기호예요. 순열은 nPr이고 r!만큼 더 큰 값이에요.', remedialFlowStartNodeId: 'cmc_step2_A_diagnose', weaknessId: 'counting_method_confusion' },
          { text: '순열 = nPr = n!/(n−r)!이다', correct: true, feedback: '맞아요! 순서가 있는 선택의 표준 공식이에요.' },
          { text: '순열 = n!이다', correct: false, feedback: 'n!은 모든 자리를 모두 줄 세울 때예요. r명만 뽑아 줄 세우면 nPr이 맞아요.', remedialFlowStartNodeId: 'cmc_step2_C_diagnose', weaknessId: 'counting_method_confusion' },
        ],
      },
      {
        id: 'counting_method_confusion.step3',
        title: '조합: nCr = n!/(r!(n−r)!)',
        body: '순서가 무관하면 nCr 공식으로 경우의 수를 구한다.',
        example: '예) 5명 중 3명 모둠 구성 → 5C3 = 10',
        choices: [
          { text: '조합 = nPr이다', correct: false, feedback: '그건 순열의 기호예요. 조합은 r!로 나눠서 순서를 지운 값이에요.', remedialFlowStartNodeId: 'cmc_step3_A_diagnose', weaknessId: 'counting_method_confusion' },
          { text: '조합 = nCr = n!/(r!(n−r)!)이다', correct: true, feedback: '맞아요! 순서를 지우기 위해 r!로 나누는 형태가 핵심이에요.' },
          { text: '조합 = n×r이다', correct: false, feedback: '그건 단순 곱이에요. 조합은 nPr을 r!로 나눠서 구해요.', remedialFlowStartNodeId: 'cmc_step3_C_diagnose', weaknessId: 'counting_method_confusion' },
        ],
      },
    ],
  },
  counting_overcounting: {
    heroPrompt: '경우를 셀 때 중복을 막으려면 직접 나열하거나 표로 확인해야 한다는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        id: 'counting_overcounting.step1',
        title: '모든 경우 나열 또는 표 작성',
        body: '경우의 수가 적으면 직접 나열하고, 많으면 표로 정리하여 시각적으로 파악한다.',
        example: '예) 동전 2개: HH, HT, TH, TT → 4가지',
        choices: [
          { text: '항상 공식으로만 계산한다', correct: false, feedback: '공식만 믿으면 중복이 숨었을 때 잡기 어려워요. 작은 경우는 직접 나열하는 게 안전해요.', remedialFlowStartNodeId: 'coc_step1_A_explain', weaknessId: 'counting_overcounting' },
          { text: '나열 또는 표로 경우를 파악한다', correct: true, feedback: '맞아요! 시각적으로 확인하는 한 박자가 중복을 막아줘요.' },
          { text: '나열은 시간 낭비다', correct: false, feedback: '초반에 한 번 나열해두면 패턴이 보이고 공식 선택이 쉬워져요. 절대 낭비가 아니에요.', remedialFlowStartNodeId: 'coc_step1_C_explain', weaknessId: 'counting_overcounting' },
        ],
      },
      {
        id: 'counting_overcounting.step2',
        title: '중복 패턴 찾기',
        body: '나열된 경우 중 동일한 경우를 찾아 표시한다.',
        example: '예) AB와 BA가 같은 경우면 → 중복 1쌍 발생',
        choices: [
          { text: '중복은 항상 없다', correct: false, feedback: 'AB와 BA를 같은 경우로 봐야 할 때가 많아요. 문제의 의미를 먼저 살펴야 해요.', remedialFlowStartNodeId: 'coc_step2_A_explain', weaknessId: 'counting_overcounting' },
          { text: '나열 후 동일 경우를 직접 찾는다', correct: true, feedback: '맞아요! 직접 찾아본 중복이 가장 정확해요.' },
          { text: '중복은 공식으로만 처리한다', correct: false, feedback: '공식만으로 처리하다가 빠뜨리는 중복이 많아요. 한 번은 눈으로 확인하는 게 든든해요.', remedialFlowStartNodeId: 'coc_step2_C_explain', weaknessId: 'counting_overcounting' },
        ],
      },
      {
        id: 'counting_overcounting.step3',
        title: '중복 제거 후 최종 집계',
        body: '중복으로 셀 위험이 있는 경우를 제거하거나, 조합 공식으로 나눠서 최종 답을 낸다.',
        example: '예) 3명 중 2명 선택: 나열 6가지 ÷ 2 = 3가지 (조합)',
        choices: [
          { text: '중복을 포함해서 답으로 쓴다', correct: false, feedback: '중복이 그대로 들어가면 답이 부풀려져요. 마지막에 한 번 정리해야 정확해져요.', remedialFlowStartNodeId: 'coc_step3_A_explain', weaknessId: 'counting_overcounting' },
          { text: '중복을 제거하거나 나눠서 최종 답을 낸다', correct: true, feedback: '맞아요! 마지막 정리 한 단계가 답을 깔끔하게 만들어요.' },
          { text: '중복은 더하면 된다', correct: false, feedback: '더하면 부풀려져요. 중복은 빼거나 r!로 나눠 정리해야 정확한 값이 돼요.', remedialFlowStartNodeId: 'coc_step3_C_explain', weaknessId: 'counting_overcounting' },
        ],
      },
    ],
  },

  g1_geometry: {
    heroPrompt: '직각삼각형을 찾아서 피타고라스 정리나 삼각비를 적용하는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        id: 'g1_geometry.step1',
        title: '직각삼각형 찾기',
        body: '도형 문제에서 가장 먼저 직각삼각형을 찾거나 보조선을 그어 만든다. 직각이 있어야 피타고라스 정리와 삼각비를 쓸 수 있다.',
        example: '예) 삼각형의 꼭짓점에서 밑변에 수선을 내리면 두 직각삼각형이 생긴다',
        choices: [
          { text: '보조선을 그어 직각삼각형을 만든다', correct: true, feedback: '맞아요! 직각이 만들어져야 피타고라스와 삼각비가 작동해요.' },
          { text: '모든 삼각형에 바로 삼각비를 적용한다', correct: false, feedback: '삼각비는 직각삼각형이 전제예요. 직각이 없는 삼각형이라면 보조선부터 그려야 해요.' },
          { text: '직각이 없어도 피타고라스 정리를 쓸 수 있다', correct: false, feedback: '피타고라스 정리는 직각삼각형에서만 성립해요. 우선 직각을 확보해야 해요.' },
        ],
      },
      {
        id: 'g1_geometry.step2',
        title: '피타고라스 정리 적용',
        body: '직각삼각형에서 a²+b²=c² (c: 빗변). 두 변을 알면 나머지 한 변을 구할 수 있다.',
        example: '예) 두 변이 3, 4이면 빗변=√(9+16)=5',
        choices: [
          { text: '두 변의 제곱의 합 = 빗변의 제곱', correct: true, feedback: '맞아요! a²+b²=c²의 형태가 핵심이에요.' },
          { text: '두 변의 합 = 빗변', correct: false, feedback: '그냥 더한 값은 빗변과 달라요. 제곱끼리 합쳐야 빗변의 제곱이 나와요.' },
          { text: '빗변의 제곱 = 두 변의 제곱의 차', correct: false, feedback: '차가 아니라 합이에요. 부호 하나가 결과를 완전히 바꿔놓아요.' },
        ],
      },
      {
        id: 'g1_geometry.step3',
        title: '삼각비로 변의 길이·넓이 계산',
        body: 'sinθ=대변/빗변, cosθ=밑변/빗변, tanθ=대변/밑변. 각도와 한 변을 알면 나머지 변을 구하고, 넓이=(1/2)×밑변×높이로 계산한다.',
        example: '예) 빗변=10, θ=30° → 높이=10×sin30°=5, 넓이=(1/2)×밑변×5',
        choices: [
          { text: 'sinθ=대변/빗변으로 높이를 구한 뒤 넓이를 계산한다', correct: true, feedback: '맞아요! 높이를 만들면 (1/2)×밑변×높이로 자연스럽게 이어져요.' },
          { text: 'sinθ=밑변/빗변이다', correct: false, feedback: 'sin은 대변과 빗변의 비예요. 밑변과 빗변은 cos가 담당해요.' },
          { text: '각도만 알면 변의 길이를 구할 수 있다', correct: false, feedback: '각도만으로는 비율만 정해져요. 한 변 이상의 길이가 같이 있어야 실제 값이 나와요.' },
        ],
      },
    ],
  },

  // ─── 고2 공통 ────────────────────────────────────────────────────
  g2_set_operation: {
    heroPrompt: '합집합과 교집합 계산에서 원소를 세는 순서를 다시 떠올려볼게요.',
    thinkingSteps: [
      {
        id: 'g2_set_operation.step1',
        title: '두 집합 원소 나열',
        body: 'A와 B의 원소를 각각 적고, 공통 원소를 먼저 찾는다.',
        example: '예) A={1,2,3}, B={2,3,4} → 공통: {2,3}',
        choices: [
          { text: '공통 원소를 먼저 찾아야 한다', correct: true, feedback: '맞아요! 공통 원소를 잡아두면 합집합·교집합이 모두 쉬워져요.' },
          { text: '두 집합을 그냥 합쳐서 세면 된다', correct: false, feedback: '단순히 합치면 공통 원소를 두 번 세게 돼요. 공통 원소를 먼저 찾는 게 안전해요.', remedialFlowStartNodeId: 'gso_step1_B_explain', weaknessId: 'g2_set_operation' },
          { text: '원소 개수만 더하면 된다', correct: false, feedback: '더하면 공통 원소가 두 번 세어져요. n(A∩B)를 한 번 빼는 단계가 필요해요.', remedialFlowStartNodeId: 'gso_step1_C_explain', weaknessId: 'g2_set_operation' },
        ],
      },
      {
        id: 'g2_set_operation.step2',
        title: '합집합 구성',
        body: 'A∪B는 A와 B의 모든 원소를 중복 없이 모은 집합이다.',
        example: '예) A∪B = {1,2,3,4}',
        choices: [
          { text: '중복 원소는 한 번만 쓴다', correct: true, feedback: '맞아요! 집합은 중복을 허용하지 않는다는 정의가 그대로 적용돼요.' },
          { text: '중복 원소는 두 번 써야 한다', correct: false, feedback: '집합 정의에 따라 같은 원소는 한 번만 등장해요. 두 번 쓰면 집합이 아니에요.', remedialFlowStartNodeId: 'gso_step2_B_explain', weaknessId: 'g2_set_operation' },
          { text: '합집합은 더 큰 집합만 가리킨다', correct: false, feedback: '합집합은 두 집합의 모든 원소를 모은 새로운 집합이에요. 한쪽만 가리키지 않아요.', remedialFlowStartNodeId: 'gso_step2_C_explain', weaknessId: 'g2_set_operation' },
        ],
      },
      {
        id: 'g2_set_operation.step3',
        title: 'n(A∪B) 공식 적용',
        body: 'n(A∪B) = n(A) + n(B) - n(A∩B)로 원소 개수를 계산한다.',
        example: '예) n(A)=3, n(B)=3, n(A∩B)=2 → n(A∪B)=4',
        choices: [
          { text: '공통 원소 개수를 한 번 뺀다', correct: true, feedback: '맞아요! 두 번 세진 공통 원소를 한 번 보정해주는 게 공식의 핵심이에요.' },
          { text: '공통 원소 개수를 더한다', correct: false, feedback: 'n(A)+n(B)에서 이미 두 번 세어진 공통 원소를 또 더하면 세 번이 돼요. 빼는 방향이 맞아요.', remedialFlowStartNodeId: 'gso_step3_B_explain', weaknessId: 'g2_set_operation' },
          { text: '공통 원소가 없어도 빼야 한다', correct: false, feedback: '공통 원소가 없으면 n(A∩B)=0이라 빼는 효과가 사라져요. 공식은 같지만 결과는 단순한 합이에요.', remedialFlowStartNodeId: 'gso_step3_C_explain', weaknessId: 'g2_set_operation' },
        ],
      },
    ],
  },
  g2_set_complement: {
    heroPrompt: '여집합을 구할 때 전체집합 U를 기준으로 생각하는 흐름을 확인해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_set_complement.step1',
        title: '전체집합 U 확인',
        body: '문제에서 전체집합 U가 무엇인지 먼저 명시적으로 적는다.',
        example: '예) U={1,2,3,4,5,6}',
        choices: [
          { text: 'U를 먼저 확인해야 한다', correct: true, feedback: '맞아요! 여집합은 U라는 기준이 있어야 정해져요.' },
          { text: 'U 없이 여집합을 바로 구할 수 있다', correct: false, feedback: 'U가 무엇이냐에 따라 여집합이 달라져요. 기준이 없으면 정해지지 않아요.', remedialFlowStartNodeId: 'gsc_step1_B_explain', weaknessId: 'g2_set_complement' },
          { text: 'U는 항상 자연수 전체이다', correct: false, feedback: 'U는 문제마다 달라요. 명시적으로 주어진 U를 그대로 따라야 해요.', remedialFlowStartNodeId: 'gsc_step1_C_explain', weaknessId: 'g2_set_complement' },
        ],
      },
      {
        id: 'g2_set_complement.step2',
        title: 'A의 원소 제거',
        body: 'A^c = U에서 A의 원소를 모두 제거한 나머지 집합이다.',
        example: '예) A={2,4} → A^c = {1,3,5,6}',
        choices: [
          { text: 'U에서 A를 빼면 A^c가 된다', correct: true, feedback: '맞아요! 전체에서 A에 속한 원소만 빼면 여집합이 만들어져요.' },
          { text: 'A에서 U를 빼면 A^c가 된다', correct: false, feedback: '방향이 반대예요. 큰 집합 U에서 A의 원소를 빼는 게 맞아요.', remedialFlowStartNodeId: 'gsc_step2_B_explain', weaknessId: 'g2_set_complement' },
          { text: 'A^c는 A의 원소를 뒤집은 것이다', correct: false, feedback: 'A^c는 U에 속하면서 A에 속하지 않는 원소예요. 단순히 뒤집는 게 아니라 U라는 기준이 있어요.', remedialFlowStartNodeId: 'gsc_step2_C_explain', weaknessId: 'g2_set_complement' },
        ],
      },
      {
        id: 'g2_set_complement.step3',
        title: '검증',
        body: 'A와 A^c를 합하면 반드시 U가 되어야 한다.',
        example: '예) A∪A^c = {1,2,3,4,5,6} = U 확인',
        choices: [
          { text: 'A와 A^c를 합치면 U가 된다', correct: true, feedback: '맞아요! 이 관계로 결과를 검증할 수 있어요.' },
          { text: 'A와 A^c의 교집합이 U이다', correct: false, feedback: '둘은 서로 겹치지 않는 집합이라 교집합은 공집합이에요. 합집합이 U예요.', remedialFlowStartNodeId: 'gsc_step3_B_explain', weaknessId: 'g2_set_complement' },
          { text: 'A와 A^c의 원소 개수는 항상 같다', correct: false, feedback: '그건 우연일 때만 성립해요. A의 원소 수와 A^c의 원소 수를 더하면 U의 원소 수가 돼요.', remedialFlowStartNodeId: 'gsc_step3_C_explain', weaknessId: 'g2_set_complement' },
        ],
      },
    ],
  },
  g2_set_count: {
    heroPrompt: '원소 개수 공식 n(A∪B) = n(A)+n(B)-n(A∩B)를 단계별로 적용해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_set_count.step1',
        title: 'n(A∩B) 먼저',
        body: '공식에서 빼야 하는 n(A∩B)를 먼저 구한다.',
        example: '예) A={1,2,3,4}, B={3,4,5} → n(A∩B)=2',
        choices: [
          { text: 'n(A∩B)를 먼저 구해야 한다', correct: true, feedback: '맞아요! 빼야 하는 값을 미리 정해두면 공식 적용이 매끄러워요.' },
          { text: 'n(A∪B)를 먼저 세면 된다', correct: false, feedback: '이번 단계는 공식을 쓰는 흐름이라 먼저 n(A∩B)를 구하는 게 맞아요. 큰 문제에서는 공식이 빠르고 정확해요.', remedialFlowStartNodeId: 'gsn_step1_B_explain', weaknessId: 'g2_set_count' },
          { text: 'n(A)와 n(B)만 알면 충분하다', correct: false, feedback: '공통 부분이 빠지면 두 번 세어진 원소를 보정할 수 없어요. n(A∩B)도 함께 필요해요.', remedialFlowStartNodeId: 'gsn_step1_C_explain', weaknessId: 'g2_set_count' },
        ],
      },
      {
        id: 'g2_set_count.step2',
        title: '공식 대입',
        body: 'n(A∪B) = n(A)+n(B)-n(A∩B)에 각 값을 대입한다.',
        example: '예) 4+3-2 = 5',
        choices: [
          { text: 'n(A∩B)를 한 번만 뺀다', correct: true, feedback: '맞아요! 두 번 세진 만큼 정확히 한 번만 빼는 게 핵심이에요.' },
          { text: 'n(A∩B)를 두 번 뺀다', correct: false, feedback: '두 번 빼면 공통 원소가 한 번도 세지지 않게 돼요. 한 번만 빼야 균형이 맞아요.', remedialFlowStartNodeId: 'gsn_step2_B_explain', weaknessId: 'g2_set_count' },
          { text: 'n(A∩B)를 더한다', correct: false, feedback: '더하면 공통 원소가 세 번 세어져요. 빼는 방향이 맞아요.', remedialFlowStartNodeId: 'gsn_step2_C_explain', weaknessId: 'g2_set_count' },
        ],
      },
      {
        id: 'g2_set_count.step3',
        title: '검증',
        body: '결과가 두 집합 중 큰 쪽 개수 이상이고 n(A)+n(B) 이하인지 확인한다.',
        example: '예) n(A∪B)=5: 4≤5≤7 ✓',
        choices: [
          { text: 'n(A∪B) ≤ n(A)+n(B)이어야 한다', correct: true, feedback: '맞아요! 단순 합보다 작거나 같다는 부등식이 자동으로 성립해요.' },
          { text: 'n(A∪B)는 항상 n(A)+n(B)와 같다', correct: false, feedback: '공통 원소가 있으면 합보다 작아져요. 두 값이 같은 건 공통 원소가 없을 때뿐이에요.', remedialFlowStartNodeId: 'gsn_step3_B_explain', weaknessId: 'g2_set_count' },
          { text: 'n(A∪B)는 두 집합 중 작은 것보다 작을 수 있다', correct: false, feedback: '한쪽 집합 전체를 포함하니 둘 중 큰 쪽보다 작아질 수 없어요.', remedialFlowStartNodeId: 'gsn_step3_C_explain', weaknessId: 'g2_set_count' },
        ],
      },
    ],
  },
  g2_prop_contrapositive: {
    heroPrompt: '역·이·대우 중 어느 것인지 헷갈릴 때는 표를 직접 채워보는 게 가장 빠릅니다.',
    thinkingSteps: [
      {
        id: 'g2_prop_contrapositive.step1',
        title: 'p→q 원래 명제 확인',
        body: '주어진 명제에서 가설 p와 결론 q를 분리한다.',
        example: '예) "짝수이면 정수이다" → p:짝수, q:정수',
        choices: [
          { text: '가설과 결론을 먼저 분리한다', correct: true, feedback: '맞아요! p와 q를 분리해야 역·이·대우를 정확히 만들 수 있어요.' },
          { text: '명제 전체를 통째로 뒤집는다', correct: false, feedback: '통째로 뒤집으면 어떤 변형인지 구분이 안 돼요. p와 q를 분리하는 단계가 필요해요.', remedialFlowStartNodeId: 'gpc_step1_B_explain', weaknessId: 'g2_prop_contrapositive' },
          { text: 'p와 q의 구분은 중요하지 않다', correct: false, feedback: '역·이·대우 정의가 모두 p, q를 어떻게 다루는지에 달려 있어요. 분리가 출발점이에요.', remedialFlowStartNodeId: 'gpc_step1_C_explain', weaknessId: 'g2_prop_contrapositive' },
        ],
      },
      {
        id: 'g2_prop_contrapositive.step2',
        title: '역·이·대우 정의 적용',
        body: '역: q→p, 이: ~p→~q, 대우: ~q→~p',
        example: '역: "정수이면 짝수이다" / 대우: "정수가 아니면 짝수가 아니다"',
        choices: [
          { text: '대우는 p와 q를 모두 부정하고 순서를 바꾼다', correct: true, feedback: '맞아요! 부정과 순서 바꿈을 동시에 하는 게 대우의 정의예요.' },
          { text: '역은 p와 q를 모두 부정한다', correct: false, feedback: '부정은 이의 정의예요. 역은 순서만 바꾸는 변형이에요.', remedialFlowStartNodeId: 'gpc_step2_B_explain', weaknessId: 'g2_prop_contrapositive' },
          { text: '이는 p와 q의 순서만 바꾼다', correct: false, feedback: '순서 바꿈은 역이에요. 이는 부정만 적용하는 변형이에요.', remedialFlowStartNodeId: 'gpc_step2_C_explain', weaknessId: 'g2_prop_contrapositive' },
        ],
      },
      {
        id: 'g2_prop_contrapositive.step3',
        title: '참·거짓 관계',
        body: '원명제와 대우는 항상 참·거짓이 같다. 역과 이도 서로 참·거짓이 같다.',
        example: '원명제 참 → 대우 참 / 역은 별도 판단',
        choices: [
          { text: '원명제가 참이면 대우도 참이다', correct: true, feedback: '맞아요! 동치 관계가 있어서 함께 참·거짓이 결정돼요.' },
          { text: '원명제가 참이면 역도 반드시 참이다', correct: false, feedback: '역은 따로 판단해야 해요. 원명제가 참이어도 역이 거짓일 수 있어요.', remedialFlowStartNodeId: 'gpc_step3_B_explain', weaknessId: 'g2_prop_contrapositive' },
          { text: '원명제와 이는 항상 참·거짓이 같다', correct: false, feedback: '이는 역과 동치예요. 원명제와 항상 일치하지는 않아요.', remedialFlowStartNodeId: 'gpc_step3_C_explain', weaknessId: 'g2_prop_contrapositive' },
        ],
      },
    ],
  },
  g2_prop_necessary_sufficient: {
    heroPrompt: '필요조건·충분조건은 화살표 방향으로 정리하면 헷갈리지 않아요.',
    thinkingSteps: [
      {
        id: 'g2_prop_necessary_sufficient.step1',
        title: 'p→q 화살표 방향 확인',
        body: 'p→q가 참이면 p는 q의 충분조건, q는 p의 필요조건이다.',
        example: '예) "정삼각형 → 이등변삼각형": 정삼각형은 이등변삼각형의 충분조건',
        choices: [
          { text: 'p→q이면 p가 충분조건이다', correct: true, feedback: '맞아요! 화살표가 시작되는 쪽이 충분조건이에요.' },
          { text: 'p→q이면 p가 필요조건이다', correct: false, feedback: '방향이 반대예요. 화살표가 도달하는 q가 필요조건이고, 출발하는 p가 충분조건이에요.', remedialFlowStartNodeId: 'gpn_step1_B_explain', weaknessId: 'g2_prop_necessary_sufficient' },
          { text: '화살표 방향은 조건 판단과 무관하다', correct: false, feedback: '방향이 곧 충분·필요를 결정해요. 어느 쪽에서 시작하는지가 핵심이에요.', remedialFlowStartNodeId: 'gpn_step1_C_explain', weaknessId: 'g2_prop_necessary_sufficient' },
        ],
      },
      {
        id: 'g2_prop_necessary_sufficient.step2',
        title: '역방향 q→p 확인',
        body: 'q→p도 참이면 p와 q는 서로 필요충분조건(동치)이다.',
        example: '예) 이등변삼각형이 정삼각형은 아니므로 q→p는 거짓 → 충분조건만',
        choices: [
          { text: '두 방향 모두 참이어야 필요충분조건이다', correct: true, feedback: '맞아요! 양방향이 모두 성립해야 동치라고 부를 수 있어요.' },
          { text: '한 방향만 참이어도 필요충분조건이다', correct: false, feedback: '한 방향만 성립하면 단순 충분 또는 필요예요. 양쪽이 모두 성립해야 필요충분이에요.', remedialFlowStartNodeId: 'gpn_step2_B_explain', weaknessId: 'g2_prop_necessary_sufficient' },
          { text: '필요충분조건은 반례가 있어도 성립한다', correct: false, feedback: '반례가 있다는 건 한 방향이 성립하지 않는다는 뜻이라 필요충분이 깨져요.', remedialFlowStartNodeId: 'gpn_step2_C_explain', weaknessId: 'g2_prop_necessary_sufficient' },
        ],
      },
      {
        id: 'g2_prop_necessary_sufficient.step3',
        title: '결론 도출',
        body: '화살표 방향을 정리하여 필요조건·충분조건·필요충분조건 중 하나를 선택한다.',
        example: 'p→q만 참: p는 충분조건, q는 필요조건',
        choices: [
          { text: 'p→q만 참이면 p는 충분조건, q는 필요조건이다', correct: true, feedback: '맞아요! 화살표 방향대로 깔끔하게 분리됐어요.' },
          { text: 'p→q만 참이면 p는 필요조건이다', correct: false, feedback: '방향이 뒤바뀌었어요. 출발이 충분, 도착이 필요예요.', remedialFlowStartNodeId: 'gpn_step3_B_explain', weaknessId: 'g2_prop_necessary_sufficient' },
          { text: '두 방향 중 하나만 참이면 동치이다', correct: false, feedback: '동치는 양방향 모두 참이어야 해요. 한쪽만으로는 부족해요.', remedialFlowStartNodeId: 'gpn_step3_C_explain', weaknessId: 'g2_prop_necessary_sufficient' },
        ],
      },
    ],
  },
  g2_prop_quantifier: {
    heroPrompt: '"모든"과 "어떤" 명제를 판별할 때는 반례 또는 예시 하나로 판단할 수 있어요.',
    thinkingSteps: [
      {
        id: 'g2_prop_quantifier.step1',
        title: '명제 유형 파악',
        body: '"모든 x에 대해 P(x)"는 전칭 명제, "어떤 x에 대해 P(x)"는 존재 명제이다.',
        example: '"모든 실수 x에 대해 x²≥0" vs "어떤 실수 x에 대해 x²<0"',
        choices: [
          { text: '"모든"은 전칭, "어떤"은 존재 명제이다', correct: true, feedback: '맞아요! 전칭과 존재의 차이를 양화사로 구분하는 게 시작이에요.' },
          { text: '"어떤"은 전칭, "모든"은 존재 명제이다', correct: false, feedback: '양화사가 뒤바뀌었어요. 모든은 전칭, 어떤은 존재예요.', remedialFlowStartNodeId: 'gpq_step1_B_explain', weaknessId: 'g2_prop_quantifier' },
          { text: '두 유형은 판별 방법이 같다', correct: false, feedback: '전칭은 반례 하나로 거짓, 존재는 예시 하나로 참이라 판별 방법이 달라요.', remedialFlowStartNodeId: 'gpq_step1_C_explain', weaknessId: 'g2_prop_quantifier' },
        ],
      },
      {
        id: 'g2_prop_quantifier.step2',
        title: '거짓/참 판별 전략',
        body: '전칭 명제는 반례 하나로 거짓. 존재 명제는 예시 하나로 참.',
        example: '"모든 정수 n에서 n²은 짝수" → n=1: 1²=1(홀수) → 반례 → 거짓',
        choices: [
          { text: '전칭 명제는 반례 하나로 거짓이 된다', correct: true, feedback: '맞아요! 모든이 깨지려면 단 하나의 반례면 충분해요.' },
          { text: '전칭 명제는 예시 하나로 참이 된다', correct: false, feedback: '예시 하나로는 모든 경우가 보장되지 않아요. 모든 x를 다 검증하거나 일반 증명이 필요해요.', remedialFlowStartNodeId: 'gpq_step2_B_explain', weaknessId: 'g2_prop_quantifier' },
          { text: '존재 명제는 반례로 참을 판별한다', correct: false, feedback: '존재 명제는 예시 하나면 참이에요. 반례는 전칭의 도구예요.', remedialFlowStartNodeId: 'gpq_step2_C_explain', weaknessId: 'g2_prop_quantifier' },
        ],
      },
      {
        id: 'g2_prop_quantifier.step3',
        title: '부정 명제 확인',
        body: '"모든 x에 대해 P(x)"의 부정은 "어떤 x에 대해 ~P(x)"이다.',
        example: '"모든 x: x²≥0"의 부정 → "어떤 x: x²<0"',
        choices: [
          { text: '"모든"의 부정은 "어떤 ~"이다', correct: true, feedback: '맞아요! 양화사가 뒤집히고 술어도 부정되는 규칙이에요.' },
          { text: '"모든"의 부정은 "모든 ~"이다', correct: false, feedback: '양화사 자체가 바뀌어야 해요. 모든의 부정은 어떤이에요.', remedialFlowStartNodeId: 'gpq_step3_B_explain', weaknessId: 'g2_prop_quantifier' },
          { text: '전칭 명제의 부정은 전칭 명제이다', correct: false, feedback: '부정하면 양화사가 뒤집혀 존재 명제가 돼요.', remedialFlowStartNodeId: 'gpq_step3_C_explain', weaknessId: 'g2_prop_quantifier' },
        ],
      },
    ],
  },
  g2_trig_unit_circle: {
    heroPrompt: '삼각함수 단위원에서 좌표를 읽는 방법을 다시 떠올려볼게요.',
    thinkingSteps: [
      {
        id: 'g2_trig_unit_circle.step1',
        title: '단위원의 기본',
        body: '각도 θ에서 단위원 위 점의 좌표는 (cosθ, sinθ)이다.',
        example: '예) θ=90° → (cos90°, sin90°) = (0, 1)',
        choices: [
          { text: 'x좌표=cosθ, y좌표=sinθ이다', correct: true, feedback: '맞아요! 단위원 위 점의 좌표가 곧 cos·sin값이에요.' },
          { text: 'x좌표=sinθ, y좌표=cosθ이다', correct: false, feedback: '두 좌표의 역할이 뒤바뀌었어요. x가 cos, y가 sin이에요.', remedialFlowStartNodeId: 'gtu_step1_B_explain', weaknessId: 'g2_trig_unit_circle' },
          { text: '좌표는 각도와 무관하다', correct: false, feedback: '각도가 변하면 좌표도 함께 변해요. 단위원에서 각도가 바로 좌표를 정해요.', remedialFlowStartNodeId: 'gtu_step1_C_explain', weaknessId: 'g2_trig_unit_circle' },
        ],
      },
      {
        id: 'g2_trig_unit_circle.step2',
        title: '사분면 부호 판단',
        body: '각도가 속한 사분면에 따라 sin·cos·tan의 부호가 결정된다.',
        example: '2사분면: sinθ>0, cosθ<0, tanθ<0',
        choices: [
          { text: '사분면을 먼저 확인하고 부호를 결정한다', correct: true, feedback: '맞아요! 사분면을 알면 부호가 자동으로 결정돼요.' },
          { text: '부호는 항상 양수이다', correct: false, feedback: '사분면에 따라 음수가 될 수도 있어요. 위치에 따라 부호가 달라져요.', remedialFlowStartNodeId: 'gtu_step2_B_explain', weaknessId: 'g2_trig_unit_circle' },
          { text: '사분면은 값에 영향을 주지 않는다', correct: false, feedback: '사분면이 부호를 결정해서 값에 직접 영향을 줘요. 위치 확인이 필요해요.', remedialFlowStartNodeId: 'gtu_step2_C_explain', weaknessId: 'g2_trig_unit_circle' },
        ],
      },
      {
        id: 'g2_trig_unit_circle.step3',
        title: '특수각 값 적용',
        body: '30°·45°·60°의 sin·cos값을 기억에서 꺼내 대입한다.',
        example: 'sin30°=1/2, cos30°=√3/2, sin45°=√2/2',
        choices: [
          { text: '특수각 값을 외워두어야 한다', correct: true, feedback: '맞아요! 30·45·60도의 값은 자주 쓰니 외워두면 풀이가 빨라져요.' },
          { text: '특수각 값은 매번 계산한다', correct: false, feedback: '매번 계산하면 시간이 부족해져요. 표준 값은 외워두는 게 효율적이에요.', remedialFlowStartNodeId: 'gtu_step3_B_explain', weaknessId: 'g2_trig_unit_circle' },
          { text: '특수각 외 각도는 같은 값을 쓴다', correct: false, feedback: '각도마다 값이 달라요. 일반 각도는 변환이나 계산기가 필요해요.', remedialFlowStartNodeId: 'gtu_step3_C_explain', weaknessId: 'g2_trig_unit_circle' },
        ],
      },
    ],
  },
  g2_trig_equation_range: {
    heroPrompt: '삼각방정식 풀이에서 범위 설정이 핵심입니다. 단위원에서 해를 모두 찾아볼게요.',
    thinkingSteps: [
      {
        id: 'g2_trig_equation_range.step1',
        title: '기본 해 구하기',
        body: '단위원에서 주어진 삼각함수 값을 만족하는 각도를 먼저 찾는다.',
        example: 'sinθ=1/2 → θ=30° (1사분면 기본각)',
        choices: [
          { text: '기본각을 먼저 구한다', correct: true, feedback: '맞아요! 1사분면 기준의 기본각을 잡아두면 대칭으로 다른 해를 찾기 쉬워요.' },
          { text: '범위부터 먼저 확인한다', correct: false, feedback: '범위는 마지막에 필터로 써요. 우선 모든 해 후보를 만들어야 해요.', remedialFlowStartNodeId: 'gte_step1_B_explain', weaknessId: 'g2_trig_equation_range' },
          { text: '해는 항상 하나이다', correct: false, feedback: '단위원 대칭성 때문에 여러 해가 동시에 존재할 때가 많아요.', remedialFlowStartNodeId: 'gte_step1_C_explain', weaknessId: 'g2_trig_equation_range' },
        ],
      },
      {
        id: 'g2_trig_equation_range.step2',
        title: '대칭 해 추가',
        body: '단위원의 대칭성으로 같은 값을 갖는 각도를 추가로 찾는다.',
        example: 'sinθ=1/2 → 1사분면 30°, 2사분면 150° (두 해)',
        choices: [
          { text: '대칭 각도를 추가로 찾아야 한다', correct: true, feedback: '맞아요! 같은 sin·cos 값을 갖는 다른 사분면의 각도까지 챙겨야 빠짐없어요.' },
          { text: '기본각 하나만으로 충분하다', correct: false, feedback: '단위원에는 같은 값을 갖는 각이 또 있어요. 기본각만 보면 해가 빠져요.', remedialFlowStartNodeId: 'gte_step2_B_explain', weaknessId: 'g2_trig_equation_range' },
          { text: '대칭 해는 항상 존재하지 않는다', correct: false, feedback: '대부분의 경우 대칭 해가 존재해요. 빠뜨리지 않으려면 두 번 확인해야 해요.', remedialFlowStartNodeId: 'gte_step2_C_explain', weaknessId: 'g2_trig_equation_range' },
        ],
      },
      {
        id: 'g2_trig_equation_range.step3',
        title: '주어진 범위로 필터링',
        body: '찾은 해 중 문제에서 주어진 θ의 범위에 해당하는 것만 최종 답으로 선택한다.',
        example: '0≤θ<2π → 30°(=π/6), 150°(=5π/6) 모두 포함',
        choices: [
          { text: '범위를 벗어난 해는 제외한다', correct: true, feedback: '맞아요! 마지막에 범위로 거르면 답이 깔끔하게 정리돼요.' },
          { text: '모든 해를 답으로 쓴다', correct: false, feedback: '주어진 범위 안에 있는 해만 답이에요. 범위 바깥은 정리해서 빼야 해요.', remedialFlowStartNodeId: 'gte_step3_B_explain', weaknessId: 'g2_trig_equation_range' },
          { text: '범위는 확인하지 않아도 된다', correct: false, feedback: '범위가 답을 좁혀줘요. 확인하지 않으면 불필요한 해가 답에 섞여요.', remedialFlowStartNodeId: 'gte_step3_C_explain', weaknessId: 'g2_trig_equation_range' },
        ],
      },
    ],
  },
  g2_trig_identity: {
    heroPrompt: '삼각함수 항등식을 적용하기 전에 sin·cos·tan의 관계를 먼저 적어볼게요.',
    thinkingSteps: [
      {
        id: 'g2_trig_identity.step1',
        title: '기본 항등식 확인',
        body: 'sin²θ+cos²θ=1, tanθ=sinθ/cosθ를 먼저 적는다.',
        example: 'sin²θ+cos²θ=1 → cos²θ=1-sin²θ로 변환 가능',
        choices: [
          { text: '기본 항등식을 먼저 적어야 한다', correct: true, feedback: '맞아요! 항등식을 적어두면 어떤 변환이 가능한지 한눈에 보여요.' },
          { text: '항등식 없이 바로 계산한다', correct: false, feedback: '삼각함수 식은 항등식으로 변환해야 풀리는 경우가 많아요. 출발점이 빠진 셈이에요.', remedialFlowStartNodeId: 'gti_step1_B_explain', weaknessId: 'g2_trig_identity' },
          { text: '항등식은 특정 각도에서만 성립한다', correct: false, feedback: '기본 항등식은 모든 각도에서 성립해요. 그래서 보편적으로 쓸 수 있어요.', remedialFlowStartNodeId: 'gti_step1_C_explain', weaknessId: 'g2_trig_identity' },
        ],
      },
      {
        id: 'g2_trig_identity.step2',
        title: '치환 방향 결정',
        body: '식에서 sin과 cos 중 하나로 통일할지, 아니면 tan으로 변환할지 결정한다.',
        example: '1-cos²θ → sin²θ로 치환하여 단순화',
        choices: [
          { text: '하나의 함수로 통일하면 계산이 쉬워진다', correct: true, feedback: '맞아요! sin이나 cos 하나로 통일하면 처리가 단순해져요.' },
          { text: '항상 tanθ로 변환해야 한다', correct: false, feedback: 'tan으로의 변환이 늘 유리하지는 않아요. 식의 모양에 맞춰 골라야 해요.', remedialFlowStartNodeId: 'gti_step2_B_explain', weaknessId: 'g2_trig_identity' },
          { text: '치환 없이 원형을 유지해야 한다', correct: false, feedback: '그대로 두면 더 풀기 어려워져요. 항등식을 활용해 단순화하는 게 자연스러워요.', remedialFlowStartNodeId: 'gti_step2_C_explain', weaknessId: 'g2_trig_identity' },
        ],
      },
      {
        id: 'g2_trig_identity.step3',
        title: '변환 후 계산',
        body: '치환 후 식을 정리하고 최종 값을 계산한다.',
        example: 'sin²θ+sinθ·cosθ = sinθ(sinθ+cosθ)로 인수분해',
        choices: [
          { text: '치환 후 인수분해나 간소화를 시도한다', correct: true, feedback: '맞아요! 치환 뒤 인수분해 같은 익숙한 처리가 이어지면 답이 보여요.' },
          { text: '치환 후 바로 답이 나온다', correct: false, feedback: '치환 뒤에도 정리 단계가 필요해요. 마지막 계산을 마무리해야 해요.', remedialFlowStartNodeId: 'gti_step3_B_explain', weaknessId: 'g2_trig_identity' },
          { text: '변환 후에도 항등식을 다시 쓴다', correct: false, feedback: '보통은 한 번 변환하면 충분해요. 다시 항등식을 쓰는 건 식이 더 복잡해질 때예요.', remedialFlowStartNodeId: 'gti_step3_C_explain', weaknessId: 'g2_trig_identity' },
        ],
      },
    ],
  },
  g2_poly_factoring: {
    heroPrompt: '고차 다항식 인수분해에서는 인수정리를 활용해 근을 먼저 찾아볼게요.',
    thinkingSteps: [
      {
        id: 'g2_poly_factoring.step1',
        title: '상수항 약수 대입',
        body: '상수항의 약수를 x에 대입하여 f(x)=0이 되는 값을 찾는다.',
        example: 'f(x)=x³-6x²+11x-6에서 f(1)=0 → (x-1)이 인수',
        choices: [
          { text: '상수항 약수를 대입해 근을 찾는다', correct: true, feedback: '맞아요! 정수 근은 상수항의 약수에서 후보가 나와요.' },
          { text: '최고차 계수 약수를 대입한다', correct: false, feedback: '분수 근까지 찾을 때 일부 역할을 하지만, 정수 근부터 찾을 때는 상수항 약수가 우선이에요.', remedialFlowStartNodeId: 'pfac_step1_B_explain', weaknessId: 'g2_poly_factoring' },
          { text: '대입 없이 인수를 바로 쓴다', correct: false, feedback: '근을 모르면 인수가 정해지지 않아요. 인수정리가 발판이 돼요.', remedialFlowStartNodeId: 'pfac_step1_C_explain', weaknessId: 'g2_poly_factoring' },
        ],
      },
      {
        id: 'g2_poly_factoring.step2',
        title: '조립제법으로 나누기',
        body: '찾은 근 a로 조립제법 또는 다항식 나눗셈을 수행한다.',
        example: 'f(x) ÷ (x-1) = x²-5x+6',
        choices: [
          { text: '조립제법으로 나머지 없이 나누어진다', correct: true, feedback: '맞아요! f(a)=0이라 나머지가 0으로 떨어져요.' },
          { text: '조립제법에서 나머지가 남아도 된다', correct: false, feedback: '근에 의한 나눗셈은 나머지가 0이어야 해요. 0이 아니면 그 값은 인수가 아니에요.', remedialFlowStartNodeId: 'pfac_step2_B_explain', weaknessId: 'g2_poly_factoring' },
          { text: '나눗셈 없이 인수를 바로 적는다', correct: false, feedback: '(x−a) 외의 인수는 몫에서 나와요. 나눗셈 단계를 생략하면 끝까지 분해되지 않아요.', remedialFlowStartNodeId: 'pfac_step2_C_explain', weaknessId: 'g2_poly_factoring' },
        ],
      },
      {
        id: 'g2_poly_factoring.step3',
        title: '몫 추가 인수분해',
        body: '나눗셈의 몫을 다시 인수분해하여 완전히 분해한다.',
        example: 'x²-5x+6 = (x-2)(x-3) → f(x)=(x-1)(x-2)(x-3)',
        choices: [
          { text: '몫을 다시 인수분해해야 완성된다', correct: true, feedback: '맞아요! 몫이 더 분해될 수 있는지 한 번 더 보는 게 마무리예요.' },
          { text: '첫 번째 인수 하나면 충분하다', correct: false, feedback: '고차식은 보통 인수가 더 있어요. 몫까지 분해해야 완전한 답이에요.', remedialFlowStartNodeId: 'pfac_step3_B_explain', weaknessId: 'g2_poly_factoring' },
          { text: '몫은 더 이상 인수분해할 수 없다', correct: false, feedback: '몫이 1차나 더 이상 분해 안 될 때까지 봐야 해요. 그렇지 않으면 분해가 덜 끝난 상태예요.', remedialFlowStartNodeId: 'pfac_step3_C_explain', weaknessId: 'g2_poly_factoring' },
        ],
      },
    ],
  },
  g2_poly_remainder: {
    heroPrompt: '나머지정리: f(x)를 (x-a)로 나눈 나머지는 f(a)입니다. 이 흐름을 확인해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_poly_remainder.step1',
        title: '나누는 식의 근 확인',
        body: '(x-a)로 나눌 때 나머지는 f(a). 근 a를 먼저 구한다.',
        example: '(x-2)로 나누면 근=2 → 나머지=f(2)',
        choices: [
          { text: '나누는 식의 근을 먼저 구한다', correct: true, feedback: '맞아요! 나누는 식의 근을 잡으면 나머지정리가 바로 작동해요.' },
          { text: '나누는 식의 계수를 대입한다', correct: false, feedback: '계수 자체가 아니라 나누는 식이 0이 되는 x를 대입해야 해요.', remedialFlowStartNodeId: 'prem_step1_B_diagnose', weaknessId: 'g2_poly_remainder' },
          { text: '나머지는 항상 0이다', correct: false, feedback: '나머지는 0일 수도, 다른 값일 수도 있어요. 정확히는 f(a)예요.', remedialFlowStartNodeId: 'prem_step1_C_diagnose', weaknessId: 'g2_poly_remainder' },
        ],
      },
      {
        id: 'g2_poly_remainder.step2',
        title: 'f(a) 계산',
        body: 'x=a를 f(x)에 대입하여 나머지 값을 계산한다.',
        example: 'f(x)=x³-2x+1에서 f(2)=8-4+1=5 → 나머지=5',
        choices: [
          { text: 'x=a를 f(x)에 대입한다', correct: true, feedback: '맞아요! 이 한 번의 대입으로 나머지가 결정돼요.' },
          { text: 'x=0을 대입한다', correct: false, feedback: 'x=0은 (x−a)와 무관한 값이에요. 나누는 식의 근인 x=a가 들어가야 해요.', remedialFlowStartNodeId: 'prem_step2_B_diagnose', weaknessId: 'g2_poly_remainder' },
          { text: 'f(x)를 직접 나눈 값을 구한다', correct: false, feedback: '직접 나눠도 되지만, 나머지정리를 쓰면 한 번의 대입으로 끝나요.', remedialFlowStartNodeId: 'prem_step2_C_diagnose', weaknessId: 'g2_poly_remainder' },
        ],
      },
      {
        id: 'g2_poly_remainder.step3',
        title: '인수정리 활용',
        body: 'f(a)=0이면 (x-a)는 f(x)의 인수. 이를 활용해 인수분해와 연결한다.',
        example: 'f(2)=0 → (x-2)는 f(x)의 인수 → 조립제법으로 분해',
        choices: [
          { text: 'f(a)=0이면 (x-a)가 인수이다', correct: true, feedback: '맞아요! 이 동치 관계가 인수정리의 핵심이에요.' },
          { text: 'f(a)=0이어도 인수가 아닐 수 있다', correct: false, feedback: 'f(a)=0은 곧 (x−a)가 인수라는 뜻이에요. 동치 관계로 묶여 있어요.', remedialFlowStartNodeId: 'prem_step3_B_diagnose', weaknessId: 'g2_poly_remainder' },
          { text: '인수정리는 나머지정리와 다른 개념이다', correct: false, feedback: '인수정리는 나머지정리의 특수한 경우예요. 같은 뿌리에서 나온 도구예요.', remedialFlowStartNodeId: 'prem_step3_C_diagnose', weaknessId: 'g2_poly_remainder' },
        ],
      },
    ],
  },
  g2_eq_setup: {
    heroPrompt: '방정식을 세우는 단계에서 조건을 하나씩 식으로 옮기는 연습을 해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_eq_setup.step1',
        title: '구하는 값 정의',
        body: '문제에서 구하는 것을 x(또는 다른 변수)로 놓고 명시적으로 적는다.',
        example: '"두 수의 합이 10" → 작은 수를 x, 큰 수를 10-x로 놓기',
        choices: [
          { text: '구하는 값을 변수로 먼저 정의한다', correct: true, feedback: '맞아요! 변수에 이름을 주는 순간부터 식이 만들어지기 시작해요.' },
          { text: '바로 방정식을 세운다', correct: false, feedback: '변수가 정의되지 않으면 식의 의미가 흔들려요. 한 줄 정의가 시작점이에요.', remedialFlowStartNodeId: 'eqst_step1_B_diagnose', weaknessId: 'g2_eq_setup' },
          { text: '변수 없이 풀 수 있다', correct: false, feedback: '조건이 두 개 이상이면 변수가 필요해요. 풀이가 모호해지지 않게 정의가 우선이에요.', remedialFlowStartNodeId: 'eqst_step1_C_diagnose', weaknessId: 'g2_eq_setup' },
        ],
      },
      {
        id: 'g2_eq_setup.step2',
        title: '조건을 식으로 변환',
        body: '문제의 각 조건을 변수를 이용한 등식·부등식으로 변환한다.',
        example: '"두 수의 곱이 21" → x(10-x)=21',
        choices: [
          { text: '조건 하나씩 식으로 적는다', correct: true, feedback: '맞아요! 한 줄씩 옮겨두면 어떤 조건을 빠뜨렸는지도 한눈에 보여요.' },
          { text: '모든 조건을 한 번에 식으로 쓴다', correct: false, feedback: '한 번에 옮기다 보면 빠뜨리는 조건이 생겨요. 하나씩 분리해서 적는 게 안전해요.', remedialFlowStartNodeId: 'eqst_step2_B_diagnose', weaknessId: 'g2_eq_setup' },
          { text: '조건은 무시하고 풀이 공식을 쓴다', correct: false, feedback: '조건 없이는 무엇을 푸는지 정해지지 않아요. 식 세우기가 풀이의 일부예요.', remedialFlowStartNodeId: 'eqst_step2_C_diagnose', weaknessId: 'g2_eq_setup' },
        ],
      },
      {
        id: 'g2_eq_setup.step3',
        title: '풀기 + 검증',
        body: '방정식을 풀어 x 값을 구하고, 원래 조건에 대입하여 검증한다.',
        example: 'x(10-x)=21 → x=3 또는 7. 조건 확인: 3×7=21 ✓',
        choices: [
          { text: '답을 원래 조건에 대입해 검증한다', correct: true, feedback: '맞아요! 검산이 들어가면 잘못된 해를 안전하게 걸러낼 수 있어요.' },
          { text: '방정식의 해가 바로 최종 답이다', correct: false, feedback: '방정식의 해가 문제 조건과 어긋날 때도 있어요. 한 번 대입해 확인하는 게 든든해요.', remedialFlowStartNodeId: 'eqst_step3_B_diagnose', weaknessId: 'g2_eq_setup' },
          { text: '검증은 필요하지 않다', correct: false, feedback: '검증을 빼면 조건 위반 해가 살아남기 쉬워요. 마지막 한 단계가 정확도를 지켜요.', remedialFlowStartNodeId: 'eqst_step3_C_diagnose', weaknessId: 'g2_eq_setup' },
        ],
      },
    ],
  },
  g2_radical_simplify: {
    heroPrompt: '무리식 간소화는 소인수분해에서 시작합니다. 순서를 확인해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_radical_simplify.step1',
        title: '근호 안 소인수분해',
        body: '근호 안의 수를 소인수분해하여 제곱수를 찾는다.',
        example: '√18 = √(2×9) = √(2·3²) → 3²을 밖으로 꺼낼 수 있다',
        choices: [
          { text: '소인수분해로 제곱수를 찾는다', correct: true, feedback: '맞아요! 제곱수를 발견하는 순간 단순화의 길이 열려요.' },
          { text: '근호 안 수를 반으로 나눈다', correct: false, feedback: '단순히 나눈다고 단순화되지 않아요. 제곱 묶음을 분리하는 게 핵심이에요.', remedialFlowStartNodeId: 'rsm_step1_B_explain', weaknessId: 'g2_radical_simplify' },
          { text: '소인수분해 없이 간소화할 수 있다', correct: false, feedback: '큰 수에서는 소인수분해가 가장 안전한 길이에요. 빠뜨리면 단순화 기회를 놓쳐요.', remedialFlowStartNodeId: 'rsm_step1_C_explain', weaknessId: 'g2_radical_simplify' },
        ],
      },
      {
        id: 'g2_radical_simplify.step2',
        title: '제곱수 밖으로 꺼내기',
        body: '√(a²·b) = a√b 규칙으로 제곱수의 제곱근을 근호 밖으로 꺼낸다.',
        example: '√18 = √(2·3²) = √(3²·2) = 3√2',
        choices: [
          { text: '제곱수의 양의 제곱근을 밖으로 꺼낸다', correct: true, feedback: '맞아요! 제곱이 한 단계 풀려서 밖으로 나오는 흐름이에요.' },
          { text: '제곱수를 그대로 근호 안에 둔다', correct: false, feedback: '그대로 두면 단순화가 안 돼요. 제곱은 근호 밖으로 보낼 수 있는 부분이에요.', remedialFlowStartNodeId: 'rsm_step2_B_explain', weaknessId: 'g2_radical_simplify' },
          { text: '제곱수를 나누기로 처리한다', correct: false, feedback: '나누는 게 아니라 √(a²×b)=a√b처럼 빼내는 거예요. 곱셈 구조 안에서 다뤄야 해요.', remedialFlowStartNodeId: 'rsm_step2_C_explain', weaknessId: 'g2_radical_simplify' },
        ],
      },
      {
        id: 'g2_radical_simplify.step3',
        title: '동류항 합산',
        body: '간소화 후 √a 형태가 같은 항끼리 계수를 더하거나 뺀다.',
        example: '3√2 + √8 = 3√2 + 2√2 = (3+2)√2 = 5√2',
        choices: [
          { text: '√a 앞 계수끼리만 더하거나 뺀다', correct: true, feedback: '맞아요! 근호 안이 같을 때만 계수가 합쳐져요.' },
          { text: '근호 안 수도 함께 더한다', correct: false, feedback: '근호 안의 수는 그대로 두고 계수만 합쳐요. 더하면 다른 값이 만들어져요.', remedialFlowStartNodeId: 'rsm_step3_B_explain', weaknessId: 'g2_radical_simplify' },
          { text: '√a가 같아도 합산할 수 없다', correct: false, feedback: '근호 안이 같으면 동류항처럼 합산할 수 있어요. 가능한 정리 단계예요.', remedialFlowStartNodeId: 'rsm_step3_C_explain', weaknessId: 'g2_radical_simplify' },
        ],
      },
    ],
  },
  g2_radical_rationalize: {
    heroPrompt: '분모 유리화는 켤레식(분모의 부호만 바꾼 식)을 곱하는 것부터 시작합니다. 단계별로 확인해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_radical_rationalize.step1',
        title: '분모 유형 확인',
        body: '분모가 √a이면 √a를, a+√b이면 켤레 a-√b를 곱한다.',
        example: '1/(2+√3) → 켤레: (2-√3)',
        choices: [
          { text: '분모의 켤레를 분자·분모 모두 곱한다', correct: true, feedback: '맞아요! 같은 수를 분자와 분모에 곱해야 값이 변하지 않아요.' },
          { text: '분자에만 켤레를 곱한다', correct: false, feedback: '분자만 곱하면 분수의 값 자체가 달라져요. 분모도 같이 곱해야 해요.', remedialFlowStartNodeId: 'rra_step1_B_explain', weaknessId: 'g2_radical_rationalize' },
          { text: '분모에만 켤레를 곱한다', correct: false, feedback: '분모만 곱해도 값이 달라져요. ×1이 되도록 분자에도 같이 곱해야 해요.', remedialFlowStartNodeId: 'rra_step1_C_explain', weaknessId: 'g2_radical_rationalize' },
        ],
      },
      {
        id: 'g2_radical_rationalize.step2',
        title: '분모 전개',
        body: '(a+√b)(a-√b) = a²-b 공식으로 분모를 계산한다. 이 합·차 곱 공식으로 √b가 사라져 분모가 유리수가 된다.',
        example: '(2+√3)(2-√3) = 4-3 = 1',
        choices: [
          { text: '(a+√b)(a-√b) = a²-b 공식으로 분모를 계산한다', correct: true, feedback: '맞아요! 합·차 곱 공식 덕분에 근호가 분모에서 사라져요.' },
          { text: '분모를 (a+√b)²으로 전개한다', correct: false, feedback: '그건 켤레가 아니에요. 켤레는 부호만 바꾼 식이라 (a+√b)(a−√b) 형태가 돼요.', remedialFlowStartNodeId: 'rra_step2_B_explain', weaknessId: 'g2_radical_rationalize' },
          { text: '분모 전개 결과는 항상 1이다', correct: false, feedback: '분모는 a²−b로 정해지는데, 그 값이 1일 때만 그렇게 보여요.', remedialFlowStartNodeId: 'rra_step2_C_explain', weaknessId: 'g2_radical_rationalize' },
        ],
      },
      {
        id: 'g2_radical_rationalize.step3',
        title: '분자 전개 후 정리',
        body: '분자도 전개하고, 분모가 유리수가 된 분수를 최종 정리한다.',
        example: '1·(2-√3)/1 = 2-√3',
        choices: [
          { text: '분자를 전개하고 분모로 나눈다', correct: true, feedback: '맞아요! 분자 정리도 함께 마쳐야 답이 깔끔해져요.' },
          { text: '분자는 그대로 두고 분모만 정리한다', correct: false, feedback: '분자에도 같은 수를 곱했으니 함께 정리해야 해요. 한쪽만 두면 식이 어색해져요.', remedialFlowStartNodeId: 'rra_step3_B_explain', weaknessId: 'g2_radical_rationalize' },
          { text: '유리화 후 분자에도 근호가 남아야 한다', correct: false, feedback: '유리화는 분모의 근호만 없애는 것이라, 분자에 근호가 남고 안 남고는 상관없어요.', remedialFlowStartNodeId: 'rra_step3_C_explain', weaknessId: 'g2_radical_rationalize' },
        ],
      },
    ],
  },
  g2_diff_application: {
    heroPrompt: "미분으로 최댓·최솟값을 찾으려면 f'(x)=0 → 증감표 → 극값 결정의 3단계가 핵심입니다.",
    thinkingSteps: [
      {
        id: 'g2_diff_application.step1',
        title: "f'(x) 구하기",
        body: "f(x)를 미분하여 f'(x)를 구한다. 각 항을 항별로 미분한다.",
        example: "f(x)=x³-3x+2 → f'(x)=3x²-3",
        choices: [
          { text: '각 항의 지수를 앞으로 내리고 지수를 1 감소시킨다', correct: true, feedback: '맞아요! 미분의 표준 규칙이 항별로 그대로 적용돼요.' },
          { text: 'f(x) 전체에 지수를 곱한다', correct: false, feedback: '각 항을 따로 미분해야 해요. 전체에 한 번 곱하는 방식이 아니에요.', remedialFlowStartNodeId: 'dap_step1_B_explain', weaknessId: 'g2_diff_application' },
          { text: '상수항도 미분하면 값이 남는다', correct: false, feedback: '상수항은 변화율이 없어 미분하면 0이 돼요. 값이 남지는 않아요.', remedialFlowStartNodeId: 'dap_step1_C_explain', weaknessId: 'g2_diff_application' },
        ],
      },
      {
        id: 'g2_diff_application.step2',
        title: "f'(x)=0 풀기 + 증감표",
        body: "f'(x)=0이 되는 x를 구하고, 그 주위에서 f'(x)의 부호 변화로 증감표를 작성한다.",
        example: "3x²-3=0 → x=±1. x<-1: +, -1~1: -, x>1: + → 극대 x=-1, 극소 x=1",
        choices: [
          { text: "f'(x) 부호 변화로 극대·극소를 결정한다", correct: true, feedback: '맞아요! 부호 변화의 방향이 곧 극대·극소를 정해요.' },
          { text: "f'(x)=0인 점이 반드시 극값이다", correct: false, feedback: 'f\'=0이어도 극값이 아닌 변곡점일 수 있어요. 부호 변화를 함께 봐야 해요.', remedialFlowStartNodeId: 'dap_step2_B_explain', weaknessId: 'g2_diff_application' },
          { text: '증감표 없이 극값을 바로 판단할 수 있다', correct: false, feedback: '증감표가 없으면 극대인지 극소인지 헷갈리기 쉬워요. 한 번 그려두는 게 안전해요.', remedialFlowStartNodeId: 'dap_step2_C_explain', weaknessId: 'g2_diff_application' },
        ],
      },
      {
        id: 'g2_diff_application.step3',
        title: '극값 계산 + 최종 판단',
        body: '극대·극소에서 f(x)값을 계산하고, 주어진 범위가 있으면 끝점도 확인한다.',
        example: 'f(-1)=4(극대), f(1)=0(극소). 범위 [-2,2]이면 f(-2), f(2)도 확인',
        choices: [
          { text: '닫힌 구간이면 끝점도 반드시 확인한다', correct: true, feedback: '맞아요! 끝점이 최댓값·최솟값이 될 수 있어 함께 봐야 해요.' },
          { text: '극값만 확인하면 충분하다', correct: false, feedback: '닫힌 구간에서는 극값과 끝점 중 어느 쪽이 더 큰·작은 값인지 모르기 때문에 끝점도 확인해야 해요.', remedialFlowStartNodeId: 'dap_step3_B_explain', weaknessId: 'g2_diff_application' },
          { text: '끝점은 항상 극값보다 작다', correct: false, feedback: '끝점이 극값보다 클 수도 있어요. 두 후보를 모두 비교해야 정확해요.', remedialFlowStartNodeId: 'dap_step3_C_explain', weaknessId: 'g2_diff_application' },
        ],
      },
    ],
  },
  g2_integral_basic: {
    heroPrompt: '부정적분 ∫xⁿdx = xⁿ⁺¹/(n+1)에서 지수와 계수를 어떻게 처리하는지 확인해볼게요.',
    thinkingSteps: [
      {
        id: 'g2_integral_basic.step1',
        title: '부정적분 공식 적용',
        body: '∫xⁿdx = xⁿ⁺¹/(n+1)+C (n≠-1). 지수를 1 올리고, 올린 지수로 나눈다.',
        example: '∫(3x²-2x+1)dx = x³-x²+x+C',
        choices: [
          { text: '지수를 1 증가시키고 증가된 지수로 나눈다', correct: true, feedback: '맞아요! 미분의 정확한 역방향이라 외워두면 든든해요.' },
          { text: '지수를 앞으로 내리고 1을 뺀다 (미분 공식)', correct: false, feedback: '그건 미분 공식이에요. 적분은 반대 방향, 즉 지수를 1 더하고 그 수로 나눠요.', remedialFlowStartNodeId: 'ibs_step1_B_explain', weaknessId: 'g2_integral_basic' },
          { text: '상수항은 적분해도 사라진다', correct: false, feedback: '상수항을 적분하면 일차 항이 생겨요. 사라지지는 않아요.', remedialFlowStartNodeId: 'ibs_step1_C_explain', weaknessId: 'g2_integral_basic' },
        ],
      },
      {
        id: 'g2_integral_basic.step2',
        title: '계수 처리 확인',
        body: '∫axⁿdx = a·xⁿ⁺¹/(n+1). 계수 a는 그대로 유지한 뒤 새 지수로 나눈다.',
        example: '∫6x²dx = 6·x³/3 = 2x³ (계수 6을 올린 지수 3으로 나눔)',
        choices: [
          { text: '계수는 그대로 두고 새 지수로 나눈다', correct: true, feedback: '맞아요! 계수는 유지, 분모는 새 지수로 정리되는 흐름이에요.' },
          { text: '계수는 지수처럼 앞으로 내린다', correct: false, feedback: '그건 미분 사고예요. 적분에서 계수는 그대로 두고 새 지수로 나누면 돼요.', remedialFlowStartNodeId: 'ibs_step2_B_explain', weaknessId: 'g2_integral_basic' },
          { text: '계수는 지수를 올리기 전 값으로 나눈다', correct: false, feedback: '올린 지수, 즉 n+1로 나눠야 해요. 원래 지수로 나누면 결과가 어긋나요.', remedialFlowStartNodeId: 'ibs_step2_C_explain', weaknessId: 'g2_integral_basic' },
        ],
      },
      {
        id: 'g2_integral_basic.step3',
        title: '미분으로 역검증',
        body: '구한 F(x)를 미분하면 원래 f(x)가 나와야 한다. 틀렸다면 적분 공식 적용에 실수가 있는 것이다.',
        example: '∫3x²dx = x³+C → (x³)′=3x² ✓',
        choices: [
          { text: 'F(x)를 미분해서 f(x)가 나오면 정확하다', correct: true, feedback: '맞아요! 미분과 적분의 역관계가 검산의 핵심이에요.' },
          { text: '미분과 적분은 역관계가 아니다', correct: false, feedback: '두 연산은 서로의 역이라 적분 후 미분하면 원함수로 돌아가요.', remedialFlowStartNodeId: 'ibs_step3_B_explain', weaknessId: 'g2_integral_basic' },
          { text: '상수 C는 미분하면 1이 된다', correct: false, feedback: '상수의 미분은 0이에요. 그래서 적분에 +C가 붙어도 미분으로 사라져요.', remedialFlowStartNodeId: 'ibs_step3_C_explain', weaknessId: 'g2_integral_basic' },
        ],
      },
    ],
  },
  g2_integral_definite: {
    heroPrompt: '부정적분은 구했는데 끝값 대입에서 실수했나요? 아래 끝값이 0이 아닐 때를 집중적으로 확인해봅시다.',
    thinkingSteps: [
      {
        id: 'g2_integral_definite.step1',
        title: '아래 끝값도 반드시 대입',
        body: '[F(x)]ₐᵇ = F(b)-F(a). 아래 끝값 a가 0이 아닌 경우에도 F(a)를 반드시 계산하여 뺀다.',
        example: '[x³]₁³ → F(3)=27, F(1)=1 → 27-1=26. (F(1)을 빼지 않으면 27로 오답)',
        choices: [
          { text: '아래 끝값이 0이 아닌 경우에도 F(a)를 뺀다', correct: true, feedback: '맞아요! 0이 아닌 경우에도 빼는 단계는 빠뜨릴 수 없어요.' },
          { text: '아래 끝값이 0이 아닌 경우 F(a)를 빼지 않아도 된다', correct: false, feedback: 'F(a)≠0이면 빼지 않을 수 없어요. 정의에 따라 항상 F(b)−F(a)예요.', remedialFlowStartNodeId: 'idf_step1_B_explain', weaknessId: 'g2_integral_definite' },
          { text: 'F(아래끝)-F(위끝) 순서이다', correct: false, feedback: '순서가 반대예요. 위 끝에서 아래 끝을 빼는 방향이 맞아요.', remedialFlowStartNodeId: 'idf_step1_C_explain', weaknessId: 'g2_integral_definite' },
        ],
      },
      {
        id: 'g2_integral_definite.step2',
        title: 'F(b), F(a) 각각 별도 계산',
        body: 'F(b)와 F(a)를 한꺼번에 계산하면 부호 실수가 생긴다. 두 값을 먼저 따로 구한 뒤 뺀다.',
        example: '[2x³]₁² → F(2)=16, F(1)=2 → 16-2=14. (한꺼번에 계산 시 부호 실수 위험)',
        choices: [
          { text: 'F(b)와 F(a)를 따로 계산한 뒤 뺀다', correct: true, feedback: '맞아요! 따로 정리한 뒤 빼는 게 부호 실수를 줄여요.' },
          { text: '한 번에 전개해도 실수가 없다', correct: false, feedback: '한 번에 처리하면 부호가 어디서 어긋났는지 추적이 어려워요. 끊어 가는 게 안전해요.', remedialFlowStartNodeId: 'idf_step2_B_explain', weaknessId: 'g2_integral_definite' },
          { text: 'F(0)=0이므로 아래끝이 0이면 생략해도 된다', correct: false, feedback: '그 경우엔 결과가 같아 보일 수 있지만, 일반적으로는 항상 F(a)를 빼는 단계가 정의예요.', remedialFlowStartNodeId: 'idf_step2_C_explain', weaknessId: 'g2_integral_definite' },
        ],
      },
      {
        id: 'g2_integral_definite.step3',
        title: '빼기 부호 전파 확인',
        body: 'F(a)에 여러 항이 있을 때 빼기 부호가 모든 항에 적용되는지 확인한다.',
        example: '[x²+2x]₁³ = (9+6)-(1+2) = 15-3 = 12. F(1)=3을 빠뜨리면 15로 오답 ✓',
        choices: [
          { text: '빼기 부호가 F(a)의 모든 항에 적용된다', correct: true, feedback: '맞아요! 분배되는 마이너스를 모든 항에 살려야 답이 정확해져요.' },
          { text: '빼기 부호는 F(a)의 첫 항에만 적용된다', correct: false, feedback: '괄호로 묶인 F(a) 전체에 마이너스가 분배돼요. 첫 항만 적용하면 부호가 어긋나요.', remedialFlowStartNodeId: 'idf_step3_B_explain', weaknessId: 'g2_integral_definite' },
          { text: 'F(a)가 양수이면 빼지 않아도 된다', correct: false, feedback: '양수든 음수든 항상 빼야 해요. 부호와 상관없이 정의에 따른 절차예요.', remedialFlowStartNodeId: 'idf_step3_C_explain', weaknessId: 'g2_integral_definite' },
        ],
      },
    ],
  },
  g2_counting_method: {
    heroPrompt: '경우의 수 문제는 ① 순서를 따지는지(순열·조합) → ② 여러 경우를 더할지 곱할지 → ③ 공식에 넣기, 이 순서로 풀어요. 한 단계씩 짚어볼게요.',
    thinkingSteps: [
      {
        id: 'g2_counting_method.step1',
        title: '순서 있음/없음 판단',
        body: '선택 순서가 중요하면 순열(P), 순서 무관하면 조합(C)을 쓴다.',
        example: '"회장·부회장 선출" → 순서 있음 → ₅P₂=20',
        choices: [
          { text: '순서가 있으면 순열(P)을 쓴다', correct: true, feedback: '맞아요! 순서가 결정되는 순간 P가 자연스러운 선택이에요.' },
          { text: '순서가 있으면 조합(C)을 쓴다', correct: false, feedback: '조합은 순서를 무시하는 도구예요. 순서가 있으면 P가 맞아요.', remedialFlowStartNodeId: 'cmt_step1_A_diagnose', weaknessId: 'g2_counting_method' },
          { text: '순서는 경우의 수와 무관하다', correct: false, feedback: '순서가 결과를 다르게 만들 수 있어요. 그래서 P와 C가 갈리는 거예요.', remedialFlowStartNodeId: 'cmt_step1_C_diagnose', weaknessId: 'g2_counting_method' },
        ],
      },
      {
        id: 'g2_counting_method.step2',
        title: '두 경우를 더할까 곱할까',
        body: 'step1에서 순열·조합으로 셀 단위를 정한 뒤, 그 경우들을 어떻게 합칠지 정한다. "A 또는 B"(둘 중 한쪽만)는 더하고(합의 법칙), "A 그리고 B"(둘 다 함께)는 곱한다(곱의 법칙).',
        example: '"A 또는 B"(한쪽만) → 합의 법칙 / "A 그리고 B"(동시에) → 곱의 법칙',
        choices: [
          { text: '"또는"이면 합, "그리고"이면 곱의 법칙이다', correct: true, feedback: '맞아요! 한국어 접속사에서 자연스럽게 법칙이 따라와요.' },
          { text: '"또는"이면 곱, "그리고"이면 합의 법칙이다', correct: false, feedback: '법칙이 뒤바뀌었어요. 또는은 합, 그리고는 곱이에요.', remedialFlowStartNodeId: 'cmt_step2_A_diagnose', weaknessId: 'g2_counting_method' },
          { text: '항상 곱의 법칙을 쓴다', correct: false, feedback: '사건 관계에 따라 합·곱이 갈려요. 한쪽만 쓰면 어긋나는 경우가 많아요.', remedialFlowStartNodeId: 'cmt_step2_C_diagnose', weaknessId: 'g2_counting_method' },
        ],
      },
      {
        id: 'g2_counting_method.step3',
        title: '공식 대입',
        body: 'step1에서 정한 순열·조합 방법으로 각 부분을 계산하고, 여러 경우면 step2의 합·곱으로 묶는다. ₙPr = n!/(n-r)!, ₙCr = n!/(r!(n-r)!)를 쓴다.',
        example: '₅P₂ = 5×4 = 20 / ₅C₂ = 5×4/2 = 10',
        choices: [
          { text: 'P는 나누지 않고, C는 r!로 나눈다', correct: true, feedback: '맞아요! 순서를 지우는 r! 한 번이 두 공식의 차이예요.' },
          { text: 'P와 C의 계산 방법이 같다', correct: false, feedback: 'C는 P를 r!로 나눠 만든 값이에요. 두 공식의 결과는 달라요.', remedialFlowStartNodeId: 'cmt_step3_A_diagnose', weaknessId: 'g2_counting_method' },
          { text: 'C는 P보다 항상 크다', correct: false, feedback: '오히려 C는 P를 r!로 나눈 값이라 P보다 작거나 같아요.', remedialFlowStartNodeId: 'cmt_step3_C_diagnose', weaknessId: 'g2_counting_method' },
        ],
      },
    ],
  },
  g2_counting_overcounting: {
    heroPrompt: '중복 계산 오류는 포함-배제 원리로 해결합니다. 겹치는 경우를 명시적으로 찾아볼게요.',
    thinkingSteps: [
      {
        id: 'g2_counting_overcounting.step1',
        title: '각 경우의 수 계산',
        body: '조건 A, B 각각의 경우의 수를 따로 구한다.',
        example: '"3의 배수 또는 5의 배수": A=3의 배수 개수, B=5의 배수 개수',
        choices: [
          { text: 'A와 B를 각각 먼저 구한다', correct: true, feedback: '맞아요! 각 사건 수를 따로 정리해야 포함-배제가 정확히 적용돼요.' },
          { text: 'A와 B를 한 번에 구한다', correct: false, feedback: '한 번에 구하면 겹침을 잘 다루지 못해요. 분리해서 보는 게 안전해요.', remedialFlowStartNodeId: 'ovc_step1_B_diagnose', weaknessId: 'g2_counting_overcounting' },
          { text: '조건이 두 개면 그냥 더하면 된다', correct: false, feedback: '그냥 더하면 공통 부분이 두 번 세어져요. 한 번 빼는 보정이 필요해요.', remedialFlowStartNodeId: 'ovc_step1_C_diagnose', weaknessId: 'g2_counting_overcounting' },
        ],
      },
      {
        id: 'g2_counting_overcounting.step2',
        title: '겹치는 경우 찾기',
        body: 'A와 B 조건을 동시에 만족하는 경우(A∩B)를 구한다.',
        example: '"3과 5의 공배수 = 15의 배수": n(A∩B) 계산',
        choices: [
          { text: '두 조건을 동시에 만족하는 경우를 찾는다', correct: true, feedback: '맞아요! 공통 부분을 정확히 잡아야 중복을 제거할 수 있어요.' },
          { text: '겹치는 경우는 항상 없다', correct: false, feedback: '두 조건이 동시에 성립하는 경우가 자주 있어요. 한 번 확인해야 빠뜨리지 않아요.', remedialFlowStartNodeId: 'ovc_step2_B_diagnose', weaknessId: 'g2_counting_overcounting' },
          { text: '겹치는 경우는 무시한다', correct: false, feedback: '무시하면 두 번 세어진 채로 남아요. 정확히 한 번 빼야 균형이 맞아요.', remedialFlowStartNodeId: 'ovc_step2_C_diagnose', weaknessId: 'g2_counting_overcounting' },
        ],
      },
      {
        id: 'g2_counting_overcounting.step3',
        title: '포함-배제 원리 적용',
        body: 'n(A∪B) = n(A)+n(B)-n(A∩B)로 중복을 제거한다.',
        example: 'n(A)=33, n(B)=20, n(A∩B)=6 → 33+20-6=47',
        choices: [
          { text: '겹치는 경우를 정확히 한 번 뺀다', correct: true, feedback: '맞아요! 두 번 세진 만큼 한 번 보정해주는 게 핵심이에요.' },
          { text: '겹치는 경우를 두 번 뺀다', correct: false, feedback: '두 번 빼면 한 번도 세어지지 않아요. 한 번만 빼야 균형이 맞아요.', remedialFlowStartNodeId: 'ovc_step3_B_diagnose', weaknessId: 'g2_counting_overcounting' },
          { text: '겹치는 경우를 더한다', correct: false, feedback: '더하면 부풀려져요. 보정의 방향은 빼기예요.', remedialFlowStartNodeId: 'ovc_step3_C_diagnose', weaknessId: 'g2_counting_overcounting' },
        ],
      },
    ],
  },
  g2_inequality_range: {
    heroPrompt: '먼저 근을 구하고, 그다음 포물선 방향으로 해 범위를 정하는 순서로 풀어볼게요.',
    thinkingSteps: [
      {
        id: 'g2_inequality_range.step1',
        title: '이차방정식 풀어 근 구하기',
        body: '부등식을 =으로 바꿔 이차방정식의 두 근 α, β를 구한다 (α<β).',
        example: 'x²-3x-4=0 → (x-4)(x+1)=0 → x=-1, x=4',
        choices: [
          { text: '먼저 =으로 바꿔 근을 구한다', correct: true, feedback: '맞아요! 두 근이 보이면 부등식의 해 범위가 자연스럽게 그려져요.' },
          { text: '부등식을 직접 풀 수 있다', correct: false, feedback: '직접 풀이도 가능하지만, 근을 먼저 잡으면 그래프 위에서 해석하기 쉬워요.', remedialFlowStartNodeId: 'iqr_step1_A_diagnose', weaknessId: 'g2_inequality_range' },
          { text: '근을 구하지 않아도 범위를 쓸 수 있다', correct: false, feedback: '두 근이 해 범위의 경계예요. 근 없이는 범위가 정해지지 않아요.', remedialFlowStartNodeId: 'iqr_step1_C_diagnose', weaknessId: 'g2_inequality_range' },
        ],
      },
      {
        id: 'g2_inequality_range.step2',
        title: '포물선 방향과 해 범위 결정',
        body: 'a>0(아래로 볼록)일 때: 이차식 값이 0보다 클 때(>0)는 x<α 또는 x>β, 0보다 작을 때(<0)는 α<x<β',
        example: 'x²-3x-4<0, a=1>0 → -1<x<4 (근의 안쪽)',
        choices: [
          { text: 'a>0이고 이차식이 0보다 작으면 두 근 사이가 해이다', correct: true, feedback: '맞아요! 아래로 볼록 그래프가 0보다 작아지는 구간은 두 근 사이예요.' },
          { text: 'a>0이고 이차식이 0보다 작으면 두 근 바깥이 해이다', correct: false, feedback: '방향이 반대예요. a>0이고 이차식이 0보다 작으면 두 근 사이가 음수 구간이에요.', remedialFlowStartNodeId: 'iqr_step2_A_diagnose', weaknessId: 'g2_inequality_range' },
          { text: 'a의 부호는 해 범위에 영향을 주지 않는다', correct: false, feedback: 'a 부호가 그래프의 볼록 방향을 정하니 범위에 직접 영향을 줘요.', remedialFlowStartNodeId: 'iqr_step2_C_diagnose', weaknessId: 'g2_inequality_range' },
        ],
      },
      {
        id: 'g2_inequality_range.step3',
        title: '부등호 방향 최종 확인',
        body: '등호 포함(≤,≥) 여부에 따라 등호를 포함하거나 제외한다.',
        example: '<이면 등호 제외: -1<x<4 / ≤이면 등호 포함: -1≤x≤4',
        choices: [
          { text: '<이면 등호를 제외한다', correct: true, feedback: '맞아요! 부등호의 등호 포함 여부가 그대로 답에 반영돼요.' },
          { text: '<이면 등호를 포함한다', correct: false, feedback: '엄격 부등호는 등호를 제외해요. 등호 포함은 ≤·≥일 때예요.', remedialFlowStartNodeId: 'iqr_step3_A_diagnose', weaknessId: 'g2_inequality_range' },
          { text: '<든 ≤든 답의 범위는 똑같다', correct: false, feedback: '끝점이 들어가고 빠지는 차이가 있어요. <든 ≤든 같다고 보면 끝점에서 답이 어긋나요.', remedialFlowStartNodeId: 'iqr_step3_C_diagnose', weaknessId: 'g2_inequality_range' },
        ],
      },
    ],
  },
  g2_function_domain: {
    heroPrompt: '정의역·치역, 단계별로 범위를 같이 따라가 볼까요? 합성함수에서 역함수까지 한 흐름으로 이어가요.',
    thinkingSteps: [
      {
        id: 'g2_function_domain.step1',
        title: '내부 함수의 치역 확인',
        body: '합성함수 f∘g에서 g(x)의 치역이 f의 정의역 안에 있어야 한다.',
        example: 'g(x)=x² (치역: x≥0), f(x)=√x (정의역: x≥0) → 문제없음',
        choices: [
          { text: 'g의 치역이 f의 정의역 안에 있어야 한다', correct: true, feedback: '맞아요! g의 출력이 f의 입력 자격을 만족해야 합성이 가능해요.' },
          { text: 'f의 치역이 g의 정의역 안에 있어야 한다', correct: false, feedback: '방향이 반대예요. 합성 f∘g에서는 g가 먼저 작동해서 g의 치역이 f의 정의역에 들어가야 해요.', remedialFlowStartNodeId: 'fdm_step1_A_diagnose', weaknessId: 'g2_function_domain' },
          { text: '정의역 확인 없이 합성할 수 있다', correct: false, feedback: '정의역이 어긋나면 함수가 정의되지 않아요. 합성 조건 확인이 필수예요.', remedialFlowStartNodeId: 'fdm_step1_C_diagnose', weaknessId: 'g2_function_domain' },
        ],
      },
      {
        id: 'g2_function_domain.step2',
        title: '역함수의 정의역·치역 교환',
        body: '치역·정의역을 추적하는 건 역함수에서도 똑같아요. 이번엔 자리가 바뀝니다: 역함수 f⁻¹의 정의역 = f의 치역, f⁻¹의 치역 = f의 정의역이다.',
        example: 'f: [1,3]→[2,8] 이면 f⁻¹: [2,8]→[1,3]',
        choices: [
          { text: '역함수에서 정의역과 치역이 서로 바뀐다', correct: true, feedback: '맞아요! 역함수의 정의에서 입력과 출력이 자리를 바꿔요.' },
          { text: '역함수에서 정의역과 치역이 같다', correct: false, feedback: '두 집합이 자리를 바꿔서 보통 다르게 정해져요. 같은 경우는 특별한 함수에서만 나와요.', remedialFlowStartNodeId: 'fdm_step2_A_diagnose', weaknessId: 'g2_function_domain' },
          { text: '역함수는 항상 모든 실수가 정의역이다', correct: false, feedback: '원함수의 치역만큼이 역함수의 정의역이 돼요. 원함수에 따라 좁아질 수 있어요.', remedialFlowStartNodeId: 'fdm_step2_C_diagnose', weaknessId: 'g2_function_domain' },
        ],
      },
      {
        id: 'g2_function_domain.step3',
        title: '함수 성립 조건 확인',
        body: '역함수도 결국 함수예요. 함수가 되려면 하나의 x에 대해 f(x) 값이 오직 하나여야 한다(원함수가 일대일이면 역함수도 함수).',
        example: 'f(x)=±√x는 x=4에서 f=2, -2 두 값 → 함수가 아님',
        choices: [
          { text: '한 x에 하나의 y값이 대응되어야 한다', correct: true, feedback: '맞아요! 함수의 정의 그 자체예요.' },
          { text: '한 y에 여러 x가 대응될 수 없다', correct: false, feedback: '여러 x가 같은 y에 대응되는 함수도 많아요(예: x²). 그건 함수 정의에 걸리지 않아요.', remedialFlowStartNodeId: 'fdm_step3_A_diagnose', weaknessId: 'g2_function_domain' },
          { text: '모든 식은 함수이다', correct: false, feedback: '한 x에 두 값이 나오는 식은 함수가 아니에요. 정의를 기준으로 가려야 해요.', remedialFlowStartNodeId: 'fdm_step3_C_diagnose', weaknessId: 'g2_function_domain' },
        ],
      },
    ],
  },
  g3_diff: {
    heroPrompt: '항별 미분 → 합성함수 → 곱의 미분, 세 가지 미분 패턴을 차례로 점검해볼게요.',
    thinkingSteps: [
      {
        id: 'g3_diff.step1',
        title: '항별 미분 규칙',
        body: '미분은 식의 변화율을 구하는 거예요. xⁿ은 미분하면 nxⁿ⁻¹로 줄어들고, 각 항은 독립적으로 미분한 뒤 더해요.',
        example: '예) f(x)=3x²+2x+1 → 항별 미분: 3x²→6x, 2x→2, 1→0 → f\'(x)=6x+2',
        choices: [
          { text: '각 항의 지수를 앞으로 내리고 지수에서 1을 뺀다', correct: true, feedback: '맞아요! 미분 규칙이 항별로 그대로 적용돼요.' },
          { text: '지수를 그대로 두고 계수만 바꾼다', correct: false, feedback: '차수가 줄지 않으면 미분이 아니에요. 지수도 1 줄어야 해요.', remedialFlowStartNodeId: 'g3d_step1_A_diagnose', weaknessId: 'g3_diff' },
          { text: '상수항도 그대로 내려온다', correct: false, feedback: '상수항은 미분하면 0이에요. 변하지 않는 양은 변화율이 없어요.', remedialFlowStartNodeId: 'g3d_step1_C_diagnose', weaknessId: 'g3_diff' },
        ],
      },
      {
        id: 'g3_diff.step2',
        title: '합성함수 체인룰',
        body: '함수 안에 또 함수가 든 식을 합성함수라 해요(예: (x²+1)³). 미분 절차는 세 단계예요. ① 안쪽 x²+1 을 □ 로 두고 □³ 을 미분해 3□² ② □ 자리에 안쪽을 다시 넣어 3(x²+1)² ③ 안쪽 미분 2x 를 곱해 최종 답.',
        example: '예) f(x)=(x²+1)³ → ① □³ 미분: 3□² ② 안쪽 복원: 3(x²+1)² ③ 안쪽 미분 2x 곱: 3(x²+1)²·2x = 6x(x²+1)²',
        choices: [
          { text: '바깥 함수를 먼저 미분하고, 안쪽 함수의 미분을 곱한다', correct: true, feedback: '맞아요! 체인룰의 표준 순서예요.' },
          { text: '안쪽 함수를 먼저 미분하고, 바깥 함수의 미분을 곱한다', correct: false, feedback: '순서가 반대예요. 체인룰은 바깥부터 미분해서 안쪽을 그대로 둔 채 적고, 그 뒤에 안쪽 미분을 곱해야 결과가 맞아요.', remedialFlowStartNodeId: 'g3d_step2_A_diagnose', weaknessId: 'g3_diff' },
          { text: '두 함수를 각각 미분한 뒤 더한다', correct: false, feedback: '더하기는 합의 미분 규칙이에요. 합성함수에서는 곱하기로 묶여야 해요.', remedialFlowStartNodeId: 'g3d_step2_C_diagnose', weaknessId: 'g3_diff' },
        ],
      },
      {
        id: 'g3_diff.step3',
        title: '곱의 미분',
        body: '두 함수가 곱해진 식은 한쪽씩 번갈아 미분해 더해 줘요. 공식: (f·g)\'=f\'g+fg\' — 앞 미분 × 뒤 그대로에 앞 그대로 × 뒤 미분을 더해요.',
        example: '예) f(x)=x²·(x+1) → ① 앞 미분 × 뒤: 2x·(x+1) = 2x²+2x ② 앞 × 뒤 미분: x²·1 = x² → 두 항을 더하면 (2x²+2x) + x² = 3x²+2x',
        choices: [
          { text: '(앞 미분)·(뒤 그대로) + (앞 그대로)·(뒤 미분)', correct: true, feedback: '맞아요! 한쪽씩 번갈아 미분해 두 항으로 더한 게 핵심이에요.' },
          { text: '(앞 미분)·(뒤 미분) 한 항으로 끝', correct: false, feedback: '두 미분만 곱하면 다른 양이 돼요. 두 항으로 나눠서 합쳐야 해요.', remedialFlowStartNodeId: 'g3d_step3_A_diagnose', weaknessId: 'g3_diff' },
          { text: '(앞 미분) + (뒤 미분) 으로 더하기', correct: false, feedback: '그건 합의 미분이에요. 곱은 두 항(앞 미분·뒤, 앞·뒤 미분)으로 나눠 더해야 해요.', remedialFlowStartNodeId: 'g3d_step3_C_diagnose', weaknessId: 'g3_diff' },
        ],
      },
    ],
  },
  g3_integral: {
    heroPrompt: '∫xⁿdx 기본 공식부터 확인해볼게요.',
    thinkingSteps: [
      {
        id: 'g3_integral.step1',
        title: '부정적분 기본 공식',
        body: '∫xⁿdx = xⁿ⁺¹/(n+1)+C (n≠-1). 지수에 1을 더하고 그 수로 나눈 뒤 적분상수 C를 붙인다.',
        example: '예) ∫x³dx = x⁴/4+C',
        choices: [
          { text: '지수에 1을 더하고 그 수로 나눈다', correct: true, feedback: '맞아요! 미분의 역방향 그 자체예요.' },
          { text: '지수에서 1을 빼고 지수를 곱한다', correct: false, feedback: '그건 미분이에요. 적분은 반대 방향으로 움직여요.', remedialFlowStartNodeId: 'g3i_step1_A_explain', weaknessId: 'g3_integral' },
          { text: '지수를 그대로 두고 계수만 1 올린다', correct: false, feedback: '지수가 변하지 않으면 적분이 작동하지 않아요. 지수가 1 늘어야 해요.', remedialFlowStartNodeId: 'g3i_step1_C_explain', weaknessId: 'g3_integral' },
        ],
      },
      {
        id: 'g3_integral.step2',
        title: '정적분 계산',
        body: '∫ₐᵇf(x)dx = [F(x)]ₐᵇ = F(b)-F(a). 부정적분 F(x)를 구한 뒤 위 끝 값을 대입해서 아래 끝 값을 뺀다.',
        example: '예) ∫₀²x²dx = [x³/3]₀² = 8/3-0 = 8/3',
        choices: [
          { text: 'F(b)-F(a) 순서로 계산한다', correct: true, feedback: '맞아요! 위 끝에서 아래 끝을 빼는 흐름이에요.' },
          { text: 'F(a)-F(b) 순서로 계산한다', correct: false, feedback: '순서가 반대라 부호가 통째로 뒤집혀요. 위에서 아래를 빼는 방향이 맞아요.', remedialFlowStartNodeId: 'g3i_step2_A_explain', weaknessId: 'g3_integral' },
          { text: 'F(a)+F(b)를 계산한다', correct: false, feedback: '정적분은 차이로 정의돼요. 더하면 다른 양이 만들어져요.', remedialFlowStartNodeId: 'g3i_step2_C_explain', weaknessId: 'g3_integral' },
        ],
      },
      {
        id: 'g3_integral.step3',
        title: '넓이와 부호 처리',
        body: '곡선과 x축 사이의 넓이는 f(x)<0인 구간에서 절댓값을 취해야 한다. 구간을 나눠 계산하거나 |f(x)|를 적분한다.',
        example: '예) ∫₋₁¹(x²-1)dx=-4/3이지만 넓이=4/3',
        choices: [
          { text: 'x축 아래 구간은 적분 결과에 절댓값을 취한다', correct: true, feedback: '맞아요! 부호를 보정해야 진짜 넓이가 나와요.' },
          { text: '부호에 상관없이 적분 결과를 그대로 쓴다', correct: false, feedback: 'x축 아래에서는 적분 결과가 음수가 돼요. 넓이로 보려면 절댓값이 필요해요.', remedialFlowStartNodeId: 'g3i_step3_A_explain', weaknessId: 'g3_integral' },
          { text: '넓이는 항상 정적분과 같다', correct: false, feedback: 'f(x)<0인 구간이 섞이면 정적분이 음수일 수 있어요. 넓이는 절댓값을 취해야 해요.', remedialFlowStartNodeId: 'g3i_step3_C_explain', weaknessId: 'g3_integral' },
        ],
      },
    ],
  },
  g3_sequence: {
    heroPrompt: '등차인지 등비인지 먼저 판단하는 흐름이 떠오르나요?',
    thinkingSteps: [
      {
        id: 'g3_sequence.step1',
        title: '등차수열 일반항',
        body: '공차 d가 일정하면 등차수열이다. 일반항 aₙ=a₁+(n-1)d로 구한다.',
        example: '예) a₁=2, d=3 → a₅=2+4×3=14',
        choices: [
          { text: 'aₙ=a₁+(n-1)d', correct: true, feedback: '맞아요! 등차수열의 일반항 공식이에요.' },
          { text: 'aₙ=a₁·dⁿ⁻¹', correct: false, feedback: '그건 등비수열의 형태예요. 등차는 곱이 아니라 더하기로 진행해요.', remedialFlowStartNodeId: 'g3s_step1_A_explain', weaknessId: 'g3_sequence' },
          { text: 'aₙ=a₁+(n+1)d', correct: false, feedback: '(n−1) 자리가 한 칸 어긋났어요. (n+1)이 아니라 (n−1)이 맞아요.', remedialFlowStartNodeId: 'g3s_step1_C_explain', weaknessId: 'g3_sequence' },
        ],
      },
      {
        id: 'g3_sequence.step2',
        title: '등비수열 일반항',
        body: '공비 r이 일정하면 등비수열이다. 일반항 aₙ=a₁·rⁿ⁻¹로 구한다.',
        example: '예) a₁=3, r=2 → a₄=3·2³=24',
        choices: [
          { text: 'aₙ=a₁·rⁿ⁻¹', correct: true, feedback: '맞아요! 등비수열의 일반항이에요.' },
          { text: 'aₙ=a₁·rⁿ', correct: false, feedback: '지수가 한 칸 어긋났어요. n−1이 맞아요.', remedialFlowStartNodeId: 'g3s_step2_A_explain', weaknessId: 'g3_sequence' },
          { text: 'aₙ=a₁+(n-1)r', correct: false, feedback: '그건 등차의 형태예요. 등비는 곱으로 진행해요.', remedialFlowStartNodeId: 'g3s_step2_C_explain', weaknessId: 'g3_sequence' },
        ],
      },
      {
        id: 'g3_sequence.step3',
        title: '합 공식 적용',
        body: '등차수열 합 Sₙ=n(a₁+aₙ)/2, 등비수열 합 Sₙ=a₁(rⁿ-1)/(r-1) (r≠1). r=1이면 Sₙ=na₁.',
        example: '예) 등차: 1+2+…+10=10×11/2=55',
        choices: [
          { text: '등차는 n(a₁+aₙ)/2, 등비는 a₁(rⁿ-1)/(r-1)', correct: true, feedback: '맞아요! 등차는 (첫항+끝항)의 평균을 n번, 등비는 비례식에서 유도된 형태예요.' },
          { text: '등차는 a₁·rⁿ, 등비는 n(a₁+aₙ)/2', correct: false, feedback: '공식이 서로 바뀌었어요. 등차는 합 공식, 등비는 비례 공식이 맞아요.', remedialFlowStartNodeId: 'g3s_step3_A_explain', weaknessId: 'g3_sequence' },
          { text: '두 수열 모두 n×aₙ/2로 계산한다', correct: false, feedback: '그건 등차에만 해당해요. 등비는 다른 형태로 합이 나와요.', remedialFlowStartNodeId: 'g3s_step3_C_explain', weaknessId: 'g3_sequence' },
        ],
      },
    ],
  },
  g3_log_exp: {
    heroPrompt: '지수법칙부터 로그 성질, 밑 변환까지 차례로 정리해볼까요?',
    thinkingSteps: [
      {
        id: 'g3_log_exp.step1',
        title: '지수법칙 정리',
        body: 'aˣ·aʸ=aˣ⁺ʸ, aˣ÷aʸ=aˣ⁻ʸ, (aˣ)ʸ=aˣʸ. 같은 밑끼리 곱하면 지수를 더하고, 거듭제곱의 거듭제곱은 지수를 곱한다.',
        example: '예) 2³×2⁴=2⁷=128, (2³)²=2⁶=64',
        choices: [
          { text: '같은 밑의 곱은 지수를 더한다', correct: true, feedback: '맞아요! 같은 밑 곱셈은 지수의 합으로 정리돼요.' },
          { text: '같은 밑의 곱은 지수를 곱한다', correct: false, feedback: '곱셈은 지수의 합이에요. 지수를 곱하는 건 (aˣ)ʸ 거듭제곱의 거듭제곱 쪽이에요.', remedialFlowStartNodeId: 'g3l_step1_A_explain', weaknessId: 'g3_log_exp' },
          { text: '거듭제곱의 거듭제곱 (aˣ)ʸ 도 지수를 더한다', correct: false, feedback: '(aˣ)ʸ 는 지수를 곱해 aˣʸ 가 돼요. 곱셈은 합, 거듭제곱의 거듭제곱은 곱이에요.', remedialFlowStartNodeId: 'g3l_step1_C_explain', weaknessId: 'g3_log_exp' },
        ],
      },
      {
        id: 'g3_log_exp.step2',
        title: '로그 성질 — 곱과 나눗셈',
        body: 'logₐ(bc)=logₐb+logₐc, logₐ(b/c)=logₐb-logₐc. 곱은 로그의 합, 나눗셈은 로그의 차.',
        example: '예) 합: log₂8+log₂4=log₂32=5 / 차: log₂8-log₂4=log₂2=1',
        choices: [
          { text: '곱의 로그는 각 로그의 합이다', correct: true, feedback: '맞아요! 로그가 곱셈을 덧셈으로 풀어주는 성질이에요.' },
          { text: '곱의 로그는 각 로그의 곱이다', correct: false, feedback: '로그는 곱셈을 합으로 바꿔줘요. 두 로그의 곱은 다른 양이에요.', remedialFlowStartNodeId: 'g3l_step2_A_explain', weaknessId: 'g3_log_exp' },
          { text: '로그 안의 수를 나누면 지수를 나눈다', correct: false, feedback: '나눗셈은 로그의 차로 풀려요. 지수의 나눗셈이 아니에요.', remedialFlowStartNodeId: 'g3l_step2_C_explain', weaknessId: 'g3_log_exp' },
        ],
      },
      {
        id: 'g3_log_exp.step3',
        title: '밑 변환 공식',
        body: 'log₂7처럼 바로 안 떨어지는 값을 다룰 때 익숙한 밑(예: 10이나 e)으로 옮겨 계산하면 편하다. 밑 변환 공식 logₐb = log_c(b)/log_c(a) 로 풀어 쓴다.',
        example: '예) log₂8 = log₁₀8 / log₁₀2 = 3',
        choices: [
          { text: 'logₐb = log_c(b) / log_c(a) (같은 밑 c 로 묶은 비)', correct: true, feedback: '맞아요! 같은 밑 c 의 두 로그를 비로 묶는 형태예요.' },
          { text: 'logₐb = log_c(a) / log_c(b)', correct: false, feedback: '분자와 분모가 뒤바뀌었어요. 진수 b 가 분자, 원래 밑 a 가 분모로 가는 게 맞아요.', remedialFlowStartNodeId: 'g3l_step3_A_explain', weaknessId: 'g3_log_exp' },
          { text: 'logₐb = log_c(b) · log_c(a)', correct: false, feedback: '두 로그를 곱하면 다른 양이 만들어져요. 밑 변환은 비(나눗셈) 형태예요.', remedialFlowStartNodeId: 'g3l_step3_C_explain', weaknessId: 'g3_log_exp' },
        ],
      },
    ],
  },
  g3_trig: {
    heroPrompt: '단위원에서 sin·cos 값을 읽는 흐름을 다시 볼게요.',
    thinkingSteps: [
      {
        id: 'g3_trig.step1',
        title: '대표각 sin·cos·tan 값',
        body: '단위원에서 x좌표=cosθ, y좌표=sinθ. 0°→(1,0), 30°→(√3/2,1/2), 45°→(√2/2,√2/2), 60°→(1/2,√3/2), 90°→(0,1).',
        example: '예) sin60°=√3/2, cos60°=1/2, tan60°=√3',
        choices: [
          { text: '단위원에서 x좌표=cos, y좌표=sin으로 읽는다', correct: true, feedback: '맞아요! 단위원 위의 점이 곧 (cos, sin) 좌표예요.' },
          { text: '단위원에서 x좌표=sin, y좌표=cos으로 읽는다', correct: false, feedback: '두 좌표의 역할이 뒤바뀌었어요. x가 cos, y가 sin이에요.', remedialFlowStartNodeId: 'g3t_step1_B_explain', weaknessId: 'g3_trig' },
          { text: '반지름이 1이 아닌 원에서 읽어야 한다', correct: false, feedback: '정의는 반지름 1인 단위원에서 이뤄져요. 반지름이 다르면 비례 보정이 필요해요.', remedialFlowStartNodeId: 'g3t_step1_C_explain', weaknessId: 'g3_trig' },
        ],
      },
      {
        id: 'g3_trig.step2',
        title: '삼각함수 항등식',
        body: 'sin²θ+cos²θ=1, tanθ=sinθ/cosθ. 이 두 가지가 모든 변환의 기본이다.',
        example: '예) sinθ=3/5이면 cosθ=±4/5 (sin²+cos²=1 이용)',
        choices: [
          { text: 'sin²θ+cos²θ=1이 기본 항등식이다', correct: true, feedback: '맞아요! 단위원에서 x²+y²=1이 그대로 옮겨진 식이에요.' },
          { text: 'sin²θ-cos²θ=1이 기본 항등식이다', correct: false, feedback: '기본은 합이에요. 차의 형태는 다른 항등식의 변형에서 나와요.', remedialFlowStartNodeId: 'g3t_step2_B_explain', weaknessId: 'g3_trig' },
          { text: 'sinθ×cosθ=1이 항등식이다', correct: false, feedback: '그 식은 일반적으로 성립하지 않아요. 기본 항등식은 제곱의 합이에요.', remedialFlowStartNodeId: 'g3t_step2_C_explain', weaknessId: 'g3_trig' },
        ],
      },
      {
        id: 'g3_trig.step3',
        title: '각도 변환 공식',
        body: 'sin(90°-θ)=cosθ, cos(90°-θ)=sinθ, sin(180°-θ)=sinθ, cos(180°-θ)=-cosθ.',
        example: '예) sin120°=sin(180°-60°)=sin60°=√3/2',
        choices: [
          { text: 'sin(180°-θ)=sinθ', correct: true, feedback: '맞아요! 사분면을 따라 sin이 부호를 유지하는 변환이에요.' },
          { text: 'sin(180°-θ)=-sinθ', correct: false, feedback: '180°−θ는 2사분면이라 sin은 부호가 그대로예요. 부호가 뒤집히는 건 cos이에요.', remedialFlowStartNodeId: 'g3t_step3_B_explain', weaknessId: 'g3_trig' },
          { text: 'sin(90°-θ)=sinθ', correct: false, feedback: '그 변환은 cos이 돼요. sin과 cos가 자리를 바꾸는 관계예요.', remedialFlowStartNodeId: 'g3t_step3_C_explain', weaknessId: 'g3_trig' },
        ],
      },
    ],
  },
  g3_limit: {
    heroPrompt: '0/0 꼴을 만났을 때 첫 번째 할 일이 뭔지 기억나나요?',
    thinkingSteps: [
      {
        id: 'g3_limit.step1',
        title: '0/0 꼴 — 인수분해 후 약분',
        body: '분자·분모가 모두 0이 되면 공통인수가 있다는 뜻이다. 인수분해해서 약분한 뒤 x값을 대입한다.',
        example: '예) lim(x→2)(x²-4)/(x-2)=lim(x→2)(x-2)(x+2)/(x-2)=lim(x→2)(x+2)=4',
        choices: [
          { text: '인수분해해 공통인수를 약분한 뒤 대입한다', correct: true, feedback: '맞아요! 0/0이 보이면 인수분해가 첫 번째 도구예요.' },
          { text: '그냥 0/0=1로 처리한다', correct: false, feedback: '0/0은 부정형이라 값이 정해져 있지 않아요. 식 변형이 필요해요.', remedialFlowStartNodeId: 'g3m_step1_B_explain', weaknessId: 'g3_limit' },
          { text: '극한이 존재하지 않는다고 결론 짓는다', correct: false, feedback: '0/0은 변형해서 풀어야 비로소 답이 나와요. 바로 단정할 수는 없어요.', remedialFlowStartNodeId: 'g3m_step1_C_explain', weaknessId: 'g3_limit' },
        ],
      },
      {
        id: 'g3_limit.step2',
        title: '∞/∞ 꼴 — 최고차항으로 나누기',
        body: '0/0 외에 ∞/∞도 부정형이다. 분자·분모를 최고차항으로 나누면 작은 항은 0으로 줄어 결과가 보인다. 차수 비교: 분자>분모이면 ±∞, 같으면 계수비, 분자<분모이면 0.',
        example: '예) lim(x→∞)(2x²+1)/(x²-3)=2/1=2',
        choices: [
          { text: '최고차항의 계수비가 극한값이다', correct: true, feedback: '맞아요! 차수가 같을 때는 계수의 비가 답이에요.' },
          { text: '상수항끼리의 비가 극한값이다', correct: false, feedback: 'x→∞일 때 결정적인 건 최고차항이에요. 상수항은 큰 영향을 주지 않아요.', remedialFlowStartNodeId: 'g3m_step2_B_explain', weaknessId: 'g3_limit' },
          { text: '분자 차수가 크면 극한은 0이다', correct: false, feedback: '분자 차수가 크면 극한은 ±∞로 발산해요. 0이 되는 건 분자 차수가 더 작을 때예요.', remedialFlowStartNodeId: 'g3m_step2_C_explain', weaknessId: 'g3_limit' },
        ],
      },
      {
        id: 'g3_limit.step3',
        title: '부정형 해소 후 대입',
        body: 'step1·2 같은 부정형이 아닐 때는 바로 x값을 대입한다. 해소 후에도 부정형이 남으면 유리화 또는 분모 통분을 시도한다.',
        example: '예) lim(x→1)(x+2)=3 (부정형 아님, 바로 대입)',
        choices: [
          { text: '부정형이 아니면 바로 값을 대입한다', correct: true, feedback: '맞아요! 부정형이 아닐 때는 직접 대입이 정답이에요.' },
          { text: '항상 인수분해를 시도한 뒤 대입한다', correct: false, feedback: '부정형이 아니라면 인수분해 없이도 바로 대입할 수 있어요.', remedialFlowStartNodeId: 'g3m_step3_B_explain', weaknessId: 'g3_limit' },
          { text: '대입은 부정형일 때만 쓸 수 있다', correct: false, feedback: '오히려 반대예요. 부정형이 아닐 때 바로 대입할 수 있고, 부정형은 변형해서 풀어야 해요.', remedialFlowStartNodeId: 'g3m_step3_C_explain', weaknessId: 'g3_limit' },
        ],
      },
    ],
  },
  g3_conic: {
    heroPrompt: '포물선·타원·쌍곡선 표준형을 구분하는 기준을 확인할게요.',
    thinkingSteps: [
      {
        id: 'g3_conic.step1',
        title: '이차곡선 표준형 구분',
        body: '포물선: y²=4px 또는 x²=4py. 타원: x²/a²+y²/b²=1 (a≠b). 쌍곡선: x²/a²-y²/b²=1. 부호 차이가 핵심.',
        example: '예) x²/9+y²/4=1 → 타원 (두 항 모두 덧셈)',
        choices: [
          { text: '타원은 두 분수의 합, 쌍곡선은 두 분수의 차', correct: true, feedback: '맞아요! 부호 하나로 두 곡선이 갈려요.' },
          { text: '타원과 쌍곡선 모두 두 분수의 합', correct: false, feedback: '쌍곡선은 차의 형태예요. 합으로만 보면 타원으로 잘못 읽혀요.', remedialFlowStartNodeId: 'g3c_step1_B_explain', weaknessId: 'g3_conic' },
          { text: '부호와 관계없이 계수 크기로 구분한다', correct: false, feedback: '구분의 핵심은 부호예요. 같은 부호인지 다른 부호인지가 결정해요.', remedialFlowStartNodeId: 'g3c_step1_C_explain', weaknessId: 'g3_conic' },
        ],
      },
      {
        id: 'g3_conic.step2',
        title: '초점 좌표',
        body: '포물선 y²=4px: 초점(p,0). 타원 x²/a²+y²/b²=1(a>b): c²=a²-b²→초점(±c,0). 쌍곡선 x²/a²-y²/b²=1: c²=a²+b²→초점(±c,0).',
        example: '예) x²/25+y²/16=1 → c²=25-16=9 → c=3 → 초점(±3,0)',
        choices: [
          { text: '타원: c²=a²-b², 쌍곡선: c²=a²+b²', correct: true, feedback: '맞아요! 두 곡선의 초점 공식이 정확히 들어맞았어요.' },
          { text: '타원: c²=a²+b², 쌍곡선: c²=a²-b²', correct: false, feedback: '두 공식이 서로 바뀌었어요. 타원은 −b², 쌍곡선은 +b²예요.', remedialFlowStartNodeId: 'g3c_step2_B_explain', weaknessId: 'g3_conic' },
          { text: '두 곡선 모두 c²=a²+b²', correct: false, feedback: '타원은 −b², 쌍곡선은 +b²로 부호가 달라요.', remedialFlowStartNodeId: 'g3c_step2_C_explain', weaknessId: 'g3_conic' },
        ],
      },
      {
        id: 'g3_conic.step3',
        title: '쌍곡선 점근선',
        body: '쌍곡선 x²/a²-y²/b²=1의 점근선은 y=±(b/a)x. 쌍곡선은 이 두 직선에 한없이 가까워지지만 만나지는 않는다.',
        example: '예) x²/4-y²/9=1 → 점근선 y=±(3/2)x',
        choices: [
          { text: 'y=±(b/a)x', correct: true, feedback: '맞아요! 쌍곡선 점근선의 표준 형태예요.' },
          { text: 'y=±(a/b)x', correct: false, feedback: '분자와 분모가 뒤바뀌었어요. b/a가 맞아요.', remedialFlowStartNodeId: 'g3c_step3_B_explain', weaknessId: 'g3_conic' },
          { text: 'y=±(a+b)x', correct: false, feedback: '점근선 기울기는 비의 형태예요. 합이 아니라 b/a로 정해져요.', remedialFlowStartNodeId: 'g3c_step3_C_explain', weaknessId: 'g3_conic' },
        ],
      },
    ],
  },
  g3_counting: {
    heroPrompt: '순열과 조합 중 어느 것을 쓸지 판단하는 법부터 차근차근 볼게요.',
    thinkingSteps: [
      {
        id: 'g3_counting.step1',
        title: '순서 유무 판단',
        body: '문제에서 순서·배열·줄 세우기가 나오면 순열, 선택·뽑기·팀 구성이면 조합이에요. "자리 이름이 다른가" 한 줄로 갈려요.',
        example: '예) 5명 중 회장·부회장 선출 → 자리 이름이 달라 순열',
        choices: [
          { text: '순서가 중요하면 순열, 순서 무관하면 조합', correct: true, feedback: '맞아요! 이 한 가지 기준으로 P와 C가 갈려요.' },
          { text: '인원이 많으면 순열, 적으면 조합', correct: false, feedback: '기준은 인원 수가 아니라 자리 이름이 다른지예요.', remedialFlowStartNodeId: 'g3cn_step1_B_explain', weaknessId: 'g3_counting' },
          { text: '숫자가 크게 나오면 조합으로 계산한다', correct: false, feedback: '숫자 크기랑은 무관해요. 자리 이름이 다른지로만 골라야 해요.', remedialFlowStartNodeId: 'g3cn_step1_C_explain', weaknessId: 'g3_counting' },
        ],
      },
      {
        id: 'g3_counting.step2',
        title: '순열을 만들고 r! 로 나누면 조합이에요',
        body: 'P(n,r) 은 n 명에서 r 명을 줄 세우는 가짓수예요. 조합은 거기서 r 명의 자리 순서 r! 가지를 무시해야 하니까 r! 로 나눠 줘요. 정리하면 C(n,r) = P(n,r) / r! 이에요.',
        example: '예) P(5,2)=5×4=20, 2! 로 나누면 C(5,2)=10',
        choices: [
          { text: 'C(n,r)=P(n,r)/r!', correct: true, feedback: '맞아요! 자리 순서 r! 가지를 나눠 지우는 한 단계가 핵심이에요.' },
          { text: 'C(n,r)=P(n,r)×r!', correct: false, feedback: '곱하면 같은 묶음을 더 부풀려요. 나누는 방향이 맞아요.', remedialFlowStartNodeId: 'g3cn_step2_B_explain', weaknessId: 'g3_counting' },
          { text: 'C(n,r) 와 P(n,r) 은 같은 값이다', correct: false, feedback: '조합은 순열에서 자리 순서를 지운 값이라 보통 더 작아요.', remedialFlowStartNodeId: 'g3cn_step2_C_explain', weaknessId: 'g3_counting' },
        ],
      },
      {
        id: 'g3_counting.step3',
        title: '중복이 있는 경우',
        body: '같은 것을 다시 뽑을 수 있을 때, 순서를 따지면 중복순열 nʳ (n 가지를 r 번 거듭 곱) 을 써요. 순서를 무시하면 중복조합 H(n,r) 을 쓰는데, 모양은 C(n+r−1, r) 로 풀어요. 중복인지 아닌지를 먼저 확인하는 게 핵심이에요.',
        example: '예) 주사위 2번 → 같은 눈 가능 + 순서 따짐 → 중복순열 6²=36',
        choices: [
          { text: '중복 허용 순열은 nʳ, 중복 조합은 C(n+r-1,r)', correct: true, feedback: '맞아요! 중복 케이스의 두 표준 공식이 정확해요.' },
          { text: '중복이 있으면 그냥 n!을 더 곱한다', correct: false, feedback: 'n! 은 한 줄 세우기 가짓수예요. 중복엔 nʳ 또는 H(n,r) 을 따로 써요.', remedialFlowStartNodeId: 'g3cn_step3_B_explain', weaknessId: 'g3_counting' },
          { text: '중복 조합도 일반 C(n,r) 식 그대로 쓴다', correct: false, feedback: '중복조합은 위쪽 수가 n+r−1 로 바뀐 새 식이에요. C(n,r) 그대로는 안 돼요.', remedialFlowStartNodeId: 'g3cn_step3_C_explain', weaknessId: 'g3_counting' },
        ],
      },
    ],
  },
  g3_probability: {
    heroPrompt: '확률 단원 핵심 도구 — 여사건, 조건부확률, 독립을 순서대로 짚어볼게요.',
    thinkingSteps: [
      {
        id: 'g3_probability.step1',
        title: '여사건 활용',
        body: '"적어도 하나", "~이 아닌" 표현이 나오면 여사건(A 가 일어나지 않는 경우)을 먼저 생각해요. 여사건의 확률은 1 − P(A) 로 한 번에 구할 수 있어요.',
        example: '예) 동전 3번 중 앞면이 적어도 1번 → 1 − P(모두 뒷면) = 1 − 1/8 = 7/8',
        choices: [
          { text: '"적어도"가 나오면 여사건 1 − P(A) 를 활용한다', correct: true, feedback: '맞아요! 여사건 한 번이 셀 일을 크게 줄여줘요.' },
          { text: '"적어도"가 나와도 직접 경우의 수를 센다', correct: false, feedback: '직접 세도 되지만, 여사건이 훨씬 빠르고 안전해요.', remedialFlowStartNodeId: 'g3pr_step1_B_explain', weaknessId: 'g3_probability' },
          { text: '여사건은 P(A) 와 같다 (부호 빼먹음)', correct: false, feedback: '여사건은 1 − P(A) 예요. 1에서 빼는 한 단계가 필수예요.', remedialFlowStartNodeId: 'g3pr_step1_C_explain', weaknessId: 'g3_probability' },
        ],
      },
      {
        id: 'g3_probability.step2',
        title: '조건부확률 공식',
        body: '비가 온 날(B) 중 우산을 가져온 사람(A) 의 비율처럼, "B 가 일어났을 때 A 의 확률" 은 전체를 B 로 좁히고 그 안에서 A∩B 를 봐요. 식으로는 P(A|B) = P(A∩B) / P(B) 예요.',
        example: '예) P(A∩B)=0.3, P(B)=0.5 → P(A|B) = 0.3 / 0.5 = 0.6',
        choices: [
          { text: 'P(A|B)=P(A∩B)/P(B)', correct: true, feedback: '맞아요! 조건이 좁힌 만큼 교집합이 분자에 자리해요.' },
          { text: 'P(A|B)=P(A)/P(B)', correct: false, feedback: '분자가 P(A) 가 아니라 P(A∩B) 예요. 좁힌 영역과 겹치는 부분만 봐야 해요.', remedialFlowStartNodeId: 'g3pr_step2_B_explain', weaknessId: 'g3_probability' },
          { text: 'P(A|B)=P(A)×P(B)', correct: false, feedback: '그건 두 사건이 독립일 때의 P(A∩B) 예요. 조건부확률 공식과는 달라요.', remedialFlowStartNodeId: 'g3pr_step2_C_explain', weaknessId: 'g3_probability' },
        ],
      },
      {
        id: 'g3_probability.step3',
        title: '독립 사건 판단',
        body: '두 사건의 교집합 확률이 곱으로 분해되면 (P(A∩B)=P(A)·P(B)) 두 사건은 독립이에요. 독립이면 P(A|B)=P(A) 도 함께 성립해요.',
        example: '예) P(A)=0.4, P(B)=0.3, P(A∩B)=0.12 → 0.4×0.3=0.12 → 독립',
        choices: [
          { text: 'P(A∩B)=P(A)·P(B)이면 독립', correct: true, feedback: '맞아요! 곱으로 분해되는 게 독립의 정의예요.' },
          { text: 'P(A∩B)=P(A)+P(B)이면 독립', correct: false, feedback: '독립의 기준은 곱의 형태예요. 더하기가 아니에요.', remedialFlowStartNodeId: 'g3pr_step3_B_explain', weaknessId: 'g3_probability' },
          { text: 'P(A∩B)=0 이면 독립이다', correct: false, feedback: '그건 배반(둘이 동시에 일어날 수 없음) 이에요. 독립과는 다른 개념이에요.', remedialFlowStartNodeId: 'g3pr_step3_C_explain', weaknessId: 'g3_probability' },
        ],
      },
    ],
  },
  g3_vector: {
    heroPrompt: '벡터의 내적과 크기 계산 순서가 기억나나요?',
    thinkingSteps: [
      {
        id: 'g3_vector.step1',
        title: '벡터 크기 계산',
        body: '벡터 a⃗=(a₁,a₂)의 크기는 |a⃗|=√(a₁²+a₂²). 각 성분을 제곱해서 더한 뒤 제곱근을 취한다.',
        example: '예) a⃗=(3,4) → |a⃗|=√(9+16)=√25=5',
        choices: [
          { text: '각 성분을 제곱해서 더한 뒤 제곱근을 취한다', correct: true, feedback: '맞아요! 피타고라스의 일반화가 그대로 작동해요.' },
          { text: '각 성분을 더한 뒤 제곱근을 취한다', correct: false, feedback: '더한 뒤 제곱근만 취하면 길이가 안 나와요. 제곱이 한 번 들어가야 해요.', remedialFlowStartNodeId: 'g3v_step1_B_explain', weaknessId: 'g3_vector' },
          { text: '성분 중 큰 값이 크기가 된다', correct: false, feedback: '큰 성분 하나만으로는 정해지지 않아요. 모든 성분이 함께 영향을 줘요.', remedialFlowStartNodeId: 'g3v_step1_C_explain', weaknessId: 'g3_vector' },
        ],
      },
      {
        id: 'g3_vector.step2',
        title: '벡터 내적 계산',
        body: 'a⃗·b⃗=a₁b₁+a₂b₂. 같은 위치의 성분끼리 곱한 뒤 더한다. 결과는 스칼라(수)이다.',
        example: '예) a⃗=(2,3), b⃗=(4,1) → a⃗·b⃗=2×4+3×1=8+3=11',
        choices: [
          { text: '같은 위치 성분끼리 곱해서 더한다', correct: true, feedback: '맞아요! 내적의 표준 정의예요.' },
          { text: '같은 위치 성분끼리 더한 뒤 곱한다', correct: false, feedback: '정의는 곱한 뒤 더하기예요. 순서를 바꾸면 다른 양이 돼요.', remedialFlowStartNodeId: 'g3v_step2_B_explain', weaknessId: 'g3_vector' },
          { text: '내적의 결과는 벡터이다', correct: false, feedback: '내적은 스칼라(수)예요. 벡터가 나오는 건 내적이 아닌 다른 연산이에요.', remedialFlowStartNodeId: 'g3v_step2_C_explain', weaknessId: 'g3_vector' },
        ],
      },
      {
        id: 'g3_vector.step3',
        title: '내적과 각도 관계',
        body: 'a⃗·b⃗=|a⃗||b⃗|cosθ. 내적이 0이면 두 벡터는 수직(θ=90°). 이 공식으로 두 벡터가 이루는 각을 구할 수 있다.',
        example: '예) a⃗·b⃗=0 → cosθ=0 → θ=90° → 수직',
        choices: [
          { text: '내적이 0이면 두 벡터는 수직이다', correct: true, feedback: '맞아요! cosθ=0이 되려면 θ=90°라 수직이 돼요.' },
          { text: '내적이 0이면 두 벡터는 평행이다', correct: false, feedback: '평행이면 cosθ=±1이라 내적은 0이 아니에요. 0은 수직의 신호예요.', remedialFlowStartNodeId: 'g3v_step3_B_explain', weaknessId: 'g3_vector' },
          { text: '내적이 양수면 두 벡터는 반대 방향이다', correct: false, feedback: '양수는 둘 사이가 예각이라는 뜻이에요. 반대 방향이면 내적이 음수가 돼요.', remedialFlowStartNodeId: 'g3v_step3_C_explain', weaknessId: 'g3_vector' },
        ],
      },
    ],
  },
  g3_space_geometry: {
    heroPrompt: '정사영 넓이를 구할 때 이면각을 먼저 찾는 흐름이 기억나나요?',
    thinkingSteps: [
      {
        id: 'g3_space_geometry.step1',
        title: '공간에서 직선·평면 위치 관계',
        body: '공간에서 두 직선은 평행·교차·꼬임 중 하나다. 꼬인 위치는 같은 평면 위에 없고 만나지도 않는 경우이다.',
        example: '예) 직육면체에서 AB와 CD는 꼬인 위치일 수 있다',
        choices: [
          { text: '꼬인 위치는 만나지 않고 평행하지도 않은 두 직선', correct: true, feedback: '맞아요! 같은 평면에 없으면서 만나지 않는 관계가 꼬인 위치예요.' },
          { text: '꼬인 위치는 만나지 않는 모든 두 직선', correct: false, feedback: '평행도 만나지 않는 관계라 꼬인 위치와 구분해야 해요.', remedialFlowStartNodeId: 'gsg_step1_B_diagnose', weaknessId: 'g3_space_geometry' },
          { text: '꼬인 위치는 같은 평면 위에 있는 두 직선', correct: false, feedback: '같은 평면에 있으면 평행이거나 교차예요. 꼬임은 평면 밖에서 일어나요.', remedialFlowStartNodeId: 'gsg_step1_C_diagnose', weaknessId: 'g3_space_geometry' },
        ],
      },
      {
        id: 'g3_space_geometry.step2',
        title: '이면각 구하기',
        body: '두 평면이 이루는 각(이면각)은 교선에 수직인 두 반직선이 이루는 각이다. 보조선을 그어 직각삼각형을 만들어 구한다.',
        example: '예) 정사면체에서 한 면과 밑면이 이루는 각 → 교선에 수직인 선 작도 후 cosθ 계산',
        choices: [
          { text: '교선에 수직인 두 반직선이 이루는 각이 이면각이다', correct: true, feedback: '맞아요! 교선이 기준이 되는 각도라는 점이 핵심이에요.' },
          { text: '두 평면에 세운 수직선(법선)이 이루는 각이 이면각이다', correct: false, feedback: '법선이 이루는 각은 이면각과 같거나 합쳐서 180°가 되는 경우라 흔들려요. 정의는 교선에 수직인 두 반직선이 이루는 각으로 봐요.', remedialFlowStartNodeId: 'gsg_step2_B_diagnose', weaknessId: 'g3_space_geometry' },
          { text: '두 평면이 만나는 선의 길이가 이면각이다', correct: false, feedback: '이면각은 길이가 아니라 각이에요. 단위가 다르다는 점부터 살펴봐요.', remedialFlowStartNodeId: 'gsg_step2_C_diagnose', weaknessId: 'g3_space_geometry' },
        ],
      },
      {
        id: 'g3_space_geometry.step3',
        title: '정사영 넓이 계산',
        body: '도형을 평면에 정사영하면 넓이 S\'=S·cosθ (θ: 두 평면이 이루는 각). 이면각θ를 먼저 구한 뒤 원래 넓이에 cosθ를 곱한다.',
        example: '예) 넓이 10인 도형, 이면각 60° → 정사영 넓이=10×cos60°=5',
        choices: [
          { text: '정사영 넓이 = 원래 넓이 × cosθ', correct: true, feedback: '맞아요! 정사영의 표준 공식이에요.' },
          { text: '정사영 넓이 = 원래 넓이 × sinθ', correct: false, feedback: 'sinθ가 아니라 cosθ를 곱해요. θ=0이면 그대로 보존되어야 한다는 직관과 맞아요.', remedialFlowStartNodeId: 'gsg_step3_B_diagnose', weaknessId: 'g3_space_geometry' },
          { text: '정사영 넓이 = 원래 넓이 × tanθ', correct: false, feedback: 'tan을 쓰면 θ=90°에서 발산해요. 정사영은 cos을 써야 자연스러워요.', remedialFlowStartNodeId: 'gsg_step3_C_diagnose', weaknessId: 'g3_space_geometry' },
        ],
      },
    ],
  },
  g3_statistics: {
    heroPrompt: '이항분포 평균·분산 → Z 표준화 → 정규분포표 읽기 순으로 차근차근 볼게요.',
    thinkingSteps: [
      {
        id: 'g3_statistics.step1',
        title: '이항분포 평균·분산',
        body: '이항분포 B(n,p) — n 번 시행에서 성공 횟수의 분포 — 의 평균은 μ=np, 분산은 σ²=npq (q=1−p) 예요. 두 값이 한 쌍으로 묶여 외워야 해요.',
        example: '예) B(100, 0.4) → μ = 100×0.4 = 40, σ² = 100×0.4×0.6 = 24',
        choices: [
          { text: '이항분포 B(n,p)의 평균=np, 분산=npq', correct: true, feedback: '맞아요! 두 값이 한 쌍으로 묶여 외워두면 든든해요.' },
          { text: '이항분포의 평균과 분산이 모두 np 다 (q 빼먹음)', correct: false, feedback: 'q = 1−p 를 한 번 더 곱해야 분산이 돼요. q 를 빼먹으면 분산이 평균이랑 같아져 버려요.', remedialFlowStartNodeId: 'g3st_step1_C_explain', weaknessId: 'g3_statistics' },
          { text: '이항분포의 평균=np², 분산=npq²', correct: false, feedback: '지수가 한 단계 어긋났어요. 평균은 np, 분산은 npq 예요.', remedialFlowStartNodeId: 'g3st_step1_B_explain', weaknessId: 'g3_statistics' },
        ],
      },
      {
        id: 'g3_statistics.step2',
        title: 'Z 표준화 계산',
        body: 'n 이 크면 이항분포 B(n,p) 는 같은 평균 μ=np, 같은 분산 σ²=npq 를 갖는 정규분포로 근사돼요. 정규분포 X~N(μ,σ²) 는 Z=(X−μ)/σ 로 표준화하면 표준정규분포 N(0,1) 가 돼서 표를 읽을 수 있어요.',
        example: '예) X~N(50, 4²), P(X≥54) = P(Z ≥ (54−50)/4) = P(Z ≥ 1)',
        choices: [
          { text: 'Z=(X−μ)/σ로 표준화한 뒤 표를 읽는다', correct: true, feedback: '맞아요! 평균을 빼고 표준편차로 나누는 두 단계가 핵심이에요.' },
          { text: 'Z=(X+μ)/σ로 계산한다', correct: false, feedback: '부호가 반대예요. 평균을 빼야 분포의 중심이 0으로 옮겨져요.', remedialFlowStartNodeId: 'g3st_step2_B_explain', weaknessId: 'g3_statistics' },
          { text: 'Z=X×σ−μ으로 계산한다', correct: false, feedback: '표준화는 빼고 나누는 형태예요. 곱하기로는 분포가 정렬되지 않아요.', remedialFlowStartNodeId: 'g3st_step2_C_explain', weaknessId: 'g3_statistics' },
        ],
      },
      {
        id: 'g3_statistics.step3',
        title: '정규분포표 읽기',
        body: '표준정규분포는 0 을 기준으로 좌우 대칭이고 전체 면적이 1 이라서 한쪽이 0.5 예요. 표는 0 부터 z 까지의 면적 P(0≤Z≤z) 를 주므로, P(Z≥z) 는 0.5 에서 표 값을 빼고 P(Z≤z) 는 0.5 에 표 값을 더해서 구해요.',
        example: '예) P(0≤Z≤1.5)=0.4332 → P(Z≥1.5) = 0.5 − 0.4332 = 0.0668',
        choices: [
          { text: '표는 P(0≤Z≤z) 를 주므로 0.5 에서 더하거나 뺀다', correct: true, feedback: '맞아요! 표 값과 0.5의 관계만 잘 잡으면 다양한 확률을 모두 구할 수 있어요.' },
          { text: '표 값이 곧 P(Z≤z) 다 (전체 누적과 혼동)', correct: false, feedback: '표는 0 부터 z 까지의 면적만 줘요. 전체 누적 P(Z≤z) = 0.5 + 표 값 으로 한 단계 더 필요해요.', remedialFlowStartNodeId: 'g3st_step3_B_explain', weaknessId: 'g3_statistics' },
          { text: '표 값을 2배 하면 P(Z≥z) 가 된다', correct: false, feedback: 'P(Z≥z) 는 0.5 에서 표 값을 빼는 형태예요. 2배는 다른 양이 돼요.', remedialFlowStartNodeId: 'g3st_step3_C_explain', weaknessId: 'g3_statistics' },
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
