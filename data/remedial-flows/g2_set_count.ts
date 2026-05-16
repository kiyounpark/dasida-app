import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: gsn_step<N>_<choice>_<role>
// 약점 prefix: gsn
// 구조: shallow (1-shot) — 6개 진입점 × (explain → check → (정답)exit / (오답)remedy → check 재시도)
// 6등급 학생 기준 — 원소의 개수, 교집합, 합집합, n(A∪B) 공식 등 단원 안 세부 용어 첫 등장 시 한 줄 정의 동봉.

export const g2_set_count_flow: RemedialFlow = {
  nodes: {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — 공식 적용 전 n(A∩B) 먼저 구하기
    //   B: "n(A∪B)를 직접 다 세면 된다"
    //   C: "n(A)와 n(B)만 알면 충분하다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step1.B: "n(A∪B)를 직접 다 세면 된다" ───────────
    'gsn_step1_B_explain': {
      id: 'gsn_step1_B_explain',
      kind: 'explain',
      title: '겹치는 부분부터 챙겨요',
      body: 'n(A∩B)는 두 집합에 공통으로 들어 있는 원소(집합 안에 들어 있는 하나하나의 값)의 개수예요. 큰 문제에서 원소를 일일이 다 세면 빠뜨리기 쉬워요. 그래서 공식을 쓸 때는 겹치는 부분 n(A∩B)를 먼저 구해 두는 게 안전해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step1_B_easy',
      summary: '공식 적용 전 겹치는 부분 n(A∩B)를 먼저 구해 두면 누락 없이 정확 — 직접 세기는 큰 문제에서 실수가 잦음',
      triggers: [
        '그냥 다 세면 되지 않나요',
        'n(A∩B)를 왜 먼저 구해요',
        '겹치는 게 뭔지 모르겠어요',
      ],
    },
    'gsn_step1_B_easy': {
      id: 'gsn_step1_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'A={1,2,3,4}, B={3,4,5}이면 두 집합에 같이 있는 3과 4가 교집합(양쪽에 공통으로 든 원소들의 모임)이에요. 그래서 n(A∩B)=2예요. 이 2를 먼저 정해 두면 다음 계산이 술술 풀려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step1_B_remedy',
    },
    'gsn_step1_B_check': {
      id: 'gsn_step1_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'A={2,4,6,8}, B={4,8,10}일 때 n(A∩B)는 얼마일까요?',
      options: [
        { id: 'correct', text: '2', isCorrect: true, nextNodeId: 'gsn_step1_exit' },
        { id: 'wrong1',  text: '3', isCorrect: false, nextNodeId: 'gsn_step1_B_remedy', weaknessId: 'g2_set_count' },
        { id: 'wrong2',  text: '5', isCorrect: false, nextNodeId: 'gsn_step1_B_remedy', weaknessId: 'g2_set_count' },
      ],
      dontKnowNextNodeId: 'gsn_step1_B_easy',
    },
    'gsn_step1_B_remedy': {
      id: 'gsn_step1_B_remedy',
      kind: 'explain',
      title: '양쪽에 같이 있는 원소만 세요',
      body: 'A와 B를 같이 보면 4와 8이 두 집합 모두에 들어 있어요. 그래서 n(A∩B)=2예요. 한쪽에만 있는 원소는 교집합에 들어가지 않아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step1_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step1_B_check',
    },

    // ─────────── step1.C: "n(A)와 n(B)만 알면 충분하다" ───────────
    'gsn_step1_C_explain': {
      id: 'gsn_step1_C_explain',
      kind: 'explain',
      title: '겹치는 부분이 빠지면 안 돼요',
      body: 'n(A)와 n(B)만 더하면 두 집합에 같이 든 원소가 두 번 세져요. 그 두 번 센 만큼을 정확히 보정하려면 겹치는 개수 n(A∩B)가 꼭 필요해요. 그래서 두 개의 개수만으로는 부족해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step1_C_remedy',
      summary: 'n(A)와 n(B)만 더하면 공통 원소가 두 번 세짐 — 보정하려면 n(A∩B)가 반드시 필요',
      triggers: [
        '두 개수만 알면 되는 거 아닌가요',
        '왜 교집합까지 필요해요',
        '겹치는 걸 왜 신경 써요',
      ],
    },
    'gsn_step1_C_check': {
      id: 'gsn_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'n(A∪B)를 구하려 할 때, n(A)와 n(B) 말고 꼭 더 필요한 값은?',
      options: [
        { id: 'correct', text: 'n(A∩B)', isCorrect: true, nextNodeId: 'gsn_step1_exit' },
        { id: 'wrong1',  text: '없어도 된다', isCorrect: false, nextNodeId: 'gsn_step1_C_remedy', weaknessId: 'g2_set_count' },
        { id: 'wrong2',  text: '전체집합 U의 개수', isCorrect: false, nextNodeId: 'gsn_step1_C_remedy', weaknessId: 'g2_set_count' },
      ],
      dontKnowNextNodeId: 'gsn_step1_C_remedy',
    },
    'gsn_step1_C_remedy': {
      id: 'gsn_step1_C_remedy',
      kind: 'explain',
      title: '두 번 센 만큼 빼 줘야 해요',
      body: 'n(A)와 n(B)를 더하면 공통 원소가 두 번 들어가요. 그 두 번을 한 번으로 맞추려면 n(A∩B)를 알아야 빼 줄 수 있어요. 그래서 교집합 개수가 꼭 필요해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step1_C_check',
    },

    'gsn_step1_exit': { id: 'gsn_step1_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — 공식 대입: n(A∪B) = n(A)+n(B)-n(A∩B), 딱 한 번만 빼기
    //   B: "n(A∩B)를 두 번 뺀다"
    //   C: "n(A∩B)를 더한다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step2.B: "n(A∩B)를 두 번 뺀다" ───────────
    'gsn_step2_B_explain': {
      id: 'gsn_step2_B_explain',
      kind: 'explain',
      title: '딱 한 번만 빼요',
      body: 'n(A)+n(B)를 더하면 겹치는 원소가 두 번 세진 거예요. 두 번을 한 번으로 맞추려면 n(A∩B)를 한 번만 빼면 돼요. 두 번 빼면 공통 원소가 한 번도 안 세지게 돼서 답이 모자라요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step2_B_easy',
      summary: 'n(A∩B)는 정확히 한 번만 뺌 — 두 번 빼면 공통 원소가 아예 안 세져서 답이 부족',
      triggers: [
        '두 번 빼야 하는 거 아닌가요',
        '왜 한 번만 빼요',
        '몇 번 빼는지 헷갈려요',
      ],
    },
    'gsn_step2_B_easy': {
      id: 'gsn_step2_B_easy',
      kind: 'explain',
      title: '예시로 봐요',
      body: 'n(A)=4, n(B)=3, n(A∩B)=2이면 4+3-2=5예요. 여기서 2를 한 번만 빼니까 5가 나와요. 2를 두 번 빼서 4+3-2-2=3으로 하면 답이 너무 작아져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step2_B_remedy',
    },
    'gsn_step2_B_check': {
      id: 'gsn_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'n(A)=6, n(B)=5, n(A∩B)=3일 때 n(A∪B)는?',
      options: [
        { id: 'correct', text: '8', isCorrect: true, nextNodeId: 'gsn_step2_exit' },
        { id: 'wrong1',  text: '5', isCorrect: false, nextNodeId: 'gsn_step2_B_remedy', weaknessId: 'g2_set_count' },
        { id: 'wrong2',  text: '11', isCorrect: false, nextNodeId: 'gsn_step2_B_remedy', weaknessId: 'g2_set_count' },
      ],
      dontKnowNextNodeId: 'gsn_step2_B_easy',
    },
    'gsn_step2_B_remedy': {
      id: 'gsn_step2_B_remedy',
      kind: 'explain',
      title: '6+5-3 = 8',
      body: 'n(A∪B) = n(A)+n(B)-n(A∩B) = 6+5-3 = 8이에요. 3을 한 번만 빼니까 8이에요. 두 번 빼서 5가 되면 공통 원소가 사라진 셈이라 틀려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step2_B_check',
    },

    // ─────────── step2.C: "n(A∩B)를 더한다" ───────────
    'gsn_step2_C_explain': {
      id: 'gsn_step2_C_explain',
      kind: 'explain',
      title: '더하면 더 늘어나요',
      body: '합집합(두 집합을 합쳐 만든 원소들의 모임)의 개수는 두 집합을 합치되 겹친 부분을 한 번만 세야 해요. n(A∩B)를 더하면 공통 원소가 세 번이나 세져서 답이 커져요. 그래서 더하는 게 아니라 빼는 방향이 맞아요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step2_C_remedy',
      summary: 'n(A∩B)는 더하는 게 아니라 뺌 — 더하면 공통 원소가 세 번 세져 답이 과대',
      triggers: [
        '더하는 거 아니었나요',
        '왜 빼요 더하면 안 돼요',
        '부호가 헷갈려요',
      ],
    },
    'gsn_step2_C_check': {
      id: 'gsn_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'n(A)=7, n(B)=4, n(A∩B)=2일 때 n(A∪B)는?',
      options: [
        { id: 'correct', text: '9', isCorrect: true, nextNodeId: 'gsn_step2_exit' },
        { id: 'wrong1',  text: '13', isCorrect: false, nextNodeId: 'gsn_step2_C_remedy', weaknessId: 'g2_set_count' },
        { id: 'wrong2',  text: '11', isCorrect: false, nextNodeId: 'gsn_step2_C_remedy', weaknessId: 'g2_set_count' },
      ],
      dontKnowNextNodeId: 'gsn_step2_C_remedy',
    },
    'gsn_step2_C_remedy': {
      id: 'gsn_step2_C_remedy',
      kind: 'explain',
      title: '7+4-2 = 9',
      body: 'n(A∪B) = 7+4-2 = 9예요. 2를 빼야 겹친 부분이 한 번만 세져요. 더해서 13이 되면 공통 원소가 세 번 들어간 셈이라 너무 커져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step2_C_check',
    },

    'gsn_step2_exit': { id: 'gsn_step2_exit', kind: 'exit' },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — 결과 검증: max(n(A),n(B)) ≤ n(A∪B) ≤ n(A)+n(B)
    //   B: "n(A∪B)는 항상 n(A)+n(B)와 같다"
    //   C: "n(A∪B)는 두 집합 중 작은 것보다 작을 수 있다"
    // ═══════════════════════════════════════════════════════════════

    // ─────────── step3.B: "n(A∪B)는 항상 n(A)+n(B)와 같다" ───────────
    'gsn_step3_B_explain': {
      id: 'gsn_step3_B_explain',
      kind: 'explain',
      title: '겹치면 합보다 작아져요',
      body: 'n(A∪B)는 단순히 더한 n(A)+n(B)에서 겹친 만큼을 뺀 값이에요. 그래서 보통은 합보다 작아요. 두 값이 똑같아지는 건 겹치는 원소가 하나도 없을 때(n(A∩B)=0)뿐이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step3_B_easy',
      summary: 'n(A∪B) ≤ n(A)+n(B) — 두 값이 같은 건 공통 원소가 없을 때(n(A∩B)=0)뿐',
      triggers: [
        '그냥 더한 값이랑 같지 않나요',
        '왜 합보다 작아져요',
        '검산을 어떻게 해요',
      ],
    },
    'gsn_step3_B_easy': {
      id: 'gsn_step3_B_easy',
      kind: 'explain',
      title: '한 번 더 짧게',
      body: 'n(A)=4, n(B)=3인데 겹치는 게 2개면 n(A∪B)=5예요. 단순 합 7보다 작죠. 겹치는 게 0개일 때만 4+3=7로 합과 같아져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step3_B_remedy',
    },
    'gsn_step3_B_check': {
      id: 'gsn_step3_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'n(A)=5, n(B)=4이고 공통 원소가 있을 때, n(A∪B)에 대해 항상 맞는 것은?',
      options: [
        { id: 'correct', text: 'n(A∪B) < 9', isCorrect: true, nextNodeId: 'gsn_step3_exit' },
        { id: 'wrong1',  text: 'n(A∪B) = 9', isCorrect: false, nextNodeId: 'gsn_step3_B_remedy', weaknessId: 'g2_set_count' },
        { id: 'wrong2',  text: 'n(A∪B) > 9', isCorrect: false, nextNodeId: 'gsn_step3_B_remedy', weaknessId: 'g2_set_count' },
      ],
      dontKnowNextNodeId: 'gsn_step3_B_easy',
    },
    'gsn_step3_B_remedy': {
      id: 'gsn_step3_B_remedy',
      kind: 'explain',
      title: '겹친 만큼 빠지니 9보다 작아요',
      body: 'n(A)+n(B)=9인데 공통 원소가 있으면 그만큼 빼니까 n(A∪B)는 9보다 작아져요. 9와 같아지려면 겹치는 원소가 하나도 없어야 해요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step3_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step3_B_check',
    },

    // ─────────── step3.C: "n(A∪B)는 두 집합 중 작은 것보다 작을 수 있다" ───────────
    'gsn_step3_C_explain': {
      id: 'gsn_step3_C_explain',
      kind: 'explain',
      title: '두 집합 중 큰 쪽보다 작아질 수 없어요',
      body: '합집합은 A의 원소도 B의 원소도 모두 품어요. 그러니 어느 한 집합 전체를 통째로 포함해요. 그래서 n(A∪B)는 두 집합 중 큰 쪽의 개수보다 작아질 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step3_C_remedy',
      summary: 'n(A∪B) ≥ max(n(A), n(B)) — 합집합은 두 집합을 모두 포함하므로 큰 쪽보다 작아질 수 없음',
      triggers: [
        '작은 것보다 작아질 수도 있지 않나요',
        '아래쪽 한계가 뭐예요',
        '얼마보다 커야 해요',
      ],
    },
    'gsn_step3_C_check': {
      id: 'gsn_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'n(A)=6, n(B)=4일 때 n(A∪B)가 절대 될 수 없는 값은?',
      options: [
        { id: 'correct', text: '5', isCorrect: true, nextNodeId: 'gsn_step3_exit' },
        { id: 'wrong1',  text: '7', isCorrect: false, nextNodeId: 'gsn_step3_C_remedy', weaknessId: 'g2_set_count' },
        { id: 'wrong2',  text: '10', isCorrect: false, nextNodeId: 'gsn_step3_C_remedy', weaknessId: 'g2_set_count' },
      ],
      dontKnowNextNodeId: 'gsn_step3_C_remedy',
    },
    'gsn_step3_C_remedy': {
      id: 'gsn_step3_C_remedy',
      kind: 'explain',
      title: '큰 쪽 6보다 작아질 수 없어요',
      body: 'n(A)=6이므로 합집합은 A를 통째로 품어 적어도 6은 돼요. 그래서 5는 절대 될 수 없어요. 가능한 범위는 6 이상 10 이하예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'gsn_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'gsn_step3_C_check',
    },

    'gsn_step3_exit': { id: 'gsn_step3_exit', kind: 'exit' },
  },
};
