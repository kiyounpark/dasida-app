# iPad 수학 풀이 화면 — 좌우 분할 + 필기 캔버스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPad 가로 모드에서 시험 풀이 화면을 좌(문제) / 우(Skia 필기 캔버스) 분할 레이아웃으로 제공하고, 문제별 필기와 분할 비율을 AsyncStorage에 영속화한다.

**Architecture:** `useIsTablet()` + `useWindowDimensions()` 분기로 가로 iPad에서만 새 레이아웃 활성화. Skia 캔버스 이중 레이어(committed strokes 메모이즈 + live path)로 60fps 보장. 도구·획·Undo/Redo는 `use-scratchpad` 훅이 메모리 상태로, stroke 배열만 500ms debounced로 AsyncStorage에 저장.

**Tech Stack:** Expo SDK · React Native · TypeScript · `@shopify/react-native-skia` · `react-native-gesture-handler` · `@react-native-async-storage/async-storage` · `expo-crypto` (UUID) · Jest (단위 테스트)

**Spec:** [`docs/superpowers/specs/2026-05-05-ipad-math-scratchpad-design.md`](../specs/2026-05-05-ipad-math-scratchpad-design.md)

---

## File Structure

**Create:**
- `features/quiz/exam/storage/scratchpad-strokes-store.ts` — stroke 영속화
- `features/quiz/exam/storage/scratchpad-strokes-store.test.ts`
- `features/quiz/exam/storage/scratchpad-split-ratio-store.ts` — 분할 비율 영속화
- `features/quiz/exam/storage/scratchpad-split-ratio-store.test.ts`
- `features/quiz/exam/hooks/use-scratchpad.ts` — 도구·획·Undo/Redo·debounce write
- `features/quiz/exam/hooks/use-scratchpad.test.ts`
- `features/quiz/exam/components/scratchpad-toolbar.tsx` — 우측 세로 툴바
- `features/quiz/exam/components/scratchpad-canvas.tsx` — Skia 캔버스
- `features/quiz/exam/components/split-divider.tsx` — 드래그 가능 분할선
- `features/quiz/exam/components/exam-solve-tablet-layout.tsx` — 좌우 분할 컨테이너

**Modify:**
- `constants/storage-keys.ts` — `scratchpadPrefix`, `scratchpadSplitRatioPrefix` 추가
- `features/quiz/exam/screens/exam-solve-screen.tsx` — `isTablet && isLandscape` 분기 추가
- `package.json` — `@shopify/react-native-skia` 의존성 추가

---

## Task 1: Skia 의존성 설치 + StorageKeys 확장

**Files:**
- Modify: `package.json`
- Modify: `constants/storage-keys.ts`

- [ ] **Step 1: Skia 패키지 설치**

```bash
npm install @shopify/react-native-skia
```

Expected: `node_modules/@shopify/react-native-skia` 추가, `package.json` deps에 항목 생김.

- [ ] **Step 2: StorageKeys에 prefix 추가**

`constants/storage-keys.ts` 끝의 마지막 항목 뒤에 두 줄 추가:

```ts
  examDiagnosisProgressPrefix: 'dasida/exam-diagnosis/',
  scratchpadPrefix: 'dasida/scratchpad/',
  scratchpadSplitRatioPrefix: 'dasida/scratchpad-split-ratio/',
} as const;
```

- [ ] **Step 3: 네이티브 빌드 재생성**

```bash
npx expo prebuild --clean
```

Expected: `ios/`, `android/` 디렉토리 재생성. 에러 없이 완료.

- [ ] **Step 4: iOS 빌드/실행**

```bash
npx expo run:ios
```

Expected: 시뮬레이터에서 앱이 검정화면 없이 부팅. (이 단계가 실패하면 Skia 설치가 잘못된 것)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json constants/storage-keys.ts ios android
git commit -m "feat(scratchpad): add Skia dep and storage key prefixes"
```

---

## Task 2: scratchpad-strokes-store (TDD)

**Files:**
- Create: `features/quiz/exam/storage/scratchpad-strokes-store.ts`
- Create: `features/quiz/exam/storage/scratchpad-strokes-store.test.ts`

- [ ] **Step 1: 테스트 작성 (실패 상태)**

`features/quiz/exam/storage/scratchpad-strokes-store.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadScratchpad,
  saveScratchpad,
  type ProblemScratchpad,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

const mocked = jest.mocked(AsyncStorage);
const ACCOUNT = 'user-abc';
const EXAM = 'g3-calc-csat-2024';
const PROBLEM = 21;
const KEY = `dasida/scratchpad/${ACCOUNT}/${EXAM}/${PROBLEM}`;

const SAMPLE: ProblemScratchpad = {
  examId: EXAM,
  problemNumber: PROBLEM,
  strokes: [
    {
      id: 's1',
      tool: 'pen',
      color: '#1A1916',
      size: 2,
      points: [
        { x: 10, y: 20, p: 0.5 },
        { x: 12, y: 22, p: 0.6 },
      ],
    },
  ],
  updatedAt: 1_700_000_000_000,
};

