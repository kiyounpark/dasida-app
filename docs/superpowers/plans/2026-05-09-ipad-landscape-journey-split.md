# iPad 가로 학습 여정 좌우 분할 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPad/Android 태블릿 가로 모드에서 학습 여정 화면을 좌(여정보드) / 우(STEP 카드 + 분석 재개 + CTA) 분할 레이아웃으로 전환. 폰은 변경 없음.

**Architecture:** `quiz-hub-screen-view.tsx`에서 `useIsTablet()` 분기 추가. 태블릿 분기는 새 컨테이너 컴포넌트(`JourneyHubSplitLayout`)와 우측 패널 컴포넌트(`JourneyHubRightPanel`), 적응형 STEP 카드(`StepDetailCard`)로 구성. 보드는 portrait 비율(768:960) 그대로, height-based 제약을 좌측 컬럼 폭 기준으로 재계산하도록 `journey-board-layout`에 `containerWidth` 옵션 추가.

**Tech Stack:** React Native, Expo, react-native-svg, expo-image, jest (테스트)

**Spec:** [docs/superpowers/specs/2026-05-09-ipad-landscape-journey-split-design.md](../specs/2026-05-09-ipad-landscape-journey-split-design.md)

---

## 파일 구조 (변경 / 신규)

**신규:**
- `features/quiz/components/journey-step-detail-copy.ts` — STEP별 카피 (제목/본문 rich·compact/메타 정보)
- `features/quiz/components/journey-step-detail-copy.test.ts` — 카피 테이블 테스트
- `features/quiz/components/step-detail-card.tsx` — 적응형 STEP 카드 컴포넌트
- `features/quiz/components/journey-hub-right-panel.tsx` — 우측 패널 (STEP 카드 + 분석재개 + CTA)
- `features/quiz/components/journey-hub-split-layout.tsx` — 좌우 분할 컨테이너 (포스터+보드 / 우측패널)

**수정:**
- `features/quiz/components/journey-board-layout.ts` — `containerWidth` 옵션 추가
- `features/quiz/components/journey-board-layout.test.ts` — 기존 깨진 테스트 수정 + 신규 옵션 테스트 추가
- `features/quiz/components/journey-board.tsx` — `containerWidth` prop pass-through
- `features/quiz/components/quiz-hub-screen-view.tsx` — 태블릿 분기 추가 (활성 여정 + 보드 표시 상태일 때만 split 적용)

**건드리지 않음:**
- `journey-board.tsx` 내부 SVG path / 노드 좌표 / `nodeRectStyle` (portrait 비율 유지)
- `use-quiz-hub-screen.ts` (gating 규칙 그대로)
- `home-weakness-section.tsx`, `review-home-card.tsx`, `no-review-day-card.tsx` (졸업 후 stack 경로에서 그대로 사용)
- 폰 portrait 렌더링 경로

---

## Task 1: STEP별 카피 데이터 + 테스트

**Files:**
- Create: `features/quiz/components/journey-step-detail-copy.ts`
- Test: `features/quiz/components/journey-step-detail-copy.test.ts`

- [ ] **Step 1.1: 실패하는 테스트 작성**

`features/quiz/components/journey-step-detail-copy.test.ts` 작성:

```ts
import {
  getJourneyStepDetailCopy,
  JOURNEY_STEP_KEYS,
} from './journey-step-detail-copy';

describe('journey-step-detail-copy', () => {
  it('JOURNEY_STEP_KEYS는 4개 키를 정확히 노출', () => {
    expect(JOURNEY_STEP_KEYS).toEqual(['diagnostic', 'analysis', 'review', 'exam']);
  });

  it.each(['diagnostic', 'analysis', 'review', 'exam'] as const)(
    '%s 키에 대한 카피가 정의되어 있음',
    (key) => {
      const copy = getJourneyStepDetailCopy(key);
      expect(copy).toBeDefined();
      expect(copy.label).toBe('지금 단계');
      expect(typeof copy.title).toBe('string');
      expect(copy.title.length).toBeGreaterThan(0);
      expect(typeof copy.bodyRich).toBe('string');
      expect(typeof copy.bodyCompact).toBe('string');
      expect(copy.bodyRich.length).toBeGreaterThan(copy.bodyCompact.length);
      expect(typeof copy.afterStepHint).toBe('string');
    },
  );

  it('STEP 1 (diagnostic)은 메타 정보 3종을 모두 가짐', () => {
    const copy = getJourneyStepDetailCopy('diagnostic');
    expect(copy.meta).toEqual({
      duration: '약 8분',
      difficulty: '기본',
      questionCount: '10문제',
    });
  });

  it('알 수 없는 키는 diagnostic으로 fallback', () => {
    // @ts-expect-error 의도적으로 잘못된 키 전달
    const copy = getJourneyStepDetailCopy('unknown');
    expect(copy.title).toBe(getJourneyStepDetailCopy('diagnostic').title);
  });
});
```

