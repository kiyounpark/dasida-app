# 여정보드 Y 위치 고정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `JourneyScreenHero`와 `AuthNotice`를 `ScrollView` 밖으로 이동해 `JourneyBoard`의 화면 Y 좌표를 step 전환 및 authNotice 표시 여부와 완전히 무관하게 고정한다.

**Architecture:** `quiz-hub-screen-view.tsx` 단일 파일의 레이아웃 구조를 변경한다. Hero 컨테이너(`paddingTop = posterTopPadding`)와 AuthNotice를 ScrollView 위에 배치하고, ScrollView paddingTop은 여정 중 14(기존 gap 보존), 졸업 후는 기존 값 유지한다. 로직·상태·하위 컴포넌트 파일은 일절 수정하지 않는다.

**Tech Stack:** React Native, Expo, `react-native-safe-area-context`

---

## 파일 맵

| 역할 | 파일 | 변경 |
|---|---|---|
| 화면 레이아웃 | `features/quiz/components/quiz-hub-screen-view.tsx` | 수정 |
| (변경 없음) | `features/quiz/components/journey-board.tsx` | — |
| (변경 없음) | `features/quiz/components/poster-title-banner.tsx` | — |
| (변경 없음) | `features/quiz/hooks/use-quiz-hub-screen.ts` | — |

---

## 패딩 수학 참조

이 표를 구현 중 상시 참고한다.

```
bannerRaise = isCompactLayout ? 24 : 32
posterTopPadding (여정 중, showBrandHeader=false)
  = insets.top + (isCompactLayout ? 14 : 24) + bannerRaise
  = insets.top + (isCompactLayout ? 38 : 56)

──────────────────────────────────────────────────
현재 (Hero in ScrollView):
  ScrollView paddingTop = posterTopPadding
  Hero layout Y         = posterTopPadding
  Hero visual Y         = posterTopPadding - bannerRaise   ← translateY 보정
                        = insets.top + (compact?14:24)
  Board Y               = posterTopPadding + heroHeight + gap(14) + board.marginTop(52)

수정 후 (Hero outside ScrollView):
  heroContainer paddingTop = posterTopPadding              ← 동일 값 유지
  Hero layout Y            = posterTopPadding              ← 동일
  Hero visual Y            = posterTopPadding - bannerRaise ← 동일 ✓
  ScrollView paddingTop    = 14                            ← gap 보존
  Board Y                  = heroContainerBottom + 14 + 52 ← 동일 ✓
──────────────────────────────────────────────────
졸업 후 (showBrandHeader=true, showJourneyHero=false):
  BrandHeader (ScrollView 밖, 변경 없음)
  ScrollView paddingTop = posterTopPadding(brandHeader case)
                        = isCompactLayout ? 14 : 24        ← 변경 없음 ✓
```

---

## Task 1: 레이아웃 재구성

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

### 현재 코드 파악

- [ ] **Step 1: 수정 전 시뮬레이터 스냅샷 촬영**

  iPhone 14 Pro(standard) 시뮬레이터를 열고 `quiz/` 탭으로 이동한다. step 1(진단) 상태에서 보드 상단 Y 좌표를 눈으로 확인해 기준점을 파악한다. (정확한 픽셀 측정 불필요, 시각적 기준 파악 목적)

  ```bash
  npx expo start --dev-client
  ```

### 레이아웃 재구성

- [ ] **Step 2: `quiz-hub-screen-view.tsx` 열기**

  파일 경로: `features/quiz/components/quiz-hub-screen-view.tsx`

  변경할 세 구간을 확인한다:
  1. `posterTopPadding` 계산 블록 (line ~100)
  2. 메인 return 내 ScrollView 블록 (line ~138)
  3. ScrollView 내 `showJourneyHero` 조건부 (line ~152)

- [ ] **Step 3: `posterTopPadding` → `heroContainerPaddingTop` + `scrollTopPadding` 분리**

  기존 코드:
  ```tsx
  // poster-title-banner.tsx heroFrameWrapRaised(d) translateY(-32/-24)에 맞춰야 함
  const bannerRaise = isCompactLayout ? 24 : 32;
  // BrandHeader가 SafeAreaView edges={['top']}으로 insets.top을 처리하므로
  // 졸업 후 상태에서는 insets.top을 제외한 콘텐츠 간격만 적용
  const posterTopPadding = showBrandHeader
    ? (isCompactLayout ? 14 : 24)
    : insets.top + (isCompactLayout ? 14 : 24) + bannerRaise;
  ```

  다음으로 교체:
  ```tsx
  // poster-title-banner.tsx heroFrameWrapRaised(d) translateY(-32/-24)에 맞춰야 함
  const bannerRaise = isCompactLayout ? 24 : 32;
  // Hero가 ScrollView 밖에 있으므로 Hero 컨테이너가 insets + bannerRaise를 담당한다.
  // ScrollView는 Hero 아래 gap(14)만 갖는다.
  const heroContainerPaddingTop = insets.top + (isCompactLayout ? 14 : 24) + bannerRaise;
  // 졸업 후(showBrandHeader=true): BrandHeader가 top inset 처리 → 콘텐츠 간격만 적용
  const scrollTopPadding = showJourneyHero
    ? 14
    : (isCompactLayout ? 14 : 24);
  ```

