# iPad 세로 모드 학습 여정 보드 한 화면 표시 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPad 세로 모드에서 학습 여정 보드 4개 STEP과 말풍선이 스크롤 없이 한 화면에 모두 보이도록 한다. 폰 동작은 무변경.

**Architecture:** `JourneyBoard`의 너비 계산을 순수 함수로 추출하여 단위 테스트로 검증한다. 그 함수는 `screenWidth` 기반 상한과 `availableHeight` 기반 상한을 결합한다 (iPad에만 height 제약 적용). `quiz-hub-screen-view.tsx`는 이미 측정 중인 `heroLayoutBottom`과 `useWindowDimensions().height`로 `availableHeight`를 산출해 prop으로 전달한다.

**Tech Stack:** React Native (Expo SDK), TypeScript, Jest + jest-expo preset

**Spec:** [`docs/superpowers/specs/2026-05-07-ipad-portrait-journey-board-fit-design.md`](../specs/2026-05-07-ipad-portrait-journey-board-fit-design.md)

---

## 파일 구조

**Create:**
- `features/quiz/components/journey-board-layout.ts` — 순수 너비 계산 함수 + 상수
- `features/quiz/components/journey-board-layout.test.ts` — 위 함수 단위 테스트

**Modify:**
- `features/quiz/components/journey-board.tsx` — 인라인 계산을 순수 함수 호출로 치환, `availableHeight` prop 추가
- `features/quiz/components/quiz-hub-screen-view.tsx` — `boardAvailableHeight` 계산해서 `<JourneyBoard>`에 전달

---

## Task 1: `calcJourneyBoardWidth` 순수 함수 + 테스트

**Why first:** 코어 로직을 React Native 런타임 없이 검증한다. 값 계산이 정확해야 모든 iPad 모델에서 보드가 한 화면에 들어온다.

**Files:**
- Create: `features/quiz/components/journey-board-layout.ts`
- Create: `features/quiz/components/journey-board-layout.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/quiz/components/journey-board-layout.test.ts`:

```ts
import {
  BOARD_MARGIN_TOP,
  BUBBLE_OVERFLOW_RESERVE,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  calcJourneyBoardWidth,
} from './journey-board-layout';

const VIEWBOX_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

describe('calcJourneyBoardWidth', () => {
  describe('phone (isTablet=false)', () => {
    it('non-compact 폰은 maxWidth 470과 (screenWidth - 28) 중 작은 값', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 393,
        availableHeight: 500,
        isTablet: false,
        isCompactLayout: false,
      });
      expect(result).toBe(Math.min(393 - 28, 470)); // 365
    });

    it('compact 폰은 maxWidth 430을 적용', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 375,
        availableHeight: 500,
        isTablet: false,
        isCompactLayout: true,
      });
      expect(result).toBe(Math.min(375 - 28, 430)); // 347
    });

    it('폰은 availableHeight를 무시한다 (높이 제약 없음)', () => {
      const tiny = calcJourneyBoardWidth({
        screenWidth: 393,
        availableHeight: 100,
        isTablet: false,
        isCompactLayout: false,
      });
      const huge = calcJourneyBoardWidth({
        screenWidth: 393,
        availableHeight: 9999,
        isTablet: false,
        isCompactLayout: false,
      });
      expect(tiny).toBe(huge);
    });
  });

  describe('tablet (isTablet=true)', () => {
    it('availableHeight가 충분하면 width 기반 상한 사용 (iPad Pro 12.9 portrait)', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 1024,
        availableHeight: 9999,
        isTablet: true,
        isCompactLayout: false,
      });
      // widthBasedMax = min(1024 * 0.7, 640) = 640
      expect(result).toBe(Math.min(1024 - 28, 640)); // 640
    });

    it('availableHeight가 작으면 height 기반 상한으로 줄어든다 (iPad mini 6 portrait)', () => {
      const screenWidth = 744;
      const availableHeight = 600;
      const result = calcJourneyBoardWidth({
        screenWidth,
        availableHeight,
        isTablet: true,
        isCompactLayout: false,
      });
      const heightBasedMax =
        (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO;
      const widthBasedMax = Math.min(screenWidth * 0.7, 640);
      const expected = Math.min(screenWidth - 28, widthBasedMax, heightBasedMax);
      expect(result).toBeCloseTo(expected, 4);
    });

    it('availableHeight === 0 (첫 렌더, 측정 전)이면 width 기반 상한만 사용', () => {
      const screenWidth = 744;
      const result = calcJourneyBoardWidth({
        screenWidth,
        availableHeight: 0,
        isTablet: true,
        isCompactLayout: false,
      });
      const widthBasedMax = Math.min(screenWidth * 0.7, 640);
      expect(result).toBe(Math.min(screenWidth - 28, widthBasedMax));
    });

    it('availableHeight가 오버헤드(76)보다 작으면 0으로 클램프', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 744,
        availableHeight: 50,
        isTablet: true,
        isCompactLayout: false,
      });
      expect(result).toBe(0);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/quiz/components/journey-board-layout.test.ts
```

