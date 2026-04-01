# 기출 풀기 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기출 풀기 화면에서 짧은 이미지일 때 빈 공간을 도트 그리드 + 진행바 패널로 채우고, 헤더에서 점수를 제거하고 북마크 버튼을 추가한다.

**Architecture:** `QuizSolveLayout`의 body ScrollView를 그대로 활용하여 이미지 아래에 `ExamProgressPanel`을 쌓는다. 북마크 상태는 `useExamSolveScreen` 훅 내부의 `useState`로 세션 로컬 관리한다. 헤더는 점수 대신 북마크 아이콘 버튼으로 교체한다.

**Tech Stack:** React Native (StyleSheet), Expo Router, TypeScript

---

## 파일 맵

| 파일 | 역할 |
|------|------|
| `features/quiz/exam/hooks/use-exam-solve-screen.ts` | 북마크 상태 추가, `totalScore` 노출 제거 |
| `features/quiz/exam/components/exam-solve-header.tsx` | 점수 제거, 북마크 버튼 추가 |
| `features/quiz/exam/components/exam-progress-panel.tsx` | 신규: 도트 그리드 + 진행바 패널 |
| `features/quiz/exam/screens/exam-solve-screen.tsx` | body 구조 변경, 새 컴포넌트 연결 |

---

## Task 1: `useExamSolveScreen` — 북마크 상태 추가 + 점수 노출 제거

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-solve-screen.ts`

- [ ] **Step 1: `UseExamSolveScreenResult` 타입 수정**

`totalScore`를 제거하고 북마크·진행 관련 필드를 추가한다.

```typescript
export type UseExamSolveScreenResult = {
  examId: string;
  currentProblem: ReturnType<typeof getExamProblems>[number] | null;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  // totalScore 제거
  answeredIndices: number[];     // 추가: 답변 완료 인덱스 목록
  currentAnswer: number | null;
  shortAnswerText: string;
  isCompactLayout: boolean;
  canGoPrev: boolean;
  isLast: boolean;
  imageKey: string;
  bookmarkedIndices: number[];    // 추가
  isCurrentBookmarked: boolean;  // 추가
  onToggleBookmark: () => void;  // 추가
  onSelectChoice: (n: number) => void;
  onChangeShortAnswer: (text: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
};
```

- [ ] **Step 2: 훅 본문에 북마크 state 추가**

`shortAnswerText` useState 선언 바로 아래에 추가한다.

```typescript
const [bookmarkedIndices, setBookmarkedIndices] = useState<number[]>([]);
```

- [ ] **Step 3: 파생값 + 핸들러 추가**

`imageKey` 계산 바로 위에 추가한다.

```typescript
const answeredIndices = state.answers
  .map((a, i) => (a !== null ? i : null))
  .filter((i): i is number => i !== null);

const isCurrentBookmarked = bookmarkedIndices.includes(state.currentIndex);

const handleToggleBookmark = () => {
  setBookmarkedIndices((prev) =>
    prev.includes(state.currentIndex)
      ? prev.filter((i) => i !== state.currentIndex)
      : [...prev, state.currentIndex]
  );
};
```

- [ ] **Step 4: return 값 수정**

`totalScore` 줄을 제거하고 `answeredIndices`·북마크 관련 필드를 추가한다.

```typescript
return {
  examId: state.examId,
  currentProblem,
  currentIndex: state.currentIndex,
  totalCount: state.problems.length,
  answeredCount,
  // totalScore 제거
  answeredIndices,
  currentAnswer,
  shortAnswerText,
  isCompactLayout,
  canGoPrev: state.currentIndex > 0,
  isLast: state.currentIndex === state.problems.length - 1,
  imageKey,
  bookmarkedIndices,
  isCurrentBookmarked,
  onToggleBookmark: handleToggleBookmark,
  onSelectChoice: handleSelectChoice,
  onChangeShortAnswer: (text) => {
    setShortAnswerText(text);
    const num = parseInt(text, 10);
    setAnswer(state.currentIndex, text === '' ? null : isNaN(num) ? null : num);
  },
  onPrev: handlePrev,
  onNext: handleNext,
  onExit: handleExit,
};
```

- [ ] **Step 5: TypeScript 오류 없는지 확인**

```bash
npx tsc --noEmit 2>&1 | grep "use-exam-solve-screen"
```

Expected: 출력 없음 (오류 없음)

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-solve-screen.ts
git commit -m "feat: 기출 풀기 훅에 북마크 상태 추가, 점수 노출 제거"
```

---

## Task 2: 신규 컴포넌트 `ExamProgressPanel` 생성

**Files:**
- Create: `features/quiz/exam/components/exam-progress-panel.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
import { StyleSheet, View, Text } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type ExamProgressPanelProps = {
  totalCount: number;
  currentIndex: number;       // 0-based
  answeredIndices: number[];  // 답변 완료한 문제 인덱스 목록
  bookmarkedIndices: number[]; // 북마크한 문제 인덱스 목록
};

export function ExamProgressPanel({
  totalCount,
  currentIndex,
  answeredIndices,
  bookmarkedIndices,
}: ExamProgressPanelProps) {
  const answered = new Set(answeredIndices);
  const bookmarked = new Set(bookmarkedIndices);
  const progressRatio = totalCount > 0 ? answeredIndices.length / totalCount : 0;

  return (
    <View style={styles.panel}>
      {/* 진행바 */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>진행률</Text>
        <Text style={styles.progressCount}>
          {answeredIndices.length} / {totalCount}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` as `${number}%` }]} />
      </View>

      {/* 도트 그리드 */}
      <View style={styles.grid}>
        {Array.from({ length: totalCount }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = answered.has(i);
          const isBookmarked = bookmarked.has(i);

          return (
            <View
              key={i}
              style={[
                styles.dot,
                isCurrent && styles.dotCurrent,
                !isCurrent && isBookmarked && styles.dotBookmarked,
                !isCurrent && !isBookmarked && isAnswered && styles.dotAnswered,
              ]}
            />
          );
        })}
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotAnswered]} />
          <Text style={styles.legendText}>답변</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotBookmarked]} />
          <Text style={styles.legendText}>북마크</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotCurrent]} />
          <Text style={styles.legendText}>현재</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#8E8A81',
  },
  progressCount: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 16,
    color: BrandColors.primarySoft,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E0DDD7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: BrandColors.primarySoft,
    borderRadius: 999,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dot: {
    width: '8%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#E0DDD7',
  },
  dotAnswered: {
    backgroundColor: BrandColors.primarySoft,
  },
  dotBookmarked: {
    backgroundColor: '#F5DFA0',
  },
  dotCurrent: {
    backgroundColor: BrandColors.primaryDark,
    borderWidth: 2,
    borderColor: BrandColors.primarySoft,
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  legendText: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
    color: '#8E8A81',
  },
});
```

- [ ] **Step 2: TypeScript 오류 없는지 확인**

```bash
npx tsc --noEmit 2>&1 | grep "exam-progress-panel"
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/components/exam-progress-panel.tsx
git commit -m "feat: ExamProgressPanel 컴포넌트 생성 (도트 그리드 + 진행바)"
```

---

## Task 3: `ExamSolveHeader` — 점수 제거, 북마크 버튼 추가

**Files:**
- Modify: `features/quiz/exam/components/exam-solve-header.tsx`

- [ ] **Step 1: Props 타입 수정**

`score` 제거, `isBookmarked` + `onToggleBookmark` 추가.

```typescript
type ExamSolveHeaderProps = {
  currentNumber: number;
  totalCount: number;
  answeredCount: number;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onExit: () => void;
  isCompactLayout: boolean;
};
```

- [ ] **Step 2: 컴포넌트 본문 수정**

`score` 파라미터 제거, 오른쪽 영역을 북마크 버튼으로 교체.

```typescript
export function ExamSolveHeader({
  currentNumber,
  totalCount,
  answeredCount,
  isBookmarked,
  onToggleBookmark,
  onExit,
  isCompactLayout,
}: ExamSolveHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + (isCompactLayout ? 8 : 12) }]}>
      <Pressable accessibilityRole="button" onPress={onExit} style={styles.exitButton}>
        <Text style={styles.exitText}>나가기</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.problemNumber}>{currentNumber}번</Text>
        <Text style={styles.progressText}>
          {answeredCount}/{totalCount} 답변
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? '북마크 해제' : '북마크 추가'}
        onPress={onToggleBookmark}
        style={[styles.bookmarkButton, isBookmarked && styles.bookmarkButtonActive]}>
        <Text style={styles.bookmarkIcon}>🔖</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: styles 수정**

