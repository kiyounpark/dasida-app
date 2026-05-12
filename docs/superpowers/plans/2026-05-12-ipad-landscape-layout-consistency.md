# iPad 가로모드 레이아웃 일관성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPad 가로모드 화면들의 좌우 여백·콘텐츠 폭을 `<PageContainer variant>` 컴포넌트와 `BrandLayout` 토큰으로 통일한다. 폰 동작은 건드리지 않는다.

**Architecture:** 토큰(`constants/brand.ts:BrandLayout`)에 reading/hub/split 프리셋 추가. 순수 함수 `resolvePageContainerStyle()`은 단위 테스트로 검증하고, 박형 컴포넌트 `<PageContainer>`는 그 함수를 호출하는 얇은 래퍼다. 각 화면은 자기 `tabletContainer` 스타일을 지우고 PageContainer로 자식을 감싼다.

**Tech Stack:** React Native + Expo, TypeScript, Jest (jest-expo preset), `useWindowDimensions` 기반 `useIsTablet()` 훅

**Spec:** `docs/superpowers/specs/2026-05-12-ipad-landscape-layout-consistency-design.md`

---

## 파일 구조

신규:
- `components/layout/page-container-style.ts` — 순수 함수 `resolvePageContainerStyle(variant, isTablet)` (테스트 대상)
- `components/layout/page-container-style.test.ts` — 위 함수의 단위 테스트
- `components/layout/page-container.tsx` — 얇은 RN 컴포넌트 (위 함수 호출)

수정:
- `constants/brand.ts` — `BrandLayout` 토큰 추가
- 화면 파일들(아래 Task에서 개별 명시)

---

# PR 1 — 토큰 + 컴포넌트 도입 (화면 변경 없음)

### Task 1.1: `BrandLayout` 토큰 추가

**Files:**
- Modify: `constants/brand.ts:35-42` (BrandSpacing 정의 바로 아래에 추가)

- [ ] **Step 1: 토큰을 `constants/brand.ts` 끝에 추가**

`constants/brand.ts` 파일 끝(현재 마지막 줄은 `} as const;`로 끝나는 `BrandSpacing` 정의)에 다음을 추가:

```ts
export const BrandLayout = {
  tablet: {
    reading: { contentMaxWidth: 720, pagePaddingH: 24 },
    hub: { contentMaxWidth: 1040, pagePaddingH: 24 },
    split: { pagePaddingH: 20 },
  },
} as const;

export type PageContainerVariant = keyof typeof BrandLayout.tablet;
```

