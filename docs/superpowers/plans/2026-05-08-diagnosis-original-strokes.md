# 약점 진단 화면 — 원본 풀이 읽기 전용 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 진단 화면(`exam-diagnosis-session-screen`)에서 사용자가 exam-solve 시 그렸던 손글씨 풀이를 읽기 전용 half-sheet로 볼 수 있게 한다.

**Architecture:** 기존 `scratchpad-strokes-store`에서 같은 키로 strokes를 읽기만 하는 새 hook을 도입하고, `ScratchpadCanvas`에 `readOnly` 모드를 추가해 재사용한다. half-sheet는 React Native 표준 `Modal`에 `slide` 애니메이션을 사용하고, ScrollView의 `maximumZoomScale`로 pinch-zoom을 제공한다. 추가 네이티브 의존성 없음 → prebuild 불필요.

**Tech Stack:** React Native 0.81+, Expo SDK 54, `@shopify/react-native-skia` 2.6, `react-native-gesture-handler` 2.28, AsyncStorage, Jest + `@testing-library/react-native`, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-08-diagnosis-original-strokes-design.md`

---

## File Structure

| 경로 | 동작 |
|---|---|
| `features/quiz/exam/hooks/use-problem-strokes.ts` | **신규** — strokes 존재 여부 + 데이터 조회 |
| `features/quiz/exam/hooks/use-problem-strokes.test.ts` | **신규** — hook 단위 테스트 |
| `features/quiz/exam/components/scratchpad-canvas.tsx` | **수정** — `readOnly` prop 추가, edit 메서드 optional화 |
| `features/quiz/exam/components/original-strokes-sheet.tsx` | **신규** — half-sheet 모달 컴포넌트 |
| `features/quiz/components/diagnosis-dark-header.tsx` | **수정** — 우측 토글 버튼 슬롯 추가 (optional props) |
| `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` | **수정** — hook 호출, 헤더 props 전달, 시트 visible 상태 관리 |

각 task는 독립 commit으로 마무리한다.

---

## Task 1: `useProblemStrokes` hook + tests

**Files:**
- Create: `features/quiz/exam/hooks/use-problem-strokes.ts`
- Create: `features/quiz/exam/hooks/use-problem-strokes.test.ts`

- [ ] **Step 1: 테스트 작성 (실패하는 상태)**

`features/quiz/exam/hooks/use-problem-strokes.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useProblemStrokes } from '@/features/quiz/exam/hooks/use-problem-strokes';

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({ profile: { accountKey: 'user-abc' } }),
}));

const mocked = jest.mocked(AsyncStorage);

const sampleStored = {
  examId: 'exam-1',
  problemNumber: 21,
  strokes: [
    {
      id: 'a',
      tool: 'pen',
      color: '#000',
      size: 2,
      points: [{ x: 10, y: 20, p: 0.5 }],
    },
  ],
  updatedAt: 1,
};

describe('useProblemStrokes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('strokes 있으면 hasStrokes true', async () => {
    mocked.getItem.mockResolvedValueOnce(JSON.stringify(sampleStored));
    const { result } = renderHook(() => useProblemStrokes('exam-1', 21));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(true);
    expect(result.current.strokes).toHaveLength(1);
  });

  it('storage 비어있으면 hasStrokes false', async () => {
    mocked.getItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useProblemStrokes('exam-1', 22));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(false);
    expect(result.current.strokes).toEqual([]);
  });

  it('examId가 비어있으면 storage 조회 없이 빈 결과', async () => {
    const { result } = renderHook(() => useProblemStrokes('', 0));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(false);
    expect(mocked.getItem).not.toHaveBeenCalled();
  });

  it('problemNumber 변경 시 재조회', async () => {
    mocked.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ ...sampleStored, problemNumber: 22 }));
    const { result, rerender } = renderHook(
      ({ p }: { p: number }) => useProblemStrokes('exam-1', p),
      { initialProps: { p: 21 } },
    );
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasStrokes).toBe(false);

    rerender({ p: 22 });
    await waitFor(() => expect(result.current.hasStrokes).toBe(true));
    expect(result.current.strokes).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

