import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: pfac_step<N>_<choice>_<role>
// 약점 prefix: pfac
// 용어 통일: "근"(식이 0이 되게 하는 x 값), "약수"(나누어떨어지게 하는 수),
//            "상수항"(식 끝의 숫자 하나), "조립제법"(근으로 빠르게 나누는 계산법),
//            "인수정리"(f(a)=0이면 (x−a)가 인수라는 규칙), "몫"(나눗셈 결과)

export const g2_poly_factoring_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 B ("최고차 계수 약수를 대입한다") 분기 ───────────
    'pfac_step1_B_explain': {
      id: 'pfac_step1_B_explain',
      kind: 'explain',
      title: '근 후보는 상수항에서 나와요',
      body: '최고차 계수가 1인 식에서는 상수항(식 끝에 있는 숫자 하나)의 약수(그 수를 나누어떨어지게 하는 수)가 정수 근(x에 넣으면 식이 0이 되는 값) 후보예요. 최고차 계수의 약수는 분수 근까지 볼 때나 쓰는 거라서, 정수 근부터 찾을 때는 상수항을 먼저 봐요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step1_B_easy',
      summary: '정수 근 후보는 상수항의 약수에서 나옴 — 최고차 계수 약수는 분수 근 찾을 때만 사용',
      triggers: [
        '최고차 계수 약수를 넣으면 되는 거 아닌가요',
        '어떤 수를 대입해야 근이 나오는지 모르겠어요',
        '근 후보를 어디서 가져오는지',
      ],
    },
    'pfac_step1_B_easy': {
      id: 'pfac_step1_B_easy',
      kind: 'explain',
      title: '더 짧게 한 번 더',
      body: '식 끝의 숫자 하나가 상수항이에요. 예를 들어 x³−6x²+11x−6 이면 끝 숫자 6의 약수 1, 2, 3, 6을 차례로 x에 넣어보면 근이 보여요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step1_exit',
    },
    'pfac_step1_B_check': {
      id: 'pfac_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=x³−2x²−5x+6 에서 정수 근 후보로 먼저 넣어볼 수들은 어느 숫자의 약수일까요?',
      options: [
        { id: 'correct', text: '상수항 6의 약수 (1, 2, 3, 6)', isCorrect: true, nextNodeId: 'pfac_step1_exit' },
        { id: 'wrong1', text: '최고차 계수 1의 약수', isCorrect: false, nextNodeId: 'pfac_step1_B_easy' },
        { id: 'wrong2', text: '가운데 계수 5의 약수', isCorrect: false, nextNodeId: 'pfac_step1_B_easy' },
      ],
      dontKnowNextNodeId: 'pfac_step1_B_easy',
    },

    // ─────────── step1: 오답 C ("대입 없이 인수를 바로 쓴다") 분기 ───────────
    'pfac_step1_C_explain': {
      id: 'pfac_step1_C_explain',
      kind: 'explain',
      title: '근을 찾아야 인수가 보여요',
      body: '인수정리(f(a)=0이면 (x−a)가 인수라는 규칙)에서, 근을 모르면 어떤 (x−a)가 인수인지 알 수 없어요. 그래서 먼저 상수항 약수를 넣어 f(값)=0이 되는 근을 찾아야 해요. 근 a를 찾으면 (x−a)가 인수라는 게 바로 따라와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step1_B_easy',
      summary: '근을 먼저 찾아야 (x−a) 인수를 정할 수 있음 — 대입 단계를 건너뛰면 인수가 안 나옴',
      triggers: [
        '인수를 그냥 바로 쓰면 안 되나요',
        '대입을 왜 해야 하는지 모르겠어요',
        '근이랑 인수가 무슨 관계인지',
      ],
    },
    'pfac_step1_C_check': {
      id: 'pfac_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)에서 f(2)=0 이 나왔어요. 그러면 무엇이 f(x)의 인수일까요?',
      options: [
        { id: 'correct', text: '(x−2)', isCorrect: true, nextNodeId: 'pfac_step1_exit' },
        { id: 'wrong1', text: '(x+2)', isCorrect: false, nextNodeId: 'pfac_step1_C_easy' },
        { id: 'wrong2', text: '대입 없이 알 수 없다', isCorrect: false, nextNodeId: 'pfac_step1_C_easy' },
      ],
      dontKnowNextNodeId: 'pfac_step1_C_easy',
    },
    'pfac_step1_C_easy': {
      id: 'pfac_step1_C_easy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: 'f(2)=0 이면 x=2를 넣어 0이 됐다는 뜻이에요. 그러면 (x−2)가 인수예요. 근이 a면 인수는 항상 (x−a) 모양이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step1_exit',
    },

    'pfac_step1_exit': { id: 'pfac_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 B ("조립제법에서 나머지가 남아도 된다") 분기 ───────────
    'pfac_step2_B_explain': {
      id: 'pfac_step2_B_explain',
      kind: 'explain',
      title: '근으로 나누면 나머지는 0이에요',
      body: '근 a로 (x−a)를 나눌 때는 f(a)=0이라서 나머지가 반드시 0으로 떨어져요. 만약 나머지가 0이 아니면 그 값은 근이 아니라는 신호예요. 조립제법(근으로 빠르게 나누는 계산법)에서 마지막 칸이 0인지 꼭 확인해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step2_B_easy',
      summary: '근으로 나누면 나머지는 0 — 0이 아니면 그 수는 근이 아님',
      triggers: [
        '나머지가 남아도 되는 거 아닌가요',
        '나머지가 0이어야 하는 이유를 모르겠어요',
        '나머지가 0이 아니면 어떻게 하나요',
      ],
    },
    'pfac_step2_B_easy': {
      id: 'pfac_step2_B_easy',
      kind: 'explain',
      title: '더 짧게 한 번 더',
      body: '진짜 근으로 나누면 마지막 나머지 칸은 항상 0이에요. 0이 안 나오면 근을 잘못 고른 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step2_exit',
    },
    'pfac_step2_B_check': {
      id: 'pfac_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(1)=0 인 식을 (x−1)로 조립제법 했더니 나머지가 3이 나왔어요. 어떻게 봐야 할까요?',
      options: [
        { id: 'correct', text: '계산이 틀렸다 (근이면 나머지는 0이어야 함)', isCorrect: true, nextNodeId: 'pfac_step2_exit' },
        { id: 'wrong1', text: '나머지 3이 남아도 괜찮다', isCorrect: false, nextNodeId: 'pfac_step2_B_easy' },
        { id: 'wrong2', text: '나머지를 그냥 버리면 된다', isCorrect: false, nextNodeId: 'pfac_step2_B_easy' },
      ],
      dontKnowNextNodeId: 'pfac_step2_B_easy',
    },

    // ─────────── step2: 오답 C ("나눗셈 없이 인수를 바로 적는다") 분기 ───────────
    'pfac_step2_C_explain': {
      id: 'pfac_step2_C_explain',
      kind: 'explain',
      title: '나머지 인수는 몫에서 나와요',
      body: '근 a로 (x−a) 하나를 꺼내도, 남은 인수들은 나눗셈의 몫(나눈 결과로 나온 식) 안에 들어 있어요. 그래서 조립제법으로 한 번 나눠 몫을 꺼내야 다음 인수가 보여요. 나눗셈을 건너뛰면 식이 끝까지 분해되지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step2_B_easy',
      summary: '(x−a) 외의 인수는 나눗셈 몫에서 나옴 — 나눗셈 단계를 생략하면 분해가 안 끝남',
      triggers: [
        '나눗셈 없이 인수를 바로 적으면 안 되나요',
        '몫이 왜 필요한지 모르겠어요',
        '인수가 더 있는지 어떻게 아나요',
      ],
    },
    'pfac_step2_C_check': {
      id: 'pfac_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=(x−1)·(몫) 으로 한 번 나눴어요. 나머지 인수들은 어디서 찾을까요?',
      options: [
        { id: 'correct', text: '몫을 다시 인수분해해서 찾는다', isCorrect: true, nextNodeId: 'pfac_step2_exit' },
        { id: 'wrong1', text: '(x−1) 하나로 끝이다', isCorrect: false, nextNodeId: 'pfac_step2_C_easy' },
        { id: 'wrong2', text: '나눗셈 없이 바로 적는다', isCorrect: false, nextNodeId: 'pfac_step2_C_easy' },
      ],
      dontKnowNextNodeId: 'pfac_step2_C_easy',
    },
    'pfac_step2_C_easy': {
      id: 'pfac_step2_C_easy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: '예를 들어 x³−6x²+11x−6 을 (x−1)로 나누면 몫이 x²−5x+6 이에요. 이 몫을 다시 쪼개야 (x−2)(x−3)이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step2_exit',
    },

    'pfac_step2_exit': { id: 'pfac_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 B ("첫 번째 인수 하나면 충분하다") 분기 ───────────
    'pfac_step3_B_explain': {
      id: 'pfac_step3_B_explain',
      kind: 'explain',
      title: '몫이 남으면 끝이 아니에요',
      body: '근 하나로 (x−a) 한 개를 꺼내도, 남은 몫이 아직 더 쪼개질 수 있으면 분해가 덜 끝난 거예요. 고차식은 보통 인수가 여러 개라서 몫을 한 번 더 봐줘야 해요. 몫이 1차식이거나 더 안 쪼개질 때까지 봐야 완성이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step3_B_easy',
      summary: '인수 하나로 끝이 아님 — 남은 몫이 더 쪼개지면 분해가 덜 끝난 상태',
      triggers: [
        '인수 하나면 충분한 거 아닌가요',
        '언제까지 분해해야 하는지 모르겠어요',
        '몫을 또 봐야 하는 이유',
      ],
    },
    'pfac_step3_B_easy': {
      id: 'pfac_step3_B_easy',
      kind: 'explain',
      title: '더 짧게 한 번 더',
      body: '(x−1)만 꺼내고 멈추면 안 돼요. 남은 몫이 더 쪼개지면 끝까지 쪼개야 답이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step3_exit',
    },
    'pfac_step3_B_check': {
      id: 'pfac_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=(x−1)(x²−5x+6) 까지 왔어요. 이게 최종 답일까요?',
      options: [
        { id: 'correct', text: '아니다, x²−5x+6 을 더 쪼개야 한다', isCorrect: true, nextNodeId: 'pfac_step3_exit' },
        { id: 'wrong1', text: '맞다, (x−1) 하나면 충분하다', isCorrect: false, nextNodeId: 'pfac_step3_B_easy' },
        { id: 'wrong2', text: '몫은 더 쪼갤 수 없다', isCorrect: false, nextNodeId: 'pfac_step3_B_easy' },
      ],
      dontKnowNextNodeId: 'pfac_step3_B_easy',
    },

    // ─────────── step3: 오답 C ("몫은 더 이상 인수분해할 수 없다") 분기 ───────────
    'pfac_step3_C_explain': {
      id: 'pfac_step3_C_explain',
      kind: 'explain',
      title: '몫도 더 쪼개질 수 있어요',
      body: '나눗셈으로 나온 몫이 2차식이면, 보통 그것도 두 개의 1차식으로 더 쪼개져요. 몫을 다 못 쪼갠 채 멈추면 분해가 덜 끝난 상태예요. 몫이 1차식이 되거나 더 이상 안 쪼개질 때 비로소 완성이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step3_B_easy',
      summary: '몫이 2차식이면 보통 더 쪼개짐 — 1차식이 될 때까지 분해해야 완성',
      triggers: [
        '몫은 더 못 쪼개는 거 아닌가요',
        '2차식 몫을 또 쪼개야 하나요',
        '어디까지 쪼개야 끝인지',
      ],
    },
    'pfac_step3_C_check': {
      id: 'pfac_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '몫이 x²−5x+6 이에요. 이 몫을 어떻게 해야 할까요?',
      options: [
        { id: 'correct', text: '(x−2)(x−3)으로 한 번 더 쪼갠다', isCorrect: true, nextNodeId: 'pfac_step3_exit' },
        { id: 'wrong1', text: '더 쪼갤 수 없으니 그대로 둔다', isCorrect: false, nextNodeId: 'pfac_step3_C_easy' },
        { id: 'wrong2', text: '몫은 답에서 빼고 적는다', isCorrect: false, nextNodeId: 'pfac_step3_C_easy' },
      ],
      dontKnowNextNodeId: 'pfac_step3_C_easy',
    },
    'pfac_step3_C_easy': {
      id: 'pfac_step3_C_easy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: 'x²−5x+6 은 더하면 −5, 곱하면 6이 되는 두 수 −2, −3으로 쪼개져요. 그래서 (x−2)(x−3)이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'pfac_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'pfac_step3_exit',
    },

    'pfac_step3_exit': { id: 'pfac_step3_exit', kind: 'exit' },
  },
};
