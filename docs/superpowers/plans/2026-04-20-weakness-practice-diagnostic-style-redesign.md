# 약점 연습 진단 스타일 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 연습 화면을 약점 진단 10문제 풀이와 동일한 구조(본문 카드 내 인라인 선택지 + 원형 숫자 선택기 footer)로 재구성해 문제 본문 가시성을 회복하고, 진단/연습에서 공용으로 쓸 컴포넌트를 추출한다.

**Architecture:** `DiagnosticSolveHeader`/`DiagnosticQuestionCard`/`DiagnosticSolveExitModal` 세 컴포넌트를 `QuizSolveHeader`/`QuizQuestionCard`/`QuizSolveExitConfirmModal`로 일반화하고 연습 전용 `QuizPracticeFooter`·`GraduateFloatingBar`를 신설한다. `QuizSolveLayout`에 `footerSafeArea` prop을 추가해 졸업 바 노출 시 하단 safe-area 중복을 제거한다. 기존 비즈니스 로직(`use-practice-screen.ts`)은 파생값(`currentQuestionNumber`, `progressPercent`, exit modal state)만 확장하고 나머지는 그대로 둔다.

**Tech Stack:** Expo React Native (SDK 현행), TypeScript, expo-router, react-native-safe-area-context, react-native-reanimated.

**Spec:** [`docs/superpowers/specs/2026-04-20-weakness-practice-diagnostic-style-redesign.md`](../specs/2026-04-20-weakness-practice-diagnostic-style-redesign.md)

**Verification model:** 이 저장소에는 Jest 등 자동 단위테스트 러너가 없다. 각 태스크는 (1) `npx tsc --noEmit` 통과, (2) `npm run lint` 통과, (3) 해당 태스크의 수동 동작 확인 체크포인트로 검증한다. 최종 태스크(Task 10)에서 `npx expo run:ios`로 기기/시뮬레이터 상의 엔드투엔드 QA를 수행한다.

---

## 파일 구조

```
features/quiz/components/
  quiz-solve-header.tsx            (신규 — diagnostic-solve-header에서 이동 + title prop)
  quiz-question-card.tsx           (신규 — diagnostic-question-card에서 이동 + subtitle prop)
  quiz-solve-exit-confirm-modal.tsx (신규 — diagnostic-solve-exit-modal에서 이동 + copy props)
  quiz-practice-footer.tsx         (신규 — 선택/피드백 분기 푸터)
  graduate-floating-bar.tsx        (신규 — 축소된 졸업 바)
  quiz-solve-layout.tsx            (수정 — footerSafeArea prop)
  quiz-practice-screen-view.tsx    (수정 — 전면 재작성)
  diagnostic-screen-view.tsx       (수정 — 공용 컴포넌트 참조로 교체)
  diagnostic-quiz-stage.tsx        (수정 — 공용 컴포넌트 참조로 교체)

features/quiz/hooks/
  use-practice-screen.ts           (수정 — 카운터/프로그레스/exit modal 상태 추가)

(삭제)
  features/quiz/components/diagnostic-solve-header.tsx
  features/quiz/components/diagnostic-question-card.tsx
  features/quiz/components/diagnostic-solve-exit-modal.tsx
  features/quiz/components/quiz-practice-bottom-panel.tsx
```

---

## Task 1: `QuizSolveHeader` 공용화

**Files:**
- Create: `features/quiz/components/quiz-solve-header.tsx`
- Modify: `features/quiz/components/diagnostic-screen-view.tsx` (import 및 사용부)
- Delete: `features/quiz/components/diagnostic-solve-header.tsx`

- [ ] **Step 1: 신규 파일 작성**

`features/quiz/components/quiz-solve-header.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type QuizSolveHeaderProps = {
  currentQuestionNumber: number;
  isCompactLayout: boolean;
  onBackPress: () => void;
  progressPercent: `${number}%`;
  questionCount: number;
  title: string;
};

export function QuizSolveHeader({
  currentQuestionNumber,
  isCompactLayout,
  onBackPress,
  progressPercent,
  questionCount,
  title,
}: QuizSolveHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.wrap, isCompactLayout && styles.wrapCompact]}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityHint="현재 풀이를 나갈지 선택합니다"
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}>
            <IconSymbol color={BrandColors.primaryDark} name="chevron.left" size={isCompactLayout ? 22 : 24} />
            <Text style={[styles.backLabel, isCompactLayout && styles.backLabelCompact]}>
              Back
            </Text>
          </Pressable>

          <Text numberOfLines={1} style={[styles.title, isCompactLayout && styles.titleCompact]}>
            {title}
          </Text>

          <Text style={[styles.counter, isCompactLayout && styles.counterCompact]}>
            {currentQuestionNumber} / {questionCount}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPercent }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  wrapCompact: {
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
  },
  backLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 18,
    lineHeight: 24,
    color: BrandColors.primaryDark,
  },
  backLabelCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    flex: 1,
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: BrandColors.primaryDark,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  counter: {
    minWidth: 72,
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    color: BrandColors.primaryDark,
    textAlign: 'right',
  },
  counterCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E8E6E0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primaryDark,
  },
});
```