```bash
npm test -- use-problem-strokes
```

Expected: 4개 모두 FAIL with `Cannot find module '@/features/quiz/exam/hooks/use-problem-strokes'`.

- [ ] **Step 3: hook 구현**

`features/quiz/exam/hooks/use-problem-strokes.ts`:

```ts
import { useEffect, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  loadScratchpad,
  type Stroke,
} from '@/features/quiz/exam/storage/scratchpad-strokes-store';

export type UseProblemStrokesResult = {
  loaded: boolean;
  strokes: Stroke[];
  hasStrokes: boolean;
};

export function useProblemStrokes(
  examId: string,
  problemNumber: number,
): UseProblemStrokesResult {
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [loaded, setLoaded] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    if (!accountKey || !examId || !problemNumber) {
      setStrokes([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void loadScratchpad(accountKey, examId, problemNumber).then((data) => {
      if (cancelled) return;
      setStrokes(data?.strokes ?? []);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey, examId, problemNumber]);

  return {
    loaded,
    strokes,
    hasStrokes: loaded && strokes.length > 0,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- use-problem-strokes
```

Expected: 4개 모두 PASS.

- [ ] **Step 5: typecheck / lint**

```bash
npm run typecheck
npm run lint
```

Expected: 새 파일 관련 오류 없음.

- [ ] **Step 6: Commit**

```bash
git add features/quiz/exam/hooks/use-problem-strokes.ts features/quiz/exam/hooks/use-problem-strokes.test.ts
git commit -m "feat(diagnosis): add useProblemStrokes hook to query saved strokes"
```

---

## Task 2: `ScratchpadCanvas`에 `readOnly` 모드 추가

**Files:**
- Modify: `features/quiz/exam/components/scratchpad-canvas.tsx`

**의도:** `readOnly={true}`이면 `GestureDetector`를 거치지 않고 캔버스만 렌더한다. 편집용 메서드(`beginStroke`/`appendPoint`/`endStroke`)와 `liveStroke`는 read-only 호출자가 안 넘겨도 되도록 optional화한다. 기존 exam-solve 호출부는 모든 prop을 그대로 넘기므로 영향 없음.

- [ ] **Step 1: 타입과 props 디스트럭처링 수정**

`scratchpad-canvas.tsx` 상단의 `CanvasScratchpadProps`와 `ScratchpadCanvasProps`를 다음과 같이 변경:

```ts
type CanvasScratchpadProps = {
  strokes: Stroke[];
  liveStroke?: Stroke | null;
  beginStroke?: (p: StrokePoint) => void;
  appendPoint?: (p: StrokePoint) => void;
  endStroke?: () => void;
};

type ScratchpadCanvasProps = {
  width: number;
  height: number;
  scratchpad: CanvasScratchpadProps;
  /** When true, only Apple Pencil (stylus) input is accepted. Finger/palm touches are ignored. */
  pencilOnly?: boolean;
  /** When true, gestures are disabled and the canvas only renders strokes. */
  readOnly?: boolean;
};
```

함수 시그니처에 `readOnly`를 받도록 수정:

```ts
export function ScratchpadCanvas({
  width,
  height,
  scratchpad,
  pencilOnly = false,
  readOnly = false,
}: ScratchpadCanvasProps) {
  const { strokes, liveStroke = null, beginStroke, appendPoint, endStroke } = scratchpad;
  // ...rest unchanged until gesture/return
```

- [ ] **Step 2: read-only 분기로 GestureDetector 우회**

기존 return 블록 직전에 read-only 분기를 추가하고, 기존 return은 그대로 둔다. 함수 끝 부분을 다음과 같이 교체:

