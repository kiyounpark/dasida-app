# 복습 자동 이어풀기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 한 개를 끝내면 홈으로 돌아가지 않고 징검다리 화면을 거쳐 다음 due 복습으로 자동 이어지게 한다 (졸업은 자동 금지).

**Architecture:** 순수 헬퍼 모듈(`review-chain.ts`)이 "다음 due 복습"을 계산한다. 복습 세션 훅은 마지막 스텝 완료 시 기존 저장 파이프라인을 돌린 뒤 결과로 `completionOutcome`(bridge/allDone/graduation) 상태를 만든다. 라우트는 `key={taskId}`로 강제 리마운트해 다음 복습 진입 시 훅 상태/ref가 깨끗하게 초기화된다. 진행 카운터는 라우트 파라미터로 라운드트립한다.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest(@testing-library/react-native), Playwright(e2e).

---

## 배경 / 스펙

- 스펙: `docs/superpowers/specs/2026-05-19-review-auto-continue-design.md` (승인됨, 커밋 `51d88da`)
- 확정 사항: 징검다리 B안(다음 약점 이름 노출) / 졸업(day30) 자동 진행 금지 / 진행 분모 시작 시점 고정 / due 판정은 store 재조회 / 타이머 2.5초 + 상호작용 시 취소.

## 현재 동작 (변경 전 사실)

- 라우트 `app/quiz/review-session.tsx` → `useReviewSessionScreen()` (`features/quiz/hooks/use-review-session-screen.ts`) → `ReviewSessionScreenView`.
- 마지막 스텝 done-cta 탭 → `onPressDoneCta`(=`onPressNext`=`onPressContinue`) → `setSessionComplete(true)`.
- `screen-view`가 `sessionComplete`면 `<DoneView onComplete={onComplete} />` 렌더.
- `DoneView` 버튼 → `onComplete()`: recordAttempt → completeReviewTask → spawnMistakeReviewTasks → rescheduleAllReviewNotifications → refresh → **`router.back()`**.
- `completeReviewTask`는 day30이면 다음 task 없이 완료만(졸업), 아니면 다음 stage task(미래 날짜) 생성.
- `buildReviewTaskState`(`features/learning/local-learning-history-repository.ts:71`, **비공개**)는 미완료 task를 `scheduledFor` 오름차순 정렬, `scheduledFor<=today`를 due로 본다.

## File Structure

**신규**
- `features/learning/review-chain.ts` — 순수 함수. 다음 due 복습 / 남은 due 개수 / 다음 stage 오프셋 계산.
- `features/learning/review-chain.test.ts` — 위 모듈 단위 테스트.
- `features/quiz/components/review-session/bridge-view.tsx` — 징검다리 화면(B안). 2.5초 자동 진행 + 상호작용 시 취소.
- `features/quiz/components/review-session/all-done-view.tsx` — "오늘 복습 다 끝냈어요" 종료 화면.

**수정**
- `features/quiz/hooks/use-review-session-screen.ts` — `completionOutcome` 상태 + finalize 이펙트 + 체인 네비 핸들러. `onComplete` 끝의 `router.back()` 제거.
- `features/quiz/components/review-session-screen-view.tsx` — `completionOutcome` 분기 렌더.
- `app/quiz/review-session.tsx` — `key={taskId}` 리마운트 래퍼.
- `features/quiz/hooks/use-review-session-screen.test.ts` — expo-router mock에 `replace` 추가, finalize 이펙트 영향 반영.
- `e2e/review-session.spec.ts` — 테스트 4 종료 문구 갱신.

> `done-view.tsx`는 **수정하지 않는다**. 졸업 화면은 기존 `DoneView`(isGraduated 분기)를 그대로 재사용한다.

---

## Task 1: 순수 헬퍼 `review-chain.ts` (TDD)

**Files:**
- Create: `features/learning/review-chain.ts`
- Test: `features/learning/review-chain.test.ts`

- [ ] **Step 1: Write the failing test**

Create `features/learning/review-chain.test.ts`:

```ts
import type { ReviewTask } from './types';
import {
  resolveNextDueReview,
  countDueReviews,
  nextStageOffsetDays,
} from './review-chain';

function task(p: Partial<ReviewTask> & { id: string }): ReviewTask {
  return {
    id: p.id,
    accountKey: 'acc-1',
    weaknessId: p.weaknessId ?? ('formula_understanding' as ReviewTask['weaknessId']),
    source: 'diagnostic',
    sourceId: p.sourceId ?? 'src-1',
    scheduledFor: p.scheduledFor ?? '2000-01-01',
    stage: p.stage ?? 'day1',
    completed: p.completed ?? false,
    createdAt: '2000-01-01T00:00:00.000Z',
  };
}

describe('resolveNextDueReview', () => {
  it('완료/방금 끝낸 task/미래 task를 제외하고 가장 이른 due를 반환', () => {
    const tasks: ReviewTask[] = [
      task({ id: 'done', completed: true }),
      task({ id: 'just', scheduledFor: '2000-01-01' }),
      task({ id: 'future', scheduledFor: '2999-01-01' }),
      task({ id: 'dueB', scheduledFor: '2000-01-03' }),
      task({ id: 'dueA', scheduledFor: '2000-01-02' }),
    ];
    const r = resolveNextDueReview(tasks, 'just');
    expect(r.nextDue?.id).toBe('dueA');
    expect(r.dueRemaining).toBe(2);
  });

  it('남은 due가 없으면 nextDue=null, dueRemaining=0', () => {
    const tasks: ReviewTask[] = [
      task({ id: 'just', scheduledFor: '2000-01-01' }),
      task({ id: 'future', scheduledFor: '2999-01-01' }),
    ];
    const r = resolveNextDueReview(tasks, 'just');
    expect(r.nextDue).toBeNull();
    expect(r.dueRemaining).toBe(0);
  });
});

describe('countDueReviews', () => {
  it('미완료 + scheduledFor<=today 인 task 수 (현재 진행 task 포함)', () => {
    const tasks: ReviewTask[] = [
      task({ id: 'a', scheduledFor: '2000-01-01' }),
      task({ id: 'b', scheduledFor: '2000-01-01' }),
      task({ id: 'c', completed: true, scheduledFor: '2000-01-01' }),
      task({ id: 'd', scheduledFor: '2999-01-01' }),
    ];
    expect(countDueReviews(tasks)).toBe(2);
  });
});

describe('nextStageOffsetDays', () => {
  it('day1→3, day3→7, day7→30, day30→null', () => {
    expect(nextStageOffsetDays('day1')).toBe(3);
    expect(nextStageOffsetDays('day3')).toBe(7);
    expect(nextStageOffsetDays('day7')).toBe(30);
    expect(nextStageOffsetDays('day30')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/learning/review-chain.test.ts`
Expected: FAIL — `Cannot find module './review-chain'`.

- [ ] **Step 3: Write minimal implementation**

Create `features/learning/review-chain.ts`:

```ts
// features/learning/review-chain.ts
import { compareTimestampsAsc } from '@/functions/shared/timestamp-utils';

import type { ReviewStage } from './history-types';
import { getNextReviewStage, REVIEW_STAGE_OFFSETS } from './review-stage';
import type { ReviewTask } from './types';

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface NextDueResolution {
  nextDue: ReviewTask | null;
  dueRemaining: number;
}

/**
 * 저장(완료 처리) 직후 store에서 다시 읽은 task 목록에서, 방금 끝낸 복습을 빼고
 * "오늘 due"이며 가장 이른 복습을 찾는다. 미래 task(다음 stage)·내일 task(오답 spawn)는
 * scheduledFor>today 이므로 자연히 제외된다.
 */
export function resolveNextDueReview(
  tasks: ReviewTask[],
  justCompletedTaskId: string,
): NextDueResolution {
  const today = todayStr();
  const due = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.id !== justCompletedTaskId &&
        t.scheduledFor.slice(0, 10) <= today,
    )
    .sort((a, b) => compareTimestampsAsc(a.scheduledFor, b.scheduledFor));
  return { nextDue: due[0] ?? null, dueRemaining: due.length };
}

/** 진행 분모(시작 시점 고정용): 현재 진행 중인 복습을 포함한 오늘 due 개수. */
export function countDueReviews(tasks: ReviewTask[]): number {
  const today = todayStr();
  return tasks.filter(
    (t) => !t.completed && t.scheduledFor.slice(0, 10) <= today,
  ).length;
}

/** 방금 끝낸 복습(약점)의 다음 단계가 며칠 뒤인지. day30(졸업)은 null. */
export function nextStageOffsetDays(stage: ReviewStage): number | null {
  const next = getNextReviewStage(stage);
  return next ? REVIEW_STAGE_OFFSETS[next] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest features/learning/review-chain.test.ts`
Expected: PASS (8 assertions across 3 describe blocks).

- [ ] **Step 5: Commit**

