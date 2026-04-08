# 태블릿 반응형 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `useIsTablet` 훅(744px 브레이크포인트)을 기반으로 7개 주요 화면에 태블릿 레이아웃을 추가한다.

**Architecture:** `hooks/use-is-tablet.ts` 하나를 공유 기준점으로 삼고, 각 화면의 `*-screen-view.tsx`에서 모바일/태블릿 레이아웃을 명시적으로 분기한다. 문제풀기·복습은 진짜 2단(좌=콘텐츠, 우=인터랙션), 결과·히스토리·허브·설정은 maxWidth 중앙 정렬로 처리한다.

**Tech Stack:** React Native `useWindowDimensions`, `StyleSheet.create`, `ScrollView`, `View` flexbox

---

## 파일 변경 목록

| 작업 | 파일 |
|------|------|
| **생성** | `hooks/use-is-tablet.ts` |
| **수정** | `features/quiz/components/quiz-solve-layout.tsx` |
| **수정** | `features/quiz/components/review-session-screen-view.tsx` |
| **수정** | `features/quiz/exam/screens/exam-result-screen-view.tsx` |
| **수정** | `features/quiz/components/quiz-result-screen-view.tsx` |
| **수정** | `features/history/components/history-screen-view.tsx` |
| **수정** | `features/quiz/components/quiz-hub-screen-view.tsx` |
| **수정** | `features/profile/components/profile-screen-view.tsx` |

---

## Task 1: `useIsTablet` 훅 생성

**Files:**
- Create: `hooks/use-is-tablet.ts`

- [ ] **Step 1: 파일 생성**

```ts
// hooks/use-is-tablet.ts
import { useWindowDimensions } from 'react-native';

/**
 * 744px 이상이면 태블릿으로 판단.
 * - iPad mini 6세대 portrait: 744pt (포함)
 * - iPhone 15 Pro Max: 430pt (제외)
 * useWindowDimensions를 사용하므로 orientation 변경 시 자동 재계산.
 */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= 744;
}
```

- [ ] **Step 2: Expo Go에서 콘솔 확인**

`app/_layout.tsx` 상단에 임시 로그 추가 후 Expo Go 실행:
```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
// 컴포넌트 내부:
const isTablet = useIsTablet();
console.log('[useIsTablet]', isTablet); // 폰: false, 태블릿: true
```
확인 후 임시 코드 제거.

- [ ] **Step 3: 커밋**

```bash
git add hooks/use-is-tablet.ts
git commit -m "feat: useIsTablet 훅 추가 (744px 브레이크포인트)"
```

---

## Task 2: `quiz-solve-layout.tsx` 태블릿 2단 레이아웃

문제 이미지(body)를 좌측 60%, 답안 패널(footer)을 우측 40%에 나란히 배치한다.

**Files:**
- Modify: `features/quiz/components/quiz-solve-layout.tsx`

- [ ] **Step 1: `useIsTablet` import 추가 및 태블릿 분기**

현재 파일의 전체 내용을 아래로 교체:

```tsx
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { useIsTablet } from '@/hooks/use-is-tablet';

export type QuizSolveLayoutProps = {
  body: ReactNode;
  bodyContentContainerStyle?: StyleProp<ViewStyle>;
  footer: ReactNode;
  header: ReactNode;
  screenBackgroundColor?: string;
};

export function getQuizBottomPanelMaxHeight(height: number, isCompactLayout: boolean) {
  const ratio = isCompactLayout ? 0.44 : 0.38;
  return Math.min(360, Math.max(220, height * ratio));
}

export function QuizSolveLayout({
  body,
  bodyContentContainerStyle,
  footer,
  header,
  screenBackgroundColor = BrandColors.background,
}: QuizSolveLayoutProps) {
  const isTablet = useIsTablet();

  if (isTablet) {
    return (
      <View style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
        {header}
        <View style={styles.tabletRow}>
          <ScrollView
            style={styles.tabletLeft}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.tabletLeftContent, bodyContentContainerStyle]}>
            {body}
          </ScrollView>
          <ScrollView
            style={styles.tabletRight}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.tabletRightContent}>
            {footer}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
      {header}
      <ScrollView
        style={styles.bodyScroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.bodyContent, bodyContentContainerStyle]}>
        {body}
      </ScrollView>
      <View style={styles.footerWrap}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // 모바일
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
    boxShadow: '0 -10px 24px rgba(36, 52, 38, 0.08)',
  },
  // 태블릿
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 3, // 60%
    borderRightWidth: 1,
    borderRightColor: 'rgba(41, 59, 39, 0.08)',
  },
  tabletLeftContent: {
    flexGrow: 1,
  },
  tabletRight: {
    flex: 2, // 40%
    backgroundColor: '#FFFFFF',
  },
  tabletRightContent: {
    flexGrow: 1,
  },
});
```

