# 온보딩 완료 후 여정 보드 숨기기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `profile.practiceGraduatedAt`이 설정된 사용자에게 홈 화면의 여정 보드(JourneyBoard)를 숨긴다.

**Architecture:** `quiz-hub-screen-view.tsx`에서 `profile.practiceGraduatedAt` 존재 여부로 `JourneyBoard` 렌더링을 조건부 처리한다. 새로운 API, 서버 코드, Firebase 변경 없음. 테스트를 위해 `practice-graduated` 시드 상태를 추가한다.

**Tech Stack:** React Native, Expo Router, TypeScript, Playwright (E2E)

---

### Task 1: `practice-graduated` 시드 추가

**Files:**
- Modify: `features/learner/types.ts`
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/profile/hooks/use-profile-screen.ts`

- [ ] **Step 1: `PreviewSeedState`에 타입 추가**

`features/learner/types.ts`에서:

```typescript
export type PreviewSeedState =
  | 'fresh'
  | 'diagnostic-complete'
  | 'review-available'
  | 'review-day3-available'
  | 'review-day7-available'
  | 'review-day30-available'
  | 'exam-in-progress'
  | 'practice-graduated';  // 추가
```

- [ ] **Step 2: 시드 핸들러 추가**

`features/learner/current-learner-controller.ts`의 `seedPreview` 함수에서 `exam-in-progress` 블록 직후, `peerPresenceStore.setPreviewSnapshot` 호출 전에 추가:

```typescript
if (state === 'practice-graduated') {
  const completedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const { reviewTasks } = await learningHistoryRepository.recordAttempt(
    buildPreviewAttemptInput(profile, 'diagnostic', null, completedAt),
  );
  const remappedTasks = reviewTasks.map((task) => ({
    ...task,
    stage: 'day1' as ReviewStage,
    scheduledFor: completedAt.slice(0, 10),
  }));
  await reviewTaskStore.saveAll(session.accountKey, remappedTasks);
  const graduatedProfile: LearnerProfile = {
    ...profile,
    practiceGraduatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await profileStore.save(graduatedProfile);
}
```

- [ ] **Step 3: 프로필 화면 시드 목록에 추가**

`features/profile/hooks/use-profile-screen.ts`의 `previewStates` 배열에 추가:

```typescript
const previewStates: { value: PreviewSeedState; label: string }[] = [
  { value: 'fresh', label: '첫 설치' },
  { value: 'diagnostic-complete', label: '진단 완료' },
  { value: 'review-available', label: '오늘 복습 있음' },
  { value: 'review-day3-available', label: 'DAY 3 복습 있음' },
  { value: 'review-day7-available', label: 'DAY 7 복습 있음' },
  { value: 'review-day30-available', label: 'DAY 30 복습 있음' },
  { value: 'exam-in-progress', label: '모의고사 진행 중' },
  { value: 'practice-graduated', label: '약점 연습 완료' },  // 추가
];
```

- [ ] **Step 4: 커밋**

```bash
git add features/learner/types.ts features/learner/current-learner-controller.ts features/profile/hooks/use-profile-screen.ts
git commit -m "feat: practice-graduated 시드 추가"
```

---

### Task 2: E2E 테스트 작성 (실패 확인)

**Files:**
- Modify: `e2e/smoke.spec.ts` (또는 새 파일 `e2e/journey-board.spec.ts`)

- [ ] **Step 1: 테스트 파일 생성**

`e2e/journey-board.spec.ts` 파일 생성:

```typescript
import { test, expect } from '@playwright/test';

async function loginAsDevGuest(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await page.waitForURL(/quiz/);
}

async function seedAndGoToQuiz(
  page: import('@playwright/test').Page,
  seedLabel: string,
) {
  await page.goto('/profile');
  await page.getByText(seedLabel).click();
  await page.waitForTimeout(800);
  await page.goto('/quiz');
}

test.describe('여정 보드 표시 조건', () => {
  test('1. 신규 유저(fresh) → 여정 보드 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '첫 설치');

    await expect(page.getByText('학습 여정')).toBeVisible({ timeout: 8000 });
  });

  test('2. 진단 완료 상태 → 여정 보드 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '진단 완료');

    await expect(page.getByText('학습 여정')).toBeVisible({ timeout: 8000 });
  });

  test('3. 약점 연습 완료(practice-graduated) → 여정 보드 숨김', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '약점 연습 완료');

    await expect(page.getByText('학습 여정')).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
npx playwright test e2e/journey-board.spec.ts --headed
```

예상 결과: 테스트 3번이 FAIL — 여정 보드가 여전히 표시됨

---

### Task 3: 여정 보드 조건부 렌더링 구현

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: JourneyBoard 조건 추가**

`features/quiz/components/quiz-hub-screen-view.tsx`에서 현재:

```tsx
<JourneyBoard
  isCompactLayout={isCompactLayout}
  onPressCurrentStep={onPressJourneyCta}
  onPressCta={onPressJourneyCta}
  state={journey}
/>
```

다음으로 변경:

```tsx
{!profile?.practiceGraduatedAt ? (
  <JourneyBoard
    isCompactLayout={isCompactLayout}
    onPressCurrentStep={onPressJourneyCta}
    onPressCta={onPressJourneyCta}
    state={journey}
  />
) : null}
```

- [ ] **Step 2: 테스트 실행하여 통과 확인**

```bash
npx playwright test e2e/journey-board.spec.ts --headed
```

예상 결과: 3개 모두 PASS

- [ ] **Step 3: 기존 테스트 회귀 확인**

```bash
npx playwright test e2e/smoke.spec.ts e2e/review-session.spec.ts
```

예상 결과: 모두 PASS

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx e2e/journey-board.spec.ts
git commit -m "feat: 약점 연습 완료 후 여정 보드 숨기기"
```