```tsx
  if (width <= 0 || height <= 0) return null;

  // Build the canvas once; both branches share the same render output.
  const canvas = (
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
  );

  if (readOnly) {
    return <View style={[styles.wrap, { width, height }]}>{canvas}</View>;
  }

  // Defensive: editing handlers must exist when not read-only.
  if (!beginStroke || !appendPoint || !endStroke) {
    return <View style={[styles.wrap, { width, height }]}>{canvas}</View>;
  }

  // .runOnJS(true): gesture callbacks call JS-thread state setters and read JS refs;
  // running on UI thread crashes / triggers worklet warnings.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    .minDistance(0)
    .onBegin((e) => {
      isStylusGestureRef.current = !!e.stylusData;
      if (pencilOnlyRef.current && !isStylusGestureRef.current) return;
      const p = e.stylusData?.pressure ?? 0.5;
      beginStroke({ x: e.x, y: e.y, p });
    })
    .onUpdate((e) => {
      if (pencilOnlyRef.current && !isStylusGestureRef.current) return;
      const p = e.stylusData?.pressure ?? 0.5;
      appendPoint({ x: e.x, y: e.y, p });
    })
    .onFinalize(() => {
      if (pencilOnlyRef.current && !isStylusGestureRef.current) return;
      endStroke();
    });

  return (
    <View style={[styles.wrap, { width, height }]}>
      <GestureDetector gesture={pan}>{canvas}</GestureDetector>
    </View>
  );
}
```

> **NOTE**: 위 패턴은 기존 함수 끝의 `return` 한 번을 두 번(read-only / 편집)으로 나눈 것. JSX 본문(`<Canvas>...`)은 한 번만 정의해 분기 양쪽이 공유한다. 기존 캔버스 자식 렌더링 로직은 그대로다.

- [ ] **Step 3: 기존 exam-solve 회귀 확인**

수동 점검: iPhone 시뮬레이터로 `exam-solve-screen` 진입 → iPad 시뮬레이터로 가로 회전 → scratchpad에 그리기/지우기/undo가 평소처럼 동작하는지 확인.

```bash
npm run typecheck
npm run lint
```

Expected: 오류 없음.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/components/scratchpad-canvas.tsx
git commit -m "feat(scratchpad): add readOnly mode to ScratchpadCanvas"
```

---

## Task 3: `OriginalStrokesSheet` 컴포넌트 신규

**Files:**
- Create: `features/quiz/exam/components/original-strokes-sheet.tsx`

**의도:** half-sheet 모달. 내부에서 `useProblemStrokes`로 strokes를 다시 로드(또는 props로 직접 받음)하고, ScrollView + `maximumZoomScale`로 fit-to-width + pinch-zoom 제공. strokes의 bounding box로 캔버스 크기를 결정해, 디바이스/회전 무관하게 그렸을 때 모양 유지.

- [ ] **Step 1: 컴포넌트 작성**

`features/quiz/exam/components/original-strokes-sheet.tsx`:

```tsx
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Stroke } from '@/features/quiz/exam/storage/scratchpad-strokes-store';

import { ScratchpadCanvas } from './scratchpad-canvas';

const SHEET_HEIGHT_RATIO = 0.6;
const PADDING = 40;
// Fallback canvas size when strokes have no measurable extent (defensive only).
const FALLBACK_CANVAS = { width: 800, height: 600 };

type Props = {
  visible: boolean;
  strokes: Stroke[];
  loaded: boolean;
  onClose: () => void;
};

