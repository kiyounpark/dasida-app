# 10문제 약점진단 — 스크래치패드 + 분석 단계 원본 풀이 보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여정보드의 10문제 약점진단에서 풀이 단계에 모의고사 패턴의 좌우 분할 스크래치패드를 도입하고, 분석 단계에서 풀이 때 그린 필기를 원본 풀이 시트로 다시 볼 수 있게 한다.

**Architecture:** in-memory `Map<answerIndex, Stroke[]>` store를 `useDiagnosticScreen` 화면 단위 단일 인스턴스로 들고, 풀이 단계엔 활성 question의 편집 API를, 분석 단계엔 read-only 조회를 노출한다. 좌우 분할/툴바/시트/배너는 모의고사 컴포넌트를 그대로 재사용하고, 분할 비율 store도 공유한다. 캔버스는 태블릿 + 가로모드일 때만 노출.

**Tech Stack:** React Native + Expo + TypeScript + Reanimated/Skia(scratchpad-canvas), Jest + @testing-library/react-native (테스트), expo-screen-orientation.

**Spec:** [docs/superpowers/specs/2026-05-09-diagnostic-scratchpad-design.md](../specs/2026-05-09-diagnostic-scratchpad-design.md)

---

## 파일 구조 개관

**신규 (3개)**
- `features/quiz/hooks/use-diagnostic-scratchpad-store.ts` — `Map<answerIndex, Stroke[]>` 메모리 store + `useScratchpad`-호환 인터페이스
- `features/quiz/hooks/use-diagnostic-screen-orientation.ts` — focus 시 4방향 unlock, blur 시 portrait lock, 회전 콜백
- `features/quiz/components/diagnostic-solve-tablet-layout.tsx` — `ExamSolveTabletLayout`과 동일 구조의 좌우 분할 레이아웃 (재사용 검토 후 신규로 분리하는 이유는 Task 3에서 설명)

**수정 (3개)**
- `features/quiz/components/diagnostic-quiz-stage.tsx` — tablet+landscape 분기 + 신규 레이아웃 + 배너
- `features/quiz/hooks/use-diagnostic-screen.ts` — store + orientation + 노출 필드 추가
- `features/quiz/components/diagnostic-screen-view.tsx` — 분석 단계 헤더 버튼 + 시트 모달 마운트

**테스트 신규 (2개)**
- `features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts`
- `features/quiz/hooks/use-diagnostic-screen-orientation.test.ts`

**재사용 (변경 없음)**
- `features/quiz/exam/components/scratchpad-canvas.tsx`
- `features/quiz/exam/components/scratchpad-toolbar.tsx`
- `features/quiz/exam/components/original-strokes-sheet.tsx`
- `features/quiz/exam/components/landscape-hint-banner.tsx`
- `features/quiz/exam/components/split-divider.tsx`
- `features/quiz/exam/storage/scratchpad-split-ratio-store.ts`
- `features/quiz/exam/storage/scratchpad-strokes-store.ts` (Stroke/StrokePoint 타입만)

---

## Task 1: `useDiagnosticScratchpadStore` 훅 (in-memory store)

**Files:**
- Create: `features/quiz/hooks/use-diagnostic-scratchpad-store.ts`
- Test: `features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts`

**Goal:** `useScratchpad`의 reducer 로직(begin/append/end/erase/undo/redo/clear/set-tool/color/size)을 거의 그대로 재사용하되, **디스크 I/O를 완전히 제거**하고 key를 `answerIndex`로 바꾼 in-memory store. `forIndex(answerIndex)`가 해당 index 바인딩 callback set을 메모이즈해서 반환하고, `getStrokes(idx)` / `hasStrokes(idx)`로 read-only 접근.

**Why a new hook (not parameterize existing):** `useScratchpad`는 디스크 write effect, accountKey/examId/problemNumber 의존 hydrate effect가 있어 휘발성으로 단순화하려면 분리하는 편이 깨끗하다. reducer는 동일 동작 보장.

- [ ] **Step 1: Write the failing test (skeleton + 비어있는 초기 상태)**

`features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts` 생성:

```typescript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts`
Expected: FAIL — "Cannot find module" (파일 없음).

- [ ] **Step 3: Create the hook with minimal API**

`features/quiz/hooks/use-diagnostic-scratchpad-store.ts`:

```typescript
import * as Crypto from 'expo-crypto';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import type {
  Stroke,
  StrokePoint,
  StrokeTool,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

export type ActiveTool = 'pen' | 'highlighter' | 'eraser';

const DEFAULT_TOOL: ActiveTool = 'pen';
const DEFAULT_COLOR = '#1A1916';
const DEFAULT_SIZE = 2;
const POINT_MIN_DIST_SQ = 1.5 * 1.5;
const UNDO_LIMIT = 50;

type IndexState = {
  strokes: Stroke[];
  liveStroke: Stroke | null;
  undoStack: Stroke[][];
  redoStack: Stroke[][];
};

type State = {
  byIndex: Map<number, IndexState>;
  tool: ActiveTool;
  color: string;
  size: number;
};

type Action =
  | { type: 'set-tool'; tool: ActiveTool }
  | { type: 'set-color'; color: string }
  | { type: 'set-size'; size: number }
  | { type: 'begin'; idx: number; stroke: Stroke }
  | { type: 'append'; idx: number; point: StrokePoint }
  | { type: 'end'; idx: number }
  | { type: 'erase-at'; idx: number; x: number; y: number; radius: number }
  | { type: 'commit-erase'; idx: number; snapshot: Stroke[] }
  | { type: 'undo'; idx: number }
  | { type: 'redo'; idx: number }
  | { type: 'clear'; idx: number }
  | { type: 'reset-all' };

const EMPTY_INDEX_STATE: IndexState = {
  strokes: [],
  liveStroke: null,
  undoStack: [],
  redoStack: [],
};

function getIndex(state: State, idx: number): IndexState {
  return state.byIndex.get(idx) ?? EMPTY_INDEX_STATE;
}

function setIndex(state: State, idx: number, next: IndexState): State {
  const map = new Map(state.byIndex);
  map.set(idx, next);
  return { ...state, byIndex: map };
}

function pushUndo(undoStack: Stroke[][], strokes: Stroke[]): Stroke[][] {
  const next = [...undoStack, strokes];
  return next.length > UNDO_LIMIT ? next.slice(next.length - UNDO_LIMIT) : next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set-tool':
      return { ...state, tool: action.tool };
    case 'set-color':
      return { ...state, color: action.color };
    case 'set-size':
      return { ...state, size: action.size };
    case 'begin': {
      const cur = getIndex(state, action.idx);
      return setIndex(state, action.idx, { ...cur, liveStroke: action.stroke });
    }
    case 'append': {
      const cur = getIndex(state, action.idx);
      if (!cur.liveStroke) return state;
      const pts = cur.liveStroke.points;
      const last = pts[pts.length - 1];
      const dx = action.point.x - last.x;
      const dy = action.point.y - last.y;
      if (dx * dx + dy * dy < POINT_MIN_DIST_SQ) return state;
      return setIndex(state, action.idx, {
        ...cur,
        liveStroke: { ...cur.liveStroke, points: [...pts, action.point] },
      });
    }
    case 'end': {
      const cur = getIndex(state, action.idx);
      if (!cur.liveStroke) return state;
      return setIndex(state, action.idx, {
        strokes: [...cur.strokes, cur.liveStroke],
        liveStroke: null,
        undoStack: pushUndo(cur.undoStack, cur.strokes),
        redoStack: [],
      });
    }
    case 'erase-at': {
      const cur = getIndex(state, action.idx);
      const r2 = action.radius * action.radius;
      const remaining = cur.strokes.filter(
        (s) =>
          !s.points.some(
            (pt) => (pt.x - action.x) ** 2 + (pt.y - action.y) ** 2 <= r2,
          ),
      );
      if (remaining.length === cur.strokes.length) return state;
      return setIndex(state, action.idx, { ...cur, strokes: remaining });
    }
    case 'commit-erase': {
      const cur = getIndex(state, action.idx);
      if (action.snapshot === cur.strokes) return state;
      return setIndex(state, action.idx, {
        ...cur,
        undoStack: pushUndo(cur.undoStack, action.snapshot),
        redoStack: [],
      });
    }
    case 'undo': {
      const cur = getIndex(state, action.idx);
      if (cur.undoStack.length === 0) return state;
      const prev = cur.undoStack[cur.undoStack.length - 1];
      return setIndex(state, action.idx, {
        ...cur,
        strokes: prev,
        undoStack: cur.undoStack.slice(0, -1),
        redoStack: [...cur.redoStack, cur.strokes],
      });
    }
    case 'redo': {
      const cur = getIndex(state, action.idx);
      if (cur.redoStack.length === 0) return state;
      const next = cur.redoStack[cur.redoStack.length - 1];
      return setIndex(state, action.idx, {
        ...cur,
        strokes: next,
        redoStack: cur.redoStack.slice(0, -1),
        undoStack: [...cur.undoStack, cur.strokes],
      });
    }
    case 'clear': {
      return setIndex(state, action.idx, EMPTY_INDEX_STATE);
    }
    case 'reset-all':
      return { ...state, byIndex: new Map() };
  }
}

const initialState: State = {
  byIndex: new Map(),
  tool: DEFAULT_TOOL,
  color: DEFAULT_COLOR,
  size: DEFAULT_SIZE,
};

export type IndexedScratchpadApi = {
  loaded: true;
  strokes: Stroke[];
  liveStroke: Stroke | null;
  tool: ActiveTool;
  color: string;
  size: number;
  setTool: (t: ActiveTool) => void;
  setColor: (c: string) => void;
  setSize: (s: number) => void;
  beginStroke: (p: StrokePoint) => void;
  appendPoint: (p: StrokePoint) => void;
  endStroke: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export type DiagnosticScratchpadStore = {
  forIndex(answerIndex: number): IndexedScratchpadApi;
  getStrokes(answerIndex: number): Stroke[];
  hasStrokes(answerIndex: number): boolean;
  resetAll(): void;
};

export function useDiagnosticScratchpadStore(): DiagnosticScratchpadStore {
  const [state, dispatch] = useReducer(reducer, initialState);

  const stateRef = useRef(state);
  stateRef.current = state;

  const toolRef = useRef<ActiveTool>(initialState.tool);
  const colorRef = useRef<string>(initialState.color);
  const sizeRef = useRef<number>(initialState.size);
  const eraseSnapshotRef = useRef<Map<number, Stroke[]>>(new Map());

  const setTool = useCallback((t: ActiveTool) => {
    toolRef.current = t;
    dispatch({ type: 'set-tool', tool: t });
  }, []);
  const setColor = useCallback((c: string) => {
    colorRef.current = c;
    dispatch({ type: 'set-color', color: c });
  }, []);
  const setSize = useCallback((s: number) => {
    sizeRef.current = s;
    dispatch({ type: 'set-size', size: s });
  }, []);

  const resetAll = useCallback(() => dispatch({ type: 'reset-all' }), []);

  // forIndex가 호출될 때마다 새 객체를 만드는 대신, idx별 callback set을 캐시한다.
  // 단, canUndo/canRedo/strokes 등 상태 의존 필드는 매 렌더에서 최신 state로 재계산해야 한다.
  const callbacksByIdx = useRef<
    Map<
      number,
      {
        beginStroke: (p: StrokePoint) => void;
        appendPoint: (p: StrokePoint) => void;
        endStroke: () => void;
        undo: () => void;
        redo: () => void;
        clear: () => void;
      }
    >
  >(new Map());

  const ensureCallbacks = useCallback((idx: number) => {
    let entry = callbacksByIdx.current.get(idx);
    if (entry) return entry;
    entry = {
      beginStroke: (p: StrokePoint) => {
        if (toolRef.current === 'eraser') {
          const cur = getIndex(stateRef.current, idx);
          eraseSnapshotRef.current.set(idx, cur.strokes);
          dispatch({ type: 'erase-at', idx, x: p.x, y: p.y, radius: sizeRef.current / 2 });
          return;
        }
        const tool: StrokeTool = toolRef.current as StrokeTool;
        dispatch({
          type: 'begin',
          idx,
          stroke: {
            id: Crypto.randomUUID(),
            tool,
            color: colorRef.current,
            size: sizeRef.current,
            points: [p],
          },
        });
      },
      appendPoint: (p: StrokePoint) => {
        if (toolRef.current === 'eraser') {
          dispatch({ type: 'erase-at', idx, x: p.x, y: p.y, radius: sizeRef.current / 2 });
          return;
        }
        dispatch({ type: 'append', idx, point: p });
      },
      endStroke: () => {
        if (toolRef.current === 'eraser') {
          const snapshot = eraseSnapshotRef.current.get(idx);
          eraseSnapshotRef.current.delete(idx);
          if (snapshot) dispatch({ type: 'commit-erase', idx, snapshot });
          return;
        }
        dispatch({ type: 'end', idx });
      },
      undo: () => dispatch({ type: 'undo', idx }),
      redo: () => dispatch({ type: 'redo', idx }),
      clear: () => dispatch({ type: 'clear', idx }),
    };
    callbacksByIdx.current.set(idx, entry);
    return entry;
  }, []);

  return useMemo<DiagnosticScratchpadStore>(
    () => ({
      forIndex(idx) {
        const cur = state.byIndex.get(idx) ?? EMPTY_INDEX_STATE;
        const cbs = ensureCallbacks(idx);
        return {
          loaded: true,
          strokes: cur.strokes,
          liveStroke: cur.liveStroke,
          tool: state.tool,
          color: state.color,
          size: state.size,
          setTool,
          setColor,
          setSize,
          beginStroke: cbs.beginStroke,
          appendPoint: cbs.appendPoint,
          endStroke: cbs.endStroke,
          undo: cbs.undo,
          redo: cbs.redo,
          clear: cbs.clear,
          canUndo: cur.undoStack.length > 0,
          canRedo: cur.redoStack.length > 0,
        };
      },
      getStrokes(idx) {
        return (state.byIndex.get(idx) ?? EMPTY_INDEX_STATE).strokes;
      },
      hasStrokes(idx) {
        return (state.byIndex.get(idx) ?? EMPTY_INDEX_STATE).strokes.length > 0;
      },
      resetAll,
    }),
    [state, ensureCallbacks, setTool, setColor, setSize, resetAll],
  );
}
```

