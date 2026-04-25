# Quiz Hub Stale State Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 퀴즈 + 연습문제 완료 후 홈으로 돌아왔을 때 quiz hub가 여전히 "첫 진단평가를 시작해볼까요?"를 표시하는 버그를 수정한다.

**Architecture:**
두 가지 수정으로 구성된다. (1) `use-quiz-hub-screen.ts`에 `useFocusEffect`를 추가해 화면이 포커스를 받을 때마다 최신 summary를 로드한다. (2) `feedback.tsx`에서 `resetSession()` 호출 순서를 `router.replace()` 이후로 변경해, result 화면의 진단 저장이 완료되기 전에 `liveSummary`를 null로 만드는 사이드이펙트를 제거한다.

**Tech Stack:** React Native, Expo Router (`useFocusEffect`), React (`useRef`, `useCallback`)

---

## 버그 원인 요약

```
[진단화면] ──replace──▶ [결과화면] ──(auto-save 시작)
                              │
                              │ router.push
                              ▼
                         [연습화면] ──(weakness 저장 완료 후)──▶ [피드백화면]
                                                                      │
                                              resetSession()  ◀────────┤  ← 문제 ①
                                              router.replace ──────────┘
                                                    │
                                              [퀴즈허브]
                                         (useFocusEffect 없음)  ← 문제 ②
                                         → 최신 summary 미로드
                                         → "첫 진단 시작하기" 표시
```

**문제 ①** `resetSession()`이 `router.replace()` 보다 먼저 실행되어, result 화면의 `liveSummary`를 null로 만들고 `saveState`를 조기에 'saved'로 덮어쓸 위험이 있다.

**문제 ②** Quiz hub는 마운트 시 1회만 `refresh()`를 호출한다. 진단/연습 완료 후 돌아와도 `refresh()`가 재호출되지 않아 최신 `latestDiagnosticSummary`가 반영되지 않는다.

---

## 수정 범위

| 파일 | 변경 |
|------|------|
| `features/quiz/hooks/use-quiz-hub-screen.ts` | `useFocusEffect` 추가, `isFirstFocusRef`로 중복 호출 방지 |
| `app/(tabs)/quiz/feedback.tsx` | `resetSession()` 순서를 `router.replace()` 이후로 변경 |

---

## Task 1: feedback.tsx — resetSession() 순서 수정

**Files:**
- Modify: `app/(tabs)/quiz/feedback.tsx`

### 원인

`resetSession()`이 `router.replace('/(tabs)/quiz')` 보다 먼저 호출되면:
1. quiz session의 `state.result`가 즉시 `undefined`로 초기화됨
2. result 화면(스택에 아직 마운트된 상태)의 `liveSummary`가 null이 됨
3. Effect 1 (`useEffect([liveSummary, storedSummary?.attemptId])`)이 `setSaveState('saved')`를 호출
4. 진단 저장이 완료되지 않았어도 'saved'로 처리될 위험 발생

- [ ] **Step 1: 현재 코드 확인**

`app/(tabs)/quiz/feedback.tsx`의 "홈으로 이동" 버튼 핸들러:

```typescript
// 현재 (잘못된 순서)
onPress={() => {
  resetSession();              // ← state.result = undefined
  router.replace('/(tabs)/quiz');
}}
```

- [ ] **Step 2: 순서 변경**

`app/(tabs)/quiz/feedback.tsx`에서 버튼 핸들러를 수정한다:

```typescript
// 수정 후
onPress={() => {
  router.replace('/(tabs)/quiz');
  resetSession();              // navigation 이후 세션 초기화
}}
```

`router.replace`는 navigation 큐에 등록되고, `resetSession()`은 그 직후 dispatch된다. navigation이 실제로 커밋되는 시점(다음 렌더 사이클)에는 result 화면이 스택에서 제거되므로, `resetSession()`이 result 화면의 effect를 조기에 트리거하는 시간이 줄어든다.

- [ ] **Step 3: 수동 검증**