```bash
git add features/learning/review-chain.ts features/learning/review-chain.test.ts
git commit -m "feat(review): 다음 due 복습 계산 순수 헬퍼 추가"
```

---

## Task 2: 징검다리 컴포넌트 `BridgeView`

**Files:**
- Create: `features/quiz/components/review-session/bridge-view.tsx`

디자인 토큰: `./paper-tokens`의 `Paper`, `@/constants/typography`의 `FontFamilies`. 스탬프/버튼 스타일은 `done-view.tsx`의 톤을 축소 변형(라운드 스탬프, forest800 버튼, ink 그림자).

- [ ] **Step 1: Create the component**

Create `features/quiz/components/review-session/bridge-view.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

const AUTO_ADVANCE_MS = 2500;

interface BridgeViewProps {
  prevLabel: string | null;
  nextLabel: string | null;
  chainDone: number;
  chainTotal: number;
  nextStageDays: number | null;
  paddingBottom: number;
  onContinue: () => void;
}

export function BridgeView({
  prevLabel,
  nextLabel,
  chainDone,
  chainTotal,
  nextStageDays,
  paddingBottom,
  onContinue,
}: BridgeViewProps) {
  // 자동 진행 / 진행 가드: 자동·수동 어느 쪽이든 한 번만 진행한다.
  const advancedRef = useRef(false);
  const [autoCancelled, setAutoCancelled] = useState(false);

  const advance = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    onContinue();
  };

  const cancelAuto = () => setAutoCancelled(true);

  useEffect(() => {
    if (autoCancelled) return;
    const timer = setTimeout(advance, AUTO_ADVANCE_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') setAutoCancelled(true);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
    // autoCancelled가 true가 되면 effect cleanup으로 타이머 제거 후 재등록 안 함.
  }, [autoCancelled]);

  const title = prevLabel ? `${prevLabel} 복습 완료!` : '복습 완료!';
  const progress =
    nextLabel
      ? `다음은 ${nextLabel} · 오늘 ${chainDone} / ${chainTotal}`
      : `오늘 ${chainDone} / ${chainTotal} 완료`;
  const buttonLabel = nextLabel ? `${nextLabel} 복습 이어서 →` : '복습 이어서 →';
  const scheduleText =
    prevLabel && nextStageDays != null
      ? `${prevLabel}는 ${nextStageDays}일 뒤에 다시 만나요`
      : null;

  return (
    <ScrollView
      contentContainerStyle={[styles.wrap, { paddingBottom }]}
      onScrollBeginDrag={cancelAuto}
      onTouchStart={cancelAuto}>
      <View style={styles.stampRing}>
        <Text style={styles.stampKo}>완 료</Text>
        <Text style={styles.stampEn}>REVIEWED</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.progress}>{progress}</Text>

      {scheduleText ? (
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleIcon}>📅</Text>
          <Text style={styles.scheduleText}>{scheduleText}</Text>
        </View>
      ) : null}

      <Pressable
        style={styles.primaryBtn}
        onPress={advance}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}>
        <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
      </Pressable>
      <Text style={styles.autoHint}>
        {autoCancelled ? '버튼을 눌러 계속하세요' : '잠시 후 자동으로 이어집니다'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 36,
    gap: 14,
  },
  stampRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: Paper.rustDeep,
    backgroundColor: 'rgba(122,46,31,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    marginBottom: 4,
  },
  stampKo: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 20,
    letterSpacing: 4,
    color: Paper.rustDeep,
    lineHeight: 22,
  },
  stampEn: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 8,
    letterSpacing: 2,
    color: Paper.rustDeep,
    marginTop: 4,
  },
  title: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 21,
    color: Paper.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  progress: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: Paper.forest800,
    textAlign: 'center',
  },
  scheduleCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scheduleIcon: { fontSize: 15 },
  scheduleText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 12.5,
    color: Paper.ink,
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
  autoHint: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    color: Paper.inkFaint,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep bridge-view || echo "no bridge-view errors"`
Expected: `no bridge-view errors`.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/review-session/bridge-view.tsx
git commit -m "feat(review): 징검다리(BridgeView) 컴포넌트 추가"
```

---

## Task 3: 전체 완료 컴포넌트 `AllDoneView`

**Files:**
- Create: `features/quiz/components/review-session/all-done-view.tsx`

- [ ] **Step 1: Create the component**

Create `features/quiz/components/review-session/all-done-view.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

interface AllDoneViewProps {
  totalCount: number;
  paddingBottom: number;
  onHome: () => void;
}

