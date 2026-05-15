import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3t_step<N>_<choice>_<role>
// 약점 prefix: g3t

export const g3_trig_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 B ("x좌표=sin, y좌표=cos") 분기 ───────────
    // 단위원 좌표축 ↔ sin/cos 역할이 뒤바뀜
    'g3t_step1_B_explain': {
      id: 'g3t_step1_B_explain',
      kind: 'explain',
      title: '단위원에서 cos이 가로, sin이 세로예요',
      body: '단위원(반지름이 1인 원)에서 각 θ에 해당하는 점의 위치는 (cosθ, sinθ) 예요. 즉 가로축(x) 값이 cosθ, 세로축(y) 값이 sinθ 예요. 두 자리가 뒤바뀌면 값이 통째로 어긋나요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step1_B_easy',
      summary: '단위원 점의 좌표는 (cosθ, sinθ) — 가로가 cos, 세로가 sin',
      triggers: [
        'sin이랑 cos 자리가 헷갈려요',
        'x좌표가 sin인 줄 알았어요',
        '단위원에서 어느 게 어느 거예요',
      ],
    },
    'g3t_step1_B_easy': {
      id: 'g3t_step1_B_easy',
      kind: 'explain',
      title: '예시로 한 번 더',
      body: '60°를 예로 들면, 단위원 위 점은 (1/2, √3/2) 예요. 가로 1/2 이 cos60°, 세로 √3/2 가 sin60° 예요. 가로=cos, 세로=sin 으로 외우면 안 헷갈려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step1_exit',
    },
    'g3t_step1_B_check': {
      id: 'g3t_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '단위원 위에서 각 30°에 해당하는 점의 좌표는?',
      options: [
        { id: 'correct', text: '(√3/2, 1/2)', isCorrect: true, nextNodeId: 'g3t_step1_exit' },
        { id: 'wrong1', text: '(1/2, √3/2)', isCorrect: false, nextNodeId: 'g3t_step1_B_remedy', weaknessId: 'g3_trig' },
        { id: 'wrong2', text: '(1, 0)', isCorrect: false, nextNodeId: 'g3t_step1_B_remedy', weaknessId: 'g3_trig' },
      ],
      dontKnowNextNodeId: 'g3t_step1_B_easy',
    },
    'g3t_step1_B_remedy': {
      id: 'g3t_step1_B_remedy',
      kind: 'explain',
      title: '30°는 (√3/2, 1/2)',
      body: 'cos30° = √3/2 가 가로, sin30° = 1/2 가 세로예요. (1/2, √3/2) 는 60°에 해당하는 점이라 자리가 바뀐 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step1_exit',
    },

    // ─────────── step1: 오답 C ("반지름이 1이 아닌 원에서 읽는다") 분기 ───────────
    'g3t_step1_C_explain': {
      id: 'g3t_step1_C_explain',
      kind: 'explain',
      title: '기준은 반지름 1짜리 단위원이에요',
      body: 'sin·cos 값은 반지름이 1인 원(단위원) 위에서 정의해요. 그래야 점의 좌표가 그대로 (cosθ, sinθ) 가 되거든요. 반지름이 1이 아니면 좌표를 반지름으로 나눠야 같은 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step1_B_easy',
      summary: 'sin·cos 정의의 기준 원은 반지름 1짜리 단위원 — 다른 원이면 좌표/반지름 보정 필요',
      triggers: [
        '아무 원에서나 읽으면 되는 줄 알았어요',
        '왜 꼭 반지름이 1이어야 해요',
        '단위원이라는 말이 익숙하지 않아요',
      ],
    },
    'g3t_step1_C_check': {
      id: 'g3t_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '반지름이 2인 원 위에서 각 θ에 해당하는 점이 (x, y) 라면, cosθ 는?',
      options: [
        { id: 'correct', text: 'x / 2', isCorrect: true, nextNodeId: 'g3t_step1_exit' },
        { id: 'wrong1', text: 'x', isCorrect: false, nextNodeId: 'g3t_step1_C_remedy', weaknessId: 'g3_trig' },
        { id: 'wrong2', text: '2x', isCorrect: false, nextNodeId: 'g3t_step1_C_remedy', weaknessId: 'g3_trig' },
      ],
      dontKnowNextNodeId: 'g3t_step1_B_easy',
    },
    'g3t_step1_C_remedy': {
      id: 'g3t_step1_C_remedy',
      kind: 'explain',
      title: '좌표 ÷ 반지름',
      body: '반지름이 1이 아니면 가로좌표를 반지름으로 나눠야 cosθ 가 돼요. 반지름 2짜리 원이면 cosθ = x/2 예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step1_exit',
    },

    'g3t_step1_exit': { id: 'g3t_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 B ("sin²θ - cos²θ = 1") 분기 ───────────
    // 항등식(어떤 값을 넣어도 항상 성립하는 식)의 부호 혼동
    'g3t_step2_B_explain': {
      id: 'g3t_step2_B_explain',
      kind: 'explain',
      title: '기본 항등식은 합이에요',
      body: '항등식(어떤 각을 넣어도 항상 성립하는 식)인 sin²θ + cos²θ = 1 은 단위원의 x² + y² = 1 을 그대로 옮긴 거예요. 그래서 더하기 모양이지 빼기가 아니에요. 빼기 형태는 다른 변형 식에서 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step2_B_easy',
      summary: '기본 항등식 sin²θ + cos²θ = 1 — 단위원 x²+y²=1 에서 곧장 나온 더하기 식',
      triggers: [
        '더하기인지 빼기인지 헷갈려요',
        'sin²−cos² 도 1 인 줄 알았어요',
        '왜 합이 1 인지 모르겠어요',
      ],
    },
    'g3t_step2_B_easy': {
      id: 'g3t_step2_B_easy',
      kind: 'explain',
      title: '값 하나로 확인해요',
      body: 'θ = 30° 면 sin30° = 1/2, cos30° = √3/2 예요. (1/2)² + (√3/2)² = 1/4 + 3/4 = 1 이 돼요. 빼면 1 이 안 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step2_exit',
    },
    'g3t_step2_B_check': {
      id: 'g3t_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sinθ = 3/5 일 때 cosθ 의 가능한 값은? (단, 부호는 양수)',
      options: [
        { id: 'correct', text: '4/5', isCorrect: true, nextNodeId: 'g3t_step2_exit' },
        { id: 'wrong1', text: '2/5', isCorrect: false, nextNodeId: 'g3t_step2_B_remedy', weaknessId: 'g3_trig' },
        { id: 'wrong2', text: '√(34)/5', isCorrect: false, nextNodeId: 'g3t_step2_B_remedy', weaknessId: 'g3_trig' },
      ],
      dontKnowNextNodeId: 'g3t_step2_B_easy',
    },
    'g3t_step2_B_remedy': {
      id: 'g3t_step2_B_remedy',
      kind: 'explain',
      title: 'cos²θ = 1 − (3/5)² = 16/25',
      body: 'sin² + cos² = 1 에 sin = 3/5 를 넣으면 cos² = 1 − 9/25 = 16/25 예요. 양의 값을 고르면 cos = 4/5 예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step2_exit',
    },

    // ─────────── step2: 오답 C ("sinθ × cosθ = 1") 분기 ───────────
    'g3t_step2_C_explain': {
      id: 'g3t_step2_C_explain',
      kind: 'explain',
      title: '곱은 일반적으로 1 이 아니에요',
      body: 'sinθ 와 cosθ 는 각각 −1 과 1 사이의 값이에요. 둘을 곱하면 0 부터 1/2 사이 정도 값이 나와서 1 이 되지 않아요. 기본 항등식은 제곱끼리의 합이 1 인 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step2_B_easy',
      summary: 'sinθ·cosθ 는 일반적으로 1 이 아님 — 기본 항등식은 sin²θ + cos²θ = 1 (제곱의 합)',
      triggers: [
        '곱하면 1 이 되는 줄 알았어요',
        'sin·cos 가 1 이라고 외웠어요',
        '왜 곱이 아니라 제곱의 합인지',
      ],
    },
    'g3t_step2_C_check': {
      id: 'g3t_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'θ = 45° 일 때 sinθ × cosθ 의 값은?',
      options: [
        { id: 'correct', text: '1/2', isCorrect: true, nextNodeId: 'g3t_step2_exit' },
        { id: 'wrong1', text: '1', isCorrect: false, nextNodeId: 'g3t_step2_C_remedy', weaknessId: 'g3_trig' },
        { id: 'wrong2', text: '√2', isCorrect: false, nextNodeId: 'g3t_step2_C_remedy', weaknessId: 'g3_trig' },
      ],
      dontKnowNextNodeId: 'g3t_step2_B_easy',
    },
    'g3t_step2_C_remedy': {
      id: 'g3t_step2_C_remedy',
      kind: 'explain',
      title: '(√2/2) × (√2/2) = 1/2',
      body: 'sin45° = cos45° = √2/2 예요. 둘을 곱하면 2/4 = 1/2 가 나와요. 1 이 되지 않으니 곱이 항등식이 아닌 게 보여요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step2_exit',
    },

    'g3t_step2_exit': { id: 'g3t_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 B ("sin(180°−θ) = −sinθ") 분기 ───────────
    // 사분면별 부호 혼동
    'g3t_step3_B_explain': {
      id: 'g3t_step3_B_explain',
      kind: 'explain',
      title: '180°−θ 는 2사분면이에요',
      body: '180°−θ 는 단위원에서 2사분면(왼쪽 위) 에 자리해요. 2사분면에서 sin 은 양수 그대로고 cos 만 부호가 뒤집혀요. 그래서 sin(180°−θ) = sinθ 이고, 부호가 바뀌는 건 cos 쪽이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step3_B_easy',
      summary: 'sin(180°−θ) = sinθ — 2사분면에서 sin 부호 유지, cos 부호만 뒤집힘',
      triggers: [
        'sin(180°−θ) 부호가 헷갈려요',
        '−sinθ 인 줄 알았어요',
        '어느 사분면이 어떤 부호인지 모르겠어요',
      ],
    },
    'g3t_step3_B_easy': {
      id: 'g3t_step3_B_easy',
      kind: 'explain',
      title: '값으로 확인해요',
      body: 'sin150° = sin(180°−30°) 인데 단위원에서 보면 sin30° 와 같은 1/2 이에요. 부호가 바뀌면 −1/2 이 되어야 하니 sin 은 그대로 라는 걸 알 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step3_exit',
    },
    'g3t_step3_B_check': {
      id: 'g3t_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sin120° 의 값은?',
      options: [
        { id: 'correct', text: '√3/2', isCorrect: true, nextNodeId: 'g3t_step3_exit' },
        { id: 'wrong1', text: '−√3/2', isCorrect: false, nextNodeId: 'g3t_step3_B_remedy', weaknessId: 'g3_trig' },
        { id: 'wrong2', text: '1/2', isCorrect: false, nextNodeId: 'g3t_step3_B_remedy', weaknessId: 'g3_trig' },
      ],
      dontKnowNextNodeId: 'g3t_step3_B_easy',
    },
    'g3t_step3_B_remedy': {
      id: 'g3t_step3_B_remedy',
      kind: 'explain',
      title: 'sin120° = sin(180°−60°) = sin60°',
      body: '120° 는 2사분면 각이라 sin 은 부호가 유지돼요. sin60° = √3/2 가 그대로 답이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step3_exit',
    },

    // ─────────── step3: 오답 C ("sin(90°−θ) = sinθ") 분기 ───────────
    // 여각 관계 (sin ↔ cos 가 바뀌는 변환) 혼동
    'g3t_step3_C_explain': {
      id: 'g3t_step3_C_explain',
      kind: 'explain',
      title: '90°−θ 에서는 sin 과 cos 이 자리를 바꿔요',
      body: '90°−θ 는 직각삼각형에서 한 예각의 짝(여각, 두 각을 합치면 90° 가 되는 짝) 이에요. 짝이 되면 sin 과 cos 의 자리가 바뀌어요. 그래서 sin(90°−θ) = cosθ 이고, cos(90°−θ) = sinθ 예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step3_B_easy',
      summary: 'sin(90°−θ) = cosθ — 여각 관계에서 sin 과 cos 이 서로 자리를 바꿈',
      triggers: [
        'sin(90°−θ) 가 그대로 sin 인 줄 알았어요',
        'sin 이랑 cos 자리 바뀌는 게 헷갈려요',
        '여각 변환이 뭔지 모르겠어요',
      ],
    },
    'g3t_step3_C_check': {
      id: 'g3t_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sin(90°−30°) 의 값은?',
      options: [
        { id: 'correct', text: '√3/2', isCorrect: true, nextNodeId: 'g3t_step3_exit' },
        { id: 'wrong1', text: '1/2', isCorrect: false, nextNodeId: 'g3t_step3_C_remedy', weaknessId: 'g3_trig' },
        { id: 'wrong2', text: '−1/2', isCorrect: false, nextNodeId: 'g3t_step3_C_remedy', weaknessId: 'g3_trig' },
      ],
      dontKnowNextNodeId: 'g3t_step3_B_easy',
    },
    'g3t_step3_C_remedy': {
      id: 'g3t_step3_C_remedy',
      kind: 'explain',
      title: 'sin(90°−30°) = cos30°',
      body: '여각 관계에 따라 sin(90°−30°) 는 cos30° 와 같아요. cos30° = √3/2 이니까 답도 √3/2 예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3t_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3t_step3_exit',
    },

    'g3t_step3_exit': { id: 'g3t_step3_exit', kind: 'exit' },
  },
};
