# 비복습 날 홈 카드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 사이클에 진입했지만 오늘 due 복습이 없는 날, 여정 보드 대신 "오늘은 복습 없는 날" pill과 모의고사 추천 카드를 보여준다.

**Architecture:** `NoReviewDayCard` 컴포넌트를 신규 파일로 분리하고, `use-quiz-hub-screen.ts`에 `onPressExam` 핸들러를 추가한다. `quiz-hub-screen-view.tsx`에서 JourneyBoard 조건을 `nextReviewTask` 기준으로 확장하고 새 카드를 렌더링한다.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage (`LocalReviewTaskStore`)

---

## 파일 맵

| 작업 | 파일 |
|------|------|
| 신규 생성 | `features/quiz/components/no-review-day-card.tsx` |
| 수정 | `features/quiz/hooks/use-quiz-hub-screen.ts` |
| 수정 | `features/quiz/components/quiz-hub-screen-view.tsx` |

---

## Task 1: `NoReviewDayCard` 컴포넌트 작성

**Files:**
- Create: `features/quiz/components/no-review-day-card.tsx`

- [ ] **Step 1: 파일 생성**

`features/quiz/components/no-review-day-card.tsx`를 아래 내용으로 작성한다.

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';

function getDaysUntil(scheduledFor: string): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr);
  const target = new Date(scheduledFor.slice(0, 10));
  const diffMs = target.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

type Props = {
  nextTask: ActiveReviewTaskSummary;
  onPressExam: () => void;
};

export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const daysUntil = getDaysUntil(nextTask.scheduledFor);
  const pillText = `오늘은 복습 없는 날이에요 · 다음 복습 D-${daysUntil}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{pillText}</Text>
      </View>
      <View style={styles.examCard}>
        <Text style={styles.examTag}>오늘 복습 없음 · 실력 확인 추천</Text>
        <Text style={styles.examTitle}>잠깐 실력 확인해볼까요?</Text>
        <Text style={styles.examBody}>
          복습 사이 여유 있을 때 풀어보면 성장 곡선이 보입니다.
        </Text>
        <Pressable style={styles.examBtn} onPress={onPressExam} accessibilityLabel="모의고사 시작하기">
          <Text style={styles.examBtnText}>모의고사 시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 460,
    gap: BrandSpacing.sm,
  },
  pill: {
    backgroundColor: 'rgba(255, 252, 247, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  pillText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
  examCard: {
    backgroundColor: '#1C2C19',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  examTag: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(246, 242, 231, 0.5)',
  },
  examTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 26,
    color: '#F6F2E7',
  },
  examBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(246, 242, 231, 0.6)',
  },
  examBtn: {
    marginTop: BrandSpacing.xs,
    backgroundColor: '#F6F2E7',
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  examBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#1C2C19',
  },
});
```

- [ ] **Step 2: 타입 체크**

```bash
npm run typecheck
```

에러 없으면 통과.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/no-review-day-card.tsx
git commit -m "feat: NoReviewDayCard 컴포넌트 추가"
```

---

## Task 2: `use-quiz-hub-screen.ts`에 `onPressExam` 추가

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

- [ ] **Step 1: `UseQuizHubScreenResult` 타입에 `onPressExam` 추가**

`use-quiz-hub-screen.ts`의 `UseQuizHubScreenResult` 타입에 항목 추가:

```typescript
// 변경 전
export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressJourneyCta: () => void;
  onPressReviewCard: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};

// 변경 후 — onPressExam 한 줄 추가
export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressExam: () => void;
  onPressJourneyCta: () => void;
  onPressReviewCard: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};