function computeBounds(strokes: Stroke[]): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;
  for (const s of strokes) {
    for (const p of s.points) {
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (maxX <= 0 || maxY <= 0) return FALLBACK_CANVAS;
  return { width: Math.ceil(maxX + PADDING), height: Math.ceil(maxY + PADDING) };
}

export function OriginalStrokesSheet({ visible, strokes, loaded, onClose }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const sheetHeight = Math.round(screenHeight * SHEET_HEIGHT_RATIO);
  const bounds = computeBounds(strokes);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="원본 풀이 닫기"
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { height: sheetHeight, paddingBottom: insets.bottom },
        ]}
        accessibilityViewIsModal>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>당시 풀이</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={12}>
            <Text style={styles.close}>닫기</Text>
          </Pressable>
        </View>

        {loaded && strokes.length > 0 ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { minWidth: screenWidth },
            ]}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom>
            <ScratchpadCanvas
              width={bounds.width}
              height={bounds.height}
              scratchpad={{ strokes, liveStroke: null }}
              readOnly
            />
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loaded ? '이 문제에서 손으로 적은 풀이가 없어요.' : '불러오는 중…'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#FFFCF4',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#D6CFB8',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE9D5',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#1A1916' },
  close: { fontSize: 14, color: '#5C8C5A', fontWeight: '500' },
  scroll: { flex: 1, backgroundColor: '#FAF6EC' },
  scrollContent: { padding: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#7A7666', fontSize: 14 },
});
```

> **NOTE**: 부모(`exam-diagnosis-session-screen`)는 strokes가 있는 문제에서만 토글 버튼을 노출하므로, 평상시엔 빈 상태 분기로 들어올 일이 없다. 빈 메시지는 방어용 fallback이다.

- [ ] **Step 2: typecheck / lint**

```bash
npm run typecheck
npm run lint
```

Expected: 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/components/original-strokes-sheet.tsx
git commit -m "feat(diagnosis): add OriginalStrokesSheet half-sheet component"
```

---

## Task 4: `DiagnosisDarkHeader`에 토글 버튼 슬롯 추가

**Files:**
- Modify: `features/quiz/components/diagnosis-dark-header.tsx`

**의도:** 새 props가 둘 다 전달될 때만 우측 헤더에 작은 버튼 표시. 기존 호출부(다른 화면)는 props를 안 넘기면 변화 없음 → 회귀 위험 0.

- [ ] **Step 1: props 타입 확장**

`diagnosis-dark-header.tsx`의 `DiagnosisDarkHeaderProps`에 두 필드 추가:

```ts
type DiagnosisDarkHeaderProps = {
  title: string;
  backLabel: string;
  progressLabel: string;
  progressPercent: number;
  totalCount: number;
  completedIndices: number[];
  activeIndex: number;
  onBack: () => void;
  onDotPress: (index: number) => void;
  /** When provided AND `showOriginalStrokesButton` is true, renders a button on the
   * right of the top row that opens the original-strokes sheet. */
  onPressOriginalStrokes?: () => void;
  showOriginalStrokesButton?: boolean;
};
```

- [ ] **Step 2: 컴포넌트 디스트럭처링과 렌더 변경**

`export function DiagnosisDarkHeader({ ... })`에 새 props 추가:

```tsx
export function DiagnosisDarkHeader({
  title,
  backLabel,
  progressLabel,
  progressPercent,
  totalCount,
  completedIndices,
  activeIndex,
  onBack,
  onDotPress,
  onPressOriginalStrokes,
  showOriginalStrokesButton = false,
}: DiagnosisDarkHeaderProps) {
```

`topRow` 렌더에서 우측 progressLabel 옆에 버튼을 조건부 추가. 기존 `<Text style={styles.progressLabel}>{progressLabel}</Text>` 라인을 다음 블록으로 교체:

```tsx
          <View style={styles.topRowRight}>
            {showOriginalStrokesButton && onPressOriginalStrokes ? (
              <Pressable
                onPress={onPressOriginalStrokes}
                accessibilityRole="button"
                accessibilityLabel="원본 풀이 보기"
                hitSlop={8}
                style={styles.strokesButton}>
                <Text style={styles.strokesButtonLabel}>당시 풀이</Text>
              </Pressable>
            ) : null}
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          </View>
```

- [ ] **Step 3: 스타일 추가**