- [ ] **Step 1.2: 테스트 실행 — 실패 확인**

Run: `npx jest features/quiz/components/journey-step-detail-copy.test.ts`
Expected: FAIL ("Cannot find module './journey-step-detail-copy'")

- [ ] **Step 1.3: 카피 데이터 모듈 작성**

`features/quiz/components/journey-step-detail-copy.ts` 작성:

```ts
import type { JourneyStepKey } from '@/features/learning/home-journey-state';

export type JourneyStepDetailMeta = {
  duration: string;
  difficulty: string;
  questionCount: string;
};

export type JourneyStepDetailCopy = {
  label: string;
  title: string;
  bodyRich: string;
  bodyCompact: string;
  meta: JourneyStepDetailMeta;
  afterStepHint: string;
};

export const JOURNEY_STEP_KEYS = ['diagnostic', 'analysis', 'review', 'exam'] as const;

const COPY_TABLE: Record<JourneyStepKey, JourneyStepDetailCopy> = {
  diagnostic: {
    label: '지금 단계',
    title: 'STEP 1 — 10문제 빠른 진단',
    bodyRich:
      '짧고 가벼운 10문제로 너의 출발점을 잡아볼게.\n네가 어떤 영역에서 흔들리는지 보고, 거기서부터 너만의 여정이 시작돼.',
    bodyCompact: '짧고 가벼운 10문제로 너의 출발점을 잡아볼게.',
    meta: {
      duration: '약 8분',
      difficulty: '기본',
      questionCount: '10문제',
    },
    afterStepHint: '진단 후 → 오답 약점 분석 · 맞춤 복습 · 완벽 마스터로 이어져요.',
  },
  analysis: {
    label: '지금 단계',
    title: 'STEP 2 — 오답 약점 분석',
    bodyRich:
      '진단에서 놓친 문항을 함께 살펴보자.\n어디서 발이 걸렸는지 정리하면 다음 STEP이 가벼워져.',
    bodyCompact: '진단에서 놓친 문항을 함께 살펴보자.',
    meta: {
      duration: '문항당 약 1분',
      difficulty: '맞춤',
      questionCount: '진단 오답 수',
    },
    afterStepHint: '분석 후 → 맞춤 약점 복습으로 이어져요.',
  },
  review: {
    label: '지금 단계',
    title: 'STEP 3 — 맞춤 약점 복습',
    bodyRich:
      '너에게 잘 안 맞았던 영역만 골라서 다시.\n반복할수록 흔들림이 줄어드는 게 보일 거야.',
    bodyCompact: '너에게 잘 안 맞았던 영역만 골라서 다시.',
    meta: {
      duration: '세션당 약 6~10분',
      difficulty: '맞춤',
      questionCount: '약점 영역 6문제',
    },
    afterStepHint: '복습이 쌓이면 → 완벽 마스터로 진입.',
  },
  exam: {
    label: '지금 단계',
    title: 'STEP 4 — 완벽 마스터',
    bodyRich:
      '마지막 점검. 흔들림 없이 가보자.\n네가 만들어 온 여정의 마침표를 같이 찍을게.',
    bodyCompact: '마지막 점검. 흔들림 없이 가보자.',
    meta: {
      duration: '약 12분',
      difficulty: '실전',
      questionCount: '마스터 셋',
    },
    afterStepHint: '여기까지 오면 졸업이야. 끝까지 가보자.',
  },
};

export function getJourneyStepDetailCopy(stepKey: JourneyStepKey): JourneyStepDetailCopy {
  return COPY_TABLE[stepKey] ?? COPY_TABLE.diagnostic;
}
```

- [ ] **Step 1.4: 테스트 실행 — 통과 확인**

