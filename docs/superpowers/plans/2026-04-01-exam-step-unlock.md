# Exam Step Unlock & Feedback Submit Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 연습을 1회 이상 완료하면 여정 보드의 exam 단계가 잠금 해제되고, 피드백 화면 제출 버튼이 퀴즈 홈으로 이동한다.

**Architecture:** `home-journey-state.ts`의 순수 상태 머신 함수 4개를 완성해 exam 단계를 처리하고, `use-quiz-hub-screen.ts`에 `open_exam` CTA 라우팅을 추가한다. `feedback.tsx` 제출 버튼은 기존 `resetSession` + `router.replace` 패턴을 그대로 사용한다.

**Tech Stack:** TypeScript, Expo Router, React Native — 네이티브 빌드 불필요 (JS-only 변경)

**Skills:**
- `dasida-code-structure` — Thin Screen / hook 분리 기준 적용 판단 (Task 3)
- `building-native-ui` — Expo Router `router.push` vs `router.replace` 선택 기준 (Task 2, 3)

---

## 사전 상태 (시작 전 확인)

`home-journey-state.ts`에는 이전 세션에서 적용된 미커밋 변경이 2개 있다:

1. `JourneyCtaAction` 타입에 `'open_exam'` 추가됨
2. `getCurrentStep()`이 `hasReviewAfterLatestDiagnostic`일 때 `'exam'` 반환

이 파일은 커밋되지 않은 상태이므로 Task 1 완료 후 함께 커밋한다.

---

## File Structure

| 파일 | 역할 | 변경 종류 |
|------|------|-----------|
| `features/learning/home-journey-state.ts` | Journey 상태 머신 — exam 단계 완성 | Modify (already partially edited) |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | 허브 CTA `open_exam` → `/quiz/exams` 라우팅 | Modify |
| `app/(tabs)/quiz/feedback.tsx` | 제출 버튼에 세션 초기화 + 홈 이동 추가 | Modify |

---

## Task 1: `home-journey-state.ts` — exam 단계 처리 완성

**Files:**
- Modify: `features/learning/home-journey-state.ts`

**dasida-code-structure 참고:** 이 파일은 순수 계산 함수만 있는 domain 모듈이다. hook/screen이 아니므로 hook 분리 체크리스트 대상이 아니다. 수정 범위는 함수 내부 케이스 추가만이다.

이 파일에는 이미 `JourneyCtaAction`과 `getCurrentStep` 변경이 적용돼 있다.
남은 4개 함수를 완성한다.

- [ ] **Step 1: `getStepStatus()` — exam 활성 케이스 추가**

현재 `getStepStatus()`는 `currentStep === 'review'`가 마지막 케이스라 `currentStep === 'exam'`일 때 review 로직으로 처리된다 (exam은 `'pending'`으로 잘못 표시됨).

`features/learning/home-journey-state.ts:99-125`를 아래로 교체:

```ts
function getStepStatus(
  currentStep: JourneyStepKey,
  step: JourneyStepKey,
): JourneyStepStatus {
  if (currentStep === 'diagnostic') {
    return step === 'diagnostic' ? 'active' : 'locked';
  }

  if (currentStep === 'analysis') {
    if (step === 'diagnostic') {
      return 'completed';
    }

    if (step === 'analysis') {
      return 'active';
    }

    return step === 'review' ? 'pending' : 'locked';
  }

  if (currentStep === 'review') {
    if (step === 'diagnostic' || step === 'analysis') {
      return 'completed';
    }

    return step === 'review' ? 'active' : 'pending';
  }

  // currentStep === 'exam'
  if (step === 'exam') {
    return 'active';
  }
  return 'completed';
}
```

- [ ] **Step 2: `getCurrentBubbleText()` — exam 케이스 추가**

`features/learning/home-journey-state.ts:184-193`을 아래로 교체:

```ts
function getCurrentBubbleText(currentStep: JourneyStepKey) {
  switch (currentStep) {
    case 'analysis':
      return '내 약점을 분석 중이에요...';
    case 'review':
      return '이제 연습할 시간!';
    case 'exam':
      return '실전에 도전할 시간이에요!';
    default:
      return '반가워요! 첫 진단 평가를 시작해볼까요?';
  }
}
```

- [ ] **Step 3: `getCurrentStepBody()` — exam 케이스 추가**

`features/learning/home-journey-state.ts:195-214`를 아래로 교체:

