# Phase 2 — 학습 여정 중단 상태 감지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7-state 여정 모델에서 state 2(diagnostic_in_progress)와 state 5(practice_in_progress)를 구현해 유저가 진단/연습을 중단하고 홈으로 돌아왔을 때 올바른 상태와 CTA를 노출한다.

**Architecture:** `LearnerProfile`에 두 개의 ISO 타임스탬프 필드(`pendingDiagnosticStartedAt`, `pendingPracticeStartedAt`)를 추가하고, 진단/연습 훅에서 진입 시 SET, 완료 시 CLEAR 한다. `home-journey-state.getCurrentState()`가 이 플래그와 최신 진단 완료 시각을 비교해 stale 여부를 판정한다. 크로스 디바이스 동기화는 Firestore가 담당한다. 세션 재개(이어서 풀기)는 스코프 밖이며 CTA는 "다시 시작하기"로 표시한다.

**Tech Stack:** TypeScript, React Native, Expo, Firebase/Firestore (`LearnerProfileStore`), Jest(functions만), `npm run typecheck` / `npm run lint` / `npx expo run:ios`로 검증.

**Testing convention:** 이 리포지토리는 RN 소스에 Jest 하네스가 없다(`functions/`에만 있음). 모든 변경은 `npm run typecheck`로 정적 검증하고, 런타임 동작은 수동 QA(시뮬레이터)로 확인한다. Phase 1에서도 같은 관례를 따랐다.

**Design spec:** `docs/superpowers/specs/2026-04-21-phase2-journey-interrupted-states-design.md`

---

## File Structure

| 파일 | 변경 유형 | 책임 |
|------|-----------|------|
| `features/learner/types.ts` | 수정 | `LearnerProfile`에 2개 필드 추가 |
| `features/learner/current-learner-controller.ts` | 수정 | 4개 메서드 추가 (interface + impl) |
| `features/learner/provider.tsx` | 수정 | 4개 함수 context expose |
| `features/learning/home-journey-state.ts` | 수정 | stale 헬퍼 + `getCurrentState()` 분기 + `stateCopyTable` copy |
| `features/quiz/hooks/use-diagnostic-screen.ts` | 수정 | `hasStarted` 진입 시 SET, `finishDiagnosis` 시 CLEAR |
| `features/quiz/hooks/use-practice-screen.ts` | 수정 | weakness 모드 진입 시 SET, 완료 시 CLEAR |

다른 파일은 건드리지 않는다. `stateToStepKey`/`getStepStatus`는 이미 state 2/5를 `diagnostic`/`review`에 매핑하고 있어 추가 변경이 불필요하다.

---

## Task 1: `LearnerProfile`에 pending 플래그 필드 추가

**Files:**
- Modify: `features/learner/types.ts`

**Rationale:** 다른 모든 변경이 이 타입에 의존하므로 가장 먼저 추가한다. Optional ISO string으로 두면 기존 프로파일과 호환된다.

- [ ] **Step 1: `LearnerProfile` 타입에 두 필드 추가**

`features/learner/types.ts`의 `LearnerProfile` 타입(현재 42~52행) 마지막에 두 줄 추가:

```typescript
export type LearnerProfile = {
  accountKey: string;
  learnerId: string;
  nickname: string;
  grade: LearnerGrade;
  track?: LearnerTrack; // 고3 전용: 'calc' | 'stats' | 'geom'
  createdAt: string;
  updatedAt: string;
  practiceGraduatedAt?: string; // ISO 타임스탬프. 약점 연습 완료 버튼을 처음 누른 시각.
  latestDiagnosticResultViewedAt?: string; // ISO 타임스탬프. 가장 최근 진단의 결과 화면을 처음 본 시각. 새 진단 완료 시 리셋된다.
  pendingDiagnosticStartedAt?: string; // ISO 타임스탬프. 진단 진입 시 SET, 완료 시 CLEAR. stale 판정은 latestDiagnosticSummary.completedAt과 비교.
  pendingPracticeStartedAt?: string; // ISO 타임스탬프. weakness 연습 진입 시 SET, 완료 시 CLEAR. stale 판정은 최신 진단 완료 시각과 비교.
};
```