Run: `npx jest features/quiz/components/journey-step-detail-copy.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 1.5: Commit**

```bash
git add features/quiz/components/journey-step-detail-copy.ts features/quiz/components/journey-step-detail-copy.test.ts
git commit -m "feat(journey): STEP별 적응형 카피 테이블 추가"
```

---

## Task 2: 기존 깨진 journey-board-layout 테스트 수정 (사전 정비)

**Files:**
- Modify: `features/quiz/components/journey-board-layout.test.ts`

`features/quiz/components/journey-board-layout.ts`의 widthBasedMax 상한이 680인데 테스트 파일에는 640으로 적혀있어 현재 깨진 상태. 본격 개편 전에 정합부터 맞춘다.

- [ ] **Step 2.1: 현재 테스트 실행으로 깨진 상태 재현**

Run: `npx jest features/quiz/components/journey-board-layout.test.ts`
Expected: FAIL — "Expected 640 / Received 680"

- [ ] **Step 2.2: 테스트 파일에서 640 → 680 으로 정정**

`features/quiz/components/journey-board-layout.test.ts` line 58 부근:

```ts
// 변경 전
// widthBasedMax = min(1024 * 0.7, 640) = 640
expect(result).toBe(Math.min(1024 - 28, 640)); // 640
```

```ts
// 변경 후
// widthBasedMax = min(1024 * 0.7, 680) = 680
expect(result).toBe(Math.min(1024 - 28, 680)); // 680
```

같은 파일의 line 73과 line 86 부근도 동일하게 정정:

```ts
// line ~73 (이전: const widthBasedMax = Math.min(screenWidth * 0.7, 640);)
const widthBasedMax = Math.min(screenWidth * 0.7, 680);
```

```ts
// line ~86 (이전: const widthBasedMax = Math.min(screenWidth * 0.7, 640);)
const widthBasedMax = Math.min(screenWidth * 0.7, 680);
```

- [ ] **Step 2.3: 테스트 실행 — 통과 확인**

Run: `npx jest features/quiz/components/journey-board-layout.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 2.4: Commit**

```bash
git add features/quiz/components/journey-board-layout.test.ts
git commit -m "test(journey-board-layout): widthBasedMax 상한 640→680 정정"
```

---

## Task 3: journey-board-layout에 `containerWidth` 옵션 추가

**Files:**
- Modify: `features/quiz/components/journey-board-layout.ts`
- Modify: `features/quiz/components/journey-board-layout.test.ts`

**의도:** 태블릿 split layout에서는 보드의 폭을 "화면 width" 기준이 아니라 "좌측 컬럼 width" 기준으로 잡아야 한다. 기존 `screenWidth` 시그니처는 유지하되, optional `containerWidth` 가 들어오면 그것을 사용한다.

- [ ] **Step 3.1: 실패하는 테스트 추가**

`features/quiz/components/journey-board-layout.test.ts`의 `tablet` describe 블록 끝에 추가:

```ts
    it('containerWidth가 주어지면 screenWidth 대신 containerWidth로 폭 계산', () => {
      // iPad 11" 가로 (1194 width) 에서 좌측 컬럼이 640pt 일 때
      const result = calcJourneyBoardWidth({
        screenWidth: 1194,
        availableHeight: 9999,
        isTablet: true,
        isCompactLayout: false,
        containerWidth: 640,
      });
      // widthBasedMax = min(640 * 0.85, 680) = 544
      // padding 적용: min(640 - 28, 544) = 544
      expect(result).toBe(Math.min(640 - 28, Math.min(640 * 0.85, 680))); // 544
    });

    it('containerWidth가 주어지면 height 제약도 containerWidth 기준', () => {
      const containerWidth = 640;
      const availableHeight = 600;
      const result = calcJourneyBoardWidth({
        screenWidth: 1194,
        availableHeight,
        isTablet: true,
        isCompactLayout: false,
        containerWidth,
      });
      const widthBasedMax = Math.min(containerWidth * 0.85, 680);
      const heightBasedMax =
        (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO;
      const expected = Math.min(containerWidth - 28, widthBasedMax, heightBasedMax);
      expect(result).toBeCloseTo(expected, 4);
    });

    it('containerWidth 미지정 + isTablet=true 는 기존 screenWidth 동작 유지', () => {
      const screenWidth = 1024;
      const result = calcJourneyBoardWidth({
        screenWidth,
        availableHeight: 9999,
        isTablet: true,
        isCompactLayout: false,
      });
      expect(result).toBe(Math.min(screenWidth - 28, 680));
    });
```

- [ ] **Step 3.2: 테스트 실행 — 실패 확인**

