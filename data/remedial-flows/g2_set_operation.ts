import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: gso_step<N>_<choice>_<role>
// 약점 prefix: gso
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 집합, 원소, 합집합, 교집합, 공통 원소, 벤다이어그램 등 단원 안 세부 용어 첫 등장 시 한 줄 정의 동봉.

export const g2_set_operation_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 두 집합 원소 나열 (공통 원소를 먼저 찾기)
    //   B: "두 집합을 그냥 합쳐서 세면 된다"
    //   C: "원소 개수만 더하면 된다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "그냥 합쳐서 세면 된다" ───────────
    'gso_step1_B_explain': {
      id: 'gso_step1_B_explain',
      kind: 'explain',
      title: '공통 원소를 먼저 찾아요',
      body: '원소는 집합 안에 들어 있는 하나하나의 값이에요. 두 집합을 그냥 합쳐서 세면 양쪽에 다 있는 공통 원소를 두 번 세게 돼요. 그래서 먼저 두 집합에 같이 들어 있는 공통 원소부터 찾아 두는 게 안전해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step1_B_easy',
      summary: '두 집합을 그냥 합치면 공통 원소를 두 번 셈 — 공통 원소를 먼저 찾아 두기',
      triggers: [
        '그냥 합쳐서 세면 안 되나요',
        '공통 원소를 왜 따로 찾아요',
        '두 번 센다는 게 무슨 말이에요',
      ],
    },
    'gso_step1_B_easy': {
      id: 'gso_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'A = {1, 2, 3}, B = {2, 3, 4} 에서 2 와 3 은 양쪽에 다 있는 공통 원소예요. 이 둘을 먼저 찾아 두면 다음 계산이 쉬워져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step1_exit',
    },
    'gso_step1_B_check': {
      id: 'gso_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A = {1, 2, 3, 4}, B = {3, 4, 5} 일 때 두 집합의 공통 원소는?',
      options: [
        { id: 'correct', text: '3, 4',       isCorrect: true,  nextNodeId: 'gso_step1_exit' },
        { id: 'wrong1',  text: '1, 2, 5',    isCorrect: false, nextNodeId: 'gso_step1_B_remedy', weaknessId: 'g2_set_operation' },
        { id: 'wrong2',  text: '공통 원소 없음', isCorrect: false, nextNodeId: 'gso_step1_B_remedy', weaknessId: 'g2_set_operation' },
      ],
      dontKnowNextNodeId: 'gso_step1_B_easy',
    },
    'gso_step1_B_remedy': {
      id: 'gso_step1_B_remedy',
      kind: 'explain',
      title: '양쪽에 다 있는 수가 공통 원소예요',
      body: 'A 에도 있고 B 에도 있는 수만 고르면 3 과 4 예요. 1, 2 는 A 에만, 5 는 B 에만 있어서 공통 원소가 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step1_exit',
    },

    // ─────────── step1.C: "원소 개수만 더하면 된다" ───────────
    'gso_step1_C_explain': {
      id: 'gso_step1_C_explain',
      kind: 'explain',
      title: '개수만 더하면 공통 원소가 겹쳐요',
      body: '두 집합의 원소 개수만 그냥 더하면, 양쪽에 다 있는 공통 원소가 두 번 세어져요. 그래서 공통 원소가 몇 개인지 먼저 찾아 한 번 빼 줘야 정확한 개수가 나와요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step1_B_easy',
      summary: '개수만 더하면 공통 원소가 두 번 세어짐 — 공통 원소 개수를 한 번 빼야 함',
      triggers: [
        '개수만 더하면 안 되나요',
        '왜 한 번 빼요',
        '공통 원소가 몇 개인지 왜 세요',
      ],
    },
    'gso_step1_C_check': {
      id: 'gso_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A = {1, 2, 3}, B = {3, 4} 에서 두 집합을 합쳤을 때 서로 다른 원소의 개수는?',
      options: [
        { id: 'correct', text: '4개', isCorrect: true,  nextNodeId: 'gso_step1_exit' },
        { id: 'wrong1',  text: '5개', isCorrect: false, nextNodeId: 'gso_step1_C_remedy', weaknessId: 'g2_set_operation' },
        { id: 'wrong2',  text: '6개', isCorrect: false, nextNodeId: 'gso_step1_C_remedy', weaknessId: 'g2_set_operation' },
      ],
      dontKnowNextNodeId: 'gso_step1_B_easy',
    },
    'gso_step1_C_remedy': {
      id: 'gso_step1_C_remedy',
      kind: 'explain',
      title: '3 을 두 번 세지 않아요',
      body: '서로 다른 원소는 1, 2, 3, 4 라서 4개예요. 개수만 더하면 3 + 2 = 5 가 되는데, 양쪽에 있는 3 을 두 번 세서 1개 더 많아진 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step1_exit',
    },

    'gso_step1_exit': { id: 'gso_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 합집합 구성 (A∪B 는 모든 원소를 중복 없이)
    //   B: "중복 원소는 두 번 써야 한다"
    //   C: "합집합은 더 큰 집합만 가리킨다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "중복 원소는 두 번 써야 한다" ───────────
    'gso_step2_B_explain': {
      id: 'gso_step2_B_explain',
      kind: 'explain',
      title: '같은 원소는 한 번만 적어요',
      body: '합집합 A∪B 는 두 집합의 모든 원소를 한곳에 모은 집합이에요. 집합은 같은 원소를 두 번 적지 않는다는 약속이 있어요. 그래서 양쪽에 다 있는 원소라도 합집합에는 한 번만 써요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step2_B_easy',
      summary: '합집합 A∪B 는 모든 원소를 모으되 같은 원소는 한 번만 — 집합은 중복을 적지 않음',
      triggers: [
        '겹치는 원소를 두 번 써야 하나요',
        '왜 한 번만 적어요',
        '합집합에 중복이 들어가나요',
      ],
    },
    'gso_step2_B_easy': {
      id: 'gso_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'A = {1, 2, 3}, B = {2, 3, 4} 이면 A∪B = {1, 2, 3, 4} 예요. 2 와 3 이 양쪽에 있어도 합집합에는 한 번씩만 적어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step2_exit',
    },
    'gso_step2_B_check': {
      id: 'gso_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A = {2, 4, 6}, B = {4, 6, 8} 일 때 A∪B 는?',
      options: [
        { id: 'correct', text: '{2, 4, 6, 8}',          isCorrect: true,  nextNodeId: 'gso_step2_exit' },
        { id: 'wrong1',  text: '{2, 4, 4, 6, 6, 8}',    isCorrect: false, nextNodeId: 'gso_step2_B_remedy', weaknessId: 'g2_set_operation' },
        { id: 'wrong2',  text: '{4, 6}',                isCorrect: false, nextNodeId: 'gso_step2_B_remedy', weaknessId: 'g2_set_operation' },
      ],
      dontKnowNextNodeId: 'gso_step2_B_easy',
    },
    'gso_step2_B_remedy': {
      id: 'gso_step2_B_remedy',
      kind: 'explain',
      title: '4 와 6 은 한 번씩만',
      body: 'A∪B = {2, 4, 6, 8} 이에요. 4 와 6 이 양쪽에 있지만 합집합에는 한 번만 적어요. 두 번 적은 {2, 4, 4, 6, 6, 8} 은 집합이 아니에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step2_exit',
    },

    // ─────────── step2.C: "합집합은 더 큰 집합만 가리킨다" ───────────
    'gso_step2_C_explain': {
      id: 'gso_step2_C_explain',
      kind: 'explain',
      title: '합집합은 한쪽이 아니라 둘을 모은 거예요',
      body: '합집합은 더 큰 집합 한쪽을 가리키는 게 아니에요. 두 집합의 원소를 모두 모은 새로운 집합이에요. 한쪽에만 있는 원소도 빠짐없이 들어가야 해요. 벤다이어그램(두 원을 겹쳐 그려 원소를 나타낸 그림)으로 보면 두 원이 덮는 부분 전체가 합집합이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step2_B_easy',
      summary: '합집합은 더 큰 집합 한쪽이 아니라 두 집합의 모든 원소를 모은 새 집합',
      triggers: [
        '더 큰 집합이 합집합 아닌가요',
        '한쪽만 보면 되는 줄 알았어요',
        '작은 집합 원소는 빼도 되나요',
      ],
    },
    'gso_step2_C_check': {
      id: 'gso_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A = {1, 2, 3, 4}, B = {5} 일 때 A∪B 는?',
      options: [
        { id: 'correct', text: '{1, 2, 3, 4, 5}', isCorrect: true,  nextNodeId: 'gso_step2_exit' },
        { id: 'wrong1',  text: '{1, 2, 3, 4}',    isCorrect: false, nextNodeId: 'gso_step2_C_remedy', weaknessId: 'g2_set_operation' },
        { id: 'wrong2',  text: '{5}',             isCorrect: false, nextNodeId: 'gso_step2_C_remedy', weaknessId: 'g2_set_operation' },
      ],
      dontKnowNextNodeId: 'gso_step2_B_easy',
    },
    'gso_step2_C_remedy': {
      id: 'gso_step2_C_remedy',
      kind: 'explain',
      title: '작은 집합의 5 도 들어가요',
      body: 'A∪B = {1, 2, 3, 4, 5} 예요. B 가 작아도 그 안의 5 를 빼면 안 돼요. 두 집합의 원소를 모두 모아야 합집합이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step2_exit',
    },

    'gso_step2_exit': { id: 'gso_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — n(A∪B) = n(A) + n(B) − n(A∩B)
    //   B: "공통 원소 개수를 더한다"
    //   C: "공통 원소가 없어도 빼야 한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "공통 원소 개수를 더한다" ───────────
    'gso_step3_B_explain': {
      id: 'gso_step3_B_explain',
      kind: 'explain',
      title: '더하는 게 아니라 빼요',
      body: 'n(A) 는 집합 A 의 원소 개수를 뜻해요. n(A) 와 n(B) 를 더하면 양쪽에 다 있는 공통 원소가 두 번 세어져요. 그래서 교집합(두 집합에 모두 있는 원소를 모은 집합) 개수 n(A∩B) 를 한 번 빼 줘야 정확해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step3_B_easy',
      summary: 'n(A∪B) = n(A) + n(B) − n(A∩B) — 두 번 세진 공통 원소를 한 번 빼는 게 핵심',
      triggers: [
        '공통 개수를 더하는 거 아닌가요',
        '왜 빼요',
        '공식 부호가 헷갈려요',
      ],
    },
    'gso_step3_B_easy': {
      id: 'gso_step3_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'n(A) = 3, n(B) = 3, n(A∩B) = 2 이면 3 + 3 − 2 = 4 예요. 더하면 3 + 3 + 2 = 8 이 돼서 실제 개수보다 훨씬 커져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step3_exit',
    },
    'gso_step3_B_check': {
      id: 'gso_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'n(A) = 5, n(B) = 4, n(A∩B) = 2 일 때 n(A∪B) 는?',
      options: [
        { id: 'correct', text: '7',  isCorrect: true,  nextNodeId: 'gso_step3_exit' },
        { id: 'wrong1',  text: '11', isCorrect: false, nextNodeId: 'gso_step3_B_remedy', weaknessId: 'g2_set_operation' },
        { id: 'wrong2',  text: '9',  isCorrect: false, nextNodeId: 'gso_step3_B_remedy', weaknessId: 'g2_set_operation' },
      ],
      dontKnowNextNodeId: 'gso_step3_B_easy',
    },
    'gso_step3_B_remedy': {
      id: 'gso_step3_B_remedy',
      kind: 'explain',
      title: '5 + 4 − 2 = 7',
      body: 'n(A) + n(B) − n(A∩B) = 5 + 4 − 2 = 7 이에요. 빼야 할 2 를 더하면 11 이 돼서 공통 원소가 세 번 세어진 셈이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step3_exit',
    },

    // ─────────── step3.C: "공통 원소가 없어도 빼야 한다" ───────────
    'gso_step3_C_explain': {
      id: 'gso_step3_C_explain',
      kind: 'explain',
      title: '공통 원소가 없으면 뺄 게 0 이에요',
      body: '공통 원소가 하나도 없으면 n(A∩B) = 0 이에요. 0 을 빼는 건 아무것도 빼지 않는 것과 같아요. 그래서 이때는 그냥 n(A) + n(B) 가 답이 돼요. 공식은 같지만 뺄 값이 0 이라 단순한 합이 되는 거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step3_B_easy',
      summary: '공통 원소가 없으면 n(A∩B) = 0 — 0 을 빼므로 결과는 단순한 합',
      triggers: [
        '공통이 없어도 빼야 하나요',
        '뺄 게 없으면 어떻게 해요',
        '공식이 안 맞는 것 같아요',
      ],
    },
    'gso_step3_C_check': {
      id: 'gso_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A = {1, 2}, B = {3, 4, 5} 처럼 공통 원소가 없을 때 n(A∪B) 는?',
      options: [
        { id: 'correct', text: '5', isCorrect: true,  nextNodeId: 'gso_step3_exit' },
        { id: 'wrong1',  text: '3', isCorrect: false, nextNodeId: 'gso_step3_C_remedy', weaknessId: 'g2_set_operation' },
        { id: 'wrong2',  text: '0', isCorrect: false, nextNodeId: 'gso_step3_C_remedy', weaknessId: 'g2_set_operation' },
      ],
      dontKnowNextNodeId: 'gso_step3_B_easy',
    },
    'gso_step3_C_remedy': {
      id: 'gso_step3_C_remedy',
      kind: 'explain',
      title: '2 + 3 − 0 = 5',
      body: '공통 원소가 없어서 n(A∩B) = 0 이에요. n(A∪B) = 2 + 3 − 0 = 5 예요. 0 을 빼도 개수는 줄지 않으니 그냥 두 개수를 더한 값이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gso_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gso_step3_exit',
    },

    'gso_step3_exit': { id: 'gso_step3_exit', kind: 'exit' },
  },
};