describe('scratchpad-strokes-store', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('saveScratchpad', () => {
    it('계정/시험/문제별 키로 직렬화하여 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveScratchpad(ACCOUNT, SAMPLE);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, JSON.stringify(SAMPLE));
    });

    it('AsyncStorage 에러를 삼킴 (안전한 무시)', async () => {
      mocked.setItem.mockRejectedValueOnce(new Error('quota'));
      await expect(saveScratchpad(ACCOUNT, SAMPLE)).resolves.toBeUndefined();
    });
  });

  describe('loadScratchpad', () => {
    it('값 없으면 null', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('정상 JSON을 파싱하여 반환', async () => {
      mocked.getItem.mockResolvedValueOnce(JSON.stringify(SAMPLE));
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toEqual(SAMPLE);
    });

    it('malformed JSON은 null', async () => {
      mocked.getItem.mockResolvedValueOnce('not-json{{');
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('strokes 필드가 배열이 아니면 null', async () => {
      mocked.getItem.mockResolvedValueOnce(
        JSON.stringify({ examId: EXAM, problemNumber: PROBLEM, strokes: 'oops', updatedAt: 0 }),
      );
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('AsyncStorage 에러는 null', async () => {
      mocked.getItem.mockRejectedValueOnce(new Error('boom'));
      await expect(loadScratchpad(ACCOUNT, EXAM, PROBLEM)).resolves.toBeNull();
    });

    it('계정 범위 키로 조회', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      await loadScratchpad(ACCOUNT, EXAM, PROBLEM);
      expect(mocked.getItem).toHaveBeenCalledWith(KEY);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/quiz/exam/storage/scratchpad-strokes-store.test.ts
```

Expected: FAIL — `Cannot find module ... scratchpad-strokes-store`

- [ ] **Step 3: 구현**

`features/quiz/exam/storage/scratchpad-strokes-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

export type StrokePoint = {
  x: number;
  y: number;
  p: number;
};

export type StrokeTool = 'pen' | 'highlighter';

export type Stroke = {
  id: string;
  tool: StrokeTool;
  color: string;
  size: number;
  points: StrokePoint[];
};

export type ProblemScratchpad = {
  examId: string;
  problemNumber: number;
  strokes: Stroke[];
  updatedAt: number;
};

function makeKey(accountKey: string, examId: string, problemNumber: number): string {
  return `${StorageKeys.scratchpadPrefix}${accountKey}/${examId}/${problemNumber}`;
}

function parse(raw: string): ProblemScratchpad | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.examId !== 'string') return null;
    if (typeof parsed.problemNumber !== 'number') return null;
    if (!Array.isArray(parsed.strokes)) return null;
    if (typeof parsed.updatedAt !== 'number') return null;
    return parsed as ProblemScratchpad;
  } catch {
    return null;
  }
}

export async function saveScratchpad(
  accountKey: string,
  scratchpad: ProblemScratchpad,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      makeKey(accountKey, scratchpad.examId, scratchpad.problemNumber),
      JSON.stringify(scratchpad),
    );
  } catch {}
}

export async function loadScratchpad(
  accountKey: string,
  examId: string,
  problemNumber: number,
): Promise<ProblemScratchpad | null> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey, examId, problemNumber));
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/storage/scratchpad-strokes-store.test.ts
```

Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/storage/scratchpad-strokes-store.ts features/quiz/exam/storage/scratchpad-strokes-store.test.ts
git commit -m "feat(scratchpad): add stroke persistence store"
```

---

## Task 3: scratchpad-split-ratio-store (TDD)

**Files:**
- Create: `features/quiz/exam/storage/scratchpad-split-ratio-store.ts`
- Create: `features/quiz/exam/storage/scratchpad-split-ratio-store.test.ts`

- [ ] **Step 1: 테스트 작성**

`features/quiz/exam/storage/scratchpad-split-ratio-store.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSplitRatio,
  saveSplitRatio,
} from '@/features/quiz/exam/storage/scratchpad-split-ratio-store';

const mocked = jest.mocked(AsyncStorage);
const ACCOUNT = 'user-abc';
const KEY = `dasida/scratchpad-split-ratio/${ACCOUNT}`;

describe('scratchpad-split-ratio-store', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('saveSplitRatio', () => {
    it('계정 키로 비율 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveSplitRatio(ACCOUNT, 0.42);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, '0.42');
    });

    it('0~1 범위 밖이면 clamp 후 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveSplitRatio(ACCOUNT, 1.5);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, '1');

      mocked.setItem.mockResolvedValueOnce(undefined);
      await saveSplitRatio(ACCOUNT, -0.5);
      expect(mocked.setItem).toHaveBeenCalledWith(KEY, '0');
    });

    it('AsyncStorage 에러는 삼킴', async () => {
      mocked.setItem.mockRejectedValueOnce(new Error('quota'));
      await expect(saveSplitRatio(ACCOUNT, 0.5)).resolves.toBeUndefined();
    });
  });

  describe('loadSplitRatio', () => {
    it('값 없으면 null', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });

    it('숫자 문자열이면 파싱하여 반환', async () => {
      mocked.getItem.mockResolvedValueOnce('0.42');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBe(0.42);
    });

    it('숫자가 아니면 null', async () => {
      mocked.getItem.mockResolvedValueOnce('abc');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });

    it('NaN/Infinity는 null', async () => {
      mocked.getItem.mockResolvedValueOnce('NaN');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
      mocked.getItem.mockResolvedValueOnce('Infinity');
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });

    it('AsyncStorage 에러는 null', async () => {
      mocked.getItem.mockRejectedValueOnce(new Error('boom'));
      await expect(loadSplitRatio(ACCOUNT)).resolves.toBeNull();
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/quiz/exam/storage/scratchpad-split-ratio-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`features/quiz/exam/storage/scratchpad-split-ratio-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

function makeKey(accountKey: string): string {
  return `${StorageKeys.scratchpadSplitRatioPrefix}${accountKey}`;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export async function saveSplitRatio(accountKey: string, ratio: number): Promise<void> {
  try {
    await AsyncStorage.setItem(makeKey(accountKey), String(clamp01(ratio)));
  } catch {}
}

export async function loadSplitRatio(accountKey: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey));
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/storage/scratchpad-split-ratio-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/storage/scratchpad-split-ratio-store.ts features/quiz/exam/storage/scratchpad-split-ratio-store.test.ts
git commit -m "feat(scratchpad): add split ratio persistence store"
```

---

## Task 4: use-scratchpad 훅 (TDD)

**Files:**
- Create: `features/quiz/exam/hooks/use-scratchpad.ts`
- Create: `features/quiz/exam/hooks/use-scratchpad.test.ts`

이 훅은 도구 상태(tool/color/size), stroke 배열, Undo/Redo 스택, debounced write, eraser 로직을 담당. 렌더링용 SkPath는 화면 컴포넌트에서 구성하고, 훅은 raw points만 노출.

- [ ] **Step 1: 테스트 작성**

`features/quiz/exam/hooks/use-scratchpad.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useScratchpad } from '@/features/quiz/exam/hooks/use-scratchpad';

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ profile: { accountKey: 'user-abc' } }),
}));

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
    await waitFor(() => expect(result.current.strokes).toEqual([]));
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
    await waitFor(() => expect(result.current.strokes).toHaveLength(1));
    expect(result.current.strokes[0].id).toBe('a');
  });

  it('beginStroke → appendPoint → endStroke 순서로 stroke 추가', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.strokes).toEqual([]));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.appendPoint({ x: 5, y: 5, p: 0.5 });
      result.current.endStroke();
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.strokes[0].points).toHaveLength(2);
  });

  it('endStroke 후 500ms debounce로 AsyncStorage write', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.strokes).toEqual([]));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.endStroke();
    });

    expect(mocked.setItem).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(mocked.setItem).toHaveBeenCalledTimes(1));
  });

  it('undo는 마지막 stroke 제거, redo는 복원', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.strokes).toEqual([]));

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
    await waitFor(() => expect(result.current.strokes).toEqual([]));

    // 펜으로 stroke 하나 그림
    act(() => {
      result.current.beginStroke({ x: 100, y: 100, p: 0.5 });
      result.current.appendPoint({ x: 110, y: 110, p: 0.5 });
      result.current.endStroke();
    });
    expect(result.current.strokes).toHaveLength(1);

    // 지우개로 그 위치 지나감 (size 16, 거리 8 이내면 제거)
    act(() => {
      result.current.setTool('eraser');
      result.current.setSize(16);
      result.current.beginStroke({ x: 105, y: 105, p: 0 });
      result.current.endStroke();
    });
    expect(result.current.strokes).toHaveLength(0);
  });

  it('clear는 모든 stroke와 undo/redo 스택을 비움', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    mocked.setItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useScratchpad(EXAM, PROBLEM));
    await waitFor(() => expect(result.current.strokes).toEqual([]));

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
    await waitFor(() => expect(result.current.strokes).toEqual([]));

    act(() => {
      result.current.beginStroke({ x: 0, y: 0, p: 0.5 });
      result.current.appendPoint({ x: 1, y: 0, p: 0.5 }); // 1px (skip)
      result.current.appendPoint({ x: 2, y: 0, p: 0.5 }); // cumulative 2px from prev recorded (add)
      result.current.endStroke();
    });
    expect(result.current.strokes[0].points).toHaveLength(2); // begin + 2px점
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/quiz/exam/hooks/use-scratchpad.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`features/quiz/exam/hooks/use-scratchpad.ts`:

