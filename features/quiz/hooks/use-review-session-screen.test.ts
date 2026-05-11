import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReviewSessionScreen } from './use-review-session-screen';
import * as reviewFeedback from '@/features/quiz/review-feedback';

jest.mock('@/features/analytics/log-event', () => ({
  logEvent: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ taskId: '__mock__' }),
}));

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({
    session: { accountKey: 'acc-1' },
    refresh: jest.fn(),
    profile: { learnerId: 'l-1', grade: 'middle1' },
    recordAttempt: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/features/learning/review-scheduler', () => ({
  completeReviewTask: jest.fn().mockResolvedValue(undefined),
  rescheduleReviewTask: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/quiz/notifications/review-notification-scheduler', () => ({
  rescheduleAllReviewNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/quiz/review-feedback', () => ({
  requestReviewFeedback: jest.fn(),
}));

const mockRequestReviewFeedback = reviewFeedback.requestReviewFeedback as jest.Mock;

describe('useReviewSessionScreen — 보완 흐름 핵심 invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestReviewFeedback.mockResolvedValue({ replyText: 'AI 응답' });
  });

  it('정답 선택 후 onPressNext → 보완 phase 진입 없이 다음 step으로 이동', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // formula_understanding.step1 정답 = index 1 ("b/2를 먼저 계산해야 한다")
    act(() => {
      result.current.onSelectChoice(1);
    });
    act(() => {
      result.current.onPressNext();
    });

    expect(result.current.stepPhase).toBe('input');
    expect(result.current.remedialFlowState).toBeNull();
    expect(result.current.currentStepIndex).toBe(1);
  });

  it('오답 선택 후 onPressNext → remedial phase 진입, 시작 노드 entry 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // formula_understanding.step1 오답 index 0 → fu_step1_A_explain
    act(() => {
      result.current.onSelectChoice(0);
    });
    act(() => {
      result.current.onPressNext();
    });

    expect(result.current.stepPhase).toBe('remedial');
    expect(result.current.remedialFlowState?.currentNodeId).toBe('fu_step1_A_explain');
    expect(result.current.remedialFlowState?.entries.length).toBe(1);
    expect(result.current.remedialFlowState?.aiHelpUsed).toBe(false);
  });

  it('"모르겠어요" 첫 클릭 → AI 입력 카드 등장, aiHelpUsed는 AI 응답 성공 후에만 true (spec §6.3)', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => {
      result.current.onSelectChoice(0);
    });
    act(() => {
      result.current.onPressNext();
    });

    act(() => {
      result.current.onPressRemedialSecondary('fu_step1_A_explain');
    });
    // 카드는 보이지만 aiHelpUsed는 아직 false (실패 시 재시도 가능해야 하므로)
    expect(result.current.remedialFlowState?.aiHelpUsed).toBe(false);
    expect(result.current.remedialFlowState?.aiHelpState).not.toBeNull();
    const entries = result.current.remedialFlowState!.entries;
    expect(entries[entries.length - 1].kind).toBe('ai-help-input');

    // AI 응답 성공 → aiHelpUsed=true
    act(() => {
      result.current.onChangeRemedialAiHelpInput('왜 절반인가요?');
    });
    await act(async () => {
      await result.current.onSendRemedialAiHelp();
    });
    expect(result.current.remedialFlowState?.aiHelpUsed).toBe(true);
  });

  it('aiHelpUsed=true 상태에서 fallback 액션 → secondaryNextNodeId 노드로 진행', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => {
      result.current.onSelectChoice(0);
    });
    act(() => {
      result.current.onPressNext();
    });
    act(() => {
      result.current.onPressRemedialSecondary('fu_step1_A_explain');
    });
    act(() => {
      result.current.onChangeRemedialAiHelpInput('왜?');
    });
    await act(async () => {
      await result.current.onSendRemedialAiHelp();
    });

    expect(result.current.remedialFlowState?.aiHelpUsed).toBe(true);
    act(() => {
      result.current.onPressRemedialAiHelpAction('fallback');
    });
    // fu_step1_A_explain.secondaryNextNodeId = 'fu_step1_A_easy'
    expect(result.current.remedialFlowState?.currentNodeId).toBe('fu_step1_A_easy');
  });
});