Run: `npx jest features/quiz/components/journey-board-layout.test.ts`
Expected: FAIL — `containerWidth` 인자가 무시되어 잘못된 값

- [ ] **Step 3.3: `journey-board-layout.ts` 구현 변경**

`features/quiz/components/journey-board-layout.ts` 전체 교체:

```ts
export const VIEWBOX_WIDTH = 768;
export const VIEWBOX_HEIGHT = 960;
export const BOARD_CONTAINER_PADDING = 28;
export const BOARD_MARGIN_TOP = 52;
/** JourneyActiveBubble이 보드 위쪽으로 `top: -14%`만큼 튀어나오는 영역을 보호하기 위한 안전 마진. 줄이면 iPad 세로에서 말풍선 클리핑 위험. */
export const BUBBLE_OVERFLOW_RESERVE = 24;

const VIEWBOX_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

type CalcJourneyBoardWidthInput = {
  screenWidth: number;
  availableHeight: number;
  isTablet: boolean;
  isCompactLayout: boolean;
  /**
   * 태블릿 split layout 등에서 보드가 차지할 컨테이너 폭.
   * 지정 시 screenWidth 대신 이 값을 width 기준으로 사용.
   * 미지정 시 기존 동작 (screenWidth 기준).
   */
  containerWidth?: number;
};

/**
 * 학습 여정 보드의 실제 렌더 너비를 계산한다.
 * - 폰: width 기반 상한만 사용 (containerWidth 무시)
 * - 태블릿: containerWidth 우선, 없으면 screenWidth. height 기반 상한도 동일 컨테이너 기준
 * - availableHeight === 0 (첫 렌더, heroLayoutBottom 측정 전)이면 width-only로 동작
 */
export function calcJourneyBoardWidth({
  screenWidth,
  availableHeight,
  isTablet,
  isCompactLayout,
  containerWidth,
}: CalcJourneyBoardWidthInput): number {
  if (!isTablet) {
    const widthBasedMax = isCompactLayout ? 430 : 470;
    return Math.min(screenWidth - BOARD_CONTAINER_PADDING, widthBasedMax);
  }

  // 태블릿: containerWidth 가 있으면 그것을 우선 (split layout). 없으면 screenWidth.
  const referenceWidth = containerWidth ?? screenWidth;
  const widthRatio = containerWidth !== undefined ? 0.85 : 0.7;
  const widthBasedMax = Math.min(referenceWidth * widthRatio, 680);

  const heightBasedMax =
    availableHeight > 0
      ? Math.max(
          0,
          (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO,
        )
      : Number.POSITIVE_INFINITY;

  const boardMaxWidth = Math.min(widthBasedMax, heightBasedMax);
  return Math.min(referenceWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
}
```

- [ ] **Step 3.4: 테스트 실행 — 모든 테스트 통과 확인**

Run: `npx jest features/quiz/components/journey-board-layout.test.ts`
Expected: PASS (8 tests — 기존 5 + 새 3)

- [ ] **Step 3.5: Commit**

```bash
git add features/quiz/components/journey-board-layout.ts features/quiz/components/journey-board-layout.test.ts
git commit -m "feat(journey-board-layout): containerWidth 옵션 추가 (split layout 대비)"
```

---

## Task 4: `JourneyBoard` 컴포넌트가 `containerWidth` prop을 받도록 확장

**Files:**
- Modify: `features/quiz/components/journey-board.tsx`

- [ ] **Step 4.1: prop 추가 및 layout 함수에 전달**

`features/quiz/components/journey-board.tsx`의 `JourneyBoard` 컴포넌트 시그니처와 `calcJourneyBoardWidth` 호출 부분을 수정.

기존 (line 147~165):

```tsx
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
```

수정 후:

```tsx
export function JourneyBoard({
  availableHeight,
  containerWidth,
  isCompactLayout,
  onPressCurrentStep,
  state,
}: {
  availableHeight: number;
  /** 태블릿 split layout에서 보드가 차지할 컨테이너 폭. 미지정 시 screenWidth 사용. */
  containerWidth?: number;
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
    containerWidth,
  });
```

- [ ] **Step 4.2: 타입 체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: PASS (오류 없음 — 기존 호출처는 prop 미지정으로 동작 유지)

- [ ] **Step 4.3: 회귀 테스트 — 폰/태블릿 기존 경로 깨지지 않음**

