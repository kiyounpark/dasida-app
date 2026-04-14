# Review Dev Testing Infrastructure: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dev testing tools for the Ebbinghaus review system: stage-specific seeds, "날짜 당기기" button, `__DEV__` countdown shortening, and Playwright E2E tests.

**Architecture:** Seeds extend the existing `seedPreview` switch with 3 new cases that remap day1 tasks to the target stage and write them back via `LocalReviewTaskStore`. `pullReviewDueDates` is a new dev-only method that bulk-updates `scheduledFor` to today. Playwright tests use seeds via profile UI to verify the full review session flow.

**Tech Stack:** TypeScript, React Native, Expo Web, AsyncStorage, Playwright

---

## File Map

| 파일 | 변경 |
|---|---|
| `features/learner/types.ts` | `PreviewSeedState` 유니온에 3개 추가 |
| `features/learner/current-learner-controller.ts` | `LocalReviewTaskStore` 의존성 추가, `pullReviewDueDates()` 메서드 + 3개 시드 케이스 |
| `features/learner/provider.tsx` | `LocalReviewTaskStore` 인스턴스 전달, `pullReviewDueDates` context 노출 |
| `features/profile/hooks/use-profile-screen.ts` | `previewStates` 3개 추가, `pullReviewDueDates` 디스트럭처링, `onPullReviewDueDates` 핸들러 |
| `features/profile/components/profile-screen-view.tsx` | `onPullReviewDueDates` prop 추가, Dev 섹션에 버튼 렌더링 |
| `features/quiz/components/review-home-card.tsx` | `TIMER_SECONDS = __DEV__ ? 1 : 10` |
| `e2e/review-session.spec.ts` | 신규 Playwright E2E 테스트 |

---

## Task 1: Types + Controller + Provider

**Files:**
- Modify: `features/learner/types.ts`
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/learner/provider.tsx`

- [ ] **Step 1: `PreviewSeedState` 유니온에 3개 추가**

`features/learner/types.ts`의 `PreviewSeedState` 타입을 다음으로 교체:

```ts
export type PreviewSeedState =
  | 'fresh'
  | 'diagnostic-complete'
  | 'review-available'
  | 'review-day3-available'
  | 'review-day7-available'
  | 'review-day30-available'
  | 'exam-in-progress';
