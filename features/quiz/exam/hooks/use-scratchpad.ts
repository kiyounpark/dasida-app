import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  loadScratchpad,
  saveScratchpad,
  type Stroke,
  type StrokePoint,
  type StrokeTool,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

export type ActiveTool = 'pen' | 'highlighter' | 'eraser';

const DEFAULT_TOOL: ActiveTool = 'pen';
const DEFAULT_COLOR = '#1A1916';
const DEFAULT_SIZE = 2;
const POINT_MIN_DIST_SQ = 1.5 * 1.5; // 2.25 — compare squared to avoid sqrt
const WRITE_DEBOUNCE_MS = 500;
const UNDO_LIMIT = 50;

type State = {
  loaded: boolean;
  strokes: Stroke[];
  liveStroke: Stroke | null;
  undoStack: Stroke[][];
  redoStack: Stroke[][];
  tool: ActiveTool;
  color: string;
  size: number;
};

type Action =
  | { type: 'hydrate'; strokes: Stroke[] }
  | { type: 'set-tool'; tool: ActiveTool }
  | { type: 'set-color'; color: string }
  | { type: 'set-size'; size: number }
  | { type: 'begin'; stroke: Stroke }
  | { type: 'append'; point: StrokePoint }
  | { type: 'end' }
  | { type: 'erase-at'; x: number; y: number; radius: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' };

function pushUndo(undoStack: Stroke[][], strokes: Stroke[]): Stroke[][] {
  const next = [...undoStack, strokes];
  return next.length > UNDO_LIMIT ? next.slice(next.length - UNDO_LIMIT) : next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, loaded: true, strokes: action.strokes };
    case 'set-tool':
      return { ...state, tool: action.tool };
    case 'set-color':
      return { ...state, color: action.color };
    case 'set-size':
      return { ...state, size: action.size };
    case 'begin':
      return { ...state, liveStroke: action.stroke };
    case 'append': {
      if (!state.liveStroke) return state;
      const pts = state.liveStroke.points;
      const last = pts[pts.length - 1];
      const dx = action.point.x - last.x;
      const dy = action.point.y - last.y;
      if (dx * dx + dy * dy < POINT_MIN_DIST_SQ) return state;
      return {
        ...state,
        liveStroke: {
          ...state.liveStroke,
          points: [...pts, action.point],
        },
      };
    }
    case 'end': {
      if (!state.liveStroke) return state;
      return {
        ...state,
        strokes: [...state.strokes, state.liveStroke],
        liveStroke: null,
        undoStack: pushUndo(state.undoStack, state.strokes),
        redoStack: [],
      };
    }
    case 'erase-at': {
      const { x, y, radius } = action;
      const r2 = radius * radius;
      const remaining = state.strokes.filter(
        (s) => !s.points.some((pt) => (pt.x - x) ** 2 + (pt.y - y) ** 2 <= r2),
      );
      if (remaining.length === state.strokes.length) return state;
      return {
        ...state,
        strokes: remaining,
        undoStack: pushUndo(state.undoStack, state.strokes),
        redoStack: [],
      };
    }
    case 'undo': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        strokes: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.strokes],
      };
    }
    case 'redo': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        strokes: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.strokes],
      };
    }
    case 'clear':
      return { ...state, strokes: [], liveStroke: null, undoStack: [], redoStack: [] };
  }
}

const initialState: State = {
  loaded: false,
  strokes: [],
  liveStroke: null,
  undoStack: [],
  redoStack: [],
  tool: DEFAULT_TOOL,
  color: DEFAULT_COLOR,
  size: DEFAULT_SIZE,
};

export type UseScratchpadResult = {
  loaded: boolean;
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

export function useScratchpad(examId: string, problemNumber: number): UseScratchpadResult {
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [state, dispatch] = useReducer(reducer, initialState);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedStrokesRef = useRef<Stroke[]>(initialState.strokes);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Mutable refs so flush-on-unmount always writes to the current key, not the mount-time key
  const accountKeyRef = useRef(accountKey);
  const examIdRef = useRef(examId);
  const problemNumberRef = useRef(problemNumber);
  accountKeyRef.current = accountKey;
  examIdRef.current = examId;
  problemNumberRef.current = problemNumber;
  // Mutable refs for tool/color/size so callbacks read latest values even within a batched act()
  const toolRef = useRef<ActiveTool>(initialState.tool);
  const colorRef = useRef<string>(initialState.color);
  const sizeRef = useRef<number>(initialState.size);

  // Hydrate on (account, exam, problem) change
  useEffect(() => {
    let cancelled = false;
    if (!accountKey) {
      dispatch({ type: 'hydrate', strokes: [] });
      return;
    }
    loadScratchpad(accountKey, examId, problemNumber).then((loaded) => {
      if (cancelled) return;
      const strokes = loaded?.strokes ?? [];
      lastSavedStrokesRef.current = strokes;
      dispatch({ type: 'hydrate', strokes });
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, examId, problemNumber]);

  // Debounced write on strokes change
  useEffect(() => {
    if (!state.loaded || !accountKey) return;
    if (state.strokes === lastSavedStrokesRef.current) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      lastSavedStrokesRef.current = state.strokes;
      void saveScratchpad(accountKey, {
        examId,
        problemNumber,
        strokes: state.strokes,
        updatedAt: Date.now(),
      });
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [state.loaded, state.strokes, accountKey, examId, problemNumber]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
      const current = stateRef.current;
      const key = accountKeyRef.current;
      if (!key || !current.loaded) return;
      if (current.strokes === lastSavedStrokesRef.current) return;
      void saveScratchpad(key, {
        examId: examIdRef.current,
        problemNumber: problemNumberRef.current,
        strokes: current.strokes,
        updatedAt: Date.now(),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const beginStroke = useCallback((p: StrokePoint) => {
    if (toolRef.current === 'eraser') {
      dispatch({ type: 'erase-at', x: p.x, y: p.y, radius: sizeRef.current / 2 });
      return;
    }
    const tool: StrokeTool = toolRef.current as StrokeTool;
    dispatch({
      type: 'begin',
      stroke: {
        id: Crypto.randomUUID(),
        tool,
        color: colorRef.current,
        size: sizeRef.current,
        points: [p],
      },
    });
  }, []);

  const appendPoint = useCallback((p: StrokePoint) => {
    if (toolRef.current === 'eraser') {
      dispatch({ type: 'erase-at', x: p.x, y: p.y, radius: sizeRef.current / 2 });
      return;
    }
    dispatch({ type: 'append', point: p });
  }, []);

  const endStroke = useCallback(() => {
    if (toolRef.current === 'eraser') return;
    dispatch({ type: 'end' });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  return {
    loaded: state.loaded,
    strokes: state.strokes,
    liveStroke: state.liveStroke,
    tool: state.tool,
    color: state.color,
    size: state.size,
    setTool,
    setColor,
    setSize,
    beginStroke,
    appendPoint,
    endStroke,
    undo,
    redo,
    clear,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
  };
}
