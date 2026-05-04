import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useScratchpad } from '@/features/quiz/exam/hooks/use-scratchpad';

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ profile: { accountKey: 'user-abc' } }),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid' }));

const mocked = jest.mocked(AsyncStorage);
const EXAM = 'exam-1';
const PROBLEM = 21;

describe('useScratchpad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('초기엔 stroke 비어 있음', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.strokes).toEqual([]);
  });

  it('저장된 stroke 로드', async () => {
    mocked.getItem.mockResolvedValueOnce(
      JSON.stringify({
        examId: EXAM,
        problemNumber: PROBLEM,
        strokes: [{ id: 'a', tool: 'pen', color: '#000', size: 2, points: [] }],
        updatedAt: 1,
      }),
    );
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.strokes[0].id).toBe('a');
  });

  it('beginStroke → appendPoint → endStroke 순서로 stroke 추가', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.appendPoint({ x: 5, y: 5, p: 0.5 }); // distance ~7px, added
      result.current.endStroke();
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.strokes[0].points).toHaveLength(2);
  });

  it('endStroke 후 500ms debounce로 AsyncStorage write', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.endStroke();
    });

    expect(mocked.setItem).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(500); });
    await waitFor(() => expect(mocked.setItem).toHaveBeenCalledTimes(1));
  });

  it('undo는 마지막 stroke 제거, redo는 복원', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.endStroke();
    });
    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.strokes).toHaveLength(0);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.strokes).toHaveLength(1);
  });

  it('지우개 도구는 거리 내 stroke를 제거', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.beginStroke({ x: 100, y: 100, p: 0.5 });
      result.current.appendPoint({ x: 110, y: 110, p: 0.5 });
      result.current.endStroke();
    });
    expect(result.current.strokes).toHaveLength(1);

    act(() => {
      result.current.setTool('eraser');
      result.current.setSize(16); // radius = 8
      result.current.beginStroke({ x: 105, y: 105, p: 0 }); // distance ~7px < 8 → erases
    });
    expect(result.current.strokes).toHaveLength(0);
  });

  it('clear는 모든 stroke와 undo/redo 스택을 비움', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.endStroke();
    });
    act(() => result.current.clear());
    expect(result.current.strokes).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('1.5px 미만 이동은 점 추가 안 함', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });        // recorded
      result.current.appendPoint({ x: 1, y: 0, p: 0.5 });        // 1px — skip
      result.current.appendPoint({ x: 2, y: 0, p: 0.5 });        // 2px from last recorded (0,0) — add
      result.current.endStroke();
    });
    expect(result.current.strokes[0].points).toHaveLength(2);
  });
});