Run: `npx jest features/quiz/components/journey-board-layout.test.ts`
Expected: PASS

- [ ] **Step 4.4: Commit**

```bash
git add features/quiz/components/journey-board.tsx
git commit -m "feat(journey-board): containerWidth prop pass-through"
```

---

## Task 5: `StepDetailCard` — 적응형 STEP 카드 컴포넌트

**Files:**
- Create: `features/quiz/components/step-detail-card.tsx`

**의도:** 우측 패널의 "지금 STEP 카드". `mode='rich'` 일 때 본문 2줄 + 메타 정보(시간/난이도/문항 수) + 진단 후 미리보기. `mode='compact'` 일 때 본문 1줄만.

- [ ] **Step 5.1: 컴포넌트 작성**

`features/quiz/components/step-detail-card.tsx` 작성:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { JourneyStepKey } from '@/features/learning/home-journey-state';
import { getJourneyStepDetailCopy } from '@/features/quiz/components/journey-step-detail-copy';

export type StepDetailCardMode = 'rich' | 'compact';

export function StepDetailCard({
  mode,
  stepKey,
}: {
  mode: StepDetailCardMode;
  stepKey: JourneyStepKey;
}) {
  const copy = getJourneyStepDetailCopy(stepKey);
  const isRich = mode === 'rich';

  return (
    <View style={[styles.card, isRich && styles.cardRich]}>
      <Text selectable style={styles.label}>
        {copy.label}
      </Text>
      <Text
        selectable
        style={[styles.title, isRich ? styles.titleRich : styles.titleCompact]}
        numberOfLines={2}>
        {copy.title}
      </Text>
      <Text selectable style={[styles.body, isRich ? styles.bodyRich : styles.bodyCompact]}>
        {isRich ? copy.bodyRich : copy.bodyCompact}
      </Text>

      {isRich ? (
        <>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>예상 시간</Text>
              <Text selectable style={styles.metaValue}>{copy.meta.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>난이도</Text>
              <Text selectable style={styles.metaValue}>{copy.meta.difficulty}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>문항 수</Text>
              <Text selectable style={styles.metaValue}>{copy.meta.questionCount}</Text>
            </View>
          </View>
          <Text selectable style={styles.afterHint}>
            {copy.afterStepHint}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    borderRadius: 14,
    padding: 14,
  },
  cardRich: {
    padding: 18,
    boxShadow: '0 8px 16px rgba(28, 44, 25, 0.04)',
  },
  label: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: '#999999',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.primaryDark,
    marginTop: 4,
  },
  titleRich: {
    fontSize: 18,
    lineHeight: 24,
  },
  titleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  body: {
    fontFamily: FontFamilies.regular,
    color: BrandColors.mutedText,
    marginTop: 6,
  },
  bodyRich: {
    fontSize: 13,
    lineHeight: 20,
  },
  bodyCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 219, 200, 1)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    gap: 18,
  },
  metaItem: {
    minWidth: 60,
  },
  metaLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 0.3,
    color: '#AAAAAA',
  },
  metaValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.text,
    marginTop: 2,
  },
  afterHint: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 219, 200, 1)',
    borderStyle: 'dashed',
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 17,
    color: '#888888',
  },
});
```

- [ ] **Step 5.2: 타입 체크 + import 확인**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5.3: Commit**

```bash
git add features/quiz/components/step-detail-card.tsx
git commit -m "feat(journey): StepDetailCard 적응형 카드 컴포넌트 추가"
```

---

## Task 6: `JourneyHubRightPanel` — 우측 패널 컴포넌트

**Files:**
- Create: `features/quiz/components/journey-hub-right-panel.tsx`

**의도:** STEP 카드 + (조건부) 분석 재개 카루셀 + (하단 고정) CTA 를 묶은 우측 패널. 본문 영역은 ScrollView, CTA 는 ScrollView 바깥 footer.

- [ ] **Step 6.1: 컴포넌트 작성**

`features/quiz/components/journey-hub-right-panel.tsx` 작성:

```tsx
import { ScrollView, StyleSheet, View } from 'react-native';

import { JourneyCtaButton } from '@/features/quiz/components/journey-cta-button';
import { StepDetailCard } from '@/features/quiz/components/step-detail-card';
import {
  ExamAnalysisResumeCarousel,
  type ExamAnalysisResumeCarouselItem,
} from '@/features/quiz/exam/components/exam-analysis-resume-carousel';
import type { JourneyStepKey } from '@/features/learning/home-journey-state';

