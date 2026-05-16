import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: gte_step<N>_<choice>_<role>
// 약점 prefix: gte
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 기본각, 대칭, 사분면, 라디안/범위(0≤θ<2π) 등 첫 등장 시 한 줄 정의 동봉.

export const g2_trig_equation_range_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 기본 해 구하기 (먼저 기본각을 잡아야 함)
    //   B: "기본각 하나만 구하면 끝난다"
    //   C: "해는 항상 하나이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "기본각 하나만 구하면 끝난다" ───────────
    'gte_step1_B_explain': {
      id: 'gte_step1_B_explain',
      kind: 'explain',
      title: '기본각은 출발점이에요',
      body: '기본각이란 1사분면(가로·세로축으로 나눈 네 칸 중 오른쪽 위 칸)에서 그 값을 만드는 가장 작은 각이에요. sinθ=1/2 면 기본각은 30°예요. 기본각은 끝이 아니라 대칭으로 다른 해를 찾아가는 출발점이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step1_B_easy',
      summary: '기본각은 1사분면에서 그 값을 만드는 가장 작은 각 — 끝이 아니라 다른 해를 찾는 출발점',
      triggers: [
        '기본각만 구하면 끝 아닌가요',
        '기본각이 뭐예요',
        '해 하나면 충분한 줄 알았어요',
      ],
    },
    'gte_step1_B_easy': {
      id: 'gte_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'sinθ=1/2 에서 기본각은 30°예요. 여기서 멈추면 같은 값을 갖는 다른 각을 놓쳐요. 기본각을 적어두고 다음 단계로 넘어가는 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step1_B_remedy',
    },
    'gte_step1_B_check': {
      id: 'gte_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sinθ=√3/2 일 때 1사분면 기본각은 몇 도일까요?',
      options: [
        { id: 'correct', text: '60°', isCorrect: true, nextNodeId: 'gte_step1_exit' },
        { id: 'wrong1',  text: '30°', isCorrect: false, nextNodeId: 'gte_step1_B_remedy', weaknessId: 'g2_trig_equation_range' },
        { id: 'wrong2',  text: '120°', isCorrect: false, nextNodeId: 'gte_step1_B_remedy', weaknessId: 'g2_trig_equation_range' },
      ],
      dontKnowNextNodeId: 'gte_step1_B_easy',
    },
    'gte_step1_B_remedy': {
      id: 'gte_step1_B_remedy',
      kind: 'explain',
      title: '60°가 기본각이에요',
      body: 'sin60°=√3/2 라서 1사분면 기본각은 60°예요. 30°는 sin30°=1/2 라 값이 달라요. 기본각은 1사분면에서 그 값을 만드는 가장 작은 각으로 잡아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step1_B_check',
    },

    // ─────────── step1.C: "해는 항상 하나이다" ───────────
    'gte_step1_C_explain': {
      id: 'gte_step1_C_explain',
      kind: 'explain',
      title: '해는 보통 여러 개예요',
      body: '단위원(반지름이 1인 동그라미)은 좌우·상하로 대칭이라, 같은 sin·cos 값을 갖는 각이 여러 곳에 동시에 있어요. 그래서 삼각방정식의 해는 보통 하나가 아니라 여러 개예요. 기본각 하나만 보면 나머지 해를 놓쳐요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step1_C_remedy',
      summary: '단위원의 대칭 때문에 같은 값을 갖는 각이 여러 곳에 있음 — 해는 보통 여러 개',
      triggers: [
        '해는 하나 아닌가요',
        '왜 답이 여러 개예요',
        '단위원 대칭이 뭐예요',
      ],
    },
    'gte_step1_C_check': {
      id: 'gte_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '0≤θ<2π 에서 sinθ=1/2 를 만족하는 θ는 몇 개일까요? (0≤θ<2π 는 0 이상 한 바퀴 미만 범위예요)',
      options: [
        { id: 'correct', text: '2개', isCorrect: true, nextNodeId: 'gte_step1_exit' },
        { id: 'wrong1',  text: '1개', isCorrect: false, nextNodeId: 'gte_step1_C_remedy', weaknessId: 'g2_trig_equation_range' },
        { id: 'wrong2',  text: '0개', isCorrect: false, nextNodeId: 'gte_step1_C_remedy', weaknessId: 'g2_trig_equation_range' },
      ],
      dontKnowNextNodeId: 'gte_step1_C_remedy',
    },
    'gte_step1_C_remedy': {
      id: 'gte_step1_C_remedy',
      kind: 'explain',
      title: '한 바퀴 안에 두 개예요',
      body: 'sinθ=1/2 는 1사분면 30°, 2사분면 150° 두 곳에서 성립해요. 단위원이 좌우로 대칭이라 한 바퀴 안에 해가 두 개 생겨요. 그래서 답은 2개예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step1_C_check',
    },

    'gte_step1_exit': { id: 'gte_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 대칭 해 추가 (다른 사분면의 같은 값 챙기기)
    //   B: "기본각 하나만으로 충분하다"
    //   C: "대칭 해는 항상 존재하지 않는다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "기본각 하나만으로 충분하다" ───────────
    'gte_step2_B_explain': {
      id: 'gte_step2_B_explain',
      kind: 'explain',
      title: '대칭 해를 꼭 챙겨요',
      body: '단위원에서 같은 sin 값은 좌우 대칭인 두 사분면(예: 1사분면과 2사분면)에 동시에 있어요. 기본각만 적으면 대칭으로 짝지어진 해가 빠져요. 기본각을 잡았으면 대칭 위치의 해도 같이 적어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step2_B_easy',
      summary: '같은 sin 값은 대칭인 두 사분면에 동시에 존재 — 기본각만으로는 해가 빠짐',
      triggers: [
        '기본각 하나면 충분한 거 아닌가요',
        '대칭 해를 왜 또 찾아요',
        '사분면이 뭐예요',
      ],
    },
    'gte_step2_B_easy': {
      id: 'gte_step2_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'sinθ=1/2 면 1사분면 30°만이 아니라 2사분면 150°도 해예요. 두 각을 짝으로 같이 적어두면 빠짐이 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step2_B_remedy',
    },
    'gte_step2_B_check': {
      id: 'gte_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '1사분면 기본각이 30°인 sinθ=1/2 의 대칭 해(2사분면)는 몇 도일까요?',
      options: [
        { id: 'correct', text: '150°', isCorrect: true, nextNodeId: 'gte_step2_exit' },
        { id: 'wrong1',  text: '60°',  isCorrect: false, nextNodeId: 'gte_step2_B_remedy', weaknessId: 'g2_trig_equation_range' },
        { id: 'wrong2',  text: '210°', isCorrect: false, nextNodeId: 'gte_step2_B_remedy', weaknessId: 'g2_trig_equation_range' },
      ],
      dontKnowNextNodeId: 'gte_step2_B_easy',
    },
    'gte_step2_B_remedy': {
      id: 'gte_step2_B_remedy',
      kind: 'explain',
      title: '180°−30°=150°',
      body: 'sin 값이 같은 2사분면 각은 180°에서 기본각을 뺀 값이에요. 180°−30°=150° 라서 대칭 해는 150°예요. 그래서 해는 30°와 150° 두 개예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step2_B_check',
    },

    // ─────────── step2.C: "대칭 해는 항상 존재하지 않는다" ───────────
    'gte_step2_C_explain': {
      id: 'gte_step2_C_explain',
      kind: 'explain',
      title: '대칭 해는 대부분 있어요',
      body: '단위원은 항상 대칭이라, 한 각에서 어떤 값이 나오면 대칭 위치의 다른 각에서도 보통 같은 값이 나와요. 그래서 대칭 해는 거의 항상 존재해요. 없다고 미리 단정하면 해를 빠뜨려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step2_C_remedy',
      summary: '단위원은 항상 대칭이라 대칭 해는 거의 항상 존재 — 없다고 단정하면 해 누락',
      triggers: [
        '대칭 해가 없을 때도 있지 않나요',
        '왜 항상 있다고 봐요',
        '대칭이라는 게 무슨 뜻이에요',
      ],
    },
    'gte_step2_C_check': {
      id: 'gte_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '0≤θ<2π 에서 cosθ=1/2 의 해는 1사분면 60° 말고 대칭 해가 또 있을까요?',
      options: [
        { id: 'correct', text: '있다 (4사분면 300°)', isCorrect: true, nextNodeId: 'gte_step2_exit' },
        { id: 'wrong1',  text: '없다',                 isCorrect: false, nextNodeId: 'gte_step2_C_remedy', weaknessId: 'g2_trig_equation_range' },
        { id: 'wrong2',  text: '60°만 해이다',          isCorrect: false, nextNodeId: 'gte_step2_C_remedy', weaknessId: 'g2_trig_equation_range' },
      ],
      dontKnowNextNodeId: 'gte_step2_C_remedy',
    },
    'gte_step2_C_remedy': {
      id: 'gte_step2_C_remedy',
      kind: 'explain',
      title: '300°도 해예요',
      body: 'cosθ=1/2 는 1사분면 60°와 4사분면 300°에서 성립해요. 단위원이 위아래로 대칭이라 cos 값이 같은 각이 한 쌍 생겨요. 그래서 대칭 해 300°가 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step2_C_check',
    },

    'gte_step2_exit': { id: 'gte_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 주어진 범위로 필터링 (범위 안의 해만 선택)
    //   B: "모든 해를 답으로 쓴다"
    //   C: "범위는 확인하지 않아도 된다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "모든 해를 답으로 쓴다" ───────────
    'gte_step3_B_explain': {
      id: 'gte_step3_B_explain',
      kind: 'explain',
      title: '범위 밖 해는 빼요',
      body: '단위원에서 찾은 각은 한 바퀴(360°)를 넘어 무한히 많아요. 문제는 보통 0≤θ<2π(0 이상 한 바퀴 미만) 같은 범위를 줘요. 그 범위 안에 드는 해만 답으로 적고, 밖의 해는 빼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step3_B_easy',
      summary: '찾은 해 중 주어진 범위 안에 드는 것만 답 — 범위 밖은 제외',
      triggers: [
        '찾은 해를 다 쓰면 안 되나요',
        '범위로 왜 걸러요',
        '0≤θ<2π 가 무슨 뜻이에요',
      ],
    },
    'gte_step3_B_easy': {
      id: 'gte_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'sinθ=1/2 의 해는 30°, 150°, 390°… 처럼 계속 늘어요. 0≤θ<360° 범위면 30°와 150°만 답이고 390°는 빼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step3_B_remedy',
    },
    'gte_step3_B_check': {
      id: 'gte_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sinθ=1/2 의 해 30°, 150°, 390° 중 0≤θ<360° 범위의 답만 고르면?',
      options: [
        { id: 'correct', text: '30°, 150°',        isCorrect: true, nextNodeId: 'gte_step3_exit' },
        { id: 'wrong1',  text: '30°, 150°, 390°',  isCorrect: false, nextNodeId: 'gte_step3_B_remedy', weaknessId: 'g2_trig_equation_range' },
        { id: 'wrong2',  text: '150°, 390°',       isCorrect: false, nextNodeId: 'gte_step3_B_remedy', weaknessId: 'g2_trig_equation_range' },
      ],
      dontKnowNextNodeId: 'gte_step3_B_easy',
    },
    'gte_step3_B_remedy': {
      id: 'gte_step3_B_remedy',
      kind: 'explain',
      title: '390°는 범위 밖이에요',
      body: '0≤θ<360° 는 한 바퀴 미만이라 390°는 범위를 넘어 빠져요. 남는 건 30°와 150° 예요. 범위 안에 드는 해만 답으로 적는 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step3_B_check',
    },

    // ─────────── step3.C: "범위는 확인하지 않아도 된다" ───────────
    'gte_step3_C_explain': {
      id: 'gte_step3_C_explain',
      kind: 'explain',
      title: '범위가 답을 정해줘요',
      body: '같은 sinθ=1/2 라도 범위가 0≤θ<2π 인지 0≤θ<4π 인지에 따라 답 개수가 달라져요. 범위를 확인하지 않으면 필요 없는 해가 답에 섞이거나 필요한 해가 빠져요. 범위는 마지막에 꼭 짚어야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step3_C_remedy',
      summary: '범위에 따라 답 개수가 달라짐 — 범위를 확인하지 않으면 해가 섞이거나 빠짐',
      triggers: [
        '범위는 안 봐도 되는 거 아닌가요',
        '왜 범위가 중요해요',
        '범위가 답을 어떻게 바꿔요',
      ],
    },
    'gte_step3_C_check': {
      id: 'gte_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sinθ=1/2 일 때 0≤θ<2π(한 바퀴 미만) 범위면 해는 몇 개일까요?',
      options: [
        { id: 'correct', text: '2개 (π/6, 5π/6)', isCorrect: true, nextNodeId: 'gte_step3_exit' },
        { id: 'wrong1',  text: '무한히 많다',       isCorrect: false, nextNodeId: 'gte_step3_C_remedy', weaknessId: 'g2_trig_equation_range' },
        { id: 'wrong2',  text: '1개',              isCorrect: false, nextNodeId: 'gte_step3_C_remedy', weaknessId: 'g2_trig_equation_range' },
      ],
      dontKnowNextNodeId: 'gte_step3_C_remedy',
    },
    'gte_step3_C_remedy': {
      id: 'gte_step3_C_remedy',
      kind: 'explain',
      title: '한 바퀴 안에 두 개예요',
      body: '범위를 안 보면 30°, 150°, 390°… 처럼 무한히 많아 보여요. 0≤θ<2π 는 한 바퀴 미만이라 π/6(=30°)과 5π/6(=150°) 두 개만 답이에요. 범위가 답을 두 개로 정해준 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gte_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gte_step3_C_check',
    },

    'gte_step3_exit': { id: 'gte_step3_exit', kind: 'exit' },
  },
};