- [ ] **Step 4: 메인 return 구조 재구성**

  기존 메인 return (line ~138):
  ```tsx
  return (
    <View style={styles.screen}>
      {showBrandHeader ? <BrandHeader compact /> : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.posterScreen,
          isTablet && styles.tabletPosterScreen,
          {
            paddingTop: posterTopPadding,
            paddingBottom: bottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {showJourneyHero ? (
          <JourneyScreenHero isCompactLayout={isCompactLayout} />
        ) : null}
        {authNoticeMessage ? (
          <AuthNotice
            isCompactLayout={isCompactLayout}
            message={authNoticeMessage}
            onDismiss={onDismissAuthNotice}
          />
        ) : null}
        {showReviewHomeCard && homeState?.nextReviewTask ? (
          <ReviewHomeCard
            task={homeState.nextReviewTask}
            onPress={onPressReviewCard}
          />
        ) : null}
        {showNoReviewDayCard ? (
          <NoReviewDayCard
            nextTask={homeState.nextReviewTask!}
            onPressExam={onPressExam}
          />
        ) : null}
        {showJourneyBoard ? (
          <JourneyBoard
            isCompactLayout={isCompactLayout}
            onPressCurrentStep={onPressJourneyCta}
            state={journey}
          />
        ) : null}
        {showWeaknessSection && homeState ? (
          <HomeWeaknessSection homeState={homeState} />
        ) : null}
      </ScrollView>
      {showJourneyBoard ? (
        <View style={[styles.ctaFooter, { paddingBottom: insets.bottom + (isCompactLayout ? 24 : 28) }]}>
          <JourneyCtaButton
            compact={isCompactLayout}
            label={journey.ctaLabel}
            onPress={onPressJourneyCta}
            style={styles.ctaFooterButton}
          />
        </View>
      ) : null}
    </View>
  );
  ```

  다음으로 교체:
  ```tsx
  return (
    <View style={styles.screen}>
      {showBrandHeader ? <BrandHeader compact /> : null}
      {showJourneyHero ? (
        <View style={[styles.heroHeader, { paddingTop: heroContainerPaddingTop }]}>
          <JourneyScreenHero isCompactLayout={isCompactLayout} />
        </View>
      ) : null}
      {authNoticeMessage ? (
        <AuthNotice
          isCompactLayout={isCompactLayout}
          message={authNoticeMessage}
          onDismiss={onDismissAuthNotice}
        />
      ) : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.posterScreen,
          isTablet && styles.tabletPosterScreen,
          {
            paddingTop: scrollTopPadding,
            paddingBottom: bottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {showReviewHomeCard && homeState?.nextReviewTask ? (
          <ReviewHomeCard
            task={homeState.nextReviewTask}
            onPress={onPressReviewCard}
          />
        ) : null}
        {showNoReviewDayCard ? (
          <NoReviewDayCard
            nextTask={homeState.nextReviewTask!}
            onPressExam={onPressExam}
          />
        ) : null}
        {showJourneyBoard ? (
          <JourneyBoard
            isCompactLayout={isCompactLayout}
            onPressCurrentStep={onPressJourneyCta}
            state={journey}
          />
        ) : null}
        {showWeaknessSection && homeState ? (
          <HomeWeaknessSection homeState={homeState} />
        ) : null}
      </ScrollView>
      {showJourneyBoard ? (
        <View style={[styles.ctaFooter, { paddingBottom: insets.bottom + (isCompactLayout ? 24 : 28) }]}>
          <JourneyCtaButton
            compact={isCompactLayout}
            label={journey.ctaLabel}
            onPress={onPressJourneyCta}
            style={styles.ctaFooterButton}
          />
        </View>
      ) : null}
    </View>
  );
  ```

- [ ] **Step 5: `heroHeader` 스타일 추가**

  `StyleSheet.create({...})` 안에 추가:
  ```tsx
  heroHeader: {
    width: '100%',
    alignItems: 'center',
  },
  ```

- [ ] **Step 6: TypeScript 타입 체크**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  예상: 오류 없음. `posterTopPadding` 변수를 더 이상 참조하지 않으면 TS가 경고할 수 있다 — 해당 변수가 제거되었는지 확인한다.

---

## Task 2: 시각 검증

**Files:**
- Read: 시뮬레이터 화면