```ts
function getCurrentStepBody(
  currentStep: JourneyStepKey,
  summary: LearnerSummaryCurrent,
) {
  switch (currentStep) {
    case 'analysis':
      return `${getWeaknessLabel(summary)}부터 확인하면 다음 복습 단계가 더 빨리 열립니다.`;
    case 'review': {
      const dueCount = summary.dueReviewTasks?.length ?? 0;
      if (dueCount === 0) {
        return '약점 연습을 마치면 모의고사가 열립니다.';
      }
      return dueCount > 1
        ? `오늘은 복습 ${dueCount}개를 차례로 정리하면 됩니다.`
        : '오늘은 약점 1개만 짧게 다시 잡으면 됩니다.';
    }
    case 'exam':
      return '모의고사로 지금까지 정리한 약점을 실전에서 확인해보세요.';
    default:
      return '첫 기록만 생기면 분석, 복습, 실전 적용까지 한 줄로 이어집니다.';
  }
}
```

- [ ] **Step 4: `getCtaState()` — exam 브랜치 추가**

`features/learning/home-journey-state.ts:216-254`를 아래로 교체:

```ts
function getCtaState(
  currentStep: JourneyStepKey,
  summary: LearnerSummaryCurrent,
): Pick<HomeJourneyState, 'ctaAction' | 'ctaLabel' | 'ctaBody'> {
  if (currentStep === 'analysis') {
    return {
      ctaAction: 'open_result',
      ctaLabel: '약점 결과 보기',
      ctaBody: `${getWeaknessLabel(summary)}부터 보면 다음 복습으로 자연스럽게 이어집니다.`,
    };
  }

  if (currentStep === 'review') {
    const dueCount = summary.dueReviewTasks?.length ?? 0;

    if (dueCount === 0) {
      return {
        ctaAction: 'open_review',
        ctaLabel: '약점 연습 시작하기',
        ctaBody: '약점 연습을 마치면 모의고사가 열립니다.',
      };
    }

    return {
      ctaAction: 'open_review',
      ctaLabel: dueCount > 1 ? `복습 ${dueCount}개 시작하기` : '복습 시작하기',
      ctaBody:
        dueCount > 1
          ? '대표 약점부터 순서대로 다시 보면 됩니다.'
          : '오늘 해야 할 복습 한 가지만 먼저 열어보세요.',
    };
  }

  if (currentStep === 'exam') {
    return {
      ctaAction: 'open_exam',
      ctaLabel: '대표 세트 열기',
      ctaBody: '지금까지 정리한 약점을 실전 문제에서 바로 확인할 수 있어요.',
    };
  }

  return {
    ctaAction: 'start_diagnostic',
    ctaLabel: '첫 진단 시작하기',
    ctaBody: '10문제로 지금 위치를 먼저 확인합니다.',
  };
}
```

- [ ] **Step 5: TypeScript 타입 오류 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep home-journey-state
```

Expected: 출력 없음 (오류 없음)

- [ ] **Step 6: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "feat: exam 단계 여정 상태 완성 — 약점 연습 1회 후 exam CTA 활성화"
```

---

## Task 2: `use-quiz-hub-screen.ts` — `open_exam` CTA 라우팅

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:82-99`

**dasida-code-structure 참고:** `use-quiz-hub-screen.ts`는 `features/quiz/hooks/` 에 올바르게 위치한 hook 파일이다. 라우팅 로직을 여기에 두는 것은 기존 패턴(`onStartDiagnostic`, `onOpenPractice`)과 일치한다.

**building-native-ui 참고 (router.push vs replace):** exam 화면은 허브에서 탭해 들어가는 forward navigation이므로 `router.push`를 사용한다. 뒤로 가기로 허브에 돌아올 수 있어야 한다. `router.replace`는 뒤로 가기 스택을 제거하므로 사용하지 않는다.

현재 `onPressJourneyCta`의 switch는 `'open_exam'`을 처리하지 않아 `default`(start_diagnostic)로 떨어진다.

- [ ] **Step 1: `open_exam` 케이스 추가**

`features/quiz/hooks/use-quiz-hub-screen.ts:82-99`를 아래로 교체:

```ts
const onPressJourneyCta = () => {
  const action = homeState?.journey.ctaAction;

  if (!action) {
    return;
  }

  switch (action) {
    case 'open_result':
      onOpenRecentResult();
      return;
    case 'open_review':
      onOpenPractice();
      return;
    case 'open_exam':
      router.push('/(tabs)/quiz/exams');
      return;
    default:
      onStartDiagnostic();
  }
};
```

- [ ] **Step 2: TypeScript 타입 오류 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep use-quiz-hub-screen
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat: 여정 CTA open_exam → /quiz/exams 라우팅 추가"
```