export function AllDoneView({
  totalCount,
  paddingBottom,
  onHome,
}: AllDoneViewProps) {
  return (
    <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom }]}>
      <View style={styles.stampRing}>
        <Text style={styles.stampKo}>완 료</Text>
        <Text style={styles.stampEn}>ALL DONE</Text>
      </View>

      <Text style={styles.title}>오늘 복습 다 끝냈어요 🎉</Text>
      <Text style={styles.sub}>{totalCount}개 전부 복습 완료</Text>

      <Pressable
        style={styles.primaryBtn}
        onPress={onHome}
        accessibilityRole="button"
        accessibilityLabel="홈으로 돌아가기">
        <Text style={styles.primaryBtnText}>홈으로 돌아가기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 40,
    gap: 14,
  },
  stampRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: Paper.forest800,
    backgroundColor: 'rgba(41,59,39,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    marginBottom: 6,
  },
  stampKo: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 22,
    letterSpacing: 4,
    color: Paper.forest800,
    lineHeight: 24,
  },
  stampEn: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 9,
    letterSpacing: 2,
    color: Paper.forest800,
    marginTop: 4,
  },
  title: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 22,
    color: Paper.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  sub: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 21,
    color: Paper.inkMute,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep all-done-view || echo "no all-done-view errors"`
Expected: `no all-done-view errors`.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/review-session/all-done-view.tsx
git commit -m "feat(review): 전체 완료(AllDoneView) 컴포넌트 추가"
```

---

## Task 4: 훅에 `completionOutcome` + finalize 이펙트 + 체인 네비 추가

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

### Step 1: import 추가

- [ ] `@/data/diagnosisMap` import에 `diagnosisMap` 추가, review-chain import 추가.

`features/quiz/hooks/use-review-session-screen.ts:6` 을 다음으로 교체:

```ts
import { diagnosisMap, type WeaknessId } from '@/data/diagnosisMap';
```

그리고 `features/quiz/hooks/use-review-session-screen.ts:7` (review-scheduler import) **다음 줄**에 추가:

```ts
import {
  resolveNextDueReview,
  countDueReviews,
  nextStageOffsetDays,
  type NextDueResolution,
} from '@/features/learning/review-chain';
```

### Step 2: 타입 + 결과 필드 추가

- [ ] `UseReviewSessionScreenResult` 타입(`features/quiz/hooks/use-review-session-screen.ts:45-72`)에서 `onComplete: () => void;` **다음 줄**에 추가:

```ts
  completionOutcome: CompletionOutcome | null;
  onAdvanceChain: () => void;
  onGraduationContinue: () => void;
  onHome: () => void;
```

- [ ] 같은 파일 `export type UseReviewSessionScreenResult = {` **위**에 타입 정의 추가:

```ts
export type CompletionOutcome =
  | {
      kind: 'bridge';
      prevLabel: string | null;
      nextLabel: string | null;
      nextTaskId: string;
      chainDone: number;
      chainTotal: number;
      nextStageDays: number | null;
    }
  | { kind: 'graduation'; prevLabel: string | null; nextTaskId: string | null }
  | { kind: 'allDone'; totalCount: number };
```

### Step 3: 체인 파라미터 + 상태 + 가드 ref

- [ ] `useReviewSessionScreen()` 본문에서 `const taskId = getSingleParam(params.taskId) ?? '';`(`:76`) **다음 줄**에 추가:

```ts
  const chainTotalParam = Number(getSingleParam(params.chainTotal));
  const chainDoneParam = Number(getSingleParam(params.chainDone));
  const hasChainParams =
    Number.isFinite(chainTotalParam) && chainTotalParam > 0;
  const chainDone = Number.isFinite(chainDoneParam) ? chainDoneParam : 0;
```

- [ ] `const [sessionComplete, setSessionComplete] = useState(false);`(`:85`) **다음 줄**에 추가:

```ts
  const [completionOutcome, setCompletionOutcome] =
    useState<CompletionOutcome | null>(null);
  const [resolvedChainTotal, setResolvedChainTotal] = useState<number | null>(
    hasChainParams ? chainTotalParam : null,
  );
  // finalize는 정확히 한 번만 (이펙트 + 직접 호출 모두 가드).
  const finalizeStartedRef = useRef(false);
```

### Step 4: 시작 시점 분모 고정 (mount 폴백)

