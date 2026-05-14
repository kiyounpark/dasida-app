import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: coc_step<N>_<choice>_<role>
// 약점 prefix: coc
// 구조: shallow

export const counting_overcounting_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 A ("항상 공식으로만 계산한다") 분기 ───────────
    'coc_step1_A_explain': {
      id: 'coc_step1_A_explain',
      kind: 'explain',
      title: '공식만 믿으면 중복을 놓쳐요',
      body: '경우의 수란 일이 일어날 수 있는 가짓수예요. 가짓수가 적을 땐 직접 하나씩 적어보는 게 가장 안전해요. 공식만 외워서 쓰면 같은 경우를 두 번 세는 실수를 잡기 어려워요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step1_A_easy',
      summary: '경우의 수가 적을 땐 공식보다 직접 나열이 안전 — 중복을 눈으로 잡을 수 있음',
      triggers: [
        '공식으로만 풀면 안 되나요',
        '왜 일일이 적어야 하는지 모르겠어요',
        '나열은 귀찮은데 꼭 해야 하나요',
      ],
    },
    'coc_step1_A_easy': {
      id: 'coc_step1_A_easy',
      kind: 'explain',
      title: '아주 짧게 한 번 더',
      body: '동전 2개를 던지면 앞앞, 앞뒤, 뒤앞, 뒤뒤 이렇게 4가지가 나와요. 직접 적어보면 빠뜨림 없이 셀 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step1_exit',
    },
    'coc_step1_A_check': {
      id: 'coc_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '주사위 1개를 던질 때 짝수가 나오는 경우의 수를 직접 적어 구해보세요.',
      options: [
        { id: 'correct', text: '3가지 (2, 4, 6)', isCorrect: true, nextNodeId: 'coc_step1_exit' },
        { id: 'wrong1',  text: '6가지', isCorrect: false, nextNodeId: 'coc_step1_A_easy', weaknessId: 'counting_overcounting' },
        { id: 'wrong2',  text: '공식이 없으니 알 수 없다', isCorrect: false, nextNodeId: 'coc_step1_A_easy', weaknessId: 'counting_overcounting' },
      ],
      dontKnowNextNodeId: 'coc_step1_A_easy',
    },

    // ─────────── step1: 오답 C ("나열은 시간 낭비다") 분기 ───────────
    'coc_step1_C_explain': {
      id: 'coc_step1_C_explain',
      kind: 'explain',
      title: '나열은 시간 낭비가 아니에요',
      body: '경우를 한 번 적어보면 어떤 규칙으로 늘어나는지 눈에 들어와요. 그 규칙이 보여야 어떤 공식을 쓸지 정할 수 있어요. 처음 한 박자는 절대 낭비가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step1_A_easy',
      summary: '나열은 패턴을 보여주는 첫 단계 — 공식 선택의 근거가 됨',
      triggers: [
        '나열은 시간 낭비 같아요',
        '바로 공식 쓰면 안 되나요',
        '왜 굳이 다 적어보는지',
      ],
    },
    'coc_step1_C_check': {
      id: 'coc_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '동전 1개와 주사위 1개를 동시에 던질 때 전체 경우의 수를 나열로 구하면?',
      options: [
        { id: 'correct', text: '12가지 (앞1~앞6, 뒤1~뒤6)', isCorrect: true, nextNodeId: 'coc_step1_exit' },
        { id: 'wrong1',  text: '8가지', isCorrect: false, nextNodeId: 'coc_step1_A_easy', weaknessId: 'counting_overcounting' },
        { id: 'wrong2',  text: '나열로는 알 수 없다', isCorrect: false, nextNodeId: 'coc_step1_A_easy', weaknessId: 'counting_overcounting' },
      ],
      dontKnowNextNodeId: 'coc_step1_A_easy',
    },

    'coc_step1_exit': { id: 'coc_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 A ("중복은 항상 없다") 분기 ───────────
    'coc_step2_A_explain': {
      id: 'coc_step2_A_explain',
      kind: 'explain',
      title: '중복은 자주 생겨요',
      body: '예를 들어 친구 2명을 뽑는 문제에서, 가와 나를 뽑는 것과 나와 가를 뽑는 건 같은 경우예요. 이런 걸 중복이라고 해요. 문제가 순서를 따지는지 아닌지부터 살펴봐야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step2_A_easy',
      summary: '뽑는 순서가 무관하면 가나와 나가는 같은 경우 — 중복이 자주 발생함',
      triggers: [
        '중복이 왜 생기는지 모르겠어요',
        '가나랑 나가는 다른 경우 아닌가요',
        '중복이 없다고 생각했어요',
      ],
    },
    'coc_step2_A_easy': {
      id: 'coc_step2_A_easy',
      kind: 'explain',
      title: '예시로 짚어요',
      body: '가, 나, 다 세 명 중 2명을 뽑을 때 가나, 가다, 나가, 나다, 다가, 다나 라고 적으면 6가지가 보여요. 그런데 가나와 나가는 결국 같은 두 명을 뽑은 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step2_exit',
    },
    'coc_step2_A_check': {
      id: 'coc_step2_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '가, 나, 다 세 명 중 2명을 뽑을 때 위의 6가지 나열에서 중복으로 묶이는 쌍은 몇 쌍일까요?',
      options: [
        { id: 'correct', text: '3쌍', isCorrect: true, nextNodeId: 'coc_step2_exit' },
        { id: 'wrong1',  text: '0쌍', isCorrect: false, nextNodeId: 'coc_step2_A_easy', weaknessId: 'counting_overcounting' },
        { id: 'wrong2',  text: '6쌍', isCorrect: false, nextNodeId: 'coc_step2_A_easy', weaknessId: 'counting_overcounting' },
      ],
      dontKnowNextNodeId: 'coc_step2_A_easy',
    },

    // ─────────── step2: 오답 C ("중복은 공식으로만 처리한다") 분기 ───────────
    'coc_step2_C_explain': {
      id: 'coc_step2_C_explain',
      kind: 'explain',
      title: '눈으로 한 번 확인해야 해요',
      body: '공식만 쓰면 어떤 경우가 같은 경우인지 머릿속에서 놓치기 쉬워요. 한 번은 직접 적어 같은 경우끼리 묶어보는 단계가 필요해요. 그래야 공식이 맞는 답을 주는지 확인할 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step2_A_easy',
      summary: '같은 경우 묶기는 눈으로 확인하는 단계 — 공식의 정답을 검증함',
      triggers: [
        '공식만 쓰면 안 되나요',
        '같은 경우를 어떻게 찾는지',
        '직접 묶어보는 게 왜 필요한지',
      ],
    },
    'coc_step2_C_check': {
      id: 'coc_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '학생 4명 가, 나, 다, 라 중 2명을 뽑을 때, 가나와 같은 경우로 묶이는 건?',
      options: [
        { id: 'correct', text: '나가', isCorrect: true, nextNodeId: 'coc_step2_exit' },
        { id: 'wrong1',  text: '다라', isCorrect: false, nextNodeId: 'coc_step2_A_easy', weaknessId: 'counting_overcounting' },
        { id: 'wrong2',  text: '같은 경우는 없다', isCorrect: false, nextNodeId: 'coc_step2_A_easy', weaknessId: 'counting_overcounting' },
      ],
      dontKnowNextNodeId: 'coc_step2_A_easy',
    },

    'coc_step2_exit': { id: 'coc_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 A ("중복을 포함해서 답으로 쓴다") 분기 ───────────
    'coc_step3_A_explain': {
      id: 'coc_step3_A_explain',
      kind: 'explain',
      title: '중복을 빼야 답이 맞아요',
      body: '같은 경우를 두 번 세면 답이 실제보다 부풀려져요. 조합이란 순서를 따지지 않고 뽑는 가짓수를 말해요. 마지막에 같은 경우 수만큼 나눠 정리해야 정확한 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step3_A_easy',
      summary: '중복을 포함하면 답이 부풀려짐 — 마지막에 같은 경우 수로 나눠야 정답',
      triggers: [
        '왜 답이 너무 커지나요',
        '중복을 그대로 쓰면 안 되나요',
        '마지막에 왜 나누는지 모르겠어요',
      ],
    },
    'coc_step3_A_easy': {
      id: 'coc_step3_A_easy',
      kind: 'explain',
      title: '예시로 짚어요',
      body: '3명 중 2명을 순서 따져 뽑으면 6가지지만, 가나와 나가가 같으니 2로 나눠 3가지가 진짜 답이에요. 같은 경우 수가 2면 2로 나누는 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step3_exit',
    },
    'coc_step3_A_check': {
      id: 'coc_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '4명 중 2명을 순서 따져 뽑으면 12가지예요. 순서를 따지지 않으면 답은?',
      options: [
        { id: 'correct', text: '6가지 (12 ÷ 2)', isCorrect: true, nextNodeId: 'coc_step3_exit' },
        { id: 'wrong1',  text: '12가지 그대로', isCorrect: false, nextNodeId: 'coc_step3_A_easy', weaknessId: 'counting_overcounting' },
        { id: 'wrong2',  text: '24가지', isCorrect: false, nextNodeId: 'coc_step3_A_easy', weaknessId: 'counting_overcounting' },
      ],
      dontKnowNextNodeId: 'coc_step3_A_easy',
    },

    // ─────────── step3: 오답 C ("중복은 더하면 된다") 분기 ───────────
    'coc_step3_C_explain': {
      id: 'coc_step3_C_explain',
      kind: 'explain',
      title: '더하는 게 아니라 빼거나 나눠요',
      body: '중복은 이미 두 번 세어진 거라서 더하면 더 부풀려져요. 같은 경우 수만큼 빼거나, 그 수로 나눠 정리해야 해요. 방향이 반대예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'coc_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'coc_step3_A_easy',
      summary: '중복은 이미 두 번 세어진 양 — 더하면 안 되고 빼거나 나눠야 함',
      triggers: [
        '중복은 더하는 게 아닌가요',
        '왜 빼야 하는지 모르겠어요',
        '나눈다는 게 무슨 뜻인지',
      ],
    },
    'coc_step3_C_check': {
      id: 'coc_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '순서 따져 뽑은 6가지 중 같은 경우끼리 묶이는 쌍이 3쌍 있을 때, 최종 답은?',
      options: [
        { id: 'correct', text: '3가지 (6 ÷ 2)', isCorrect: true, nextNodeId: 'coc_step3_exit' },
        { id: 'wrong1',  text: '9가지 (6 + 3)', isCorrect: false, nextNodeId: 'coc_step3_A_easy', weaknessId: 'counting_overcounting' },
        { id: 'wrong2',  text: '12가지', isCorrect: false, nextNodeId: 'coc_step3_A_easy', weaknessId: 'counting_overcounting' },
      ],
      dontKnowNextNodeId: 'coc_step3_A_easy',
    },

    'coc_step3_exit': { id: 'coc_step3_exit', kind: 'exit' },
  },
};