---

## Task 3: `feedback.tsx` — 제출 버튼 네비게이션 수정

**Files:**
- Modify: `app/(tabs)/quiz/feedback.tsx:74-79`

**dasida-code-structure 확인 (hook 분리 판단):**
`feedback.tsx`는 170줄 route 파일로, hook 분리 기준(app route 80줄 초과)을 충족한다. 그러나 이번 변경은 기존 `onPress` 핸들러에 2줄(`resetSession()`, `router.replace(...)`)을 추가하는 것뿐이다. YAGNI 원칙에 따라 이번 PR에서 hook 분리를 하지 않는다. 단, 향후 feedback 화면에 상태 로직이 늘어나면 `use-feedback-screen.ts` 분리를 검토한다.

**building-native-ui 참고 (router.replace):** 제출 후 피드백 화면은 히스토리에서 제거돼야 한다. 뒤로 가기로 다시 피드백 화면으로 돌아오면 안 되므로 `router.replace('/(tabs)/quiz')`를 사용한다.

현재 제출 버튼은 `setSubmitted(true)`만 호출하고 화면을 떠나지 않는다.
`feedback.tsx` 74번째 줄의 버튼 `onPress`를 수정해 세션을 초기화하고 홈으로 이동한다.

- [ ] **Step 1: 제출 버튼 onPress 수정**

`app/(tabs)/quiz/feedback.tsx:74-79`를 아래로 교체:

```tsx
<BrandButton
  title={submitted ? '제출 완료' : '제출하기'}
  variant={submitted ? 'success' : 'primary'}
  onPress={() => {
    setSubmitted(true);
    resetSession();
    router.replace('/(tabs)/quiz');
  }}
/>
```

- [ ] **Step 2: TypeScript 타입 오류 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep feedback
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add app/(tabs)/quiz/feedback.tsx
git commit -m "fix: 피드백 제출 버튼 — 세션 초기화 후 퀴즈 홈으로 이동"
```

---

## Task 4: 전체 검증 및 Push

- [ ] **Step 1: 전체 TypeScript 검사**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: 오류 없음

- [ ] **Step 2: Metro 번들러 재시작 후 시뮬레이터 확인**

```bash
# Metro 캐시 클리어 재시작 (JS-only 변경이므로 prebuild 불필요)
npx expo start --clear
```

시뮬레이터에서 확인 항목:
1. **진단 미완료 상태**: 여정 보드 1단계(diagnostic) active, 나머지 locked
2. **진단 완료 후**: 2단계(analysis) active, 여정 CTA → `약점 결과 보기`
3. **약점 연습 1회 완료 후**: 4단계(exam) active, CTA 버튼 → `대표 세트 열기`
4. **exam CTA 탭**: `/quiz/exams` 화면으로 이동
5. **피드백 화면 → 제출하기**: `resetSession` 후 `/(tabs)/quiz` 홈으로 이동

   개발 환경 상태 주입 방법: 설정 탭 → 개발용 상태 미리보기 → `exam-in-progress` 시드

- [ ] **Step 3: Push**

```bash
git push origin main && npm run log:commit
```

---

## Self-Review

**Spec coverage:**
- ✅ 약점 연습 1회 → exam 단계 잠금 해제: `getCurrentStep()` (이미 적용) + `getStepStatus()` Task 1
- ✅ exam CTA 텍스트/액션: `getCtaState()` Task 1 Step 4
- ✅ 허브 CTA → `/quiz/exams` 라우팅: Task 2
- ✅ 피드백 제출 → 홈 이동: Task 3
- ✅ `progressLabel` "4 / 4 단계": `buildHomeJourneyState()`의 기존 로직으로 자동 처리 (변경 불필요)

**Placeholder scan:** 없음 — 모든 단계에 실제 코드 포함

**Type consistency:**
- `JourneyCtaAction = 'open_exam'`: Task 1에서 사용, Task 2에서 switch에서 매칭 ✅
- `JourneyStepKey = 'exam'`: Task 1 전체에서 일관되게 사용 ✅
- `router.push('/(tabs)/quiz/exams')`: `app/(tabs)/quiz/exams.tsx` 존재 확인 ✅