- [ ] **Step 2: 타입체크 확인**

Run: `npm run typecheck`
Expected: PASS (신규 옵셔널 필드는 기존 코드와 호환)

- [ ] **Step 3: 커밋**

```bash
git add features/learner/types.ts
git commit -m "feat(learner): add pending diagnostic/practice timestamp fields to LearnerProfile"
```

---

## Task 2: `CurrentLearnerController`에 4개 메서드 추가

**Files:**
- Modify: `features/learner/current-learner-controller.ts`

**Rationale:** 플래그를 set/clear 하는 저장 경로. `graduateToPractice` 패턴을 그대로 복제한다. 이미 SET된 상태에서 다시 SET 호출되면 타임스탬프를 덮어쓴다(크로스 디바이스 stale 방지).

- [ ] **Step 1: interface(`CurrentLearnerController`)에 4개 시그니처 추가**

`features/learner/current-learner-controller.ts`의 74~75행(`graduateToPractice` / `markDiagnosticResultViewed` 사이) 아래에 삽입:

```typescript
  graduateToPractice(): Promise<CurrentLearnerSnapshot>;
  markDiagnosticResultViewed(): Promise<CurrentLearnerSnapshot>;
  markPendingDiagnosticStarted(): Promise<CurrentLearnerSnapshot>;
  clearPendingDiagnostic(): Promise<CurrentLearnerSnapshot>;
  markPendingPracticeStarted(): Promise<CurrentLearnerSnapshot>;
  clearPendingPractice(): Promise<CurrentLearnerSnapshot>;
  recordAttempt(input: FinalizedAttemptInput): Promise<CurrentLearnerSnapshot>;
```

- [ ] **Step 2: 구현부에 4개 메서드 추가**

`markDiagnosticResultViewed` 구현(현재 526~549행) 뒤, `recordAttempt` 앞에 다음 4개 블록을 순서대로 삽입.

**주의:** `graduateToPractice`와 달리 "이미 있으면 no-op" 처리를 하지 않는다. 크로스 디바이스 시나리오(태블릿에서 SET → 폰에서 다시 SET)에서 최신 타임스탬프가 덮어써야 stale 판정이 올바르게 작동한다(spec §5 참조).

```typescript
    markPendingDiagnosticStarted: async () => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        pendingDiagnosticStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
    clearPendingDiagnostic: async () => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      if (!profile.pendingDiagnosticStartedAt) {
        return buildSnapshot({
          authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
          profile,
          session,
          summary,
        });
      }
      const nextProfile: LearnerProfile = {
        ...profile,
        pendingDiagnosticStartedAt: undefined,
        updatedAt: new Date().toISOString(),
      };
      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
    markPendingPracticeStarted: async () => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      const nextProfile: LearnerProfile = {
        ...profile,
        pendingPracticeStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
    clearPendingPractice: async () => {
      const { session, profile, summary } = await readAccessibleSnapshot();
      if (!profile.pendingPracticeStartedAt) {
        return buildSnapshot({
          authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
          profile,
          session,
          summary,
        });
      }
      const nextProfile: LearnerProfile = {
        ...profile,
        pendingPracticeStartedAt: undefined,
        updatedAt: new Date().toISOString(),
      };
      await profileStore.save(nextProfile);
      return buildSnapshot({
        authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
        profile: nextProfile,
        session,
        summary,
      });
    },
```

- [ ] **Step 3: 타입체크 + 린트**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "feat(learner): add mark/clear pending diagnostic & practice controller methods"
```

---

## Task 3: Provider context에 4개 함수 노출

**Files:**
- Modify: `features/learner/provider.tsx`

**Rationale:** 훅에서 호출 가능하도록 context value에 연결한다. 기존 `graduateToPractice` 래핑 패턴과 동일.

- [ ] **Step 1: Context interface(`CurrentLearnerContextValue`)에 4개 시그니처 추가**

`features/learner/provider.tsx` 110~113행(`graduateToPractice` / `markDiagnosticResultViewed` 사이) 아래에 삽입:

```typescript
  graduateToPractice(): Promise<void>;
  markDiagnosticResultViewed(): Promise<void>;
  markPendingDiagnosticStarted(): Promise<void>;
  clearPendingDiagnostic(): Promise<void>;
  markPendingPracticeStarted(): Promise<void>;
  clearPendingPractice(): Promise<void>;
  recordAttempt(input: FinalizedAttemptInput): Promise<void>;
