import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3i_step<N>_<choice>_<role>
// 약점 prefix: g3i
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 부정적분, 정적분, 적분상수 C, F(x), 넓이, 둘러싸인 부분 등 첫 등장 시 한 줄 정의 동봉.

export const g3_integral_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 부정적분 기본 공식 (∫xⁿdx)
    //   A: "지수에서 1을 빼고 지수를 곱한다" (미분과 헷갈림)
    //   C: "지수를 그대로 두고 계수만 1 올린다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.A: "지수에서 1을 빼고 지수를 곱한다" ───────────
    'g3i_step1_A_explain': {
      id: 'g3i_step1_A_explain',
      kind: 'explain',
      title: '적분은 미분의 반대 방향이에요',
      body: '부정적분(미분의 반대 계산)은 지수를 1 늘리고, 새로 올린 지수로 나눠요. 지수를 빼고 곱하는 건 미분 쪽 방향이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step1_A_easy',
      summary: '∫xⁿdx 는 지수를 1 늘리고 그 수로 나누는 계산 — 미분과 방향이 정반대',
      triggers: [
        '미분이랑 적분이 헷갈려요',
        '지수를 빼는 거 아니었나요',
        '어느 쪽이 적분인지 모르겠어요',
      ],
    },
    'g3i_step1_A_easy': {
      id: 'g3i_step1_A_easy',
      kind: 'explain',
      title: '한 줄로 다시 봐요',
      body: 'x³ 을 적분하면 지수 3을 4로 올리고, 새로 올린 4로 나눠 x⁴/4 가 돼요. 거기에 적분상수 C(임의의 상수)를 더해요. 결과는 x⁴/4 + C 예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step1_exit',
    },
    'g3i_step1_A_check': {
      id: 'g3i_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '∫x²dx 의 결과는?',
      options: [
        { id: 'correct', text: 'x³/3 + C', isCorrect: true, nextNodeId: 'g3i_step1_exit' },
        { id: 'wrong1',  text: '2x + C',   isCorrect: false, nextNodeId: 'g3i_step1_A_remedy', weaknessId: 'g3_integral' },
        { id: 'wrong2',  text: 'x²/2 + C', isCorrect: false, nextNodeId: 'g3i_step1_A_remedy', weaknessId: 'g3_integral' },
      ],
      dontKnowNextNodeId: 'g3i_step1_A_easy',
    },
    'g3i_step1_A_remedy': {
      id: 'g3i_step1_A_remedy',
      kind: 'explain',
      title: '지수를 1 올리고 그 수로 나눠요',
      body: '∫x²dx 는 지수 2를 3으로 올리고 3으로 나눠요. 그래서 x³/3 + C 예요. 미분처럼 지수를 빼면 방향이 거꾸로예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step1_exit',
    },

    // ─────────── step1.C: "지수를 그대로 두고 계수만 1 올린다" ───────────
    'g3i_step1_C_explain': {
      id: 'g3i_step1_C_explain',
      kind: 'explain',
      title: '지수 자체가 움직여야 해요',
      body: '부정적분에서는 지수(x 오른쪽 위의 작은 수)가 1 늘어야 해요. 계수(x 앞에 붙어 곱해지는 수)만 바꾸면 지수가 그대로라 적분이 아니에요. 지수가 움직이는 게 적분의 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step1_A_easy',
      summary: '적분은 지수가 1 늘어나는 게 핵심 — 지수가 그대로면 적분이 아님',
      triggers: [
        '지수는 그대로 둬도 되지 않나요',
        '계수만 바꾸면 안 돼요',
        '왜 지수가 움직여야 해요',
      ],
    },
    'g3i_step1_C_check': {
      id: 'g3i_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '∫x⁴dx 의 결과는?',
      options: [
        { id: 'correct', text: 'x⁵/5 + C', isCorrect: true, nextNodeId: 'g3i_step1_exit' },
        { id: 'wrong1',  text: '2x⁴ + C',  isCorrect: false, nextNodeId: 'g3i_step1_C_remedy', weaknessId: 'g3_integral' },
        { id: 'wrong2',  text: 'x⁴ + C',   isCorrect: false, nextNodeId: 'g3i_step1_C_remedy', weaknessId: 'g3_integral' },
      ],
      dontKnowNextNodeId: 'g3i_step1_A_easy',
    },
    'g3i_step1_C_remedy': {
      id: 'g3i_step1_C_remedy',
      kind: 'explain',
      title: '지수 4 → 5 로 올리고 5 로 나눠요',
      body: '∫x⁴dx 는 지수를 4에서 5로 올린 뒤 5로 나눠요. 그래서 x⁵/5 + C 예요. 지수가 1 늘어나는 부분이 빠지면 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step1_exit',
    },

    'g3i_step1_exit': { id: 'g3i_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 정적분 계산 (F(b) - F(a))
    //   A: "F(a) - F(b)" (순서가 반대)
    //   C: "F(a) + F(b)" (차이가 아닌 합)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.A: "F(a) − F(b) 순서로 계산한다" ───────────
    'g3i_step2_A_explain': {
      id: 'g3i_step2_A_explain',
      kind: 'explain',
      title: '위 끝에서 아래 끝을 빼요',
      body: '정적분은 부정적분 결과 F(x) 에 위 끝 b 와 아래 끝 a 를 차례로 넣어 빼는 계산이에요. 기호로는 [F(x)]ₐᵇ (대괄호 안에 F(x), 위에 b, 아래 a 를 적는 약속) = F(b) − F(a) 예요. 위 끝부터 먼저 넣고 아래 끝을 빼는 순서가 정해진 방향이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step2_A_easy',
      summary: '정적분은 F(b) − F(a) — 위 끝 값에서 아래 끝 값을 빼는 정해진 방향',
      triggers: [
        '어느 쪽을 먼저 빼는지 헷갈려요',
        '순서가 왜 정해져 있어요',
        '부호가 자꾸 뒤집혀요',
      ],
    },
    'g3i_step2_A_easy': {
      id: 'g3i_step2_A_easy',
      kind: 'explain',
      title: '예시 한 번 더',
      body: '∫₁³ x dx 의 경우 F(x) = x²/2 예요. 위 끝 3을 먼저 넣어 9/2, 아래 끝 1을 넣어 1/2 를 빼면 9/2 − 1/2 = 4 예요. 순서를 바꾸면 −4 가 나와 부호가 통째로 뒤집혀요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step2_exit',
    },
    'g3i_step2_A_check': {
      id: 'g3i_step2_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '∫₀² x dx 의 값은?',
      options: [
        { id: 'correct', text: '2',  isCorrect: true, nextNodeId: 'g3i_step2_exit' },
        { id: 'wrong1',  text: '-2', isCorrect: false, nextNodeId: 'g3i_step2_A_remedy', weaknessId: 'g3_integral' },
        { id: 'wrong2',  text: '4',  isCorrect: false, nextNodeId: 'g3i_step2_A_remedy', weaknessId: 'g3_integral' },
      ],
      dontKnowNextNodeId: 'g3i_step2_A_easy',
    },
    'g3i_step2_A_remedy': {
      id: 'g3i_step2_A_remedy',
      kind: 'explain',
      title: 'F(2) − F(0) = 2 − 0',
      body: 'F(x) = x²/2 에서 위 끝 2를 넣으면 2, 아래 끝 0을 넣으면 0 이에요. F(2) − F(0) = 2 − 0 = 2 예요. 반대로 빼면 부호가 뒤집혀요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step2_exit',
    },

    // ─────────── step2.C: "F(a) + F(b) 를 계산한다" ───────────
    'g3i_step2_C_explain': {
      id: 'g3i_step2_C_explain',
      kind: 'explain',
      title: '더하는 게 아니라 빼는 거예요',
      body: '정적분은 두 값의 차이로 정해져 있어요. F(b) + F(a) 처럼 더하면 두 끝 값이 같이 쌓여 다른 양이 나와요. 위 끝 값에서 아래 끝 값을 빼야 그 구간만의 양이 남아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step2_A_easy',
      summary: '정적분은 차이(빼기) 로만 정의됨 — 더하면 의미가 달라짐',
      triggers: [
        '왜 더하면 안 되는지',
        '두 값을 합치면 안 돼요',
        '차이라는 게 무슨 뜻이에요',
      ],
    },
    'g3i_step2_C_check': {
      id: 'g3i_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '∫₁² x² dx 의 값은? 힌트: F(x) = x³/3 이라서 F(2) − F(1) = 8/3 − 1/3 을 계산하면 돼요.',
      options: [
        { id: 'correct', text: '7/3', isCorrect: true, nextNodeId: 'g3i_step2_exit' },
        { id: 'wrong1',  text: '9/3', isCorrect: false, nextNodeId: 'g3i_step2_C_remedy', weaknessId: 'g3_integral' },
        { id: 'wrong2',  text: '8/3', isCorrect: false, nextNodeId: 'g3i_step2_C_remedy', weaknessId: 'g3_integral' },
      ],
      dontKnowNextNodeId: 'g3i_step2_A_easy',
    },
    'g3i_step2_C_remedy': {
      id: 'g3i_step2_C_remedy',
      kind: 'explain',
      title: '8/3 − 1/3 = 7/3',
      body: 'F(2) = 8/3, F(1) = 1/3 이에요. F(2) − F(1) = 8/3 − 1/3 = 7/3 예요. 더하면 9/3 이 나와서 다른 양이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step2_exit',
    },

    'g3i_step2_exit': { id: 'g3i_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 넓이와 부호 처리
    //   A: "부호 상관없이 적분 결과를 그대로 쓴다"
    //   C: "넓이는 항상 정적분과 같다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.A: "부호 상관없이 적분 결과를 그대로 쓴다" ───────────
    'g3i_step3_A_explain': {
      id: 'g3i_step3_A_explain',
      kind: 'explain',
      title: 'x 축 아래 구간은 음수가 나와요',
      body: '곡선과 x 축으로 둘러싸인 부분의 넓이는 항상 양수여야 해요. 그런데 f(x) 가 음수인 구간(x 축 아래로 내려간 부분)에서는 정적분 값이 음수로 나와요. 그래서 그 구간만 절댓값을 씌워 양수로 바꿔야 진짜 넓이가 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step3_A_easy',
      summary: 'x 축 아래 구간은 정적분이 음수 → 넓이로 쓰려면 절댓값 처리 필수',
      triggers: [
        '넓이가 음수가 나왔어요',
        '부호를 왜 신경 써요',
        '그냥 적분 값 쓰면 안 돼요',
      ],
    },
    'g3i_step3_A_easy': {
      id: 'g3i_step3_A_easy',
      kind: 'explain',
      title: '예시로 보기',
      body: 'f(x) = x² − 1 은 x 가 −1 과 1 사이일 때 x 축 아래로 내려가요. ∫₋₁¹(x² − 1)dx = −4/3 이 나오지만, 실제 둘러싸인 부분의 넓이는 그 절댓값 4/3 이에요. 부호를 그냥 두면 음수가 답이 돼서 넓이가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step3_exit',
    },
    'g3i_step3_A_check': {
      id: 'g3i_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '∫₀¹(x − 1)dx = −1/2 일 때, 곡선과 x 축으로 둘러싸인 부분의 넓이는?',
      options: [
        { id: 'correct', text: '1/2',  isCorrect: true, nextNodeId: 'g3i_step3_exit' },
        { id: 'wrong1',  text: '-1/2', isCorrect: false, nextNodeId: 'g3i_step3_A_remedy', weaknessId: 'g3_integral' },
        { id: 'wrong2',  text: '0',    isCorrect: false, nextNodeId: 'g3i_step3_A_remedy', weaknessId: 'g3_integral' },
      ],
      dontKnowNextNodeId: 'g3i_step3_A_easy',
    },
    'g3i_step3_A_remedy': {
      id: 'g3i_step3_A_remedy',
      kind: 'explain',
      title: '절댓값을 씌워 1/2',
      body: '적분 값이 −1/2 라는 건 그 구간이 x 축 아래에 있다는 신호예요. 넓이로 쓰려면 절댓값 |−1/2| = 1/2 로 바꿔요. 넓이는 음수가 될 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step3_exit',
    },

    // ─────────── step3.C: "넓이는 항상 정적분과 같다" ───────────
    'g3i_step3_C_explain': {
      id: 'g3i_step3_C_explain',
      kind: 'explain',
      title: '둘이 같지 않을 수 있어요',
      body: '정적분은 부호가 있는 양이라 x 축 위는 +, 아래는 − 로 합쳐져요. 예) 위쪽 +1, 아래쪽 −1 이면 정적분은 0 이지만 실제 넓이는 1 + 1 = 2 예요. 그래서 위·아래가 섞이면 절댓값으로 따로 더해야 진짜 넓이가 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step3_A_easy',
      summary: '위·아래가 섞인 구간에서는 정적분 ≠ 넓이 — 절댓값으로 보정 필요',
      triggers: [
        '둘이 같은 거 아니에요',
        '왜 절댓값을 또 씌워요',
        '정적분이 넓이라고 들었어요',
      ],
    },
    'g3i_step3_C_check': {
      id: 'g3i_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '한 구간에서 ∫f(x)dx = 0 이 나왔어요. 이때 곡선과 x 축으로 둘러싸인 부분의 넓이는 어떻게 봐야 할까요?',
      options: [
        { id: 'correct', text: '위·아래가 상쇄됐을 수 있어 넓이는 따로 절댓값으로 구해야 해요', isCorrect: true, nextNodeId: 'g3i_step3_exit' },
        { id: 'wrong1',  text: '정적분이 0 이니까 넓이도 0 이에요',                              isCorrect: false, nextNodeId: 'g3i_step3_C_remedy', weaknessId: 'g3_integral' },
        { id: 'wrong2',  text: '정적분이 항상 넓이와 같아요',                                      isCorrect: false, nextNodeId: 'g3i_step3_C_remedy', weaknessId: 'g3_integral' },
      ],
      dontKnowNextNodeId: 'g3i_step3_A_easy',
    },
    'g3i_step3_C_remedy': {
      id: 'g3i_step3_C_remedy',
      kind: 'explain',
      title: '0 이어도 넓이는 있을 수 있어요',
      body: '정적분이 0 이라는 건 위쪽 부분과 아래쪽 부분이 같은 크기로 상쇄됐다는 뜻이에요. 실제 넓이는 두 부분을 따로 양수로 더해야 나와요. 그래서 정적분이 0 이어도 넓이는 0 이 아닐 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3i_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3i_step3_exit',
    },

    'g3i_step3_exit': { id: 'g3i_step3_exit', kind: 'exit' },
  },
};
