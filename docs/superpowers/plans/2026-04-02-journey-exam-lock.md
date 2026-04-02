# 여정 보드 모의고사 직행 경로 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `QuizHubScreen`(졸업 전 여정 보드)에서 모의고사로 직접 이동하는 경로를 완전히 제거하고, 반드시 약점 연습 → 졸업 버튼을 거쳐야 모의고사에 진입하도록 한다.

**Architecture:** 순수 계산 모듈(`home-journey-state.ts`)에서 `'exam'` 단계 진입 조건과 `'open_exam'` CTA 액션을 제거한다. 네비게이션 훅(`use-quiz-hub-screen.ts`)에서 `open_exam` 케이스와 `onOpenExams` 핸들러를 제거하고, 복습 완료 상태에서 약점 연습 화면으로 이동하도록 수정한다. Route 파일(`quiz/index.tsx`)은 변경하지 않는다.

**Tech Stack:** TypeScript, Expo Router, React Native

---

## 파일 목록

| 파일 | 작업 |
|---|---|
| `features/learning/home-journey-state.ts` | 수정 — `open_exam` 액션 및 exam 단계 로직 제거 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | 수정 — `onOpenExams` 제거, `onOpenPractice` 수정 |

---

### Task 1: `home-journey-state.ts` — exam 경로 제거

**Files:**
- Modify: `features/learning/home-journey-state.ts`

**배경 지식:**
- `JourneyCtaAction` 타입이 `'open_exam'`을 포함하고 있어 여정 보드 CTA가 모의고사로 직행 가능
- `getCurrentStep()`이 `'exam'`을 반환할 수 있어 step 4가 `active` 상태가 됨
- 이 파일은 `buildHomeLearningState` → `currentLearnerController` → `CurrentLearnerProvider` 체인으로 사용됨
- `QuizHubScreen`은 `practiceGraduatedAt` 없을 때만 보이므로, exam 단계가 active가 되면 안 됨

---

- [ ] **Step 1: `JourneyCtaAction` 타입에서 `'open_exam'` 제거**

`features/learning/home-journey-state.ts` 7번째 줄을 수정:

```ts
// 변경 전
export type JourneyCtaAction =
  | 'start_diagnostic'
  | 'open_result'
  | 'open_review'
  | 'open_exam';

// 변경 후
export type JourneyCtaAction =
  | 'start_diagnostic'
  | 'open_result'
  | 'open_review';
```

- [ ] **Step 2: `getCurrentStep()`에서 exam 반환 블록 제거**

`getCurrentStep` 함수 내 아래 블록을 완전히 삭제:

```ts
// 삭제할 블록 (약 74~79번째 줄)
if (
  summary.featuredExamState.status !== 'not_started' ||
  (hasLatestDiagnostic && hasReviewAfterLatestDiagnostic && !hasDueReviews)
) {
  return 'exam';
}
```

삭제 후 `getCurrentStep` 전체:

```ts
function getCurrentStep(summary: LearnerSummaryCurrent): JourneyStepKey {
  const hasLatestDiagnostic = Boolean(summary.latestDiagnosticSummary);
  const latestDiagnosticAt = summary.latestDiagnosticSummary?.completedAt;
  const hasDueReviews = (summary.dueReviewTasks?.length ?? 0) > 0;
  const hasReviewAfterLatestDiagnostic = hasActivityAfter(summary, 'review', latestDiagnosticAt);

  if (hasDueReviews || hasReviewAfterLatestDiagnostic) {
    return 'review';
  }

  if (hasLatestDiagnostic) {
    return 'analysis';
  }

  return 'diagnostic';
}
```

- [ ] **Step 3: `getStepStatus()`에서 exam dead code 제거**

`currentStep`이 `'review'`일 때 `exam` step은 이미 `'pending'`을 반환하므로, 이제 도달할 수 없는 마지막 블록을 삭제:

```ts
// 삭제할 블록 (약 129~133번째 줄)
if (step === 'exam') {
  return 'active';
}

return 'completed';
```