```

- [ ] **Step 2: useMemo value에 4개 래퍼 추가**

`features/learner/provider.tsx`의 `markDiagnosticResultViewed` 래퍼(현재 280~283행) 뒤, `recordAttempt` 앞에 삽입:

```typescript
      markPendingDiagnosticStarted: async () => {
        const snapshot = await learnerController.markPendingDiagnosticStarted();
        setState(toLearnerState(snapshot));
      },
      clearPendingDiagnostic: async () => {
        const snapshot = await learnerController.clearPendingDiagnostic();
        setState(toLearnerState(snapshot));
      },
      markPendingPracticeStarted: async () => {
        const snapshot = await learnerController.markPendingPracticeStarted();
        setState(toLearnerState(snapshot));
      },
      clearPendingPractice: async () => {
        const snapshot = await learnerController.clearPendingPractice();
        setState(toLearnerState(snapshot));
      },
```

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add features/learner/provider.tsx
git commit -m "feat(learner): expose pending diagnostic/practice handlers on learner context"
```

---

## Task 4: `home-journey-state.ts`에 stale 헬퍼 추가

**Files:**
- Modify: `features/learning/home-journey-state.ts`

**Rationale:** `getCurrentState()`가 state 2/5 판정 시 사용할 순수 함수. 타임스탬프 비교 로직을 헬퍼로 분리해서 추후 테스트 시에도 격리 가능하도록 한다.

- [ ] **Step 1: 헬퍼 두 개 추가**

`features/learning/home-journey-state.ts`의 `hasActivityAfter` 함수(현재 124~146행) 앞에 삽입:

```typescript
function isPendingDiagnosticFresh(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingDiagnosticStartedAt;
  if (!pending) {
    return false;
  }

  const pendingAt = Date.parse(pending);
  if (Number.isNaN(pendingAt)) {
    return false;
  }

  const latestCompleted = summary.latestDiagnosticSummary?.completedAt;
  if (!latestCompleted) {
    // 아직 완료된 진단이 없으면 pending은 진행 중인 첫 진단.
    return true;
  }

  const latestCompletedAt = Date.parse(latestCompleted);
  if (Number.isNaN(latestCompletedAt)) {
    return true;
  }

  // pending이 최신 완료 시각보다 이후면 새 진단을 시작해 중단된 상태.
  return pendingAt > latestCompletedAt;
}

function isPendingPracticeFresh(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingPracticeStartedAt;
  if (!pending) {
    return false;
  }

  const pendingAt = Date.parse(pending);
  if (Number.isNaN(pendingAt)) {
    return false;
  }

  const latestDiagnosticCompleted = summary.latestDiagnosticSummary?.completedAt;
  if (!latestDiagnosticCompleted) {
    // 진단이 없으면 연습 플래그도 stale 취급(정상 흐름이라면 불가능).
    return false;
  }

  const latestDiagnosticCompletedAt = Date.parse(latestDiagnosticCompleted);
  if (Number.isNaN(latestDiagnosticCompletedAt)) {
    return false;
  }

  // 최신 진단 완료 이후에 시작된 연습이어야 유효.
  return pendingAt > latestDiagnosticCompletedAt;
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: PASS — 아직 호출자가 없어도 컴파일은 통과한다.

- [ ] **Step 3: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "feat(journey): add stale helpers for pending diagnostic/practice flags"
```

---

## Task 5: `getCurrentState()` 우선순위 체인에 state 2/5 삽입

**Files:**
- Modify: `features/learning/home-journey-state.ts`

**Rationale:** 설계 spec §4의 우선순위대로 state 2는 `journey_not_started` 앞, state 5는 `viewed_pre_practice` 앞에 삽입한다. `graduated(7) > 2 > 1 > 6 > 5 > 4 > 3` 순서.