- [ ] task 로드 effect의 실제 store 분기(`store.load(accountKey).then((tasks) => {`, `:159`) 안에서 `if (found) {` 블록 마지막 줄(`sessionStartedAtRef.current = new Date().toISOString();`, `:172`) **다음 줄**에 추가:

```ts
        if (!hasChainParams) {
          setResolvedChainTotal(countDueReviews(tasks));
        }
```

### Step 5: `onComplete` 꼬리의 `router.back()`을 결과 계산으로 교체

- [ ] `features/quiz/hooks/use-review-session-screen.ts` 의 `onComplete` 함수에서 아래 블록

```ts
    try {
      await completeReviewTask(accountKey, task.id, store);
      // F4: completeReviewTask가 만든 다음 단계 task까지 보고 강등하도록 재로드 후 spawn
      await spawnMistakeReviewTasks(
        accountKey,
        task.sourceId,
        mistakeWeaknessIds,
        store,
      );
      void rescheduleAllReviewNotifications(accountKey, store).catch(console.warn);
      await refresh();
    } catch (error) {
      console.warn('Failed to complete review task', error);
    }
    router.back();
  };
```

를 다음으로 교체:

```ts
    let resolution: NextDueResolution = { nextDue: null, dueRemaining: 0 };
    try {
      await completeReviewTask(accountKey, task.id, store);
      // F4: completeReviewTask가 만든 다음 단계 task까지 보고 강등하도록 재로드 후 spawn
      await spawnMistakeReviewTasks(
        accountKey,
        task.sourceId,
        mistakeWeaknessIds,
        store,
      );
      void rescheduleAllReviewNotifications(accountKey, store).catch(console.warn);
      await refresh();
      // due 판정 단일 소스: 저장 직후 store 재조회 (인메모리 homeState 신뢰 안 함).
      const latest = await store.load(accountKey);
      resolution = resolveNextDueReview(latest, task.id);
    } catch (error) {
      console.warn('Failed to complete review task', error);
    }
    if (isCancelled()) return;

    const labelFor = (id: WeaknessId): string | null =>
      diagnosisMap[id]?.labelKo ?? null;
    const total = resolvedChainTotal ?? chainDone + 1;
    const doneNow = chainDone + 1;

    if (task.stage === 'day30') {
      setCompletionOutcome({
        kind: 'graduation',
        prevLabel: labelFor(task.weaknessId),
        nextTaskId: resolution.nextDue?.id ?? null,
      });
    } else if (resolution.nextDue) {
      setCompletionOutcome({
        kind: 'bridge',
        prevLabel: labelFor(task.weaknessId),
        nextLabel: labelFor(resolution.nextDue.weaknessId),
        nextTaskId: resolution.nextDue.id,
        chainDone: doneNow,
        chainTotal: total,
        nextStageDays: nextStageOffsetDays(task.stage),
      });
    } else {
      setCompletionOutcome({ kind: 'allDone', totalCount: total });
    }
  };
```

> `router` import는 유지된다(아래 핸들러에서 `router.replace`/`router.back` 사용). `onComplete`의 이중 실행 방지 가드는 Step 6의 호출부에서 적용한다.

### Step 6: finalize 이펙트 + 네비 핸들러

- [ ] `onComplete` 함수 정의 **다음 줄**(닫는 `};` 뒤, `return {` 전)에 추가:

```ts
  // 마지막 스텝 완료 → sessionComplete=true가 되면 저장/결과계산을 자동 1회 실행한다.
  // (DoneView를 거치지 않고 곧장 Bridge/AllDone/졸업 화면으로 간다.)
  useEffect(() => {
    if (
      sessionComplete &&
      !completionOutcome &&
      !finalizeStartedRef.current &&
      task &&
      profile
    ) {
      finalizeStartedRef.current = true;
      void onComplete();
    }
  }, [sessionComplete, completionOutcome, task, profile]);

  const onAdvanceChain = () => {
    if (completionOutcome?.kind !== 'bridge') return;
    router.replace({
      pathname: '/quiz/review-session',
      params: {
        taskId: completionOutcome.nextTaskId,
        chainTotal: String(completionOutcome.chainTotal),
        chainDone: String(completionOutcome.chainDone),
      },
    });
  };

  const onGraduationContinue = () => {
    if (completionOutcome?.kind !== 'graduation') return;
    if (completionOutcome.nextTaskId) {
      router.replace({
        pathname: '/quiz/review-session',
        params: {
          taskId: completionOutcome.nextTaskId,
          chainTotal: String(resolvedChainTotal ?? chainDone + 1),
          chainDone: String(chainDone + 1),
        },
      });
    } else {
      router.back();
    }
  };

  const onHome = () => router.back();
```