- [ ] **Step 2: `diagnostic-quiz-stage.tsx` 사용부 교체**

`features/quiz/components/diagnostic-quiz-stage.tsx` 의 import를 교체하고 사용 시 `title="약점 진단"` 명시:

```tsx
// import 라인 교체
import { QuizSolveHeader } from '@/features/quiz/components/quiz-solve-header';
```

`<DiagnosticSolveHeader ... />` 블록을 `<QuizSolveHeader ... title="약점 진단" />` 로 교체 (기존 props 그대로 + title 추가).

- [ ] **Step 3: 구 파일 삭제**

```bash
git rm features/quiz/components/diagnostic-solve-header.tsx
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS (오류 없음)

- [ ] **Step 5: 린트**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: 수동 확인 (선택)**

`npx expo run:ios` 실행 후 약점 진단 플로우에서 헤더 렌더링이 변경 전과 픽셀 수준에서 동일한지 확인. 시간 절약 위해 Task 10 최종 QA에서 한꺼번에 검증해도 무방.

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/components/quiz-solve-header.tsx features/quiz/components/diagnostic-quiz-stage.tsx
git commit -m "refactor(quiz): diagnostic-solve-header → quiz-solve-header로 공용화"
```

---

## Task 2: `QuizQuestionCard` 공용화 (+ subtitle prop)

**Files:**
- Create: `features/quiz/components/quiz-question-card.tsx`
- Modify: `features/quiz/components/diagnostic-quiz-stage.tsx` (import)
- Delete: `features/quiz/components/diagnostic-question-card.tsx`

- [ ] **Step 1: 신규 파일 작성**

`features/quiz/components/quiz-question-card.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { MathText, splitQuestionDisplaySegments } from '@/components/math/MathText';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'] as const;

export type QuizQuestionCardProps = {
  isCompactLayout: boolean;
  question: string;
  choices: string[];
  selectedIndex: number | null;
  subtitle?: string;
};

export function QuizQuestionCard({
  isCompactLayout,
  question,
  choices,
  selectedIndex,
  subtitle,
}: QuizQuestionCardProps) {
  const hasProminentFormula = splitQuestionDisplaySegments(question).some(
    (segment) => segment.kind === 'formula',
  );

  return (
    <View style={[styles.card, isCompactLayout && styles.cardCompact]}>
      {subtitle ? (
        <Text selectable style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}

      <MathText
        selectable
        text={question}
        style={[
          styles.questionText,
          hasProminentFormula && styles.questionTextWithFormula,
          isCompactLayout && styles.questionTextCompact,
          isCompactLayout && hasProminentFormula && styles.questionTextCompactFormula,
        ]}
      />

      {choices.length > 0 && (
        <View style={styles.choicesSection}>
          <View style={styles.divider} />
          {choices.map((choice, i) => {
            const isSelected = selectedIndex === i;
            return (
              <View key={i} style={styles.choiceRow}>
                <Text
                  selectable
                  style={[
                    styles.choiceLabel,
                    isCompactLayout && styles.choiceLabelCompact,
                    isSelected && styles.choiceLabelSelected,
                  ]}>
                  {CHOICE_LABELS[i] ?? `(${i + 1})`}
                </Text>
                <View style={styles.choiceTextWrap}>
                  <MathText
                    selectable
                    text={choice}
                    style={[
                      styles.choiceText,
                      isCompactLayout && styles.choiceTextCompact,
                      isSelected && styles.choiceTextSelected,
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'flex-start',
    boxShadow: '0 18px 36px rgba(36, 52, 38, 0.10)',
    gap: 0,
  },
  cardCompact: {
    minHeight: 180,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subtitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.primarySoft,
    marginBottom: 6,
  },
  questionText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#1D1B18',
    textAlign: 'left',
  },
  questionTextWithFormula: {
    lineHeight: 34,
  },
  questionTextCompact: {
    fontSize: 18,
    lineHeight: 28,
  },
  questionTextCompactFormula: {
    lineHeight: 32,
  },
  choicesSection: {
    marginTop: 10,
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.08)',
    marginBottom: 2,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  choiceLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#948E83',
    width: 22,
    flexShrink: 0,
  },
  choiceLabelCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  choiceLabelSelected: {
    color: BrandColors.primaryDark,
  },
  choiceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  choiceText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#3D3B36',
    textAlign: 'left',
  },
  choiceTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  choiceTextSelected: {
    color: BrandColors.primaryDark,
    fontFamily: FontFamilies.bold,
  },
});
```