- [ ] **Step 2: iPad mini 시뮬레이터(744×1133pt)에서 확인**

```bash
npx expo start
```

Expo Go 앱 또는 시뮬레이터에서:
- iPad mini: 헤더 전체 너비, 좌측 60% 문제 이미지, 우측 40% 선택지 패널 확인
- iPhone: 기존 모바일 레이아웃(스크롤 body + 고정 footer) 유지 확인

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/quiz-solve-layout.tsx
git commit -m "feat(tablet): quiz-solve-layout 2단 레이아웃 (좌 body 60% / 우 footer 40%)"
```

---

## Task 3: `review-session-screen-view.tsx` 태블릿 2단 레이아웃

단계 설명 카드(stepCard)를 좌측 55%, 입력 카드(inputCard)를 우측 45%에 배치한다.
완료 화면(sessionComplete, !step)은 태블릿에서도 중앙 정렬 그대로 유지.

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: `useIsTablet` import 추가**

파일 상단 import에 추가:
```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

- [ ] **Step 2: `ReviewSessionScreenView` 컴포넌트에 태블릿 분기 추가**

기존 `return (` 직전(line 109, `const continueLabel = ...` 이후)에 훅 호출 추가:
```tsx
const isTablet = useIsTablet();
```

그리고 기존 모바일 `return (` 블록 위에 태블릿 분기 추가:

```tsx
  // 태블릿: 2단 레이아웃
  if (isTablet) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* 진행 바 */}
        <View style={[styles.progressBar, styles.tabletProgressBar]}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
            />
          ))}
        </View>
        <View style={styles.tabletRow}>
          {/* 좌: 단계 카드 */}
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
                </View>
                <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
              {step.example ? (
                <View style={styles.stepExampleBox}>
                  <Text style={styles.stepExampleText}>{step.example}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
          {/* 우: 입력 카드 */}
          <ScrollView
            style={[styles.tabletRight, { backgroundColor: '#FFFFFF' }]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled">
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>
              <View style={styles.choices}>
                {step.choices.map((choice, i) => (
                  <Pressable
                    key={i}
                    style={[styles.choiceBtn, selectedChoiceIndex === i && styles.choiceBtnSelected]}
                    onPress={() => stepPhase === 'input' && onSelectChoice(i)}>
                    <Text
                      style={[
                        styles.choiceBtnText,
                        selectedChoiceIndex === i && styles.choiceBtnTextSelected,
                      ]}>
                      {choice.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
                <View style={styles.dividerLine} />
              </View>
              <TextInput
                style={styles.textInput}
                value={userText}
                onChangeText={stepPhase === 'input' ? onChangeText : undefined}
                placeholder="자유롭게 써보세요..."
                placeholderTextColor={BrandColors.disabled}
                multiline
                editable={stepPhase === 'input'}
              />
              {stepPhase === 'feedback' && aiFeedback ? (
                <View style={styles.aiFeedback}>
                  <Text style={styles.aiBadge}>✨ AI 피드백</Text>
                  <Text style={styles.aiText}>{aiFeedback}</Text>
                </View>
              ) : null}
              {stepPhase === 'input' ? (
                <Pressable
                  style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
                  onPress={onPressNext}
                  disabled={isLoadingFeedback}>
                  {isLoadingFeedback ? (
                    <ActivityIndicator color="#F6F2EA" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>다음으로</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={onPressContinue}>
                  <Text style={styles.primaryBtnText}>{continueLabel}</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }
```

- [ ] **Step 3: `StyleSheet.create` 끝에 태블릿 스타일 추가**

`styles` 객체의 마지막 항목(`rememberBtnText`) 뒤에 추가:

```tsx
  // 태블릿 레이아웃
  tabletProgressBar: {
    marginHorizontal: BrandSpacing.md,
    marginTop: BrandSpacing.sm,
  },
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 55,
    borderRightWidth: 1,
    borderRightColor: '#D6E2D4',
  },
  tabletRight: {
    flex: 45,
  },
```

- [ ] **Step 4: iPad mini 시뮬레이터에서 확인**

- 좌: 단계 카드 (설명 + 예시)
- 우: 선택지 + 텍스트 입력 + AI 피드백 + 버튼
- 완료 화면(sessionComplete)은 모바일/태블릿 동일하게 중앙 정렬

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(tablet): review-session 2단 레이아웃 (좌 단계 55% / 우 입력 45%)"
```

---

## Task 4: `exam-result-screen-view.tsx` 태블릿 레이아웃

점수 카드(좌)와 CTA 버튼(우)을 나란히 배치한다.

**Files:**
- Modify: `features/quiz/exam/screens/exam-result-screen-view.tsx`

- [ ] **Step 1: import 추가**

파일 상단:
```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