export function JourneyHubRightPanel({
  analysisResumeItems,
  ctaLabel,
  isCompactLayout,
  onPressCta,
  onResumeAnalysis,
  showAnalysisResume,
  stepKey,
}: {
  analysisResumeItems: ExamAnalysisResumeCarouselItem[];
  ctaLabel: string;
  isCompactLayout: boolean;
  onPressCta: () => void;
  onResumeAnalysis: (attemptId: string) => void;
  showAnalysisResume: boolean;
  stepKey: JourneyStepKey;
}) {
  // 분석 재개 카루셀이 등장하면 STEP 카드는 compact, 아니면 rich.
  const stepCardMode = showAnalysisResume ? 'compact' : 'rich';

  return (
    <View style={styles.panel}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <StepDetailCard mode={stepCardMode} stepKey={stepKey} />
        {showAnalysisResume && analysisResumeItems.length > 0 ? (
          <ExamAnalysisResumeCarousel
            items={analysisResumeItems}
            onPressItem={onResumeAnalysis}
          />
        ) : null}
      </ScrollView>
      <View style={styles.ctaFooter}>
        <JourneyCtaButton
          compact={isCompactLayout}
          label={ctaLabel}
          onPress={onPressCta}
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  ctaFooter: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    maxWidth: 480,
  },
});
```

- [ ] **Step 6.2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6.3: Commit**

```bash
git add features/quiz/components/journey-hub-right-panel.tsx
git commit -m "feat(journey): JourneyHubRightPanel 우측 패널 컴포넌트 추가"
```

---

## Task 7: `JourneyHubSplitLayout` — 좌우 분할 컨테이너

**Files:**
- Create: `features/quiz/components/journey-hub-split-layout.tsx`

**의도:** 좌(포스터 배너 + 여정보드, flex 1.3) / 우(우측 패널, flex 1) 분할. 좌측 컨테이너의 onLayout으로 측정한 width 를 보드의 `containerWidth` 로 전달.

- [ ] **Step 7.1: 컴포넌트 작성**

`features/quiz/components/journey-hub-split-layout.tsx` 작성:

```tsx
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';

export function JourneyHubSplitLayout({
  authNotice,
  leftBoard,
  posterBanner,
  rightPanel,
}: {
  authNotice: ReactNode | null;
  /** (containerWidth: number) => ReactNode — 좌측 컬럼 폭이 측정된 후 보드를 렌더 */
  leftBoard: (containerWidth: number) => ReactNode;
  posterBanner: ReactNode;
  rightPanel: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [leftColumnWidth, setLeftColumnWidth] = useState(0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.row}>
        <View
          style={styles.leftColumn}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0 && width !== leftColumnWidth) {
              setLeftColumnWidth(width);
            }
          }}>
          <View style={styles.posterWrap}>{posterBanner}</View>
          {authNotice ? <View style={styles.authNoticeWrap}>{authNotice}</View> : null}
          <View style={styles.boardWrap}>
            {leftColumnWidth > 0 ? leftBoard(leftColumnWidth) : null}
          </View>
        </View>
        <View style={styles.rightColumn}>{rightPanel}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
    paddingHorizontal: 24,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
  },
  leftColumn: {
    flex: 1.3,
    alignItems: 'center',
  },
  posterWrap: {
    width: '100%',
    alignItems: 'center',
  },
  authNoticeWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  boardWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  rightColumn: {
    flex: 1,
    paddingTop: 6,
  },
});
```

- [ ] **Step 7.2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7.3: Commit**

```bash
git add features/quiz/components/journey-hub-split-layout.tsx
git commit -m "feat(journey): JourneyHubSplitLayout 좌우 분할 컨테이너 추가"
```

---

## Task 8: `quiz-hub-screen-view`에서 태블릿 분기 + Split Layout 사용

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

**의도:** `useIsTablet()` 일 때 + 활성 여정(보드 표시 상태)일 때만 split layout 경로. 그 외(졸업 후, 로딩, 에러)는 기존 stack 경로 그대로.

- [ ] **Step 8.1: 새 컴포넌트 import 추가**

`features/quiz/components/quiz-hub-screen-view.tsx` 상단 import 블록에 추가:

```tsx
import { JourneyHubRightPanel } from '@/features/quiz/components/journey-hub-right-panel';
import { JourneyHubSplitLayout } from '@/features/quiz/components/journey-hub-split-layout';
```

- [ ] **Step 8.2: split layout 분기 함수 추가 (기존 코드 위에 신규 분기 삽입)**

`QuizHubScreenView` 함수 본문 안, `if (!isReady) {…}` 위에 다음을 추가하기 위해 분기 결정 변수를 미리 만든다.

`useState`/`useSafeAreaInsets`/`useWindowDimensions` 등 이미 선언된 hooks 아래(line 105 부근, `bottomPadding` 선언 아래)에 추가:

```tsx
  const useTabletSplitLayout =
    isTablet &&
    isReady &&
    !!profile &&
    !!homeState &&
    !!session &&
    !!journey &&
    showJourneyBoard;