```ts
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  loadScratchpad,
  saveScratchpad,
  type ProblemScratchpad,
  type Stroke,
  type StrokePoint,
  type StrokeTool,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

export type ActiveTool = 'pen' | 'highlighter' | 'eraser';

const DEFAULT_TOOL: ActiveTool = 'pen';
const DEFAULT_COLOR = '#1A1916';
const DEFAULT_SIZE = 2;
const POINT_MIN_DIST = 1.5;
const WRITE_DEBOUNCE_MS = 500;
const UNDO_LIMIT = 50;

type State = {
  loaded: boolean;
  strokes: Stroke[];
  liveStroke: Stroke | null;
  undoStack: Stroke[][];   // 직전 strokes 스냅샷
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

function pushUndo(state: State): Stroke[][] {
  const next = [...state.undoStack, state.strokes];
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
      const last = state.liveStroke.points[state.liveStroke.points.length - 1];
      const dx = action.point.x - last.x;
      const dy = action.point.y - last.y;
      if (dx * dx + dy * dy < POINT_MIN_DIST * POINT_MIN_DIST) return state;
      return {
        ...state,
        liveStroke: {
          ...state.liveStroke,
          points: [...state.liveStroke.points, action.point],
        },
      };
    }
    case 'end': {
      if (!state.liveStroke) return state;
      return {
        ...state,
        strokes: [...state.strokes, state.liveStroke],
        liveStroke: null,
        undoStack: pushUndo(state),
        redoStack: [],
      };
    }
    case 'erase-at': {
      const { x, y, radius } = action;
      const r2 = radius * radius;
      const remaining = state.strokes.filter((s) =>
        !s.points.some((pt) => {
          const ex = pt.x - x;
          const ey = pt.y - y;
          return ex * ex + ey * ey <= r2;
        }),
      );
      if (remaining.length === state.strokes.length) return state;
      return {
        ...state,
        strokes: remaining,
        undoStack: pushUndo(state),
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
      if (state.strokes.length === 0) return { ...state, undoStack: [], redoStack: [] };
      return {
        ...state,
        strokes: [],
        undoStack: [],
        redoStack: [],
      };
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
  const lastSavedRef = useRef<Stroke[]>([]);

  // Hydrate when (account, exam, problem) changes
  useEffect(() => {
    let cancelled = false;
    if (!accountKey) {
      dispatch({ type: 'hydrate', strokes: [] });
      return;
    }
    loadScratchpad(accountKey, examId, problemNumber).then((loaded) => {
      if (cancelled) return;
      const strokes = loaded?.strokes ?? [];
      lastSavedRef.current = strokes;
      dispatch({ type: 'hydrate', strokes });
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, examId, problemNumber]);

  // Debounced write whenever strokes change post-hydration
  useEffect(() => {
    if (!state.loaded || !accountKey) return;
    if (state.strokes === lastSavedRef.current) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      lastSavedRef.current = state.strokes;
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
      if (!accountKey) return;
      if (state.strokes === lastSavedRef.current) return;
      void saveScratchpad(accountKey, {
        examId,
        problemNumber,
        strokes: state.strokes,
        updatedAt: Date.now(),
      });
    };
    // run only on unmount; capture latest via closures intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTool = useCallback((t: ActiveTool) => dispatch({ type: 'set-tool', tool: t }), []);
  const setColor = useCallback((c: string) => dispatch({ type: 'set-color', color: c }), []);
  const setSize = useCallback((s: number) => dispatch({ type: 'set-size', size: s }), []);

  const beginStroke = useCallback(
    (p: StrokePoint) => {
      if (state.tool === 'eraser') {
        dispatch({ type: 'erase-at', x: p.x, y: p.y, radius: state.size / 2 });
        return;
      }
      const tool: StrokeTool = state.tool;
      const stroke: Stroke = {
        id: Crypto.randomUUID(),
        tool,
        color: state.color,
        size: state.size,
        points: [p],
      };
      dispatch({ type: 'begin', stroke });
    },
    [state.tool, state.color, state.size],
  );

  const appendPoint = useCallback(
    (p: StrokePoint) => {
      if (state.tool === 'eraser') {
        dispatch({ type: 'erase-at', x: p.x, y: p.y, radius: state.size / 2 });
        return;
      }
      dispatch({ type: 'append', point: p });
    },
    [state.tool, state.size],
  );

  const endStroke = useCallback(() => {
    if (state.tool === 'eraser') return;
    dispatch({ type: 'end' });
  }, [state.tool]);

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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/hooks/use-scratchpad.test.ts
```

