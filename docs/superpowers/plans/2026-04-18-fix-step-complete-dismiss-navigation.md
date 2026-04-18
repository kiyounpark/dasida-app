# step-complete X 버튼 네비게이션 Fix 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** step-complete(practice) 화면에서 X 버튼을 누르면 quiz hub(여정보드)로 직접 이동하도록 수정한다.

**Architecture:** `onDismissCallback`에서 `router.back()`(스택 히스토리 의존)을 `router.replace('/(tabs)/quiz')`(항상 quiz hub)로 교체한다. quiz hub CTA `open_exam → graduateToPractice` 처리는 이미 올바르게 구현되어 있어 변경 불필요하다.

**Tech Stack:** Expo Router (`router.replace`), TypeScript

---

## 파일 맵

| 파일 | 변경 내용 |
|------|-----------|
| `features/quiz/hooks/use-step-complete-screen.ts` | `onDismissCallback`: `router.back()` → `router.replace('/(tabs)/quiz')` |

---

## 원하는 흐름

```
step-complete(practice) X 누름
         ↓
router.replace('/(tabs)/quiz')
         ↓
quiz hub (여정보드, CTA: "실전 여정으로 떠나기 →" 표시됨)
         ↓ CTA 누름
graduateToPractice() 성공 → practiceGraduatedAt 설정
         ↓
JourneyBoard 사라짐 → 복습/학습 통계 UI
```

---

## Task 1: onDismissCallback 수정

**Files:**
- Modify: `features/quiz/hooks/use-step-complete-screen.ts:52-54`

- [x] **Step 1: 코드 수정**

```ts
// features/quiz/hooks/use-step-complete-screen.ts
const onDismissCallback = useCallback(() => {
  router.replace('/(tabs)/quiz');  // router.back() 에서 변경
}, []);
```

**Before:**
```ts
const onDismissCallback = useCallback(() => {
  router.back();
}, []);
```

**Why:** `router.back()`은 스택 히스토리에 의존한다. practice 화면은 result, feedback 등 다양한 경로에서 push될 수 있어, back()이 feedback이나 result로 돌아갈 수 있다. `router.replace('/(tabs)/quiz')`는 스택과 무관하게 항상 quiz hub로 이동한다.

- [x] **Step 2: TypeScript 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | tail -5
```

Expected: 출력 없음 (오류 없음)

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-step-complete-screen.ts
git commit -m "fix(step-complete): X 버튼 router.back() → router.replace('/(tabs)/quiz') — 스택 무관하게 여정보드로 직접 이동"
```

- [ ] **Step 4: 메인에 푸시**

```bash
git push origin main
```

---

## 검증 체크리스트

- [ ] step-complete(practice) X 버튼 누름 → quiz hub (여정보드) 도착
- [ ] quiz hub CTA "실전 여정으로 떠나기 →" 표시됨
- [ ] CTA 누름 → `graduateToPractice()` 호출 → JourneyBoard 사라짐
- [ ] result 화면에서 practice 진입 후 step-complete X 눌러도 quiz hub로 이동 (이전 버그 재현 안 됨)
- [ ] feedback 화면에서 practice 진입 후 step-complete X 눌러도 quiz hub로 이동
- [ ] diagnostic, analysis step에서는 X 버튼 없음 (변경 없음)
