# iPad 홈화면 레이아웃 100% 채움 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이패드 홈화면(QuizHub)에서 콘텐츠가 화면의 ~60-70%만 차지하는 문제를, 컨테이너 maxWidth를 스크린 폭의 92%로 동적 계산하고 개별 컴포넌트 상한값을 상향하여 해결한다.

**Architecture:** `quiz-hub-screen-view.tsx`의 `tabletPosterScreen.maxWidth: 720` 정적 고정값을 `Math.min(screenWidth * 0.92, 1040)` 동적 계산으로 교체. `poster-title-banner`, `no-review-day-card`, `journey-board` 3개 컴포넌트의 태블릿 상한값을 각각 상향. iPhone 레이아웃은 `isTablet` 분기 밖이라 변경 없음.

**Tech Stack:** React Native, Expo SDK, `useWindowDimensions` (react-native), `useIsTablet` (기존 훅 재사용)

---

### Task 1: QuizHubScreenView 컨테이너 maxWidth 동적화

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: `useWindowDimensions` import 추가**

`features/quiz/components/quiz-hub-screen-view.tsx` 상단 import 수정:

```tsx
// 변경 전
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// 변경 후
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
```

- [ ] **Step 2: `tabletContainerMaxWidth` 계산 추가**

`QuizHubScreenView` 함수 내부, `const isTablet = useIsTablet();` 바로 아래에 추가:

```tsx
const isTablet = useIsTablet();
const { width: screenWidth } = useWindowDimensions();
const tabletContainerMaxWidth = isTablet ? Math.min(screenWidth * 0.92, 1040) : undefined;
```

- [ ] **Step 3: `tabletPosterScreen` 스타일에서 `maxWidth: 720` 제거**

StyleSheet.create 안의 `tabletPosterScreen` 변경:

```tsx
// 변경 전
tabletPosterScreen: {
  maxWidth: 720,
  width: '100%',
  alignSelf: 'center',
},

// 변경 후
tabletPosterScreen: {
  width: '100%',
  alignSelf: 'center',
},
```

- [ ] **Step 4: ScrollView contentContainerStyle에 동적 maxWidth 적용**

현재 코드(약 line 190):

```tsx
contentContainerStyle={[
  styles.posterScreen,
  isTablet && styles.tabletPosterScreen,
  isTablet && styles.posterScreenTabletSpacing,
  {
    paddingTop: scrollTopPadding,
    paddingBottom: bottomPadding,
  },
]}
```

변경 후:

```tsx
contentContainerStyle={[
  styles.posterScreen,
  isTablet && styles.tabletPosterScreen,
  isTablet && { maxWidth: tabletContainerMaxWidth },
  isTablet && styles.posterScreenTabletSpacing,
  {
    paddingTop: scrollTopPadding,
    paddingBottom: bottomPadding,
  },
]}
```

- [ ] **Step 5: CTA 버튼 태블릿 maxWidth 상향**

현재 코드(약 line 248):

```tsx
style={[styles.ctaFooterButton, isTablet && { maxWidth: 480 }]}
```

변경 후:

```tsx
style={[styles.ctaFooterButton, isTablet && { maxWidth: 600 }]}
```

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(tablet): QuizHubScreenView 컨테이너 maxWidth 동적화 (720 고정 → screenWidth*0.92)"
```

---

### Task 2: PosterTitleBanner 태블릿 상한 상향

**Files:**
- Modify: `features/quiz/components/poster-title-banner.tsx`

- [ ] **Step 1: `heroFrameWrapTablet` maxWidth 변경**

`poster-title-banner.tsx` StyleSheet 안의 `heroFrameWrapTablet`:

```tsx
// 변경 전
heroFrameWrapTablet: {
  maxWidth: 560,
},