- [ ] **Step 2: `diagnostic-quiz-stage.tsx` import 교체**

```tsx
// 교체
import { QuizQuestionCard } from '@/features/quiz/components/quiz-question-card';

// 사용부
body={
  <QuizQuestionCard
    choices={quizStage.problem.choices}
    isCompactLayout={isCompactLayout}
    question={quizStage.problem.question}
    selectedIndex={quizStage.selectedIndex}
  />
}
```

- [ ] **Step 3: 구 파일 삭제**

```bash
git rm features/quiz/components/diagnostic-question-card.tsx
```

- [ ] **Step 4: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/quiz-question-card.tsx features/quiz/components/diagnostic-quiz-stage.tsx
git commit -m "refactor(quiz): diagnostic-question-card → quiz-question-card로 공용화 + subtitle prop"
```

---

## Task 3: `QuizSolveLayout`에 `footerSafeArea` prop 추가

**Files:**
- Modify: `features/quiz/components/quiz-solve-layout.tsx`

- [ ] **Step 1: 수정**

`footerSafeArea?: boolean` (기본 true)을 추가하고 mobile 분기 `footerWrap`에 조건부 `paddingBottom`을 적용. 태블릿 분기는 기존 동작 유지.

```tsx
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { useIsTablet } from '@/hooks/use-is-tablet';

export type QuizSolveLayoutProps = {
  body: ReactNode;
  bodyContentContainerStyle?: StyleProp<ViewStyle>;
  footer: ReactNode;
  footerSafeArea?: boolean;
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
  footerSafeArea = true,
  header,
  screenBackgroundColor = BrandColors.background,
}: QuizSolveLayoutProps) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();

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

  const footerPaddingBottom = footerSafeArea ? Math.max(insets.bottom, 12) : 0;

  return (
    <View style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
      {header}
      <ScrollView
        style={styles.bodyScroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.bodyContent, bodyContentContainerStyle]}>
        {body}
      </ScrollView>
      <View style={[styles.footerWrap, { paddingBottom: footerPaddingBottom }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 3,
    borderRightWidth: 1,
    borderRightColor: 'rgba(41, 59, 39, 0.08)',
  },
  tabletLeftContent: {
    flexGrow: 1,
  },
  tabletRight: {
    flex: 2,
    backgroundColor: '#FFFFFF',
  },
  tabletRightContent: {
    flexGrow: 1,
  },
});
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/quiz-solve-layout.tsx
git commit -m "feat(quiz-solve-layout): footerSafeArea prop — 졸업 바 이중 safe-area 제거용"
```

---

## Task 4: `QuizSolveExitConfirmModal` 공용화 (copy props)

**Files:**
- Create: `features/quiz/components/quiz-solve-exit-confirm-modal.tsx`
- Modify: `features/quiz/components/diagnostic-screen-view.tsx` (import), `features/quiz/components/diagnostic-quiz-stage.tsx` (import)
- Delete: `features/quiz/components/diagnostic-solve-exit-modal.tsx`

- [ ] **Step 1: 신규 파일 작성**

`features/quiz/components/quiz-solve-exit-confirm-modal.tsx`:

```tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type QuizSolveExitConfirmModalProps = {
  body: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirmExit: () => void;
  title: string;
  visible: boolean;
};

export function QuizSolveExitConfirmModal({
  body,
  cancelLabel = '계속 풀기',
  confirmLabel = '나가기',
  onClose,
  onConfirmExit,
  title,
  visible,
}: QuizSolveExitConfirmModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text selectable style={styles.title}>
            {title}
          </Text>
          <Text selectable style={styles.body}>
            {body}
          </Text>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text selectable style={styles.secondaryLabel}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirmExit}
              style={styles.primaryButton}>
              <Text selectable style={styles.primaryLabel}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.xl,
    backgroundColor: 'rgba(21, 29, 22, 0.24)',
  },
  card: {
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
    boxShadow: '0 24px 44px rgba(25, 36, 28, 0.18)',
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: BrandColors.text,
  },
  body: {
    fontFamily: FontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryDark,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  secondaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    color: BrandColors.text,
  },
});
```

- [ ] **Step 2: 진단 측 사용부 교체**

`features/quiz/components/diagnostic-quiz-stage.tsx`:

```tsx
// import 교체
import { QuizSolveExitConfirmModal } from '@/features/quiz/components/quiz-solve-exit-confirm-modal';