기기 또는 시뮬레이터에서:
1. 진단 퀴즈 10문제를 완료한다
2. 결과 화면에서 "연습문제 풀기"를 눌러 약점 연습으로 이동
3. 연습문제를 해결하고 피드백 화면에 진입
4. "홈으로 이동" 버튼 클릭
5. Metro 콘솔에 오류 없는지 확인

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/quiz/feedback.tsx
git commit -m "fix(quiz): resetSession을 router.replace 이후로 이동"
```

---

## Task 2: use-quiz-hub-screen.ts — useFocusEffect 추가

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

### 원인

퀴즈 허브는 스택의 바닥에 항상 마운트되어 있다. `router.replace('/(tabs)/quiz')`로 돌아올 때 remount가 일어나지 않으면 `useEffect([session?.accountKey])`는 재실행되지 않고, 따라서 `refresh()`도 호출되지 않는다. 진단이 저장됐더라도 최신 `summary`가 반영되지 않아 `homeState.journey.currentStepKey = 'diagnostic'`로 남는다.

- [ ] **Step 1: import 라인 수정**

`features/quiz/hooks/use-quiz-hub-screen.ts` 상단:

```typescript
// 수정 전
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

// 수정 후
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
```

- [ ] **Step 2: useFocusEffect 추가**

기존 `useEffect([session?.accountKey])` 블록 바로 아래에 추가한다:

```typescript
// 기존 mount-time effect (유지)
useEffect(() => {
  const accountKey = session?.accountKey;
  if (!accountKey) {
    return;
  }
  applyOverduePenalties(accountKey, hubReviewStore).then(() => {
    void rescheduleAllReviewNotifications(accountKey, hubReviewStore).catch(console.warn);
    void refresh();
  });
  // 마운트 시 1회만 실행 (overdue 패널티 적용 + 알림 재스케줄링)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [session?.accountKey]);

// 추가: 화면 포커스 시 상태 갱신
// 첫 포커스(마운트 시)는 위 useEffect가 담당하므로 두 번째 포커스부터 실행
const isFirstFocusRef = useRef(true);
useFocusEffect(
  useCallback(() => {
    if (isFirstFocusRef.current) {
      isFirstFocusRef.current = false;
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accountKey]),
);
```

**왜 `isFirstFocusRef`가 필요한가:**
- `useFocusEffect`는 초기 마운트 시에도 실행된다
- 마운트 시에는 이미 `useEffect`의 `applyOverduePenalties → refresh()` 체인이 실행된다
- 중복 `refresh()` 호출을 방지하기 위해 첫 포커스는 skip한다
- 이후 진단/연습/피드백에서 돌아오는 모든 focus 이벤트에서 `refresh()`가 실행된다

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd /Users/baggiyun/dev/dasida-app
npx tsc --noEmit 2>&1 | head -30
```

오류 없음 확인.

- [ ] **Step 4: 전체 흐름 수동 검증**

기기 또는 시뮬레이터에서:

1. **사전조건**: 기존 학습 기록 초기화 (설정 > 데이터 초기화 또는 로그아웃 후 재로그인)
2. 퀴즈 탭 진입 → "첫 진단 시작하기" 표시 확인
3. 진단 퀴즈 10문제 완료
4. 결과 화면에서 약점 연습으로 이동
5. 연습문제 해결 → 피드백 화면 → "홈으로 이동"
6. **기대 결과**: 홈이 "내 약점을 분석 중이에요..." 또는 "이제 연습할 시간!" 표시 (더 이상 "첫 진단 시작하기" 아님)

- [ ] **Step 5: Commit**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "fix(quiz-hub): 포커스 복귀 시 summary 갱신을 위해 useFocusEffect 추가"
```

---

## Task 3: 최종 검증 및 회귀 테스트

- [ ] **Step 1: 시나리오 A 전체 흐름 재검증**

| 단계 | 기대 화면 표시 |
|------|--------------|
| 앱 첫 실행 (기록 없음) | "반가워요! 첫 진단 평가를 시작해볼까요?" |
| 진단 완료 → 결과 화면 | 저장 완료 (saveState = 'saved') |
| 연습 완료 → 피드백 → 홈 | "내 약점을 분석 중이에요..." (**버그 수정 확인**) |
| 퀴즈 탭 나갔다 돌아오기 | 상태 유지 (불필요한 깜빡임 없음) |

- [ ] **Step 2: 탭 전환 시 불필요한 refresh 없음 확인**

Metro 콘솔에서:
1. 퀴즈 탭에 있다가 내 기록 탭으로 이동
2. 다시 퀴즈 탭으로 이동
3. `[CurrentLearnerProvider]` 관련 로그가 불필요하게 쏟아지지 않는지 확인

- [ ] **Step 3: Push**

```bash
git push origin main
npm run log:commit
```