// 변경 후
heroFrameWrapTablet: {
  maxWidth: 700,
},
```

- [ ] **Step 2: 커밋**

```bash
git add features/quiz/components/poster-title-banner.tsx
git commit -m "feat(tablet): PosterTitleBanner 히어로 배너 태블릿 상한 560→700"
```

---

### Task 3: NoReviewDayCard 태블릿에서 maxWidth 해제

**Files:**
- Modify: `features/quiz/components/no-review-day-card.tsx`

- [ ] **Step 1: `useIsTablet` import 추가**

파일 상단:

```tsx
// 변경 전
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';

// 변경 후
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';
```

- [ ] **Step 2: 컴포넌트에서 `useIsTablet` 호출 및 스타일 조건 적용**

`NoReviewDayCard` 함수 변경:

```tsx
// 변경 전
export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const daysUntil = getDaysUntil(nextTask.scheduledFor);
  const pillText = `오늘은 복습 없는 날이에요 · 다음 복습 D-${daysUntil}`;

  return (
    <View style={styles.wrap}>

// 변경 후
export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const isTablet = useIsTablet();
  const daysUntil = getDaysUntil(nextTask.scheduledFor);
  const pillText = `오늘은 복습 없는 날이에요 · 다음 복습 D-${daysUntil}`;

  return (
    <View style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
```

React Native는 `maxWidth: undefined`를 무시하므로 StyleSheet의 `maxWidth: 460` 제약이 해제됨.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/no-review-day-card.tsx
git commit -m "feat(tablet): NoReviewDayCard 태블릿에서 maxWidth 460 제약 해제"
```

---

### Task 4: JourneyBoard 태블릿 상한 소폭 상향

**Files:**
- Modify: `features/quiz/components/journey-board.tsx`

- [ ] **Step 1: `boardMaxWidth` 태블릿 상한 640→680**

현재 코드(약 line 156):

```tsx
// 변경 전
const boardMaxWidth = isTablet
  ? Math.min(screenWidth * 0.7, 640)
  : isCompactLayout ? 430 : 470;

// 변경 후
const boardMaxWidth = isTablet
  ? Math.min(screenWidth * 0.7, 680)
  : isCompactLayout ? 430 : 470;
```

> 주의: 여정판은 VIEWBOX 종횡비 고정이라 너무 넓으면 세로로 압도됨. 0.7 비율과 680 상한은 그 균형점.

- [ ] **Step 2: 커밋**

```bash
git add features/quiz/components/journey-board.tsx
git commit -m "feat(tablet): JourneyBoard 태블릿 maxWidth 상한 640→680"
```

---

### Task 5: 시뮬레이터 검증

- [ ] **Step 1: iOS 시뮬레이터 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: iPad Pro 13" 시뮬레이터로 전환**

Xcode 메뉴 또는 시뮬레이터 앱에서 기기를 "iPad Pro 13-inch (M4)"로 변경.

- [ ] **Step 3: 홈화면 진입 후 레이아웃 확인**

체크리스트:
- 콘텐츠가 화면의 88% 이상 차지하는지 확인 (좌우 여백이 각 4% 정도)
- 히어로 배너(학습 여정 타이틀)가 더 넓어졌는지 확인
- 여정판이 세로로 화면을 압도하지 않는지 확인
- CTA 버튼이 더 넓어졌는지 확인

- [ ] **Step 4: iPhone 레이아웃 회귀 확인**

시뮬레이터를 "iPhone 15 Pro"로 변경 후:
- 홈화면 레이아웃이 기존과 동일한지 확인
- 스크롤, CTA 버튼, 여정판 등 기존 동작 이상 없는지 확인

- [ ] **Step 5: iPad mini 6 (744pt) 확인**

시뮬레이터를 "iPad mini (6th generation)"으로 변경:
- 콘텐츠가 화면의 90% 이상 차지하는지 확인 (기존 96.8%에서 91.9%로 약간 줄어도 정상)

- [ ] **Step 6: 최종 커밋 (필요 시)**

회귀가 없으면:

```bash
git log --oneline -5
```

커밋 히스토리 확인 후 이상 없으면 완료.
