import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReviewSessionScreen } from './use-review-session-screen';
import * as reviewFeedback from '@/features/quiz/review-feedback';

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

describe('entries-based flow', () => {
  it('초기 entries에 step-card와 input-area가 있다', () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    expect(result.current.entries[0]).toMatchObject({ kind: 'step-card' });
    expect(result.current.entries[1]).toMatchObject({ kind: 'input-area', interactive: true });
  });

  it('정답 선택 시 choice-bubble + feedback-banner + done-cta 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const correctIdx = result.current.steps[0].choices.findIndex((c) => c.correct);

    await act(async () => {
      result.current.onSelectChoice(correctIdx);
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('choice-bubble');
    expect(kinds).toContain('feedback-banner');
    expect(kinds).toContain('done-cta');
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    expect(inputArea).toMatchObject({ interactive: false });
  });

  it('오답 선택 시 choice-bubble + feedback-banner + 첫 remedial-node 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);

    await act(async () => {
      result.current.onSelectChoice(wrongIdx);
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('choice-bubble');
    expect(kinds).toContain('feedback-banner');
    expect(kinds).toContain('remedial-node');
  });

  it('자유 입력 제출 시 user-bubble + ai-typing → ai-bubble로 교체', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValue({ replyText: 'AI 응답 내용' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('이해한 내용 작성'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('user-bubble');
    expect(kinds).toContain('ai-bubble');
    expect(kinds).not.toContain('ai-typing'); // 응답 도착 후 사라짐

    spy.mockRestore();
  });

  it('자유 입력 호출 실패 시 ai-typing 제거 + 에러 메시지 ai-bubble', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('hello'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).not.toContain('ai-typing');
    const lastAi = [...result.current.entries].reverse().find((e) => e.kind === 'ai-bubble');
    expect(lastAi).toBeDefined();

    spy.mockRestore();
  });

  it('1턴 응답 후 fallback-input(turn=2) 자동 추가', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValue({ replyText: '1차 응답' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('첫 입력'));
    await act(async () => { await result.current.onSubmitFreeText(); });

    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(fb).toMatchObject({ turn: 2, interactive: true });

    spy.mockRestore();
  });

  it('remedial explain 카드의 primary → 다음 노드 entry 추가, 이전 노드 잠금', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    await act(async () => {
      result.current.onRemedialExplainPrimary(firstNode.node.id);
    });

    const nodes = result.current.entries.filter((e) => e.kind === 'remedial-node');
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    expect(nodes[0]).toMatchObject({ interactive: false });
    expect(nodes[1]).toMatchObject({ interactive: true });
  });

  it('2턴 응답 후 done-cta 추가, fallback-input 잠금', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValueOnce({ replyText: '1차' })
      .mockResolvedValueOnce({ replyText: '2차 마무리' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('첫 입력'));
    await act(async () => { await result.current.onSubmitFreeText(); });

    act(() => result.current.onChangeFallbackText('두 번째 입력'));
    await act(async () => { await result.current.onSubmitFallback(); });

    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(fb).toMatchObject({ interactive: false });
    const lastEntry = result.current.entries[result.current.entries.length - 1];
    expect(lastEntry.kind).toBe('done-cta');

    spy.mockRestore();
  });
});
