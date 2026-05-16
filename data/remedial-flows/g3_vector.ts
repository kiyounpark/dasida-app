import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3v_step<N>_<choice>_<role>
// 약점 prefix: g3v
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 성분, 크기, 내적, 스칼라, 수직 등 단원 안 세부 용어 첫 등장 시 한 줄 정의 동봉.

export const g3_vector_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 벡터 크기 |a⃗| = √(a₁²+a₂²)
    //   B: "각 성분을 더한 뒤 제곱근을 취한다" (제곱 빠짐)
    //   C: "성분 중 큰 값이 크기가 된다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "각 성분을 더한 뒤 제곱근을 취한다" ───────────
    'g3v_step1_B_explain': {
      id: 'g3v_step1_B_explain',
      kind: 'explain',
      title: '제곱이 한 번 들어가야 해요',
      body: '성분(벡터를 가로·세로 두 숫자로 적은 값, 예: a⃗=(3,4))을 그냥 더하고 제곱근만 씌우면 길이가 안 나와요. 크기(원점에서 끝점까지의 길이)는 |a⃗|=√(a₁²+a₂²) 처럼 먼저 각 성분을 제곱해서 더한 다음 제곱근을 취해요. 직각삼각형의 빗변을 구하는 것과 똑같은 흐름이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step1_B_easy',
      summary: '벡터 크기는 |a⃗|=√(a₁²+a₂²) — 성분을 먼저 제곱해서 더한 뒤 제곱근',
      triggers: [
        '그냥 더하고 루트 씌우면 안 되나요',
        '제곱을 왜 해야 해요',
        '크기 구하는 순서가 헷갈려요',
      ],
    },
    'g3v_step1_B_easy': {
      id: 'g3v_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'a⃗=(3,4) 라면 3²+4²=9+16=25 를 먼저 만들고, 그다음 √25=5 가 크기예요. 만약 3+4=7 에 제곱근만 씌우면 √7 이 나와서 전혀 다른 값이 돼요. 제곱을 먼저 한다는 점만 기억하면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step1_exit',
    },
    'g3v_step1_B_check': {
      id: 'g3v_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a⃗=(6,8) 의 크기 |a⃗| 는?',
      options: [
        { id: 'correct', text: '10', isCorrect: true, nextNodeId: 'g3v_step1_exit' },
        { id: 'wrong1',  text: '14', isCorrect: false, nextNodeId: 'g3v_step1_B_remedy', weaknessId: 'g3_vector' },
        { id: 'wrong2',  text: '√14', isCorrect: false, nextNodeId: 'g3v_step1_B_remedy', weaknessId: 'g3_vector' },
      ],
      dontKnowNextNodeId: 'g3v_step1_B_easy',
    },
    'g3v_step1_B_remedy': {
      id: 'g3v_step1_B_remedy',
      kind: 'explain',
      title: '36+64=100 → √100=10',
      body: '6²=36, 8²=64 를 먼저 더하면 100 이에요. 그다음 √100=10 이 크기예요. 6+8=14 처럼 더하기만 하면 제곱 단계를 건너뛴 거라 답이 어긋나요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step1_exit',
    },

    // ─────────── step1.C: "성분 중 큰 값이 크기가 된다" ───────────
    'g3v_step1_C_explain': {
      id: 'g3v_step1_C_explain',
      kind: 'explain',
      title: '두 성분이 함께 길이를 만들어요',
      body: '큰 성분 하나만으로는 크기가 정해지지 않아요. 두 성분이 직각삼각형의 두 변처럼 같이 작용해서 빗변 길이가 결정돼요. 그래서 |a⃗|=√(a₁²+a₂²) 에 두 값을 모두 넣어야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step1_B_easy',
      summary: '벡터 크기는 두 성분이 함께 결정 — 큰 성분 하나만으로는 못 구함',
      triggers: [
        '큰 숫자가 크기 아니에요',
        '작은 성분은 무시해도 되나요',
        '왜 둘 다 써야 해요',
      ],
    },
    'g3v_step1_C_check': {
      id: 'g3v_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a⃗=(5,12) 의 크기 |a⃗| 는?',
      options: [
        { id: 'correct', text: '13', isCorrect: true, nextNodeId: 'g3v_step1_exit' },
        { id: 'wrong1',  text: '12', isCorrect: false, nextNodeId: 'g3v_step1_C_remedy', weaknessId: 'g3_vector' },
        { id: 'wrong2',  text: '17', isCorrect: false, nextNodeId: 'g3v_step1_C_remedy', weaknessId: 'g3_vector' },
      ],
      dontKnowNextNodeId: 'g3v_step1_B_easy',
    },
    'g3v_step1_C_remedy': {
      id: 'g3v_step1_C_remedy',
      kind: 'explain',
      title: '5²+12²=169 → √169=13',
      body: '큰 성분 12 만 보면 답을 12 로 적게 돼요. 하지만 5²=25, 12²=144 를 더하면 169 이고 √169=13 이 크기예요. 작은 성분 5 도 길이에 분명히 보태진다는 걸 알 수 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step1_exit',
    },

    'g3v_step1_exit': { id: 'g3v_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 벡터 내적 a⃗·b⃗ = a₁b₁+a₂b₂
    //   B: "같은 위치 성분끼리 더한 뒤 곱한다" (순서 뒤바뀜)
    //   C: "내적의 결과는 벡터이다" (스칼라/벡터 혼동)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "같은 위치 성분끼리 더한 뒤 곱한다" ───────────
    'g3v_step2_B_explain': {
      id: 'g3v_step2_B_explain',
      kind: 'explain',
      title: '곱한 다음 더해요',
      body: '내적(두 벡터를 짝지어 하나의 수로 만드는 연산)은 a⃗·b⃗=a₁b₁+a₂b₂ 예요. 같은 자리의 성분끼리 먼저 곱하고, 그 결과들을 마지막에 더해요. 더하기를 먼저 하면 완전히 다른 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step2_B_easy',
      summary: '내적 = a₁b₁+a₂b₂ — 같은 자리끼리 곱한 뒤 더함 (순서 중요)',
      triggers: [
        '더하고 곱하는 거 아니었나요',
        '곱하기 더하기 순서가 헷갈려요',
        '내적 계산 순서를 모르겠어요',
      ],
    },
    'g3v_step2_B_easy': {
      id: 'g3v_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'a⃗=(2,3), b⃗=(4,1) 이면 2×4=8, 3×1=3 을 먼저 만들고 8+3=11 이 내적이에요. 만약 (2+4)×(3+1)=24 처럼 더하기를 먼저 하면 답이 완전히 달라져요. 곱하기가 먼저예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step2_exit',
    },
    'g3v_step2_B_check': {
      id: 'g3v_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a⃗=(3,2), b⃗=(5,4) 일 때 내적 a⃗·b⃗ 는?',
      options: [
        { id: 'correct', text: '23', isCorrect: true, nextNodeId: 'g3v_step2_exit' },
        { id: 'wrong1',  text: '48', isCorrect: false, nextNodeId: 'g3v_step2_B_remedy', weaknessId: 'g3_vector' },
        { id: 'wrong2',  text: '14', isCorrect: false, nextNodeId: 'g3v_step2_B_remedy', weaknessId: 'g3_vector' },
      ],
      dontKnowNextNodeId: 'g3v_step2_B_easy',
    },
    'g3v_step2_B_remedy': {
      id: 'g3v_step2_B_remedy',
      kind: 'explain',
      title: '3×5+2×4 = 15+8 = 23',
      body: '같은 자리끼리 곱하면 3×5=15, 2×4=8 이에요. 이 둘을 더하면 15+8=23 이 내적이에요. (3+5)×(2+4)=48 처럼 더하기를 먼저 하면 다른 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step2_exit',
    },

    // ─────────── step2.C: "내적의 결과는 벡터이다" ───────────
    'g3v_step2_C_explain': {
      id: 'g3v_step2_C_explain',
      kind: 'explain',
      title: '내적의 답은 수 하나예요',
      body: '내적의 결과는 스칼라(방향 없이 크기만 있는 보통의 수)예요. 성분끼리 곱한 값을 다 더하면 숫자 하나로 끝나서 화살표(벡터)가 아니에요. 벡터가 나오는 건 내적이 아닌 다른 연산이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step2_B_easy',
      summary: '내적의 결과는 스칼라(수 하나) — 벡터가 아님',
      triggers: [
        '내적하면 벡터 나오는 거 아니에요',
        '결과가 화살표인 줄 알았어요',
        '스칼라랑 벡터가 헷갈려요',
      ],
    },
    'g3v_step2_C_check': {
      id: 'g3v_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a⃗=(1,2), b⃗=(3,4) 의 내적 a⃗·b⃗ 의 결과는?',
      options: [
        { id: 'correct', text: '11 (수 하나)', isCorrect: true, nextNodeId: 'g3v_step2_exit' },
        { id: 'wrong1',  text: '(3,8) (벡터)', isCorrect: false, nextNodeId: 'g3v_step2_C_remedy', weaknessId: 'g3_vector' },
        { id: 'wrong2',  text: '(4,6) (벡터)', isCorrect: false, nextNodeId: 'g3v_step2_C_remedy', weaknessId: 'g3_vector' },
      ],
      dontKnowNextNodeId: 'g3v_step2_B_easy',
    },
    'g3v_step2_C_remedy': {
      id: 'g3v_step2_C_remedy',
      kind: 'explain',
      title: '1×3+2×4 = 11 (수 하나)',
      body: '1×3=3, 2×4=8 을 더하면 11 이라는 수 하나로 끝나요. 성분이 두 개씩 짝지어 합쳐지면서 화살표가 사라져요. 그래서 내적의 답은 스칼라(보통의 수)예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step2_exit',
    },

    'g3v_step2_exit': { id: 'g3v_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 내적과 각도 a⃗·b⃗ = |a⃗||b⃗|cosθ, 내적 0 → 수직
    //   B: "내적이 0이면 두 벡터는 평행이다"
    //   C: "내적이 양수면 두 벡터는 반대 방향이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "내적이 0이면 두 벡터는 평행이다" ───────────
    'g3v_step3_B_explain': {
      id: 'g3v_step3_B_explain',
      kind: 'explain',
      title: '내적 0 은 수직 신호예요',
      body: '내적은 a⃗·b⃗=|a⃗||b⃗|cosθ 인데, 이 값이 0 이 되려면 cosθ 가 0 이어야 해요. cosθ=0 은 θ=90°, 즉 두 벡터가 수직(직각으로 만남)이라는 뜻이에요. 평행(같은 방향으로 나란함)이면 cosθ 가 ±1 이라 내적이 0 이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step3_B_easy',
      summary: '내적 0 → cosθ=0 → θ=90° → 수직 (평행이 아님)',
      triggers: [
        '내적 0 이면 평행 아니에요',
        '수직인지 평행인지 헷갈려요',
        '0 이 무슨 뜻이에요',
      ],
    },
    'g3v_step3_B_easy': {
      id: 'g3v_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'a⃗=(1,0), b⃗=(0,1) 은 내적이 1×0+0×1=0 이에요. 이 두 화살표는 가로와 세로라서 직각으로 만나요, 즉 수직이에요. 평행이라면 같은 방향이라 내적이 0 이 될 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step3_exit',
    },
    'g3v_step3_B_check': {
      id: 'g3v_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'a⃗·b⃗=0 일 때 두 벡터가 이루는 각 θ 는?',
      options: [
        { id: 'correct', text: '90° (수직)', isCorrect: true, nextNodeId: 'g3v_step3_exit' },
        { id: 'wrong1',  text: '0° (평행)', isCorrect: false, nextNodeId: 'g3v_step3_B_remedy', weaknessId: 'g3_vector' },
        { id: 'wrong2',  text: '180° (반대 방향)', isCorrect: false, nextNodeId: 'g3v_step3_B_remedy', weaknessId: 'g3_vector' },
      ],
      dontKnowNextNodeId: 'g3v_step3_B_easy',
    },
    'g3v_step3_B_remedy': {
      id: 'g3v_step3_B_remedy',
      kind: 'explain',
      title: 'cosθ=0 → θ=90°',
      body: '내적이 0 이면 |a⃗||b⃗|cosθ=0 이라 cosθ=0 이에요. cos 값이 0 이 되는 각은 90° 라서 두 벡터는 수직이에요. 0° 나 180° 는 평행·반대 방향이라 내적이 0 이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step3_exit',
    },

    // ─────────── step3.C: "내적이 양수면 두 벡터는 반대 방향이다" ───────────
    'g3v_step3_C_explain': {
      id: 'g3v_step3_C_explain',
      kind: 'explain',
      title: '양수 내적은 예각이에요',
      body: 'a⃗·b⃗=|a⃗||b⃗|cosθ 에서 크기는 항상 양수라서, 내적의 부호는 cosθ 의 부호와 같아요. 내적이 양수면 cosθ 가 양수이고, 이때 각 θ 는 예각(90°보다 작은 각)이라 두 벡터가 비슷한 방향을 가리켜요. 반대 방향이면 cosθ 가 음수라 내적이 음수가 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step3_B_easy',
      summary: '내적 양수 → cosθ 양수 → 예각 (반대 방향이 아님, 반대면 음수)',
      triggers: [
        '양수면 반대 방향 아니에요',
        '부호가 무슨 뜻이에요',
        '예각인지 둔각인지 헷갈려요',
      ],
    },
    'g3v_step3_C_check': {
      id: 'g3v_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '두 벡터의 내적이 양수일 때, 두 벡터가 이루는 각은?',
      options: [
        { id: 'correct', text: '예각 (90°보다 작음)', isCorrect: true, nextNodeId: 'g3v_step3_exit' },
        { id: 'wrong1',  text: '180° (반대 방향)', isCorrect: false, nextNodeId: 'g3v_step3_C_remedy', weaknessId: 'g3_vector' },
        { id: 'wrong2',  text: '90° (수직)', isCorrect: false, nextNodeId: 'g3v_step3_C_remedy', weaknessId: 'g3_vector' },
      ],
      dontKnowNextNodeId: 'g3v_step3_B_easy',
    },
    'g3v_step3_C_remedy': {
      id: 'g3v_step3_C_remedy',
      kind: 'explain',
      title: '양수면 cosθ 양수 → 예각',
      body: '크기는 늘 양수라 내적의 부호는 cosθ 부호와 같아요. 내적이 양수면 cosθ 도 양수라 각이 예각이에요. 반대 방향(180°)이면 cosθ=−1 이라 내적이 음수가 되니 양수일 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3v_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3v_step3_exit',
    },

    'g3v_step3_exit': { id: 'g3v_step3_exit', kind: 'exit' },
  },
};