- [ ] **Step 1: `getCurrentState()` 본문을 업데이트된 우선순위로 교체**

`features/learning/home-journey-state.ts`의 기존 `getCurrentState`(현재 157~181행)를 다음으로 교체:

```typescript
function getCurrentState(
  summary: LearnerSummaryCurrent,
  profile: LearnerProfile | null,
): JourneyStateKey {
  // 7: 졸업은 항상 최우선.
  if (profile?.practiceGraduatedAt) {
    return 'journey_graduated';
  }

  // 2: 진단 중단. 최초 진단이 아직 완료되지 않았거나, 최신 완료 이후 새 진단이 시작돼 중단된 경우.
  if (isPendingDiagnosticFresh(profile, summary)) {
    return 'diagnostic_in_progress';
  }

  // 1: 진단 기록이 하나도 없음.
  const hasLatestDiagnostic = Boolean(summary.latestDiagnosticSummary);
  if (!hasLatestDiagnostic) {
    return 'journey_not_started';
  }

  // 6: 최신 진단 이후 review 활동이 있으면 여정이 거의 끝난 상태.
  const latestDiagnosticAt = summary.latestDiagnosticSummary?.completedAt;
  const hasReviewAfterLatestDiagnostic = hasActivityAfter(summary, 'review', latestDiagnosticAt);
  if (hasReviewAfterLatestDiagnostic) {
    return 'journey_complete_pending';
  }

  // 5: 연습 중단. 4번 조건(결과 확인) 성립 + 최신 진단 이후 시작된 pending 연습이 있을 때.
  if (profile?.latestDiagnosticResultViewedAt && isPendingPracticeFresh(profile, summary)) {
    return 'practice_in_progress';
  }

  // 4: 결과 확인 완료.
  if (profile?.latestDiagnosticResultViewedAt) {
    return 'viewed_pre_practice';
  }

  // 3: 결과 확인 전.
  return 'result_pending';
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "feat(journey): detect diagnostic/practice in-progress states in priority chain"
```

---

## Task 6: state 2/5 CTA 카피 업데이트

**Files:**
- Modify: `features/learning/home-journey-state.ts`

**Rationale:** Phase 1에서 남겨둔 placeholder를 spec §7의 최종 카피로 교체. CTA 액션은 기존 값(`start_diagnostic`, `open_review`)을 재사용하므로 `onPressJourneyCta`에서 추가 분기가 필요 없다.

- [ ] **Step 1: `stateCopyTable` 중 두 항목 교체**

`features/learning/home-journey-state.ts`의 `stateCopyTable`(현재 76~122행)에서 `diagnostic_in_progress`와 `practice_in_progress` 항목을 다음으로 교체:

```typescript
  diagnostic_in_progress: {
    bubbleText: '풀던 진단이 있어요. 다시 시작할까요?',
    ctaAction: 'start_diagnostic',
    ctaLabel: '진단 다시 시작하기',
    ctaBody: '처음부터 다시 풀면 최신 약점을 잡을 수 있어요',
  },
```

```typescript
  practice_in_progress: {
    bubbleText: '풀던 약점 연습이 있어요. 다시 시작할까요?',
    ctaAction: 'open_review',
    ctaLabel: '연습 다시 시작하기',
    ctaBody: '약점 연습을 마치면 여정이 완성됩니다',
  },
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "feat(journey): finalize CTA copy for diagnostic/practice in-progress states"
```

---

## Task 7: `use-diagnostic-screen.ts`에 SET/CLEAR 배선

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

**Rationale:** `hasStarted` true 전환 시점에 SET, `finishDiagnosis` 완료 시점에 CLEAR. `startSession` 후의 `state.hasStarted` 전환을 관찰하는 `useEffect`로 처리한다(이 훅 기존 컨벤션).

**Read first:** `features/quiz/hooks/use-diagnostic-screen.ts`의 205~213행(autostart `useEffect`) 패턴과 506~509행(`onExitDiagnosis`)을 확인한다.

