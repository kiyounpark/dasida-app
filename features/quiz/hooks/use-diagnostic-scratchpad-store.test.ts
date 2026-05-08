import { act, renderHook } from '@testing-library/react-native';

import { useDiagnosticScratchpadStore } from '@/features/quiz/hooks/use-diagnostic-scratchpad-store';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid' }));

describe('useDiagnosticScratchpadStore', () => {
  it('초기엔 모든 index에 대해 stroke 비어 있음', () => {
    const { result } = renderHook(() => useDiagnosticScratchpadStore());
    expect(result.current.getStrokes(0)).toEqual([]);
    expect(result.current.hasStrokes(0)).toBe(false);
    expect(result.current.getStrokes(5)).toEqual([]);
  });

  it('forIndex(0): begin → append → end → strokes 1개 추가, hasStrokes(0)=true, hasStrokes(1)=false', () => {
    const { result } = renderHook(() => useDiagnosticScratchpadStore());
    act(() => {
      const api = result.current.forIndex(0);
      api.beginStroke({ x: 0, y: 0, p: 0.5 });
      api.appendPoint({ x: 5, y: 5, p: 0.5 });
      api.endStroke();
    });
    expect(result.current.getStrokes(0)).toHaveLength(1);
    expect(result.current.getStrokes(0)[0].points).toHaveLength(2);
    expect(result.current.hasStrokes(0)).toBe(true);
    expect(result.current.hasStrokes(1)).toBe(false);
  });

  it('서로 다른 index의 stroke은 독립적', () => {
    const { result } = renderHook(() => useDiagnosticScratchpadStore());
    act(() => {
      const a = result.current.forIndex(0);
      a.beginStroke({ x: 0, y: 0, p: 0.5 });
      a.endStroke();
    });
    act(() => {
      const b = result.current.forIndex(1);
      b.beginStroke({ x: 10, y: 10, p: 0.5 });
      b.endStroke();
    });
    expect(result.current.getStrokes(0)).toHaveLength(1);
    expect(result.current.getStrokes(1)).toHaveLength(1);
    expect(result.current.getStrokes(0)[0]).not.toBe(result.current.getStrokes(1)[0]);
  });

  it('undo/redo는 해당 index 한정으로 동작', () => {
    const { result } = renderHook(() => useDiagnosticScratchpadStore());
    act(() => {
      const api = result.current.forIndex(0);
      api.beginStroke({ x: 0, y: 0, p: 0.5 });
      api.endStroke();
    });
    expect(result.current.getStrokes(0)).toHaveLength(1);

    act(() => result.current.forIndex(0).undo());
    expect(result.current.getStrokes(0)).toHaveLength(0);

    act(() => result.current.forIndex(0).redo());
    expect(result.current.getStrokes(0)).toHaveLength(1);
  });

  it('eraser는 stroke 위 점을 지움 + commit-erase가 단일 undo로 묶음', () => {
    const { result } = renderHook(() => useDiagnosticScratchpadStore());
    act(() => {
      const api = result.current.forIndex(0);
      api.beginStroke({ x: 10, y: 10, p: 0.5 });
      api.appendPoint({ x: 20, y: 20, p: 0.5 });
      api.endStroke();
    });
    expect(result.current.getStrokes(0)).toHaveLength(1);

    act(() => {
      const api = result.current.forIndex(0);
      api.setTool('eraser');
      api.setSize(40); // radius 20
      api.beginStroke({ x: 15, y: 15, p: 0 });
      api.endStroke();
    });
    expect(result.current.getStrokes(0)).toHaveLength(0);

    act(() => result.current.forIndex(0).undo());
    expect(result.current.getStrokes(0)).toHaveLength(1);
  });

  it('resetAll은 모든 index의 stroke 초기화', () => {
    const { result } = renderHook(() => useDiagnosticScratchpadStore());
    act(() => {
      const a = result.current.forIndex(0);
      a.beginStroke({ x: 0, y: 0, p: 0.5 });
      a.endStroke();
      const b = result.current.forIndex(2);
      b.beginStroke({ x: 0, y: 0, p: 0.5 });
      b.endStroke();
    });
    expect(result.current.hasStrokes(0)).toBe(true);
    expect(result.current.hasStrokes(2)).toBe(true);

    act(() => result.current.resetAll());

    expect(result.current.hasStrokes(0)).toBe(false);
    expect(result.current.hasStrokes(2)).toBe(false);
  });
});
