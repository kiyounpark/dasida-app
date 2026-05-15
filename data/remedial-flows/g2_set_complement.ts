import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: gsc_step<N>_<choice>_<role>
// 약점 prefix: gsc
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 여집합, 전체집합, 원소, 합집합, 교집합 등 단원 안 세부 용어 첫 등장 시 한 줄 정의 동봉.

export const g2_set_complement_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 전체집합 U 확인 (여집합의 기준)
    //   B: "U 없이 여집합을 바로 구할 수 있다"
    //   C: "U는 항상 자연수 전체이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "U 없이 여집합을 바로 구할 수 있다" ───────────
    'gsc_step1_B_explain': {
      id: 'gsc_step1_B_explain',
      kind: 'explain',
      title: '여집합은 U라는 울타리가 있어야 정해져요',
      body: '여집합(전체에서 그 집합에 안 들어가는 나머지 원소들)은 전체집합 U(이 문제에서 다루는 모든 원소를 모은 집합)가 정해져야 구할 수 있어요. U라는 울타리 안에서 A를 뺀 나머지가 여집합이거든요. U가 없으면 나머지 범위를 정할 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step1_B_easy',
      summary: '여집합은 전체집합 U가 정해져야 구할 수 있음 — U 없이는 나머지 범위를 알 수 없음',
      triggers: [
        'U 없이 여집합 바로 구하면 안 되나요',
        '전체집합이 왜 필요해요',
        '여집합이 무엇 기준인지 모르겠어요',
      ],
    },
    'gsc_step1_B_easy': {
      id: 'gsc_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'A={2,4} 하나만 보면 여집합을 못 구해요. U={1,2,3,4,5,6}라고 알려줘야 여집합이 {1,3,5,6}으로 정해져요. U를 먼저 적는 게 시작이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step1_B_remedy',
    },
    'gsc_step1_B_check': {
      id: 'gsc_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '여집합을 구하려면 가장 먼저 무엇을 확인해야 할까요?',
      options: [
        { id: 'correct', text: '전체집합 U가 무엇인지', isCorrect: true, nextNodeId: 'gsc_step1_exit' },
        { id: 'wrong1',  text: 'A의 원소만 보면 된다', isCorrect: false, nextNodeId: 'gsc_step1_B_remedy', weaknessId: 'g2_set_complement' },
        { id: 'wrong2',  text: '아무것도 필요 없다', isCorrect: false, nextNodeId: 'gsc_step1_B_remedy', weaknessId: 'g2_set_complement' },
      ],
      dontKnowNextNodeId: 'gsc_step1_B_easy',
    },
    'gsc_step1_B_remedy': {
      id: 'gsc_step1_B_remedy',
      kind: 'explain',
      title: 'U를 먼저 적어요',
      body: '여집합은 U에서 A를 뺀 나머지예요. 그래서 U가 무엇인지 모르면 시작을 못 해요. 문제에 적힌 U를 먼저 그대로 옮겨 적으세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step1_B_check',
    },

    // ─────────── step1.C: "U는 항상 자연수 전체이다" ───────────
    'gsc_step1_C_explain': {
      id: 'gsc_step1_C_explain',
      kind: 'explain',
      title: 'U는 문제마다 달라져요',
      body: '전체집합 U는 항상 자연수 전체가 아니에요. 어떤 문제는 U={1,2,3,4,5,6}, 다른 문제는 U={a,b,c}일 수도 있어요. 문제에 적힌 U를 그대로 따라야 여집합이 맞게 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step1_C_remedy',
      summary: '전체집합 U는 문제마다 다름 — 자연수 전체로 고정해 두면 안 됨',
      triggers: [
        'U는 자연수 전체 아니에요',
        '전체집합이 매번 바뀌나요',
        'U를 그냥 숫자 전체로 잡았어요',
      ],
    },
    'gsc_step1_C_check': {
      id: 'gsc_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'U={5,6,7,8}, A={6,8}일 때 A의 여집합은?',
      options: [
        { id: 'correct', text: '{5,7}', isCorrect: true, nextNodeId: 'gsc_step1_exit' },
        { id: 'wrong1',  text: '{1,2,3,4}', isCorrect: false, nextNodeId: 'gsc_step1_C_remedy', weaknessId: 'g2_set_complement' },
        { id: 'wrong2',  text: '{1,2,3,...}', isCorrect: false, nextNodeId: 'gsc_step1_C_remedy', weaknessId: 'g2_set_complement' },
      ],
      dontKnowNextNodeId: 'gsc_step1_C_remedy',
    },
    'gsc_step1_C_remedy': {
      id: 'gsc_step1_C_remedy',
      kind: 'explain',
      title: '주어진 U={5,6,7,8} 안에서만 봐요',
      body: '이 문제의 전체집합은 {5,6,7,8}이라 자연수 전체가 아니에요. 여기서 A={6,8}을 빼면 {5,7}만 남아요. U 밖의 1,2,3은 처음부터 후보가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step1_C_check',
    },

    'gsc_step1_exit': { id: 'gsc_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — A의 원소 제거 (여집합 = U에서 A 빼기)
    //   B: "A에서 U를 빼면 A^c가 된다" (방향 반대)
    //   C: "A^c는 A의 원소를 뒤집은 것이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "A에서 U를 빼면 A^c가 된다" ───────────
    'gsc_step2_B_explain': {
      id: 'gsc_step2_B_explain',
      kind: 'explain',
      title: '큰 집합 U에서 A를 빼는 방향이에요',
      body: '여집합은 전체집합 U에서 A의 원소(집합에 들어 있는 하나하나의 값)를 빼는 거예요. 작은 A에서 큰 U를 빼는 게 아니에요. 방향을 거꾸로 하면 남는 원소가 없거나 엉뚱한 결과가 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step2_B_easy',
      summary: '여집합 = U − A (큰 U에서 A를 뺌) — A − U 방향은 틀림',
      triggers: [
        'A에서 U 빼는 거 아니었나요',
        '어느 쪽에서 빼는지 헷갈려요',
        '빼는 순서를 모르겠어요',
      ],
    },
    'gsc_step2_B_easy': {
      id: 'gsc_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'U={1,2,3,4,5,6}, A={2,4}일 때 U에서 2와 4를 지우면 {1,3,5,6}이 여집합이에요. A에서 U를 빼려고 하면 뺄 게 너무 많아 남는 게 없어요. 항상 U가 출발점이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step2_B_remedy',
    },
    'gsc_step2_B_check': {
      id: 'gsc_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'U={1,2,3,4,5}, A={1,3}일 때 A의 여집합은?',
      options: [
        { id: 'correct', text: '{2,4,5}', isCorrect: true, nextNodeId: 'gsc_step2_exit' },
        { id: 'wrong1',  text: '{ } (빈 집합)', isCorrect: false, nextNodeId: 'gsc_step2_B_remedy', weaknessId: 'g2_set_complement' },
        { id: 'wrong2',  text: '{1,3}', isCorrect: false, nextNodeId: 'gsc_step2_B_remedy', weaknessId: 'g2_set_complement' },
      ],
      dontKnowNextNodeId: 'gsc_step2_B_easy',
    },
    'gsc_step2_B_remedy': {
      id: 'gsc_step2_B_remedy',
      kind: 'explain',
      title: 'U={1,2,3,4,5}에서 1,3을 지워요',
      body: '전체집합 U에서 A의 원소 1과 3을 지우면 {2,4,5}가 남아요. 이게 여집합이에요. A에서 U를 빼려고 하면 빈 집합이 나와서 답이 어긋나요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step2_B_check',
    },

    // ─────────── step2.C: "A^c는 A의 원소를 뒤집은 것이다" ───────────
    'gsc_step2_C_explain': {
      id: 'gsc_step2_C_explain',
      kind: 'explain',
      title: '뒤집는 게 아니라 U에서 빼는 거예요',
      body: '여집합은 A의 원소를 단순히 부호만 바꾸거나 뒤집는 게 아니에요. 전체집합 U에 있으면서 A에는 없는 원소들을 모은 집합이에요. 그래서 U라는 기준이 꼭 필요하고, U를 보지 않으면 정할 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step2_C_remedy',
      summary: '여집합 = U에 속하지만 A에 안 속하는 원소 — 단순히 뒤집는 게 아님',
      triggers: [
        '그냥 뒤집으면 되는 거 아닌가요',
        '원소를 반대로 만든다는 게 무슨 뜻인지',
        'U 없이 A만 보고 만들었어요',
      ],
    },
    'gsc_step2_C_check': {
      id: 'gsc_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'U={1,2,3,4,5,6}, A={2,4}일 때 A의 여집합은?',
      options: [
        { id: 'correct', text: '{1,3,5,6}', isCorrect: true, nextNodeId: 'gsc_step2_exit' },
        { id: 'wrong1',  text: '{-2,-4}', isCorrect: false, nextNodeId: 'gsc_step2_C_remedy', weaknessId: 'g2_set_complement' },
        { id: 'wrong2',  text: '{4,2}', isCorrect: false, nextNodeId: 'gsc_step2_C_remedy', weaknessId: 'g2_set_complement' },
      ],
      dontKnowNextNodeId: 'gsc_step2_C_remedy',
    },
    'gsc_step2_C_remedy': {
      id: 'gsc_step2_C_remedy',
      kind: 'explain',
      title: 'U에 있으면서 A에 없는 것만 모아요',
      body: 'U={1,2,3,4,5,6} 중에서 A={2,4}에 없는 원소는 1,3,5,6이에요. 그래서 여집합은 {1,3,5,6}이에요. 부호를 바꾸거나 순서를 뒤집는 것과는 전혀 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step2_C_check',
    },

    'gsc_step2_exit': { id: 'gsc_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 검증 (A와 A^c를 합하면 U)
    //   B: "A와 A^c의 교집합이 U이다"
    //   C: "A와 A^c의 원소 개수는 항상 같다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "A와 A^c의 교집합이 U이다" ───────────
    'gsc_step3_B_explain': {
      id: 'gsc_step3_B_explain',
      kind: 'explain',
      title: '합집합이 U, 교집합은 비어 있어요',
      body: 'A와 여집합을 합집합(두 집합의 원소를 모두 모은 것)으로 합치면 전체집합 U가 돼요. 두 집합은 겹치는 원소가 하나도 없어서 교집합(두 집합에 공통으로 든 원소)은 빈 집합이에요. 검증할 때는 합쳤을 때 U가 되는지를 봐요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step3_B_easy',
      summary: 'A와 여집합의 합집합 = U, 교집합 = 빈 집합 — 검증은 합쳤을 때 U인지 확인',
      triggers: [
        '합치는 게 교집합인가요',
        '검증을 어떻게 해요',
        '겹치는 부분이 U 아닌가요',
      ],
    },
    'gsc_step3_B_easy': {
      id: 'gsc_step3_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'U={1,2,3,4,5,6}, A={2,4}, 여집합 {1,3,5,6}이에요. 둘을 합치면 {1,2,3,4,5,6}=U가 맞아요. 둘에 동시에 든 원소는 없어서 교집합은 비어 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step3_B_remedy',
    },
    'gsc_step3_B_check': {
      id: 'gsc_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A와 그 여집합을 합집합으로 합치면 무엇이 될까요?',
      options: [
        { id: 'correct', text: '전체집합 U', isCorrect: true, nextNodeId: 'gsc_step3_exit' },
        { id: 'wrong1',  text: '빈 집합', isCorrect: false, nextNodeId: 'gsc_step3_B_remedy', weaknessId: 'g2_set_complement' },
        { id: 'wrong2',  text: '집합 A 자신', isCorrect: false, nextNodeId: 'gsc_step3_B_remedy', weaknessId: 'g2_set_complement' },
      ],
      dontKnowNextNodeId: 'gsc_step3_B_easy',
    },
    'gsc_step3_B_remedy': {
      id: 'gsc_step3_B_remedy',
      kind: 'explain',
      title: '합치면 U, 겹치면 빈 집합',
      body: 'A와 여집합은 U를 둘로 나눠 가진 사이라, 합집합으로 모으면 U 전체가 다시 채워져요. 둘이 동시에 가진 원소는 없으니 교집합은 빈 집합이에요. 검증은 합쳐서 U가 되는지로 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step3_B_check',
    },

    // ─────────── step3.C: "A와 A^c의 원소 개수는 항상 같다" ───────────
    'gsc_step3_C_explain': {
      id: 'gsc_step3_C_explain',
      kind: 'explain',
      title: '개수가 같은 건 우연일 때만이에요',
      body: 'A의 원소 수와 여집합의 원소 수는 항상 같지는 않아요. 둘을 더하면 전체집합 U의 원소 수가 되는 관계만 늘 성립해요. A가 U의 절반일 때만 우연히 두 개수가 같아져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step3_C_remedy',
      summary: 'A 원소 수 + 여집합 원소 수 = U 원소 수 — 두 개수가 같은 건 우연일 때만',
      triggers: [
        '개수가 항상 같은 거 아닌가요',
        '여집합이 A랑 크기가 같나요',
        '왜 개수가 다를 수 있어요',
      ],
    },
    'gsc_step3_C_check': {
      id: 'gsc_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'U의 원소가 6개, A의 원소가 2개이면 여집합의 원소는 몇 개일까요?',
      options: [
        { id: 'correct', text: '4개', isCorrect: true, nextNodeId: 'gsc_step3_exit' },
        { id: 'wrong1',  text: '2개 (A와 같다)', isCorrect: false, nextNodeId: 'gsc_step3_C_remedy', weaknessId: 'g2_set_complement' },
        { id: 'wrong2',  text: '6개', isCorrect: false, nextNodeId: 'gsc_step3_C_remedy', weaknessId: 'g2_set_complement' },
      ],
      dontKnowNextNodeId: 'gsc_step3_C_remedy',
    },
    'gsc_step3_C_remedy': {
      id: 'gsc_step3_C_remedy',
      kind: 'explain',
      title: '6 − 2 = 4 개',
      body: '전체집합 U가 6개인데 A가 그중 2개를 차지하면, 나머지 4개가 여집합이에요. A와 개수가 같으려면 A가 딱 3개일 때뿐이라 항상 같지는 않아요. 더해서 U 개수가 되는 관계만 늘 맞아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsc_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsc_step3_C_check',
    },

    'gsc_step3_exit': { id: 'gsc_step3_exit', kind: 'exit' },
  },
};