- [ ] 같은 파일 `return {` 객체에서 `onComplete,` **다음 줄**에 추가:

```ts
    completionOutcome,
    onAdvanceChain,
    onGraduationContinue,
    onHome,
```

### Step 7: Type-check

- [ ] Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep use-review-session-screen || echo "no hook type errors"`
Expected: `no hook type errors`.

### Step 8: Commit

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat(review): 완료 결과(bridge/allDone/졸업) 계산 및 체인 네비 핸들러"
```

---

## Task 5: `screen-view`에서 결과 분기 렌더

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: import 추가**

`features/quiz/components/review-session-screen-view.tsx:21`(`import { DoneView } ...`) **다음 줄**에 추가:

```tsx
import { BridgeView } from './review-session/bridge-view';
import { AllDoneView } from './review-session/all-done-view';
```

- [ ] **Step 2: props 구조분해에 결과 필드 추가**

`features/quiz/components/review-session-screen-view.tsx:37`(`onComplete,`) **다음 줄**에 추가:

```tsx
  completionOutcome,
  onAdvanceChain,
  onGraduationContinue,
  onHome,
```

- [ ] **Step 3: 결과 분기 블록 삽입**

`features/quiz/components/review-session-screen-view.tsx:130` 의 다음 블록

```tsx
  if (sessionComplete || !step) {
    return (
      <View style={styles.screen}>
        {appBar}
        <DoneView
          task={task}
          weaknessLabel={weaknessLabel}
          paddingBottom={insets.bottom + 24}
          onComplete={onComplete}
        />
      </View>
    );
  }
```

를 다음으로 교체:

```tsx
  if (completionOutcome) {
    if (completionOutcome.kind === 'bridge') {
      return (
        <View style={styles.screen}>
          {appBar}
          <BridgeView
            prevLabel={completionOutcome.prevLabel}
            nextLabel={completionOutcome.nextLabel}
            chainDone={completionOutcome.chainDone}
            chainTotal={completionOutcome.chainTotal}
            nextStageDays={completionOutcome.nextStageDays}
            paddingBottom={insets.bottom + 24}
            onContinue={onAdvanceChain}
          />
        </View>
      );
    }
    if (completionOutcome.kind === 'allDone') {
      return (
        <View style={styles.screen}>
          {appBar}
          <AllDoneView
            totalCount={completionOutcome.totalCount}
            paddingBottom={insets.bottom + 24}
            onHome={onHome}
          />
        </View>
      );
    }
    // graduation: 기존 졸업 화면 재사용, 자동 진행 없음(버튼 탭만).
    return (
      <View style={styles.screen}>
        {appBar}
        <DoneView
          task={task}
          weaknessLabel={weaknessLabel}
          paddingBottom={insets.bottom + 24}
          onComplete={onGraduationContinue}
        />
      </View>
    );
  }

  if (sessionComplete || !step) {
    // 저장/결과 계산 중(아주 짧음) — 빈 화면 대신 로딩 표시.
    return (
      <View style={styles.screen}>
        {appBar}
        <LoadingView spin={spin} />
      </View>
    );
  }
```

> `LoadingView`/`spin`은 이미 이 파일에서 import·사용 중(`:23`, `:121`)이라 추가 import 불필요.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep review-session-screen-view || echo "no screen-view errors"`
Expected: `no screen-view errors`.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review): 완료 결과별 화면 분기 (Bridge/AllDone/졸업)"
```

---

## Task 6: 라우트 `key={taskId}` 강제 리마운트

**Files:**
- Modify: `app/quiz/review-session.tsx`

다음 복습으로 `router.replace` 시 같은 라우트라 컴포넌트가 리마운트되지 않을 수 있다. `key={taskId}`로 강제 리마운트해 훅 상태/ref가 깨끗하게 초기화되게 한다.

- [ ] **Step 1: 라우트 파일 교체**

`app/quiz/review-session.tsx` 전체를 다음으로 교체:

```tsx
// app/(tabs)/quiz/review-session.tsx
import { useLocalSearchParams } from 'expo-router';

import { ReviewSessionScreenView } from '@/features/quiz/components/review-session-screen-view';
import { useReviewSessionScreen } from '@/features/quiz/hooks/use-review-session-screen';
import { getSingleParam } from '@/utils/get-single-param';

function ReviewSessionInner() {
  const screen = useReviewSessionScreen();
  return <ReviewSessionScreenView {...screen} />;
}

export default function ReviewSessionRoute() {
  const params = useLocalSearchParams();
  const taskId = getSingleParam(params.taskId) ?? '';
  // taskId가 바뀌면 (체인 자동 진행) 전체를 리마운트해 세션 상태를 초기화한다.
  return <ReviewSessionInner key={taskId} />;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "quiz/review-session" || echo "no route errors"`