```

- [ ] **Step 8.3: split layout 렌더 분기 추가**

기존 마지막 `return` (line 168 부근, `<View style={styles.screen}>` 시작) 직전에 다음을 삽입:

```tsx
  if (useTabletSplitLayout) {
    const analysisResumeItems = analysisState.isInProgress
      ? analysisState.items.map<ExamAnalysisResumeCarouselItem>((item) => ({
          attemptId: item.attemptId,
          examTitle: getExamTitle(item.examId),
          noteCount: item.noteCount,
          totalNotes: item.totalNotes,
        }))
      : [];

    return (
      <View style={styles.screen}>
        {showBrandHeader ? <BrandHeader compact /> : null}
        <JourneyHubSplitLayout
          posterBanner={
            <JourneyScreenHero isCompactLayout={isCompactLayout} isTablet={isTablet} />
          }
          authNotice={
            authNoticeMessage ? (
              <AuthNotice
                isCompactLayout={isCompactLayout}
                message={authNoticeMessage}
                onDismiss={onDismissAuthNotice}
              />
            ) : null
          }
          leftBoard={(containerWidth) => (
            <JourneyBoard
              availableHeight={0}
              containerWidth={containerWidth}
              isCompactLayout={isCompactLayout}
              onPressCurrentStep={onPressJourneyCta}
              state={journey}
            />
          )}
          rightPanel={
            <JourneyHubRightPanel
              analysisResumeItems={analysisResumeItems}
              ctaLabel={journey.ctaLabel}
              isCompactLayout={isCompactLayout}
              onPressCta={onPressJourneyCta}
              onResumeAnalysis={onResumeAnalysis}
              showAnalysisResume={showAnalysisResumeCard}
              stepKey={journey.currentStepKey}
            />
          }
        />
      </View>
    );
  }
```

**근거:**
- `availableHeight={0}` — split layout에서는 height 제약을 안 쓴다 (containerWidth 기반으로만 계산). `journey-board-layout.ts`에서 `availableHeight === 0` 일 때 width-only 모드로 동작.
- `journey.currentStepKey` 는 `HomeJourneyState` 의 필드. 기존 `JourneyActiveBubble` 가 동일 필드를 쓰는 것 확인됨 (journey-board.tsx line 200).
- `journey.ctaLabel` 도 기존 사용 (line 333 부근).

- [ ] **Step 8.4: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8.5: 단위 테스트 전체 실행 (회귀 확인)**

Run: `npx jest`
Expected: PASS (전부 통과 — 폰 경로 변경 없음)

- [ ] **Step 8.6: Commit**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(quiz-hub): 태블릿 가로에서 좌우 분할 레이아웃 적용"
```

---

## Task 9: 시뮬레이터 검증 (수동)

**Files:** 없음 (실행만)

검증은 수동이지만 단계는 명시적으로 따라간다.

- [ ] **Step 9.1: prebuild 후 iPad 시뮬레이터 실행**

Run: `npx expo prebuild --clean && npx expo run:ios --device "iPad Pro 11-inch"`
Expected: 빌드 성공, 시뮬레이터에 앱 부팅

- [ ] **Step 9.2: 시나리오 ① 처음 사용자 검증**

(테스트 계정으로 로그인 → 학습 여정 화면 도달)

확인:
- [ ] 좌측: 포스터 배너 + 여정보드. 보드의 STEP 1~4 노드 이미지가 정상 크기로 보임 (사진 IMG_2081 같은 압축 없음)
- [ ] 우측: STEP 1 카드(rich) — 제목 큼, 본문 2줄, 메타 정보 (예상 시간/난이도/문항 수), 진단 후 미리보기 한 줄
- [ ] 우측 하단 CTA "첫 진단 시작하기"