- [ ] **Step 2: 태블릿 분기 추가**

`ExamResultScreenView` 함수 내부, `const insets = useSafeAreaInsets();` 바로 아래:
```tsx
const isTablet = useIsTablet();
```

그리고 기존 `return (` 위에 태블릿 분기 추가:

```tsx
  if (isTablet) {
    return (
      <View style={[styles.screen, { flex: 1 }]}>
        <View style={[styles.tabletHero, { paddingTop: insets.top + 24 }]}>
          <Text selectable style={styles.examTitle}>{examTitle}</Text>
          <Text selectable style={styles.heroLabel}>채점 결과</Text>
        </View>
        <View style={styles.tabletBody}>
          {/* 좌: 점수 카드 + 저장 상태 */}
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={styles.tabletLeftContent}>
            <View style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreStat}>
                  <Text selectable style={styles.scoreStatValue}>{result.totalScore}</Text>
                  <Text selectable style={styles.scoreStatLabel}>획득 점수</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreStat}>
                  <Text selectable style={styles.scoreStatValue}>{result.maxScore}</Text>
                  <Text selectable style={styles.scoreStatLabel}>만점</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreStat}>
                  <Text selectable style={[styles.scoreStatValue, styles.accuracyValue]}>
                    {result.accuracy}%
                  </Text>
                  <Text selectable style={styles.scoreStatLabel}>정답률</Text>
                </View>
              </View>
              <View style={styles.countRow}>
                <View style={[styles.countBadge, styles.correctBadge]}>
                  <Text selectable style={styles.countBadgeText}>정답 {result.correct}</Text>
                </View>
                <View style={[styles.countBadge, styles.wrongBadge]}>
                  <Text selectable style={styles.countBadgeText}>오답 {result.wrong}</Text>
                </View>
                {result.unanswered > 0 && (
                  <View style={[styles.countBadge, styles.unansweredBadge]}>
                    <Text selectable style={styles.countBadgeText}>미답변 {result.unanswered}</Text>
                  </View>
                )}
              </View>
            </View>
            {saveState === 'saving' && (
              <Text selectable style={styles.saveStatus}>결과 저장 중...</Text>
            )}
            {saveState === 'error' && (
              <Text selectable style={[styles.saveStatus, styles.saveError]}>
                결과 저장에 실패했습니다.
              </Text>
            )}
          </ScrollView>
          {/* 우: CTA */}
          <View style={[styles.tabletRight, { paddingBottom: insets.bottom + 32 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={onStartDiagnostic}
              style={styles.primaryCta}>
              <Text selectable style={styles.primaryCtaText}>약점 분석하러 가기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onReturnHome}
              style={styles.secondaryCta}>
              <Text selectable style={styles.secondaryCtaText}>홈으로 돌아가기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
```

- [ ] **Step 3: 태블릿 스타일 추가**

`StyleSheet.create` 안 마지막 항목 뒤에:

```tsx
  // 태블릿
  tabletHero: {
    alignItems: 'center',
    paddingBottom: BrandSpacing.sm,
    gap: 6,
    paddingHorizontal: BrandSpacing.lg,
  },
  tabletBody: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: BrandColors.border,
  },
  tabletLeftContent: {
    padding: BrandSpacing.lg,
    gap: BrandSpacing.lg,
  },
  tabletRight: {
    width: 320,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    justifyContent: 'center',
  },
```

- [ ] **Step 4: 시뮬레이터 확인 후 커밋**

```bash
git add features/quiz/exam/screens/exam-result-screen-view.tsx
git commit -m "feat(tablet): exam-result 2단 레이아웃 (점수 좌 / CTA 우)"
```

---

## Task 5: `quiz-result-screen-view.tsx` 태블릿 레이아웃

컨텐츠가 복잡하므로 2단 대신 maxWidth 720px 중앙 정렬을 적용한다.

**Files:**
- Modify: `features/quiz/components/quiz-result-screen-view.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

- [ ] **Step 2: `QuizResultScreenView` 함수 내부에 훅 호출 추가**

함수 진입부 최상단(기존 조건 분기 위):
```tsx
const isTablet = useIsTablet();
```

- [ ] **Step 3: 태블릿용 wrapper 스타일 적용**

기존 최상위 `<View style={styles.screen}>` 또는 `<ScrollView style={styles.screen}>` 태그를 아래로 교체:

```tsx
// 최상위 래퍼를 태블릿에서 중앙 정렬
<View style={styles.screen}>
  <View style={isTablet ? styles.tabletContainer : undefined}>
    {/* 기존 내용 전체 */}
  </View>
