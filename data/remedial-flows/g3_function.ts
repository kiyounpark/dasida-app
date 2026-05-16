import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3f_step<N>_<choice>_<role>
// 약점 prefix: g3f
// 구조: shallow (1-shot) — 6개 step × 오답 choice 2개씩 (총 12개 ExplainNode 진입점)
//   각 진입점: explain → check → (정답)exit / (오답)remedy → check 재시도
// 6등급 학생 기준 — 역함수, 합성함수, 일대일대응, 단사함수, 전사함수, 정의역, 치역 등
//   단원 안 세부 용어가 처음 등장할 때 한 줄 정의를 동봉.

export const g3_function_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 역함숫값 구하기 (f(a)=b 이면 f⁻¹(b)=a)
    //   B: "f⁻¹(b) 는 f(b) 를 다시 계산하면 된다"
    //   C: "f⁻¹(b) 는 1/f(b) 다" (역수로 착각)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "f⁻¹(b) 는 f(b) 를 다시 계산" ───────────
    'g3f_step1_B_explain': {
      id: 'g3f_step1_B_explain',
      kind: 'explain',
      title: '역함수는 화살표를 거꾸로 돌려요',
      body: '역함수(f⁻¹: 들어간 값과 나온 값을 서로 바꾼 함수)는 f가 a를 b로 보냈다면 b를 다시 a로 되돌려 줘요. 그래서 f(2)=5 이면 f⁻¹(5)=2 이고, f(5)를 새로 계산하는 게 아니라 5가 어디서 왔는지 찾는 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step1_B_easy',
      summary: 'f(a)=b 이면 f⁻¹(b)=a — 역함수는 결과를 다시 입력으로 되돌리는 것',
      triggers: [
        '역함수 값을 어떻게 구해요',
        'f를 다시 계산하면 되나요',
        'f⁻¹ 이 뭔지 헷갈려요',
      ],
    },
    'g3f_step1_B_easy': {
      id: 'g3f_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'f(3)=7 이라고 적혀 있으면, 7을 넣어 3이 나오게 하는 게 역함수예요. 즉 f⁻¹(7)=3 이에요. 표에서 화살표를 거꾸로만 읽으면 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step1_exit',
    },
    'g3f_step1_B_check': {
      id: 'g3f_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(2)=6 일 때, f⁻¹(6) 의 값은?',
      options: [
        { id: 'correct', text: '2', isCorrect: true, nextNodeId: 'g3f_step1_exit' },
        { id: 'wrong1',  text: '6', isCorrect: false, nextNodeId: 'g3f_step1_B_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '12', isCorrect: false, nextNodeId: 'g3f_step1_B_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step1_B_easy',
    },
    'g3f_step1_B_remedy': {
      id: 'g3f_step1_B_remedy',
      kind: 'explain',
      title: '6은 2에서 왔어요',
      body: 'f(2)=6 이라고 했으니 6을 만든 값은 2예요. 그래서 f⁻¹(6)=2 예요. f(6)을 새로 계산하면 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step1_exit',
    },

    // ─────────── step1.C: "f⁻¹(b) 는 1/f(b)" (역수 착각) ───────────
    'g3f_step1_C_explain': {
      id: 'g3f_step1_C_explain',
      kind: 'explain',
      title: '역함수는 분수 뒤집기가 아니에요',
      body: 'f⁻¹ 의 작은 −1 은 분수를 뒤집는 표시가 아니라 거꾸로 가는 함수라는 뜻이에요. 1/f(b) 처럼 나누는 게 아니라 b가 나오게 한 처음 값을 찾는 거라서, f(4)=9 이면 f⁻¹(9)=4 이지 1/9 가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step1_C_remedy',
      summary: 'f⁻¹ 의 −1 은 역수가 아니라 거꾸로 가는 함수 — 1/f(b) 와 다름',
      triggers: [
        'f⁻¹ 이 1 나누기인가요',
        '역수랑 같은 거 아니에요',
        '왜 분수로 안 되나요',
      ],
    },
    'g3f_step1_C_check': {
      id: 'g3f_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(4)=8 일 때, f⁻¹(8) 의 값은?',
      options: [
        { id: 'correct', text: '4', isCorrect: true, nextNodeId: 'g3f_step1_exit' },
        { id: 'wrong1',  text: '1/8', isCorrect: false, nextNodeId: 'g3f_step1_C_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '1/4', isCorrect: false, nextNodeId: 'g3f_step1_C_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step1_C_remedy',
    },
    'g3f_step1_C_remedy': {
      id: 'g3f_step1_C_remedy',
      kind: 'explain',
      title: '4가 8을 만들었어요',
      body: 'f(4)=8 이니까 8을 만든 값은 4예요. 그래서 f⁻¹(8)=4 예요. 1/8 은 그냥 8의 역수일 뿐 역함수와 상관없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step1_exit',
    },

    'g3f_step1_exit': { id: 'g3f_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 합성함수 계산 순서 (f∘g)(x)=f(g(x))
    //   B: "(f∘g)(x) 는 바깥 f 부터 계산한다"
    //   C: "(f∘g)(x) 는 f(x)·g(x) 처럼 곱한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "바깥 f 부터 계산" ───────────
    'g3f_step2_B_explain': {
      id: 'g3f_step2_B_explain',
      kind: 'explain',
      title: '안쪽 g 를 먼저 계산해요',
      body: '합성함수 (f∘g)(x)(g를 먼저, 그 결과에 f를 한 번 더 적용하는 함수)는 안쪽 g(x)부터 구해요. g(x)의 결과를 통째로 f에 다시 넣어요. 바깥 f를 먼저 하면 순서가 뒤집혀 다른 답이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step2_B_easy',
      summary: '(f∘g)(x)=f(g(x)) — 안쪽 g 를 먼저 계산하고 그 결과를 f 에 넣음',
      triggers: [
        '합성함수 어느 쪽부터 해요',
        'f 부터 하면 안 되나요',
        '∘ 기호가 헷갈려요',
      ],
    },
    'g3f_step2_B_easy': {
      id: 'g3f_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'f(x)=x+1, g(x)=2x 일 때 (f∘g)(3) 은 먼저 g(3)=6, 그다음 f(6)=7 이에요. 안쪽 g부터 한 줄씩 풀면 안 헷갈려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step2_exit',
    },
    'g3f_step2_B_check': {
      id: 'g3f_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=x+2, g(x)=3x 일 때 (f∘g)(1) 의 값은?',
      options: [
        { id: 'correct', text: '5', isCorrect: true, nextNodeId: 'g3f_step2_exit' },
        { id: 'wrong1',  text: '9', isCorrect: false, nextNodeId: 'g3f_step2_B_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '3', isCorrect: false, nextNodeId: 'g3f_step2_B_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step2_B_easy',
    },
    'g3f_step2_B_remedy': {
      id: 'g3f_step2_B_remedy',
      kind: 'explain',
      title: 'g(1)=3, 그다음 f(3)=5',
      body: '안쪽 g 먼저예요. g(1)=3·1=3 이고, 그 3을 f에 넣으면 f(3)=3+2=5 예요. f를 먼저 하면 순서가 뒤집혀 틀려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step2_exit',
    },

    // ─────────── step2.C: "f(x)·g(x) 처럼 곱한다" ───────────
    'g3f_step2_C_explain': {
      id: 'g3f_step2_C_explain',
      kind: 'explain',
      title: '합성은 곱셈이 아니에요',
      body: '∘ 기호는 곱하기가 아니라 함수를 이어 붙이는 표시예요. (f∘g)(x) 는 f(x)와 g(x)를 곱하는 게 아니라, g의 결과를 f에 다시 넣는 거예요. 곱셈으로 풀면 완전히 다른 값이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step2_C_remedy',
      summary: '∘ 는 곱셈이 아니라 함수 이어 붙이기 — f(g(x)) 이지 f(x)·g(x) 가 아님',
      triggers: [
        '∘ 가 곱하기 아닌가요',
        '두 함수를 곱하면 되나요',
        '왜 곱셈이 아니에요',
      ],
    },
    'g3f_step2_C_check': {
      id: 'g3f_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=x+1, g(x)=2x 일 때 (f∘g)(2) 의 값은?',
      options: [
        { id: 'correct', text: '5', isCorrect: true, nextNodeId: 'g3f_step2_exit' },
        { id: 'wrong1',  text: '6', isCorrect: false, nextNodeId: 'g3f_step2_C_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '8', isCorrect: false, nextNodeId: 'g3f_step2_C_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step2_C_remedy',
    },
    'g3f_step2_C_remedy': {
      id: 'g3f_step2_C_remedy',
      kind: 'explain',
      title: 'g(2)=4, 그다음 f(4)=5',
      body: '먼저 g(2)=2·2=4 예요. 그 4를 f에 넣으면 f(4)=4+1=5 예요. f(2)·g(2)=3·4=12 처럼 곱하면 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step2_exit',
    },

    'g3f_step2_exit': { id: 'g3f_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 일대일대응 판정 (서로 다른 입력 → 서로 다른 출력, 그리고 모든 출력 도달)
    //   B: "값이 겹쳐도 일대일대응이다"
    //   C: "그래프가 직선이면 무조건 일대일대응이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "값이 겹쳐도 일대일대응" ───────────
    'g3f_step3_B_explain': {
      id: 'g3f_step3_B_explain',
      kind: 'explain',
      title: '겹치는 값이 있으면 안 돼요',
      body: '일대일대응(서로 다른 입력은 반드시 서로 다른 결과를 갖고, 모든 결과가 빠짐없이 나오는 함수)에서는 두 입력이 같은 결과를 가지면 안 돼요. f(1)=3, f(2)=3 처럼 결과가 겹치면 거꾸로 되돌릴 수 없어 일대일대응이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step3_B_easy',
      summary: '서로 다른 입력이 같은 결과를 가지면 일대일대응 아님 — 겹치면 역함수 불가',
      triggers: [
        '값이 겹쳐도 되나요',
        '일대일대응이 뭔지 헷갈려요',
        '같은 값 나와도 괜찮은가요',
      ],
    },
    'g3f_step3_B_easy': {
      id: 'g3f_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'f(1)=5, f(2)=5 라면 결과 5가 두 번 나와요. 이러면 5를 보고 1인지 2인지 알 수 없어 일대일대응이 아니에요. 결과가 모두 한 번씩만 나와야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step3_exit',
    },
    'g3f_step3_B_check': {
      id: 'g3f_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(1)=4, f(2)=4, f(3)=7 인 함수는 일대일대응일까요?',
      options: [
        { id: 'correct', text: '아니다 (4가 두 번 나옴)', isCorrect: true, nextNodeId: 'g3f_step3_exit' },
        { id: 'wrong1',  text: '맞다',                    isCorrect: false, nextNodeId: 'g3f_step3_B_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '알 수 없다',              isCorrect: false, nextNodeId: 'g3f_step3_B_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step3_B_easy',
    },
    'g3f_step3_B_remedy': {
      id: 'g3f_step3_B_remedy',
      kind: 'explain',
      title: '4가 두 번 나와서 안 돼요',
      body: 'f(1)=4 이고 f(2)=4 라서 결과 4가 두 번 나와요. 서로 다른 입력이 같은 결과를 가지므로 일대일대응이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step3_exit',
    },

    // ─────────── step3.C: "직선이면 무조건 일대일대응" ───────────
    'g3f_step3_C_explain': {
      id: 'g3f_step3_C_explain',
      kind: 'explain',
      title: '기울기가 0인 직선은 예외예요',
      body: '직선이라도 기울기(직선이 얼마나 기울었는지 나타내는 수)가 0이면, 즉 y=3 처럼 평평한 직선이면 모든 입력이 같은 값을 가져 일대일대응이 아니에요. 기울기가 0이 아닌 직선만 일대일대응이라서 "직선이면 무조건"은 틀린 말이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step3_C_remedy',
      summary: '기울기 0인 평평한 직선(상수함수)은 일대일대응 아님 — 기울기 0이 아닐 때만 성립',
      triggers: [
        '직선이면 다 일대일대응 아닌가요',
        '평평한 직선도 되나요',
        '기울기가 왜 중요해요',
      ],
    },
    'g3f_step3_C_check': {
      id: 'g3f_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=5 (모든 x에서 값이 5인 함수) 는 일대일대응일까요?',
      options: [
        { id: 'correct', text: '아니다 (값이 항상 5로 같음)', isCorrect: true, nextNodeId: 'g3f_step3_exit' },
        { id: 'wrong1',  text: '맞다 (직선이니까)',           isCorrect: false, nextNodeId: 'g3f_step3_C_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '맞다 (식이 간단하니까)',      isCorrect: false, nextNodeId: 'g3f_step3_C_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step3_C_remedy',
    },
    'g3f_step3_C_remedy': {
      id: 'g3f_step3_C_remedy',
      kind: 'explain',
      title: '값이 항상 5라서 안 돼요',
      body: 'f(x)=5 는 어떤 x를 넣어도 결과가 5예요. 서로 다른 입력이 모두 같은 5를 가지니 일대일대응이 아니에요. 기울기가 0이라 평평한 직선이라서 그래요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step3_exit',
    },

    'g3f_step3_exit': { id: 'g3f_step3_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 4 — 역함수 식 구하기 (y=f(x) 를 x에 대해 풀고 x↔y 교환)
    //   B: "역함수는 식 전체를 분수로 뒤집는다"
    //   C: "x와 y를 바꾸지 않고 그대로 둔다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step4.B: "식 전체를 분수로 뒤집는다" ───────────
    'g3f_step4_B_explain': {
      id: 'g3f_step4_B_explain',
      kind: 'explain',
      title: '식을 뒤집는 게 아니라 풀어요',
      body: '역함수 식은 y=f(x) 를 x에 대해 풀어서 구해요. y=2x+1 이면 x=(y−1)/2 로 정리하고, 마지막에 x와 y를 바꿔요. 식 전체를 1 나누기로 뒤집는 게 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step4_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step4_B_easy',
      summary: '역함수 식: y=f(x) 를 x에 대해 풀고 x↔y 교환 — 분수 뒤집기 아님',
      triggers: [
        '역함수 식 어떻게 구해요',
        '식을 분수로 뒤집나요',
        'x로 푼다는 게 뭐예요',
      ],
    },
    'g3f_step4_B_easy': {
      id: 'g3f_step4_B_easy',
      kind: 'explain',
      title: '단계로 보기',
      body: 'y=3x 라면 양변을 3으로 나눠 x=y/3 이에요. 그다음 x와 y를 바꾸면 역함수는 y=x/3 이에요. 1/(3x) 처럼 뒤집으면 틀려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step4_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step4_exit',
    },
    'g3f_step4_B_check': {
      id: 'g3f_step4_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=2x 의 역함수 식은?',
      options: [
        { id: 'correct', text: 'y = x/2',   isCorrect: true, nextNodeId: 'g3f_step4_exit' },
        { id: 'wrong1',  text: 'y = 1/(2x)', isCorrect: false, nextNodeId: 'g3f_step4_B_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: 'y = 2x',     isCorrect: false, nextNodeId: 'g3f_step4_B_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step4_B_easy',
    },
    'g3f_step4_B_remedy': {
      id: 'g3f_step4_B_remedy',
      kind: 'explain',
      title: 'y=2x → x=y/2 → 바꾸기',
      body: 'y=2x 의 양변을 2로 나누면 x=y/2 예요. x와 y를 바꾸면 역함수는 y=x/2 예요. 1/(2x) 는 식을 잘못 뒤집은 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step4_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step4_exit',
    },

    // ─────────── step4.C: "x와 y를 바꾸지 않는다" ───────────
    'g3f_step4_C_explain': {
      id: 'g3f_step4_C_explain',
      kind: 'explain',
      title: '마지막에 x와 y를 꼭 바꿔요',
      body: '역함수를 구할 때는 x에 대해 푼 다음, x와 y를 서로 바꿔 적어야 해요. 이 교환을 빼먹으면 원래 함수를 변형한 식일 뿐 역함수가 아니에요. 입력과 결과의 자리를 맞바꾸는 게 역함수의 핵심이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step4_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step4_C_remedy',
      summary: 'x에 대해 푼 뒤 x↔y 교환을 빼먹으면 역함수가 아님',
      triggers: [
        'x y 안 바꿔도 되나요',
        '교환이 왜 필요해요',
        '푼 식이 바로 역함수 아닌가요',
      ],
    },
    'g3f_step4_C_check': {
      id: 'g3f_step4_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=x+3 의 역함수 식은?',
      options: [
        { id: 'correct', text: 'y = x − 3', isCorrect: true, nextNodeId: 'g3f_step4_exit' },
        { id: 'wrong1',  text: 'x = y − 3', isCorrect: false, nextNodeId: 'g3f_step4_C_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: 'y = x + 3', isCorrect: false, nextNodeId: 'g3f_step4_C_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step4_C_remedy',
    },
    'g3f_step4_C_remedy': {
      id: 'g3f_step4_C_remedy',
      kind: 'explain',
      title: 'x로 푼 뒤 x와 y 바꾸기',
      body: 'y=x+3 을 x로 풀면 x=y−3 이에요. 여기서 x와 y를 바꾸면 역함수는 y=x−3 이에요. 교환을 빼먹으면 답이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step4_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step4_exit',
    },

    'g3f_step4_exit': { id: 'g3f_step4_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 5 — 합성함수의 정의역·치역 (안쪽 함수의 결과가 바깥 함수에 들어갈 수 있어야 함)
    //   B: "치역은 그냥 정의역과 같다"
    //   C: "(f∘g) 의 정의역은 f 의 정의역이다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step5.B: "치역은 정의역과 같다" ───────────
    'g3f_step5_B_explain': {
      id: 'g3f_step5_B_explain',
      kind: 'explain',
      title: '정의역과 치역은 달라요',
      body: '정의역(함수에 넣을 수 있는 값들의 모임)과 치역(함수가 실제로 내보내는 결과들의 모임)은 보통 같지 않아요. f(x)=x² 에 −2, 0, 2 를 넣으면 결과는 4, 0, 4 라서, 넣는 쪽과 나오는 쪽을 따로 봐야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step5_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step5_B_easy',
      summary: '정의역(넣는 값들)과 치역(나오는 값들)은 일반적으로 다름',
      triggers: [
        '정의역이랑 치역이 같나요',
        '치역이 뭔지 헷갈려요',
        '넣는 값이랑 나오는 값 같은 거 아닌가요',
      ],
    },
    'g3f_step5_B_easy': {
      id: 'g3f_step5_B_easy',
      kind: 'explain',
      title: '예시로 보기',
      body: 'f(x)=x² 에 1, 2, 3 을 넣으면 결과는 1, 4, 9 예요. 넣은 값(정의역)과 나온 값(치역)이 다르죠. 결과만 모은 게 치역이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step5_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step5_exit',
    },
    'g3f_step5_B_check': {
      id: 'g3f_step5_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=x² 에서 정의역이 {−1, 0, 1} 일 때 치역은?',
      options: [
        { id: 'correct', text: '{0, 1}',     isCorrect: true, nextNodeId: 'g3f_step5_exit' },
        { id: 'wrong1',  text: '{−1, 0, 1}', isCorrect: false, nextNodeId: 'g3f_step5_B_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '{−1, 1}',    isCorrect: false, nextNodeId: 'g3f_step5_B_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step5_B_easy',
    },
    'g3f_step5_B_remedy': {
      id: 'g3f_step5_B_remedy',
      kind: 'explain',
      title: '결과만 모으면 {0, 1}',
      body: '(−1)²=1, 0²=0, 1²=1 이라서 나온 값은 0 과 1 뿐이에요. 그래서 치역은 {0, 1} 이고 정의역 {−1, 0, 1} 과 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step5_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step5_exit',
    },

    // ─────────── step5.C: "(f∘g) 정의역은 f 의 정의역" ───────────
    'g3f_step5_C_explain': {
      id: 'g3f_step5_C_explain',
      kind: 'explain',
      title: '합성함수는 안쪽 g 에 먼저 넣어요',
      body: '(f∘g)(x) 는 x를 먼저 g에 넣으니까, 넣을 수 있는 값은 안쪽 g의 정의역으로 시작해요. 그리고 g의 결과가 바깥 f에 넣을 수 있는 값이어야 해요. 그래서 합성함수의 정의역은 바깥 f의 정의역이 아니라 g쪽을 먼저 봐야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step5_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step5_C_remedy',
      summary: '(f∘g)(x) 의 정의역은 안쪽 g 에 넣을 수 있는 값에서 출발 — f 정의역이 아님',
      triggers: [
        '합성함수 정의역 어디서 봐요',
        'f 정의역이면 되는 거 아닌가요',
        '왜 g 부터 봐요',
      ],
    },
    'g3f_step5_C_check': {
      id: 'g3f_step5_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '(f∘g)(x) 에서 x를 가장 먼저 넣는 함수는?',
      options: [
        { id: 'correct', text: '안쪽 g', isCorrect: true, nextNodeId: 'g3f_step5_exit' },
        { id: 'wrong1',  text: '바깥 f', isCorrect: false, nextNodeId: 'g3f_step5_C_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '아무거나', isCorrect: false, nextNodeId: 'g3f_step5_C_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step5_C_remedy',
    },
    'g3f_step5_C_remedy': {
      id: 'g3f_step5_C_remedy',
      kind: 'explain',
      title: 'x 는 안쪽 g 부터 들어가요',
      body: '(f∘g)(x)=f(g(x)) 라서 x는 안쪽 g에 먼저 들어가요. 그래서 넣을 수 있는 값도 g쪽부터 따져요. 바깥 f부터 보면 순서가 틀려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step5_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step5_exit',
    },

    'g3f_step5_exit': { id: 'g3f_step5_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 6 — 역함수 존재 조건 (일대일대응일 때만 역함수 존재)
    //   B: "모든 함수는 역함수가 있다"
    //   C: "그래프가 곡선이면 역함수가 없다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step6.B: "모든 함수는 역함수가 있다" ───────────
    'g3f_step6_B_explain': {
      id: 'g3f_step6_B_explain',
      kind: 'explain',
      title: '일대일대응일 때만 역함수가 있어요',
      body: '역함수는 결과를 보고 입력을 거꾸로 찾는 거예요. f(1)=4, f(2)=4 처럼 결과가 겹치면 4를 보고 1인지 2인지 못 정해 거꾸로 갈 수 없으니, 일대일대응(겹침 없이 모든 결과가 한 번씩)일 때만 역함수가 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step6_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step6_B_easy',
      summary: '역함수는 일대일대응일 때만 존재 — 결과가 겹치면 거꾸로 못 감',
      triggers: [
        '모든 함수에 역함수 있나요',
        '역함수 언제 생겨요',
        '왜 겹치면 안 돼요',
      ],
    },
    'g3f_step6_B_easy': {
      id: 'g3f_step6_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'f(x)=x² 는 f(−2)=4, f(2)=4 라서 4가 겹쳐요. 4에서 거꾸로 가면 −2 인지 2 인지 못 정해 역함수가 없어요. 겹치지 않아야 역함수가 생겨요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step6_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step6_exit',
    },
    'g3f_step6_B_check': {
      id: 'g3f_step6_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '함수에 역함수가 있으려면 어떤 함수여야 할까요?',
      options: [
        { id: 'correct', text: '일대일대응인 함수', isCorrect: true, nextNodeId: 'g3f_step6_exit' },
        { id: 'wrong1',  text: '모든 함수',         isCorrect: false, nextNodeId: 'g3f_step6_B_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '식이 짧은 함수',    isCorrect: false, nextNodeId: 'g3f_step6_B_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step6_B_easy',
    },
    'g3f_step6_B_remedy': {
      id: 'g3f_step6_B_remedy',
      kind: 'explain',
      title: '겹침이 없어야 거꾸로 가요',
      body: '결과가 겹치면 그 결과에서 입력을 하나로 정할 수 없어요. 그래서 겹침 없이 모든 결과가 한 번씩 나오는 일대일대응일 때만 역함수가 있어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step6_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step6_exit',
    },

    // ─────────── step6.C: "곡선이면 역함수가 없다" ───────────
    'g3f_step6_C_explain': {
      id: 'g3f_step6_C_explain',
      kind: 'explain',
      title: '곡선이라도 겹침만 없으면 돼요',
      body: '역함수가 있는지는 모양이 곡선인지 직선인지가 아니라, 결과가 겹치느냐로 정해져요. 예를 들어 f(x)=x³ 은 곡선이지만 같은 결과가 두 번 나오지 않아 역함수가 있어요. 곡선이라서 무조건 없는 게 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step6_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step6_C_remedy',
      summary: '역함수 존재는 곡선·직선 여부가 아니라 결과 겹침 여부로 결정 — x³ 은 곡선이어도 역함수 있음',
      triggers: [
        '곡선이면 역함수 없나요',
        '직선만 역함수 있어요',
        'x세제곱은 역함수 없나요',
      ],
    },
    'g3f_step6_C_check': {
      id: 'g3f_step6_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'f(x)=x³ (곡선이지만 같은 값이 두 번 안 나옴) 은 역함수가 있을까요?',
      options: [
        { id: 'correct', text: '있다 (겹치는 값이 없으니까)', isCorrect: true, nextNodeId: 'g3f_step6_exit' },
        { id: 'wrong1',  text: '없다 (곡선이니까)',           isCorrect: false, nextNodeId: 'g3f_step6_C_remedy', weaknessId: 'g3_function' },
        { id: 'wrong2',  text: '알 수 없다',                  isCorrect: false, nextNodeId: 'g3f_step6_C_remedy', weaknessId: 'g3_function' },
      ],
      dontKnowNextNodeId: 'g3f_step6_C_remedy',
    },
    'g3f_step6_C_remedy': {
      id: 'g3f_step6_C_remedy',
      kind: 'explain',
      title: 'x³ 은 겹침이 없어요',
      body: 'f(x)=x³ 은 곡선이지만 서로 다른 입력이 항상 다른 결과를 가져요. 겹치는 값이 없으니 거꾸로 갈 수 있어 역함수가 있어요. 모양이 아니라 겹침이 기준이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3f_step6_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3f_step6_exit',
    },

    'g3f_step6_exit': { id: 'g3f_step6_exit', kind: 'exit' },
  },
};