`scoreWrap`, `scoreValue` 제거. `bookmarkButton`, `bookmarkButtonActive`, `bookmarkIcon` 추가.

```typescript
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: BrandColors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(41, 59, 39, 0.08)',
    gap: 8,
  },
  exitButton: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    minWidth: 48,
  },
  exitText: {
    fontFamily: FontFamilies.medium,
    fontSize: 15,
    lineHeight: 20,
    color: '#8E8A81',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  problemNumber: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    color: '#1B1A17',
  },
  progressText: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#AEAAA2',
  },
  bookmarkButton: {
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F5F4F1',
    borderWidth: 1,
    borderColor: '#E0DDD7',
  },
  bookmarkButtonActive: {
    backgroundColor: '#FFF8EC',
    borderColor: '#F5DFA0',
  },
  bookmarkIcon: {
    fontSize: 16,
  },
});
```

- [ ] **Step 4: TypeScript 오류 없는지 확인**

```bash
npx tsc --noEmit 2>&1 | grep "exam-solve-header"
```

Expected: 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/components/exam-solve-header.tsx
git commit -m "feat: ExamSolveHeader 점수 제거, 북마크 버튼 추가"
```

---

## Task 4: `ExamSolveScreen` — body 구조 변경 및 컴포넌트 연결

**Files:**
- Modify: `features/quiz/exam/screens/exam-solve-screen.tsx`

- [ ] **Step 1: 파일 전체 교체**

```typescript
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import examImages from '@/features/quiz/data/exam-images';

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

  // 이미지 자연 비율을 동적으로 측정
  const [imageAspectRatio, setImageAspectRatio] = useState<number | undefined>(undefined);
  const handleImageLoad = useCallback(
    (e: { source: { width: number; height: number } }) => {
      if (e.source.width > 0 && e.source.height > 0) {
        setImageAspectRatio(e.source.width / e.source.height);
      }
    },
    []
  );

  if (!currentProblem) return null;

  const imageSource = examImages[imageKey];
  const isShortAnswer = currentProblem.type === 'short_answer';

  return (
    <QuizSolveLayout
      header={
        <ExamSolveHeader
          currentNumber={currentProblem.number}
          totalCount={totalCount}
          answeredCount={answeredCount}
          isBookmarked={isCurrentBookmarked}
          onToggleBookmark={onToggleBookmark}
          onExit={onExit}
          isCompactLayout={isCompactLayout}
        />
      }
      body={
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
      }
      footer={
        isShortAnswer ? (
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
        )
      }
    />
  );
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
});
```

- [ ] **Step 2: TypeScript 전체 오류 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/screens/exam-solve-screen.tsx
git commit -m "feat: 기출 풀기 화면 body 구조 변경, ExamProgressPanel 연결"
```

---

## Task 5: 수동 검증

- [ ] **Step 1: 시뮬레이터 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: 짧은 이미지 문제 확인**

기출 풀기 → 아무 시험 선택 → 앞 번호 문제(보통 짧은 이미지) 확인.
- 이미지 아래 그리드 패널이 보이는지
- 진행바가 답변 수에 맞게 채워지는지
- 도트 색상: 현재 문제(다크), 미응답(회색)

- [ ] **Step 3: 북마크 동작 확인**

헤더 오른쪽 북마크 버튼 탭.
- 버튼 배경이 노란색으로 바뀌는지
- 그리드에서 해당 문제 도트가 노란색으로 바뀌는지
- 다시 탭하면 해제되는지

- [ ] **Step 4: 긴 이미지 문제 확인**

킬러 문제(28~30번) 이동 후 스크롤 확인.
- 이미지가 온전히 보이는지 (잘리지 않음)
- 스크롤 내리면 그리드 패널이 보이는지

- [ ] **Step 5: 답변 → 도트 색상 변경 확인**

보기 선택 후 다음 문제로 이동.
- 이전 문제 도트가 초록색으로 바뀌는지

- [ ] **Step 6: 최종 커밋 + 푸시**

```bash
git push origin main
npm run log:commit
```
