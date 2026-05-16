import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3st_step<N>_<choice>_<role>
// 약점 prefix: g3st
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 이항분포 B(n,p), 정규분포 N(μ,σ²), 평균 μ, 분산 σ², 표준편차 σ,
// 표준화, 표준정규분포표, 여사건 같은 용어는 첫 등장 시 한 줄 정의 동봉.

export const g3_statistics_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 이항분포 B(n,p) 평균 μ=np, 분산 σ²=npq (q=1-p)
    //   B: "이항분포의 평균=np², 분산=npq²" (지수가 하나 더 붙음)
    //   C: "이항분포의 평균과 분산은 같다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "평균=np², 분산=npq²" ───────────
    'g3st_step1_B_explain': {
      id: 'g3st_step1_B_explain',
      kind: 'explain',
      title: '제곱은 붙지 않아요',
      body: '이항분포 B(n,p) 는 성공 확률이 p 인 시도를 n 번 했을 때의 분포예요. 평균(분포의 중심값) μ 는 그냥 n 과 p 를 곱한 np 이고, 분산(흩어진 정도) σ² 는 n 과 p 와 q (실패 확률 1−p) 를 모두 곱한 npq 예요. 어디에도 제곱이 붙지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step1_B_easy',
      summary: '이항분포 B(n,p) 의 평균 = np, 분산 = npq — 어느 자리에도 제곱이 붙지 않음',
      triggers: [
        '평균이 np² 인 줄 알았어요',
        '분산에 제곱이 붙어야 하는 거 아닌가요',
        'np 인지 np² 인지 헷갈려요',
      ],
    },
    'g3st_step1_B_easy': {
      id: 'g3st_step1_B_easy',
      kind: 'explain',
      title: '예시로 짚어요',
      body: 'B(100, 0.4) 라면 평균 μ = 100 × 0.4 = 40 이에요. 분산 σ² = 100 × 0.4 × 0.6 = 24 예요. 만약 np² = 100 × 0.16 = 16 으로 적으면 평균이 16 이 돼서 답이 완전히 달라져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step1_exit',
    },
    'g3st_step1_B_check': {
      id: 'g3st_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '이항분포 B(50, 0.2) 의 평균 μ 와 분산 σ² 는?',
      options: [
        { id: 'correct', text: 'μ = 10, σ² = 8',  isCorrect: true,  nextNodeId: 'g3st_step1_exit' },
        { id: 'wrong1',  text: 'μ = 2, σ² = 0.32', isCorrect: false, nextNodeId: 'g3st_step1_B_remedy', weaknessId: 'g3_statistics' },
        { id: 'wrong2',  text: 'μ = 10, σ² = 10',  isCorrect: false, nextNodeId: 'g3st_step1_B_remedy', weaknessId: 'g3_statistics' },
      ],
      dontKnowNextNodeId: 'g3st_step1_B_easy',
    },
    'g3st_step1_B_remedy': {
      id: 'g3st_step1_B_remedy',
      kind: 'explain',
      title: 'np 와 npq 를 따로 계산해요',
      body: '평균 μ = np = 50 × 0.2 = 10 이에요. 분산 σ² = npq = 50 × 0.2 × 0.8 = 8 이에요. 제곱을 붙여 np² = 50 × 0.04 = 2 처럼 적으면 분포의 위치 자체가 어긋나요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step1_exit',
    },

    // ─────────── step1.C: "평균과 분산이 같다" ───────────
    'g3st_step1_C_explain': {
      id: 'g3st_step1_C_explain',
      kind: 'explain',
      title: '평균과 분산은 보통 달라요',
      body: '평균 μ 는 np, 분산 σ² 는 npq 예요. q 는 1 에서 p 를 뺀 값이라 거의 항상 1 보다 작아요. 그래서 분산 npq 는 평균 np 보다 작아지고, 둘이 우연히 같아지는 건 q 가 1 일 때뿐이라 일반 문제에서는 다른 값으로 봐야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step1_B_easy',
      summary: '이항분포의 평균 np 와 분산 npq 는 다른 값 — q < 1 이라 분산이 더 작음',
      triggers: [
        '평균이랑 분산이 같은 거 아니에요',
        '둘이 같은 식인 줄 알았어요',
        '왜 분산이 더 작아요',
      ],
    },
    'g3st_step1_C_check': {
      id: 'g3st_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '이항분포 B(80, 0.5) 의 평균 μ 와 분산 σ² 는?',
      options: [
        { id: 'correct', text: 'μ = 40, σ² = 20',  isCorrect: true,  nextNodeId: 'g3st_step1_exit' },
        { id: 'wrong1',  text: 'μ = 40, σ² = 40',  isCorrect: false, nextNodeId: 'g3st_step1_C_remedy', weaknessId: 'g3_statistics' },
        { id: 'wrong2',  text: 'μ = 20, σ² = 20',  isCorrect: false, nextNodeId: 'g3st_step1_C_remedy', weaknessId: 'g3_statistics' },
      ],
      dontKnowNextNodeId: 'g3st_step1_B_easy',
    },
    'g3st_step1_C_remedy': {
      id: 'g3st_step1_C_remedy',
      kind: 'explain',
      title: 'np 와 npq 는 따로 구해요',
      body: '평균 μ = np = 80 × 0.5 = 40 이에요. 분산 σ² = npq = 80 × 0.5 × 0.5 = 20 이에요. p = 0.5 일 때 q 도 0.5 라서 분산이 평균의 절반이 돼요. 둘이 같지 않다는 게 분명히 보여요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step1_exit',
    },

    'g3st_step1_exit': { id: 'g3st_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 표준화 Z = (X − μ)/σ
    //   B: "Z = (X + μ)/σ" (부호 반대)
    //   C: "Z = X × σ − μ" (빼고 나누기가 아니라 곱하기·빼기)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "Z = (X + μ)/σ" ───────────
    'g3st_step2_B_explain': {
      id: 'g3st_step2_B_explain',
      kind: 'explain',
      title: '평균을 더하면 중심이 어긋나요',
      body: '표준화(평균이 0, 표준편차 σ 가 1 인 분포로 옮기기) 는 Z = (X − μ)/σ 예요. 평균 μ 를 빼서 분포의 중심을 0 으로 끌어오고, 표준편차 σ 로 나눠서 흩어짐을 1 로 맞춰요. 더하면 중심이 0 이 아니라 2μ 로 가서 표준정규분포가 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step2_B_easy',
      summary: '표준화는 Z = (X − μ)/σ — 평균을 빼야 분포의 중심이 0 으로 옮겨짐',
      triggers: [
        '더하는 건지 빼는 건지 헷갈려요',
        'X + μ 인 줄 알았어요',
        '왜 빼는 거예요',
      ],
    },
    'g3st_step2_B_easy': {
      id: 'g3st_step2_B_easy',
      kind: 'explain',
      title: '예시로 짚어요',
      body: 'X 가 평균 50, 표준편차 4 인 정규분포 N(50, 4²) 라고 해요. X = 54 일 때 Z = (54 − 50)/4 = 1 이에요. 만약 더해서 (54 + 50)/4 = 26 으로 적으면 Z 가 너무 커서 표를 봐도 의미가 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step2_exit',
    },
    'g3st_step2_B_check': {
      id: 'g3st_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'X ~ N(60, 5²) 일 때, X = 70 의 표준화 값 Z 는?',
      options: [
        { id: 'correct', text: 'Z = 2',   isCorrect: true,  nextNodeId: 'g3st_step2_exit' },
        { id: 'wrong1',  text: 'Z = 26',  isCorrect: false, nextNodeId: 'g3st_step2_B_remedy', weaknessId: 'g3_statistics' },
        { id: 'wrong2',  text: 'Z = −2',  isCorrect: false, nextNodeId: 'g3st_step2_B_remedy', weaknessId: 'g3_statistics' },
      ],
      dontKnowNextNodeId: 'g3st_step2_B_easy',
    },
    'g3st_step2_B_remedy': {
      id: 'g3st_step2_B_remedy',
      kind: 'explain',
      title: '70 − 60 = 10, 10 / 5 = 2',
      body: 'Z = (X − μ)/σ 에 X = 70, μ = 60, σ = 5 를 넣어요. 70 − 60 = 10, 10 / 5 = 2 라서 Z = 2 예요. 더해서 (70 + 60)/5 = 26 으로 적으면 표 범위 밖의 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step2_exit',
    },

    // ─────────── step2.C: "Z = X × σ − μ" ───────────
    'g3st_step2_C_explain': {
      id: 'g3st_step2_C_explain',
      kind: 'explain',
      title: '곱하기가 아니라 나누기예요',
      body: '표준화의 두 단계는 빼기와 나누기예요. 먼저 X 에서 평균 μ 를 빼서 0 을 기준으로 옮기고, 그 값을 표준편차 σ 로 나눠서 흩어짐을 1 로 만들어요. σ 를 곱하면 흩어짐이 더 커져서 표준정규분포가 되지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step2_B_easy',
      summary: '표준화의 두 단계는 빼기와 나누기 — σ 로 나눠야 흩어짐이 1 로 줄어듦',
      triggers: [
        '곱하는 거 아니었어요',
        '왜 나누기로 가요',
        'σ 를 곱하면 안 되나요',
      ],
    },
    'g3st_step2_C_check': {
      id: 'g3st_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'X ~ N(20, 3²) 일 때, X = 26 의 표준화 값 Z 는?',
      options: [
        { id: 'correct', text: 'Z = 2',     isCorrect: true,  nextNodeId: 'g3st_step2_exit' },
        { id: 'wrong1',  text: 'Z = 58',    isCorrect: false, nextNodeId: 'g3st_step2_C_remedy', weaknessId: 'g3_statistics' },
        { id: 'wrong2',  text: 'Z = 6',     isCorrect: false, nextNodeId: 'g3st_step2_C_remedy', weaknessId: 'g3_statistics' },
      ],
      dontKnowNextNodeId: 'g3st_step2_B_easy',
    },
    'g3st_step2_C_remedy': {
      id: 'g3st_step2_C_remedy',
      kind: 'explain',
      title: '26 − 20 = 6, 6 / 3 = 2',
      body: 'Z = (X − μ)/σ 에 X = 26, μ = 20, σ = 3 을 넣어요. 26 − 20 = 6, 그다음 6 / 3 = 2 라서 Z = 2 예요. 만약 X × σ − μ = 26 × 3 − 20 = 58 로 계산하면 값이 너무 커져서 표가 의미를 잃어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step2_exit',
    },

    'g3st_step2_exit': { id: 'g3st_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 표준정규분포표 읽기
    //   교과서 표는 P(0 ≤ Z ≤ z) 만 직접 줌. 0.5 와 더하거나 빼서 다른 확률을 구함.
    //   B: "표는 P(Z ≤ z) 전체를 직접 준다"
    //   C: "표 값을 2배 하면 P(Z ≥ z) 가 된다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "표는 P(Z ≤ z) 전체를 직접 준다" ───────────
    'g3st_step3_B_explain': {
      id: 'g3st_step3_B_explain',
      kind: 'explain',
      title: '표는 0 부터의 면적만 줘요',
      body: '표준정규분포표(Z 가 0 에서 z 사이일 확률을 정리해 둔 표) 는 P(0 ≤ Z ≤ z) 만 보여줘요. Z 가 z 이하인 전체 확률 P(Z ≤ z) 를 알려면 왼쪽 절반인 0.5 를 더해야 해요. 표 값을 그대로 P(Z ≤ z) 로 쓰면 절반이 빠진 답이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step3_B_easy',
      summary: '표 값은 P(0 ≤ Z ≤ z) — P(Z ≤ z) 를 구하려면 0.5 를 더해야 함',
      triggers: [
        '표 값 그대로 쓰면 되는 거 아니에요',
        '왜 0.5 를 더해요',
        '표가 무슨 확률을 주는 거예요',
      ],
    },
    'g3st_step3_B_easy': {
      id: 'g3st_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'P(0 ≤ Z ≤ 1.5) = 0.4332 라고 표에서 읽었다고 해요. 이때 P(Z ≤ 1.5) 는 표 값 0.4332 에 왼쪽 절반 0.5 를 더한 0.9332 예요. 0.4332 자체는 0 부터 1.5 까지의 면적만이라 절반밖에 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step3_exit',
    },
    'g3st_step3_B_check': {
      id: 'g3st_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(0 ≤ Z ≤ 1) = 0.3413 일 때, P(Z ≤ 1) 의 값은?',
      options: [
        { id: 'correct', text: '0.8413', isCorrect: true,  nextNodeId: 'g3st_step3_exit' },
        { id: 'wrong1',  text: '0.3413', isCorrect: false, nextNodeId: 'g3st_step3_B_remedy', weaknessId: 'g3_statistics' },
        { id: 'wrong2',  text: '0.6826', isCorrect: false, nextNodeId: 'g3st_step3_B_remedy', weaknessId: 'g3_statistics' },
      ],
      dontKnowNextNodeId: 'g3st_step3_B_easy',
    },
    'g3st_step3_B_remedy': {
      id: 'g3st_step3_B_remedy',
      kind: 'explain',
      title: '0.5 + 0.3413 = 0.8413',
      body: 'P(Z ≤ 1) 은 왼쪽 절반 0.5 와 0 부터 1 까지의 면적 0.3413 을 합친 값이에요. 0.5 + 0.3413 = 0.8413 이에요. 표 값 0.3413 만 쓰면 왼쪽 절반이 빠진 답이라 항상 작게 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step3_exit',
    },

    // ─────────── step3.C: "표 값을 2배 하면 P(Z ≥ z) 가 된다" ───────────
    'g3st_step3_C_explain': {
      id: 'g3st_step3_C_explain',
      kind: 'explain',
      title: '2배가 아니라 0.5 에서 빼는 거예요',
      body: 'P(Z ≥ z) 는 Z 가 z 보다 큰 오른쪽 꼬리 부분이에요. 오른쪽 절반 0.5 에서 표 값 P(0 ≤ Z ≤ z) 를 빼면 그 꼬리의 넓이가 나와요. 표 값을 2배 하면 0 을 기준으로 양쪽으로 대칭인 P(−z ≤ Z ≤ z) 가 나와서 다른 확률이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step3_B_easy',
      summary: 'P(Z ≥ z) = 0.5 − 표 값 — 2배 하면 양쪽 대칭 구간의 확률이 됨',
      triggers: [
        '2배 하면 되는 거 아니에요',
        'P(Z ≥ z) 를 어떻게 구해요',
        '0.5 에서 왜 빼요',
      ],
    },
    'g3st_step3_C_check': {
      id: 'g3st_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(0 ≤ Z ≤ 1.5) = 0.4332 일 때, P(Z ≥ 1.5) 의 값은?',
      options: [
        { id: 'correct', text: '0.0668', isCorrect: true,  nextNodeId: 'g3st_step3_exit' },
        { id: 'wrong1',  text: '0.8664', isCorrect: false, nextNodeId: 'g3st_step3_C_remedy', weaknessId: 'g3_statistics' },
        { id: 'wrong2',  text: '0.5668', isCorrect: false, nextNodeId: 'g3st_step3_C_remedy', weaknessId: 'g3_statistics' },
      ],
      dontKnowNextNodeId: 'g3st_step3_B_easy',
    },
    'g3st_step3_C_remedy': {
      id: 'g3st_step3_C_remedy',
      kind: 'explain',
      title: '0.5 − 0.4332 = 0.0668',
      body: 'P(Z ≥ 1.5) 는 오른쪽 절반 0.5 에서 0 부터 1.5 까지의 면적 0.4332 를 뺀 값이에요. 0.5 − 0.4332 = 0.0668 이에요. 2배 한 0.8664 는 −1.5 부터 1.5 까지의 가운데 구간을 뜻해서 꼬리 확률과 의미가 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3st_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3st_step3_exit',
    },

    'g3st_step3_exit': { id: 'g3st_step3_exit', kind: 'exit' },
  },
};
