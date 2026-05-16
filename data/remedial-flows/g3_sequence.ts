import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3s_step<N>_<choice>_<role>
// 약점 prefix: g3s

export const g3_sequence_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 A ("aₙ=a₁·dⁿ⁻¹") 분기 ───────────
    // 등차수열(공차 d로 일정하게 더해 가는 수열) 일반항을 곱셈 꼴로 잘못 적용
    'g3s_step1_A_explain': {
      id: 'g3s_step1_A_explain',
      kind: 'explain',
      title: '등차수열은 더해서 나아가요',
      body: '등차수열은 같은 수(공차 d, 항과 항 사이의 일정한 차이)를 계속 더해 가는 수열이에요. 그래서 일반항(n번째 항을 구하는 식)은 aₙ = a₁ + (n−1)d 처럼 더하기 모양이에요. 곱셈으로 진행하면 그건 등비수열(같은 수를 계속 곱해 가는 수열)이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step1_A_easy',
      summary: '등차수열 일반항은 더하기 꼴 aₙ = a₁ + (n−1)d — 곱셈 꼴은 등비수열용',
      triggers: [
        '등차랑 등비 헷갈려요',
        '왜 더하기인지 모르겠어요',
        '공차 d를 곱하는 줄 알았어요',
      ],
    },
    'g3s_step1_A_easy': {
      id: 'g3s_step1_A_easy',
      kind: 'explain',
      title: '예시로 짚어요',
      body: 'a₁ = 2, 공차 d = 3 이면 2, 5, 8, 11 처럼 한 칸씩 3을 더해 가요. a₅ 는 2 + (5−1)×3 = 14 예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step1_exit',
    },
    'g3s_step1_A_check': {
      id: 'g3s_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a₁ = 4, 공차 d = 5 인 등차수열에서 a₃ 는 얼마예요?',
      options: [
        { id: 'correct', text: '14', isCorrect: true, nextNodeId: 'g3s_step1_exit' },
        { id: 'wrong1', text: '100', isCorrect: false, nextNodeId: 'g3s_step1_A_remedy', weaknessId: 'g3_sequence' },
        { id: 'wrong2', text: '9', isCorrect: false, nextNodeId: 'g3s_step1_A_remedy', weaknessId: 'g3_sequence' },
      ],
      dontKnowNextNodeId: 'g3s_step1_A_easy',
    },
    'g3s_step1_A_remedy': {
      id: 'g3s_step1_A_remedy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: 'a₃ = a₁ + (3−1)×d = 4 + 2×5 = 14 예요. 공차는 더하는 거지 곱하는 게 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step1_exit',
    },

    // ─────────── step1: 오답 C ("aₙ=a₁+(n+1)d") 분기 ───────────
    // (n−1) 자리에 (n+1) 을 넣는 지수 어긋남
    'g3s_step1_C_explain': {
      id: 'g3s_step1_C_explain',
      kind: 'explain',
      title: '첫째항부터 세어 보세요',
      body: 'a₁ 은 시작점이라서 공차를 한 번도 더하지 않아요. a₂ 는 공차를 한 번, a₃ 는 두 번 더한 결과예요. 그래서 aₙ 은 공차를 (n−1) 번 더한 모양이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step1_A_easy',
      summary: '공차 d 를 더하는 횟수는 (n−1) — 첫째항은 0번 더하니까 a₁ 자체',
      triggers: [
        '(n+1)인지 (n−1)인지 헷갈려요',
        '왜 한 칸 빼는지 모르겠어요',
        '첫째항도 공차를 더해야 하는 줄 알았어요',
      ],
    },
    'g3s_step1_C_check': {
      id: 'g3s_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a₁ = 3, 공차 d = 2 인 등차수열에서 a₄ 를 구하면?',
      options: [
        { id: 'correct', text: '9', isCorrect: true, nextNodeId: 'g3s_step1_exit' },
        { id: 'wrong1', text: '11', isCorrect: false, nextNodeId: 'g3s_step1_C_remedy', weaknessId: 'g3_sequence' },
        { id: 'wrong2', text: '13', isCorrect: false, nextNodeId: 'g3s_step1_C_remedy', weaknessId: 'g3_sequence' },
      ],
      dontKnowNextNodeId: 'g3s_step1_A_easy',
    },
    'g3s_step1_C_remedy': {
      id: 'g3s_step1_C_remedy',
      kind: 'explain',
      title: '(4−1)×2 = 6 을 더해요',
      body: 'a₄ 는 a₁ 에서 공차를 3번 더한 결과예요. 3 + 3×2 = 9 가 답이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step1_exit',
    },

    'g3s_step1_exit': { id: 'g3s_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 A ("aₙ=a₁·rⁿ") 분기 ───────────
    // 지수가 한 칸 어긋난 경우
    'g3s_step2_A_explain': {
      id: 'g3s_step2_A_explain',
      kind: 'explain',
      title: '등비수열도 첫째항부터 세요',
      body: '등비수열은 같은 수(공비 r, 항과 항 사이의 일정한 배수)를 계속 곱해 가는 수열이에요. a₁ 은 시작점이라 r 을 0번 곱한 상태고, a₂ 는 1번, a₃ 는 2번 곱해요. 그래서 aₙ = a₁ · rⁿ⁻¹ 처럼 지수가 (n−1) 이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step2_A_easy',
      summary: '등비수열 일반항 지수는 (n−1) — 첫째항은 곱하지 않은 상태라 r⁰ = 1',
      triggers: [
        '지수가 n인지 n−1인지 헷갈려요',
        '왜 한 칸 빼는지',
        '첫째항에도 공비를 곱해야 하는 줄 알았어요',
      ],
    },
    'g3s_step2_A_easy': {
      id: 'g3s_step2_A_easy',
      kind: 'explain',
      title: '예시로 짚어요',
      body: 'a₁ = 3, 공비 r = 2 이면 3, 6, 12, 24 처럼 곱해 가요. a₄ 는 3 × 2³ = 24 이지 3 × 2⁴ 가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step2_exit',
    },
    'g3s_step2_A_check': {
      id: 'g3s_step2_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a₁ = 2, 공비 r = 3 인 등비수열에서 a₃ 은?',
      options: [
        { id: 'correct', text: '18', isCorrect: true, nextNodeId: 'g3s_step2_exit' },
        { id: 'wrong1', text: '54', isCorrect: false, nextNodeId: 'g3s_step2_A_remedy', weaknessId: 'g3_sequence' },
        { id: 'wrong2', text: '6', isCorrect: false, nextNodeId: 'g3s_step2_A_remedy', weaknessId: 'g3_sequence' },
      ],
      dontKnowNextNodeId: 'g3s_step2_A_easy',
    },
    'g3s_step2_A_remedy': {
      id: 'g3s_step2_A_remedy',
      kind: 'explain',
      title: '2 × 3² = 18',
      body: 'a₃ 은 a₁ 에 공비를 2번 곱한 값이에요. 2 × 3 × 3 = 18 이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step2_exit',
    },

    // ─────────── step2: 오답 C ("aₙ=a₁+(n-1)r") 분기 ───────────
    // 등비수열에 등차 일반항을 잘못 적용
    'g3s_step2_C_explain': {
      id: 'g3s_step2_C_explain',
      kind: 'explain',
      title: '등비수열은 곱해서 나아가요',
      body: '등비수열은 항과 항 사이의 비율(공비 r)이 일정하니까 곱셈으로 진행해요. 그래서 일반항은 aₙ = a₁ · rⁿ⁻¹ 처럼 곱 모양이에요. 더하기로 풀면 그건 등차수열이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step2_A_easy',
      summary: '등비수열 일반항은 곱셈 꼴 aₙ = a₁ · rⁿ⁻¹ — 더하기 꼴은 등차수열용',
      triggers: [
        '등차랑 등비 식이 헷갈려요',
        '왜 곱하는지 모르겠어요',
        '공비도 더하는 줄 알았어요',
      ],
    },
    'g3s_step2_C_check': {
      id: 'g3s_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '등비수열에서 a₁ = 5, 공비 r = 2 일 때 a₃ 는?',
      options: [
        { id: 'correct', text: '20', isCorrect: true, nextNodeId: 'g3s_step2_exit' },
        { id: 'wrong1', text: '9', isCorrect: false, nextNodeId: 'g3s_step2_C_remedy', weaknessId: 'g3_sequence' },
        { id: 'wrong2', text: '7', isCorrect: false, nextNodeId: 'g3s_step2_C_remedy', weaknessId: 'g3_sequence' },
      ],
      dontKnowNextNodeId: 'g3s_step2_A_easy',
    },
    'g3s_step2_C_remedy': {
      id: 'g3s_step2_C_remedy',
      kind: 'explain',
      title: '5 × 2² = 20',
      body: '공비 2 를 2번 곱하면 4 가 되고, 첫째항 5 에 곱하면 20 이에요. 더하기로 풀면 등차수열 식이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step2_exit',
    },

    'g3s_step2_exit': { id: 'g3s_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 A ("등차는 a₁·rⁿ, 등비는 n(a₁+aₙ)/2") 분기 ───────────
    // 두 합 공식이 서로 바뀜
    'g3s_step3_A_explain': {
      id: 'g3s_step3_A_explain',
      kind: 'explain',
      title: '합 공식 짝을 다시 맞춰요',
      body: '등차수열의 합 Sₙ(첫째항부터 n번째 항까지 모두 더한 값)은 n(a₁ + aₙ)/2 예요. 등비수열의 합 Sₙ 은 a₁(rⁿ − 1)/(r − 1) 이에요. 등차는 평균을 항 개수만큼 곱한 모양, 등비는 비율로 묶인 모양이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step3_A_easy',
      summary: '등차합 = n(a₁+aₙ)/2, 등비합 = a₁(rⁿ−1)/(r−1) — 두 공식이 자리 바뀌면 안 됨',
      triggers: [
        '등차랑 등비 합 공식이 헷갈려요',
        '어느 게 어느 수열 합인지 모르겠어요',
        '식이 비슷해서 자꾸 섞여요',
      ],
    },
    'g3s_step3_A_easy': {
      id: 'g3s_step3_A_easy',
      kind: 'explain',
      title: '한 줄로 외워요',
      body: '등차는 더하니까 합도 더하기 꼴 평균 × 개수 모양이에요. 등비는 곱하니까 합도 거듭제곱이 들어간 분수 모양이에요. 모양으로 짝을 기억하면 헷갈리지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step3_exit',
    },
    'g3s_step3_A_check': {
      id: 'g3s_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '1 + 2 + 3 + … + 10 의 값은? (이건 a₁ = 1, 공차 1 인 등차수열의 합이에요.)',
      options: [
        { id: 'correct', text: '55', isCorrect: true, nextNodeId: 'g3s_step3_exit' },
        { id: 'wrong1', text: '100', isCorrect: false, nextNodeId: 'g3s_step3_A_remedy', weaknessId: 'g3_sequence' },
        { id: 'wrong2', text: '45', isCorrect: false, nextNodeId: 'g3s_step3_A_remedy', weaknessId: 'g3_sequence' },
      ],
      dontKnowNextNodeId: 'g3s_step3_A_easy',
    },
    'g3s_step3_A_remedy': {
      id: 'g3s_step3_A_remedy',
      kind: 'explain',
      title: '10 × (1 + 10) / 2 = 55',
      body: '등차수열 합은 n(a₁ + aₙ)/2 예요. n = 10, a₁ = 1, a₁₀ = 10 을 그대로 넣으면 55 가 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step3_exit',
    },

    // ─────────── step3: 오답 C ("두 수열 모두 n×aₙ/2") 분기 ───────────
    // 등차 공식만 적용
    'g3s_step3_C_explain': {
      id: 'g3s_step3_C_explain',
      kind: 'explain',
      title: '등비수열은 평균 식으로 안 풀려요',
      body: 'n(a₁ + aₙ)/2 는 등차수열에서 모든 항을 평균 내서 개수만큼 곱한 식이라서, 같은 간격으로 늘어날 때만 맞아요. 등비수열은 항이 곱셈으로 커지니까 평균이 일정하지 않아요. 그래서 별도 공식 a₁(rⁿ − 1)/(r − 1) 을 써야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step3_A_easy',
      summary: '평균 × 개수 식은 등차 전용 — 등비합은 a₁(rⁿ−1)/(r−1) 로 따로 계산',
      triggers: [
        '등비도 같은 식으로 풀리는 줄 알았어요',
        '왜 등비는 분수 모양인지',
        '평균을 못 내는 이유를 모르겠어요',
      ],
    },
    'g3s_step3_C_check': {
      id: 'g3s_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a₁ = 1, 공비 r = 2 인 등비수열의 첫 4개 항의 합은? (1, 2, 4, 8)',
      options: [
        { id: 'correct', text: '15', isCorrect: true, nextNodeId: 'g3s_step3_exit' },
        { id: 'wrong1', text: '18', isCorrect: false, nextNodeId: 'g3s_step3_C_remedy', weaknessId: 'g3_sequence' },
        { id: 'wrong2', text: '16', isCorrect: false, nextNodeId: 'g3s_step3_C_remedy', weaknessId: 'g3_sequence' },
      ],
      dontKnowNextNodeId: 'g3s_step3_A_easy',
    },
    'g3s_step3_C_remedy': {
      id: 'g3s_step3_C_remedy',
      kind: 'explain',
      title: '1 × (2⁴ − 1) / (2 − 1) = 15',
      body: '등비수열 합 공식에 n = 4, a₁ = 1, r = 2 를 넣으면 (16 − 1)/1 = 15 예요. 1 + 2 + 4 + 8 직접 더해도 15 가 맞아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3s_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3s_step3_exit',
    },

    'g3s_step3_exit': { id: 'g3s_step3_exit', kind: 'exit' },
  },
};