### iPhone 14 Pro (standard, width ≥ 390pt)

- [ ] **Step 7: Step 1 (진단) 상태 확인**

  seed "첫 설치"로 앱 진입 → `/quiz` 탭 이동.
  확인:
  - `학습 여정` 배너가 화면 상단(status bar 아래)에 보임
  - 여정보드가 배너 아래 적절한 여백을 두고 위치함
  - 보드 상단 Y 좌표가 Step 1 수정 전 기준과 동일함

- [ ] **Step 8: Step 2 (분석) 상태 확인**

  seed "진단 완료"로 앱 진입 → `/quiz` 탭 이동.
  확인:
  - 여정보드 상단 Y 좌표가 Step 7과 동일함 ← 핵심 검증
  - 활성 노드(분석)가 올바르게 하이라이트됨
  - 말풍선이 분석 노드 근처에 위치함

- [ ] **Step 9: AuthNotice 시뮬레이션**

  `use-quiz-hub-screen.ts`에서 임시로 `localAuthNoticeMessage`를 하드코딩하거나, 앱에서 로그인 흐름을 통해 authNotice가 트리거되는 상황 재현.

  확인:
  - AuthNotice 알약이 Hero 아래, 여정보드 위에 나타남
  - 여정보드 Y 좌표가 AuthNotice 없을 때와 **동일함** ← 핵심 검증
  - 닫기 버튼으로 알약 숨김 시 여정보드 위치 변화 없음

- [ ] **Step 10: 졸업 후 상태 확인 (회귀 없음)**

  seed "약점 연습 완료"로 앱 진입 → `/quiz` 탭 이동.
  확인:
  - `학습 여정` 배너가 보이지 않음
  - BrandHeader(다산이다 로고 등)가 정상 표시됨
  - ReviewCard / NoReviewCard / WeaknessSection이 기존과 동일한 위치

### iPhone SE (compact, width < 390pt)

- [ ] **Step 11: compact 레이아웃 검증**

  시뮬레이터를 iPhone SE(3rd generation)로 변경.
  - Step 1 상태: Hero와 보드 간 여백이 compact 값으로 정상 적용됨
  - Step 2 상태: 보드 Y 좌표가 Step 1과 동일함
  - 졸업 상태: 회귀 없음

- [ ] **Step 12: isReady=false 상태 확인**

  로딩 중 상태는 완전히 별도 JSX 분기(`feedbackScreen`)이므로 변경사항 영향 없음. 로딩 화면(여정 준비 중)이 기존과 동일하게 나타나는지 확인한다.

  > 이 분기는 수정하지 않았으므로 회귀 가능성 없음. 빠른 눈으로만 확인.

---

## Task 3: 커밋

**Files:**
- Commit: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 13: 변경 확인 후 커밋**

  ```bash
  git diff features/quiz/components/quiz-hub-screen-view.tsx
  ```

  예상: `posterTopPadding` → `heroContainerPaddingTop` + `scrollTopPadding` 분리, ScrollView 밖으로 Hero/AuthNotice 이동, `heroHeader` 스타일 추가.

  ```bash
  git add features/quiz/components/quiz-hub-screen-view.tsx
  git commit -m "fix(quiz-hub): 여정보드 Y 위치 고정 — Hero·AuthNotice를 ScrollView 밖으로 이동"
  ```

---

## Self-Review

### Spec Coverage

| Spec 요구사항 | 구현 Task |
|---|---|
| JourneyScreenHero ScrollView 밖으로 이동 | Task 1 Step 4 |
| AuthNotice ScrollView 밖으로 이동 | Task 1 Step 4 |
| Hero 컨테이너 paddingTop = posterTopPadding | Task 1 Step 3 |
| ScrollView paddingTop = 14 (여정 중) | Task 1 Step 3 |
| 졸업 후 posterTopPadding 경로 불변 | Task 1 Step 3 |
| `journey-board.tsx` 변경 없음 | 파일 맵 |
| Step 1→4 보드 Y 불변 검증 | Task 2 Step 7-8 |
| AuthNotice 표시·숨김 시 보드 Y 불변 | Task 2 Step 9 |
| compact 레이아웃 검증 | Task 2 Step 11 |
| 졸업 후 회귀 없음 | Task 2 Step 10 |
| isReady=false 회귀 없음 | Task 2 Step 12 |

### Placeholder 스캔

없음. 모든 코드 블록 완전 작성됨.

### 타입 일관성

- `heroContainerPaddingTop`: number → Step 4의 `{ paddingTop: heroContainerPaddingTop }` ✓
- `scrollTopPadding`: number → Step 4의 contentContainerStyle `paddingTop` ✓
- `heroHeader`: StyleSheet key → Step 5에서 정의 ✓
- `posterTopPadding` 변수: Step 3에서 제거되며 이후 Step에서 참조 없음 ✓
