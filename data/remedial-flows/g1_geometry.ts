import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g1g_step<N>_<choice>_<role>
// 약점 prefix: g1g
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 빗변, 대변, 밑변, 보조선, 삼각비, 닮음비 등 단원 안 세부 용어 첫 등장 시 한 줄 정의 동봉.

export const g1_geometry_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 직각삼각형 찾기 (보조선으로 직각 만들기)
    //   B: "모든 삼각형에 바로 삼각비를 적용한다"
    //   C: "직각이 없어도 피타고라스 정리를 쓸 수 있다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "모든 삼각형에 바로 삼각비를 적용한다" ───────────
    'g1g_step1_B_explain': {
      id: 'g1g_step1_B_explain',
      kind: 'explain',
      title: '삼각비는 직각이 있어야 써요',
      body: '삼각비(sin·cos·tan 처럼 변끼리의 비를 나타내는 값)는 직각삼각형(한 각이 90°인 삼각형)에서만 바로 쓸 수 있어요. 직각이 없는 삼각형이면 보조선(문제에 없던 선을 새로 그어 도형을 쪼개는 선)을 그어 직각을 먼저 만들어야 해요. 직각을 만든 뒤에야 삼각비가 작동해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step1_B_easy',
      summary: '삼각비는 직각삼각형에서만 바로 적용 — 직각 없으면 보조선으로 직각부터 만들기',
      triggers: [
        '아무 삼각형에나 사인 쓰면 되는 거 아닌가요',
        '직각이 꼭 있어야 하나요',
        '보조선을 왜 그어요',
      ],
    },
    'g1g_step1_B_easy': {
      id: 'g1g_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: '비스듬한 삼각형에서 한 꼭짓점에서 마주 보는 변으로 수선(직각이 되게 내리 긋는 선)을 내리면 직각삼각형 두 개가 생겨요. 그제서야 sin·cos 를 쓸 수 있어요. 직각이 안 보이면 보조선부터 떠올리세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step1_exit',
    },
    'g1g_step1_B_check': {
      id: 'g1g_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '직각이 없는 삼각형에서 변의 길이를 삼각비로 구하려면 가장 먼저 무엇을 해야 할까요?',
      options: [
        { id: 'correct', text: '보조선을 그어 직각삼각형을 만든다', isCorrect: true, nextNodeId: 'g1g_step1_exit' },
        { id: 'wrong1',  text: '그냥 바로 sin 을 적용한다',        isCorrect: false, nextNodeId: 'g1g_step1_B_remedy', weaknessId: 'g1_geometry' },
        { id: 'wrong2',  text: '가장 긴 변을 빗변으로 정한다',       isCorrect: false, nextNodeId: 'g1g_step1_B_remedy', weaknessId: 'g1_geometry' },
      ],
      dontKnowNextNodeId: 'g1g_step1_B_easy',
    },
    'g1g_step1_B_remedy': {
      id: 'g1g_step1_B_remedy',
      kind: 'explain',
      title: '직각부터 만들고 시작해요',
      body: '직각이 없으면 sin·cos 의 비 자체가 정의되지 않아요. 그래서 보조선을 그어 직각삼각형을 먼저 만들어야 해요. 직각을 확보한 다음에 삼각비를 쓰세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step1_exit',
    },

    // ─────────── step1.C: "직각이 없어도 피타고라스 정리를 쓸 수 있다" ───────────
    'g1g_step1_C_explain': {
      id: 'g1g_step1_C_explain',
      kind: 'explain',
      title: '피타고라스 정리는 직각 전용이에요',
      body: '피타고라스 정리(직각삼각형에서 두 변의 제곱을 더하면 빗변의 제곱이 된다는 규칙)는 직각이 있을 때만 성립해요. 빗변(직각과 마주 보는 가장 긴 변)이 정해지려면 먼저 직각이 있어야 해요. 직각이 없으면 보조선으로 직각삼각형을 만들고 나서 적용해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step1_B_easy',
      summary: '피타고라스 정리는 직각삼각형에서만 성립 — 직각이 있어야 빗변이 정해짐',
      triggers: [
        '피타고라스는 아무 삼각형에나 되는 거 아닌가요',
        '직각이 꼭 필요한가요',
        '빗변이 어느 변이에요',
      ],
    },
    'g1g_step1_C_check': {
      id: 'g1g_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a²+b²=c² 을 바로 쓸 수 있는 삼각형은 어떤 삼각형일까요?',
      options: [
        { id: 'correct', text: '직각이 있는 삼각형',     isCorrect: true, nextNodeId: 'g1g_step1_exit' },
        { id: 'wrong1',  text: '모든 삼각형',            isCorrect: false, nextNodeId: 'g1g_step1_C_remedy', weaknessId: 'g1_geometry' },
        { id: 'wrong2',  text: '세 변이 모두 같은 삼각형', isCorrect: false, nextNodeId: 'g1g_step1_C_remedy', weaknessId: 'g1_geometry' },
      ],
      dontKnowNextNodeId: 'g1g_step1_B_easy',
    },
    'g1g_step1_C_remedy': {
      id: 'g1g_step1_C_remedy',
      kind: 'explain',
      title: '직각이 있어야 빗변이 생겨요',
      body: '피타고라스 정리의 c 는 빗변이고, 빗변은 직각과 마주 보는 변이에요. 직각이 없으면 빗변 자체를 정할 수 없어서 정리를 쓸 수 없어요. 직각삼각형일 때만 a²+b²=c² 를 적용하세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step1_exit',
    },

    'g1g_step1_exit': { id: 'g1g_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 피타고라스 정리 적용 (a²+b²=c²)
    //   B: "두 변의 합 = 빗변"
    //   C: "빗변의 제곱 = 두 변의 제곱의 차"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "두 변의 합 = 빗변" ───────────
    'g1g_step2_B_explain': {
      id: 'g1g_step2_B_explain',
      kind: 'explain',
      title: '그냥 더하면 빗변이 아니에요',
      body: '피타고라스 정리는 두 변을 그대로 더하는 게 아니라, 각 변을 제곱해서 더한 값이 빗변의 제곱이 되는 규칙이에요. 즉 a²+b²=c² 이지 a+b=c 가 아니에요. 제곱을 한 뒤 더하고, 마지막에 제곱근을 풀어 빗변을 구해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step2_B_easy',
      summary: '빗변은 두 변의 단순 합이 아님 — 각 변을 제곱해 더한 값이 빗변의 제곱',
      triggers: [
        '두 변 더하면 빗변 아닌가요',
        '왜 제곱을 해요',
        'a+b=c 면 안 되나요',
      ],
    },
    'g1g_step2_B_easy': {
      id: 'g1g_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: '두 변이 3 과 4 라면 그냥 더한 7 이 빗변이 아니에요. 3²+4² = 9+16 = 25 이고, 25 의 제곱근인 5 가 빗변이에요. 더하기 전에 꼭 제곱부터 하세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step2_exit',
    },
    'g1g_step2_B_check': {
      id: 'g1g_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '직각을 낀 두 변이 6 과 8 일 때 빗변의 길이는?',
      options: [
        { id: 'correct', text: '10', isCorrect: true, nextNodeId: 'g1g_step2_exit' },
        { id: 'wrong1',  text: '14', isCorrect: false, nextNodeId: 'g1g_step2_B_remedy', weaknessId: 'g1_geometry' },
        { id: 'wrong2',  text: '48', isCorrect: false, nextNodeId: 'g1g_step2_B_remedy', weaknessId: 'g1_geometry' },
      ],
      dontKnowNextNodeId: 'g1g_step2_B_easy',
    },
    'g1g_step2_B_remedy': {
      id: 'g1g_step2_B_remedy',
      kind: 'explain',
      title: '6²+8² = 100 → 빗변 10',
      body: '6²=36, 8²=64 이고 36+64 = 100 이에요. 100 의 제곱근이 10 이라 빗변은 10 이에요. 6+8=14 처럼 그냥 더하면 빗변이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step2_exit',
    },

    // ─────────── step2.C: "빗변의 제곱 = 두 변의 제곱의 차" ───────────
    'g1g_step2_C_explain': {
      id: 'g1g_step2_C_explain',
      kind: 'explain',
      title: '차가 아니라 합이에요',
      body: '빗변의 제곱은 직각을 낀 두 변의 제곱을 더한 값이에요. 빼는 게 아니라 더하는 거라서 c²=a²+b² 예요. 부호 하나가 바뀌면 답이 완전히 달라지니 항상 더하기로 기억하세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step2_B_easy',
      summary: '빗변의 제곱 = 두 변 제곱의 합 (차가 아님) — c²=a²+b²',
      triggers: [
        '더하기였나요 빼기였나요',
        '왜 차가 아니에요',
        '부호가 헷갈려요',
      ],
    },
    'g1g_step2_C_check': {
      id: 'g1g_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '직각을 낀 두 변이 5 와 12 일 때 빗변의 길이는?',
      options: [
        { id: 'correct', text: '13',   isCorrect: true, nextNodeId: 'g1g_step2_exit' },
        { id: 'wrong1',  text: '√119', isCorrect: false, nextNodeId: 'g1g_step2_C_remedy', weaknessId: 'g1_geometry' },
        { id: 'wrong2',  text: '7',    isCorrect: false, nextNodeId: 'g1g_step2_C_remedy', weaknessId: 'g1_geometry' },
      ],
      dontKnowNextNodeId: 'g1g_step2_B_easy',
    },
    'g1g_step2_C_remedy': {
      id: 'g1g_step2_C_remedy',
      kind: 'explain',
      title: '5²+12² = 169 → 빗변 13',
      body: '5²=25, 12²=144 이고 두 값을 더하면 169 예요. 169 의 제곱근이 13 이라 빗변은 13 이에요. 144−25 처럼 빼면 다른 곡선의 답처럼 완전히 틀린 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step2_exit',
    },

    'g1g_step2_exit': { id: 'g1g_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 삼각비로 변의 길이·넓이 계산
    //   B: "sinθ=밑변/빗변이다"
    //   C: "각도만 알면 변의 길이를 구할 수 있다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "sinθ=밑변/빗변이다" ───────────
    'g1g_step3_B_explain': {
      id: 'g1g_step3_B_explain',
      kind: 'explain',
      title: 'sin 은 대변과 빗변의 비예요',
      body: 'sinθ 는 각 θ 와 마주 보는 변인 대변(각의 맞은편 변)을 빗변으로 나눈 값이에요. 밑변(각이 붙어 있는 아래쪽 변)을 빗변으로 나누는 건 sin 이 아니라 cos 예요. 어느 변이 대변인지 먼저 확인하면 헷갈리지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step3_B_easy',
      summary: 'sinθ = 대변/빗변, cosθ = 밑변/빗변 — 대변과 밑변을 먼저 구분',
      triggers: [
        'sin 이 밑변이었나요 대변이었나요',
        'sin 이랑 cos 가 헷갈려요',
        '대변이 어느 변이에요',
      ],
    },
    'g1g_step3_B_easy': {
      id: 'g1g_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: '각 θ 에서 멀리 마주 보는 변이 대변, 바로 옆에 붙은 변이 밑변이에요. sin 은 대변/빗변, cos 는 밑변/빗변 이에요. "사인은 마주 보는 변"으로 기억하면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step3_exit',
    },
    'g1g_step3_B_check': {
      id: 'g1g_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '빗변이 10, θ=30° 인 직각삼각형에서 θ 의 대변(높이)의 길이는? (sin30°=1/2)',
      options: [
        { id: 'correct', text: '5',  isCorrect: true, nextNodeId: 'g1g_step3_exit' },
        { id: 'wrong1',  text: '20', isCorrect: false, nextNodeId: 'g1g_step3_B_remedy', weaknessId: 'g1_geometry' },
        { id: 'wrong2',  text: '10', isCorrect: false, nextNodeId: 'g1g_step3_B_remedy', weaknessId: 'g1_geometry' },
      ],
      dontKnowNextNodeId: 'g1g_step3_B_easy',
    },
    'g1g_step3_B_remedy': {
      id: 'g1g_step3_B_remedy',
      kind: 'explain',
      title: '대변 = 빗변 × sinθ',
      body: 'sinθ = 대변/빗변 이므로 대변 = 빗변 × sinθ 예요. 빗변 10 에 sin30° = 1/2 를 곱하면 대변은 5 예요. 밑변/빗변 으로 풀면 cos 값이라 다른 변이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step3_exit',
    },

    // ─────────── step3.C: "각도만 알면 변의 길이를 구할 수 있다" ───────────
    'g1g_step3_C_explain': {
      id: 'g1g_step3_C_explain',
      kind: 'explain',
      title: '각도만으로는 비율만 정해져요',
      body: '각도 하나만 알면 변끼리의 비(나누어 얻은 값)만 정해지고 실제 길이는 정해지지 않아요. 한 변 이상의 실제 길이가 같이 주어져야 나머지 변의 값을 구할 수 있어요. 그래서 문제에 길이가 하나는 있는지 먼저 찾아야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step3_B_easy',
      summary: '각도만으로는 변의 비만 정해짐 — 실제 길이는 한 변 이상이 주어져야 구함',
      triggers: [
        '각도만 알면 길이 나오는 거 아닌가요',
        '왜 변 길이가 또 필요해요',
        '비율이 무슨 뜻이에요',
      ],
    },
    'g1g_step3_C_check': {
      id: 'g1g_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '직각삼각형에서 한 각이 40° 라는 것만 알 때, 변의 실제 길이를 구할 수 있을까요?',
      options: [
        { id: 'correct', text: '아니다, 한 변의 길이가 더 필요하다', isCorrect: true, nextNodeId: 'g1g_step3_exit' },
        { id: 'wrong1',  text: '그렇다, 각도만으로 다 구해진다',     isCorrect: false, nextNodeId: 'g1g_step3_C_remedy', weaknessId: 'g1_geometry' },
        { id: 'wrong2',  text: '그렇다, 직각이 있으니 충분하다',     isCorrect: false, nextNodeId: 'g1g_step3_C_remedy', weaknessId: 'g1_geometry' },
      ],
      dontKnowNextNodeId: 'g1g_step3_B_easy',
    },
    'g1g_step3_C_remedy': {
      id: 'g1g_step3_C_remedy',
      kind: 'explain',
      title: '길이 하나가 있어야 값이 나와요',
      body: '각도만 있으면 대변·밑변·빗변의 비율만 알 수 있어요. 예를 들어 빗변이 10 이라는 길이가 같이 있어야 대변 = 10 × sinθ 처럼 실제 값이 나와요. 길이가 하나도 없으면 비율에서 멈춰요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g1g_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g1g_step3_exit',
    },

    'g1g_step3_exit': { id: 'g1g_step3_exit', kind: 'exit' },
  },
};