- [ ] **Step 1: Context에서 pending 함수 두 개 구조 분해**

`features/quiz/hooks/use-diagnostic-screen.ts` 113행(`const { profile } = useCurrentLearner();`)을 다음으로 교체:

```typescript
  const { profile, markPendingDiagnosticStarted, clearPendingDiagnostic } = useCurrentLearner();
```

- [ ] **Step 2: `state.hasStarted`가 true로 전환될 때 SET 호출하는 effect 추가**

213행의 autostart effect 바로 뒤에 다음 블록 추가:

```typescript
  // state 2 감지용 플래그. hasStarted 전환 시마다 현재 시각으로 덮어쓴다(크로스 디바이스 stale 방지).
  useEffect(() => {
    if (isPreparingFreshSession) {
      return;
    }
    if (!state.hasStarted) {
      return;
    }
    void markPendingDiagnosticStarted().catch((err) => {
      console.warn('[DiagnosticScreen] markPendingDiagnosticStarted failed', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreparingFreshSession, state.hasStarted]);
```

주의: `markPendingDiagnosticStarted`를 deps에 넣으면 context value가 매번 재생성되어 무한 호출이 발생한다. `exhaustive-deps`를 억제하고 `hasStarted` 전환에만 반응시킨다.

- [ ] **Step 3: `onExitDiagnosis`에서 CLEAR 호출**

506~509행의 `onExitDiagnosis`를 다음으로 교체:

```typescript
  const onExitDiagnosis = () => {
    setIsExitModalVisible(false);
    finishDiagnosis();
    void clearPendingDiagnostic().catch((err) => {
      console.warn('[DiagnosticScreen] clearPendingDiagnostic failed', err);
    });
  };
```

**Why here:** `finishDiagnosis`는 (a) exit modal에서 confirm(`onExitDiagnosis`)과 (b) 진단 분석까지 완료된 후 내부적으로 호출되는 두 경로가 있다. (a)는 명시적으로 클리어, (b)는 `state.result`가 먼저 set되고 → `recordAttempt` → 분석 화면 이동으로 이어지는데, 실제 진단 결과가 Firestore에 저장되면 `latestDiagnosticSummary.completedAt`이 pending 타임스탬프보다 이후가 되어 stale 판정으로 자동 해소된다. 그래도 명시적 CLEAR가 낫다. 다음 스텝에서 완료 경로도 커버한다.

- [ ] **Step 4: `state.result` 수신 시 CLEAR 호출하는 effect 추가**

191~203행의 `state.result` 네비게이션 effect 바로 뒤에 다음 블록 추가:

```typescript
  // 진단 결과가 기록되면 pending 플래그를 명시적으로 클리어. 실패해도 stale 판정이 자동 해소한다.
  useEffect(() => {
    if (!state.result) {
      return;
    }
    void clearPendingDiagnostic().catch((err) => {
      console.warn('[DiagnosticScreen] clearPendingDiagnostic failed', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);
```

- [ ] **Step 5: 타입체크 + 린트**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: 시뮬레이터에서 sanity check**

Run: `npx expo run:ios`
Manual:
1. 신규 프로파일로 홈 → "첫 진단 시작하기" → 1문제만 풀고 홈으로 빠져나옴 (앱 강제 종료 대신 뒤로 가기 or exit)
2. 홈에 돌아왔을 때 CTA가 "진단 다시 시작하기"로 보이는지 확인

확인되지 않으면 Phase 4(debugging)로 돌아간다.

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "feat(diagnostic): set/clear pending diagnostic flag on session start/finish"
```

---

## Task 8: `use-practice-screen.ts`에 SET/CLEAR 배선 (weakness 모드 한정)

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`

**Rationale:** `activeMode === 'weakness'` 모드로 활성 문제가 로드된 시점에 SET, 모든 약점 문제를 풀어 step-complete 화면으로 이동할 때 CLEAR. `review`/`challenge` 모드는 건드리지 않는다.

**Read first:** `features/quiz/hooks/use-practice-screen.ts`의 111~120행(`activeMode` 계산), 263~276행(weakness 완료 분기), 421~432행(`onGraduate`)을 확인한다.