- [ ] **Step 4: Run test to verify Step 1 test passes**

Run: `npx jest features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Add stroke add/erase/undo tests**

Append to `use-diagnostic-scratchpad-store.test.ts`:

```typescript
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
```

- [ ] **Step 6: Run all hook tests**

Run: `npx jest features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts`
Expected: PASS (5 tests total).

- [ ] **Step 7: Commit**

```bash
git add features/quiz/hooks/use-diagnostic-scratchpad-store.ts features/quiz/hooks/use-diagnostic-scratchpad-store.test.ts
git commit -m "feat(diagnostic): in-memory scratchpad store keyed by answerIndex"
```

---

## Task 2: `useDiagnosticScreenOrientation` 훅

**Files:**
- Create: `features/quiz/hooks/use-diagnostic-screen-orientation.ts`
- Test: `features/quiz/hooks/use-diagnostic-screen-orientation.test.ts`

**Goal:** [useExamScreenOrientation](features/quiz/exam/hooks/use-exam-screen-orientation.ts)와 동일한 동작 — focus 시 4방향 unlock(태블릿만), blur 시 portrait 재잠금. 회전 콜백으로 진행 중 stroke 끊기 트리거. 코드는 거의 동일하지만 위치를 `features/quiz/`로 옮겨 재사용 신호 분명히 한다.

- [ ] **Step 1: Write the failing test**

`features/quiz/hooks/use-diagnostic-screen-orientation.test.ts`:

```typescript
import { renderHook } from '@testing-library/react-native';

import { useDiagnosticScreenOrientation } from '@/features/quiz/hooks/use-diagnostic-screen-orientation';

const unlockMock = jest.fn();
const lockPortraitMock = jest.fn();

jest.mock('@/hooks/use-orientation-lock', () => ({
  unlockAllOrientations: () => unlockMock(),
  lockToPortrait: () => lockPortraitMock(),
}));

const addListenerMock = jest.fn();
const removeListenerMock = jest.fn();
jest.mock('expo-screen-orientation', () => ({
  addOrientationChangeListener: (cb: () => void) => {
    addListenerMock(cb);
    return { remove: () => {} };
  },
  removeOrientationChangeListener: () => removeListenerMock(),
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => () => void) => {
    const cleanup = cb();
    // unmount 시점에 cleanup 호출되도록 React unmount 의존
    return cleanup;
  },
}));