// 사용부 교체 (기존 DiagnosticSolveExitModal → QuizSolveExitConfirmModal)
<QuizSolveExitConfirmModal
  body="지금까지 푼 답안은 저장되지 않아요. 나가면 처음부터 다시 시작해야 해요."
  onClose={quizStage.onCloseExitModal}
  onConfirmExit={quizStage.onConfirmExit}
  title="진단을 나갈까요?"
  visible={quizStage.isExitModalVisible}
/>
```

주의: `DiagnosticSolveExitModal`은 `diagnostic-quiz-stage.tsx`에서만 쓰인다. `diagnostic-screen-view.tsx`에는 별도 `DiagnosisExitConfirmModal`이 사용되며 이는 본 리팩터 범위 밖.

검증:
```bash
# 호출부 정리 확인
grep -r "DiagnosticSolveExitModal" features/ app/ | grep -v "node_modules" || echo "OK: 호출부 없음"
```

- [ ] **Step 3: 구 파일 삭제**

```bash
git rm features/quiz/components/diagnostic-solve-exit-modal.tsx
```

- [ ] **Step 4: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/quiz-solve-exit-confirm-modal.tsx features/quiz/components/diagnostic-quiz-stage.tsx
git commit -m "refactor(quiz): diagnostic-solve-exit-modal → quiz-solve-exit-confirm-modal로 공용화 (copy props)"
```

---

## Task 5: `GraduateFloatingBar` 신설

**Files:**
- Create: `features/quiz/components/graduate-floating-bar.tsx`

- [ ] **Step 1: 신규 파일 작성**

`features/quiz/components/graduate-floating-bar.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandSpacing } from '@/constants/brand';

export type GraduateFloatingBarProps = {
  disabled: boolean;
  isGraduating: boolean;
  onPress: () => void;
};

export function GraduateFloatingBar({ disabled, isGraduating, onPress }: GraduateFloatingBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + BrandSpacing.xs }]}>
      <BrandButton
        disabled={disabled}
        onPress={onPress}
        title={isGraduating ? '저장 중...' : '약점 연습 완료하기'}
        variant="neutral"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.xs,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
  },
});
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS (아직 사용처 없음, unused warning만 검토 — 컴포넌트는 export이므로 경고 없음)

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/graduate-floating-bar.tsx
git commit -m "feat(quiz): GraduateFloatingBar 컴포넌트 — 축소된 졸업 바, safe-area 단일 처리"
```

---

## Task 6: `QuizPracticeFooter` 신설 (선택/피드백 분기)

**Files:**
- Create: `features/quiz/components/quiz-practice-footer.tsx`

- [ ] **Step 1: 신규 파일 작성**

`features/quiz/components/quiz-practice-footer.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { BrandButton } from '@/components/brand/BrandButton';
import { MathText } from '@/components/math/MathText';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

type PracticeFeedback = NonNullable<UsePracticeScreenResult['feedback']>;

export type QuizPracticeFooterProps = Pick<
  UsePracticeScreenResult,
  | 'continueLabel'
  | 'feedback'
  | 'isPersistingAttempt'
  | 'onContinue'
  | 'onRetry'
  | 'onSelectChoice'
  | 'onSubmit'
  | 'persistErrorMessage'
  | 'selectedIndex'
> & {
  choiceCount: number;
  isCompactLayout: boolean;
  problemId: string;
};

export function QuizPracticeFooter({
  choiceCount,
  continueLabel,
  feedback,
  isCompactLayout,
  isPersistingAttempt,
  onContinue,
  onRetry,
  onSelectChoice,
  onSubmit,
  persistErrorMessage,
  problemId,
  selectedIndex,
}: QuizPracticeFooterProps) {
  if (!feedback) {
    const indices = Array.from({ length: choiceCount }, (_, i) => i);

    return (
      <View style={styles.panel}>
        <View accessibilityRole="radiogroup" style={styles.circleRow}>
          {indices.map((i) => {
            const isSelected = selectedIndex === i;
            return (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${i + 1}번`}
                hitSlop={isCompactLayout ? { top: 2, bottom: 2, left: 2, right: 2 } : undefined}
                onPress={() => onSelectChoice(i)}
                style={[
                  styles.circle,
                  isCompactLayout && styles.circleCompact,
                  isSelected ? styles.circleSelected : styles.circleIdle,
                ]}>
                <Text
                  style={[
                    styles.circleText,
                    isCompactLayout && styles.circleTextCompact,
                    isSelected ? styles.circleTextSelected : styles.circleTextIdle,
                  ]}>
                  {i + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <BrandButton
          disabled={selectedIndex === null}
          onPress={onSubmit}
          title="정답 확인"
        />
      </View>
    );
  }

  const actionTitle =
    feedback.kind === 'retry'
      ? '다시 도전'
      : feedback.kind === 'coaching'
        ? '이 포인트로 다시 풀기'
        : isPersistingAttempt
          ? '기록 저장 중...'
          : continueLabel;

  const actionVariant = feedback.kind === 'correct' ? 'success' : 'primary';

  const actionDisabled =
    (feedback.kind === 'correct' || feedback.kind === 'resolved') && isPersistingAttempt;

  return (
    <View
      style={[
        styles.panel,
        styles.feedbackPanel,
        feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
      ]}>
      <ScrollView
        style={styles.feedbackScroll}
        contentContainerStyle={styles.feedbackContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          key={`${problemId}_${feedback.kind}`}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(180)}
          layout={LinearTransition.duration(180)}
          style={styles.feedbackBodyWrap}>
          {renderPracticeFeedback(feedback)}
        </Animated.View>
      </ScrollView>

      <BrandButton
        disabled={actionDisabled}
        onPress={feedback.kind === 'retry' || feedback.kind === 'coaching' ? onRetry : onContinue}
        title={actionTitle}
        variant={actionVariant}
      />

      {persistErrorMessage ? (
        <Text selectable style={styles.feedbackErrorText}>
          {persistErrorMessage}
        </Text>
      ) : null}
    </View>
  );
}

