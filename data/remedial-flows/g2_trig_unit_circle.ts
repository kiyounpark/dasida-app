import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: gtu_step<N>_<choice>_<role>
// 약점 prefix: gtu
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 단위원, 사분면, 특수각, 동경 등 첫 등장 시 한 줄 정의 동봉.

export const g2_trig_unit_circle_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 단위원 좌표 = (cosθ, sinθ)
    //   B: "x좌표=sinθ, y좌표=cosθ" (두 좌표 역할 뒤바뀜)
    //   C: "좌표는 각도와 무관하다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "x좌표=sinθ, y좌표=cosθ" ───────────
    'gtu_step1_B_explain': {
      id: 'gtu_step1_B_explain',
      kind: 'explain',
      title: 'x가 코사인, y가 사인이에요',
      body: '단위원(중심이 원점이고 반지름이 1인 원)에서 각도 θ만큼 돈 점의 좌표는 (cosθ, sinθ)예요. 가로 자리(x좌표)에 cosθ가, 세로 자리(y좌표)에 sinθ가 들어가요. 두 자리를 바꾸면 답이 완전히 달라져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step1_B_easy',
      summary: '단위원 위 점의 좌표는 (cosθ, sinθ) — x자리는 cos, y자리는 sin',
      triggers: [
        'x가 사인인지 코사인인지 헷갈려요',
        '두 좌표가 자꾸 바뀌어요',
        '어느 자리가 사인이에요',
      ],
    },
    'gtu_step1_B_easy': {
      id: 'gtu_step1_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'θ=90°일 때 점은 맨 위 (0, 1)이에요. 여기서 x좌표 0이 cos90°, y좌표 1이 sin90°예요. 가로가 코사인, 세로가 사인이라고 짝지어 기억하면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step1_B_remedy',
    },
    'gtu_step1_B_check': {
      id: 'gtu_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '단위원에서 각도 θ인 점의 x좌표는 무엇일까요?',
      options: [
        { id: 'correct', text: 'cosθ', isCorrect: true, nextNodeId: 'gtu_step1_exit' },
        { id: 'wrong1',  text: 'sinθ', isCorrect: false, nextNodeId: 'gtu_step1_B_remedy', weaknessId: 'g2_trig_unit_circle' },
        { id: 'wrong2',  text: 'tanθ', isCorrect: false, nextNodeId: 'gtu_step1_B_remedy', weaknessId: 'g2_trig_unit_circle' },
      ],
      dontKnowNextNodeId: 'gtu_step1_B_easy',
    },
    'gtu_step1_B_remedy': {
      id: 'gtu_step1_B_remedy',
      kind: 'explain',
      title: '가로는 cos, 세로는 sin',
      body: '단위원 위 점의 가로 자리(x좌표)는 cosθ예요. 세로 자리(y좌표)가 sinθ고요. 가로부터 코사인이라고 떠올리면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step1_B_check',
    },

    // ─────────── step1.C: "좌표는 각도와 무관하다" ───────────
    'gtu_step1_C_explain': {
      id: 'gtu_step1_C_explain',
      kind: 'explain',
      title: '각도가 좌표를 정해요',
      body: '단위원(중심이 원점이고 반지름이 1인 원)에서 각도 θ가 바뀌면 점이 원 둘레를 따라 움직여서 좌표도 같이 변해요. 그 좌표가 바로 (cosθ, sinθ)예요. 그래서 각도와 좌표는 따로 떼어 생각할 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step1_C_remedy',
      summary: '각도 θ가 변하면 단위원 위 점의 좌표 (cosθ, sinθ)도 함께 변함',
      triggers: [
        '좌표가 각도랑 무슨 상관이에요',
        '각도가 변해도 좌표는 그대로 아닌가요',
        '왜 각도로 좌표를 구해요',
      ],
    },
    'gtu_step1_C_check': {
      id: 'gtu_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '단위원에서 각도 θ가 0°에서 90°로 커지면 점의 좌표는 어떻게 될까요?',
      options: [
        { id: 'correct', text: '함께 변한다', isCorrect: true, nextNodeId: 'gtu_step1_exit' },
        { id: 'wrong1',  text: '항상 그대로다', isCorrect: false, nextNodeId: 'gtu_step1_C_remedy', weaknessId: 'g2_trig_unit_circle' },
        { id: 'wrong2',  text: '각도와 무관하다', isCorrect: false, nextNodeId: 'gtu_step1_C_remedy', weaknessId: 'g2_trig_unit_circle' },
      ],
      dontKnowNextNodeId: 'gtu_step1_C_remedy',
    },
    'gtu_step1_C_remedy': {
      id: 'gtu_step1_C_remedy',
      kind: 'explain',
      title: '각도 0°와 90°를 비교해요',
      body: 'θ=0°이면 점은 (1, 0)이고, θ=90°이면 점은 (0, 1)이에요. 각도가 바뀌니 좌표도 완전히 달라졌죠. 각도가 좌표를 직접 정해줘요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step1_C_check',
    },

    'gtu_step1_exit': { id: 'gtu_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 사분면 부호 판단
    //   B: "부호는 항상 양수이다"
    //   C: "사분면은 값에 영향을 주지 않는다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "부호는 항상 양수이다" ───────────
    'gtu_step2_B_explain': {
      id: 'gtu_step2_B_explain',
      kind: 'explain',
      title: '음수가 될 때도 있어요',
      body: '사분면(좌표평면을 가로·세로 축으로 나눈 네 칸)마다 점의 위치가 달라서 cosθ·sinθ가 음수일 수도 있어요. 예를 들어 2사분면(왼쪽 위 칸)에서는 sinθ는 양수, cosθ는 음수예요. 그래서 부호가 항상 양수는 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step2_B_easy',
      summary: '사분면에 따라 cos·sin이 음수가 될 수 있음 — 부호는 항상 양수가 아님',
      triggers: [
        '삼각함수 값은 다 양수 아닌가요',
        '왜 음수가 나와요',
        '부호가 언제 바뀌어요',
      ],
    },
    'gtu_step2_B_easy': {
      id: 'gtu_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: '2사분면(왼쪽 위 칸)에 있는 각도는 점이 원점 왼쪽에 있어서 x좌표가 음수예요. x좌표가 cosθ니까 cosθ가 음수가 돼요. 위치가 부호를 정해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step2_B_remedy',
    },
    'gtu_step2_B_check': {
      id: 'gtu_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '2사분면(왼쪽 위 칸)에 있는 각도 θ에서 cosθ의 부호는?',
      options: [
        { id: 'correct', text: '음수', isCorrect: true, nextNodeId: 'gtu_step2_exit' },
        { id: 'wrong1',  text: '항상 양수', isCorrect: false, nextNodeId: 'gtu_step2_B_remedy', weaknessId: 'g2_trig_unit_circle' },
        { id: 'wrong2',  text: '항상 0', isCorrect: false, nextNodeId: 'gtu_step2_B_remedy', weaknessId: 'g2_trig_unit_circle' },
      ],
      dontKnowNextNodeId: 'gtu_step2_B_easy',
    },
    'gtu_step2_B_remedy': {
      id: 'gtu_step2_B_remedy',
      kind: 'explain',
      title: '왼쪽이면 cos는 음수',
      body: '2사분면에서는 점이 원점 왼쪽에 있어 x좌표가 음수예요. x좌표가 cosθ니까 cosθ는 음수예요. 위치를 보면 부호가 보여요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step2_B_check',
    },

    // ─────────── step2.C: "사분면은 값에 영향을 주지 않는다" ───────────
    'gtu_step2_C_explain': {
      id: 'gtu_step2_C_explain',
      kind: 'explain',
      title: '사분면이 부호를 정해요',
      body: '각도가 어느 사분면(좌표평면을 네 칸으로 나눈 부분)에 있느냐가 cosθ·sinθ가 양수인지 음수인지를 그대로 정해요. 점이 어느 칸에 있느냐에 따라 x·y좌표의 부호가 바뀌기 때문이에요. 그래서 사분면을 먼저 확인하는 게 가장 중요해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step2_C_remedy',
      summary: '사분면이 cos·sin의 부호를 직접 결정 — 사분면 확인이 첫 단계',
      triggers: [
        '사분면이 값에 영향 주나요',
        '위치는 상관없는 거 아닌가요',
        '왜 사분면부터 봐요',
      ],
    },
    'gtu_step2_C_check': {
      id: 'gtu_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '같은 sinθ 값이라도 부호를 정하려면 먼저 무엇을 확인해야 할까요?',
      options: [
        { id: 'correct', text: '각도가 속한 사분면', isCorrect: true, nextNodeId: 'gtu_step2_exit' },
        { id: 'wrong1',  text: '아무것도 확인 안 해도 된다', isCorrect: false, nextNodeId: 'gtu_step2_C_remedy', weaknessId: 'g2_trig_unit_circle' },
        { id: 'wrong2',  text: '항상 양수로 둔다', isCorrect: false, nextNodeId: 'gtu_step2_C_remedy', weaknessId: 'g2_trig_unit_circle' },
      ],
      dontKnowNextNodeId: 'gtu_step2_C_remedy',
    },
    'gtu_step2_C_remedy': {
      id: 'gtu_step2_C_remedy',
      kind: 'explain',
      title: '먼저 칸을 확인해요',
      body: '같은 각도여도 1사분면이면 cos·sin 모두 양수, 3사분면(왼쪽 아래 칸)이면 모두 음수예요. 칸이 다르면 부호가 달라지니 사분면을 먼저 봐야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step2_C_check',
    },

    'gtu_step2_exit': { id: 'gtu_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 특수각(30°·45°·60°) 값 적용
    //   B: "특수각 값은 매번 계산한다"
    //   C: "특수각 외 각도는 같은 값을 쓴다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "특수각 값은 매번 계산한다" ───────────
    'gtu_step3_B_explain': {
      id: 'gtu_step3_B_explain',
      kind: 'explain',
      title: '특수각 값은 외워두면 빨라요',
      body: '특수각(자주 나오는 30°·45°·60° 같은 각도)의 sin·cos 값은 정해져 있어서 매번 계산하지 않고 바로 꺼내 쓰면 돼요. 예를 들어 sin30°=1/2, cos30°=√3/2, sin45°=√2/2예요. 외워두면 풀이 시간이 크게 줄어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step3_B_easy',
      summary: '특수각 30°·45°·60°의 sin·cos 값은 고정 — 외워두고 바로 대입',
      triggers: [
        '특수각 값을 매번 계산해야 하나요',
        '외울 필요가 있나요',
        '값이 자꾸 기억 안 나요',
      ],
    },
    'gtu_step3_B_easy': {
      id: 'gtu_step3_B_easy',
      kind: 'explain',
      title: '핵심 값만 짧게',
      body: 'sin30°=1/2, sin45°=√2/2, sin60°=√3/2 이렇게 셋만 먼저 외워요. cos는 이 순서를 거꾸로 읽으면 돼요. 이 표만 있으면 매번 계산할 필요가 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step3_B_remedy',
    },
    'gtu_step3_B_check': {
      id: 'gtu_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sin30°의 값은 무엇일까요?',
      options: [
        { id: 'correct', text: '1/2', isCorrect: true, nextNodeId: 'gtu_step3_exit' },
        { id: 'wrong1',  text: '√3/2', isCorrect: false, nextNodeId: 'gtu_step3_B_remedy', weaknessId: 'g2_trig_unit_circle' },
        { id: 'wrong2',  text: '1', isCorrect: false, nextNodeId: 'gtu_step3_B_remedy', weaknessId: 'g2_trig_unit_circle' },
      ],
      dontKnowNextNodeId: 'gtu_step3_B_easy',
    },
    'gtu_step3_B_remedy': {
      id: 'gtu_step3_B_remedy',
      kind: 'explain',
      title: 'sin30°=1/2 로 고정',
      body: 'sin30°은 항상 1/2 로 정해져 있어요. 매번 계산하지 않고 이 값을 그대로 꺼내 쓰면 돼요. 30°는 1/2, 이렇게 짝지어 외워요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step3_B_check',
    },

    // ─────────── step3.C: "특수각 외 각도는 같은 값을 쓴다" ───────────
    'gtu_step3_C_explain': {
      id: 'gtu_step3_C_explain',
      kind: 'explain',
      title: '각도마다 값이 달라요',
      body: '특수각(30°·45°·60°)의 값을 외운다고 해서 다른 각도까지 같은 값을 쓰면 안 돼요. 각도가 바뀌면 단위원 위 점의 위치가 바뀌어 sin·cos 값도 달라지기 때문이에요. 특수각이 아닌 각도는 변환하거나 따로 구해야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step3_C_remedy',
      summary: '각도마다 sin·cos 값이 다름 — 특수각 값을 다른 각도에 그대로 쓰면 안 됨',
      triggers: [
        '다른 각도도 같은 값 쓰면 되나요',
        '특수각 값을 그냥 쓰면 안 되나요',
        '각도가 다르면 값도 달라요',
      ],
    },
    'gtu_step3_C_check': {
      id: 'gtu_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sin30°=1/2 입니다. 그럼 sin60°의 값은 sin30°과 같을까요?',
      options: [
        { id: 'correct', text: '다르다 (√3/2)', isCorrect: true, nextNodeId: 'gtu_step3_exit' },
        { id: 'wrong1',  text: '같다 (1/2)', isCorrect: false, nextNodeId: 'gtu_step3_C_remedy', weaknessId: 'g2_trig_unit_circle' },
        { id: 'wrong2',  text: '각도와 무관하다', isCorrect: false, nextNodeId: 'gtu_step3_C_remedy', weaknessId: 'g2_trig_unit_circle' },
      ],
      dontKnowNextNodeId: 'gtu_step3_C_remedy',
    },
    'gtu_step3_C_remedy': {
      id: 'gtu_step3_C_remedy',
      kind: 'explain',
      title: '30°와 60°는 값이 달라요',
      body: 'sin30°=1/2 이지만 sin60°=√3/2 라서 둘은 다른 값이에요. 각도가 다르면 단위원 위 위치가 달라져 값도 바뀌어요. 각도별로 따로 챙겨야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gtu_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gtu_step3_C_check',
    },

    'gtu_step3_exit': { id: 'gtu_step3_exit', kind: 'exit' },
  },
};
