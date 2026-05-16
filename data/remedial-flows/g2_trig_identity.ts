import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: gti_step<N>_<choice>_<role>
// 약점 prefix: gti
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 항등식, 치환, 인수분해 등 첫 등장 시 한 줄 정의 동봉.

export const g2_trig_identity_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 기본 항등식 확인 (sin²θ+cos²θ=1, tanθ=sinθ/cosθ)
    //   B: "항등식 없이 바로 계산한다"
    //   C: "항등식은 특정 각도에서만 성립한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "항등식 없이 바로 계산한다" ───────────
    'gti_step1_B_explain': {
      id: 'gti_step1_B_explain',
      kind: 'explain',
      title: '항등식을 먼저 적어요',
      body: '항등식(어떤 각도를 넣어도 항상 성립하는 식)을 먼저 적어두면 어떤 변환이 가능한지 한눈에 보여요. 삼각함수 식은 sin²θ+cos²θ=1 이나 tanθ=sinθ/cosθ 로 바꿔야 풀리는 경우가 많아요. 항등식을 안 적으면 출발점 자체가 빠진 셈이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step1_B_easy',
      summary: '삼각함수 식은 기본 항등식을 먼저 적어야 변환 경로가 보임 — 안 적으면 출발점 누락',
      triggers: [
        '항등식 없이 바로 계산하면 안 되나요',
        '왜 식을 먼저 적어야 해요',
        '그냥 계산하면 되는 줄 알았어요',
      ],
    },
    'gti_step1_B_easy': {
      id: 'gti_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'sin²θ+cos²θ=1 을 적어두면 cos²θ=1−sin²θ 처럼 바꿔 쓸 수 있어요. 이렇게 미리 적은 식 하나가 다음 계산의 길을 열어줘요. 항등식부터 적는 습관이 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step1_exit',
    },
    'gti_step1_B_check': {
      id: 'gti_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '삼각함수 값을 구하는 문제에서 가장 먼저 적어야 할 것은?',
      options: [
        { id: 'correct', text: 'sin²θ+cos²θ=1 같은 기본 항등식', isCorrect: true, nextNodeId: 'gti_step1_exit' },
        { id: 'wrong1',  text: '아무것도 적지 않고 바로 답', isCorrect: false, nextNodeId: 'gti_step1_B_remedy', weaknessId: 'g2_trig_identity' },
        { id: 'wrong2',  text: '문제의 숫자만 따로 적기', isCorrect: false, nextNodeId: 'gti_step1_B_remedy', weaknessId: 'g2_trig_identity' },
      ],
      dontKnowNextNodeId: 'gti_step1_B_easy',
    },
    'gti_step1_B_remedy': {
      id: 'gti_step1_B_remedy',
      kind: 'explain',
      title: '항등식이 출발점이에요',
      body: 'sin²θ+cos²θ=1 과 tanθ=sinθ/cosθ 를 먼저 적어두면 어떤 식으로든 바꿔 갈 수 있어요. 이걸 안 적으면 변환할 도구가 없어요. 항상 항등식부터 적어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step1_exit',
    },

    // ─────────── step1.C: "항등식은 특정 각도에서만 성립한다" ───────────
    'gti_step1_C_explain': {
      id: 'gti_step1_C_explain',
      kind: 'explain',
      title: '모든 각도에서 성립해요',
      body: 'sin²θ+cos²θ=1 같은 기본 항등식은 θ가 어떤 각도여도 항상 성립해요. 30도든 200도든 음수 각도든 똑같이 1 이 돼요. 그래서 각도를 모를 때도 마음 놓고 쓸 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step1_C_remedy',
      summary: '기본 항등식은 모든 각도에서 성립 — 특정 각도 제한 없음',
      triggers: [
        '특정 각도에서만 되는 거 아닌가요',
        '각도를 알아야 쓸 수 있나요',
        '항상 성립한다는 게 무슨 뜻이에요',
      ],
    },
    'gti_step1_C_check': {
      id: 'gti_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sin²θ+cos²θ=1 은 언제 성립할까요?',
      options: [
        { id: 'correct', text: '모든 각도 θ에서 항상', isCorrect: true, nextNodeId: 'gti_step1_exit' },
        { id: 'wrong1',  text: 'θ가 30도, 60도일 때만', isCorrect: false, nextNodeId: 'gti_step1_C_remedy', weaknessId: 'g2_trig_identity' },
        { id: 'wrong2',  text: 'θ가 양수일 때만', isCorrect: false, nextNodeId: 'gti_step1_C_remedy', weaknessId: 'g2_trig_identity' },
      ],
      dontKnowNextNodeId: 'gti_step1_C_remedy',
    },
    'gti_step1_C_remedy': {
      id: 'gti_step1_C_remedy',
      kind: 'explain',
      title: '각도와 무관하게 항상 1',
      body: 'sin²θ+cos²θ 는 θ가 무엇이든 결과가 1 이에요. 그래서 각도가 안 나와 있어도 이 식을 그대로 쓸 수 있어요. 이게 항등식이 강력한 이유예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step1_exit',
    },

    'gti_step1_exit': { id: 'gti_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 치환 방향 결정 (하나의 함수로 통일 / tan 변환)
    //   B: "항상 tanθ로 변환해야 한다"
    //   C: "치환 없이 원형을 유지해야 한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "항상 tanθ로 변환해야 한다" ───────────
    'gti_step2_B_explain': {
      id: 'gti_step2_B_explain',
      kind: 'explain',
      title: 'tan이 늘 유리하진 않아요',
      body: 'tanθ로 바꾸는 게 편할 때도 있지만 항상 그렇진 않아요. 식에 sin²θ 처럼 제곱이 섞여 있으면 sin 이나 cos 하나로 통일하는 게 더 쉬워요. 식의 모양을 보고 어디로 통일할지 골라야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step2_B_easy',
      summary: 'tan 변환이 늘 유리한 건 아님 — 식 모양 보고 sin/cos/tan 중 통일 방향 선택',
      triggers: [
        '무조건 tan으로 바꾸면 되는 거 아닌가요',
        '왜 tan이 안 좋을 때가 있어요',
        '어느 함수로 통일할지 모르겠어요',
      ],
    },
    'gti_step2_B_easy': {
      id: 'gti_step2_B_easy',
      kind: 'explain',
      title: '예시로 봐요',
      body: '1−cos²θ 가 보이면 이건 sin²θ 와 같아요(항등식). 여기서 굳이 tan으로 바꾸면 식이 더 복잡해져요. sin 으로 통일하니 단번에 정리됐죠.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step2_exit',
    },
    'gti_step2_B_check': {
      id: 'gti_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '1−cos²θ 가 들어 있는 식을 단순화할 때 가장 자연스러운 방법은?',
      options: [
        { id: 'correct', text: 'sin²θ 로 바꿔서 sin 으로 통일', isCorrect: true, nextNodeId: 'gti_step2_exit' },
        { id: 'wrong1',  text: '무조건 tanθ 로 변환', isCorrect: false, nextNodeId: 'gti_step2_B_remedy', weaknessId: 'g2_trig_identity' },
        { id: 'wrong2',  text: '그대로 두고 계산', isCorrect: false, nextNodeId: 'gti_step2_B_remedy', weaknessId: 'g2_trig_identity' },
      ],
      dontKnowNextNodeId: 'gti_step2_B_easy',
    },
    'gti_step2_B_remedy': {
      id: 'gti_step2_B_remedy',
      kind: 'explain',
      title: '모양에 맞춰 골라요',
      body: '1−cos²θ 는 sin²θ 와 같으니 sin 하나로 통일하면 끝나요. tan으로 바꾸면 분수가 생겨 더 복잡해져요. 식 모양을 보고 통일 방향을 정하는 게 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step2_exit',
    },

    // ─────────── step2.C: "치환 없이 원형을 유지해야 한다" ───────────
    'gti_step2_C_explain': {
      id: 'gti_step2_C_explain',
      kind: 'explain',
      title: '치환으로 단순하게 만들어요',
      body: '치환(값을 다른 같은 값으로 자리에 바꿔 넣기)을 안 하고 그대로 두면 식이 더 풀기 어려워져요. 항등식을 써서 한 가지 함수로 모으면 익숙한 모양이 돼요. 단순화하는 게 자연스러운 흐름이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step2_C_remedy',
      summary: '원형 유지보다 항등식 치환으로 한 함수로 모아 단순화하는 게 자연스러움',
      triggers: [
        '그대로 두면 안 되나요',
        '왜 굳이 바꿔야 해요',
        '치환이 뭔지 모르겠어요',
      ],
    },
    'gti_step2_C_check': {
      id: 'gti_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'sin²θ 와 cos²θ 가 섞인 식을 더 쉽게 풀려면?',
      options: [
        { id: 'correct', text: '항등식으로 한 함수로 통일', isCorrect: true, nextNodeId: 'gti_step2_exit' },
        { id: 'wrong1',  text: '원형 그대로 두고 계산', isCorrect: false, nextNodeId: 'gti_step2_C_remedy', weaknessId: 'g2_trig_identity' },
        { id: 'wrong2',  text: '숫자만 따로 빼서 계산', isCorrect: false, nextNodeId: 'gti_step2_C_remedy', weaknessId: 'g2_trig_identity' },
      ],
      dontKnowNextNodeId: 'gti_step2_C_remedy',
    },
    'gti_step2_C_remedy': {
      id: 'gti_step2_C_remedy',
      kind: 'explain',
      title: '바꿔야 길이 열려요',
      body: 'cos²θ 를 1−sin²θ 로 자리에 바꿔 넣으면 식이 sin 하나로 모여요. 그대로 두면 두 함수가 엉켜 풀리지 않아요. 치환은 식을 단순하게 만드는 도구예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step2_exit',
    },

    'gti_step2_exit': { id: 'gti_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 변환 후 계산 (치환 후 인수분해·간소화)
    //   B: "치환 후 바로 답이 나온다"
    //   C: "변환 후에도 항등식을 다시 쓴다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "치환 후 바로 답이 나온다" ───────────
    'gti_step3_B_explain': {
      id: 'gti_step3_B_explain',
      kind: 'explain',
      title: '치환 뒤에도 정리가 남아요',
      body: '치환을 했다고 바로 답이 나오진 않아요. 치환 뒤에는 인수분해(여러 덩어리를 곱으로 쪼개기)나 간소화 같은 익숙한 처리가 한 번 더 이어져야 해요. 마지막 계산을 마무리해야 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step3_B_easy',
      summary: '치환 후 바로 답 아님 — 인수분해·간소화 등 마무리 계산이 더 필요',
      triggers: [
        '치환하면 바로 답 아닌가요',
        '왜 또 계산해야 해요',
        '어디서 끝나는지 모르겠어요',
      ],
    },
    'gti_step3_B_easy': {
      id: 'gti_step3_B_easy',
      kind: 'explain',
      title: '예시로 봐요',
      body: 'sin²θ+sinθ·cosθ 를 sinθ(sinθ+cosθ) 로 인수분해(공통인 sinθ 를 밖으로 묶기)하면 그제야 값이 보여요. 치환만으로는 여기까지 못 와요. 한 단계 더 정리해야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step3_exit',
    },
    'gti_step3_B_check': {
      id: 'gti_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '치환을 끝낸 뒤 바로 이어서 해야 할 일은?',
      options: [
        { id: 'correct', text: '인수분해·간소화로 식 마무리', isCorrect: true, nextNodeId: 'gti_step3_exit' },
        { id: 'wrong1',  text: '치환했으니 바로 답 적기', isCorrect: false, nextNodeId: 'gti_step3_B_remedy', weaknessId: 'g2_trig_identity' },
        { id: 'wrong2',  text: '처음 식으로 되돌리기', isCorrect: false, nextNodeId: 'gti_step3_B_remedy', weaknessId: 'g2_trig_identity' },
      ],
      dontKnowNextNodeId: 'gti_step3_B_easy',
    },
    'gti_step3_B_remedy': {
      id: 'gti_step3_B_remedy',
      kind: 'explain',
      title: '마무리가 답을 만들어요',
      body: '치환은 식을 다루기 쉬운 모양으로 바꿔준 것뿐이에요. sinθ(sinθ+cosθ) 처럼 인수분해하거나 간소화해야 비로소 값이 나와요. 마지막 정리를 빼먹지 마세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step3_exit',
    },

    // ─────────── step3.C: "변환 후에도 항등식을 다시 쓴다" ───────────
    'gti_step3_C_explain': {
      id: 'gti_step3_C_explain',
      kind: 'explain',
      title: '보통 한 번 변환이면 충분해요',
      body: '항등식으로 한 번 통일했으면 보통은 그걸로 충분해요. 다시 항등식을 또 쓰면 식이 오히려 더 복잡해져요. 변환 후에는 인수분해나 간소화로 마무리하는 게 자연스러워요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step3_C_remedy',
      summary: '한 번 변환이면 보통 충분 — 다시 항등식 쓰면 복잡해짐, 인수분해·간소화로 마무리',
      triggers: [
        '항등식을 또 써야 하는 거 아닌가요',
        '변환을 여러 번 해야 하나요',
        '언제까지 항등식을 쓰는지',
      ],
    },
    'gti_step3_C_check': {
      id: 'gti_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '항등식으로 한 함수로 통일한 다음 보통 이어지는 처리는?',
      options: [
        { id: 'correct', text: '인수분해·간소화로 마무리', isCorrect: true, nextNodeId: 'gti_step3_exit' },
        { id: 'wrong1',  text: '항등식을 다시 한 번 적용', isCorrect: false, nextNodeId: 'gti_step3_C_remedy', weaknessId: 'g2_trig_identity' },
        { id: 'wrong2',  text: '처음 식으로 되돌리기', isCorrect: false, nextNodeId: 'gti_step3_C_remedy', weaknessId: 'g2_trig_identity' },
      ],
      dontKnowNextNodeId: 'gti_step3_C_remedy',
    },
    'gti_step3_C_remedy': {
      id: 'gti_step3_C_remedy',
      kind: 'explain',
      title: '두 번 변환은 식을 꼬아요',
      body: '한 함수로 통일한 식에 항등식을 또 쓰면 다시 두 함수가 섞여 더 어려워져요. 통일 뒤에는 인수분해나 간소화로 곧장 마무리해요. 항등식을 다시 쓰는 건 식이 정말 복잡할 때만이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gti_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gti_step3_exit',
    },

    'gti_step3_exit': { id: 'gti_step3_exit', kind: 'exit' },
  },
};