function renderPracticeFeedback(feedback: PracticeFeedback) {
  return (
    <>
      <Text style={styles.feedbackTitle}>{feedback.title}</Text>
      <MathText selectable text={feedback.body} style={styles.feedbackBody} />

      {feedback.kind === 'coaching' ? (
        <>
          <View style={styles.feedbackFocusCard}>
            <Text style={styles.feedbackSectionLabel}>{feedback.focusTitle}</Text>
            <MathText selectable text={feedback.focusBody} style={styles.feedbackFocusBody} />
          </View>
          <Text style={styles.feedbackSupportText}>{feedback.supportText}</Text>
        </>
      ) : null}

      {feedback.kind === 'resolved' ? (
        <>
          <View style={styles.feedbackAnswerCard}>
            <Text style={styles.feedbackSectionLabel}>{feedback.answerLabel}</Text>
            <MathText selectable text={feedback.answerText} style={styles.feedbackAnswerValue} />
          </View>
          <MathText selectable text={feedback.explanation} style={styles.feedbackBody} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
  },
  circleRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompact: {
    width: 40,
    height: 40,
  },
  circleIdle: {
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    backgroundColor: '#FFFFFF',
  },
  circleSelected: {
    backgroundColor: BrandColors.primaryDark,
  },
  circleText: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  circleTextCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  circleTextIdle: {
    color: '#6B6560',
  },
  circleTextSelected: {
    color: '#FFFFFF',
  },
  feedbackPanel: {
    gap: 12,
  },
  feedbackCorrect: {
    backgroundColor: '#EEF9F1',
  },
  feedbackWrong: {
    backgroundColor: '#FFF9EE',
  },
  feedbackScroll: {
    width: '100%',
    flexShrink: 1,
  },
  feedbackContent: {
    flexGrow: 1,
  },
  feedbackBodyWrap: {
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.text,
  },
  feedbackBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  feedbackFocusCard: {
    borderWidth: 1,
    borderColor: '#E7D3A8',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  feedbackAnswerCard: {
    borderWidth: 1,
    borderColor: '#D9D1C2',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  feedbackSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6A1E',
  },
  feedbackFocusBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  feedbackSupportText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5B584F',
  },
  feedbackAnswerValue: {
    fontSize: 18,
    lineHeight: 24,
    color: BrandColors.text,
    fontWeight: '700',
  },
  feedbackErrorText: {
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.danger,
  },
});
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

주의: `UsePracticeScreenResult` 타입에 이 파일이 의존한다. `use-practice-screen.ts`의 export는 이미 존재 (`activeProblem`, `feedback` 등). 카운터 파생값은 Task 7에서 추가되며 이 컴포넌트는 그것들을 직접 참조하지 않으므로 순서 이슈 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/quiz-practice-footer.tsx
git commit -m "feat(quiz): QuizPracticeFooter — 원형 선택기 + 피드백 분기 푸터"
```

---

## Task 7: `use-practice-screen.ts` 카운터/프로그레스/exit modal 상태 추가

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`

- [ ] **Step 1: import 및 타입 확장**

파일 최상단 import에 `useEffect, useMemo, useRef, useState` 중 `useRef`를 추가(이미 `useState`, `useEffect`, `useMemo` import 되어 있음). `router`는 이미 import 되어 있음.

`UsePracticeScreenResult` 타입에 다음 키를 추가:

```ts
export type UsePracticeScreenResult = {
  // ... (기존 필드 유지)
  currentQuestionNumber: number;
  questionCount: number;
  progressPercent: `${number}%`;
  isExitModalVisible: boolean;
  onOpenExitModal: () => void;
  onCloseExitModal: () => void;
  onConfirmExit: () => void;
};
```

- [ ] **Step 2: 훅 본문 확장**

`usePracticeScreen` 함수 본문 안, `isGraduating` 상태 선언 바로 아래에 추가:

```ts
const [isExitModalVisible, setIsExitModalVisible] = useState(false);
const reviewQueueInitialCountRef = useRef<number | null>(null);
```

그리고 `activeMode` 산출 직후, `activeWeaknessId` useMemo 선언 아래에 review 모드 초기 큐 크기 스냅샷 로직 추가:

```ts
useEffect(() => {
  if (activeMode !== 'review') {
    reviewQueueInitialCountRef.current = null;
    return;
  }
  if (reviewQueueInitialCountRef.current === null) {
    reviewQueueInitialCountRef.current = reviewQueue.length;
  }
}, [activeMode, reviewQueue.length]);
```

카운터 파생값을 반환값 직전(함수 말미 `return {` 전) 추가:

```ts
const counter = (() => {
  if (activeMode === 'weakness' && state.result && state.practiceMode === 'weakness') {
    const total = Math.max(state.practiceQueue.length, 1);
    const current = Math.min(state.practiceIndex + 1, total);
    return { current, total };
  }

  if (activeMode === 'review') {
    const total = Math.max(reviewQueueInitialCountRef.current ?? reviewQueue.length, 1);
    const remaining = reviewQueue.length;
    const current = Math.min(Math.max(total - remaining + 1, 1), total);
    return { current, total };
  }

  return { current: 1, total: 1 };
})();

const progressPercent = `${Math.round((counter.current / counter.total) * 100)}%` as `${number}%`;
```

- [ ] **Step 3: 반환 객체 확장**

`return { ... }` 블록에 다음을 추가:

```ts
return {
  // ... 기존 반환값 전부 유지 ...
  currentQuestionNumber: counter.current,
  questionCount: counter.total,
  progressPercent,
  isExitModalVisible,
  onOpenExitModal: () => setIsExitModalVisible(true),
  onCloseExitModal: () => setIsExitModalVisible(false),
  onConfirmExit: () => {
    setIsExitModalVisible(false);
    router.replace('/(tabs)/quiz');
  },
};
```

- [ ] **Step 4: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 5: 동작 검증 (수동)**

`npx expo run:ios`로 약점 연습 진입 시 훅 반환값이 콘솔 로그나 화면 미확인 상태이면 Task 8 이후에 실제 값을 확인. 여기서는 타입 체크만 통과하면 OK.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts
git commit -m "feat(use-practice-screen): 카운터/프로그레스/exit modal 파생값 추가"
```

---

## Task 8: `quiz-practice-screen-view.tsx` 전면 재작성

**Files:**
- Modify: `features/quiz/components/quiz-practice-screen-view.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { GraduateFloatingBar } from '@/features/quiz/components/graduate-floating-bar';
import { QuizPracticeFooter } from '@/features/quiz/components/quiz-practice-footer';
import { QuizQuestionCard } from '@/features/quiz/components/quiz-question-card';
import { QuizSolveExitConfirmModal } from '@/features/quiz/components/quiz-solve-exit-confirm-modal';
import { QuizSolveHeader } from '@/features/quiz/components/quiz-solve-header';
import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

export function QuizPracticeScreenView({
  activeProblem,
  canGraduate,
  continueLabel,
  currentQuestionNumber,
  emptyActionLabel,
  emptyTitle,
  feedback,
  isExitModalVisible,
  isGraduating,
  isPersistingAttempt,
  onCloseExitModal,
  onConfirmExit,
  onContinue,
  onGraduate,
  onOpenExitModal,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
  persistErrorMessage,
  progressPercent,
  questionCount,
  screenTitle,
  selectedIndex,
  weaknessLabel,
}: UsePracticeScreenResult) {
  const { height, width } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;

  if (!activeProblem) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.emptyBody}>
          <View style={styles.emptyCard}>
            <Text style={styles.title}>{emptyTitle}</Text>
            <View style={styles.buttonTopGap}>
              <BrandButton title={emptyActionLabel} onPress={onViewResult} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <QuizSolveLayout
        body={
          <QuizQuestionCard
            choices={activeProblem.choices}
            isCompactLayout={isCompactLayout}
            question={activeProblem.question}
            selectedIndex={selectedIndex}
            subtitle={weaknessLabel}
          />
        }
        bodyContentContainerStyle={[styles.content, isCompactLayout ? styles.contentCompact : null]}
        footer={
          <QuizPracticeFooter
            choiceCount={activeProblem.choices.length}
            continueLabel={continueLabel}
            feedback={feedback}
            isCompactLayout={isCompactLayout}
            isPersistingAttempt={isPersistingAttempt}
            onContinue={onContinue}
            onRetry={onRetry}
            onSelectChoice={onSelectChoice}
            onSubmit={onSubmit}
            persistErrorMessage={persistErrorMessage}
            problemId={activeProblem.id}
            selectedIndex={selectedIndex}
          />
        }
        footerSafeArea={!canGraduate}
        header={
          <QuizSolveHeader
            currentQuestionNumber={currentQuestionNumber}
            isCompactLayout={isCompactLayout}
            onBackPress={onOpenExitModal}
            progressPercent={progressPercent}
            questionCount={questionCount}
            title={screenTitle}
          />
        }
        screenBackgroundColor={BrandColors.background}
      />

      {canGraduate ? (
        <GraduateFloatingBar
          disabled={isGraduating}
          isGraduating={isGraduating}
          onPress={onGraduate}
        />
      ) : null}

      <QuizSolveExitConfirmModal
        body="현재 풀던 문제는 저장되지 않아요. 연습 허브로 돌아갈까요?"
        onClose={onCloseExitModal}
        onConfirmExit={onConfirmExit}
        title="연습을 나갈까요?"
        visible={isExitModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 18,
  },
  contentCompact: {
    paddingTop: 8,
    paddingBottom: 10,
    gap: 16,
  },
  emptyBody: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#fff',
    marginTop: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  buttonTopGap: {
    marginTop: 20,
  },
});
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/quiz-practice-screen-view.tsx
git commit -m "feat(quiz-practice): 진단 스타일로 화면 재구성 — 본문 카드 + 원형 푸터 + 축소된 졸업 바"
```

---

## Task 9: `quiz-practice-bottom-panel.tsx` 삭제 확인

**Files:**
- Delete: `features/quiz/components/quiz-practice-bottom-panel.tsx`

- [ ] **Step 1: 참조 여부 확인**

Run:
```bash
grep -r "quiz-practice-bottom-panel" features/ app/ | grep -v "node_modules" || echo "OK: 참조 없음"
grep -r "QuizPracticeBottomPanel" features/ app/ | grep -v "node_modules" || echo "OK: 참조 없음"
```
Expected: "OK: 참조 없음" 두 줄 (Task 8 이후 모든 import 제거됨)

- [ ] **Step 2: 삭제**

```bash
git rm features/quiz/components/quiz-practice-bottom-panel.tsx
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git commit -m "chore(quiz): quiz-practice-bottom-panel 제거 (QuizPracticeFooter로 대체 완료)"
```

---

## Task 10: 엔드투엔드 수동 QA

**Files:** 없음 (실기기 동작 검증)

- [ ] **Step 1: 개발 빌드 기동**

Run: `npx expo run:ios`
Expected: 앱이 시뮬레이터에서 정상 기동. 로그에 Metro 번들러 준비 완료 메시지.

- [ ] **Step 2: 약점 진단 회귀 확인 (가장 먼저)**

체크리스트:
- [ ] 홈에서 "10문제 진단" 진입 → 인트로 → 진단 시작
- [ ] 상단 헤더: `Back` 버튼, "약점 진단" 타이틀, `n / 10` 카운터, 프로그레스 바가 시각적으로 변경 전과 동일
- [ ] 문제 카드: 문제 + 선택지 ①②③④⑤ 렌더 정상
- [ ] 하단 원형 1~5 선택 → 선택 스타일 정상
- [ ] 이전/다음 버튼 동작 정상
- [ ] Back 탭 → exit 확인 모달 표시 및 문구가 "진단을 나갈까요?"로 표시

- [ ] **Step 3: 약점 연습 진입 (세션 플로우)**

체크리스트:
- [ ] 진단 → 결과 → "약점 연습 시작" 진입
- [ ] iPhone SE/미니 시뮬레이터 기준 문제 본문이 스크롤 없이 최소 2~3줄 노출
- [ ] 카운터 `1 / N` (N = practiceQueue 길이) 정상 표시
- [ ] 원형 1~N 버튼 개수가 `choices.length`와 일치
- [ ] 선택 후 "정답 확인" 탭 → 피드백 표시

- [ ] **Step 4: 피드백 4분기 확인**

체크리스트:
- [ ] **correct**: 정답 선택 → 초록 배경, "좋아요..." 타이틀, 다음 버튼 `continueLabel`
- [ ] **coaching**: 1회 오답 → 노랑 배경, focus 카드, "이 포인트로 다시 풀기"
- [ ] **resolved**: 2회 오답 → "이번에는 해설까지..." + 정답 카드 + explanation
- [ ] **retry**: challenge 모드 오답 → retry 패널 (challenge URL 직접 진입으로 테스트: `/quiz/practice?mode=challenge`)
- [ ] `persistErrorMessage` 시뮬레이션 어려울 시 스킵 가능

- [ ] **Step 5: 졸업 바 동작**

체크리스트:
- [ ] 약점 1문제 정답 후 `continueLabel` 탭 → 다음 문제로 이동할 때 `canGraduate=true`로 바뀌며 `GraduateFloatingBar` 노출
- [ ] 졸업 바 하단 여백이 이전 대비 축소되고 safe-area 중복 없음 (육안 확인)
- [ ] "약점 연습 완료하기" 탭 → 버튼이 "저장 중..."으로 바뀌고 이동 후 `/(tabs)/quiz`로 이동
- [ ] `practiceGraduatedAt`이 이미 존재하는 사용자에서는 졸업 바 비노출

- [ ] **Step 6: Exit 모달**

체크리스트:
- [ ] 연습 화면에서 Back 탭 → 모달 표시, 타이틀 "연습을 나갈까요?", 바디 "현재 풀던 문제는..."
- [ ] "계속 풀기" → 모달 닫힘, 문제 유지
- [ ] "나가기" → `/(tabs)/quiz`로 이동

- [ ] **Step 7: 복습 모드 카운터**

체크리스트:
- [ ] 복습 대기 상태에서 `/quiz/practice?mode=review` 진입
- [ ] 카운터 `1 / (초기 큐 길이)` 표시
- [ ] 한 문제 해결 후 다음 복습 문제에서 `2 / (초기 큐 길이)` (초기 큐 길이 변하지 않음)

- [ ] **Step 8: 태블릿 레이아웃 회귀**

체크리스트:
- [ ] iPad 시뮬레이터에서 연습 진입 → 좌(문제 카드) 우(푸터: 원형+정답확인) 2컬럼 유지
- [ ] 태블릿 footer에도 safe-area 이슈 없음 (태블릿은 footerSafeArea 분기 사용 안함)

- [ ] **Step 9: 최종 타입/린트 통과 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 두 명령 모두 PASS

- [ ] **Step 10: 개발기록 커밋 마무리 (선택)**

`docs/PROGRESS.md` 에 요약 한 줄 추가:

```
- 2026-04-20 약점 연습 진단 스타일 리디자인 (본문 카드 + 원형 푸터 + safe-area 중복 제거)
```

Run:
```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): 약점 연습 진단 스타일 리디자인 기록"
```

- [ ] **Step 11: 원격 푸시 + 알림**

```bash
git push origin claude/dreamy-davinci-9ccedc
npm run log:commit
npm run notify:done -- "약점 연습 진단 스타일 리디자인 구현 완료"
```

- [ ] **Step 12: Notion 페이지 업데이트**

Notion "DASIDA 개발 기록"에서 본 스펙 페이지를 `notion-update-page`로:
- 상태: `구현완료`
- 구현완료일: 오늘 날짜(2026-04-20)
- Spec: 최종 커밋 해시 포함 GitHub permalink로 교체
- Plan: 본 플랜 파일 GitHub permalink 추가

---

## 실패/롤백 가이드

각 태스크는 단일 커밋으로 묶인다. 만약 특정 태스크 이후 회귀가 발견되면 해당 커밋만 `git revert <hash>`로 되돌리고 재작업한다. 특히 Task 3(footerSafeArea) 회귀 시 진단 화면의 safe-area가 변하지 않는지 먼저 확인.

Task 7(훅 확장)은 기존 반환값을 전혀 건드리지 않고 추가만 한다 — 기존 view가 정상 동작하는 상태를 유지. Task 8 완료 전까지 앱은 컴파일만 통과하면 실행 가능.

## 비고

- `BrandButton`에 `outline` variant가 없어 스펙 §11의 오픈 이슈는 `neutral` 유지로 결정. 졸업 바는 neutral variant + 축소 패딩(`GraduateFloatingBar`의 paddingTop `xs`)으로 톤다운.
- `QuizSolveExitConfirmModal`는 진단/연습 공용. 진단에서 본 리팩터 이후 발견되는 회귀는 copy 불일치(기본 cancel/confirm 라벨) 외에는 없어야 한다.
- Challenge(심화) 모드는 카운터 `1 / 1` 고정. 본 플랜에서 별도 분기 테스트는 Task 10 Step 4의 retry 확인으로 대체.