Expected: PASS — 8 tests passed.

`@testing-library/react-native`이 미설치라면 먼저 `npm install --save-dev @testing-library/react-native` 후 재실행.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/hooks/use-scratchpad.ts features/quiz/exam/hooks/use-scratchpad.test.ts package.json package-lock.json
git commit -m "feat(scratchpad): add useScratchpad hook with persistence and undo/redo"
```

---

## Task 5: SplitDivider 컴포넌트

**Files:**
- Create: `features/quiz/exam/components/split-divider.tsx`

분할선 8pt 폭, Pan 제스처로 부모에 픽셀 델타 통보.

- [ ] **Step 1: 구현**

`features/quiz/exam/components/split-divider.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type SplitDividerProps = {
  onDragStart: () => void;
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
};

export function SplitDivider({ onDragStart, onDrag, onDragEnd }: SplitDividerProps) {
  const active = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      active.value = withTiming(1, { duration: 120 });
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      runOnJS(onDrag)(e.translationX);
    })
    .onEnd(() => {
      active.value = withTiming(0, { duration: 120 });
      runOnJS(onDragEnd)();
    });

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: active.value === 0 ? '#ECE4CD' : '#C9DEC5',
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.bar, bgStyle]}>
        <View style={styles.hitArea} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 8,
    height: '100%',
  },
  hitArea: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: 0,
    bottom: 0,
  },
});
```

`Pan.onUpdate`에서 `translationX`는 누적값이라 부모에서 origin 폭 + delta 방식으로 처리. 종료 시 `onDragEnd`로 영속화 트리거.

- [ ] **Step 2: 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 새 컴포넌트 관련 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/components/split-divider.tsx
git commit -m "feat(scratchpad): add draggable split divider"
```

---

## Task 6: ScratchpadToolbar 컴포넌트

**Files:**
- Create: `features/quiz/exam/components/scratchpad-toolbar.tsx`

세로 툴바: 도구 → 굵기 → 색상 → Undo/Redo/Clear. 도구별 size 후보가 다르므로 도구 변경 시 size를 도구별 기본값으로 리셋.

- [ ] **Step 1: 구현**

`features/quiz/exam/components/scratchpad-toolbar.tsx`:

```tsx
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ActiveTool } from '@/features/quiz/exam/hooks/use-scratchpad';

const COLORS = ['#1A1916', '#E85A4F', '#6FA8C9', '#F4B942', '#5C8C5A'] as const;

const SIZES_BY_TOOL: Record<ActiveTool, number[]> = {
  pen: [1, 2, 4],
  highlighter: [6, 10, 16],
  eraser: [8, 16, 24],
};

type ToolbarProps = {
  tool: ActiveTool;
  color: string;
  size: number;
  canUndo: boolean;
  canRedo: boolean;
  onSetTool: (t: ActiveTool) => void;
  onSetColor: (c: string) => void;
  onSetSize: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export function ScratchpadToolbar({
  tool,
  color,
  size,
  canUndo,
  canRedo,
  onSetTool,
  onSetColor,
  onSetSize,
  onUndo,
  onRedo,
  onClear,
}: ToolbarProps) {
  const sizes = SIZES_BY_TOOL[tool];
  const colorDisabled = tool === 'eraser';

  const handleSetTool = (next: ActiveTool) => {
    if (next === tool) return;
    onSetTool(next);
    onSetSize(SIZES_BY_TOOL[next][1]); // 도구 기본 굵기 = 가운데
  };

  const handleClear = () => {
    Alert.alert(
      '필기 삭제',
      '이 문제의 필기를 모두 지울까요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onClear },
      ],
    );
  };

  return (
    <View style={styles.bar}>
      <View style={styles.group}>
        <ToolButton label="펜" active={tool === 'pen'} onPress={() => handleSetTool('pen')} />
        <ToolButton label="형광" active={tool === 'highlighter'} onPress={() => handleSetTool('highlighter')} />
        <ToolButton label="지움" active={tool === 'eraser'} onPress={() => handleSetTool('eraser')} />
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {sizes.map((s) => (
          <Pressable
            key={s}
            onPress={() => onSetSize(s)}
            style={[styles.sizeDot, size === s && styles.sizeDotActive]}>
            <View style={[styles.sizeInner, { width: Math.min(s + 2, 18), height: Math.min(s + 2, 18) }]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            disabled={colorDisabled}
            onPress={() => onSetColor(c)}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color === c && !colorDisabled && styles.colorDotActive,
              colorDisabled && styles.colorDotDisabled,
            ]}
          />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        <Pressable disabled={!canUndo} onPress={onUndo} style={styles.actionBtn}>
          <Text style={[styles.actionLabel, !canUndo && styles.actionDisabled]}>↶</Text>
        </Pressable>
        <Pressable disabled={!canRedo} onPress={onRedo} style={styles.actionBtn}>
          <Text style={[styles.actionLabel, !canRedo && styles.actionDisabled]}>↷</Text>
        </Pressable>
        <Pressable onPress={handleClear} style={styles.actionBtn}>
          <Text style={styles.actionLabel}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToolButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toolBtn, active && styles.toolBtnActive]}>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 58,
    height: '100%',
    backgroundColor: '#FFFCF4',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ECE4CD',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
  },
  group: { alignItems: 'center', gap: 8 },
  divider: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ECE4CD',
  },
  toolBtn: {
    width: 38,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toolBtnActive: { backgroundColor: '#E5EFE0' },
  toolLabel: { fontSize: 11, color: '#3A3833', fontWeight: '500' },
  toolLabelActive: { color: '#293B27', fontWeight: '700' },
  sizeDot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  sizeDotActive: { backgroundColor: '#E5EFE0' },
  sizeInner: { backgroundColor: '#1A1916', borderRadius: 999 },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#1A1916',
  },
  colorDotDisabled: { opacity: 0.3 },
  actionBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 18, color: '#1A1916' },
  actionDisabled: { color: '#A8A296' },
});
```

- [ ] **Step 2: 컴파일 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/components/scratchpad-toolbar.tsx
git commit -m "feat(scratchpad): add toolbar component"
```

---

## Task 7: ScratchpadCanvas (Skia)

**Files:**
- Create: `features/quiz/exam/components/scratchpad-canvas.tsx`

Skia `<Canvas>` 위에 Pan 제스처 + 줄노트 배경 + 워드마크 합성. live/committed 분리 렌더로 60fps.

- [ ] **Step 1: 구현**

`features/quiz/exam/components/scratchpad-canvas.tsx`:

```tsx
import {
  Canvas,
  Group,
  Line,
  Path,
  Skia,
  Text as SkiaText,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { UseScratchpadResult } from '@/features/quiz/exam/hooks/use-scratchpad';
import type { Stroke, StrokePoint } from '@/features/quiz/exam/storage/scratchpad-strokes-store';

type CanvasProps = {
  width: number;
  height: number;
  scratchpad: UseScratchpadResult;
};

const LINE_GAP = 32;
const MARGIN_X = 52;
const WORDMARK = 'DASIDA';

function buildPath(points: StrokePoint[]) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  path.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    // single point — render as small dot via tiny line
    path.lineTo(points[0].x + 0.01, points[0].y + 0.01);
    return path;
  }
  // Catmull-Rom → cubic Bezier (tension = 0.5)
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path.cubicTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }
  return path;
}

function strokeOpacity(s: Stroke): number {
  return s.tool === 'highlighter' ? 0.35 : 1;
}

function strokeWidthFor(s: Stroke): number {
  // 평균 압력으로 단순화 (최종 stroke 렌더 시)
  if (s.tool === 'highlighter') return s.size;
  if (s.points.length === 0) return s.size;
  const avgP = s.points.reduce((a, p) => a + p.p, 0) / s.points.length;
  return s.size * (0.4 + 0.6 * avgP);
}