기대: 모듈을 찾을 수 없다는 에러로 실패.

- [ ] **Step 3: 최소 구현 작성**

`features/quiz/components/journey-board-layout.ts`:

```ts
export const VIEWBOX_WIDTH = 768;
export const VIEWBOX_HEIGHT = 960;
export const BOARD_CONTAINER_PADDING = 28;
export const BOARD_MARGIN_TOP = 52;
export const BUBBLE_OVERFLOW_RESERVE = 24;

const VIEWBOX_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

type CalcJourneyBoardWidthInput = {
  screenWidth: number;
  availableHeight: number;
  isTablet: boolean;
  isCompactLayout: boolean;
};

/**
 * 학습 여정 보드의 실제 렌더 너비를 계산한다.
 * - 폰: width 기반 상한만 사용
 * - 태블릿: width + height 기반 상한 모두 적용 (Math.min)
 * - availableHeight === 0 (첫 렌더, heroLayoutBottom 측정 전)이면 width-only로 동작
 */
export function calcJourneyBoardWidth({
  screenWidth,
  availableHeight,
  isTablet,
  isCompactLayout,
}: CalcJourneyBoardWidthInput): number {
  const widthBasedMax = isTablet
    ? Math.min(screenWidth * 0.7, 640)
    : isCompactLayout
      ? 430
      : 470;

  const heightBasedMax =
    isTablet && availableHeight > 0
      ? Math.max(
          0,
          (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO,
        )
      : Number.POSITIVE_INFINITY;

  const boardMaxWidth = Math.min(widthBasedMax, heightBasedMax);
  return Math.min(screenWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/components/journey-board-layout.test.ts
```

기대: 7 passed.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/journey-board-layout.ts features/quiz/components/journey-board-layout.test.ts
git commit -m "feat(quiz): add calcJourneyBoardWidth pure helper with height-based cap