describe('useDiagnosticScreenOrientation', () => {
  beforeEach(() => {
    unlockMock.mockClear();
    lockPortraitMock.mockClear();
    addListenerMock.mockClear();
    removeListenerMock.mockClear();
  });

  it('isTablet=true 진입 시 unlockAllOrientations 호출', () => {
    renderHook(() => useDiagnosticScreenOrientation({ isTablet: true }));
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });

  it('isTablet=false 진입 시 unlock 호출 안 함', () => {
    renderHook(() => useDiagnosticScreenOrientation({ isTablet: false }));
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it('onOrientationChange 콜백을 listener로 등록', () => {
    const cb = jest.fn();
    renderHook(() =>
      useDiagnosticScreenOrientation({ isTablet: true, onOrientationChange: cb }),
    );
    expect(addListenerMock).toHaveBeenCalledTimes(1);
    const registered = addListenerMock.mock.calls[0][0];
    registered();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/quiz/hooks/use-diagnostic-screen-orientation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the hook**

`features/quiz/hooks/use-diagnostic-screen-orientation.ts`:

```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

import { lockToPortrait, unlockAllOrientations } from '@/hooks/use-orientation-lock';

type Options = {
  isTablet: boolean;
  onOrientationChange?: () => void;
};

// 진입 시 iPad에서만 4방향 unlock, 이탈 시 portrait 재잠금.
// onOrientationChange는 회전 도중 in-progress stroke 같은 휘발 상태를 끊기 위한 콜백.
export function useDiagnosticScreenOrientation({
  isTablet,
  onOrientationChange,
}: Options): void {
  useFocusEffect(
    useCallback(() => {
      if (isTablet) {
        void unlockAllOrientations();
      }
      return () => {
        void lockToPortrait();
      };
    }, [isTablet]),
  );

  useEffect(() => {
    if (!onOrientationChange) return;
    const subscription = ScreenOrientation.addOrientationChangeListener(() => {
      onOrientationChange();
    });
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [onOrientationChange]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest features/quiz/hooks/use-diagnostic-screen-orientation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add features/quiz/hooks/use-diagnostic-screen-orientation.ts features/quiz/hooks/use-diagnostic-screen-orientation.test.ts
git commit -m "feat(diagnostic): orientation hook for diagnostic screen (mirrors exam version)"
```

---

## Task 3: `DiagnosticSolveTabletLayout` 컴포넌트

**Files:**
- Create: `features/quiz/components/diagnostic-solve-tablet-layout.tsx`

**Goal:** [ExamSolveTabletLayout](features/quiz/exam/components/exam-solve-tablet-layout.tsx)과 동일 구조의 좌우 분할 레이아웃. 분할 비율 store 공유 ([scratchpad-split-ratio-store](features/quiz/exam/storage/scratchpad-split-ratio-store.ts)). props는 `header`/`problemPanel`/`scratchpad: IndexedScratchpadApi`.

**Why a new component (not reuse exam version directly):** `ExamSolveTabletLayout`은 `UseScratchpadResult` (`useScratchpad` 반환 타입)를 prop으로 받고, 우리의 `IndexedScratchpadApi`는 디스크 의존 필드가 없는 별도 타입이다. props 호환은 가능하지만 의존성 방향이 `features/quiz` → `features/quiz/exam`이 되면서 도메인 경계가 어색해진다 (약점진단이 모의고사에 의존). 별도 컴포넌트를 두면 두 화면의 진화 경로(예: 약점진단 전용 툴바 변경)를 독립적으로 관리할 수 있다. 코드 자체는 ScratchpadCanvas/Toolbar/SplitDivider/store를 재사용하므로 중복은 thin layer 수준.

- [ ] **Step 1: Create component (no test — UI 전용, 동작 검증은 Task 7 manual QA)**

`features/quiz/components/diagnostic-solve-tablet-layout.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { ScratchpadCanvas } from '@/features/quiz/exam/components/scratchpad-canvas';
import { ScratchpadToolbar } from '@/features/quiz/exam/components/scratchpad-toolbar';
import { SplitDivider } from '@/features/quiz/exam/components/split-divider';
import {
  loadSplitRatio,
  saveSplitRatio,
} from '@/features/quiz/exam/storage/scratchpad-split-ratio-store';
import type { IndexedScratchpadApi } from '@/features/quiz/hooks/use-diagnostic-scratchpad-store';

type Props = {
  header: ReactNode;
  problemPanel: ReactNode;
  scratchpad: IndexedScratchpadApi;
};

// ExamSolveTabletLayout과 동일 baseline (11" iPad landscape 1194pt → 좌측 520pt 기본).
// 분할 비율 store를 공유하므로 모의고사에서 조정한 비율이 약점진단에도 그대로 적용된다.
const DEFAULT_RATIO = 520 / (1194 - 8);
const DIVIDER_WIDTH = 8;
const TOOLBAR_WIDTH = 58;
const LEFT_RATIO_MIN = 0.3;
const LEFT_RATIO_MAX = 0.6;
const LEFT_PX_FLOOR = 320;
const LEFT_PX_CEILING = 820;
const HEADER_HEIGHT_ESTIMATE = 56;

export function DiagnosticSolveTabletLayout({ header, problemPanel, scratchpad }: Props) {
  const { width, height } = useWindowDimensions();
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const dragOriginRef = useRef(DEFAULT_RATIO);
  const [bodyHeight, setBodyHeight] = useState(() =>
    Math.max(0, height - HEADER_HEIGHT_ESTIMATE),
  );
  const [pencilOnly, setPencilOnly] = useState(false);

  useEffect(() => {
    if (!accountKey) return;
    let cancelled = false;
    loadSplitRatio(accountKey).then((saved) => {
      if (!cancelled && saved !== null) setRatio(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey]);

  const totalForSplit = width - DIVIDER_WIDTH;
  const leftMin = Math.max(LEFT_PX_FLOOR, Math.round(totalForSplit * LEFT_RATIO_MIN));
  const leftMax = Math.min(LEFT_PX_CEILING, Math.round(totalForSplit * LEFT_RATIO_MAX));
  const rawLeft = Math.round(totalForSplit * ratio);
  const leftWidth = Math.max(leftMin, Math.min(leftMax, rawLeft));
  const rightWidth = width - leftWidth - DIVIDER_WIDTH;
  const canvasWidth = Math.max(0, rightWidth - TOOLBAR_WIDTH);

  const handleDragStart = () => {
    dragOriginRef.current = ratio;
  };
  const handleDrag = (deltaX: number) => {
    const nextLeft = Math.max(
      leftMin,
      Math.min(leftMax, Math.round(totalForSplit * dragOriginRef.current) + deltaX),
    );
    setRatio(nextLeft / totalForSplit);
  };
  const handleDragEnd = () => {
    if (!accountKey) return;
    void saveSplitRatio(accountKey, ratio);
  };

  return (
    <View style={styles.root}>
      {header}
      <View style={styles.split}>
        <View style={[styles.leftPanel, { width: leftWidth }]}>{problemPanel}</View>

        <View style={styles.dividerWrap}>
          <SplitDivider
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        </View>

        <View
          style={[styles.rightPanel, { width: rightWidth }]}
          onLayout={(e) => {
            const next = e.nativeEvent.layout.height;
            if (next !== bodyHeight) setBodyHeight(next);
          }}>
          <ScratchpadToolbar
            tool={scratchpad.tool}
            color={scratchpad.color}
            size={scratchpad.size}
            canUndo={scratchpad.canUndo}
            canRedo={scratchpad.canRedo}
            pencilOnly={pencilOnly}
            onSetTool={scratchpad.setTool}
            onSetColor={scratchpad.setColor}
            onSetSize={scratchpad.setSize}
            onUndo={scratchpad.undo}
            onRedo={scratchpad.redo}
            onClear={scratchpad.clear}
            onTogglePencilOnly={() => setPencilOnly((v) => !v)}
          />
          <ScratchpadCanvas
            width={canvasWidth}
            height={bodyHeight}
            scratchpad={{
              strokes: scratchpad.strokes,
              liveStroke: scratchpad.liveStroke,
              beginStroke: scratchpad.beginStroke,
              appendPoint: scratchpad.appendPoint,
              endStroke: scratchpad.endStroke,
            }}
            pencilOnly={pencilOnly}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF6EC' },
  split: { flex: 1, flexDirection: 'row' },
  leftPanel: { backgroundColor: '#FAF6EC' },
  dividerWrap: { width: DIVIDER_WIDTH },
  rightPanel: { flexDirection: 'row', backgroundColor: '#FFFCF4' },
});
```

- [ ] **Step 2: TypeScript 컴파일 검증**

Run: `npx tsc --noEmit`
Expected: 새 컴포넌트로 인한 타입 오류 없음 (기존 코드는 무시 — 이 task 범위에서 새로 추가한 파일에 대한 오류만 확인).

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/diagnostic-solve-tablet-layout.tsx
git commit -m "feat(diagnostic): DiagnosticSolveTabletLayout (split layout for tablet landscape)"
```

---

## Task 4: `useDiagnosticScreen` 훅에 store/orientation/landscape hint 통합

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

**Goal:** `useDiagnosticScratchpadStore` 단일 인스턴스를 화면 단위로 보유하고, `useDiagnosticScreenOrientation` 훅 호출. `UseDiagnosticScreenResult`에 store 필드를 추가해 view에서 풀이/분석 두 단계가 모두 접근 가능하게 한다. 가로 권유 배너 상태도 모의고사 패턴 그대로 추가.

**Approach:** `useDiagnosticScreen`은 큰 파일이므로 reducer/dispatch는 건드리지 않는다. 단지 hook 호출 추가 + return 객체에 필드 추가.

- [ ] **Step 1: Read current return shape**

Run: `grep -n "return {" features/quiz/hooks/use-diagnostic-screen.ts | tail -5`

기존 return 객체의 마지막 위치를 확인 (file이 크므로 정확한 라인 파악 필수). 추가 필드는 이 return 안에 끼워넣음.

- [ ] **Step 2: Add imports & hook calls (file head)**

`features/quiz/hooks/use-diagnostic-screen.ts` 상단 import 섹션에 추가:

```typescript
import { useIsTablet } from '@/hooks/use-is-tablet';
import { useWindowDimensions } from 'react-native';

import {
  hasSeenLandscapeHint,
  markLandscapeHintSeen,
} from '@/features/quiz/exam/storage/landscape-hint-store';
import {
  useDiagnosticScratchpadStore,
  type DiagnosticScratchpadStore,
} from './use-diagnostic-scratchpad-store';
import { useDiagnosticScreenOrientation } from './use-diagnostic-screen-orientation';
```

(이미 import된 항목은 중복 추가하지 말 것 — `useCallback`/`useState`/`useEffect`는 기존 import에 포함되어 있을 가능성 높음. grep으로 확인 후 추가만.)

- [ ] **Step 3: Add type field to `UseDiagnosticScreenResult`**

`UseDiagnosticScreenResult` 정의(현재 line 54 근처) 안에 다음 필드를 추가 (마지막 `}` 직전):

```typescript
  // 스크래치패드 (태블릿 + 가로일 때만 활성. 분석 단계에서는 read-only로 사용)
  scratchpadStore: DiagnosticScratchpadStore;
  isTablet: boolean;
  isPortrait: boolean;
  showLandscapeHint: boolean;
  onDismissLandscapeHint: () => void;
```

- [ ] **Step 4: Wire hooks inside the function body (after existing hook calls, before `useEffect`s)**

`useDiagnosticScreen` 함수 시작 직후 (state/dispatch 초기화 다음) 위치에 추가:

```typescript
  const { width, height } = useWindowDimensions();
  const isTablet = useIsTablet();
  const isPortrait = height >= width;

  const scratchpadStore = useDiagnosticScratchpadStore();

  // 회전 도중 휘발 stroke을 끊는다 — 활성 question의 endStroke를 호출.
  // (eslint react-hooks/exhaustive-deps는 store/state 의존을 정확히 추적하지 못하므로 의도적으로 비움)
  const handleOrientationChange = useCallback(() => {
    const idx = state.currentQuestionIndex;
    scratchpadStore.forIndex(idx).endStroke();
  }, [scratchpadStore, state.currentQuestionIndex]);

  useDiagnosticScreenOrientation({
    isTablet,
    onOrientationChange: handleOrientationChange,
  });

  // 가로 회전 안내 배너: tablet이고 portrait이고, 풀이 단계(quizStage 활성)일 때만 한 번 노출.
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);
  useEffect(() => {
    if (!isTablet || !isPortrait) {
      setShowLandscapeHint(false);
      return;
    }
    let cancelled = false;
    void hasSeenLandscapeHint().then((seen) => {
      if (!cancelled && !seen) setShowLandscapeHint(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isTablet, isPortrait]);

  const handleDismissLandscapeHint = useCallback(() => {
    setShowLandscapeHint(false);
    void markLandscapeHintSeen();
  }, []);
```

**중요:** `state.currentQuestionIndex`는 기존 reducer state에 이미 존재 — Step 1에서 grep으로 확인한 위치에서 사용 가능 여부 검증.

- [ ] **Step 5: Add new fields to return object**

`useDiagnosticScreen`의 return 객체 마지막 `}` 직전에 추가:

```typescript
    scratchpadStore,
    isTablet,
    isPortrait,
    showLandscapeHint,
    onDismissLandscapeHint: handleDismissLandscapeHint,
```

- [ ] **Step 6: Reset store on diagnostic restart**

`shouldResetOnMount` 또는 reset 흐름이 발생하는 effect 안에 `scratchpadStore.resetAll()` 호출 추가. grep으로 reset 흐름 위치를 찾고, 인접 reducer dispatch와 함께 호출:

Run: `grep -n "shouldResetOnMount\|RESET\|reset" features/quiz/hooks/use-diagnostic-screen.ts | head -20`

찾은 reset effect 안에 `scratchpadStore.resetAll();`을 dispatch 직후에 추가.

- [ ] **Step 7: Type-check & test pass**

Run: `npx tsc --noEmit 2>&1 | grep "features/quiz/hooks/use-diagnostic-screen"`
Expected: 새로 추가한 필드/임포트 관련 오류 없음.

Run: `npx jest features/quiz/hooks/use-diagnostic-screen`
Expected: 기존 테스트가 모두 PASS (있다면) — 변경이 추가만이므로 회귀 없어야 함.

- [ ] **Step 8: Commit**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "feat(diagnostic): wire scratchpad store + orientation + landscape hint"
```

---

## Task 5: `DiagnosticQuizStage` — 태블릿 가로에서 좌우 분할 + 캔버스

**Files:**
- Modify: `features/quiz/components/diagnostic-quiz-stage.tsx`
- Modify: `features/quiz/components/diagnostic-screen-view.tsx` (스크래치패드 props를 stage로 전달)

**Goal:** 태블릿 + 가로일 때 `DiagnosticSolveTabletLayout`로 감싸 활성 question의 캔버스 노출. 그 외에는 기존 `QuizSolveLayout` 유지 + portrait이면 `LandscapeHintBanner` 표시.

- [ ] **Step 1: Update `DiagnosticQuizStageProps` to receive scratchpad context**

`features/quiz/components/diagnostic-quiz-stage.tsx`의 prop 타입을 다음과 같이 변경:

```typescript
import type { IndexedScratchpadApi } from '@/features/quiz/hooks/use-diagnostic-scratchpad-store';

type DiagnosticQuizStageProps = {
  quizStage: DiagnosticQuizStageModel;
  scratchpad: IndexedScratchpadApi;
  isTablet: boolean;
  isPortrait: boolean;
  showLandscapeHint: boolean;
  onDismissLandscapeHint: () => void;
};
```

- [ ] **Step 2: Update body of `DiagnosticQuizStage` to branch on tablet+landscape**

기존 `return ( ... )` 전체를 다음으로 교체:

```tsx
import { LandscapeHintBanner } from '@/features/quiz/exam/components/landscape-hint-banner';

import { DiagnosticSolveTabletLayout } from './diagnostic-solve-tablet-layout';

// (위 import는 파일 상단 import 블록에 추가)

export function DiagnosticQuizStage({
  quizStage,
  scratchpad,
  isTablet,
  isPortrait,
  showLandscapeHint,
  onDismissLandscapeHint,
}: DiagnosticQuizStageProps) {
  const { width, height } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;
  const useTabletLayout = isTablet && !isPortrait;

  const header = (
    <QuizSolveHeader
      currentQuestionNumber={quizStage.currentQuestionNumber}
      isCompactLayout={isCompactLayout}
      onBackPress={quizStage.onOpenExitModal}
      progressPercent={quizStage.progressPercent}
      questionCount={quizStage.questionCount}
      title="약점 진단"
    />
  );

  const body = (
    <QuizQuestionCard
      choices={quizStage.problem.choices}
      isCompactLayout={isCompactLayout}
      question={quizStage.problem.question}
      selectedIndex={quizStage.selectedIndex}
    />
  );

  const footer = (
    <DiagnosticSolveBottomPanel
      canGoPrevious={quizStage.canGoPrevious}
      isCompactLayout={isCompactLayout}
      isNextDisabled={quizStage.isNextDisabled}
      onNextPress={quizStage.onNextQuestion}
      onPreviousPress={quizStage.onPreviousQuestion}
      onSelectChoice={quizStage.onSelectChoice}
      selectedIndex={quizStage.selectedIndex}
    />
  );

  return (
    <View style={styles.screen}>
      {useTabletLayout ? (
        <DiagnosticSolveTabletLayout
          header={header}
          scratchpad={scratchpad}
          problemPanel={
            <View style={styles.tabletProblemPanel}>
              <View style={styles.tabletBody}>{body}</View>
              <View>{footer}</View>
            </View>
          }
        />
      ) : (
        <QuizSolveLayout
          body={body}
          bodyContentContainerStyle={[
            styles.content,
            isCompactLayout ? styles.contentCompact : null,
          ]}
          footer={footer}
          header={header}
          screenBackgroundColor={BrandColors.background}
        />
      )}

      {isTablet && isPortrait && showLandscapeHint ? (
        <LandscapeHintBanner onDismiss={onDismissLandscapeHint} />
      ) : null}

      <QuizSolveExitConfirmModal
        body="지금까지 푼 답안은 저장되지 않아요. 나가면 처음부터 다시 시작해야 해요."
        onClose={quizStage.onCloseExitModal}
        onConfirmExit={quizStage.onConfirmExit}
        title="진단을 나갈까요?"
        visible={quizStage.isExitModalVisible}
      />
    </View>
  );
}
```

styles 객체에 추가:

```typescript
  tabletProblemPanel: {
    flex: 1,
    flexDirection: 'column',
  },
  tabletBody: { flex: 1 },
```

- [ ] **Step 3: Wire props in `DiagnosticScreenView` (call site)**

`features/quiz/components/diagnostic-screen-view.tsx`의 `<DiagnosticQuizStage quizStage={quizStage} />` 호출을 수정:

```tsx
<DiagnosticQuizStage
  quizStage={quizStage}
  scratchpad={scratchpadStore.forIndex(quizStage.currentQuestionNumber - 1)}
  isTablet={isTablet}
  isPortrait={isPortrait}
  showLandscapeHint={showLandscapeHint}
  onDismissLandscapeHint={onDismissLandscapeHint}
/>
```

그리고 `DiagnosticScreenView`의 props 디스트럭처링에 `scratchpadStore`, `isTablet`, `isPortrait`, `showLandscapeHint`, `onDismissLandscapeHint`를 추가 (이미 `UseDiagnosticScreenResult`에 추가했으므로 spread 분해만 수정).

**Note on key:** 활성 question의 `answerIndex`는 `state.currentQuestionIndex`. `quizStage.currentQuestionNumber`는 1-based 표시값(`Math.min(state.currentQuestionIndex + 1, ...)`)이므로 `-1`로 0-based 변환. 만약 use-diagnostic-screen.ts 안에 별도의 `currentQuestionIndex` 노출이 있다면 그쪽을 직접 사용하는 편이 더 명시적이다. grep 검증 필요:

Run: `grep -n "currentQuestionIndex" features/quiz/hooks/use-diagnostic-screen.ts | head -10`

만약 result로 `currentQuestionIndex`가 직접 노출되지 않는다면, `UseDiagnosticScreenResult`에 추가하고 stage에 그 값을 직접 전달.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "diagnostic-quiz-stage|diagnostic-screen-view"`
Expected: 새로 추가한 prop 관련 오류 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/components/diagnostic-quiz-stage.tsx features/quiz/components/diagnostic-screen-view.tsx
git commit -m "feat(diagnostic): tablet landscape split layout in quiz stage + landscape hint"
```

---

## Task 6: 분석 단계 — 헤더 "원본 풀이" 버튼 + `OriginalStrokesSheet` 모달

**Files:**
- Modify: `features/quiz/components/diagnostic-screen-view.tsx`

**Goal:** `isDiagnosing === true` 분기의 [DiagnosisDarkHeader](features/quiz/components/diagnosis-dark-header.tsx)에 "원본 풀이" 버튼을 노출하고, 클릭 시 [OriginalStrokesSheet](features/quiz/exam/components/original-strokes-sheet.tsx) 모달을 띄운다. 활성 페이지 변경 시 시트 자동 닫힘.

`DiagnosisDarkHeader`는 이미 `showOriginalStrokesButton`/`onPressOriginalStrokes` props를 지원한다 (확인됨, [diagnosis-dark-header.tsx:19-21](features/quiz/components/diagnosis-dark-header.tsx:19)).

- [ ] **Step 1: Add imports & sheet state to `DiagnosticScreenView`**

`features/quiz/components/diagnostic-screen-view.tsx` 상단 import 추가:

```typescript
import { useEffect, useState } from 'react';

import { OriginalStrokesSheet } from '@/features/quiz/exam/components/original-strokes-sheet';
```

(`useEffect`/`useState` 중복 import 방지 — 기존에 있으면 추가만.)

- [ ] **Step 2: Add sheet state inside the component**

`DiagnosticScreenView` 함수 본문 시작 부분 (디스트럭처링 직후) 에 추가:

```typescript
const [strokesSheetVisible, setStrokesSheetVisible] = useState(false);

useEffect(() => {
  setStrokesSheetVisible(false);
}, [activeDiagnosisPageIndex]);

const activePage = diagnosisPages[activeDiagnosisPageIndex];
const activeAnswerIndex = activePage?.answerIndex ?? 0;
const activeStrokes = scratchpadStore.getStrokes(activeAnswerIndex);
const hasActiveStrokes = scratchpadStore.hasStrokes(activeAnswerIndex);
```

- [ ] **Step 3: Wire button props on `DiagnosisDarkHeader` (분석 단계 분기)**

`isDiagnosing` 분기 안의 `<DiagnosisDarkHeader ... />` 호출에 props 두 개 추가:

```tsx
<DiagnosisDarkHeader
  title={title}
  backLabel="← 뒤로"
  progressLabel={`${activeDiagnosisPageIndex + 1} / ${totalCount}`}
  progressPercent={progressPercent}
  totalCount={totalCount}
  completedIndices={completedIndices}
  activeIndex={activeDiagnosisPageIndex}
  onBack={onOpenExitModal}
  onDotPress={onScrollToDiagnosisPage}
  showOriginalStrokesButton={hasActiveStrokes}
  onPressOriginalStrokes={() => setStrokesSheetVisible(true)}
/>
```

- [ ] **Step 4: Mount `OriginalStrokesSheet` at the end of the diagnosing branch**

`isDiagnosing` 분기 return JSX의 `<DiagnosisExitConfirmModal ... />` 바로 직전(또는 직후)에 추가:

```tsx
<OriginalStrokesSheet
  visible={strokesSheetVisible}
  strokes={activeStrokes}
  loaded={true}
  onClose={() => setStrokesSheetVisible(false)}
/>
```

`loaded={true}`인 이유: in-memory store는 always-loaded (디스크 비동기 로드 단계가 없음).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep diagnostic-screen-view`
Expected: 오류 없음.

- [ ] **Step 6: Commit**

```bash
git add features/quiz/components/diagnostic-screen-view.tsx
git commit -m "feat(diagnostic): show original strokes sheet in analysis phase header"
```

---

## Task 7: iPad 시뮬레이터 수동 검증

**Goal:** spec의 검증 항목(섹션 8) 전부 손으로 확인.

**Note:** 이번 변경은 네이티브 의존성 추가가 없으므로 (기존 `react-native-skia`/`gesture-handler`/`reanimated` 재사용) `expo prebuild --clean`은 **불필요**. 단, 처음 빌드하는 환경이면 `npx expo run:ios --device "iPad ..."` 또는 시뮬레이터 선택 필요.

- [ ] **Step 1: Build & launch on iPad simulator**

```bash
npx expo run:ios
```

(시뮬레이터 선택 시 iPad Pro 11" 또는 13" 선택. 이미 빌드된 적 있으면 metro만 시작 후 시뮬레이터에서 reload.)

- [ ] **Step 2: 풀이 단계 검증**

여정보드 → "10문제 약점 진단" 시작:

- [ ] iPad 가로: 좌우 분할 표시. 왼쪽 상단 헤더, 본문 문제카드, 하단 선택지/이전/다음. 오른쪽 캔버스 + 툴바.
- [ ] 캔버스에 펜으로 그리기 → 그려짐.
- [ ] 분할 바 드래그 → 비율 변경. 모의고사 풀이 화면 들어가도 동일 비율 유지 (store 공유).
- [ ] 다음 문제 이동 → 캔버스 비어있음.
- [ ] 이전으로 돌아옴 → 첫 stroke 그대로 보임.
- [ ] 가로 → 세로 회전 → `LandscapeHintBanner` 등장. 캔버스 영역 사라짐. 단일 컬럼.
- [ ] 세로에서 진행 중 stroke 그리던 도중 가로로 회전 → 진행 stroke 끊김 (완성된 건 보존).
- [ ] iPhone 시뮬레이터: 캔버스 미노출, 배너 미노출.

- [ ] **Step 3: 분석 단계 검증**

10문제 모두 풀이 → 채점 → 약점 분석 단계 진입:

- [ ] 풀이 중 stroke을 그렸던 문제: 헤더 우측 "원본 풀이" 버튼 노출.
- [ ] 버튼 누르면 시트 슬라이드 업, 60% 높이, stroke 표시.
- [ ] 백드롭 탭 → 닫힘.
- [ ] 페이지 스와이프(다음 틀린 문제) → 시트 자동 닫힘.
- [ ] stroke 안 그린 문제: 버튼 미노출.
- [ ] 시트 안에서는 그릴 수 없음 (read-only).

- [ ] **Step 4: 강제 종료 검증**

진단 도중 백그라운드 → 스와이프로 앱 종료 → 재실행:

- [ ] 답안과 함께 stroke도 휘발 (정책 일관). 인트로 카드로 돌아감.

- [ ] **Step 5: PROGRESS.md 기록 + commit**

`docs/PROGRESS.md`에 한 줄 추가:

```markdown
- 2026-05-09: 10문제 약점진단 — 풀이 단계 스크래치패드(태블릿 가로) + 분석 단계 원본 풀이 시트 추가. (spec: docs/superpowers/specs/2026-05-09-diagnostic-scratchpad-design.md)
```

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): log diagnostic scratchpad implementation"
```

- [ ] **Step 6: Push & 완료 알림**

```bash
git push origin claude/jovial-edison-b5406f
npm run notify:done -- "10문제 약점진단 스크래치패드 구현 완료"
npm run log:commit
```

---

## Self-Review (이미 적용됨)

**Spec 커버리지 확인:**

| Spec 섹션 | 구현 task |
|---|---|
| 2. 결정사항 — In-memory store | Task 1 |
| 2. 결정사항 — 분할 비율 store 공유 | Task 3 (loadSplitRatio/saveSplitRatio 재사용) |
| 2. 결정사항 — 태블릿+가로 조건부 캔버스 | Task 5 (`useTabletLayout = isTablet && !isPortrait`) |
| 3. 데이터 흐름 — store가 풀이/분석 양쪽에 노출 | Task 4 (UseDiagnosticScreenResult), Task 5/6 (소비) |
| 3. 신규 파일 3개 | Task 1, Task 2, Task 3 |
| 3. 수정 파일 3개 | Task 4, Task 5, Task 6 |
| 4. `forIndex`/`getStrokes`/`hasStrokes` 인터페이스 | Task 1 (정확히 일치) |
| 5.1 풀이 UX (태블릿+가로/세로/폰) | Task 5 |
| 5.2 풀이는 버튼, 분석은 스와이프 | Task 5 (footer = DiagnosticSolveBottomPanel), Task 6 (FlatList 기존 동작) |
| 5.3 회전 처리 (진행 stroke 끊기) | Task 4 (handleOrientationChange → endStroke) |
| 5.4 분석 단계 — hasStrokes일 때만 버튼 | Task 6 (`showOriginalStrokesButton={hasActiveStrokes}`) |
| 5.4 페이지 스와이프 시 시트 자동 닫힘 | Task 6 (`useEffect on activeDiagnosisPageIndex`) |
| 6. 엣지 케이스 — "처음부터 다시" 시 store reset | Task 4 Step 6 (`scratchpadStore.resetAll()`) |
| 8. 검증 항목 | Task 7 |

빠진 항목 없음.

**Type 일관성:**
- `IndexedScratchpadApi` (Task 1 export) → Task 3/5에서 import 동일 이름.
- `DiagnosticScratchpadStore` (Task 1 export) → Task 4 import 동일 이름.
- `forIndex` / `getStrokes` / `hasStrokes` / `resetAll` 명칭 모든 task에서 동일.
- `IndexedScratchpadApi.beginStroke`/`appendPoint`/`endStroke`/`strokes`/`liveStroke` → Task 3에서 `ScratchpadCanvas` discriminated union (`EditScratchpadProps`)에 정확히 매핑.
- `currentQuestionNumber - 1`로 answerIndex 변환 (Task 5 Step 3) — Step 3의 grep 검증 단계에서 더 명시적인 `currentQuestionIndex` 노출 발견 시 그쪽 사용 (이미 명시).

**Placeholder 스캔:** TBD/TODO/"적절히"/"나중에" 없음. 모든 step에 실제 코드 또는 명령어 포함.