- [ ] **Step 9.3: 시나리오 ② 분석 진행 중 검증**

(분석 미완료 상태 시뮬레이션 — 진단 후 결과 화면에서 일부 문제만 분석 후 홈으로 복귀)

확인:
- [ ] 우측: STEP 카드(compact) + 분석 재개 카루셀 + CTA "분석 이어하기"
- [ ] STEP 카드의 본문은 1줄, 메타 정보 / 미리보기 한 줄은 안 보임

- [ ] **Step 9.4: AuthNotice / 회귀 검증**

확인:
- [ ] 인증 알림 pill이 표시되는 시나리오에서 좌측 컬럼 안에 자연스럽게 (포스터 배너 아래) 보임
- [ ] iPad 가로에서 좌우로 회전 시 (Left ↔ Right) 동일하게 정렬

- [ ] **Step 9.5: 폰 회귀 검증**

Run: `npx expo run:ios --device "iPhone 15 Pro"`
확인:
- [ ] 학습 여정 화면이 기존 모습 그대로 (세로 stack + 화면 footer CTA)
- [ ] split layout 분기가 폰에서는 적용되지 않음

- [ ] **Step 9.6: 졸업 후 / 로딩 / 에러 상태 회귀**

확인 (가능한 시나리오만):
- [ ] 졸업 후 (`showJourneyBoard === false`) — split 적용 X, 기존 stack 그대로 (BrandHeader + 약점/복습 카드)
- [ ] 로딩 중 (`!isReady`) — 가운데 정렬 안내 카드
- [ ] 데이터 못 불러옴 — 가운데 정렬 + 다시 불러오기 버튼

---

## Task 10: iPad mini / 12.9" / Android tablet 추가 디바이스 검증

**Files:** 없음

- [ ] **Step 10.1: iPad mini 6 가로 (1133×744)**

Run: `npx expo run:ios --device "iPad mini (6th generation)"`
확인: 시나리오 ① 정상, split layout 깨짐 없음

- [ ] **Step 10.2: iPad Pro 12.9" 가로 (1366×1024)**

Run: `npx expo run:ios --device "iPad Pro (12.9-inch) (6th generation)"`
확인: 시나리오 ① 정상, 너무 휑하지 않음 (좌측 1.3 / 우측 1 비율 OK)

- [ ] **Step 10.3: Android tablet 가로**

Run: `npx expo run:android` (Android tablet AVD)
확인: 시나리오 ① 정상

- [ ] **Step 10.4: 결과 기록 + Commit (PROGRESS.md 업데이트는 이번 plan에서 다루지 않음)**

수동 검증 결과를 본인 메모로 정리. 코드 변경이 없으면 commit 생략.

---

## Self-Review 체크리스트 (writer가 plan 작성 후 자체 점검)

> 이 섹션은 plan 작성 직후 writer가 점검한 결과. executor 는 무시해도 됨.

- ✅ Spec §3 레이아웃 구조 → Task 7 (`JourneyHubSplitLayout`) + Task 8 (적용)
- ✅ Spec §4 STEP 카드 적응형 → Task 1 (카피) + Task 5 (`StepDetailCard`)
- ✅ Spec §5 카드 순서 → Task 6 (`JourneyHubRightPanel`)
- ✅ Spec §6 시나리오 ① ② → Task 9 (수동 검증)
- ✅ Spec §7 예외 상태 (split 미적용) → Task 8 (`useTabletSplitLayout` 분기 조건)
- ✅ Spec §8 보드 height 제약 풀기 → Task 3 (`containerWidth` 옵션) + Task 4 (prop)
- ✅ Spec §9 검증 → Task 9, 10
- ✅ 폰 경로 변경 없음 → Task 4 (containerWidth 미지정 시 기존 동작) + Task 8 (isTablet 가드)
- ✅ 타입 시그니처 일관성 — `JourneyStepKey`, `containerWidth`, `StepDetailCardMode`, `ExamAnalysisResumeCarouselItem` 모두 같은 import 경로 사용
- ✅ Placeholder 없음 — TBD/TODO 미포함, 모든 step에 구체적 코드/명령

---

## 참고

- Spec: `docs/superpowers/specs/2026-05-09-ipad-landscape-journey-split-design.md`
- 선행 spec: `docs/superpowers/specs/2026-05-09-ipad-landscape-only-design.md`
- Visual companion mockups: `.superpowers/brainstorm/40920-1778298181/content/`