iPad 세로 모드에서 보드가 가용 높이를 초과하지 않도록 width/height
상한을 결합한 순수 함수를 추가한다. 폰에서는 height 제약을 무시한다."
```

---

## Task 2: `JourneyBoard`가 순수 함수와 `availableHeight` prop 사용

**Why next:** 순수 함수를 컴포넌트에 연결한다. 호출자(`quiz-hub-screen-view`) 변경 전에 `JourneyBoard`가 새 prop을 안전하게 받도록 한다.

**Files:**
- Modify: `features/quiz/components/journey-board.tsx`

- [ ] **Step 1: import 정리 및 인라인 상수 제거**

`features/quiz/components/journey-board.tsx` 상단의 imports 변경:

기존:
```ts
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';
```

다음 줄(`import type { ... }` 위)에 추가:
```ts
import {
  BOARD_CONTAINER_PADDING,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  calcJourneyBoardWidth,
} from '@/features/quiz/components/journey-board-layout';
```

기존 파일 상단의 인라인 상수 3개 제거:
```ts
const VIEWBOX_Y = 280;
const VIEWBOX_WIDTH = 768;        // ← 제거 (layout 모듈로 이동됨)
const VIEWBOX_HEIGHT = 960;       // ← 제거 (layout 모듈로 이동됨)
const JOURNEY_DASH_PATTERN = '20 18';
```

그리고 함수 직전의 인라인 상수도 제거:
```ts
// posterScreen paddingHorizontal(14) × 2
const BOARD_CONTAINER_PADDING = 28;  // ← 제거 (layout 모듈로 이동됨)
// 화면에서 실제로 보이기를 원하는 목표 px 크기
const TARGET_STEP_TITLE_PX = 16;
const TARGET_STATUS_PX = 14;
```

- [ ] **Step 2: 컴포넌트 시그니처에 `availableHeight` 추가**

기존 `export function JourneyBoard({ isCompactLayout, onPressCurrentStep, state })` 부분을 다음으로 교체:

```ts
export function JourneyBoard({
  availableHeight,
  isCompactLayout,
  onPressCurrentStep,
  state,
}: {
  availableHeight: number;
  isCompactLayout: boolean;
  onPressCurrentStep: () => void;
  state: HomeJourneyState;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const boardWidth = calcJourneyBoardWidth({
    screenWidth,
    availableHeight,
    isTablet,
    isCompactLayout,
  });
  const stepTitleFontSize = calcSvgFontSize(TARGET_STEP_TITLE_PX, boardWidth);
  const statusFontSize = calcSvgFontSize(TARGET_STATUS_PX, boardWidth);
```

기존의 `boardMaxWidth` / `boardWidth` 두 줄 계산은 위의 단일 `boardWidth = calcJourneyBoardWidth(...)`로 대체된다.

- [ ] **Step 3: 보드 컨테이너 스타일에서 `boardMaxWidth` 사용 부분 정리**

기존:
```tsx
<View style={[styles.board, isCompactLayout && styles.boardCompact, { maxWidth: boardMaxWidth }]}>
```

다음으로 교체 (이제 `boardWidth`가 직접 너비이므로 `width`로 지정):
```tsx
<View style={[styles.board, isCompactLayout && styles.boardCompact, { width: boardWidth, maxWidth: boardWidth }]}>
```

이유: 기존에는 `width: '100%'` + `maxWidth: boardMaxWidth` 조합이었다. height 제약으로 보드가 작아질 때 `width: '100%'`이 부모 컨테이너 폭을 따라가서 의도한 것보다 커질 수 있으므로 명시적으로 `width: boardWidth`를 적용한다.

- [ ] **Step 4: TypeScript / ESLint 검사**

```bash
npx tsc --noEmit -p tsconfig.json
```

기대: `JourneyBoard`를 호출하는 곳(`quiz-hub-screen-view.tsx`)에서 `availableHeight`가 누락되었다는 에러. (이건 Task 3에서 해결됨, 일단 확인용)

- [ ] **Step 5: 단위 테스트 재실행 (영향 없음 확인)**

```bash
npx jest features/quiz/components/journey-board-layout.test.ts
```

기대: 여전히 7 passed.

- [ ] **Step 6: 커밋 (Task 3 변경 포함해서 한 번에 하면 더 깔끔하므로 일단 보류)**

다음 단계(Task 3)에서 `quiz-hub-screen-view.tsx`까지 묶어 한 커밋으로 푸시한다.

---

## Task 3: `quiz-hub-screen-view.tsx`에서 `boardAvailableHeight` 계산

**Why next:** Task 2에서 추가한 새 prop을 호출자가 채운다. `heroLayoutBottom`(이미 있음) + `screenHeight` + CTA 추정값을 결합한다.

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: `useWindowDimensions` import 추가 및 `screenHeight` 사용**

파일 상단의 React Native import 라인 (현재):
```ts
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
```

다음으로 변경:
```ts
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
```

- [ ] **Step 2: `boardAvailableHeight` 계산 로직 추가**

`QuizHubScreenView` 함수 본문 안, 기존 `const bottomPadding` 라인(116번째 줄 부근) 다음에 추가. 위치는 `scrollTopPadding` 정의 직후가 자연스럽다 (즉 기존 129번째 줄 다음).

기존 (앞뒤 컨텍스트):
```ts
  const scrollTopPadding = showJourneyHero
    ? 14
    : (isCompactLayout ? 14 : 24);

  if (!isReady) {
```

다음으로 교체:
```ts
  const scrollTopPadding = showJourneyHero
    ? 14
    : (isCompactLayout ? 14 : 24);

  // CTA 버튼은 SVG 이미지 비율(1497:373)을 따른다. 70% × screenWidth 또는 maxWidth(폰 340/태블릿 480) 중 작은 값.
  // 보드의 가용 높이를 산출할 때 이 추정 높이만큼을 미리 빼둔다.
  const ctaButtonAspectRatio = 1497 / 373;
  const ctaButtonMaxWidth = isTablet ? 480 : 340;
  const ctaButtonRenderedWidth = Math.min(screenWidth * 0.7, ctaButtonMaxWidth);
  const ctaButtonEstimatedHeight = ctaButtonRenderedWidth / ctaButtonAspectRatio;
  const ctaFooterHeight =
    showJourneyBoard
      ? 4 /* paddingTop */ + ctaButtonEstimatedHeight + insets.bottom + (isCompactLayout ? 24 : 28)
      : 0;

  // ScrollView가 보드에 줄 수 있는 세로 공간. heroLayoutBottom이 0(첫 렌더)이면 0으로 떨어지고,
  // JourneyBoard 내부에서 width-only 분기로 동작한다 (onLayout 후 한 번 더 렌더되며 정상화).
  const boardAvailableHeight = Math.max(
    0,
    screenHeight - heroLayoutBottom - ctaFooterHeight - scrollTopPadding - bottomPadding,
  );

  if (!isReady) {
```

- [ ] **Step 3: `screenWidth`, `screenHeight` 변수 선언**

`QuizHubScreenView` 본문 시작 부분의 `const isTablet = useIsTablet();` 직전에 다음을 추가:

기존:
```ts
}: UseQuizHubScreenResult) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const [heroLayoutBottom, setHeroLayoutBottom] = useState(0);
```

다음으로 교체:
```ts
}: UseQuizHubScreenResult) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const [heroLayoutBottom, setHeroLayoutBottom] = useState(0);
```

- [ ] **Step 4: `<JourneyBoard>`에 `availableHeight` prop 전달**

기존 (대략 209번째 줄):
```tsx
{showJourneyBoard ? (
  <JourneyBoard
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    state={journey}
  />
) : null}
```

다음으로 교체 (두 곳 모두 — 200번대와 220번대 부근에서 같은 형태로 등장하지 않는다면, `showJourneyBoard` 분기에서만 등장):

```tsx
{showJourneyBoard ? (
  <JourneyBoard
    availableHeight={boardAvailableHeight}
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    state={journey}
  />
) : null}
```

- [ ] **Step 5: TypeScript 검사**

```bash
npx tsc --noEmit -p tsconfig.json
```

기대: 에러 없음. (Task 2에서 발생했던 `availableHeight` 누락 에러가 해소됨)

- [ ] **Step 6: 전체 단위 테스트 실행**

```bash
npx jest --testPathPattern="features/quiz"
```

기대: 모든 quiz 관련 테스트 통과.

- [ ] **Step 7: 커밋 (Task 2 + Task 3 묶어서)**

```bash
git add features/quiz/components/journey-board.tsx features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(ipad): cap journey board size by available viewport height

