import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: g3pr_step<N>_<choice>_<role>
// 약점 prefix: g3pr
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 여사건, 조건부확률, 독립사건, 배반사건, 합집합·교집합, 표본공간 등 첫 등장 시 한 줄 정의 동봉.

export const g3_probability_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 여사건 활용 (P(Aᶜ) = 1 − P(A))
    //   B: '"적어도"가 나와도 직접 경우의 수를 센다'
    //   C: '여사건은 P(A)×2와 같다'
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: '"적어도"가 나와도 직접 센다' ───────────
    'g3pr_step1_B_explain': {
      id: 'g3pr_step1_B_explain',
      kind: 'explain',
      title: '"적어도"가 보이면 여사건이 빨라요',
      body: '여사건(어떤 사건이 일어나지 않는 경우, A 라는 사건의 여사건은 Aᶜ 로 적어요)은 "적어도 하나"를 다룰 때 가장 강한 도구예요. 직접 세면 경우가 너무 많아져서 빠뜨리기 쉬워요. P(적어도 하나) = 1 − P(하나도 없음) 으로 한 번에 끝나요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step1_B_easy',
      summary: '"적어도"가 나오면 여사건 1 − P(Aᶜ) 가 가장 빠른 길 — 직접 세면 누락 위험',
      triggers: [
        '적어도 하나는 어떻게 풀어요',
        '경우의 수를 직접 세야 하나요',
        '여사건을 언제 써요',
      ],
    },
    'g3pr_step1_B_easy': {
      id: 'g3pr_step1_B_easy',
      kind: 'explain',
      title: '예시로 짧게',
      body: '동전을 3번 던져 앞면이 적어도 1번 나올 확률을 구할 때, 직접 세면 7가지 경우를 따져야 해요. 여사건(모두 뒷면) 은 1가지뿐이라 P = 1 − 1/8 = 7/8 로 한 줄에 끝나요. "적어도"가 보이면 무조건 여사건을 떠올리세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step1_exit',
    },
    'g3pr_step1_B_check': {
      id: 'g3pr_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: '주사위를 2번 던질 때 적어도 한 번은 6이 나올 확률은?',
      options: [
        { id: 'correct', text: '11/36', isCorrect: true, nextNodeId: 'g3pr_step1_exit' },
        { id: 'wrong1',  text: '2/6',   isCorrect: false, nextNodeId: 'g3pr_step1_B_remedy', weaknessId: 'g3_probability' },
        { id: 'wrong2',  text: '1/36',  isCorrect: false, nextNodeId: 'g3pr_step1_B_remedy', weaknessId: 'g3_probability' },
      ],
      dontKnowNextNodeId: 'g3pr_step1_B_easy',
    },
    'g3pr_step1_B_remedy': {
      id: 'g3pr_step1_B_remedy',
      kind: 'explain',
      title: '1 − (5/6)² = 11/36',
      body: '여사건은 "두 번 다 6이 안 나옴" 이에요. 한 번에 6이 아닐 확률이 5/6 이고 두 번 모두면 (5/6)² = 25/36 이에요. 그래서 적어도 한 번 6이 나올 확률은 1 − 25/36 = 11/36 이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step1_exit',
    },

    // ─────────── step1.C: '여사건은 P(A) 와 같다 (1에서 빼기 빼먹음)' ───────────
    'g3pr_step1_C_explain': {
      id: 'g3pr_step1_C_explain',
      kind: 'explain',
      title: '여사건은 1 에서 빼는 한 단계가 있어요',
      body: '여사건의 확률은 P(Aᶜ) = 1 − P(A) 예요. 전체 확률 1 에서 A 가 일어날 확률을 빼고 남은 부분이라서 그래요. 1 에서 빼기를 빼먹고 P(A) 그대로 두면 "A 가 일어나지 않을 확률"이 아니라 그냥 "A 의 확률"이 돼서 정반대 답이 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step1_B_easy',
      summary: '여사건 P(Aᶜ) = 1 − P(A) — 전체 1 에서 A 를 빼는 한 단계 필수',
      triggers: [
        '여사건이 P(A) 랑 같은 거 아닌가요',
        '왜 1 에서 빼요',
        '여사건 공식이 헷갈려요',
      ],
    },
    'g3pr_step1_C_check': {
      id: 'g3pr_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(A) = 0.3 일 때 여사건의 확률 P(Aᶜ) 는?',
      options: [
        { id: 'correct', text: '0.7 (= 1 − 0.3)', isCorrect: true, nextNodeId: 'g3pr_step1_exit' },
        { id: 'wrong1',  text: '0.3 (그대로)', isCorrect: false, nextNodeId: 'g3pr_step1_C_remedy', weaknessId: 'g3_probability' },
        { id: 'wrong2',  text: '0.6 (= 0.3 × 2)', isCorrect: false, nextNodeId: 'g3pr_step1_C_remedy', weaknessId: 'g3_probability' },
      ],
      dontKnowNextNodeId: 'g3pr_step1_B_easy',
    },
    'g3pr_step1_C_remedy': {
      id: 'g3pr_step1_C_remedy',
      kind: 'explain',
      title: '1 − 0.3 = 0.7',
      body: '전체 확률 1 에서 P(A) = 0.3 을 빼면 0.7 이에요. 이게 A 가 일어나지 않을 확률이에요. 빼기를 빼먹고 0.3 그대로 두면 원래 A 의 확률이라 여사건이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step1_exit',
    },

    'g3pr_step1_exit': { id: 'g3pr_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 조건부확률 공식 P(A|B) = P(A∩B) / P(B)
    //   B: 'P(A|B) = P(A) / P(B)' (분자 자리 잘못)
    //   C: 'P(A|B) = P(A) × P(B)' (독립일 때만 성립하는 식과 혼동)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: 'P(A|B) = P(A) / P(B)' ───────────
    'g3pr_step2_B_explain': {
      id: 'g3pr_step2_B_explain',
      kind: 'explain',
      title: '분자는 P(A) 가 아니라 교집합이에요',
      body: '조건부확률(어떤 사건 B 가 일어났다는 전제에서 A 가 일어날 확률, P(A|B) 로 적어요) 은 전체를 B 로 좁힌 뒤 그 안에서 A 도 같이 일어난 영역만 봐요. 그래서 분자는 P(A) 가 아니라 P(A∩B) (A 와 B 가 동시에 일어나는 교집합) 이에요. P(A|B) = P(A∩B) / P(B) 로 적는 이유가 이거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step2_B_easy',
      summary: '조건부확률 분자는 P(A∩B) — 전체를 B 로 좁힌 후 그 안에서 A 도 같이 일어나는 영역',
      triggers: [
        '분자에 P(A) 만 쓰면 안 되나요',
        '왜 교집합이 들어가요',
        '조건부확률 공식이 헷갈려요',
      ],
    },
    'g3pr_step2_B_easy': {
      id: 'g3pr_step2_B_easy',
      kind: 'explain',
      title: '예시로 짧게',
      body: 'P(A∩B) = 0.2, P(A) = 0.4, P(B) = 0.5 일 때 P(A|B) = 0.2 / 0.5 = 0.4 예요. 분자에 P(A) = 0.4 를 그대로 넣어 0.4 / 0.5 = 0.8 로 풀면 답이 어긋나요. B 안에서 A 가 함께 일어난 영역인 0.2 가 분자 자리에 와야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step2_exit',
    },
    'g3pr_step2_B_check': {
      id: 'g3pr_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(A∩B) = 0.3, P(B) = 0.5 일 때 P(A|B) 는?',
      options: [
        { id: 'correct', text: '0.6', isCorrect: true, nextNodeId: 'g3pr_step2_exit' },
        { id: 'wrong1',  text: '0.8', isCorrect: false, nextNodeId: 'g3pr_step2_B_remedy', weaknessId: 'g3_probability' },
        { id: 'wrong2',  text: '0.15', isCorrect: false, nextNodeId: 'g3pr_step2_B_remedy', weaknessId: 'g3_probability' },
      ],
      dontKnowNextNodeId: 'g3pr_step2_B_easy',
    },
    'g3pr_step2_B_remedy': {
      id: 'g3pr_step2_B_remedy',
      kind: 'explain',
      title: '0.3 / 0.5 = 0.6',
      body: '분자에는 교집합 P(A∩B) = 0.3 이 들어가요. 분모는 조건이 되는 P(B) = 0.5 예요. 0.3 / 0.5 = 0.6 이라 P(A|B) = 0.6 이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step2_exit',
    },

    // ─────────── step2.C: 'P(A|B) = P(A) × P(B)' ───────────
    'g3pr_step2_C_explain': {
      id: 'g3pr_step2_C_explain',
      kind: 'explain',
      title: '곱은 독립일 때만 나오는 식이에요',
      body: 'P(A) × P(B) 는 두 사건이 독립(한 사건이 일어나도 다른 사건의 확률에 영향이 없는 관계) 일 때 P(A∩B) 가 되는 식이에요. 그건 교집합의 한 특수 경우지 조건부확률이 아니에요. 조건부확률은 P(A|B) = P(A∩B) / P(B) 로 나누기로 정해져요. 곱으로 적으면 분모가 사라져서 다른 양이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step2_B_easy',
      summary: 'P(A) × P(B) 는 독립일 때의 P(A∩B) — 조건부확률 P(A|B) 는 나누기로 정의',
      triggers: [
        '곱하면 되는 거 아닌가요',
        '조건부와 독립 식이 헷갈려요',
        '왜 나누기로 적어요',
      ],
    },
    'g3pr_step2_C_check': {
      id: 'g3pr_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(A) = 0.4, P(B) = 0.5, P(A∩B) = 0.2 일 때 P(A|B) 는?',
      options: [
        { id: 'correct', text: '0.4', isCorrect: true, nextNodeId: 'g3pr_step2_exit' },
        { id: 'wrong1',  text: '0.2', isCorrect: false, nextNodeId: 'g3pr_step2_C_remedy', weaknessId: 'g3_probability' },
        { id: 'wrong2',  text: '0.9', isCorrect: false, nextNodeId: 'g3pr_step2_C_remedy', weaknessId: 'g3_probability' },
      ],
      dontKnowNextNodeId: 'g3pr_step2_B_easy',
    },
    'g3pr_step2_C_remedy': {
      id: 'g3pr_step2_C_remedy',
      kind: 'explain',
      title: '0.2 / 0.5 = 0.4',
      body: '조건부확률은 분자에 교집합, 분모에 조건이 되는 사건이 와요. P(A∩B) = 0.2 를 P(B) = 0.5 로 나누면 0.4 가 나와요. P(A) × P(B) = 0.2 는 우연히 교집합 값과 같지만 그건 독립일 때 얘기지 조건부확률의 답이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step2_exit',
    },

    'g3pr_step2_exit': { id: 'g3pr_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 독립 사건 판단 (P(A∩B) = P(A)·P(B))
    //   B: 'P(A∩B) = P(A) + P(B) 이면 독립' (덧셈정리·배반사건과 혼동)
    //   C: '두 사건은 항상 독립이다' (독립을 일반화)
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: 'P(A∩B) = P(A) + P(B) 이면 독립' ───────────
    'g3pr_step3_B_explain': {
      id: 'g3pr_step3_B_explain',
      kind: 'explain',
      title: '독립의 기준은 곱이에요',
      body: '독립사건(한쪽이 일어나도 다른 쪽 확률에 영향이 없는 두 사건) 의 기준은 P(A∩B) = P(A) · P(B) 라는 곱의 식이에요. 더하기 식 P(A) + P(B) 가 나오는 곳은 배반사건(두 사건이 동시에 일어나지 않는 관계) 의 합집합 P(A∪B) = P(A) + P(B) 예요. 같은 + 부호라도 다루는 사건 관계가 완전히 달라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step3_B_easy',
      summary: '독립 기준은 P(A∩B) = P(A)·P(B) (곱) — 더하기 식은 배반사건의 합집합 공식',
      triggers: [
        '독립이 더하기 아니었나요',
        '곱하기랑 더하기 어느 쪽이 독립이에요',
        '배반사건과 독립이 헷갈려요',
      ],
    },
    'g3pr_step3_B_easy': {
      id: 'g3pr_step3_B_easy',
      kind: 'explain',
      title: '두 식의 자리부터 정리해요',
      body: 'P(A) = 0.4, P(B) = 0.3, P(A∩B) = 0.12 일 때 0.4 × 0.3 = 0.12 라서 독립이에요. 만약 P(A) + P(B) = 0.7 과 P(A∩B) 를 비교했다면 둘이 같을 일이 거의 없어요. 독립 판단은 항상 곱과 비교해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step3_exit',
    },
    'g3pr_step3_B_check': {
      id: 'g3pr_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(A) = 0.5, P(B) = 0.4, P(A∩B) = 0.2 일 때 A 와 B 의 관계는?',
      options: [
        { id: 'correct', text: '독립이다', isCorrect: true, nextNodeId: 'g3pr_step3_exit' },
        { id: 'wrong1',  text: '배반이다', isCorrect: false, nextNodeId: 'g3pr_step3_B_remedy', weaknessId: 'g3_probability' },
        { id: 'wrong2',  text: '독립이 아니다', isCorrect: false, nextNodeId: 'g3pr_step3_B_remedy', weaknessId: 'g3_probability' },
      ],
      dontKnowNextNodeId: 'g3pr_step3_B_easy',
    },
    'g3pr_step3_B_remedy': {
      id: 'g3pr_step3_B_remedy',
      kind: 'explain',
      title: '0.5 × 0.4 = 0.2 → 독립',
      body: 'P(A) · P(B) = 0.5 × 0.4 = 0.2 이고 P(A∩B) 도 0.2 라서 두 값이 같아요. 곱으로 분해되니까 A 와 B 는 독립이에요. 더해서 0.9 와 비교하면 안 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step3_exit',
    },

    // ─────────── step3.C: 'P(A∩B)=0 이면 독립' (배반↔독립 혼동) ───────────
    'g3pr_step3_C_explain': {
      id: 'g3pr_step3_C_explain',
      kind: 'explain',
      title: '배반은 독립과 정반대예요',
      body: 'P(A∩B) = 0 은 두 사건이 동시에 일어날 수 없다는 뜻으로, 이를 배반 (한쪽이 일어나면 다른 쪽은 못 일어남) 이라고 해요. 독립은 P(A∩B) = P(A) · P(B) 가 성립하는 경우라서, 배반이면 곱이 0 이 되어야만 독립까지 동시에 성립할 수 있어요. 따라서 보통은 배반과 독립은 같이 안 가요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step3_B_easy',
      summary: '배반 (P(A∩B)=0) 과 독립 (P(A∩B)=P(A)·P(B)) 은 다른 개념 — 한쪽이 0 이라고 독립은 아님',
      triggers: [
        '배반이면 독립인 줄 알았어요',
        'P(A∩B)=0 이면 독립 아닌가요',
        '배반과 독립이 헷갈려요',
      ],
    },
    'g3pr_step3_C_check': {
      id: 'g3pr_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'P(A) = 0.5, P(B) = 0.4, P(A∩B) = 0 일 때 A 와 B 는 독립인가요?',
      options: [
        { id: 'correct', text: '독립이 아니다 (P(A)·P(B)=0.2 ≠ 0)', isCorrect: true, nextNodeId: 'g3pr_step3_exit' },
        { id: 'wrong1',  text: 'P(A∩B)=0 이니까 독립이다',         isCorrect: false, nextNodeId: 'g3pr_step3_C_remedy', weaknessId: 'g3_probability' },
        { id: 'wrong2',  text: '항상 독립이다',                     isCorrect: false, nextNodeId: 'g3pr_step3_C_remedy', weaknessId: 'g3_probability' },
      ],
      dontKnowNextNodeId: 'g3pr_step3_B_easy',
    },
    'g3pr_step3_C_remedy': {
      id: 'g3pr_step3_C_remedy',
      kind: 'explain',
      title: '0.5 × 0.4 = 0.2 ≠ 0',
      body: 'P(A) · P(B) = 0.2 인데 실제 P(A∩B) 는 0 이라 두 값이 달라요. 곱과 같지 않으니 독립이 아니에요. 이건 동시에 일어나지 않는 배반 사례지, 독립과는 다른 관계예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'g3pr_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'g3pr_step3_exit',
    },

    'g3pr_step3_exit': { id: 'g3pr_step3_exit', kind: 'exit' },
  },
};