Expected: `no route errors`.

- [ ] **Step 3: Commit**

```bash
git add app/quiz/review-session.tsx
git commit -m "feat(review): 체인 진입 시 taskId 키로 강제 리마운트"
```

---

## Task 7: 기존 단위 테스트 갱신 (필수)

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.test.ts`

스펙 §8: `onComplete`이 더 이상 `router.back()`을 호출하지 않고, `sessionComplete`가 되면 finalize 이펙트가 자동으로 `onComplete`을 1회 실행한다. expo-router mock에 `replace`가 없으면 코드 경로에 따라 throw 가능 → 추가한다.

- [ ] **Step 1: expo-router mock 보강**

`features/quiz/hooks/use-review-session-screen.test.ts:19-22` 의

```ts
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ taskId: '__mock__' }),
}));
```

를 다음으로 교체:

```ts
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ taskId: '__mock__' }),
}));
```

- [ ] **Step 2: onComplete 이중 실행 가드 확인 테스트 추가**

`features/quiz/hooks/use-review-session-screen.test.ts` 의 `it('onComplete: completeReviewTask 후 store 재로드해 spawn 호출, 오답 약점만 전달', ...)` 테스트(`:223`) **다음**에 새 테스트 추가:

```ts
  it('finalize 가드: sessionComplete 자동 finalize 후 onComplete 직접 호출은 no-op', async () => {
    (completeReviewTask as jest.Mock).mockClear();

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const totalSteps = result.current.steps.length;

    for (let i = 0; i < totalSteps; i += 1) {
      const correctIdx = result.current.steps[i].choices.findIndex(
        (c) => c.correct,
      );
      await act(async () => {
        result.current.onSelectChoice(correctIdx);
      });
      await act(async () => {
        result.current.onPressContinue();
      });
    }

    // 마지막 onPressContinue → sessionComplete=true → finalize 이펙트가 onComplete 1회 실행
    await waitFor(() =>
      expect(result.current.completionOutcome).not.toBeNull(),
    );
    expect(completeReviewTask as jest.Mock).toHaveBeenCalledTimes(1);

    // 직접 한 번 더 호출해도 가드로 인해 재저장 없음
    await act(async () => {
      await result.current.onComplete();
    });
    expect(completeReviewTask as jest.Mock).toHaveBeenCalledTimes(1);
  });