JourneyBoard가 가용 높이를 prop으로 받아 width/height 상한을 결합해
실제 너비를 결정하도록 한다. quiz-hub-screen-view에서 heroLayoutBottom과
screenHeight, CTA 추정 높이로 가용 높이를 산출해 전달한다. iPad에만
height 제약이 적용되며, 폰 동작은 무변경."
```

---

## Task 4: 시뮬레이터 수동 검증

**Why:** 단위 테스트는 계산 로직만 검증한다. 실제 SVG 렌더, 말풍선 클리핑, 안전 영역 처리는 시뮬레이터로 확인해야 한다.

- [ ] **Step 1: iOS 시뮬레이터 빌드**

CLAUDE.md 규칙대로 prebuild + run:

```bash
npx expo prebuild --clean
npx expo run:ios
```

(패키지 변경이 없으면 prebuild는 생략 가능. 의심 시 실행.)

- [ ] **Step 2: iPad mini 6 portrait 검증**

시뮬레이터 → Device → iPad mini (6th gen) → portrait.
앱에서 학습 여정 화면(첫 진단 시작 전 상태)으로 이동.

기대:
- STEP 1~4가 모두 한 화면에 보임 (스크롤 불필요)
- 캐릭터 말풍선 "반가워요! 첫 진단 시작할게요"가 잘리지 않고 완전히 보임
- 하단 "첫 진단 시작하기" 버튼이 안전 영역 안에 자리잡음

- [ ] **Step 3: iPad Air portrait 검증**

시뮬레이터 → Device → iPad Air (11-inch) → portrait. 위와 동일하게 확인.

- [ ] **Step 4: iPad Pro 12.9" portrait 검증**

시뮬레이터 → Device → iPad Pro 12.9-inch → portrait. 보드 너비가 640pt 상한에 도달해 변경 전과 시각적으로 동일해야 함을 확인 (큰 iPad는 높이 여유가 있음).

- [ ] **Step 5: iPhone 15 Pro 검증 (회귀 확인)**

시뮬레이터 → Device → iPhone 15 Pro → portrait. 폰 레이아웃이 변경 이전과 완전히 동일한지 확인.

- [ ] **Step 6: iPad 가로 모드 검증**

iPad mini 6 → landscape. 보드가 세로 공간에 맞춰 자연스럽게 줄어들고 한 화면에 들어오는지 확인.

- [ ] **Step 7: 다른 STEP에서의 말풍선 위치 확인**

진단 완료 → 분석 단계, 분석 완료 → 복습 단계, 복습 완료 → 모의고사 단계로 진행하면서 각 STEP의 말풍선이 보드 안에서 정상 표시되는지 확인. (각 STEP의 `bubbleStyle.top`은 -14% / 11% / 35.5% / 42.5%로 다양)

- [ ] **Step 8: 검증 실패 시 BUBBLE_OVERFLOW_RESERVE 미세 조정**

만약 어떤 모델에서 말풍선이 살짝 잘리면, `journey-board-layout.ts`의 `BUBBLE_OVERFLOW_RESERVE`를 24 → 32 → 40으로 단계적으로 키워서 재검증한다. (보드가 그만큼 작아지므로 너무 키우진 않는다.)

조정 후 commit:
```bash
git add features/quiz/components/journey-board-layout.ts
git commit -m "fix(ipad): tune BUBBLE_OVERFLOW_RESERVE for clipping on <model>"
```

- [ ] **Step 9: 푸시 및 로그**

```bash
git push origin claude/amazing-booth-42d633
npm run log:commit
```

---

## Self-review (작성자가 작업 완료 후 확인)

스펙의 다음 요건이 모두 태스크로 커버되는지 확인:

- [x] iPad 세로 모드 모든 모델에서 4 STEP 한 화면 표시 → Task 4 (Step 2~4)
- [x] 말풍선 클리핑 해결 → Task 1 (BUBBLE_OVERFLOW_RESERVE), Task 4 (Step 7)
- [x] 폰 레이아웃 무변경 → Task 1 (테스트 3개), Task 4 (Step 5)
- [x] iPad 가로 모드 / split view 자연 대응 → Task 4 (Step 6), Task 1 테스트 (clamp to 0)
- [x] 첫 렌더 깜빡임 (heroLayoutBottom=0) 처리 → Task 1 (availableHeight=0 테스트), Task 3 Step 2 주석

전체 변경 파일 4개 (신규 2 + 수정 2), 모든 변경은 UI 한정. 데이터/네트워크/저장소 영향 없음.