- [ ] **Step 2: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (현재 다른 곳에서 BrandLayout을 참조하지 않으므로 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add constants/brand.ts
git commit -m "feat(layout): add BrandLayout token (reading/hub/split presets)"
```

---

### Task 1.2: `resolvePageContainerStyle` 순수 함수 TDD — 테스트 작성

**Files:**
- Create: `components/layout/page-container-style.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

새 파일 `components/layout/page-container-style.test.ts`:

```ts
import { resolvePageContainerStyle } from './page-container-style';

describe('resolvePageContainerStyle', () => {
  describe('phone (isTablet=false)', () => {
    it('reading: 추가 스타일 없음 (자식 통과)', () => {
      expect(resolvePageContainerStyle('reading', false)).toEqual({});
    });
    it('hub: 추가 스타일 없음', () => {
      expect(resolvePageContainerStyle('hub', false)).toEqual({});
    });
    it('split: 추가 스타일 없음', () => {
      expect(resolvePageContainerStyle('split', false)).toEqual({});
    });
  });

  describe('tablet (isTablet=true)', () => {
    it('reading: maxWidth 720, padding 24, 가운데 정렬', () => {
      expect(resolvePageContainerStyle('reading', true)).toEqual({
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        paddingHorizontal: 24,
      });
    });

    it('hub: maxWidth 1040, padding 24, 가운데 정렬', () => {
      expect(resolvePageContainerStyle('hub', true)).toEqual({
        width: '100%',
        maxWidth: 1040,
        alignSelf: 'center',
        paddingHorizontal: 24,
      });
    });

    it('split: maxWidth 없음, padding 20, 가운데 정렬 없음', () => {
      expect(resolvePageContainerStyle('split', true)).toEqual({
        paddingHorizontal: 20,
      });
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest components/layout/page-container-style.test.ts`
Expected: FAIL — "Cannot find module './page-container-style'"

---

### Task 1.3: `resolvePageContainerStyle` 구현

**Files:**
- Create: `components/layout/page-container-style.ts`

- [ ] **Step 1: 최소 구현**

새 파일 `components/layout/page-container-style.ts`:

```ts
import type { ViewStyle } from 'react-native';
import { BrandLayout, type PageContainerVariant } from '@/constants/brand';

export function resolvePageContainerStyle(
  variant: PageContainerVariant,
  isTablet: boolean,
): ViewStyle {
  if (!isTablet) {
    return {};
  }
  const preset = BrandLayout.tablet[variant];
  if (variant === 'split') {
    return { paddingHorizontal: preset.pagePaddingH };
  }
  // reading | hub
  return {
    width: '100%',
    maxWidth: (preset as { contentMaxWidth: number }).contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: preset.pagePaddingH,
  };
}
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `npx jest components/layout/page-container-style.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 3: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add components/layout/page-container-style.ts components/layout/page-container-style.test.ts
git commit -m "feat(layout): add resolvePageContainerStyle pure function with tests"
```

---

### Task 1.4: `<PageContainer>` 컴포넌트 구현

**Files:**
- Create: `components/layout/page-container.tsx`

- [ ] **Step 1: 컴포넌트 작성**

새 파일 `components/layout/page-container.tsx`:

```tsx
import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useIsTablet } from '@/hooks/use-is-tablet';
import type { PageContainerVariant } from '@/constants/brand';
import { resolvePageContainerStyle } from './page-container-style';