export function ScratchpadCanvas({ width, height, scratchpad }: CanvasProps) {
  const { strokes, liveStroke, beginStroke, appendPoint, endStroke } = scratchpad;

  const committedPaths = useMemo(
    () =>
      strokes.map((s) => ({
        id: s.id,
        path: buildPath(s.points),
        color: s.color,
        width: strokeWidthFor(s),
        opacity: strokeOpacity(s),
      })),
    [strokes],
  );

  const livePath = useMemo(
    () => (liveStroke ? buildPath(liveStroke.points) : null),
    [liveStroke],
  );

  const lineCount = Math.floor((height - 24) / LINE_GAP);
  const wordmarkFont = useMemo(
    () => matchFont({ fontFamily: 'Menlo', fontSize: 13, fontWeight: 'bold' }),
    [],
  );

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onBegin((e) => {
      beginStroke({ x: e.x, y: e.y, p: 0.5 });
    })
    .onUpdate((e) => {
      // @ts-expect-error - force is iOS-only on Pan event when handler exposes it
      const force = typeof e.force === 'number' ? e.force : 0.5;
      appendPoint({ x: e.x, y: e.y, p: force });
    })
    .onEnd(() => {
      endStroke();
    });

  return (
    <View style={[styles.wrap, { width, height }]}>
      <GestureDetector gesture={pan}>
        <Canvas style={{ width, height }}>
          {/* 줄노트 가로선 */}
          <Group opacity={0.15}>
            {Array.from({ length: lineCount }).map((_, i) => {
              const y = 24 + i * LINE_GAP;
              return (
                <Line
                  key={i}
                  p1={vec(0, y)}
                  p2={vec(width, y)}
                  color="#6FA8C9"
                  strokeWidth={1}
                />
              );
            })}
          </Group>

          {/* 마진선 */}
          <Line
            p1={vec(MARGIN_X, 0)}
            p2={vec(MARGIN_X, height)}
            color="#E85A4F"
            strokeWidth={1}
            opacity={0.18}
          />

          {/* committed strokes */}
          {committedPaths.map((s) => (
            <Path
              key={s.id}
              path={s.path}
              style="stroke"
              strokeWidth={s.width}
              strokeCap="round"
              strokeJoin="round"
              color={s.color}
              opacity={s.opacity}
            />
          ))}

          {/* live stroke */}
          {livePath && liveStroke && (
            <Path
              path={livePath}
              style="stroke"
              strokeWidth={strokeWidthFor(liveStroke)}
              strokeCap="round"
              strokeJoin="round"
              color={liveStroke.color}
              opacity={strokeOpacity(liveStroke)}
            />
          )}

          {/* DASIDA 워드마크 */}
          <SkiaText
            x={12}
            y={height - 14}
            text={WORDMARK}
            font={wordmarkFont}
            color="#5C8C5A"
            opacity={0.5}
          />
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFCF4',
  },
});
```

- [ ] **Step 2: 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음. (Skia 타입은 패키지에 포함됨.)

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/components/scratchpad-canvas.tsx
git commit -m "feat(scratchpad): add Skia drawing canvas"
```

---

## Task 8: ExamSolveTabletLayout (좌우 분할 컨테이너)

**Files:**
- Create: `features/quiz/exam/components/exam-solve-tablet-layout.tsx`

좌측은 props로 주입(헤더/문제 본문/푸터 노드를 phone 화면 그대로 받음), 우측은 toolbar + canvas. 분할 비율은 자체 상태 + AsyncStorage.

- [ ] **Step 1: 구현**

`features/quiz/exam/components/exam-solve-tablet-layout.tsx`:

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { ScratchpadCanvas } from '@/features/quiz/exam/components/scratchpad-canvas';
import { ScratchpadToolbar } from '@/features/quiz/exam/components/scratchpad-toolbar';
import { SplitDivider } from '@/features/quiz/exam/components/split-divider';
import { useScratchpad } from '@/features/quiz/exam/hooks/use-scratchpad';
import {
  loadSplitRatio,
  saveSplitRatio,
} from '@/features/quiz/exam/storage/scratchpad-split-ratio-store';

type Props = {
  examId: string;
  problemNumber: number;
  header: ReactNode;
  problemPanel: ReactNode; // body + footer 묶음 (phone 화면 위·아래 영역)
};

const DEFAULT_RATIO = 520 / (1194 - 8);
const DIVIDER_WIDTH = 8;
const TOOLBAR_WIDTH = 58;
const LEFT_MIN = 360;
const LEFT_MAX = 720;

export function ExamSolveTabletLayout({ examId, problemNumber, header, problemPanel }: Props) {
  const { width, height } = useWindowDimensions();
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const dragOriginRef = useRef(DEFAULT_RATIO);
  const scratchpad = useScratchpad(examId, problemNumber);

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
  const rawLeft = Math.round(totalForSplit * ratio);
  const leftWidth = Math.max(LEFT_MIN, Math.min(LEFT_MAX, rawLeft));
  const rightWidth = width - leftWidth - DIVIDER_WIDTH;
  const canvasWidth = Math.max(0, rightWidth - TOOLBAR_WIDTH);
  const bodyHeight = Math.max(0, height); // 부모에서 SafeArea/header를 둘러싸므로 여기선 100%

  const handleDrag = (deltaX: number) => {
    const nextLeft = Math.max(
      LEFT_MIN,
      Math.min(LEFT_MAX, Math.round(totalForSplit * dragOriginRef.current) + deltaX),
    );
    setRatio(nextLeft / totalForSplit);
  };

  const handleDragStart = () => {
    dragOriginRef.current = ratio;
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

        <View style={[styles.rightPanel, { width: rightWidth }]}>
          <ScratchpadToolbar
            tool={scratchpad.tool}
            color={scratchpad.color}
            size={scratchpad.size}
            canUndo={scratchpad.canUndo}
            canRedo={scratchpad.canRedo}
            onSetTool={scratchpad.setTool}
            onSetColor={scratchpad.setColor}
            onSetSize={scratchpad.setSize}
            onUndo={scratchpad.undo}
            onRedo={scratchpad.redo}
            onClear={scratchpad.clear}
          />
          <ScratchpadCanvas width={canvasWidth} height={bodyHeight} scratchpad={scratchpad} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF6EC' },
  split: { flex: 1, flexDirection: 'row' },
  leftPanel: { backgroundColor: '#FAF6EC' },
  dividerWrap: { width: 8 },
  rightPanel: { flexDirection: 'row', backgroundColor: '#FFFCF4' },
});
```

> **참고:** `bodyHeight`는 부모 컨테이너의 `flex:1`에 따라 결정되도록 ScratchpadCanvas에 `height={'100%'}` 형태로 넘기면 더 깔끔하지만 Skia `<Canvas style>`이 숫자 픽셀을 요구하므로 `onLayout`로 측정한 값을 사용하도록 다음 step에서 보강한다.

- [ ] **Step 2: bodyHeight를 onLayout으로 측정하도록 보강**

방금 작성한 파일에서 `bodyHeight` 계산을 다음으로 교체:

```tsx
// 컴포넌트 상단에 추가
const [bodyHeight, setBodyHeight] = useState(0);