`StyleSheet.create({...})` 안에 다음 추가:

```ts
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  strokesButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  strokesButtonLabel: {
    color: '#FAF6EC',
    fontSize: 12,
    fontWeight: '500',
  },
```

> **NOTE**: 헤더의 어두운 배경(DiagnosisTheme.canvas) 위에 들어가므로 라벨은 밝은 색. 버튼은 둥근 outline pill 형태로 progressLabel과 톤을 맞춘다.

- [ ] **Step 4: 다른 호출부 회귀 확인**

```bash
grep -n "DiagnosisDarkHeader" features/quiz/exam/screens/*.tsx app/**/*.tsx 2>/dev/null
```

호출부 모두에서 새 props를 넘기지 않더라도 동작이 같아야 함 (default false → 미표시).

```bash
npm run typecheck
npm run lint
```

Expected: 오류 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/components/diagnosis-dark-header.tsx
git commit -m "feat(diagnosis-header): add optional original-strokes toggle button slot"
```

---

## Task 5: `exam-diagnosis-session-screen`에 통합

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

**의도:** 활성 문제 번호 기준으로 strokes를 조회 → 헤더에 토글 props 전달, 시트 visible state 관리, 활성 문제가 바뀌면 시트 자동 닫기. iPad 분기와 iPhone 분기 모두 동일 처리.

- [ ] **Step 1: import 및 state 추가**

파일 상단 import에 추가:

```ts
import { useEffect, useState } from 'react';
// ...

import { OriginalStrokesSheet } from '@/features/quiz/exam/components/original-strokes-sheet';
import { useProblemStrokes } from '@/features/quiz/exam/hooks/use-problem-strokes';
```

(`useEffect`는 기존에 import되어 있지 않다면 같이 추가, 이미 있으면 `useState`만 보강)

`ExamDiagnosisSessionScreen` 함수 본문 안, 기존 `const session = useExamDiagnosisSession({...})` 다음에 추가:

```ts
  const activeProblemNumber = wrongProblemNumbers[session.activeProblemIndex] ?? 0;
  const { strokes, loaded: strokesLoaded, hasStrokes } = useProblemStrokes(
    examId,
    activeProblemNumber,
  );

  const [strokesSheetVisible, setStrokesSheetVisible] = useState(false);

  // Active problem changes → close sheet so the user doesn't see strokes from a
  // problem they've already navigated away from.
  useEffect(() => {
    setStrokesSheetVisible(false);
  }, [session.activeProblemIndex]);
```

- [ ] **Step 2: iPad 분기 (`if (isTablet)`) 헤더와 시트 렌더 갱신**

기존 iPad 분기에서 `<DiagnosisDarkHeader ... />` 렌더 시 props 보강:

```tsx
        <DiagnosisDarkHeader
          title={`${activeProblemNumber ?? ''}번`}
          backLabel="← 채점 결과"
          progressLabel={session.progressLabel}
          progressPercent={session.progressPercent}
          totalCount={wrongProblemNumbers.length}
          completedIndices={session.diagnosedIndices}
          activeIndex={session.activeProblemIndex}
          onBack={session.onBackToResult}
          onDotPress={session.onDotPress}
          showOriginalStrokesButton={hasStrokes}
          onPressOriginalStrokes={() => setStrokesSheetVisible(true)}
        />
```

같은 분기의 `</View>` 닫기 직전에 시트 렌더 추가:

```tsx
        <OriginalStrokesSheet
          visible={strokesSheetVisible}
          strokes={strokes}
          loaded={strokesLoaded}
          onClose={() => setStrokesSheetVisible(false)}
        />
      </View>
    );
  }