```

> 기존 `onComplete:` 테스트들(`:207`, `:245`)은 스텝을 모두 진행한 뒤 `await onComplete()`를 호출한다. 마지막 `onPressContinue`에서 finalize 이펙트가 먼저 1회 실행되고, 직접 호출은 가드로 no-op이 되므로 `recordAttempt`/`completeReviewTask`/`spawnMistakeReviewTasks`의 `toHaveBeenCalledTimes(1)`·인자 단언은 그대로 통과한다. (store.load mock이 `[]`라 결과는 `allDone`.)

- [ ] **Step 3: 전체 훅 테스트 실행**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts`
Expected: PASS (신규 1건 포함 전부 green). 실패 시 실패 메시지의 단언을 새 동작(`completionOutcome` 설정, `router.back` 미호출)에 맞게 수정 — 단, `recordAttempt`/`completeReviewTask`/`spawnMistakeReviewTasks` 호출 단언은 의미가 동일하므로 유지.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "test(review): 자동 finalize/체인 네비에 맞춰 훅 테스트 갱신"
```

---

## Task 8: e2e 테스트 갱신

**Files:**
- Modify: `e2e/review-session.spec.ts`

"오늘 복습 있음" 시드는 단일 due 복습이다. 변경 후 마지막 스텝 완료 → 남은 due 0 → **AllDoneView**("오늘 복습 다 끝냈어요 🎉")가 표시된다. 기존 테스트 4는 `모든 단계 완료!`(구 DoneView 문구)를 기대하므로 갱신한다.

- [ ] **Step 1: 테스트 4 기대값 교체**

`e2e/review-session.spec.ts:82-110` 의 for 루프 종료 조건과 마지막 단언을 교체한다.

`const isDone = await page.getByText('모든 단계 완료!').isVisible();`(`:83`)
→ `const isDone = await page.getByText('오늘 복습 다 끝냈어요 🎉').isVisible();`

그리고 `:107-109`

```ts
    await expect(page.getByText('모든 단계 완료!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('✓ 기억났어요!')).toBeVisible();
    await expect(page.getByText('🤔 다시 볼게요')).toBeVisible();
```

를 다음으로 교체:

```ts
    await expect(page.getByText('오늘 복습 다 끝냈어요 🎉')).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByRole('button', { name: '홈으로 돌아가기' }),
    ).toBeVisible();
```

- [ ] **Step 2: e2e 실행 (가능 환경에서만)**

Run: `npx playwright test e2e/review-session.spec.ts -g "4."`
Expected: PASS. (Playwright 실행 환경이 없으면 이 스텝은 건너뛰고 다음 스텝에서 수동 검증 항목으로 남긴다 — 변경은 문자열 기대값 1:1 치환이므로 안전.)

- [ ] **Step 3: Commit**

```bash
git add e2e/review-session.spec.ts
git commit -m "test(review): e2e 단일 복습 종료를 AllDone 화면 기준으로 갱신"
```

---

## Task 9: 통합 수동 검증 + 전체 회귀

**Files:** (없음 — 검증)

- [ ] **Step 1: 타입/단위 전체 회귀**

Run: `npx tsc --noEmit -p tsconfig.json && npx jest features/learning/review-chain.test.ts features/quiz/hooks/use-review-session-screen.test.ts`
Expected: 타입 에러 0, 테스트 전부 PASS.

- [ ] **Step 2: 시뮬레이터 수동 시나리오 (스펙 §8 체크리스트)**

`npx expo run:ios` 후 dev 시드로 확인:

- 복습 2개+ : 1개 완료 → BridgeView 표시(`다음은 OO · 오늘 1 / N`, `📅 OO는 K일 뒤에 다시 만나요`, `[OO 복습 이어서 →]`) → 2.5초 자동으로 다음 복습 진입.
- BridgeView에서 화면 터치 → 자동 취소(`버튼을 눌러 계속하세요`), 버튼 탭 시 즉시 다음.
- BridgeView에서 앱바 뒤로가기 → 홈 복귀, 직전 복습 저장됨(홈 카드 갱신).
- 진행 분모 고정: 도중 오답으로 내일 task가 생겨도 `오늘 x / N`의 N 불변.
- 마지막 복습 완료 → AllDoneView(`오늘 복습 다 끝냈어요 🎉`, `홈으로 돌아가기`).
- 복습 1개뿐 → 완료 즉시 AllDoneView(`1개 전부 복습 완료`).
- day30(졸업) 시드 → 완료 시 기존 졸업 화면, **2.5초 자동 진행 안 됨**, 버튼 탭해야 다음/홈.
- 다음 약점 라벨 없는 경우(가능 시 강제) → `복습 이어서 →` 폴백, 진행 텍스트 `오늘 x / N 완료`.

- [ ] **Step 3: 최종 커밋 (수동 검증 메모)**

```bash
git commit --allow-empty -m "chore(review): 자동 이어풀기 수동 검증 완료"
```

---

## Self-Review (작성자 점검 결과)

- **스펙 커버리지:** §3 흐름→Task4/5, §3.1 졸업 자동금지→Task4(graduation 분기, 타이머 없음)+Task5, §4.2 B안 문구/폴백→Task2, §5.1 due 단일소스 store 재조회→Task4 Step5, §5.3 분모 시작 고정→Task4 Step3·4, 타이머 2.5초+상호작용 취소+백그라운드 정지→Task2, §8 테스트 깨짐 필수 수정→Task7·8. 누락 없음.
- **플레이스홀더:** 없음(모든 코드/명령/기대 출력 명시).
- **타입 일관성:** `CompletionOutcome`(Task4 정의) → Task5 분기에서 동일 필드명 사용, `NextDueResolution`/`resolveNextDueReview`/`countDueReviews`/`nextStageOffsetDays`(Task1) → Task4에서 동일 시그니처 사용. `onAdvanceChain`/`onGraduationContinue`/`onHome`/`completionOutcome`가 타입·return·screen-view props에 일관 반영됨.
- **알려진 리스크:** `router.replace` 동일 라우트 리마운트 → Task6의 `key={taskId}`로 해소. finalize 이중 실행 → `finalizeStartedRef` + 이펙트 가드로 해소(Task7에서 회귀 테스트로 고정).
