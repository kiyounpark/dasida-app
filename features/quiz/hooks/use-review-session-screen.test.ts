import { act, renderHook, waitFor } from '@testing-library/react-native';

// 본 테스트는 통합 mocking이 복잡하므로 다음 시나리오를 커버한다:
// 1. 정답 선택 → onPressNext → 보완 진입하지 않음 (entries 빈 상태 유지)
// 2. 오답 선택 + remedial 정의 있음 → entries에 시작 노드 추가
// 3. ExplainNode "다음으로" → 다음 노드 추가
// 4. ExplainNode "모르겠어요" 첫 번째 → AI 입력 카드 등장 + aiHelpUsed=true
// 5. "모르겠어요" 두 번째 (aiHelpUsed=true) → fallback 노드로 진행, AI 안 띄움
// 6. CheckNode 정답 → ExitNode → onPressContinue 호출

describe.skip('use-review-session-screen 보완 흐름 (통합)', () => {
  it.todo('정답 선택 시 보완 phase에 진입하지 않는다');
  it.todo('오답 선택 + remedial 정의 있음 시 remedial phase로 전환되고 시작 노드 entry가 추가된다');
  it.todo('ExplainNode "다음으로"가 primaryNextNodeId 노드를 추가한다');
  it.todo('"모르겠어요" 첫 클릭이 AI 입력 카드를 추가하고 aiHelpUsed를 true로 만든다');
  it.todo('aiHelpUsed=true 상태에서 "모르겠어요" 클릭이 AI 없이 fallback 노드로 진행한다');
  it.todo('CheckNode 정답이 ExitNode 경유 후 다음 step으로 이동한다');
});