// rightPanel View에 onLayout 추가
<View
  style={[styles.rightPanel, { width: rightWidth }]}
  onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
```

`const bodyHeight = Math.max(0, height);` 라인은 삭제.

- [ ] **Step 3: 컴파일 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/components/exam-solve-tablet-layout.tsx
git commit -m "feat(scratchpad): add tablet split layout container"
```

---

## Task 9: exam-solve-screen 분기 통합

**Files:**
- Modify: `features/quiz/exam/screens/exam-solve-screen.tsx`

기존 화면의 body+footer를 노드로 묶어 `ExamSolveTabletLayout`에 넘김. `useIsTablet() && width > height`일 때만 활성.

- [ ] **Step 1: 분기 추가**

`features/quiz/exam/screens/exam-solve-screen.tsx`를 다음으로 교체:

```tsx
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useIsTablet } from '@/hooks/use-is-tablet';
import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import examImages from '@/features/quiz/data/exam-images';

import { ExamSolveTabletLayout } from '../components/exam-solve-tablet-layout';
import { ExamNumberPanel } from '../components/exam-number-panel';
import { ExamProgressPanel } from '../components/exam-progress-panel';
import { ExamShortAnswerPanel } from '../components/exam-short-answer-panel';
import { ExamSolveHeader } from '../components/exam-solve-header';
import { useExamSolveScreen } from '../hooks/use-exam-solve-screen';

type ExamSolveScreenProps = {
  examId: string;
};

export function ExamSolveScreen({ examId }: ExamSolveScreenProps) {
  const {
    currentProblem,
    currentIndex,
    totalCount,
    answeredCount,
    answeredIndices,
    currentAnswer,
    shortAnswerText,
    isCompactLayout,
    canGoPrev,
    isLast,
    imageKey,
    bookmarkedIndices,
    isCurrentBookmarked,
    onToggleBookmark,
    onSelectChoice,
    onChangeShortAnswer,
    onPrev,
    onNext,
    onExit,
  } = useExamSolveScreen(examId);

  const isTablet = useIsTablet();
  const { width, height } = useWindowDimensions();
  const useTabletLayout = isTablet && width > height;

  const [imageAspectRatio, setImageAspectRatio] = useState<number | undefined>(undefined);
  const handleImageLoad = useCallback(
    (e: { source: { width: number; height: number } }) => {
      if (e.source.width > 0 && e.source.height > 0) {
        setImageAspectRatio(e.source.width / e.source.height);
      }
    },
    [],
  );

  useEffect(() => {
    setImageAspectRatio(undefined);
  }, [imageKey]);

  if (!currentProblem) return null;

  const imageSource = examImages[imageKey];
  const isShortAnswer = currentProblem.type === 'short_answer';

  const header = (
    <ExamSolveHeader
      currentNumber={currentProblem.number}
      totalCount={totalCount}
      answeredCount={answeredCount}
      isBookmarked={isCurrentBookmarked}
      onToggleBookmark={onToggleBookmark}
      onExit={onExit}
      isCompactLayout={isCompactLayout}
    />
  );

  const body = (
    <View style={styles.body}>
      <Image
        source={imageSource}
        style={[
          styles.problemImage,
          imageAspectRatio ? { aspectRatio: imageAspectRatio } : styles.problemImageFallback,
        ]}
        contentFit="contain"
        transition={0}
        onLoad={handleImageLoad}
      />
      <ExamProgressPanel
        totalCount={totalCount}
        currentIndex={currentIndex}
        answeredIndices={answeredIndices}
        bookmarkedIndices={bookmarkedIndices}
      />
    </View>
  );

  const footer = isShortAnswer ? (
    <ExamShortAnswerPanel
      value={shortAnswerText}
      onChangeText={onChangeShortAnswer}
      onPrev={onPrev}
      onNext={onNext}
      canGoPrev={canGoPrev}
      isLast={isLast}
      isCompactLayout={isCompactLayout}
    />
  ) : (
    <ExamNumberPanel
      selectedAnswer={currentAnswer}
      onSelect={onSelectChoice}
      onPrev={onPrev}
      onNext={onNext}
      canGoPrev={canGoPrev}
      isLast={isLast}
      isCompactLayout={isCompactLayout}
    />
  );

  if (useTabletLayout) {
    return (
      <ExamSolveTabletLayout
        examId={examId}
        problemNumber={currentProblem.number}
        header={header}
        problemPanel={
          <View style={styles.tabletProblemPanel}>
            <View style={styles.tabletBody}>{body}</View>
            <View>{footer}</View>
          </View>
        }
      />
    );
  }

  return <QuizSolveLayout header={header} body={body} footer={footer} />;
}

const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 16,
  },
  problemImage: {
    width: '100%',
  },
  problemImageFallback: {
    minHeight: 120,
  },
  tabletProblemPanel: {
    flex: 1,
    flexDirection: 'column',
  },
  tabletBody: { flex: 1 },
});
```

