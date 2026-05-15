import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3c_step<N>_<choice>_<role>
// 약점 prefix: g3c
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 표준형, 초점, 준선, 점근선, 주축, 장축, 단축 등 단원 안 세부 용어 첫 등장 시 한 줄 정의 동봉.

export const g3_conic_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 이차곡선 표준형 구분 (포물선 / 타원 / 쌍곡선)
    //   B: "타원과 쌍곡선 모두 두 분수의 합"
    //   C: "부호와 관계없이 계수 크기로 구분한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "타원과 쌍곡선 모두 두 분수의 합" ───────────
    'g3c_step1_B_explain': {
      id: 'g3c_step1_B_explain',
      kind: 'explain',
      title: '부호 하나로 갈려요',
      body: '표준형(가장 깔끔하게 정리한 식 모양)에서 두 분수 사이가 + 면 타원, − 면 쌍곡선이에요. 식이 x²/a² + y²/b² = 1 이면 타원, x²/a² − y²/b² = 1 이면 쌍곡선이에요. 가운데 부호 한 글자가 곡선 종류를 결정해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step1_B_easy',
      summary: '표준형에서 두 분수 사이 부호가 + 면 타원, − 면 쌍곡선 — 부호 한 글자가 곡선을 결정',
      triggers: [
        '타원이랑 쌍곡선이 헷갈려요',
        '둘 다 더하는 거 아니었나요',
        '어디를 보고 구분해요',
      ],
    },
    'g3c_step1_B_easy': {
      id: 'g3c_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'x²/9 + y²/4 = 1 은 가운데가 + 라 타원이에요. x²/9 − y²/4 = 1 은 가운데가 − 라 쌍곡선이에요. 부호 한 글자만 다른 두 식이 완전히 다른 곡선이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step1_exit',
    },
    'g3c_step1_B_check': {
      id: 'g3c_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x²/16 − y²/9 = 1 은 어떤 곡선일까요?',
      options: [
        { id: 'correct', text: '쌍곡선', isCorrect: true, nextNodeId: 'g3c_step1_exit' },
        { id: 'wrong1',  text: '타원',   isCorrect: false, nextNodeId: 'g3c_step1_B_remedy', weaknessId: 'g3_conic' },
        { id: 'wrong2',  text: '포물선', isCorrect: false, nextNodeId: 'g3c_step1_B_remedy', weaknessId: 'g3_conic' },
      ],
      dontKnowNextNodeId: 'g3c_step1_B_easy',
    },
    'g3c_step1_B_remedy': {
      id: 'g3c_step1_B_remedy',
      kind: 'explain',
      title: '가운데 − 가 보이면 쌍곡선',
      body: 'x²/16 − y²/9 = 1 의 가운데 부호가 − 라서 쌍곡선이에요. + 였다면 타원이었을 거예요. 부호 한 글자만 떠올리면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step1_exit',
    },

    // ─────────── step1.C: "부호와 관계없이 계수 크기로 구분한다" ───────────
    'g3c_step1_C_explain': {
      id: 'g3c_step1_C_explain',
      kind: 'explain',
      title: '계수 크기가 아니라 부호가 핵심이에요',
      body: '계수(x² · y² 앞에 곱해진 수)가 크든 작든 곡선 종류는 안 바뀌어요. 정해주는 건 두 항 사이의 + 와 − 부호예요. 같은 부호면 타원, 다른 부호면 쌍곡선이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step1_B_easy',
      summary: '곡선 종류는 계수 크기가 아니라 두 항의 부호로 결정 — 같은 부호 = 타원, 다른 부호 = 쌍곡선',
      triggers: [
        '계수가 크면 다른 곡선이 되나요',
        '숫자 크기로 보면 되는 줄 알았어요',
        '왜 부호가 더 중요해요',
      ],
    },
    'g3c_step1_C_check': {
      id: 'g3c_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x²/100 + y²/4 = 1 은 어떤 곡선일까요?',
      options: [
        { id: 'correct', text: '타원',   isCorrect: true, nextNodeId: 'g3c_step1_exit' },
        { id: 'wrong1',  text: '쌍곡선', isCorrect: false, nextNodeId: 'g3c_step1_C_remedy', weaknessId: 'g3_conic' },
        { id: 'wrong2',  text: '포물선', isCorrect: false, nextNodeId: 'g3c_step1_C_remedy', weaknessId: 'g3_conic' },
      ],
      dontKnowNextNodeId: 'g3c_step1_B_easy',
    },
    'g3c_step1_C_remedy': {
      id: 'g3c_step1_C_remedy',
      kind: 'explain',
      title: '100 과 4 의 차이는 모양만 바꿔요',
      body: 'x²/100 + y²/4 = 1 은 가운데가 + 라 타원이에요. 100 과 4 의 크기 차이는 타원이 가로로 길쭉해지는 모양만 만들어요. 종류 자체는 부호 + 가 정해줘요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step1_exit',
    },

    'g3c_step1_exit': { id: 'g3c_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 초점 좌표 (타원 c² = a² − b², 쌍곡선 c² = a² + b²)
    //   B: "타원: c²=a²+b², 쌍곡선: c²=a²-b²" (두 공식이 바뀜)
    //   C: "두 곡선 모두 c²=a²+b²"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "타원: c²=a²+b², 쌍곡선: c²=a²-b²" ───────────
    'g3c_step2_B_explain': {
      id: 'g3c_step2_B_explain',
      kind: 'explain',
      title: '두 공식의 방향이 정반대예요',
      body: '초점(곡선의 모양을 정해주는 안쪽 점 두 개)을 구할 때, 타원은 c² = a² − b² 로 빼고, 쌍곡선은 c² = a² + b² 로 더해요. 타원은 + 부호 곡선인데 c 공식은 − 로 빼고, 쌍곡선은 − 부호 곡선인데 c 공식은 + 로 더해요. 표준형 부호와 c 공식 부호가 서로 반대예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step2_B_easy',
      summary: '타원 c² = a² − b² (빼기), 쌍곡선 c² = a² + b² (더하기) — 표준형 부호와 c 공식 부호는 반대',
      triggers: [
        '타원이 더하기였나요 빼기였나요',
        '두 공식이 자꾸 바뀌어요',
        '어느 쪽이 c² = a² + b² 인지',
      ],
    },
    'g3c_step2_B_easy': {
      id: 'g3c_step2_B_easy',
      kind: 'explain',
      title: '예시로 외워요',
      body: '타원 x²/25 + y²/16 = 1 이면 c² = 25 − 16 = 9 라서 c = 3, 초점은 (±3, 0) 이에요. 쌍곡선 x²/9 − y²/16 = 1 이면 c² = 9 + 16 = 25 라서 c = 5, 초점은 (±5, 0) 이에요. 타원은 빼고 쌍곡선은 더한다고 짝지어 기억하면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step2_exit',
    },
    'g3c_step2_B_check': {
      id: 'g3c_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '타원 x²/25 + y²/9 = 1 의 초점 좌표는?',
      options: [
        { id: 'correct', text: '(±4, 0)',   isCorrect: true, nextNodeId: 'g3c_step2_exit' },
        { id: 'wrong1',  text: '(±√34, 0)', isCorrect: false, nextNodeId: 'g3c_step2_B_remedy', weaknessId: 'g3_conic' },
        { id: 'wrong2',  text: '(±5, 0)',   isCorrect: false, nextNodeId: 'g3c_step2_B_remedy', weaknessId: 'g3_conic' },
      ],
      dontKnowNextNodeId: 'g3c_step2_B_easy',
    },
    'g3c_step2_B_remedy': {
      id: 'g3c_step2_B_remedy',
      kind: 'explain',
      title: '25 − 9 = 16 → c = 4',
      body: '타원이라 c² = a² − b² 를 써요. a² = 25, b² = 9 이므로 c² = 25 − 9 = 16, c = 4 예요. 초점은 (±4, 0) 이에요. 더하면 쌍곡선 공식이 돼서 다른 곡선의 답이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step2_exit',
    },

    // ─────────── step2.C: "두 곡선 모두 c²=a²+b²" ───────────
    'g3c_step2_C_explain': {
      id: 'g3c_step2_C_explain',
      kind: 'explain',
      title: '타원에서는 빼야 해요',
      body: '두 공식이 같다고 외우면 타원에서 답이 어긋나요. 타원은 큰 분모인 a² 에서 작은 b² 를 빼서 c² 를 얻어요. 쌍곡선만 두 값을 더해요. 곡선 종류에 따라 부호가 정반대라는 게 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step2_B_easy',
      summary: '두 곡선의 c 공식은 같지 않음 — 타원은 빼고, 쌍곡선만 더함',
      triggers: [
        '둘 다 더하는 거 아닌가요',
        '왜 곡선마다 다르게 외워요',
        '공식이 하나라고 들었어요',
      ],
    },
    'g3c_step2_C_check': {
      id: 'g3c_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '쌍곡선 x²/9 − y²/16 = 1 의 초점 좌표는?',
      options: [
        { id: 'correct', text: '(±5, 0)',   isCorrect: true, nextNodeId: 'g3c_step2_exit' },
        { id: 'wrong1',  text: '(±√7, 0)',  isCorrect: false, nextNodeId: 'g3c_step2_C_remedy', weaknessId: 'g3_conic' },
        { id: 'wrong2',  text: '(±3, 0)',   isCorrect: false, nextNodeId: 'g3c_step2_C_remedy', weaknessId: 'g3_conic' },
      ],
      dontKnowNextNodeId: 'g3c_step2_B_easy',
    },
    'g3c_step2_C_remedy': {
      id: 'g3c_step2_C_remedy',
      kind: 'explain',
      title: '9 + 16 = 25 → c = 5',
      body: '쌍곡선이라 c² = a² + b² 를 써요. a² = 9, b² = 16 이므로 c² = 9 + 16 = 25, c = 5 예요. 초점은 (±5, 0) 이에요. 타원처럼 빼면 음수가 나와서 답이 안 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step2_exit',
    },

    'g3c_step2_exit': { id: 'g3c_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 쌍곡선 점근선 y = ±(b/a)x
    //   B: "y = ±(a/b)x" (분자·분모 뒤바뀜)
    //   C: "y = ±(a+b)x" (비가 아닌 합)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "y = ±(a/b)x" ───────────
    'g3c_step3_B_explain': {
      id: 'g3c_step3_B_explain',
      kind: 'explain',
      title: '분자가 b, 분모가 a 예요',
      body: '점근선(쌍곡선이 멀리 갈수록 한없이 가까워지는 두 직선)의 기울기는 b/a 예요. 표준형 x²/a² − y²/b² = 1 에서 x 아래 a 가 분모, y 아래 b 가 분자로 가요. 분자·분모를 뒤집으면 기울기가 완전히 다른 직선이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step3_B_easy',
      summary: '쌍곡선 점근선 기울기 = b/a — x 아래 a 가 분모, y 아래 b 가 분자',
      triggers: [
        '분자 분모 어느 쪽이었나요',
        'a/b 인지 b/a 인지 헷갈려요',
        '뒤집으면 답이 달라져요',
      ],
    },
    'g3c_step3_B_easy': {
      id: 'g3c_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'x²/4 − y²/9 = 1 이면 a² = 4 라서 a = 2, b² = 9 라서 b = 3 이에요. 점근선은 y = ±(b/a)x = ±(3/2)x 예요. a/b 로 뒤집으면 ±(2/3)x 가 나와서 기울기가 다른 직선이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step3_exit',
    },
    'g3c_step3_B_check': {
      id: 'g3c_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '쌍곡선 x²/9 − y²/16 = 1 의 점근선의 방정식은?',
      options: [
        { id: 'correct', text: 'y = ±(4/3)x', isCorrect: true, nextNodeId: 'g3c_step3_exit' },
        { id: 'wrong1',  text: 'y = ±(3/4)x', isCorrect: false, nextNodeId: 'g3c_step3_B_remedy', weaknessId: 'g3_conic' },
        { id: 'wrong2',  text: 'y = ±(16/9)x', isCorrect: false, nextNodeId: 'g3c_step3_B_remedy', weaknessId: 'g3_conic' },
      ],
      dontKnowNextNodeId: 'g3c_step3_B_easy',
    },
    'g3c_step3_B_remedy': {
      id: 'g3c_step3_B_remedy',
      kind: 'explain',
      title: 'b = 4, a = 3 → b/a = 4/3',
      body: 'a² = 9 라서 a = 3, b² = 16 이라 b = 4 예요. 기울기는 b/a = 4/3 이라 점근선은 y = ±(4/3)x 예요. 분자·분모를 그대로 가져온 a² /b² (16/9) 는 제곱한 채라 기울기가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step3_exit',
    },

    // ─────────── step3.C: "y = ±(a+b)x" ───────────
    'g3c_step3_C_explain': {
      id: 'g3c_step3_C_explain',
      kind: 'explain',
      title: '더하기가 아니라 나누기예요',
      body: '점근선 기울기는 두 수의 합이 아니라 비(나누기로 얻은 값)예요. a 와 b 가 따로따로 분모·분자로 들어가야 표준형에 맞는 기울기가 돼요. 더하면 두 수가 한 덩어리가 돼서 본래의 비를 알 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step3_B_easy',
      summary: '점근선 기울기는 a 와 b 의 비 (b/a) — 합이 아님',
      triggers: [
        '왜 더하면 안 되나요',
        'a + b 가 기울기라고 들었어요',
        '비라는 게 무슨 뜻이에요',
      ],
    },
    'g3c_step3_C_check': {
      id: 'g3c_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '쌍곡선 x²/4 − y²/9 = 1 의 점근선의 방정식은?',
      options: [
        { id: 'correct', text: 'y = ±(3/2)x', isCorrect: true, nextNodeId: 'g3c_step3_exit' },
        { id: 'wrong1',  text: 'y = ±5x',     isCorrect: false, nextNodeId: 'g3c_step3_C_remedy', weaknessId: 'g3_conic' },
        { id: 'wrong2',  text: 'y = ±(2/3)x', isCorrect: false, nextNodeId: 'g3c_step3_C_remedy', weaknessId: 'g3_conic' },
      ],
      dontKnowNextNodeId: 'g3c_step3_B_easy',
    },
    'g3c_step3_C_remedy': {
      id: 'g3c_step3_C_remedy',
      kind: 'explain',
      title: 'a + b = 5 가 아니라 b/a = 3/2',
      body: 'a = 2, b = 3 일 때 a + b = 5 는 그냥 두 수를 합친 값이라 점근선 기울기가 아니에요. 기울기는 b/a = 3/2 이고 점근선은 y = ±(3/2)x 예요. 비로 적어야 표준형에 들어맞아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3c_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3c_step3_exit',
    },

    'g3c_step3_exit': { id: 'g3c_step3_exit', kind: 'exit' },
  },
};
