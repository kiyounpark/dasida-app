import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: rse_step<N>_<choice>_<role>
// 약점 prefix: rse
// 약점: remainder_substitution_error — 나머지정리에서 x-a=0의 a를 P(x)에 대입하는 단계의 실수
// 6등급 학생 대상 — 핵심 용어 첫 등장 시 한 줄 정의 동봉

export const remainder_substitution_error_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 A ("x=−a를 구한다") 분기 ───────────
    'rse_step1_A_explain': {
      id: 'rse_step1_A_explain',
      kind: 'explain',
      title: '부호를 다시 짚어봐요',
      body: '나머지정리(나누는 식이 0이 되는 x를 P(x)에 넣어 나머지를 구하는 규칙)에서 제수(나누는 식)가 x−a일 때, x−a=0을 풀면 x=+a예요. 부호가 빠진 채로 −a를 잡으면 다른 값을 대입하게 돼요. 식을 0으로 만드는 x를 그대로 따라가면 +a가 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step1_A_easy',
      summary: 'x−a=0의 해는 +a — 제수를 0으로 만드는 x값 부호를 그대로 가져가는 것이 핵심',
      triggers: [
        'x=−a를 넣으면 되는 줄 알았어요',
        '왜 부호가 바뀌어요',
        '제수가 0 되는 x가 헷갈려요',
      ],
    },
    'rse_step1_A_easy': {
      id: 'rse_step1_A_easy',
      kind: 'explain',
      title: '예시로 짧게 보기',
      body: 'x−3=0이라면 양변에 3을 더해서 x=3이 돼요. x−a=0도 같은 방법으로 풀어서 x=a예요. 빼는 수가 그대로 +값으로 옮겨 간다고 보면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step1_exit',
    },
    'rse_step1_A_check': {
      id: 'rse_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(x)를 x−5로 나눌 때, P에 대입해야 하는 x값은?',
      options: [
        { id: 'correct', text: '5', isCorrect: true, nextNodeId: 'rse_step1_exit' },
        { id: 'wrong1',  text: '−5', isCorrect: false, nextNodeId: 'rse_step1_A_remedy', weaknessId: 'remainder_substitution_error' },
        { id: 'wrong2',  text: '0', isCorrect: false, nextNodeId: 'rse_step1_A_remedy', weaknessId: 'remainder_substitution_error' },
      ],
      dontKnowNextNodeId: 'rse_step1_A_easy',
    },
    'rse_step1_A_remedy': {
      id: 'rse_step1_A_remedy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: 'x−5=0에서 x=5예요. 제수에서 빼는 수가 그대로 +값으로 옮겨 간다고 기억하면 돼요. 그래서 P(5)를 계산하면 나머지가 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step1_exit',
    },

    // ─────────── step1: 오답 C ("x=0을 대입한다") 분기 ───────────
    'rse_step1_C_explain': {
      id: 'rse_step1_C_explain',
      kind: 'explain',
      title: '대입할 값은 제수를 0으로 만드는 x값이에요',
      body: '나머지정리에서 P(x)에 넣을 값은 아무 x나 0이 아니라, 제수(나누는 식)를 0으로 만드는 x예요. 제수가 x−a라면 x−a=0을 풀어 x=a를 찾고 그걸 대입해요. x=0은 제수가 x인 경우에만 맞아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step1_A_easy',
      summary: '대입할 값은 제수를 0으로 만드는 x값 — x=0은 제수가 x일 때만 맞는 특수한 경우',
      triggers: [
        '그냥 0을 넣으면 안 되나요',
        'x=0이 무슨 의미인지',
        '대입할 값을 어떻게 정하는지 모르겠어요',
      ],
    },
    'rse_step1_C_check': {
      id: 'rse_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(x)를 x−2로 나눌 때, 나머지를 구하려면 P에 어떤 값을 넣어야 하나요?',
      options: [
        { id: 'correct', text: 'P(2)를 계산한다', isCorrect: true, nextNodeId: 'rse_step1_exit' },
        { id: 'wrong1',  text: 'P(0)을 계산한다', isCorrect: false, nextNodeId: 'rse_step1_C_remedy', weaknessId: 'remainder_substitution_error' },
        { id: 'wrong2',  text: 'P(−2)를 계산한다', isCorrect: false, nextNodeId: 'rse_step1_C_remedy', weaknessId: 'remainder_substitution_error' },
      ],
      dontKnowNextNodeId: 'rse_step1_A_easy',
    },
    'rse_step1_C_remedy': {
      id: 'rse_step1_C_remedy',
      kind: 'explain',
      title: '제수를 0으로 만드는 값 찾기',
      body: 'x−2=0을 풀면 x=2예요. 그래서 P(2)가 나머지가 돼요. 제수마다 0이 되는 x가 다르니까 매번 그 값을 먼저 구해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step1_exit',
    },

    'rse_step1_exit': { id: 'rse_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 A ("P(0)을 계산한다") 분기 ───────────
    'rse_step2_A_explain': {
      id: 'rse_step2_A_explain',
      kind: 'explain',
      title: 'P(0)은 다른 값을 알려줘요',
      body: 'P(0)은 P(x)에 x=0을 넣은 값이라 상수항(숫자 하나만 있는 부분)이에요. 나머지정리에서 구하는 나머지는 제수를 0으로 만드는 x=a를 대입한 P(a)예요. 두 값은 다른 정보라서 헷갈리면 답이 어긋나요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step2_A_easy',
      summary: 'P(0)은 상수항을 보는 값 — 나머지는 제수를 0으로 만드는 x=a를 넣은 P(a)',
      triggers: [
        'P(0)을 계산하면 되는 줄 알았어요',
        'P(0)과 P(a)가 무슨 차이예요',
        '왜 0이 아니라 a를 넣어요',
      ],
    },
    'rse_step2_A_easy': {
      id: 'rse_step2_A_easy',
      kind: 'explain',
      title: '예시로 비교해봐요',
      body: 'P(x)=x²+3을 x−2로 나누는 경우를 봐요. 여기서 x²는 x를 두 번 곱한 값(예: x=2이면 2²=4)이에요. 제수 x−2를 0으로 만드는 x값은 x=2이니까 P(2)=2²+3=4+3=7이 나머지예요. P(0)=0²+3=3은 그냥 상수항이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step2_exit',
    },
    'rse_step2_A_check': {
      id: 'rse_step2_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(x)=x²+1을 x−3으로 나눈 나머지는?',
      options: [
        { id: 'correct', text: '10', isCorrect: true, nextNodeId: 'rse_step2_exit' },
        { id: 'wrong1',  text: '1', isCorrect: false, nextNodeId: 'rse_step2_A_remedy', weaknessId: 'remainder_substitution_error' },
        { id: 'wrong2',  text: '0', isCorrect: false, nextNodeId: 'rse_step2_A_remedy', weaknessId: 'remainder_substitution_error' },
      ],
      dontKnowNextNodeId: 'rse_step2_A_easy',
    },
    'rse_step2_A_remedy': {
      id: 'rse_step2_A_remedy',
      kind: 'explain',
      title: 'x=3을 P(x)에 넣어요',
      body: '제수 x−3을 0으로 만드는 x값은 x=3이에요. P(x)=x²+1에서 x² 는 x를 두 번 곱한 값이라 x=3이면 3²=9예요. 그래서 P(3)=9+1=10이 나머지예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step2_exit',
    },

    // ─────────── step2: 오답 C ("P(x)에 제수를 대입한다") 분기 ───────────
    'rse_step2_C_explain': {
      id: 'rse_step2_C_explain',
      kind: 'explain',
      title: '대입하는 건 식이 아니라 값이에요',
      body: '제수(x−a) 자체를 P(x)의 x자리에 넣으면 다항식 안에 또 식이 들어가서 나머지가 안 나와요. 대입은 제수가 0이 되는 x값(=a)을 넣는 거예요. 식이 아니라 숫자 하나를 넣는다고 기억하면 좋아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step2_A_easy',
      summary: '대입은 제수가 아니라 제수를 0으로 만드는 x값(a) — 식이 아니라 숫자 하나를 P(x)의 x자리에',
      triggers: [
        'P(x−a)를 계산해야 하나요',
        '제수를 그대로 넣으면 안 되나요',
        '뭘 어디에 넣는지 헷갈려요',
      ],
    },
    'rse_step2_C_check': {
      id: 'rse_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(x)=x+5를 x−1로 나눈 나머지를 구하려면?',
      options: [
        { id: 'correct', text: 'P(1)을 계산한다', isCorrect: true, nextNodeId: 'rse_step2_exit' },
        { id: 'wrong1',  text: 'P(x−1)을 계산한다', isCorrect: false, nextNodeId: 'rse_step2_C_remedy', weaknessId: 'remainder_substitution_error' },
        { id: 'wrong2',  text: 'P(x)에서 x−1을 뺀다', isCorrect: false, nextNodeId: 'rse_step2_C_remedy', weaknessId: 'remainder_substitution_error' },
      ],
      dontKnowNextNodeId: 'rse_step2_A_easy',
    },
    'rse_step2_C_remedy': {
      id: 'rse_step2_C_remedy',
      kind: 'explain',
      title: '숫자 하나만 넣어요',
      body: '제수 x−1을 0으로 만드는 x값은 x=1이니까 P(1)=1+5=6이 나머지예요. 식 x−1을 통째로 넣는 게 아니라 숫자 1을 x자리에 한 번만 넣어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step2_exit',
    },

    'rse_step2_exit': { id: 'rse_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 A ("P(a)는 몫이다") 분기 ───────────
    'rse_step3_A_explain': {
      id: 'rse_step3_A_explain',
      kind: 'explain',
      title: 'P(a)는 나머지예요, 몫이 아니에요',
      body: '나머지정리의 결론은 P(a) 그 값이 곧 나머지(나눗셈이 끝나고 마지막에 남는 수)라는 거예요. 몫은 다항식 나눗셈을 직접 해야 나오고, 단순 대입으로는 안 구해져요. 그래서 P(a)를 몫으로 적으면 결론이 뒤바뀌어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step3_A_easy',
      summary: 'P(a)는 나머지이지 몫이 아님 — 몫은 다항식 나눗셈을 따로 해야 나옴',
      triggers: [
        'P(a)가 몫인 줄 알았어요',
        '몫이랑 나머지가 헷갈려요',
        '나머지정리 결론이 뭐예요',
      ],
    },
    'rse_step3_A_easy': {
      id: 'rse_step3_A_easy',
      kind: 'explain',
      title: '한 줄로 다시',
      body: '제수가 x−a일 때 P(a) = 나머지. 이 한 줄이 나머지정리의 결론이에요. 몫이라고 부르면 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step3_exit',
    },
    'rse_step3_A_check': {
      id: 'rse_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(x)를 x−a로 나누었을 때 P(a)는 무엇인가요?',
      options: [
        { id: 'correct', text: '나머지', isCorrect: true, nextNodeId: 'rse_step3_exit' },
        { id: 'wrong1',  text: '몫', isCorrect: false, nextNodeId: 'rse_step3_A_remedy', weaknessId: 'remainder_substitution_error' },
        { id: 'wrong2',  text: '제수', isCorrect: false, nextNodeId: 'rse_step3_A_remedy', weaknessId: 'remainder_substitution_error' },
      ],
      dontKnowNextNodeId: 'rse_step3_A_easy',
    },
    'rse_step3_A_remedy': {
      id: 'rse_step3_A_remedy',
      kind: 'explain',
      title: 'P(a) = 나머지',
      body: 'P(x)=x²+1을 x−2로 나누면 x=2를 대입해요. x²는 x를 두 번 곱한 값이라 2²=4이에요. P(2)=4+1=5가 나머지예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step3_exit',
    },

    // ─────────── step3: 오답 C ("P(a)에서 1을 빼면 나머지이다") 분기 ───────────
    'rse_step3_C_explain': {
      id: 'rse_step3_C_explain',
      kind: 'explain',
      title: '보정 없이 그대로가 나머지예요',
      body: '나머지정리는 P(a) 값 그 자체가 곧 나머지라고 말해요. 따로 1을 빼거나 다른 보정을 더할 필요가 없어요. 계산한 결과를 바로 나머지로 적으면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step3_A_easy',
      summary: 'P(a) 값 그 자체가 나머지 — 추가 보정 없음',
      triggers: [
        '뭔가를 빼야 하지 않나요',
        'P(a) 그대로면 너무 큰 거 같아요',
        '보정이 필요한 줄 알았어요',
      ],
    },
    'rse_step3_C_check': {
      id: 'rse_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(x)=x²+3을 x−2로 나눈 나머지는? (x²에서 x=2이면 2²=4이에요)',
      options: [
        { id: 'correct', text: '7', isCorrect: true, nextNodeId: 'rse_step3_exit' },
        { id: 'wrong1',  text: '6', isCorrect: false, nextNodeId: 'rse_step3_C_remedy', weaknessId: 'remainder_substitution_error' },
        { id: 'wrong2',  text: '8', isCorrect: false, nextNodeId: 'rse_step3_C_remedy', weaknessId: 'remainder_substitution_error' },
      ],
      dontKnowNextNodeId: 'rse_step3_A_easy',
    },
    'rse_step3_C_remedy': {
      id: 'rse_step3_C_remedy',
      kind: 'explain',
      title: 'P(2) 값 7이 그대로 나머지',
      body: 'x²는 x를 두 번 곱한 값이라 2²=4예요. P(2)=2²+3=4+3=7이고, 이 7이 그대로 나머지예요. 1을 빼거나 더하지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'rse_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'rse_step3_exit',
    },

    'rse_step3_exit': { id: 'rse_step3_exit', kind: 'exit' },
  },
};