삭제 후 `getStepStatus` 전체 (TypeScript fallthrough로 처리):

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

  // currentStep === 'review' (현재 여정 보드의 최대 단계)
  if (step === 'diagnostic' || step === 'analysis') {
    return 'completed';
  }

  return step === 'review' ? 'active' : 'pending';
}
```

- [ ] **Step 4: `getStepStatusLabel()`에서 exam active 케이스 제거**

`exam` step은 이제 항상 `'pending'`이므로 `status === 'active'` 분기에서 exam 케이스가 불필요. 삭제:

```ts
// 삭제할 블록 (약 198~206번째 줄)
if (step === 'exam') {
  if (summary.featuredExamState.status === 'completed') {
    return '완료';
  }

  if (summary.featuredExamState.status === 'in_progress') {
    return '진행 중';
  }
}
```

삭제 후 `getStepStatusLabel` 전체:

```ts
function getStepStatusLabel(
  step: JourneyStepKey,
  status: JourneyStepStatus,
  summary: LearnerSummaryCurrent,
): string {
  if (status === 'completed') {
    return '완료';
  }

  if (status === 'locked') {
    return '잠김';
  }

  if (status === 'pending') {
    return '대기 중';
  }

  if (step === 'diagnostic') {
    return '진행 중';
  }

  if (step === 'review') {
    const dueCount = summary.dueReviewTasks?.length ?? 0;
    return dueCount > 0 ? `복습 ${dueCount}개` : '활성화';
  }

  return '활성화';
}
```

- [ ] **Step 5: `getCurrentBubbleText()`에서 exam 케이스 제거**

```ts
// 변경 전
function getCurrentBubbleText(currentStep: JourneyStepKey) {
  switch (currentStep) {
    case 'analysis':
      return '내 약점을 분석 중이에요...';
    case 'review':
      return '이제 연습할 시간!';
    case 'exam':
      return '이제 실전에 써볼 차례예요!';
    default:
      return '반가워요! 첫 진단 평가를 시작해볼까요?';
  }
}

// 변경 후
function getCurrentBubbleText(currentStep: JourneyStepKey) {
  switch (currentStep) {
    case 'analysis':
      return '내 약점을 분석 중이에요...';
    case 'review':
      return '이제 연습할 시간!';
    default:
      return '반가워요! 첫 진단 평가를 시작해볼까요?';
  }
}
```

- [ ] **Step 6: `getCurrentStepBody()`에서 exam 케이스 제거**

```ts
// 변경 전
function getCurrentStepBody(
  currentStep: JourneyStepKey,
  summary: LearnerSummaryCurrent,
) {
  switch (currentStep) {
    case 'analysis':
      return `${getWeaknessLabel(summary)}부터 확인하면 다음 복습 단계가 더 빨리 열립니다.`;
    case 'review': {
      const dueCount = summary.dueReviewTasks?.length ?? 0;
      return dueCount > 1
        ? `오늘은 복습 ${dueCount}개를 차례로 정리하면 됩니다.`
        : '오늘은 약점 1개만 짧게 다시 잡으면 됩니다.';
    }
    case 'exam':
      return summary.featuredExamState.status === 'completed'
        ? '실전 세트를 한 번 마쳤습니다. 다시 보면 흐름이 더 선명해집니다.'
        : '복습 뒤 바로 실전에 연결하는 단계입니다.';
    default:
      return '첫 기록만 생기면 분석, 복습, 실전 적용까지 한 줄로 이어집니다.';
  }
}

// 변경 후
function getCurrentStepBody(
  currentStep: JourneyStepKey,
  summary: LearnerSummaryCurrent,
) {
  switch (currentStep) {
    case 'analysis':
      return `${getWeaknessLabel(summary)}부터 확인하면 다음 복습 단계가 더 빨리 열립니다.`;
    case 'review': {
      const dueCount = summary.dueReviewTasks?.length ?? 0;
      return dueCount > 1
        ? `오늘은 복습 ${dueCount}개를 차례로 정리하면 됩니다.`
        : '오늘은 약점 1개만 짧게 다시 잡으면 됩니다.';
    }
    default:
      return '첫 기록만 생기면 분석, 복습, 실전 적용까지 한 줄로 이어집니다.';
  }
}
```

- [ ] **Step 7: `getCtaState()`에서 exam 블록 제거 + review dueCount=0 케이스 추가**

```ts
// 변경 전
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
    if (summary.featuredExamState.status === 'completed') {
      return {
        ctaAction: 'open_exam',
        ctaLabel: '대표 세트 다시 보기',
        ctaBody: '최근에 마친 실전 세트를 다시 확인할 수 있습니다.',
      };
    }

    if (summary.featuredExamState.status === 'in_progress') {
      return {
        ctaAction: 'open_exam',
        ctaLabel: '실전 이어 풀기',
        ctaBody: '대표 세트를 이어 풀면서 실제 흔들림을 확인합니다.',
      };
    }

    return {
      ctaAction: 'open_exam',
      ctaLabel: '대표 세트 열기',
      ctaBody: '복습 뒤 바로 실전에 적용하는 단계입니다.',
    };
  }

  return {
    ctaAction: 'start_diagnostic',
    ctaLabel: '첫 진단 시작하기',
    ctaBody: '10문제로 지금 위치를 먼저 확인합니다.',
  };
}

