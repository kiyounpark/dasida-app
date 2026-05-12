import { act, renderHook } from '@testing-library/react-native';
import { useReviewEntries } from './use-review-entries';

describe('useReviewEntries', () => {
  it('초기화 시 step-card + input-area 시드', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    expect(result.current.entries).toEqual([
      { kind: 'step-card', stepIndex: 0 },
      { kind: 'input-area', stepIndex: 0, interactive: true },
    ]);
  });

  it('appendEntries 시 뒤에 추가', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([{ kind: 'user-bubble', text: 'hi' }]));
    expect(result.current.entries[2]).toEqual({ kind: 'user-bubble', text: 'hi' });
  });

  it('resetForStep 호출 시 entries 새로 시드', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([{ kind: 'user-bubble', text: 'hi' }]));
    act(() => result.current.resetForStep(3));
    expect(result.current.entries).toEqual([
      { kind: 'step-card', stepIndex: 3 },
      { kind: 'input-area', stepIndex: 3, interactive: true },
    ]);
  });

  it('lockInputArea — 모든 input-area, fallback-input 인터랙티브 false로', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([
      { kind: 'fallback-input', turn: 1, interactive: true },
    ]));
    act(() => result.current.lockInputArea());
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(inputArea).toMatchObject({ interactive: false });
    expect(fb).toMatchObject({ interactive: false });
  });

  it('replaceTypingWithBubble — 마지막 ai-typing을 ai-bubble로 교체', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([{ kind: 'ai-typing' }]));
    act(() => result.current.replaceTypingWithBubble('응답입니다'));
    const last = result.current.entries[result.current.entries.length - 1];
    expect(last).toEqual({ kind: 'ai-bubble', text: '응답입니다' });
  });

  it('replaceTypingWithBubble — typing 없으면 단순 append', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.replaceTypingWithBubble('응답'));
    const last = result.current.entries[result.current.entries.length - 1];
    expect(last).toEqual({ kind: 'ai-bubble', text: '응답' });
  });

  it('unlockLatestInput — 가장 최근 input-area를 interactive=true로 복원', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.lockInputArea());
    act(() => result.current.unlockLatestInput());
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    expect(inputArea).toMatchObject({ interactive: true });
  });

  it('unlockLatestInput — fallback-input이 있으면 그것을 우선 복원', () => {
    const { result } = renderHook(() => useReviewEntries(0));
    act(() => result.current.appendEntries([
      { kind: 'fallback-input', turn: 2, interactive: true },
    ]));
    act(() => result.current.lockInputArea());
    act(() => result.current.unlockLatestInput());
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(inputArea).toMatchObject({ interactive: false });
    expect(fb).toMatchObject({ interactive: true });
  });
});