- [ ] **Step 2: 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 3: 단위 테스트 회귀 확인**

```bash
npx jest
```

Expected: 모든 기존 테스트 + 새로 추가한 테스트 통과.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/screens/exam-solve-screen.tsx
git commit -m "feat(scratchpad): branch exam-solve-screen to tablet layout in landscape"
```

---

## Task 10: 수동 검증 (iPad 시뮬레이터)

**Files:** (변경 없음)

이 태스크는 사람이 직접 실행해야 한다. 자동 통과 여부를 코드로 확인할 수 없는 항목.

- [ ] **Step 1: iPad 시뮬레이터 부팅 + 앱 실행**

```bash
npx expo run:ios --device "iPad (10th generation)"
```

또는 시뮬레이터에서 `iPad Pro 11-inch`. Expected: 앱이 검정화면 없이 부팅.

- [ ] **Step 2: 가로 모드에서 시험 풀이 진입**

- 시험 회차 선택 → "풀기" → 시뮬레이터를 가로(Cmd+→ )로 회전
- Expected: 좌측 문제 패널 + 우측 줄노트 캔버스 + 좌측 끝 툴바가 보임. 분할선이 가운데 부근.

- [ ] **Step 3: 손가락(또는 Pencil)으로 stroke 그리기**

- Expected: 매끄러운 곡선이 그려짐. 끊김 없음.

- [ ] **Step 4: 도구/색상/굵기 변경 검증**

- 펜 → 형광펜: 반투명 굵은 stroke
- 펜 → 지우개: stroke 위를 지나가면 해당 stroke 사라짐
- 색상/굵기 변경 즉시 반영

- [ ] **Step 5: Undo/Redo/Clear**

- Undo: 마지막 stroke 제거
- Redo: 복원
- Clear: 확인 다이얼로그 → "삭제" 누르면 모두 사라짐

- [ ] **Step 6: 문제 이동 후 복원**

- 문제 1번에서 stroke 그리기 → 다음 문제 이동 → 1번으로 돌아오기
- Expected: stroke 그대로 복원

- [ ] **Step 7: 앱 강제 종료 후 재진입**

- stroke 그린 직후(0.5초 이내) 앱 강제 종료 — debounce flush 확인
- 재진입 → 같은 시험·문제 진입 → stroke 복원되는지 확인

- [ ] **Step 8: 분할선 드래그**

- 분할선을 좌우로 드래그
- Expected: 좌측 패널 360~720pt 범위 내 부드럽게 움직임. 종료 후 화면 재진입 시 비율 유지.

- [ ] **Step 9: 회전 처리**

- 가로 → 세로 회전: 폰 레이아웃으로 자동 전환, 캔버스 영역 사라짐
- 세로 → 가로: 다시 분할 레이아웃, stroke 보존

- [ ] **Step 10: 폰 회귀 검증**

- iPhone 시뮬레이터(또는 iPad 세로)에서 같은 화면 진입
- Expected: 기존 폰 레이아웃 그대로, 캔버스 흔적 없음, 모든 기능 정상

- [ ] **Step 11: 결과 메모 + 최종 커밋(있을 경우)**

수동 검증에서 발견한 이슈는 별도 fix 커밋으로. 수정 사항 없으면 다음으로 진행.

```bash
# 수정 있을 때만
git add -A
git commit -m "fix(scratchpad): <발견한 이슈 요약>"
```

---

## Self-Review (작성자 자체 검토)

**1. Spec coverage**

| Spec 항목 | 구현 위치 |
|---|---|
| `useIsTablet()` 분기 | Task 9 |
| Skia 캔버스 (이중 레이어) | Task 7 (`committedPaths` 메모이즈 + `livePath`) |
| 펜·형광펜·지우개·5색·3굵기 | Task 6 (Toolbar) + Task 7 (렌더 분기) |
| Undo/Redo (max 50, 메모리만) | Task 4 (UNDO_LIMIT, redo 스택) |
| Clear + 확인 다이얼로그 | Task 6 (Alert) + Task 4 (clear reducer) |
| Stroke 영속화 (debounced 500ms, unmount flush) | Task 4 (writeTimer + unmount cleanup) |
| Stroke eraser (size/2 거리) | Task 4 (`erase-at` reducer) |
| 점 sampling 1.5px | Task 4 (`POINT_MIN_DIST`) |
| 압력 반영 (펜만) | Task 7 (`strokeWidthFor`) |
| Catmull-Rom 스무딩 | Task 7 (`buildPath`) |
| 줄노트 + 마진선 + 워드마크 | Task 7 |
| 분할선 드래그 + min/max + 비율 영속화 | Task 5 + Task 8 |
| 회전 시 폰 레이아웃 fallback | Task 9 (`width > height` 조건) |
| 디자인 토큰 (색상) | Task 6, 7, 8에 hex 직접 (디자인 토큰 동일값) |

**2. Placeholder scan**: TBD/TODO 없음. 모든 step에 실제 코드 포함.

**3. Type consistency**: `Stroke`, `StrokePoint`, `StrokeTool`, `ActiveTool`, `UseScratchpadResult`, `ProblemScratchpad` 정의-사용 일관. `ScratchpadCanvas`는 `UseScratchpadResult` 받음. Toolbar는 개별 prop 받음.

**4. 미커버 spec 항목**: 없음.