- [ ] **Step 1: Context에서 pending 함수 두 개 구조 분해**

91행(`const { graduateToPractice, profile, recordAttempt, session, summary } = useCurrentLearner();`)을 다음으로 교체:

```typescript
  const {
    clearPendingPractice,
    graduateToPractice,
    markPendingPracticeStarted,
    profile,
    recordAttempt,
    session,
    summary,
  } = useCurrentLearner();
```

- [ ] **Step 2: weakness 모드 활성 문제 로드 시 SET effect 추가**

`activeProblem`/`activeReviewTask`에 반응해 state를 리셋하는 effect(현재 159~167행) 바로 뒤에 삽입:

```typescript
  // state 5 감지용 플래그. weakness 모드에서 활성 문제가 잡혀 실제 풀이 중일 때만 SET.
  // review/challenge 모드는 건드리지 않는다.
  useEffect(() => {
    if (activeMode !== 'weakness') {
      return;
    }
    if (!activeProblem) {
      return;
    }
    void markPendingPracticeStarted().catch((err) => {
      console.warn('[PracticeScreen] markPendingPracticeStarted failed', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, activeProblem?.id]);
```

주의: `activeProblem` 전체가 아니라 `activeProblem?.id`로 dep을 걸어야 매 렌더 재호출을 피한다.

- [ ] **Step 3: weakness 모드 마지막 문제 완료 분기에 CLEAR 추가**

264~276행의 weakness 모드 완료 분기를 다음으로 교체:

```typescript
    if (state.result && state.practiceMode === 'weakness') {
      const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
      advancePractice();

      if (isLast) {
        resetSession();
        void clearPendingPractice().catch((err) => {
          console.warn('[PracticeScreen] clearPendingPractice failed', err);
        });
        router.replace({
          pathname: '/quiz/step-complete',
          params: { step: 'practice' },
        });
      }
      return;
    }
```

- [ ] **Step 4: `onGraduate`에서도 CLEAR 호출**

421~433행의 `onGraduate`를 다음으로 교체:

```typescript
    onGraduate: () => {
      if (isGraduating) {
        return;
      }
      setIsGraduating(true);
      void graduateToPractice()
        .then(() => {
          void clearPendingPractice().catch((err) => {
            console.warn('[PracticeScreen] clearPendingPractice failed', err);
          });
          router.replace('/(tabs)/quiz');
        })
        .catch(() => {
          setIsGraduating(false);
        });
    },
```

**Why:** `graduateToPractice` 후에는 state 7(graduated)이 모든 우선순위를 이기므로 pending 플래그가 남아 있어도 표시에는 영향이 없다. 그래도 데이터 정합을 위해 클리어한다.

- [ ] **Step 5: 타입체크 + 린트**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: 시뮬레이터에서 sanity check**

