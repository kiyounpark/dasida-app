import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3cn_step<N>_<choice>_<role>
// 약점 prefix: g3cn
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 순열(P), 조합(C), 중복순열, 중복조합, 팩토리얼, 대칭성 같은 용어는 첫 등장 시 한 줄 정의 동봉.

export const g3_counting_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 순열·조합 판단 기준 (순서 유무)
    //   B: "인원이 많으면 순열, 적으면 조합"
    //   C: "무조건 조합으로 계산한 뒤 순서를 곱한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "인원이 많으면 순열, 적으면 조합" ───────────
    'g3cn_step1_B_explain': {
      id: 'g3cn_step1_B_explain',
      kind: 'explain',
      title: '인원 수가 아니라 자리 이름이 기준이에요',
      body: '순열(P, 순서를 따져 뽑는 경우의 수)과 조합(C, 순서를 따지지 않고 뽑는 경우의 수)을 가르는 건 인원 수가 아니라 자리 이름이 다르냐예요. 5명에서 회장·부회장을 뽑으면 자리 이름이 달라서 순열, 100명에서 대표 2명을 뽑으면 자리 이름이 같아서 조합이에요. 사람 수는 무관하니 자리 이름만 보면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step1_B_easy',
      summary: '순열·조합 판단 기준은 인원 수가 아니라 순서의 의미 — 자리에 의미가 있으면 순열(P), 없으면 조합(C)',
      triggers: [
        '인원이 많으면 순열인 줄 알았어요',
        '사람 수로 구분하는 거 아닌가요',
        '언제 P 쓰고 언제 C 써요',
      ],
    },
    'g3cn_step1_B_easy': {
      id: 'g3cn_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: '"회장·부회장" 처럼 자리 이름이 다르면 누가 회장인지 따져야 해서 순열이에요. "대표 2명" 처럼 자리 이름이 같으면 누가 먼저든 같은 결과라 조합이에요. 인원이 3명이든 30명이든 자리 이름만 보면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step1_exit',
    },
    'g3cn_step1_B_check': {
      id: 'g3cn_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '7명에서 대표 3명을 뽑을 때, 어떤 식을 써야 할까요?',
      options: [
        { id: 'correct', text: 'C(7,3) — 조합', isCorrect: true, nextNodeId: 'g3cn_step1_exit' },
        { id: 'wrong1',  text: 'P(7,3) — 순열 (인원이 많으니까)', isCorrect: false, nextNodeId: 'g3cn_step1_B_remedy', weaknessId: 'g3_counting' },
        { id: 'wrong2',  text: '7! — 팩토리얼', isCorrect: false, nextNodeId: 'g3cn_step1_B_remedy', weaknessId: 'g3_counting' },
      ],
      dontKnowNextNodeId: 'g3cn_step1_B_easy',
    },
    'g3cn_step1_B_remedy': {
      id: 'g3cn_step1_B_remedy',
      kind: 'explain',
      title: '"대표 3명"은 자리가 똑같아요',
      body: '"대표 3명"은 세 자리 이름이 다 똑같아서 누가 먼저 뽑히든 결과가 같아요. 그래서 조합 C(7,3)을 써요. 인원이 7명이든 70명이든 자리에 차이가 없으면 C예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step1_exit',
    },

    // ─────────── step1.C: "무조건 조합으로 계산한 뒤 순서를 곱한다" ───────────
    'g3cn_step1_C_explain': {
      id: 'g3cn_step1_C_explain',
      kind: 'explain',
      title: '처음부터 P 또는 C 를 골라 쓰는 게 정석이에요',
      body: '조합 C 로 먼저 뽑은 뒤 자리 순서 r! 가지 (r 개를 줄 세우는 경우의 수) 만큼 곱하면 결국 순열 P 와 같은 값이 되긴 해요. 다만 매번 두 단계를 거치면 실수가 늘고 계산이 길어져요. 문제 처음에 "자리에 의미가 있나" 한 번만 보면 P 또는 C 가 바로 정해져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step1_B_easy',
      summary: '처음부터 P 또는 C 를 골라 쓰는 게 정석 — 매번 C 로 계산 후 r! 곱하기는 실수 늘리는 우회',
      triggers: [
        '항상 C 로 한 다음 순서를 곱하면 안 되나요',
        '순열을 안 쓰고 다 조합으로 해도 되나요',
        '어차피 결과 같지 않아요',
      ],
    },
    'g3cn_step1_C_check': {
      id: 'g3cn_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '5명에서 1등·2등을 뽑는 경우의 수는 처음에 어떻게 골라야 할까요?',
      options: [
        { id: 'correct', text: '자리가 다르니 바로 P(5,2)', isCorrect: true, nextNodeId: 'g3cn_step1_exit' },
        { id: 'wrong1',  text: 'C(5,2)로 계산한 뒤 2! 곱하기', isCorrect: false, nextNodeId: 'g3cn_step1_C_remedy', weaknessId: 'g3_counting' },
        { id: 'wrong2',  text: '항상 5!로 계산', isCorrect: false, nextNodeId: 'g3cn_step1_C_remedy', weaknessId: 'g3_counting' },
      ],
      dontKnowNextNodeId: 'g3cn_step1_B_easy',
    },
    'g3cn_step1_C_remedy': {
      id: 'g3cn_step1_C_remedy',
      kind: 'explain',
      title: '1등·2등은 자리가 다르니 P 바로 써요',
      body: '"1등·2등"은 자리 이름이 다르니 처음부터 순열 P(5,2) = 5 × 4 = 20 으로 가는 게 빨라요. C(5,2) × 2! = 10 × 2 = 20 도 결과는 같지만 두 단계라 실수가 생기기 쉬워요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step1_exit',
    },

    'g3cn_step1_exit': { id: 'g3cn_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — P(n,r), C(n,r) 계산 공식
    //   B: "C(n,r) = P(n,r) × r!" (곱·나눗셈 방향이 반대)
    //   C: "C(n,r) = n! / (n+r)!" (분모 부호가 반대)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "C(n,r)=P(n,r)×r!" ───────────
    'g3cn_step2_B_explain': {
      id: 'g3cn_step2_B_explain',
      kind: 'explain',
      title: '순서를 지우려면 곱이 아니라 나눠야 해요',
      body: '순열 P(n,r)에는 같은 사람 묶음을 자리만 바꾼 경우가 r! (1부터 r까지 다 곱한 수) 번씩 들어 있어요. 조합은 그 자리 차이를 무시하니까 r! 로 "나눠서" 중복을 지워요. 곱하면 같은 묶음을 더 부풀려서 정답보다 r! 배 더, 거기에 또 r! 배만큼 커져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step2_B_easy',
      summary: 'C(n,r) = P(n,r) / r! — 순열에서 자리만 바뀐 r! 가지를 나눠야 조합이 됨 (곱하면 반대 방향)',
      triggers: [
        '조합은 곱하는 거 아닌가요',
        'P 와 C 가 어떻게 연결돼요',
        '왜 r! 로 나눠요',
      ],
    },
    'g3cn_step2_B_easy': {
      id: 'g3cn_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: '5명 중 2명을 뽑을 때 P(5,2) = 5 × 4 = 20 이에요. 그중 (A,B)와 (B,A) 처럼 자리만 바뀐 짝이 2! = 2 가지씩이라 20 ÷ 2 = 10 이 C(5,2)예요. 곱해서 40 으로 가면 같은 짝을 더 부풀린 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step2_exit',
    },
    'g3cn_step2_B_check': {
      id: 'g3cn_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(6,3) = 120 일 때, C(6,3) 의 값은?',
      options: [
        { id: 'correct', text: '20 (120 ÷ 3! = 120 ÷ 6)', isCorrect: true, nextNodeId: 'g3cn_step2_exit' },
        { id: 'wrong1',  text: '720 (120 × 3! = 120 × 6)', isCorrect: false, nextNodeId: 'g3cn_step2_B_remedy', weaknessId: 'g3_counting' },
        { id: 'wrong2',  text: '360 (120 × 3)', isCorrect: false, nextNodeId: 'g3cn_step2_B_remedy', weaknessId: 'g3_counting' },
      ],
      dontKnowNextNodeId: 'g3cn_step2_B_easy',
    },
    'g3cn_step2_B_remedy': {
      id: 'g3cn_step2_B_remedy',
      kind: 'explain',
      title: '120 ÷ 6 = 20',
      body: 'C(6,3) = P(6,3) / 3! = 120 / 6 = 20 이에요. 곱해서 720 이 되면 자리만 바뀐 짝을 한 번 더 부풀린 값이라 답이 안 맞아요. "순서 지우기 = 나누기" 한 줄로 기억하면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step2_exit',
    },

    // ─────────── step2.C: "C(n,r) = n! / (n+r)!" ───────────
    'g3cn_step2_C_explain': {
      id: 'g3cn_step2_C_explain',
      kind: 'explain',
      title: '분모는 (n+r)! 이 아니라 r!(n−r)! 이에요',
      body: '조합 공식은 C(n,r) = n! / { r! × (n−r)! } 예요. 분모 (n−r)! 은 뽑히지 않고 남은 사람들의 자리 바꿈을 지우는 부분이에요. (n+r)! 처럼 더해 버리면 분모가 너무 커져 식이 작동하지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step2_B_easy',
      summary: 'C(n,r) = n! / { r! × (n−r)! } — 분모는 r! 과 (n−r)! 의 곱, 더해서 (n+r)! 이 되면 식이 깨짐',
      triggers: [
        '분모가 n+r 인지 n−r 인지 헷갈려요',
        '분모 부호가 어느 쪽이에요',
        '왜 (n−r)! 이 나와요',
      ],
    },
    'g3cn_step2_C_check': {
      id: 'g3cn_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'C(5,2) 를 분수로 풀면 어느 식이 맞을까요?',
      options: [
        { id: 'correct', text: '5! / (2! × 3!) = 120 / 12 = 10', isCorrect: true, nextNodeId: 'g3cn_step2_exit' },
        { id: 'wrong1',  text: '5! / 7!', isCorrect: false, nextNodeId: 'g3cn_step2_C_remedy', weaknessId: 'g3_counting' },
        { id: 'wrong2',  text: '5! / (2! × 7!)', isCorrect: false, nextNodeId: 'g3cn_step2_C_remedy', weaknessId: 'g3_counting' },
      ],
      dontKnowNextNodeId: 'g3cn_step2_B_easy',
    },
    'g3cn_step2_C_remedy': {
      id: 'g3cn_step2_C_remedy',
      kind: 'explain',
      title: 'n − r = 5 − 2 = 3 이에요',
      body: 'n = 5, r = 2 이면 분모는 2! × (5−2)! = 2! × 3! = 2 × 6 = 12 예요. C(5,2) = 120 / 12 = 10. 만약 n + r = 7 로 가면 7! = 5040 이라 분모가 너무 커져서 분수 자체가 1 보다 훨씬 작은 이상한 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step2_exit',
    },

    'g3cn_step2_exit': { id: 'g3cn_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 중복이 있는 경우 (중복순열 nʳ / 중복조합 H(n,r) = C(n+r−1, r))
    //   B: "중복이 있으면 항상 n! 로 계산한다"
    //   C: "중복 조합은 C(n,r) + n 이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "중복이 있으면 항상 n!로 계산한다" ───────────
    'g3cn_step3_B_explain': {
      id: 'g3cn_step3_B_explain',
      kind: 'explain',
      title: '중복 종류에 따라 식이 둘로 갈려요',
      body: '같은 것을 다시 뽑을 수 있을 때, 순서를 따지면 중복순열 nʳ (n 가지를 r 번 거듭 곱) 을 쓰고, 순서를 무시하면 중복조합 H(n,r) (= C(n+r−1, r) 모양의 새 식) 을 써요. n! 은 n 명을 한 줄로 세울 때만 쓰는 값이라 중복 문제에는 쓰지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step3_B_easy',
      summary: '중복순열은 nʳ, 중복조합은 H(n,r) = C(n+r−1, r) — n! 은 n명을 한 줄로 세울 때만',
      triggers: [
        '중복이면 다 n! 인 줄 알았어요',
        '중복순열이랑 중복조합이 뭐예요',
        '언제 어떤 식을 써요',
      ],
    },
    'g3cn_step3_B_easy': {
      id: 'g3cn_step3_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: '주사위를 2 번 던지면 같은 눈이 나올 수 있고 순서도 따지니까 중복순열 6² = 36 이에요. 같은 사탕 3 종류에서 5 개를 골라 봉지에 담으면 순서 무관이라 중복조합으로 풀어 C(3+5−1, 5) = C(7,5) = 21 이에요. n! 자리는 아예 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step3_exit',
    },
    'g3cn_step3_B_check': {
      id: 'g3cn_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '주사위를 3 번 던질 때 나오는 눈의 순서쌍의 개수는?',
      options: [
        { id: 'correct', text: '6³ = 216 (중복순열)', isCorrect: true, nextNodeId: 'g3cn_step3_exit' },
        { id: 'wrong1',  text: '6! = 720 (팩토리얼)', isCorrect: false, nextNodeId: 'g3cn_step3_B_remedy', weaknessId: 'g3_counting' },
        { id: 'wrong2',  text: '3! = 6', isCorrect: false, nextNodeId: 'g3cn_step3_B_remedy', weaknessId: 'g3_counting' },
      ],
      dontKnowNextNodeId: 'g3cn_step3_B_easy',
    },
    'g3cn_step3_B_remedy': {
      id: 'g3cn_step3_B_remedy',
      kind: 'explain',
      title: '6 가지를 3 번 → 6³ = 216',
      body: '주사위는 매번 6 가지가 가능하고 같은 눈이 또 나올 수 있어요. 순서도 따지니까 6 × 6 × 6 = 216 가지가 중복순열의 답이에요. 6! 은 6 가지 눈을 한 줄로 늘어놓는 경우라 문제 상황과 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step3_exit',
    },

    // ─────────── step3.C: "중복 조합도 일반 C(n,r) 식 그대로 쓴다" ───────────
    'g3cn_step3_C_explain': {
      id: 'g3cn_step3_C_explain',
      kind: 'explain',
      title: '중복조합은 위쪽 수가 n + r − 1 로 바뀌어요',
      body: '중복조합 공식은 H(n,r) = C(n + r − 1, r) 이에요. 일반 조합 C(n,r) 를 그대로 쓰면 같은 것을 다시 뽑는 경우가 빠져서 결과가 작게 나와요. "n 자리에 n + r − 1 을 끼워 넣는다" 한 줄이 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step3_B_easy',
      summary: '중복조합 H(n,r) = C(n+r−1, r) — 일반 C(n,r) 그대로 쓰면 결과가 작게 나옴',
      triggers: [
        '중복이면 그냥 C 로 풀어도 되나요',
        '중복조합 공식이 헷갈려요',
        'H(n,r) 가 무슨 식이에요',
      ],
    },
    'g3cn_step3_C_check': {
      id: 'g3cn_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '같은 종류 4 가지 과일 중 6 개를 (개수 제한 없이) 고르는 경우의 수는?',
      options: [
        { id: 'correct', text: 'H(4,6) = C(9,6) = 84 (위쪽 수에 +r−1)', isCorrect: true, nextNodeId: 'g3cn_step3_exit' },
        { id: 'wrong1',  text: 'C(4,6) 그대로 사용 (위쪽 수 안 바꿈)', isCorrect: false, nextNodeId: 'g3cn_step3_C_remedy', weaknessId: 'g3_counting' },
        { id: 'wrong2',  text: 'C(10,6) = 210 (n+r 그대로 사용)', isCorrect: false, nextNodeId: 'g3cn_step3_C_remedy', weaknessId: 'g3_counting' },
      ],
      dontKnowNextNodeId: 'g3cn_step3_B_easy',
    },
    'g3cn_step3_C_remedy': {
      id: 'g3cn_step3_C_remedy',
      kind: 'explain',
      title: 'n + r − 1 = 4 + 6 − 1 = 9',
      body: 'H(4, 6) = C(4 + 6 − 1, 6) = C(9, 6) = 84 예요. C(4, 6) 그대로 가면 위쪽이 아래쪽보다 작아 정의 자체가 안 되고, n + r 만 그대로 두면 C(10, 6) 처럼 살짝 큰 답이 나와요. " − 1 한 번 빼기" 가 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3cn_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3cn_step3_exit',
    },

    'g3cn_step3_exit': { id: 'g3cn_step3_exit', kind: 'exit' },
  },
};
