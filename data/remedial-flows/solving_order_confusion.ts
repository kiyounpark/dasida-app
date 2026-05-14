import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: soc_step<N>_<choice>_<role>
// 약점 prefix: soc (solving_order_confusion)
// 약점 정의: f'(x)=0으로 x를 구한 뒤 f(x)에 대입하는 순서가 누락
// 용어 통일: "도함수 f'(x)" = "기울기 식", "극값" = "극댓값/극솟값(꼭짓점의 함수값)",
//           "대입" = "값을 자리에 넣기", "방정식" = "='로 놓고 푸는 식"

export const solving_order_confusion_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 A ("f(x)=0으로 놓는다") 분기 ───────────
    'soc_step1_A_explain': {
      id: 'soc_step1_A_explain',
      kind: 'explain',
      title: "f(x)=0 과 f'(x)=0 은 달라요",
      body: "f(x) 는 원래 식, f'(x) (작은 따옴표 하나 붙은 것) 는 그 식을 미분해서 만든 기울기 식이에요. f(x)=0 은 그래프가 x 축에 닿는 자리, f'(x)=0 은 그래프 기울기가 0 인 자리 (극값 후보). 두 자리는 보통 달라요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step1_A_easy',
      summary: "극값 후보를 찾을 때는 f(x)=0 이 아니라 f'(x)=0 — 영점과 극값은 다른 개념",
      triggers: [
        'f(x)=0 으로 놓으면 되는 거 아닌가요',
        '왜 f-프라임을 0 으로 놓는지 모르겠어요',
        '영점이랑 극값이 헷갈려요',
      ],
    },
    'soc_step1_A_easy': {
      id: 'soc_step1_A_easy',
      kind: 'explain',
      title: '짧게 다시 한 번',
      body: '그래프 기울기가 0 이라는 건 그래프가 잠깐 평평해지는 자리예요. 거기서 그래프가 위로 갔다가 내려오거나(극대) 아래로 갔다가 올라가요(극소). 극값을 찾는 첫 단추는 그 평평해지는 자리, 즉 기울기 식이 0 인 곳을 찾는 일이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step1_exit',
    },
    'soc_step1_A_check': {
      id: 'soc_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x) = x³ − 3x 의 극값 후보 x 를 구하려면 어떤 식을 0 으로 놓아야 할까요?',
      options: [
        { id: 'correct', text: "f'(x) = 3x² − 3 = 0", isCorrect: true, nextNodeId: 'soc_step1_exit' },
        { id: 'wrong1',  text: 'f(x) = x³ − 3x = 0', isCorrect: false, nextNodeId: 'soc_step1_A_remedy', weaknessId: 'basic_concept_needed' },
        { id: 'wrong2',  text: "f''(x) = 6x = 0", isCorrect: false, nextNodeId: 'soc_step1_A_remedy', weaknessId: 'basic_concept_needed' },
      ],
      dontKnowNextNodeId: 'soc_step1_A_easy',
    },
    'soc_step1_A_remedy': {
      id: 'soc_step1_A_remedy',
      kind: 'explain',
      title: "f' = 0 이 정답이에요",
      body: "극값은 그래프가 잠깐 멈추는 자리, 즉 기울기가 0 인 자리예요. 기울기 식 f'(x) 를 0 으로 놓아야 그 자리를 찾을 수 있어요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step1_exit',
    },

    // ─────────── step1: 오답 C ("f''(x)=0으로 놓는다") 분기 ───────────
    'soc_step1_C_explain': {
      id: 'soc_step1_C_explain',
      kind: 'explain',
      title: 'f(0) 은 그래프의 시작값일 뿐이에요',
      body: '원래 식 f(x) 에 x=0 을 넣으면 그건 그래프가 y 축과 만나는 시작값(y 절편) 이에요. 극값(그래프가 가장 높거나 낮은 자리) 과는 다른 자리예요. 극값을 찾으려면 기울기 식 f\'(x) 를 0 으로 놓고 풀어야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step1_A_easy',
      summary: "f(0) = 그래프의 y 절편 (시작값), 극값과 다른 개념",
      triggers: [
        'x 에 0 을 넣으면 답 아닌가요',
        'f(0) 이 극값인 줄 알았어요',
        '그래프 시작값이 극값과 같지 않나요',
      ],
    },
    'soc_step1_C_check': {
      id: 'soc_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x) = x² − 4x + 1 의 극값 후보 x 를 구하려면 어떤 식을 0 으로 놓을까요?',
      options: [
        { id: 'correct', text: "f'(x) = 2x − 4 = 0", isCorrect: true, nextNodeId: 'soc_step1_exit' },
        { id: 'wrong1',  text: "f(0) = 1", isCorrect: false, nextNodeId: 'soc_step1_C_remedy', weaknessId: 'basic_concept_needed' },
        { id: 'wrong2',  text: "f(x) = x² − 4x + 1 = 0", isCorrect: false, nextNodeId: 'soc_step1_C_remedy', weaknessId: 'basic_concept_needed' },
      ],
      dontKnowNextNodeId: 'soc_step1_A_easy',
    },
    'soc_step1_C_remedy': {
      id: 'soc_step1_C_remedy',
      kind: 'explain',
      title: "f'(x)=0 이 정답",
      body: "극값 후보는 기울기가 0 인 자리예요. 그래서 f 를 한 번 미분한 f'(x) 를 0 으로 놓고 풀어야 해요. f(0) 은 시작값 (y 절편) 이고, f(x)=0 은 x 축 만나는 자리예요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step1_exit',
    },

    'soc_step1_exit': { id: 'soc_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 A ("x 값은 부호에 관계없이 하나다") 분기 ───────────
    'soc_step2_A_explain': {
      id: 'soc_step2_A_explain',
      kind: 'explain',
      title: '후보 x 는 여러 개일 수 있어요',
      body: "f'(x)=0 은 '=' 로 놓고 푸는 식 (방정식) 이에요. x² 처럼 제곱이 들어가면 답이 두 개 (양수와 음수 한 쌍) 나올 수 있어요. 그래서 ± 양쪽 다 챙겨야 빠뜨리지 않아요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step2_A_easy',
      summary: "f'(x)=0 의 해는 여러 개일 수 있음 — ± 모두 후보로 챙기기",
      triggers: [
        'x 가 하나만 나오는 거 아닌가요',
        '음수 해는 왜 챙겨요',
        '후보를 몇 개 적어야 할지 모르겠어요',
      ],
    },
    'soc_step2_A_easy': {
      id: 'soc_step2_A_easy',
      kind: 'explain',
      title: '예시로 보기',
      body: '3x² − 3 = 0 → x² = 1 → x = 1 또는 x = −1. 이렇게 ± 둘 다 답이에요. 한쪽만 적으면 극값 하나를 놓쳐요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step2_exit',
    },
    'soc_step2_A_check': {
      id: 'soc_step2_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: "f'(x) = x² − 4 = 0 의 해(극값 후보 x)는?",
      options: [
        { id: 'correct', text: 'x = 2 또는 x = −2', isCorrect: true, nextNodeId: 'soc_step2_exit' },
        { id: 'wrong1',  text: 'x = 2 하나뿐', isCorrect: false, nextNodeId: 'soc_step2_A_remedy', weaknessId: 'basic_concept_needed' },
        { id: 'wrong2',  text: 'x = 4', isCorrect: false, nextNodeId: 'soc_step2_A_remedy', weaknessId: 'basic_concept_needed' },
      ],
      dontKnowNextNodeId: 'soc_step2_A_easy',
    },
    'soc_step2_A_remedy': {
      id: 'soc_step2_A_remedy',
      kind: 'explain',
      title: '± 까지 챙겨요',
      body: 'x² = 4 라면 x = 2 와 x = −2 둘 다 답이에요. 둘을 모두 적어둬야 극댓값과 극솟값을 빠짐없이 검토할 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step2_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step2_exit',
    },

    // ─────────── step2: 오답 C ("x는 항상 양수만 구한다") 분기 ───────────
    'soc_step2_C_explain': {
      id: 'soc_step2_C_explain',
      kind: 'explain',
      title: '음수 해도 후보예요',
      body: '극값은 그래프 어디서든 생길 수 있어서, x 가 음수인 자리에서도 극댓값/극솟값이 나올 수 있어요. 부호로 미리 거르면 진짜 답을 빠뜨려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step2_A_easy',
      summary: '극값 후보 x 는 양수만이 아님 — 음수 해도 동일하게 후보로 둠',
      triggers: [
        '양수만 답이 되는 거 아닌가요',
        '음수 해는 버려도 되나요',
        '왜 마이너스도 챙겨요',
      ],
    },
    'soc_step2_C_check': {
      id: 'soc_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: "f'(x) = x² − 9 = 0 의 해 (극값 후보 x) 를 모두 고른다면?",
      options: [
        { id: 'correct', text: 'x = 3 과 x = −3 모두', isCorrect: true, nextNodeId: 'soc_step2_exit' },
        { id: 'wrong1',  text: 'x = 3 만', isCorrect: false, nextNodeId: 'soc_step2_C_remedy', weaknessId: 'basic_concept_needed' },
        { id: 'wrong2',  text: 'x = 9', isCorrect: false, nextNodeId: 'soc_step2_C_remedy', weaknessId: 'basic_concept_needed' },
      ],
      dontKnowNextNodeId: 'soc_step2_A_easy',
    },
    'soc_step2_C_remedy': {
      id: 'soc_step2_C_remedy',
      kind: 'explain',
      title: '둘 다 챙겨야 해요',
      body: 'x² = 9 라는 건 "어떤 수를 제곱했을 때 9 가 되느냐" 예요. 3·3 = 9 이고 (−3)·(−3) = 9 도 같이 9. 그래서 x = 3 과 x = −3 둘 다 답이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step2_exit',
    },

    'soc_step2_exit': { id: 'soc_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 A ("f'(x)에 x를 대입한다") 분기 ───────────
    'soc_step3_A_explain': {
      id: 'soc_step3_A_explain',
      kind: 'explain',
      title: "f' 가 아니라 f 에 넣어요",
      body: "후보 x 는 이미 f'(x) = 0 을 풀어 얻은 값이에요. 다시 f'(x) 에 넣어 봤자 0 만 나와요. 진짜 극값은 원래 함수 f(x) 에 그 x 를 넣어야 보여요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step3_A_easy',
      summary: "극값 = f(x) 에 후보 x 를 넣은 값. f'(x) 에 넣으면 0 만 나옴",
      triggers: [
        "f' 에 넣으면 안 되나요",
        '어떤 식에 대입해야 하는지 헷갈려요',
        '대입하면 0 만 나와요',
      ],
    },
    'soc_step3_A_easy': {
      id: 'soc_step3_A_easy',
      kind: 'explain',
      title: '예시로 보기',
      body: "f(x) = x³ − 3x, 후보 x = 1. f'(1) = 3 − 3 = 0 (당연히 0). 극값은 f(1) = 1 − 3 = −2 예요. 원래 f 에 넣어야 답이 나와요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step3_exit',
    },
    'soc_step3_A_check': {
      id: 'soc_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x) = x² − 4x + 1, 후보 x = 2 에서의 극값을 구하려면 어디에 대입할까요?',
      options: [
        { id: 'correct', text: 'f(x) 에 대입 → f(2) = 4 − 8 + 1 = −3', isCorrect: true, nextNodeId: 'soc_step3_exit' },
        { id: 'wrong1',  text: "f'(x) 에 대입 → 0", isCorrect: false, nextNodeId: 'soc_step3_A_remedy', weaknessId: 'basic_concept_needed' },
        { id: 'wrong2',  text: '대입하지 않는다', isCorrect: false, nextNodeId: 'soc_step3_A_remedy', weaknessId: 'basic_concept_needed' },
      ],
      dontKnowNextNodeId: 'soc_step3_A_easy',
    },
    'soc_step3_A_remedy': {
      id: 'soc_step3_A_remedy',
      kind: 'explain',
      title: '원래 함수 f 에 넣어요',
      body: "f'(−1) 은 무조건 0 이 나와요 (그래서 −1 이 후보였으니까요). 진짜 보고 싶은 값은 그 자리에서의 함수값 f(−1) 이에요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step3_exit',
    },

    // ─────────── step3: 오답 C ("대입 없이 x만 답으로 쓴다") 분기 ───────────
    'soc_step3_C_explain': {
      id: 'soc_step3_C_explain',
      kind: 'explain',
      title: 'x 는 위치, 극값은 그 자리의 높이예요',
      body: "후보 x 는 '극값이 어디서 생기는지' 알려주는 위치일 뿐이에요. 극값 자체는 그 자리에서의 그래프 높이, 즉 f(x) 의 값이라 한 번 더 대입해야 해요.",
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step3_A_easy',
      summary: 'x 는 위치(가로), 극값은 그 위치의 함수값(세로) — 대입 한 단계가 필수',
      triggers: [
        'x 가 곧 답인 줄 알았어요',
        '왜 또 대입해야 하는지',
        '극값이 x 인지 y 인지 헷갈려요',
      ],
    },
    'soc_step3_C_check': {
      id: 'soc_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x) = x³ − 3x 에서 x = 1 이 극값 후보예요. 극값(극솟값)은?',
      options: [
        { id: 'correct', text: 'f(1) = −2', isCorrect: true, nextNodeId: 'soc_step3_exit' },
        { id: 'wrong1',  text: 'x = 1', isCorrect: false, nextNodeId: 'soc_step3_C_remedy', weaknessId: 'basic_concept_needed' },
        { id: 'wrong2',  text: '0', isCorrect: false, nextNodeId: 'soc_step3_C_remedy', weaknessId: 'basic_concept_needed' },
      ],
      dontKnowNextNodeId: 'soc_step3_A_easy',
    },
    'soc_step3_C_remedy': {
      id: 'soc_step3_C_remedy',
      kind: 'explain',
      title: '대입해서 −2 가 답',
      body: 'f(1) = 1³ − 3·1 = −2. x = 1 은 그저 자리 표시고, 그 자리의 높이 −2 가 진짜 극값(여기서는 극솟값)이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'soc_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'soc_step3_exit',
    },

    'soc_step3_exit': { id: 'soc_step3_exit', kind: 'exit' },
  },
};
