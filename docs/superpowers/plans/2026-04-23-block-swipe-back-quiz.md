# 퀴즈 세션 iOS 스와이프 뒤로가기 차단 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 퀴즈 풀기(10문제)와 약점 연습 중 iOS 스와이프 백 제스처를 차단하고, 헤더 아이콘 버튼으로만 나가기 확인 모달을 열 수 있게 한다.

**Architecture:** `app/quiz/_layout.tsx`의 Stack.Screen options에 `gestureEnabled: false`를 추가해 iOS 스와이프를 차단한다. `quiz-solve-header.tsx`에서 "Back" 텍스트를 제거해 아이콘만 남긴다. 나가기 모달과 onBackPress 로직은 이미 구현되어 있으므로 건드리지 않는다.

**Tech Stack:** Expo Router (Stack Navigator), React Native, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-23-block-swipe-back-quiz-design.md`

---

## File Map

| 파일 | 역할 | 변경 종류 |
|---|---|---|
| `app/quiz/_layout.tsx` | 퀴즈 플로우 Stack 네비게이터 레이아웃 | Modify |
| `features/quiz/components/quiz-solve-header.tsx` | 퀴즈 풀기 헤더 컴포넌트 (아이콘 + 제목 + 카운터) | Modify |

---

## Task 1: 스와이프 차단 — layout gestureEnabled

**Files:**
- Modify: `app/quiz/_layout.tsx`

- [ ] **Step 1: `diagnostic`과 `practice` 스크린에 `gestureEnabled: false` 추가**

`app/quiz/_layout.tsx` 전체를 아래로 교체:

```tsx
import { Stack } from 'expo-router';
import { QuizSessionProvider } from '@/features/quiz/session';

export default function QuizFlowLayout() {
  return (
    <QuizSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="diagnostic" options={{ title: '10문제 체험', gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ title: '판정 결과' }} />
        <Stack.Screen name="practice" options={{ title: '연습문제', gestureEnabled: false }} />
        <Stack.Screen name="feedback" options={{ title: '피드백' }} />
        <Stack.Screen name="review-session" options={{ title: '복습 세션' }} />
        <Stack.Screen name="step-complete" options={{ title: '완료' }} />
        <Stack.Screen name="exam" />
      </Stack>
    </QuizSessionProvider>
  );
}
```

- [ ] **Step 2: TypeScript 타입 에러 없음 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "quiz/_layout|error" | head -20
```

Expected: 에러 없음 (빈 출력 또는 무관한 기존 에러만)

- [ ] **Step 3: Commit**

```bash
git add app/quiz/_layout.tsx
git commit -m "feat(quiz): iOS 스와이프 뒤로가기 차단 — diagnostic, practice"
```

---

## Task 2: 헤더 "Back" 텍스트 제거

**Files:**
- Modify: `features/quiz/components/quiz-solve-header.tsx`

- [ ] **Step 1: `<Text>Back</Text>`와 관련 스타일 제거**

`features/quiz/components/quiz-solve-header.tsx` 전체를 아래로 교체:

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
            accessibilityLabel="나가기"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}>
            <IconSymbol color={BrandColors.primaryDark} name="chevron.left" size={isCompactLayout ? 22 : 24} />
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
    minWidth: 40,
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
    minWidth: 40,
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

변경 요약:
- `accessibilityLabel` "뒤로가기" → "나가기"
- `<Text style={[styles.backLabel, ...]}>Back</Text>` 삭제
- `backButton.minWidth` 72 → 40 (텍스트 없으므로 축소)
- `counter.minWidth` 72 → 40 (좌우 균형 유지)
- `backLabel`, `backLabelCompact` 스타일 완전 삭제

- [ ] **Step 2: TypeScript 타입 에러 없음 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "quiz-solve-header|error" | head -20
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/quiz-solve-header.tsx
git commit -m "fix(quiz): 헤더 Back 텍스트 제거 — 아이콘만 유지"
```

---

## Task 3: iOS 시뮬레이터 검증

> 자동화 테스트가 없는 제스처/UI 동작이므로 수동 검증.

- [ ] **Step 1: 시뮬레이터 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: 10문제 풀기 스와이프 차단 확인**

1. 앱에서 "10문제 약점 진단" 시작
2. 문제 화면에서 왼쪽 가장자리에서 오른쪽으로 스와이프
3. Expected: **화면이 움직이지 않음** (이전처럼 뒤로 나가지지 않음)

- [ ] **Step 3: 10문제 풀기 나가기 버튼 확인**

1. 헤더 좌상단 `‹` 아이콘 탭
2. Expected: "진단을 나갈까요?" 모달 표시
3. "계속 풀기" → 모달 닫히고 세션 유지
4. 다시 아이콘 탭 → "나가기" → 퀴즈 허브로 이동, 세션 리셋

- [ ] **Step 4: 약점 연습 스와이프 차단 확인**

1. 약점 연습 시작 (`/quiz/practice?mode=weakness`)
2. 스와이프 시도 → **화면 고정**
3. `‹` 아이콘 탭 → "연습을 나갈까요?" 모달 표시
4. "계속 풀기" → 세션 유지
5. "나가기" → 퀴즈 허브 이동

- [ ] **Step 5: 오답 진단 단계 스와이프 차단 확인**

1. 10문제 풀기 완료 후 오답 진단 단계(`isDiagnosing`)로 진입
2. 스와이프 시도 → **화면 고정**
3. `← 뒤로` 버튼 탭 → 진단 종료 확인 모달 표시

- [ ] **Step 6: 다른 화면 회귀 확인**

1. `/quiz/result`, `/quiz/feedback`, `/quiz/step-complete` 진입
2. 스와이프 → **정상 뒤로가기 동작** (차단되지 않아야 함)

- [ ] **Step 7: 헤더 레이아웃 확인**

- `‹` 아이콘만 보이고 "Back" 텍스트 없음
- 제목 중앙 정렬 유지
- 우측 카운터(X / N) 균형 확인

- [ ] **Step 8: 최종 커밋 및 푸시**

```bash
git log --oneline -3
git push origin main
npm run log:commit
```

---

## 검증 체크리스트 요약

| 항목 | 확인 방법 |
|---|---|
| 스와이프 차단 (diagnostic) | 시뮬레이터 제스처 |
| 스와이프 차단 (practice) | 시뮬레이터 제스처 |
| 나가기 모달 동작 | 아이콘 탭 → 모달 |
| 세션 유지 (계속 풀기) | 모달 확인 |
| 세션 리셋 (나가기) | 퀴즈 허브 이동 |
| 다른 화면 회귀 없음 | result/feedback 스와이프 |
| 헤더 아이콘만 표시 | 시각 확인 |
