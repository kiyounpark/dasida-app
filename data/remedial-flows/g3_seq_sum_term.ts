import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3sst_step<N>_<choice>_<role>
// 약점 prefix: g3sst (g3_sequence 의 g3s_ 와 충돌하지 않음)

export const g3_seq_sum_term_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 A ("모든 자연수 n에서 쓸 수 있다") 분기 ───────────
    // 정리해서 나온 식의 적용 범위를 n≥1 로 넓게 잡은 경우
    'g3sst_step1_A_explain': {
      id: 'g3sst_step1_A_explain',
      kind: 'explain',
      title: '정리할 때 Sₙ₋₁ 자리가 걸려요',
      body: 'Sₙ(첫째항부터 n번째 항까지 더한 합)에서 Sₙ₋₁ 을 빼면 n번째 항 하나만 남아요. 이걸 식으로 정리하려면 Sₙ₋₁ 자리에도 문제가 준 Sₙ 식을 넣어야 하는데, 문제는 n 이 1 이상인 합만 줬어요. n=1 이면 그 자리가 S₀ 이 되어 넣을 식이 없어요. 그래서 정리해서 나온 식은 n≥2 에서 써요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step1_A_easy',
      summary: '정리한 식이 n≥2 전용인 건 Sₙ₋₁ 자리에 넣을 식이 n−1≥1 에서만 있기 때문',
      triggers: [
        '왜 n=1은 안 되나요',
        'Sₙ−Sₙ₋₁ 을 언제 쓰는지 모르겠어요',
        '첫째항도 같은 식으로 되는 줄 알았어요',
      ],
    },
    'g3sst_step1_A_easy': {
      id: 'g3sst_step1_A_easy',
      kind: 'explain',
      title: '빼기로 남는 항을 봐요',
      body: 'S₃=a₁+a₂+a₃ 이고 S₂=a₁+a₂ 예요. 빼면 a₃ 하나만 남죠. 같은 방법으로 a₁ 을 구하려면 S₁−S₀ 이 필요한데, 문제는 S₁ 부터만 식으로 줬어요. S₀ 은 받은 적이 없는 자리라 첫째항은 S₁ 을 그대로 읽어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step1_exit',
    },
    'g3sst_step1_A_check': {
      id: 'g3sst_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'Sₙ=n²+5n+3 인 수열에서 a₁ 은 얼마예요?',
      options: [
        { id: 'correct', text: '9', isCorrect: true, nextNodeId: 'g3sst_step1_exit' },
        { id: 'wrong1', text: '6', isCorrect: false, nextNodeId: 'g3sst_step1_A_remedy', weaknessId: 'g3_seq_sum_term' },
        { id: 'wrong2', text: '3', isCorrect: false, nextNodeId: 'g3sst_step1_A_remedy', weaknessId: 'g3_seq_sum_term' },
      ],
      dontKnowNextNodeId: 'g3sst_step1_A_easy',
    },
    'g3sst_step1_A_remedy': {
      id: 'g3sst_step1_A_remedy',
      kind: 'explain',
      title: 'S₁ 을 그대로 읽어요',
      body: 'a₁ 은 S₁ 이에요. Sₙ 식에 n=1 을 넣으면 1+5+3=9 예요. Sₙ−Sₙ₋₁ 을 정리한 2n+4 에 n=1 을 넣으면 6 이 나오는데, 그 식은 n≥2 자리예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step1_exit',
    },

    // ─────────── step1: 오답 C ("n=0을 넣은 값이 S₀") 분기 ───────────
    // 주어진 Sₙ 식의 n=0 대입값을 S₀ 로 오인
    'g3sst_step1_C_explain': {
      id: 'g3sst_step1_C_explain',
      kind: 'explain',
      title: 'n=0 자리는 받은 적이 없어요',
      body: '문제가 준 Sₙ 식은 항을 n개 더한 합을 나타내요. n 은 1 부터라서 n=0 자리는 이 식이 맡은 적이 없어요. Sₙ=n²+5n+3 에 n=0 을 넣으면 3 이 나오지만 그건 합이 아니라 식에 0 을 넣은 값이에요. 그 3 을 빼서 첫째항을 잡으면 9 대신 6 이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step1_A_easy',
      summary: 'Sₙ 식의 n=0 대입값은 문제가 준 합이 아니다 — 그 값만큼 첫째항이 모자라게 나온다',
      triggers: [
        'S₀ 을 0으로 두면 되는 거 아닌가요',
        'n=0 을 넣어도 되나요',
        '첫째항이 왜 어긋나는지 모르겠어요',
      ],
    },
    'g3sst_step1_C_check': {
      id: 'g3sst_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'Sₙ=n²+5n+3 인 수열에서 a₁+a₂ 는 얼마예요?',
      options: [
        { id: 'correct', text: '17', isCorrect: true, nextNodeId: 'g3sst_step1_exit' },
        { id: 'wrong1', text: '14', isCorrect: false, nextNodeId: 'g3sst_step1_C_remedy', weaknessId: 'g3_seq_sum_term' },
        { id: 'wrong2', text: '8', isCorrect: false, nextNodeId: 'g3sst_step1_C_remedy', weaknessId: 'g3_seq_sum_term' },
      ],
      dontKnowNextNodeId: 'g3sst_step1_A_easy',
    },
    'g3sst_step1_C_remedy': {
      id: 'g3sst_step1_C_remedy',
      kind: 'explain',
      title: 'a₁+a₂ 는 S₂ 예요',
      body: '두 항을 더한 합이 바로 S₂ 라서 4+10+3=17 이에요. 따로 구해도 같아요 — a₁=S₁=9, a₂=S₂−S₁=8, 더하면 17 이에요. 2n+4 에 n=1 을 넣어 6 으로 시작하면 14 가 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step1_exit',
    },

    'g3sst_step1_exit': { id: 'g3sst_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 A ("n≥2 식에 n=1을 넣어 구한다") 분기 ───────────
    'g3sst_step2_A_explain': {
      id: 'g3sst_step2_A_explain',
      kind: 'explain',
      title: '첫째항은 합 그 자체예요',
      body: 'S₁ 은 첫째항부터 첫째항까지 더한 합이라 더한 항이 a₁ 하나뿐이에요. 그래서 a₁=S₁ 이에요. Sₙ 식에 n=1 을 넣으면 그게 바로 첫째항이고, n≥2 용으로 정리한 식은 여기에 쓰지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step2_A_easy',
      summary: 'a₁ = S₁ — 첫째항은 Sₙ 식에 n=1 을 넣어 바로 구한다',
      triggers: [
        '첫째항을 어떻게 구하나요',
        'a₁ 구하는 식이 헷갈려요',
        '정리한 식에 1을 넣으면 안 되나요',
      ],
    },
    'g3sst_step2_A_easy': {
      id: 'g3sst_step2_A_easy',
      kind: 'explain',
      title: '두 값을 같이 봐요',
      body: 'Sₙ=3n²+2 이면 S₁=3+2=5 예요. 첫째항 하나만 더한 합이 5 니까 a₁=5 예요. 같은 수열의 n≥2 식은 6n−3 인데 여기에 n=1 을 넣으면 3 이라 서로 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step2_exit',
    },
    'g3sst_step2_A_check': {
      id: 'g3sst_step2_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'Sₙ=3n²+2 인 수열에서 a₁ 은 얼마예요?',
      options: [
        { id: 'correct', text: '5', isCorrect: true, nextNodeId: 'g3sst_step2_exit' },
        { id: 'wrong1', text: '3', isCorrect: false, nextNodeId: 'g3sst_step2_A_remedy', weaknessId: 'g3_seq_sum_term' },
        { id: 'wrong2', text: '2', isCorrect: false, nextNodeId: 'g3sst_step2_A_remedy', weaknessId: 'g3_seq_sum_term' },
      ],
      dontKnowNextNodeId: 'g3sst_step2_A_easy',
    },
    'g3sst_step2_A_remedy': {
      id: 'g3sst_step2_A_remedy',
      kind: 'explain',
      title: '3×1²+2 = 5',
      body: 'Sₙ 식에 n=1 을 그대로 넣어요. 3×1²+2=5 예요. 6n−3 에 n=1 을 넣은 3 은 n≥2 자리 값이라 첫째항이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step2_exit',
    },

    // ─────────── step2: 오답 C ("a₁ = S₂−S₁") 분기 ───────────
    // 빼기에서 남는 항의 번호가 한 칸 밀림
    'g3sst_step2_C_explain': {
      id: 'g3sst_step2_C_explain',
      kind: 'explain',
      title: '번호를 한 칸씩 맞춰요',
      body: 'Sₙ−Sₙ₋₁ 에서 남는 건 뒤쪽 번호인 aₙ 이에요. S₂−S₁ 은 (a₁+a₂)−a₁ 이라 a₂ 가 남아요. a₁ 을 구할 때는 빼기 없이 S₁ 을 그대로 읽어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step2_A_easy',
      summary: 'S₂−S₁ = a₂ — 빼기에서 남는 항은 뒤쪽 번호. a₁ 은 S₁ 그대로',
      triggers: [
        'S₂−S₁ 이 뭐가 되나요',
        '항 번호가 헷갈려요',
        '어느 항이 남는지 모르겠어요',
      ],
    },
    'g3sst_step2_C_check': {
      id: 'g3sst_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'Sₙ=3n²+2 인 수열에서 a₂ 는 얼마예요?',
      options: [
        { id: 'correct', text: '9', isCorrect: true, nextNodeId: 'g3sst_step2_exit' },
        { id: 'wrong1', text: '14', isCorrect: false, nextNodeId: 'g3sst_step2_C_remedy', weaknessId: 'g3_seq_sum_term' },
        { id: 'wrong2', text: '5', isCorrect: false, nextNodeId: 'g3sst_step2_C_remedy', weaknessId: 'g3_seq_sum_term' },
      ],
      dontKnowNextNodeId: 'g3sst_step2_A_easy',
    },
    'g3sst_step2_C_remedy': {
      id: 'g3sst_step2_C_remedy',
      kind: 'explain',
      title: '14 − 5 = 9',
      body: 'S₂=3×4+2=14, S₁=5 예요. a₂=S₂−S₁=9 예요. 14 는 두 항을 더한 합이고 5 는 첫째항이라 둘 다 a₂ 가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step2_exit',
    },

    'g3sst_step2_exit': { id: 'g3sst_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 A ("식 하나만 적는다") 분기 ───────────
    'g3sst_step3_A_explain': {
      id: 'g3sst_step3_A_explain',
      kind: 'explain',
      title: '답은 두 줄로 적어요',
      body: 'n≥2 식에 n=1 을 넣은 값과 S₁ 이 다르면 그 수열은 한 식으로 안 덮여요. a₁=S₁ 한 줄, aₙ=(정리한 식) (n≥2) 한 줄, 이렇게 두 줄로 적어요. Sₙ=4n²−n+5 면 S₁=8 인데 정리한 식 8n−5 에 n=1 을 넣으면 3 이라 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step3_A_easy',
      summary: '두 값이 다르면 a₁=S₁ 과 aₙ (n≥2) 을 두 줄로 나눠 적는다',
      triggers: [
        '답을 어떻게 적어야 하나요',
        '식 하나로는 안 되나요',
        'n=1 만 다르면 어떻게 쓰나요',
      ],
    },
    'g3sst_step3_A_easy': {
      id: 'g3sst_step3_A_easy',
      kind: 'explain',
      title: '나란히 적어 봐요',
      body: '종이에 두 값을 나란히 적어요. 왼쪽에 "8n−5 에 n=1 → 3", 오른쪽에 "S₁ = 4−1+5 = 8". 두 숫자가 다르면 첫째항은 오른쪽 8 이에요. 이 비교가 정하는 건 첫째항 한 칸이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step3_exit',
    },
    'g3sst_step3_A_check': {
      id: 'g3sst_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'Sₙ=4n²−n+5 인 수열의 일반항을 바르게 적은 것은?',
      options: [
        { id: 'correct', text: 'a₁=8, aₙ=8n−5 (n≥2)', isCorrect: true, nextNodeId: 'g3sst_step3_exit' },
        { id: 'wrong1', text: 'aₙ=8n−5 (모든 자연수 n)', isCorrect: false, nextNodeId: 'g3sst_step3_A_remedy', weaknessId: 'g3_seq_sum_term' },
        { id: 'wrong2', text: 'a₁=3, aₙ=8n−5 (n≥2)', isCorrect: false, nextNodeId: 'g3sst_step3_A_remedy', weaknessId: 'g3_seq_sum_term' },
      ],
      dontKnowNextNodeId: 'g3sst_step3_A_easy',
    },
    'g3sst_step3_A_remedy': {
      id: 'g3sst_step3_A_remedy',
      kind: 'explain',
      title: 'a₁=8, aₙ=8n−5 (n≥2)',
      body: 'S₁=4−1+5=8 이라 a₁=8 이에요. 8n−5 는 n≥2 에서 맞는 식이고 n=1 에 넣으면 3 이라 첫째항 자리에 못 써요. 그래서 두 줄로 나눠 적어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step3_exit',
    },

    // ─────────── step3: 오답 C ("차이만큼 고쳐 합친다") 분기 ───────────
    'g3sst_step3_C_explain': {
      id: 'g3sst_step3_C_explain',
      kind: 'explain',
      title: 'n≥2 식은 건드리지 않아요',
      body: '어긋난 건 첫째항 한 칸뿐이에요. 두 값의 차이만큼 n≥2 식을 올리면 n=1 은 맞아지지만 n=2 부터 전부 그만큼 커져요. 8n−5 를 8n 으로 바꾸면 n=1 은 8 로 맞지만 a₃ 가 19 대신 24 가 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step3_A_easy',
      summary: '차이만큼 n≥2 식을 고치면 n=2 부터 전부 어긋난다 — 예외는 첫째항 한 칸만',
      triggers: [
        '한 식으로 합치면 안 되나요',
        '식을 고쳐서 맞추면 되지 않나요',
        '왜 두 줄로 쓰는지 모르겠어요',
      ],
    },
    'g3sst_step3_C_check': {
      id: 'g3sst_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a₁=8, aₙ=8n−5 (n≥2) 인 수열에서 a₃ 는 얼마예요?',
      options: [
        { id: 'correct', text: '19', isCorrect: true, nextNodeId: 'g3sst_step3_exit' },
        { id: 'wrong1', text: '24', isCorrect: false, nextNodeId: 'g3sst_step3_C_remedy', weaknessId: 'g3_seq_sum_term' },
        { id: 'wrong2', text: '8', isCorrect: false, nextNodeId: 'g3sst_step3_C_remedy', weaknessId: 'g3_seq_sum_term' },
      ],
      dontKnowNextNodeId: 'g3sst_step3_A_easy',
    },
    'g3sst_step3_C_remedy': {
      id: 'g3sst_step3_C_remedy',
      kind: 'explain',
      title: '8×3 − 5 = 19',
      body: 'a₃ 은 n≥2 자리라 8n−5 에 n=3 을 넣어요. 24−5=19 예요. 8n 으로 고쳐 쓴 식은 24 를 주는데 그건 첫째항을 맞추려고 뒤쪽까지 밀어 올린 값이에요. 8 은 첫째항이고요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3sst_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3sst_step3_exit',
    },

    'g3sst_step3_exit': { id: 'g3sst_step3_exit', kind: 'exit' },
  },
};