```

- [ ] **Step 3: iPhone 분기에도 동일 적용**

기본 (iPhone) 반환 블록의 `<DiagnosisDarkHeader>` 호출도 같은 두 props 추가:

```tsx
      <DiagnosisDarkHeader
        title={`${wrongProblemNumbers[session.activeProblemIndex] ?? ''}번`}
        backLabel="← 채점 결과"
        progressLabel={session.progressLabel}
        progressPercent={session.progressPercent}
        totalCount={wrongProblemNumbers.length}
        completedIndices={session.diagnosedIndices}
        activeIndex={session.activeProblemIndex}
        onBack={session.onBackToResult}
        onDotPress={session.onDotPress}
        showOriginalStrokesButton={hasStrokes}
        onPressOriginalStrokes={() => setStrokesSheetVisible(true)}
      />
```

같은 반환 블록의 `<FlatList ... />` 직후, 가장 바깥 `</View>` 직전에 시트 렌더 추가:

```tsx
      <OriginalStrokesSheet
        visible={strokesSheetVisible}
        strokes={strokes}
        loaded={strokesLoaded}
        onClose={() => setStrokesSheetVisible(false)}
      />
    </View>
  );
}
```

- [ ] **Step 4: typecheck / lint**

```bash
npm run typecheck
npm run lint
```

Expected: 오류 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(diagnosis): show original strokes via half-sheet in diagnosis screen"
```

---

## Task 6: 시뮬레이터 수동 검증 + 최종 확인

**Files:** (변경 없음, 검증만)

새 네이티브 모듈을 추가하지 않았으므로 prebuild 불필요.

- [ ] **Step 1: 풀 빌드 검증 명령**

```bash
npm run typecheck
npm run lint
npm test
```

Expected: 모두 통과.

- [ ] **Step 2: iPad 시뮬레이터 시나리오 점검**

```bash
npx expo run:ios --device "iPad mini (A17 Pro)"
```

(또는 Xcode에 등록된 다른 iPad 시뮬레이터)

다음 시나리오를 차례로 확인:

| # | 동작 | 기대 |
|---|---|---|
| 1 | iPad를 가로로 회전 → exam-solve 진입 → 1번 문제에 손으로 풀이 그림 → 시험 제출 | 평소대로 동작, strokes 저장됨 |
| 2 | 결과 화면에서 "다시 풀어보기" → 약점 진단 진입 → 1번 활성 | 헤더 우측에 "당시 풀이" 버튼 노출 |
| 3 | "당시 풀이" 탭 | 시트가 아래에서 슬라이드 업 |
| 4 | 시트 안 캔버스 핀치 줌 | 확대됨 |
| 5 | 외부(어두운 backdrop) 탭 | 시트 닫힘 |
| 6 | 다시 열고 "닫기" 버튼 탭 | 시트 닫힘 |
| 7 | 시트 열린 상태에서 dot 탭으로 strokes 없는 다른 문제 이동 | 시트 자동 닫힘, 헤더 버튼 사라짐 |
| 8 | strokes 없는 문제로 이동한 상태 | 헤더 버튼 미표시 |

- [ ] **Step 3: iPhone 시뮬레이터 시나리오 점검**

```bash
npx expo run:ios --device "iPhone 16 Pro"
```

다음 확인:

| # | 동작 | 기대 |
|---|---|---|
| 1 | 같은 계정으로 로그인 → 약점 진단 진입 → iPad에서 그렸던 1번 문제 활성 | 헤더 "당시 풀이" 버튼 노출 |
| 2 | 시트 열기 → 핀치 줌 / 닫기 동작 | 정상 |
| 3 | strokes 없는 문제로 swipe | 시트 닫힘, 버튼 사라짐 |

- [ ] **Step 4: exam-solve 회귀 점검 (iPad 가로)**

| # | 동작 | 기대 |
|---|---|---|
| 1 | exam-solve 진입 → 그리기 / 지우기 / undo / redo / clear | 평소대로 |
| 2 | pencilOnly 토글 | 평소대로 |
| 3 | iPad 회전 (가로 ↔ 세로) | 캔버스 정상, in-flight stroke 안전 종료 |