```

- [ ] **Step 2: `onPressExam` 핸들러 구현 및 반환값에 추가**

`useQuizHubScreen` 함수 내부에 핸들러 추가 (`onPressReviewCard` 바로 뒤):

```typescript
const onPressExam = () => {
  router.push('/(tabs)/quiz/exams');
};
```

`return` 블록에 추가:

```typescript
return {
  authNoticeMessage: localAuthNoticeMessage,
  homeState,
  isCompactLayout: width < 390 || height < 780,
  isReady,
  journey: homeState?.journey ?? null,
  onDismissAuthNotice: () => {
    setLocalAuthNoticeMessage(null);
  },
  onOpenPractice,
  onOpenRecentResult,
  onPressExam,           // ← 추가
  onPressJourneyCta,
  onPressReviewCard,
  onRefresh: refresh,
  onStartDiagnostic,
  profile,
  session,
};
```

- [ ] **Step 3: 타입 체크**

```bash
npm run typecheck
```

에러 없으면 통과.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat: useQuizHubScreen에 onPressExam 핸들러 추가"
```

---

## Task 3: `quiz-hub-screen-view.tsx` 조건 변경 및 카드 연결

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: `NoReviewDayCard` import 추가**

파일 상단 import 목록에 추가:

```typescript
import { NoReviewDayCard } from '@/features/quiz/components/no-review-day-card';
```

- [ ] **Step 2: `QuizHubScreenView` props에 `onPressExam` 추가**

함수 시그니처의 비구조화 목록에 추가:

```tsx
export function QuizHubScreenView({
  authNoticeMessage,
  homeState,
  isCompactLayout,
  isReady,
  journey,
  onDismissAuthNotice,
  onPressExam,           // ← 추가
  onPressJourneyCta,
  onPressReviewCard,
  onRefresh,
  profile,
  session,
}: UseQuizHubScreenResult) {
```

- [ ] **Step 3: JourneyBoard 조건 변경**

```tsx
// 변경 전
{!profile?.practiceGraduatedAt ? (
  <JourneyBoard
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    onPressCta={onPressJourneyCta}
    state={journey}
  />
) : null}

// 변경 후
{!profile?.practiceGraduatedAt && !homeState?.nextReviewTask ? (
  <JourneyBoard
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    onPressCta={onPressJourneyCta}
    state={journey}
  />
) : null}
```

- [ ] **Step 4: NoReviewDayCard 렌더링 추가**

`ReviewHomeCard` 블록 바로 아래에 추가:

```tsx
{homeState?.nextReviewTask &&
  homeState.dueReviewTasks.length === 0 &&
  !profile?.practiceGraduatedAt ? (
  <NoReviewDayCard
    nextTask={homeState.nextReviewTask}
    onPressExam={onPressExam}
  />
) : null}
```

최종 렌더 순서:
1. `JourneyScreenHero`
2. `AuthNotice` (조건부)
3. `ReviewHomeCard` (복습 있는 날)
4. `NoReviewDayCard` (복습 없는 날, 복습 사이클 중)
5. `JourneyBoard` (온보딩 중, 복습 사이클 전)

- [ ] **Step 5: 타입 체크 및 린트**

```bash
npm run typecheck && npm run lint
```

에러 없으면 통과.

- [ ] **Step 6: 개발 시드로 수동 검증**

앱을 실행하고 dev guest 프로필 섹션에서 시드별로 확인:

| 시드 | 기대 결과 |
|------|-----------|
| `fresh` | 여정 보드 표시 |
| `day1` (복습 있는 날로 날짜 당기기 후) | ReviewHomeCard 표시, 여정 보드 없음 |
| `day3` | NoReviewDayCard 표시 (pill + 모의고사 카드), 여정 보드 없음 |
| `day7` | NoReviewDayCard 표시, 여정 보드 없음 |
| `practice-graduated` | MockExamIntroScreen |

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat: 비복습 날 NoReviewDayCard 연결 및 JourneyBoard 숨김 조건 변경"
```

---

## 검증 완료 기준

- `npm run typecheck` 통과
- `npm run lint` 통과
- `day3`/`day7` 시드에서 pill + 모의고사 카드 렌더링 확인
- `day1` (복습 당긴 날) ReviewHomeCard만 표시 확인
- `fresh` 시드에서 여정 보드 정상 표시 확인
- 모의고사 버튼 탭 → `/(tabs)/quiz/exams` 이동 확인
