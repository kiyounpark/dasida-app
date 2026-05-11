import type { RemedialFlow } from '../review-remedial-flows';

// nodeId 컨벤션: fu_step<N>_<choice>_<role>
// 약점 prefix: fu

export const formula_understanding_flow: RemedialFlow = {
  nodes: {
    // ─────────── step1: 오답 A ("b를 그대로 쓰면 된다") 분기 ───────────
    'fu_step1_A_explain': {
      id: 'fu_step1_A_explain',
      kind: 'explain',
      title: 'x 계수의 절반부터 다시 보기',
      body: '완전제곱식 (x + a)² 을 전개하면 2a가 x의 계수가 됩니다. 그래서 거꾸로 갈 때는 x 계수를 2로 나눠 a를 얻어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_A_easy': {
      id: 'fu_step1_A_easy',
      kind: 'explain',
      title: '더 짧게 한 번 더',
      body: 'x² + 6x 라면, 6 ÷ 2 = 3. 그래서 (x+3)² 모양으로 갑니다. 절반을 먼저 보세요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_exit',
    },
    'fu_step1_A_check': {
      id: 'fu_step1_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 8x 를 완전제곱식으로 만들 때, 절반을 취해야 하는 수는?',
      options: [
        { id: 'correct', text: '4', isCorrect: true, nextNodeId: 'fu_step1_exit' },
        { id: 'wrong1',  text: '8', isCorrect: false, nextNodeId: 'fu_step1_A_remedy' },
        { id: 'wrong2',  text: '16', isCorrect: false, nextNodeId: 'fu_step1_A_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_A_remedy': {
      id: 'fu_step1_A_remedy',
      kind: 'explain',
      title: '한 번 더 짚어봐요',
      body: '8 ÷ 2 = 4. 즉 x² + 8x = (x + 4)² - 16 입니다. "x 계수의 절반"이 항상 답입니다.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_exit',
    },

    // ─────────── step1: 오답 C ("계수는 신경 쓰지 않아도 된다") 분기 ───────────
    'fu_step1_C_explain': {
      id: 'fu_step1_C_explain',
      kind: 'explain',
      title: 'x 계수가 핵심입니다',
      body: '완전제곱식을 만들려면 (x + ?)² 형태를 목표로 해야 해요. ?가 되는 값이 바로 x 계수의 절반이에요. 계수를 무시하면 이 ?를 구할 수 없어요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_C_check': {
      id: 'fu_step1_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 10x 를 (x + ?)² 꼴로 만들 때 ?에 들어갈 수는?',
      options: [
        { id: 'correct', text: '5', isCorrect: true, nextNodeId: 'fu_step1_exit' },
        { id: 'wrong1',  text: '10', isCorrect: false, nextNodeId: 'fu_step1_C_remedy' },
        { id: 'wrong2',  text: '계수와 무관하다', isCorrect: false, nextNodeId: 'fu_step1_C_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_C_remedy': {
      id: 'fu_step1_C_remedy',
      kind: 'explain',
      title: '10 ÷ 2 = 5 가 답',
      body: 'x 계수 10을 2로 나누면 5. (x + 5)² = x² + 10x + 25 이므로 x 계수가 정확히 10이 돼요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_exit',
    },

    'fu_step1_exit': { id: 'fu_step1_exit', kind: 'exit' },

    // ─────────── step2: 오답 B ("b를 그대로 제곱한다") 분기 ───────────
    'fu_step2_B_explain': {
      id: 'fu_step2_B_explain',
      kind: 'explain',
      title: '절반을 제곱해야 해요',
      body: '(x + a)² = x² + 2ax + a² 에서 x의 계수는 2a입니다. 즉 a = (x 계수) ÷ 2 이고, 더해야 할 상수는 a² = (x 계수 / 2)² 이에요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step2_B_easy',
    },
    'fu_step2_B_easy': {
      id: 'fu_step2_B_easy',
      kind: 'explain',
      title: '예시로 확인해요',
      body: 'x² + 6x 에서 6 ÷ 2 = 3, 3² = 9 를 더하면 (x+3)² = x² + 6x + 9. b² = 36을 더하면 틀려요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step2_exit',
    },
    'fu_step2_B_check': {
      id: 'fu_step2_B_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 4x 에서 완전제곱식을 만들 때 더해야 할 수는?',
      options: [
        { id: 'correct', text: '4', isCorrect: true, nextNodeId: 'fu_step2_exit' },
        { id: 'wrong1',  text: '16', isCorrect: false, nextNodeId: 'fu_step2_B_remedy' },
        { id: 'wrong2',  text: '2', isCorrect: false, nextNodeId: 'fu_step2_B_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step2_B_easy',
    },
    'fu_step2_B_remedy': {
      id: 'fu_step2_B_remedy',
      kind: 'explain',
      title: '4 ÷ 2 = 2, 2² = 4',
      body: 'x 계수 4를 2로 나눠 2를 얻고, 2를 제곱하면 4. 이 4를 더하고 빼야 해요. (x+2)² - 4.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step2_B_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step2_exit',
    },

    // ─────────── step2: 오답 C ("상수항은 변하지 않는다") 분기 ───────────
    'fu_step2_C_explain': {
      id: 'fu_step2_C_explain',
      kind: 'explain',
      title: '뺀 만큼을 보상해야 해요',
      body: '완전제곱식을 만들려고 (b/2)²을 더하면, 그만큼 더 커졌으니까 원래 식으로 돌아오려면 (b/2)²을 다시 빼야 해요. 상수항이 바뀌는 이유가 바로 이거예요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step2_B_easy',
    },
    'fu_step2_C_check': {
      id: 'fu_step2_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 6x 에서 완전제곱식 변환 후 뒤에 붙어야 하는 수는?',
      options: [
        { id: 'correct', text: '-9', isCorrect: true, nextNodeId: 'fu_step2_exit' },
        { id: 'wrong1',  text: '0', isCorrect: false, nextNodeId: 'fu_step2_C_remedy' },
        { id: 'wrong2',  text: '+9', isCorrect: false, nextNodeId: 'fu_step2_C_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step2_B_easy',
    },
    'fu_step2_C_remedy': {
      id: 'fu_step2_C_remedy',
      kind: 'explain',
      title: '더한 9를 다시 빼요',
      body: '(x+3)² = x² + 6x + 9 이므로, x² + 6x = (x+3)² - 9 예요. 보상이 -9.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step2_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step2_exit',
    },

    'fu_step2_exit': { id: 'fu_step2_exit', kind: 'exit' },

    // ─────────── step3: 오답 A ("상수를 무시하고 계수만 본다") 분기 ───────────
    'fu_step3_A_explain': {
      id: 'fu_step3_A_explain',
      kind: 'explain',
      title: '원래 상수항 c도 챙겨야 해요',
      body: '완전제곱식 변환 후 남는 상수는 c − (b/2)² 이에요. c를 무시하면 완전히 다른 식이 됩니다.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step3_A_easy',
    },
    'fu_step3_A_easy': {
      id: 'fu_step3_A_easy',
      kind: 'explain',
      title: '예시로 보기',
      body: 'x² + 6x + 5 → (x+3)² - 9 + 5 = (x+3)² - 4. 여기서 5가 c예요. 무시하면 (x+3)² - 9로 달라져요.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step3_exit',
    },
    'fu_step3_A_check': {
      id: 'fu_step3_A_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 4x + 7 을 완전제곱식으로 변환했을 때 최종 상수는?',
      options: [
        { id: 'correct', text: '3', isCorrect: true, nextNodeId: 'fu_step3_exit' },
        { id: 'wrong1',  text: '-4', isCorrect: false, nextNodeId: 'fu_step3_A_remedy' },
        { id: 'wrong2',  text: '7', isCorrect: false, nextNodeId: 'fu_step3_A_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step3_A_easy',
    },
    'fu_step3_A_remedy': {
      id: 'fu_step3_A_remedy',
      kind: 'explain',
      title: '7 − 4 = 3',
      body: 'x 계수 4 → 절반 2 → 2² = 4. 원래 상수 7에서 4를 빼면 3. (x+2)² + 3.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step3_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step3_exit',
    },

    // ─────────── step3: 오답 C ("상수항은 항상 0이다") 분기 ───────────
    'fu_step3_C_explain': {
      id: 'fu_step3_C_explain',
      kind: 'explain',
      title: '상수항은 0이 아니에요',
      body: '원래 식에 상수항 c가 있다면 변환 후에도 c − (b/2)² 가 남아요. c가 (b/2)²과 정확히 같을 때만 우연히 0이 됩니다.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step3_A_easy',
    },
    'fu_step3_C_check': {
      id: 'fu_step3_C_check',
      kind: 'check',
      title: '확인 문제',
      prompt: 'x² + 6x + 2 를 완전제곱 변환 후 상수항은?',
      options: [
        { id: 'correct', text: '-7', isCorrect: true, nextNodeId: 'fu_step3_exit' },
        { id: 'wrong1',  text: '0', isCorrect: false, nextNodeId: 'fu_step3_C_remedy' },
        { id: 'wrong2',  text: '2', isCorrect: false, nextNodeId: 'fu_step3_C_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step3_A_easy',
    },
    'fu_step3_C_remedy': {
      id: 'fu_step3_C_remedy',
      kind: 'explain',
      title: '2 − 9 = −7',
      body: 'x 계수 6 → 절반 3 → 3² = 9. 원래 상수 2에서 9를 빼면 −7. (x+3)² − 7.',
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step3_C_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step3_exit',
    },

    'fu_step3_exit': { id: 'fu_step3_exit', kind: 'exit' },
  },
};
