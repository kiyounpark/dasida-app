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

// Type-driven stub for dev/storybook screens that mount components needing an
// IndexedScratchpadApi without backing state. Adding fields to IndexedScratchpadApi
// will surface here as a type error so dev usage stays in sync.
export const STUB_INDEXED_SCRATCHPAD_API: IndexedScratchpadApi = {
  loaded: true,
  strokes: [],
  liveStroke: null,
  tool: 'pen',
  color: '#1A1916',
  size: 2,
  setTool: () => {},
  setColor: () => {},
  setSize: () => {},
  beginStroke: () => {},
  appendPoint: () => {},
  endStroke: () => {},
  undo: () => {},
  redo: () => {},
  clear: () => {},
  canUndo: false,
  canRedo: false,
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

  // forIndex 결과 캐시: (idx, indexState 참조, tool, color, size)가 모두 동일하면
  // 같은 wrapper 객체를 재사용해 ScratchpadCanvas/Toolbar의 React.memo가 의미 있게 동작.
  const apiCacheRef = useRef<
    Map<
      number,
      {
        deps: [IndexState, ActiveTool, string, number];
        api: IndexedScratchpadApi;
      }
    >
  >(new Map());

  return useMemo<DiagnosticScratchpadStore>(
    () => ({
      forIndex(idx) {
        const cur = state.byIndex.get(idx) ?? EMPTY_INDEX_STATE;
        const cbs = ensureCallbacks(idx);
        const cached = apiCacheRef.current.get(idx);
        if (
          cached &&
          cached.deps[0] === cur &&
          cached.deps[1] === state.tool &&
          cached.deps[2] === state.color &&
          cached.deps[3] === state.size
        ) {
          return cached.api;
        }
        const api: IndexedScratchpadApi = {
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
        apiCacheRef.current.set(idx, {
          deps: [cur, state.tool, state.color, state.size],
          api,
        });
        return api;
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