</View>
```

파일의 모든 최상위 `return` 분기(fallback 포함)에 동일하게 적용:
- fallback `<View>` 안 content를 `<View style={isTablet ? styles.tabletContainer : undefined}>` 로 감싼다.

- [ ] **Step 4: 스타일 추가**

`StyleSheet.create` 마지막에:
```tsx
  tabletContainer: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
```

- [ ] **Step 5: 시뮬레이터 확인 후 커밋**

```bash
git add features/quiz/components/quiz-result-screen-view.tsx
git commit -m "feat(tablet): quiz-result maxWidth 720 중앙 정렬"
```

---

## Task 6: `history-screen-view.tsx` 태블릿 레이아웃

차트와 목록 컨텐츠를 maxWidth 800px 중앙 정렬로 배치한다.

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

- [ ] **Step 2: 최상위 `HistoryScreenView` 컴포넌트 내부에 훅 추가 및 래퍼 적용**

컴포넌트 안 최상단:
```tsx
const isTablet = useIsTablet();
```

파일에서 ScrollView/View 최상위 반환 컨텐츠를 래퍼로 감싼다. 구체적으로, `HistoryScreenView`의 `return` 블록에서 ScrollView `contentContainerStyle` 또는 최상위 View에 태블릿 중앙 정렬 추가:

```tsx
// contentContainerStyle 에 태블릿 스타일 추가 (기존 스타일명: styles.container)
contentContainerStyle={[
  styles.container,
  isTablet && styles.tabletContainer,
]}
```

- [ ] **Step 3: 스타일 추가**

```tsx
  tabletContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
```

- [ ] **Step 4: 시뮬레이터 확인 후 커밋**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(tablet): history-screen maxWidth 800 중앙 정렬"
```

---

## Task 7: `quiz-hub-screen-view.tsx` 태블릿 레이아웃

홈 카드들을 maxWidth 720px 중앙 정렬로 배치한다.

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

- [ ] **Step 2: `QuizHubScreenView` 내부 훅 추가 및 ScrollView contentContainerStyle에 태블릿 스타일 적용**

`QuizHubScreenView` 안 최상단:
```tsx
const isTablet = useIsTablet();
```

`posterScreen` contentContainerStyle에 태블릿 스타일 추가:
```tsx
contentContainerStyle={[
  styles.posterScreen,
  isTablet && styles.tabletPosterScreen,
  {
    paddingTop: posterTopPadding,
    paddingBottom: bottomPadding,
    justifyContent: homeState?.latestDiagnosticSummary ? 'flex-start' : 'center',
  },
]}
```

- [ ] **Step 3: 스타일 추가**

```tsx
  tabletPosterScreen: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
```

- [ ] **Step 4: 시뮬레이터 확인 후 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(tablet): quiz-hub maxWidth 720 중앙 정렬"
```

---

## Task 8: `profile-screen-view.tsx` 태블릿 레이아웃

설정 항목을 maxWidth 680px 중앙 정렬로 배치한다.

**Files:**
- Modify: `features/profile/components/profile-screen-view.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

- [ ] **Step 2: `ProfileScreenView` 내부 훅 추가 및 ScrollView contentContainerStyle 수정**

컴포넌트 안 최상단:
```tsx
const isTablet = useIsTablet();
```

ScrollView의 `contentContainerStyle`에 태블릿 스타일 추가 (기존 스타일명: `styles.container`):
```tsx
contentContainerStyle={[
  styles.container,
  isTablet && styles.tabletContainer,
]}
```

- [ ] **Step 3: 스타일 추가**

```tsx
  tabletContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
```

- [ ] **Step 4: 시뮬레이터 확인 후 커밋**

```bash
git add features/profile/components/profile-screen-view.tsx
git commit -m "feat(tablet): profile-screen maxWidth 680 중앙 정렬"
```

---

## 최종 검증

- [ ] iPad mini 시뮬레이터(744×1133pt): 모든 화면 태블릿 레이아웃 확인
- [ ] iPhone 15 Pro Max 시뮬레이터(430×932pt): 모든 화면 모바일 레이아웃 유지 확인
- [ ] iPad landscape 전환 시 레이아웃 자동 재계산 확인 (useWindowDimensions 자동 처리)
- [ ] `npx expo start` TypeScript 빌드 오류 없음 확인

```bash
npx expo export --platform ios 2>&1 | tail -20
```