```

- [ ] **Step 2: 컨트롤러 — import + Dependencies 타입 확장**

`features/learner/current-learner-controller.ts` 상단 imports에 추가:

```ts
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewStage } from '@/features/learning/history-types';
```

`Dependencies` 타입 (line 79 근처)에 `reviewTaskStore` 추가:

```ts
type Dependencies = {
  authClient: AuthClient;
  profileStore: LearnerProfileStore;
  learningHistoryRepository: LearningHistoryRepository;
  localLearningHistoryRepository: LocalLearningHistoryRepository;
  migrationService: LearningHistoryMigrationService;
  peerPresenceStore: PreviewablePeerPresenceStore;
  reviewTaskStore: LocalReviewTaskStore;
};
```

`CurrentLearnerController` 타입 (line 51 근처)에 `pullReviewDueDates` 추가:

```ts
export type CurrentLearnerController = {
  bootstrap(): Promise<CurrentLearnerSnapshot>;
  refresh(): Promise<CurrentLearnerSnapshot>;
  loadRecentAttempts(options?: {
    source?: LearningSource;
    limit?: number;
  }): Promise<LearningAttempt[]>;
  continueAsDevGuest(): Promise<CurrentLearnerSnapshot>;
  signIn(provider: SupportedAuthProvider): Promise<CurrentLearnerSnapshot>;
  signOut(): Promise<CurrentLearnerSnapshot>;
  getHistoryMigrationStatus(sourceAnonymousAccountKey?: string): Promise<HistoryMigrationStatus>;
  importAnonymousHistory(sourceAnonymousAccountKey: string): Promise<{
    snapshot: CurrentLearnerSnapshot;
    migrationStatus: HistoryMigrationStatus;
  }>;
  updateGrade(grade: LearnerProfile['grade']): Promise<CurrentLearnerSnapshot>;
  updateOnboardingProfile(
    nickname: string,
    grade: Exclude<LearnerProfile['grade'], 'unknown'>,
    track?: LearnerTrack,
  ): Promise<CurrentLearnerSnapshot>;
  graduateToPractice(): Promise<CurrentLearnerSnapshot>;
  recordAttempt(input: FinalizedAttemptInput): Promise<CurrentLearnerSnapshot>;
  saveFeaturedExamState(state: FeaturedExamState): Promise<CurrentLearnerSnapshot>;
  seedPreview(state: PreviewSeedState): Promise<CurrentLearnerSnapshot>;
  pullReviewDueDates(): Promise<CurrentLearnerSnapshot>;
  resetLocalProfile(): Promise<CurrentLearnerSnapshot>;
};
```

- [ ] **Step 3: `createCurrentLearnerController` — 구조분해에 `reviewTaskStore` 추가**

`createCurrentLearnerController` 함수 시작부(line 145 근처)에서 `reviewTaskStore`를 구조분해:

```ts
export function createCurrentLearnerController({
  authClient,
  profileStore,
  learningHistoryRepository,
  localLearningHistoryRepository,
  migrationService,
  peerPresenceStore,
  reviewTaskStore,
}: Dependencies): CurrentLearnerController {
```

- [ ] **Step 4: `seedPreview` — 새 시드 케이스 3개 추가**

기존 `seedPreview` 구현(line 443 근처)에서 `review-available` 케이스 아래에 새 케이스 추가.

기존 코드:
```ts
if (state === 'diagnostic-complete' || state === 'review-available') {
  const previewCompletedAt =
    state === 'review-available'
      ? new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString();
  await learningHistoryRepository.recordAttempt(
    buildPreviewAttemptInput(profile, 'diagnostic', null, previewCompletedAt),
  );
}
```

아래 코드로 교체:

```ts
if (state === 'diagnostic-complete' || state === 'review-available') {
  const previewCompletedAt =
    state === 'review-available'
      ? new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString();
  await learningHistoryRepository.recordAttempt(
    buildPreviewAttemptInput(profile, 'diagnostic', null, previewCompletedAt),
  );
}

if (
  state === 'review-day3-available' ||
  state === 'review-day7-available' ||
  state === 'review-day30-available'
) {
  const stageMap: Record<'review-day3-available' | 'review-day7-available' | 'review-day30-available', ReviewStage> = {
    'review-day3-available': 'day3',
    'review-day7-available': 'day7',
    'review-day30-available': 'day30',
  };
  const targetStage = stageMap[state as keyof typeof stageMap];
  const completedAt = new Date().toISOString();
  const today = completedAt.slice(0, 10);

  const { reviewTasks } = await learningHistoryRepository.recordAttempt(
    buildPreviewAttemptInput(profile, 'diagnostic', null, completedAt),
  );

  const remappedTasks = reviewTasks.map((task) => ({
    ...task,
    id: `${task.sourceId}__${task.weaknessId}__${targetStage}`,
    stage: targetStage,
    scheduledFor: today,
  }));

  await reviewTaskStore.saveAll(session.accountKey, remappedTasks);
}
```

- [ ] **Step 5: `pullReviewDueDates` 메서드 추가**

`resetLocalProfile` 메서드 바로 앞(line 478 근처)에 추가:

```ts
pullReviewDueDates: async () => {
  const { session } = await readDevGuestSnapshot();
  const tasks = await reviewTaskStore.load(session.accountKey);
  const today = new Date().toISOString().slice(0, 10);
  const updated = tasks.map((task) =>
    task.completed ? task : { ...task, scheduledFor: today },
  );
  await reviewTaskStore.saveAll(session.accountKey, updated);
  return readCurrentSnapshot();
},
```

- [ ] **Step 6: `provider.tsx` — `LocalReviewTaskStore` 인스턴스 추가 및 context 노출**

`features/learner/provider.tsx`에서:

① imports에 추가:
```ts
import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
```

② 모듈 수준에 인스턴스 추가 (기존 `const localLearningHistoryRepository = ...` 아래):
```ts
const localReviewTaskStore = new LocalReviewTaskStore();
```

③ `learnerController` 생성 코드에 `reviewTaskStore` 전달:
```ts
const learnerController = createCurrentLearnerController({
  authClient,
  profileStore,
  learningHistoryRepository: createLearningHistoryRepository(authClient),
  localLearningHistoryRepository,
  migrationService: new LearningHistoryMigrationService({
    authClient,
    cacheRepository: localLearningHistoryRepository,
    snapshotStore: new LocalLearningHistorySnapshotStore(),
  }),
  peerPresenceStore,
  reviewTaskStore: localReviewTaskStore,
});
```

④ `CurrentLearnerContextValue` 타입에 추가 (line 80 근처, `seedPreview` 아래):
```ts
pullReviewDueDates(): Promise<void>;
```

⑤ `useMemo` value 객체에 추가 (기존 `seedPreview` 아래):
```ts
pullReviewDueDates: async () => {
  const snapshot = await learnerController.pullReviewDueDates();
  setState(toLearnerState(snapshot));
},
```

- [ ] **Step 7: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add features/learner/types.ts features/learner/current-learner-controller.ts features/learner/provider.tsx
git commit -m "feat: review 단계별 시드 3개 + pullReviewDueDates 추가"
```

---

## Task 2: Profile Screen Dev UI

**Files:**
- Modify: `features/profile/hooks/use-profile-screen.ts`
- Modify: `features/profile/components/profile-screen-view.tsx`

- [ ] **Step 1: `use-profile-screen.ts` — 새 시드 레이블 추가 + pullReviewDueDates 핸들러**

`previewStates` 배열(line 22)에 3개 추가:

```ts
const previewStates: { value: PreviewSeedState; label: string }[] = [
  { value: 'fresh', label: '첫 설치' },
  { value: 'diagnostic-complete', label: '진단 완료' },
  { value: 'review-available', label: '오늘 복습 있음' },
  { value: 'review-day3-available', label: 'DAY 3 복습 있음' },
  { value: 'review-day7-available', label: 'DAY 7 복습 있음' },
  { value: 'review-day30-available', label: 'DAY 30 복습 있음' },
  { value: 'exam-in-progress', label: '모의고사 진행 중' },
];
```

`useProfileScreen` 함수 내 구조분해(line 54 근처)에 `pullReviewDueDates` 추가:

```ts
const {
  authGateState,
  availableAuthProviders,
  getHistoryMigrationStatus,
  homeState,
  importAnonymousHistory,
  isReady,
  profile,
  pullReviewDueDates,
  refresh,
  resetLocalProfile,
  seedPreview,
  session,
  signIn,
  signOut,
  updateGrade,
} = useCurrentLearner();
```

`return` 객체(line 176 근처)에 `onPullReviewDueDates` 핸들러 추가 (기존 `onResetLocalProfile` 아래):

```ts
onPullReviewDueDates: async () => {
  setBusyAction('pull-review-dates');
  setErrorMessage(null);
  try {
    await pullReviewDueDates();
  } catch (error) {
    setErrorMessage(formatErrorMessage(error));
  } finally {
    setBusyAction(null);
  }
},
```

- [ ] **Step 2: `profile-screen-view.tsx` — prop 추가 + 버튼 렌더링**

`ProfileScreenView` 함수 파라미터 구조분해에 `onPullReviewDueDates` 추가:

```tsx
export function ProfileScreenView({
  busyAction,
  errorMessage,
  gradeOptions,
  homeState,
  isDevBuild,
  isGuestDevSession,
  isReady,
  manualImportCandidate,
  noticeMessage,
  previewStates,
  profile,
  session,
  supportedAuthProviders,
  onGoToOnboarding,
  onImportLocalHistory,
  onPullReviewDueDates,
  onResetLocalProfile,
  onSeedPreview,
  onSignIn,
  onSignOut,
  onUpdateGrade,
}: UseProfileScreenResult) {
```

Dev 섹션의 `isGuestDevSession` 블록(line 298 근처)에서 "로컬 상태 초기화" 버튼 아래에 추가:

```tsx
<ActionButton
  label={
    busyAction === 'pull-review-dates'
      ? '날짜 당기는 중...'
      : '복습 날짜 당기기'
  }
  disabled={busyAction !== null}
  subtle
  onPress={() => void onPullReviewDueDates()}
/>
```

완성된 `isGuestDevSession` 블록은:

```tsx
{isGuestDevSession ? (
  <>
    <View style={styles.previewList}>
      {previewStates.map((preview) => (
        <ActionButton
          key={preview.value}
          label={preview.label}
          subtle
          disabled={busyAction !== null}
          onPress={() => void onSeedPreview(preview.value)}
        />
      ))}
    </View>
    <ActionButton
      label={
        busyAction === 'pull-review-dates'
          ? '날짜 당기는 중...'
          : '복습 날짜 당기기'
      }
      disabled={busyAction !== null}
      subtle
      onPress={() => void onPullReviewDueDates()}
    />
    <ActionButton
      label={busyAction === 'reset-local' ? '초기화 중...' : '로컬 상태 초기화'}
      disabled={busyAction !== null}
      subtle
      onPress={() => void onResetLocalProfile()}
    />
  </>
) : (
  <View style={styles.devHintCard}>
    ...
  </View>
)}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add features/profile/hooks/use-profile-screen.ts features/profile/components/profile-screen-view.tsx
git commit -m "feat: 프로필 Dev 섹션에 복습 날짜 당기기 버튼 및 단계별 시드 추가"
```

---

## Task 3: ReviewHomeCard `__DEV__` Countdown

**Files:**
- Modify: `features/quiz/components/review-home-card.tsx`

- [ ] **Step 1: `TIMER_SECONDS` 분기 적용**

`features/quiz/components/review-home-card.tsx` line 18:

기존:
```ts
const TIMER_SECONDS = 10;
```

변경:
```ts
const TIMER_SECONDS = __DEV__ ? 1 : 10;
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-home-card.tsx
git commit -m "feat: ReviewHomeCard 타이머를 DEV에서 1초로 단축"
```

---

## Task 4: Playwright E2E Tests

**Files:**
- Create: `e2e/review-session.spec.ts`

- [ ] **Step 1: 테스트 파일 골격 작성 (일단 failing 상태 확인용)**

`e2e/review-session.spec.ts` 신규 생성:

```ts
import { test, expect } from '@playwright/test';

// ── 헬퍼 ───────────────────────────────────────────────

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

async function skipStepWithNoInput(page: import('@playwright/test').Page) {
  await page.getByText('다음으로').click();
  await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 5000 });
  await page.getByText(/다음 단계 →|완료 →/).click();
}

// ── 테스트 ─────────────────────────────────────────────

test.describe('복습 세션 흐름', () => {
  test('1. review-available 시드 → ReviewHomeCard 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('오늘 안 하면 리셋')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible();
  });

  test('2. 카운트다운 완료 후 CTA 활성화 → 복습 세션 진입', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });

    // __DEV__ ? 1 : 10 — 개발 환경에서 1초
    await page.waitForTimeout(1500);

    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });
  });

  test('3. 입력 없이 다음으로 → AI 호출 없이 다음 단계 버튼 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    // 첫 번째 단계 진행 (입력 없음)
    await expect(page.getByText('다음으로')).toBeVisible({ timeout: 5000 });
    await page.getByText('다음으로').click();

    // AI 피드백 없이 바로 다음 단계 버튼
    await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 3000 });
  });

  test('4. 모든 단계 완료 → 완료 화면 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    // 최대 10단계까지 skip (실제 3단계)
    for (let i = 0; i < 10; i++) {
      const isDone = await page.getByText('모든 단계 완료!').isVisible();
      if (isDone) break;
      const hasNext = await page.getByText('다음으로').isVisible();
      if (hasNext) {
        await page.getByText('다음으로').click();
        await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 3000 });
      }
      const hasContinue = await page.getByText(/다음 단계 →|완료 →/).isVisible();
      if (hasContinue) {
        await page.getByText(/다음 단계 →|완료 →/).click();
      }
    }

    await expect(page.getByText('모든 단계 완료!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('✓ 기억났어요!')).toBeVisible();
    await expect(page.getByText('🤔 다시 볼게요')).toBeVisible();
  });

  test('5. day3 시드 → ReviewHomeCard에 DAY 3 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 3 복습 있음');

    await expect(page.getByText('DAY 3')).toBeVisible({ timeout: 8000 });
  });

  test('6. day7 시드 → ReviewHomeCard에 DAY 7 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 7 복습 있음');

    await expect(page.getByText('DAY 7')).toBeVisible({ timeout: 8000 });
  });

  test('7. day30 시드 → ReviewHomeCard에 DAY 30 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 30 복습 있음');

    await expect(page.getByText('DAY 30')).toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (Tasks 1-3 미구현 상태)**

```bash
npx playwright test e2e/review-session.spec.ts --reporter=line
```

Expected: FAIL — Tasks 1–3이 아직 구현되지 않았거나, 새 시드 버튼이 없어 테스트가 실패해야 함.

> **Note:** Tasks 1–3이 이미 완료된 경우 이 단계를 건너뛰어도 됨.

- [ ] **Step 3: Tasks 1–3 구현 완료 후 테스트 재실행**

```bash
npx playwright test e2e/review-session.spec.ts --reporter=line
```

Expected: 7 passed, 0 failed

실패할 경우 확인사항:
- `EXPO_PUBLIC_REVIEW_FEEDBACK_URL`가 설정되어 있으면 AI 피드백 흐름이 달라짐 → `.env.local`에서 해당 값을 제거하거나 빈 문자열로 설정
- 웹 서버가 실행 중인지 확인 (`npx expo start --web`)
- `__DEV__`가 `true`인지 확인 (개발 서버 기준으로 자동 설정됨)

- [ ] **Step 4: 커밋**

```bash
git add e2e/review-session.spec.ts
git commit -m "test: 복습 세션 E2E 테스트 7개 추가"
```

---

## Self-Review Checklist

**스펙 커버리지:**

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| `review-day3/day7/day30-available` 시드 추가 | Task 1 Step 4 |
| `pullReviewDueDates()` 컨트롤러 메서드 | Task 1 Step 5 |
| provider에 `pullReviewDueDates` 노출 | Task 1 Step 6 |
| 프로필 hook `onPullReviewDueDates` | Task 2 Step 1 |
| 프로필 view Dev 버튼 | Task 2 Step 2 |
| `TIMER_SECONDS = __DEV__ ? 1 : 10` | Task 3 Step 1 |
| Playwright 5개 테스트 케이스 | Task 4 (7개로 확장) |

**타입 일관성:**
- `pullReviewDueDates`는 controller에서 `Promise<CurrentLearnerSnapshot>`, provider에서 `Promise<void>` — 패턴 일치 (기존 `seedPreview`, `resetLocalProfile`와 동일)
- `reviewTaskStore.saveAll(accountKey, remappedTasks)`에서 `remappedTasks`는 `ReviewTask[]` — stage를 직접 매핑하므로 타입 안전

**플레이스홀더 없음:** 모든 코드 스텝에 실제 코드 포함.