Run: `npx expo run:ios`
Manual:
1. 진단 완료 후 결과 화면 확인 → 홈으로 → "약점 연습 시작하기" → weakness 1문제만 풀고 뒤로 가기
2. 홈에 돌아왔을 때 CTA가 "연습 다시 시작하기"로 보이는지 확인
3. review 모드로 들어가 문제를 풀어도 pending 플래그가 SET되지 않는지 확인 (Firestore 콘솔 or 다음 홈 복귀 시 state 변화 없음으로 판단)

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts
git commit -m "feat(practice): set/clear pending practice flag for weakness mode"
```

---

## Task 9: 크로스 디바이스 수동 QA + 최종 커밋

**Files:** (검증만)

**Rationale:** 설계의 핵심 가치(크로스 디바이스)와 stale 판정을 실제 기기에서 확인한다.

- [ ] **Step 1: 단일 기기 진단 중단 → 재개 CTA 확인**

1. 시뮬레이터에서 신규 계정으로 로그인.
2. 홈 → 진단 시작 → 2~3문제만 풀고 앱 종료.
3. 앱 재실행 → 홈 화면에서 버블 텍스트 "풀던 진단이 있어요. 다시 시작할까요?" / CTA "진단 다시 시작하기" 노출 확인.
4. CTA 탭 → 진단 화면 진입 → 새 진단 세션 시작(이어서가 아니라 재시작)임을 확인.
5. 진단 끝까지 완료 → 홈 복귀 → CTA가 "약점 결과 보기"(state 3)로 바뀌었는지 확인.

- [ ] **Step 2: 단일 기기 연습 중단 → 재개 CTA 확인**

1. 진단 완료 + 결과 화면 본 상태에서 "약점 연습 시작하기" → weakness 1~2문제 풀고 앱 종료.
2. 재실행 → 홈에서 "풀던 약점 연습이 있어요. 다시 시작할까요?" / "연습 다시 시작하기" 확인.
3. CTA 탭 → 연습 화면 진입 → 처음부터 재시작.
4. 전체 약점 큐 완료 → step-complete 진입 → 홈 복귀 → CTA가 "새로 시작하기 →"(state 6)로 바뀌는지 확인.

- [ ] **Step 3: 크로스 디바이스 진단 시나리오**

기기 A(시뮬레이터) + 기기 B(실기기 or 다른 시뮬레이터) 양쪽 동일 계정 로그인:

1. A에서 진단 시작 → 2문제 풀고 앱 백그라운드.
2. B에서 앱 실행 → Firestore sync 대기 후 홈에서 state 2 CTA 확인.
3. B에서 진단 완료 → A 앱을 전경으로 → refresh(focus effect) → A에서도 state 3/4로 전환 확인.

- [ ] **Step 4: stale 시뮬레이션**

Firestore 콘솔에서 수동으로 `pendingDiagnosticStartedAt`을 과거 날짜로 설정하거나, `preview-seed`에 `pending` 필드를 수동 주입(코드 변경 없이 콘솔로):

1. `latestDiagnosticSummary.completedAt`보다 과거 값의 `pendingDiagnosticStartedAt`을 강제 주입.
2. 앱 홈에서 state 3/4가 표시되는지(state 2가 건너뛰어지는지) 확인.

- [ ] **Step 5: Notion "DASIDA 개발 기록" 페이지 업데이트**

Phase 2 페이지(브레인스토밍 단계에서 생성된 초안)의 Plan 필드에 이 파일의 GitHub permalink(커밋 해시 포함)를 추가한다. 상태는 `구현중`으로 유지.

- [ ] **Step 6: 최종 커밋 및 로그**

변경이 여기까지 모두 커밋된 상태라면 추가 커밋은 불필요. 로그:

```bash
git push origin $(git branch --show-current)
npm run log:commit
```

---

## 검증 체크리스트 (all tasks done)

- [ ] `LearnerProfile`에 `pendingDiagnosticStartedAt`, `pendingPracticeStartedAt` 필드 존재
- [ ] `CurrentLearnerController` 4개 메서드 존재 및 `provider.tsx`에서 노출
- [ ] `getCurrentState()` 우선순위: `graduated > 2 > 1 > 6 > 5 > 4 > 3`
- [ ] state 2 진입 조건: `pendingDiagnosticStartedAt` 있고 `completedAt`보다 이후(혹은 completedAt 없음)
- [ ] state 5 진입 조건: state 4 조건 + `pendingPracticeStartedAt > latestDiagnosticCompletedAt`
- [ ] stale 타임스탬프는 state 2/5를 건너뛰고 정상 우선순위로 복귀
- [ ] SET은 기존 값이 있어도 덮어씀 (크로스 디바이스 최신성 보장)
- [ ] CLEAR는 기존 값이 없으면 no-op (불필요한 쓰기 방지)
- [ ] review/challenge 모드에서는 `pendingPracticeStartedAt`를 건드리지 않음
- [ ] `stateCopyTable`의 state 2/5 카피가 "다시 시작하기" 계열로 교체됨
- [ ] `npm run typecheck && npm run lint` 모두 통과

## Scope 밖 (Phase 3 후보)

- 실제 세션 재개 (진단 4번 문제부터 이어 풀기)
- `pendingExamStartedAt` (모의고사 in-progress)
- RN 소스 Jest 하네스 구축 후 `home-journey-state.test.ts` 작성