- [ ] **Step 5: PROGRESS / 알림 갱신**

`docs/PROGRESS.md`의 `## 새 작업 로그` 섹션 끝에 1줄 추가:

```
- 2026-05-08: 약점 진단 화면에 원본 풀이 읽기 전용 half-sheet 도입 (스크래치패드 재사용, readOnly 모드 신설)
```

종료 알림:

```bash
npm run notify:done -- "약점 진단 화면 원본 풀이 표시 구현 완료"
```

- [ ] **Step 6: 최종 commit**

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): log diagnosis original-strokes sheet"
```

---

## Self-Review Notes

(plan 작성 후 작성자 자체 점검; 실행자는 본 섹션을 무시해도 됨)

**Spec coverage 점검 (각 항목 → 어느 task가 충족):**

| Spec 항목 | 구현 task |
|---|---|
| §4 신규 `original-strokes-sheet.tsx` | Task 3 |
| §4 신규 `use-problem-strokes.ts` | Task 1 |
| §4 수정 `scratchpad-canvas.tsx` (readOnly) | Task 2 |
| §4 수정 `diagnosis-dark-header.tsx` (토글 슬롯) | Task 4 |
| §4 수정 `exam-diagnosis-session-screen.tsx` (통합) | Task 5 |
| §5 storage 키 동일성 (마이그레이션 없음) | Task 1 — 기존 `loadScratchpad` 그대로 사용 |
| §5 좌표 정규화 미적용 (bounding box로 fit-to-width) | Task 3 — `computeBounds` |
| §6 시나리오 1~10 | Task 6 검증 시나리오 |
| §7 단위 테스트 (use-problem-strokes) | Task 1 |
| §7 회귀 테스트 (DiagnosisDarkHeader 다른 호출부) | Task 4 Step 4 |
| §7 빌드 검증 (typecheck/lint/test) | Task 6 Step 1 |
| §8 R1 (작은 strokes) — pinch-zoom 보완 | Task 3 ScrollView `maximumZoomScale=3` |
| §8 R2 (header props 호환) — optional default false | Task 4 |
| §8 R3 (시트 stale on swipe) — 활성 문제 변경 시 visible reset | Task 5 useEffect |
| §8 R4 (readOnly gesture 가드) — GestureDetector 우회 | Task 2 |
| §8 R5 (zoom × sheet drag 충돌) | Task 3 — 시트 자체에 drag 없음, ScrollView zoom만 사용 |

**비목표 준수:** §10에 명시된 비목표 모두 plan에서 손대지 않음 (편집 기능, 복습 화면, 모의고사, 가로 unlock, 좌표 정규화, split layout 추출, exam-solve 동작 변경).

**Spec 대비 의도적 단순화:**
- Spec §6 시나리오 5 ("핸들 위로 드래그 시트 더 펼침") → MVP에선 고정 60% 높이로 단순화. 이유: 드래그 resize는 Reanimated worklet + PanGesture + snap point 로직이 필요해 작업량 큰 반면, 핀치 줌으로 가독성 보완 가능. 사용자 피드백이 필요해지면 §9 향후 작업으로 추가 spec.
- Spec §6 시나리오 6 ("핸들 아래로 드래그") → MVP에선 X 버튼 + backdrop 탭으로 대체. 슬라이드 다운 애니메이션은 Modal이 자동 처리.

위 두 항목은 spec의 "결정 사항 요약(§2)"에는 포함되지 않은 시나리오 디테일이며, 핵심 결정(half-sheet, 50%, 슬라이드 업, 닫기 가능)을 모두 만족한다. 실행 시점에 사용자에게 한 번 더 확인 후 진행 권장.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-diagnosis-original-strokes.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — task별로 fresh subagent dispatch + 두 단계 review

**2. Inline Execution** — 본 세션에서 executing-plans skill로 task 단위 batch 실행 + 중간 checkpoint

**Which approach?**