// 변경 후
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

  return {
    ctaAction: 'start_diagnostic',
    ctaLabel: '첫 진단 시작하기',
    ctaBody: '10문제로 지금 위치를 먼저 확인합니다.',
  };
}
```

- [ ] **Step 8: typecheck 실행**

```bash
npm run typecheck
```

Expected: 에러 없음. 만약 `open_exam`을 참조하는 곳이 남아있으면 에러가 표시됨 — 그 위치를 Task 2에서 처리.

- [ ] **Step 9: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "feat: 여정 보드에서 exam 단계 직행 경로 제거 (open_exam 액션 삭제)"
```

---

### Task 2: `use-quiz-hub-screen.ts` — `onOpenExams` 제거 및 `onOpenPractice` 수정

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

**배경 지식:**
- `onOpenExams`는 `/quiz/exams`로 이동하는 핸들러로, `onPressJourneyCta`의 `open_exam` 케이스에서만 호출됨
- Task 1에서 `open_exam` 액션이 제거됐으므로 `onOpenExams`는 dead code가 됨
- `onOpenPractice`는 현재 `homeState.hero !== 'review'` 또는 `todayReviewCount === 0`이면 아무것도 안 함 — 복습 완료 상태에서 약점 연습 화면으로 이동하도록 수정

---

- [ ] **Step 1: `UseQuizHubScreenResult` 타입에서 `onOpenExams` 제거**

```ts
// 변경 전
export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenExams: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressJourneyCta: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};

// 변경 후
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
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onStartDiagnostic: () => void;
  profile: CurrentLearnerSnapshot['profile'];
  session: CurrentLearnerSnapshot['session'];
};
```

- [ ] **Step 2: `onOpenExams` 함수 정의 삭제**

아래 함수를 파일에서 완전히 제거:

```ts
// 삭제
const onOpenExams = () => {
  router.push('/quiz/exams');
};
```

- [ ] **Step 3: `onOpenPractice` 수정 — 복습 완료 시 약점 연습 화면으로 이동**

```ts
// 변경 전
const onOpenPractice = () => {
  if (!homeState || homeState.hero !== 'review' || homeState.todayReviewCount === 0) {
    return;
  }

  router.push({
    pathname: '/quiz/practice',
    params: {
      mode: 'review',
    },
  });
};

// 변경 후
const onOpenPractice = () => {
  if (!homeState) {
    return;
  }

  if (homeState.todayReviewCount > 0) {
    router.push({ pathname: '/quiz/practice', params: { mode: 'review' } });
    return;
  }

  router.push({ pathname: '/quiz/practice', params: { mode: 'weakness' } });
};
```

- [ ] **Step 4: `onPressJourneyCta`에서 `open_exam` 케이스 제거**

```ts
// 변경 전
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
      onOpenExams();
      return;
    default:
      onStartDiagnostic();
  }
};

// 변경 후
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
    default:
      onStartDiagnostic();
  }
};
```

- [ ] **Step 5: 반환값에서 `onOpenExams` 제거**

```ts
// 변경 전
return {
  authNoticeMessage: localAuthNoticeMessage,
  homeState,
  isCompactLayout: width < 390 || height < 780,
  isReady,
  journey: homeState?.journey ?? null,
  onDismissAuthNotice: () => {
    setLocalAuthNoticeMessage(null);
  },
  onOpenExams,
  onOpenPractice,
  onOpenRecentResult,
  onPressJourneyCta,
  onRefresh: refresh,
  onStartDiagnostic,
  profile,
  session,
};

// 변경 후
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
  onPressJourneyCta,
  onRefresh: refresh,
  onStartDiagnostic,
  profile,
  session,
};
```

- [ ] **Step 6: typecheck + lint 실행**

```bash
npm run typecheck && npm run lint
```

Expected: 에러 없음. `onOpenExams`를 참조하는 파일이 있으면 타입 에러 발생 — 해당 파일에서 `onOpenExams` 참조를 제거.

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat: 여정 보드 훅에서 onOpenExams 제거 및 복습 완료 시 약점 연습 화면 연결"
```

---

## 수동 검증 체크리스트

앱을 `npx expo run:ios`로 실행 후 확인:

- [ ] 진단 전 상태 — 여정 보드 CTA "첫 진단 시작하기" 누르면 진단 화면으로 이동
- [ ] 진단 완료 후 — step 4(완벽 마스터)가 `pending` 상태(회색, 눌리지 않음)로 표시됨
- [ ] 복습 N개 남음 — CTA "복습 N개 시작하기" 누르면 복습 화면으로 이동
- [ ] 복습 모두 완료(dueCount=0) — CTA "약점 연습 시작하기" 누르면 약점 연습 화면으로 이동
- [ ] 약점 연습 화면에서 "약점 연습 완료하기" 버튼 → 퀴즈 탭이 `MockExamIntroScreen`으로 전환됨
- [ ] 졸업 후 "모의고사 풀기" → `/quiz/exams` 정상 이동
- [ ] 여정 보드 어디에도 `/quiz/exams`로 가는 직행 경로가 없음