type Props = {
  variant: PageContainerVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * iPad 가로모드에서 화면별 콘텐츠 폭과 좌우 패딩을 일관되게 강제한다.
 * 폰에서는 추가 스타일 없이 자식을 그대로 통과시킨다.
 *
 * variant:
 *  - reading: 읽기/리스트 화면. max 720, padding 24
 *  - hub:     포스터/카드 허브. max 1040, padding 24
 *  - split:   좌우 분할 풀이 화면. padding 20만, max 없음
 */
export function PageContainer({ variant, children, style }: Props) {
  const isTablet = useIsTablet();
  const resolved = resolvePageContainerStyle(variant, isTablet);
  return <View style={[resolved, style]}>{children}</View>;
}
```

- [ ] **Step 2: 타입 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 전체 테스트 스위트 회귀 확인**

Run: `npx jest`
Expected: 모든 테스트 통과 (PageContainer는 아직 어디서도 사용되지 않으므로 회귀 없어야 함)

- [ ] **Step 4: 커밋**

```bash
git add components/layout/page-container.tsx
git commit -m "feat(layout): add <PageContainer> component (no screen migrations yet)"
```

---

### Task 1.5: PR 1 마무리

- [ ] **Step 1: 변경 사항 확인**

Run: `git log --oneline origin/main..HEAD`
Expected: 3개 커밋 (BrandLayout / resolvePageContainerStyle / PageContainer)

- [ ] **Step 2: 푸시 & PR 생성 (사람이 진행)**

이 단계는 사용자가 진행. PR 제목 예: `feat(layout): introduce PageContainer + BrandLayout tokens (no screen changes)`

PR 본문에 다음 명시:
- 이 PR은 도구만 도입, 어떤 화면도 바꾸지 않음
- 비주얼 회귀 0건 (PageContainer 미사용)
- 후속 PR(reading 묶음 / hub+split 묶음)에서 화면 마이그레이션 진행

---

# PR 2 — reading 묶음 적용

> PR 1이 머지된 뒤 시작. 각 Task는 한 화면씩 마이그레이션하고 회귀 테스트를 돌린다.

### Task 2.1: Profile 화면 마이그레이션

**Files:**
- Modify: `features/profile/components/profile-screen-view.tsx`

**현재 상태(파악):** `features/profile/components/profile-screen-view.tsx:225`에서 `contentContainerStyle={[styles.container, isTablet && styles.tabletContainer]}` 사용. `styles.tabletContainer`는 `maxWidth: 680, width: '100%', alignSelf: 'center'`(L662-666).

- [ ] **Step 1: import 추가**

`profile-screen-view.tsx` 상단 import 블록에 추가:

```ts
import { PageContainer } from '@/components/layout/page-container';
```

또한 `useIsTablet` import는 그대로 유지 (다른 곳에서 사용 중인지 확인 — 사용 안 하면 제거).

- [ ] **Step 2: ScrollView contentContainerStyle에서 tabletContainer 제거 + 자식을 PageContainer로 감싸기**

L222–225 부근을 다음과 같이 변경:

Before:
```tsx
<ScrollView
  style={styles.scroll}
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={[styles.container, isTablet && styles.tabletContainer]}>
  <View style={styles.heroCard}>
    {/* ... */}
```

After:
```tsx
<ScrollView
  style={styles.scroll}
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={styles.container}>
  <PageContainer variant="reading">
    <View style={styles.heroCard}>
      {/* ... */}
```

ScrollView가 닫히기 전 마지막 자식 뒤에 `</PageContainer>`를 추가해 ScrollView 자식 전체를 감싼다.

- [ ] **Step 3: `tabletContainer` 스타일 정의 삭제**

L662–666의 `tabletContainer: { maxWidth: 680, width: '100%', alignSelf: 'center' },` 블록 삭제.

- [ ] **Step 4: `isTablet` 미사용 여부 확인 후 정리**

Run: `grep -n "isTablet" features/profile/components/profile-screen-view.tsx`
- 더 이상 사용처가 없으면 `const isTablet = useIsTablet();` 줄과 `useIsTablet` import도 삭제.
- 다른 곳에서 사용 중이면 그대로 둠.

- [ ] **Step 5: 타입 컴파일 + 테스트 회귀 확인**

```bash
npx tsc --noEmit
npx jest
```
Expected: 모두 통과.

- [ ] **Step 6: 시각 회귀 확인 (수동)**

iPad Pro 11" 시뮬레이터에서 가로모드로 Profile 화면 진입.
- 콘텐츠가 화면 가운데 정렬되어 있는가? ✓
- 좌우 여백이 자연스러운가? (기존 680 → 720으로 살짝 넓어짐)
- iPhone 15 Pro Max에서 회귀 없는가?

문제 있으면 변경 사항을 검토하고 코드 수정. 진행 가능하면 다음 단계로.

- [ ] **Step 7: 커밋**

```bash
git add features/profile/components/profile-screen-view.tsx
git commit -m "refactor(profile): use <PageContainer variant=reading>"
```

---

### Task 2.2: History 화면 마이그레이션

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

**현재 상태:** L82 `isTablet && styles.tabletContainer`, L240 `tabletContainer: { maxWidth: 800, width: '100%', alignSelf: 'center' }`.

- [ ] **Step 1: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 2: ScrollView contentContainerStyle에서 tabletContainer 제거 + 자식을 PageContainer로 감싸기**

L77–84의 ScrollView를 다음과 같이 변경:

Before:
```tsx
<ScrollView
  style={styles.scroll}
  contentContainerStyle={[
    styles.container,
    { paddingTop: insets.top + BrandSpacing.md },
    isTablet && styles.tabletContainer,
  ]}
  ...
>
  {/* 히어로 카드 — 누적 성취 */}
  <View style={styles.heroCard}>
```

After:
```tsx
<ScrollView
  style={styles.scroll}
  contentContainerStyle={[
    styles.container,
    { paddingTop: insets.top + BrandSpacing.md },
  ]}
  ...
>
  <PageContainer variant="reading">
    {/* 히어로 카드 — 누적 성취 */}
    <View style={styles.heroCard}>
```

ScrollView 닫히기 전 마지막 자식 뒤에 `</PageContainer>` 추가.

- [ ] **Step 3: `tabletContainer` 스타일 정의 삭제**

L240의 `tabletContainer: { maxWidth: 800, width: '100%', alignSelf: 'center' },` 삭제.

- [ ] **Step 4: `isTablet` 미사용 확인 후 정리**

Run: `grep -n "isTablet" features/history/components/history-screen-view.tsx`
- 다른 사용처 없으면 `useIsTablet()` 호출과 import 삭제.

- [ ] **Step 5: 타입 컴파일 + 테스트 회귀**

```bash
npx tsc --noEmit
npx jest
```
Expected: 통과.

- [ ] **Step 6: 시각 회귀 확인 (수동)**

iPad 가로모드에서 History 진입.
- 콘텐츠 폭이 800 → 720으로 좁아짐(가장 큰 시각 변화).
- 리스트 항목들이 답답해 보이지 않는가? (만약 답답하면 토큰을 760으로 조정 검토 — 이건 별도 결정)

- [ ] **Step 7: 커밋**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "refactor(history): use <PageContainer variant=reading>"
```

---

### Task 2.3: Quiz Result 화면 마이그레이션

**Files:**
- Modify: `features/quiz/components/quiz-result-screen-view.tsx`

**현재 상태:** `tabletContainer: { maxWidth: 720 }`이 L353에 정의되어 있고, 두 군데(L70, L139)에서 ScrollView contentContainerStyle로 사용 중.

- [ ] **Step 1: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 2: 첫 번째 ScrollView (L70 부근) 마이그레이션**

L67–70:
```tsx
<ScrollView
  style={styles.scroll}
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={[styles.container, isTablet && styles.tabletContainer]}>
  <View style={styles.summaryCard}>
```

→

```tsx
<ScrollView
  style={styles.scroll}
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={styles.container}>
  <PageContainer variant="reading">
    <View style={styles.summaryCard}>
```

ScrollView가 닫히기 전 마지막 자식 뒤에 `</PageContainer>` 추가.

- [ ] **Step 3: 두 번째 ScrollView (L139 부근) 마이그레이션**

L136–139:
```tsx
<ScrollView
  style={styles.scroll}
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={[styles.container, isTablet && styles.tabletContainer]}>
```

→ 마찬가지로 `isTablet && styles.tabletContainer` 제거 후 자식을 `<PageContainer variant="reading">`로 감싸기.

- [ ] **Step 4: `tabletContainer` 스타일 정의 삭제**

L353–357:
```ts
tabletContainer: {
  maxWidth: 720,
  width: '100%',
  alignSelf: 'center',
},
```
삭제.

- [ ] **Step 5: `isTablet` 미사용 확인 후 정리**

Run: `grep -n "isTablet" features/quiz/components/quiz-result-screen-view.tsx`
다른 사용처 없으면 `useIsTablet()` 호출과 import 삭제.

- [ ] **Step 6: 타입 + 테스트 회귀**

```bash
npx tsc --noEmit
npx jest
```
Expected: 통과.

- [ ] **Step 7: 시각 회귀 확인 (수동)**

iPad 가로모드에서 Quiz Result 두 가지 분기(스냅샷 / 라이브) 모두 진입.
- maxWidth는 동일(720→720)이라 시각 변화 거의 없음. 좌우 패딩이 24로 적용된 효과만 확인.

- [ ] **Step 8: 커밋**

```bash
git add features/quiz/components/quiz-result-screen-view.tsx
git commit -m "refactor(quiz-result): use <PageContainer variant=reading>"
```

---

### Task 2.4: Quiz Result Report 화면 마이그레이션

**Files:**
- Modify: `features/quiz/components/quiz-result-report-view.tsx`

**현재 상태(파악 필요):** 현재 `tabletContainer` 스타일이 없음(grep 결과). 화면 구조를 먼저 확인한 뒤 PageContainer를 추가한다.

- [ ] **Step 1: 화면 구조 파악**

Run: `grep -n "ScrollView\|<View" features/quiz/components/quiz-result-report-view.tsx | head -20`

루트 컨테이너가 ScrollView인지 View인지, contentContainerStyle이 어떻게 구성되어 있는지 확인.

- [ ] **Step 2: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 3: 루트 컨테이너 자식들을 PageContainer로 감싸기**

루트가 ScrollView라면 ScrollView 자식 전체를 `<PageContainer variant="reading">` 안으로 옮긴다. View 루트면 동일한 패턴.

기존 `paddingHorizontal` 값(L179: 20, L185: 14, L194: 18)이 PageContainer의 24와 어떻게 상호작용하는지 점검:
- 만약 외곽 컨테이너 자체에 paddingHorizontal이 있다면, PageContainer 도입 시 그 값을 제거(PageContainer가 24를 책임). 단, 내부 카드/섹션 자체의 패딩(L246: 12, L252: 8)은 그대로 유지.

판단 기준: "이 paddingHorizontal이 페이지 전체 좌우 여백인가, 카드 내부 여백인가?"

- [ ] **Step 4: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 5: 시각 회귀 (수동)**

iPad 가로모드에서 Quiz Result Report 진입(약점이 있는 라이브 결과 케이스). 콘텐츠가 720으로 가운데 정렬되는지 확인. iPhone 회귀도 확인.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/quiz-result-report-view.tsx
git commit -m "refactor(quiz-result-report): use <PageContainer variant=reading>"
```

---

### Task 2.5: Sign-in 화면 마이그레이션 (조건부)

**Files:**
- Modify: `features/auth/components/sign-in-screen-view.tsx`

**현재 상태:** 이 화면은 현재 `useIsTablet`을 쓰지 않음. 내부 컨텐츠가 이미 작은 카드(maxWidth: 320/332)로 가운데 정렬되어 있어, iPad 가로모드에서도 시각적으로 큰 문제가 없을 가능성이 있음.

- [ ] **Step 1: 현재 iPad 가로모드 시뮬레이터 확인**

iPad Pro 11" 가로모드에서 Sign-in 화면을 띄워본다.
- 콘텐츠가 화면 가운데에 잘 자리잡고 있는가?
- 만약 이미 자연스럽다면 → **이 Task를 SKIP한다** (Step 6에서 빈 커밋 없이 Task 종료).
- 어색하다면 → Step 2로 진행.

- [ ] **Step 2: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 3: 루트 컨테이너 자식을 PageContainer로 감싸기**

화면 루트 View 또는 ScrollView 안에 `<PageContainer variant="reading">`를 추가하고, 기존 자식 전체를 그 안으로 옮긴다. `paddingHorizontal: BrandSpacing.lg`(L339, L442) 등 페이지 좌우 패딩 성격의 값이 PageContainer와 중복되는지 점검 후 제거 여부 결정.

- [ ] **Step 4: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 5: 시각 회귀 (수동)**

iPad 가로/세로, iPhone 가로/세로 4가지 케이스 빠르게 확인. 폰에서는 시각 변화가 없어야 함(PageContainer는 폰에서 no-op).

- [ ] **Step 6: 커밋 (또는 Skip 기록)**

진행한 경우:
```bash
git add features/auth/components/sign-in-screen-view.tsx
git commit -m "refactor(auth): use <PageContainer variant=reading>"
```

Skip한 경우: 다음 Task로 이동.

---

### Task 2.6: Exam Selection 화면 마이그레이션

**Files:**
- Modify: `features/quiz/components/exam-selection-screen-view.tsx`

**현재 상태:** `useIsTablet` 사용 안 함. `paddingHorizontal` 14/lg/14가 섞여 있음.

- [ ] **Step 1: 화면 구조 파악**

Run: `grep -n "ScrollView\|FlatList\|<View" features/quiz/components/exam-selection-screen-view.tsx | head -10`

스크롤 컨테이너가 ScrollView인지 FlatList인지 확인. FlatList면 `ListHeaderComponent`/`ListFooterComponent`를 PageContainer로 감싸거나, `contentContainerStyle`에 resolvePageContainerStyle 결과를 직접 적용하는 우회 방식 검토.

- [ ] **Step 2: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 3: 적용**

- 컨테이너가 ScrollView/View라면: 자식을 `<PageContainer variant="reading">`로 감싼다.
- 컨테이너가 FlatList라면: PageContainer 도입은 자연스럽지 않으므로, 그 화면만 `useIsTablet`을 들이고 `contentContainerStyle`에 인라인으로 maxWidth/alignSelf를 적용한다. (이 경우 Task 메모에 "FlatList 케이스 — 추후 PageContainer를 FlatList 지원 형태로 확장" 기록.)

- [ ] **Step 4: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 5: 시각 회귀 (수동)**

iPad 가로모드에서 시험 선택 화면 진입. 카드 리스트가 720 폭으로 가운데 정렬되는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/exam-selection-screen-view.tsx
git commit -m "refactor(exam-selection): use <PageContainer variant=reading>"
```

---

### Task 2.7: PR 2 마무리

- [ ] **Step 1: `tabletContainer: { maxWidth` 매직넘버가 사라졌는지 grep으로 확인**

Run: `grep -rn "tabletContainer:\s*{" features/profile features/history features/quiz/components/quiz-result-screen-view.tsx features/quiz/components/quiz-result-report-view.tsx`
Expected: 결과 없음 (모두 PageContainer로 대체됨).

- [ ] **Step 2: 전체 테스트 회귀**

```bash
npx jest
```
Expected: 통과.

- [ ] **Step 3: 푸시 & PR 생성 (사람)**

PR 제목 예: `refactor(layout): migrate reading-style screens to <PageContainer>`
PR 본문에 명시:
- Profile / History / Quiz Result / Quiz Result Report / Sign-in (skip 가능) / Exam Selection 마이그레이션
- 폰 비주얼 회귀 0 (PageContainer는 폰에서 no-op)
- iPad 가로모드 시각 변화: History 800→720 (가장 큼), Profile 680→720, 나머지 동일/유사

---

# PR 3 — hub + split 묶음 적용

> PR 2가 머지된 뒤 시작.

### Task 3.1: Quiz Hub 마이그레이션 (`hub`)

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

**현재 상태:** L117 `tabletContainerMaxWidth = isTablet ? Math.min(screenWidth * 0.92, 1040) : undefined`. L285에서 `isTablet && { maxWidth: tabletContainerMaxWidth }`로 적용.

- [ ] **Step 1: 현재 코드 정확히 읽기**

Run: `npx --yes -- sed -n '115,125p;280,295p' features/quiz/components/quiz-hub-screen-view.tsx`

`tabletPosterScreen`이 적용된 컨테이너의 정확한 형태와 자식 구조를 파악.

- [ ] **Step 2: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 3: `tabletContainerMaxWidth` 변수 제거 + PageContainer 도입**

- L117의 `const tabletContainerMaxWidth = ...` 줄 삭제.
- L285의 `isTablet && { maxWidth: tabletContainerMaxWidth }` 스타일 제거.
- 해당 컨테이너의 자식들을 `<PageContainer variant="hub">`로 감싼다.

`screenWidth * 0.92` 안전장치는 제거: BrandLayout.tablet.hub.contentMaxWidth(1040)가 iPad Pro 11" 가로(1194pt)·12.9" 가로(1366pt) 모두에 잘 들어가므로 안전.

- [ ] **Step 4: CTA 버튼 maxWidth(L342의 600, L139의 ctaButtonMaxWidth 480/340) 점검**

CTA 버튼은 PageContainer와 별개의 inner constraint. 그대로 유지한다(이번 작업 범위 아님).

- [ ] **Step 5: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 6: 시각 회귀 (수동)**

iPad 가로/세로, iPhone 가로/세로 4가지에서 Quiz Hub 진입.
- 포스터/저니 보드가 1040 폭으로 잘 들어가는가?
- 12.9" iPad에서 너무 좁아 보이지 않는가? (1366pt 화면에서 1040이면 양옆에 163pt씩 여백 — 의도된 결과)
- 폰에서 변화 없는가?

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "refactor(quiz-hub): use <PageContainer variant=hub>"
```

---

### Task 3.2: Quiz Solve Layout 마이그레이션 (`split`)

**Files:**
- Modify: `features/quiz/components/quiz-solve-layout.tsx`

**현재 상태:** L30 `useIsTablet()` 사용. L33 `if (isTablet)` 분기로 좌/우 분할 레이아웃 그림. 좌우 페이지 패딩이 어디 적용되는지 코드 확인 필요.

- [ ] **Step 1: 현재 코드 정독**

`features/quiz/components/quiz-solve-layout.tsx` 전체 읽기. 페이지 좌우 패딩이 명시되어 있다면 어떤 값이고, 어디에 적용되는지 식별.

- [ ] **Step 2: import 추가**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 3: 태블릿 분기의 루트 View를 PageContainer로 감싸기 (또는 대체)**

태블릿 분기에서 그리는 루트 컨테이너(좌/우 패널을 담는 View)에 페이지 좌우 패딩 20이 적용되도록 한다:

```tsx
if (isTablet) {
  return (
    <PageContainer variant="split">
      {/* 기존 태블릿 분할 레이아웃 */}
    </PageContainer>
  );
}
```

내부 좌/우 패널 너비 계산 로직은 절대 손대지 않는다.

- [ ] **Step 4: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 5: 시각 회귀 (수동)**

iPad 가로모드에서 연습 풀이 진입.
- 좌/우 분할 비율이 PageContainer 도입 전과 동일한가? (변하면 안 됨)
- 화면 가장자리 여백이 20pt로 일정한가?
- 폰 동작에 영향 없는가?

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/quiz-solve-layout.tsx
git commit -m "refactor(quiz-solve): wrap tablet split layout with <PageContainer variant=split>"
```

---

### Task 3.3: Diagnostic Solve Tablet Layout 마이그레이션

**Files:**
- Modify: `features/quiz/components/diagnostic-solve-tablet-layout.tsx`

- [ ] **Step 1: 현재 코드 파악**

파일 전체 읽기. 루트 컨테이너 구조와 페이지 좌우 패딩 적용 위치 식별.

- [ ] **Step 2: import 추가 + PageContainer로 감싸기**

```tsx
import { PageContainer } from '@/components/layout/page-container';

// 컴포넌트 return 부분
return (
  <PageContainer variant="split">
    {/* 기존 진단 풀이 분할 레이아웃 */}
  </PageContainer>
);
```

기존 페이지 좌우 패딩이 있었다면 그 부분만 제거.

- [ ] **Step 3: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 4: 시각 회귀 (수동)**

iPad 가로모드에서 진단 풀이 진입. 좌/우 비율 변화 없는지, 가장자리 여백 일정한지 확인.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/diagnostic-solve-tablet-layout.tsx
git commit -m "refactor(diagnostic): wrap tablet layout with <PageContainer variant=split>"
```

---

### Task 3.4: Exam Solve Tablet Layout 마이그레이션

**Files:**
- Modify: `features/quiz/exam/components/exam-solve-tablet-layout.tsx`

- [ ] **Step 1: 현재 코드 파악**

파일 전체 읽기. `tablet-layout-constants.ts`도 함께 확인하여 페이지 패딩 상수가 거기서 정의되어 있는지 점검:
```bash
cat features/quiz/exam/components/tablet-layout-constants.ts
```

- [ ] **Step 2: import 추가 + PageContainer로 감싸기**

루트 컨테이너를 `<PageContainer variant="split">`로 감싸기.

만약 `tablet-layout-constants.ts`에 페이지 좌우 패딩 상수가 있었다면, 그 상수가 더 이상 사용되지 않게 되는지 확인. 사용처가 없으면 상수 자체를 삭제하거나 deprecate 주석 추가.

- [ ] **Step 3: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 4: 시각 회귀 (수동)**

iPad 가로모드에서 기출 풀이 진입. 분할 비율, 가장자리 여백 확인.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/components/exam-solve-tablet-layout.tsx
# tablet-layout-constants.ts 변경된 경우에도 add
git commit -m "refactor(exam-solve): wrap tablet layout with <PageContainer variant=split>"
```

---

### Task 3.5: Review Session 태블릿 분기 마이그레이션

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

**현재 상태:** L166 `if (isTablet) { ... }` 분기로 태블릿 레이아웃 별도 렌더.

- [ ] **Step 1: 태블릿 분기 코드 정독**

Run: `npx --yes -- sed -n '160,220p' features/quiz/components/review-session-screen-view.tsx`

태블릿 분기가 어떤 컨테이너로 시작하는지, 분할 레이아웃을 그리는지 단일 컬럼인지 확인.

- [ ] **Step 2: variant 결정**

- 분할 레이아웃이면 → `split`
- 단일 컬럼(중앙 정렬된 리딩형) 이면 → `reading`

- [ ] **Step 3: import 추가 + PageContainer로 감싸기**

```ts
import { PageContainer } from '@/components/layout/page-container';
```

태블릿 분기의 루트 컨테이너를 `<PageContainer variant="...">`로 감싸기.

- [ ] **Step 4: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 5: 시각 회귀 (수동)**

iPad 가로모드에서 복습 세션 진입(가능하면 채팅이 길어진 상태도 확인). 키보드 올라올 때도 깨지지 않는지 점검.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "refactor(review-session): wrap tablet branch with <PageContainer>"
```

---

### Task 3.6: Quiz Practice Screen (variant 판단)

**Files:**
- Modify: `features/quiz/components/quiz-practice-screen-view.tsx`

**현재 상태:** `useIsTablet`/`tabletContainer` 사용 안 함. L132, L144에 `paddingHorizontal: 18 / BrandSpacing.lg`.

- [ ] **Step 1: 화면 성격 판단**

파일 전체 읽기. 이 화면이 실제 풀이 화면(좌/우 분할 가능)인지, 풀이 진입 전 카드/안내 화면(리딩형)인지 식별.

- [ ] **Step 2: variant 결정 + 적용**

- 풀이 화면이면 → `split` (단, 별도 풀이 레이아웃이 `quiz-solve-layout`에서 처리된다면 이 화면은 진입 카드일 가능성)
- 진입 카드/안내면 → `reading`

루트 컨테이너 자식을 결정된 variant로 감싸기.

```ts
import { PageContainer } from '@/components/layout/page-container';
```

- [ ] **Step 3: 타입 + 테스트**

```bash
npx tsc --noEmit
npx jest
```

- [ ] **Step 4: 시각 회귀 (수동)**

iPad 가로/세로 모두에서 화면 진입. 결정한 variant가 어색하면 다른 variant로 교체.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/quiz-practice-screen-view.tsx
git commit -m "refactor(quiz-practice): wrap with <PageContainer>"
```

---

### Task 3.7: PR 3 최종 검증 & 마무리

- [ ] **Step 1: 남은 매직넘버 grep 확인**

```bash
grep -rnE "maxWidth:\s*(680|720|800|1040)\b" features/ | grep -v ".test." | grep -v "node_modules"
```
Expected: 대부분 사라짐. 남는 결과가 있다면 그것이 의도된 inner constraint(예: CTA 버튼)인지 확인.

```bash
grep -rn "tabletContainer:" features/
```
Expected: 결과 없음.

- [ ] **Step 2: 전체 테스트 회귀**

```bash
npx tsc --noEmit
npx jest
```
Expected: 통과.

- [ ] **Step 3: 시각 회귀 전수 점검 (수동, iPad 가로모드)**

순서대로 진입하며 좌우 여백·콘텐츠 폭이 일관되게 느껴지는지 확인:
1. Profile (720)
2. History (720)
3. Quiz Result (720)
4. Quiz Hub (1040)
5. Quiz Solve (전체, 패딩 20)
6. Diagnostic Solve (전체, 패딩 20)
7. Exam Solve (전체, 패딩 20)
8. Review Session (variant에 따라)

- [ ] **Step 4: 폰 회귀 점검 (iPhone 15 Pro Max)**

위 화면들을 폰에서 한 번씩 진입. 모두 변경 전과 동일해 보여야 함(PageContainer는 폰에서 no-op).

- [ ] **Step 5: 푸시 & PR 생성 (사람)**

PR 제목 예: `refactor(layout): migrate hub + split screens to <PageContainer>`
PR 본문에 명시:
- 영향 화면: Quiz Hub / Quiz Solve / Diagnostic / Exam Solve / Review Session / Quiz Practice
- 시각 회귀 점검 완료 (체크리스트 첨부)

---

# 운영 메모

- **PR 1 머지 후 PR 2 시작**, **PR 2 머지 후 PR 3 시작.** 동시 진행 금지(같은 파일 충돌 위험).
- 각 시각 회귀 단계에서 어색하면 즉시 토큰값 조정 검토. 토큰만 바꾸면 모든 화면에 일괄 반영됨.
- 폰 패딩 정리(16/18/20 통일)는 본 작업 종료 후 별도 작업으로 분리.
- Notion "DASIDA 개발 기록" 페이지 상태 업데이트:
  - PR 1 머지 시: 진행중
  - PR 3 머지 시: 구현완료
