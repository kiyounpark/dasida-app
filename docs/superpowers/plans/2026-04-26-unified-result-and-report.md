# Unified Result and Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the 10-question diagnostic and mock exam flows so both land on the shared 약점 분석 리포트, with auto-save replacing the "이 약점으로 정리하기" button, automatic navigation after all tiles are diagnosed, and compact rows for 4+ weaknesses.

**Architecture:** The diagnostic flow replaces the manual `onFinalConfirm` button with a useEffect that auto-saves each completed page and advances after 3 s. The mock exam result screen detects when `diagnosedCount === wrongCount` and navigates directly to `/quiz/result` via `router.replace` with exam data in route params. The result screen's `use-result-screen.ts` parses those params into a synthetic `QuizResultSummary` when `source === 'exam'`. The report view adds compact rows for `topWeaknesses[3..N]`.

**Tech Stack:** React Native / Expo, expo-router, AsyncStorage, Jest

---

## File Map

| Action | File |
|---|---|
| Modify | `features/quiz/exam/hooks/use-exam-diagnosis.ts` |
| Modify | `features/quiz/hooks/use-diagnostic-screen.ts` |
| Modify | `features/quiz/components/diagnostic-screen-view.tsx` |
| Modify | `features/quiz/exam/hooks/use-exam-result-screen.ts` |
| Modify | `features/quiz/hooks/use-result-screen.ts` |
| Modify | `features/quiz/components/quiz-result-report-hero.tsx` |
| Modify | `features/quiz/exam/screens/exam-result-screen-view.tsx` |
| Modify | `features/quiz/components/quiz-result-report-view.tsx` |
| Create | `features/quiz/exam/compute-exam-top-weaknesses.ts` |
| Create | `features/quiz/exam/__tests__/compute-exam-top-weaknesses.test.ts` |
| Modify | `app/quiz/result.tsx` |

---

## Task 1: Timing change 1500 ms → 3000 ms in exam diagnosis auto-advance

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts:306`

### Background

`use-exam-diagnosis.ts` is the hook used for each problem card in the mock exam diagnosis session. When a `final` node is reached it auto-saves and then calls `onComplete()` after 1500 ms. The spec changes this to 3000 ms to give the user time to read the "이 문제는 분석을 마쳤어요." confirmation.

- [ ] **Step 1: Make the change**

In `features/quiz/exam/hooks/use-exam-diagnosis.ts` line 310, change `1500` to `3000`:

```typescript
// Before
setTimeout(() => {
  if (!isMountedRef.current || hasAdvancedRef.current) return;
  hasAdvancedRef.current = true;
  onComplete();
}, 1500);

// After
setTimeout(() => {
  if (!isMountedRef.current || hasAdvancedRef.current) return;
  hasAdvancedRef.current = true;
  onComplete();
}, 3000);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(quiz): change exam diagnosis auto-advance delay 1500ms → 3000ms"
```

---

## Task 2: Extract `computeExamTopWeaknesses` as a pure helper with tests

**Files:**
- Create: `features/quiz/exam/compute-exam-top-weaknesses.ts`
- Create: `features/quiz/exam/__tests__/compute-exam-top-weaknesses.test.ts`

### Background

`ExamDiagnosisProgress` is `Record<number, WeaknessId>` (problem number → weakness ID). We need to sort by frequency descending to get `topWeaknesses: WeaknessId[]`. Extracting this as a pure function lets us unit-test it separately before wiring into the navigation effect.

- [ ] **Step 1: Write the failing test**

Create `features/quiz/exam/__tests__/compute-exam-top-weaknesses.test.ts`:

```typescript
import { computeExamTopWeaknesses } from '../compute-exam-top-weaknesses';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';

describe('computeExamTopWeaknesses', () => {
  it('returns empty array for empty progress', () => {
    expect(computeExamTopWeaknesses({})).toEqual([]);
  });

  it('returns single weakness', () => {
    const progress: ExamDiagnosisProgress = { 1: 'calc_repeated_error' };
    expect(computeExamTopWeaknesses(progress)).toEqual(['calc_repeated_error']);
  });

  it('sorts by frequency descending', () => {
    const progress: ExamDiagnosisProgress = {
      1: 'formula_understanding',
      2: 'calc_repeated_error',
      3: 'formula_understanding',
      4: 'calc_repeated_error',
      5: 'calc_repeated_error',
    };
    const result = computeExamTopWeaknesses(progress);
    expect(result[0]).toBe('calc_repeated_error'); // 3 occurrences
    expect(result[1]).toBe('formula_understanding'); // 2 occurrences
  });

  it('includes each weakness id exactly once', () => {
    const progress: ExamDiagnosisProgress = {
      1: 'formula_understanding',
      2: 'formula_understanding',
      3: 'formula_understanding',
    };
    const result = computeExamTopWeaknesses(progress);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('formula_understanding');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest features/quiz/exam/__tests__/compute-exam-top-weaknesses.test.ts
```

Expected: FAIL with "Cannot find module '../compute-exam-top-weaknesses'"

- [ ] **Step 3: Implement the helper**

Create `features/quiz/exam/compute-exam-top-weaknesses.ts`:

```typescript
import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

export function computeExamTopWeaknesses(progress: ExamDiagnosisProgress): WeaknessId[] {
  const freq = new Map<WeaknessId, number>();
  for (const weaknessId of Object.values(progress) as WeaknessId[]) {
    freq.set(weaknessId, (freq.get(weaknessId) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx jest features/quiz/exam/__tests__/compute-exam-top-weaknesses.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/compute-exam-top-weaknesses.ts features/quiz/exam/__tests__/compute-exam-top-weaknesses.test.ts
git commit -m "feat(quiz): extract computeExamTopWeaknesses as tested pure helper"
```

---

## Task 3: Auto-navigate to report when all exam tiles are diagnosed

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`

### Background

`use-exam-result-screen.ts` already computes `diagnosedCount` and `wrongCount`. When they are equal and both > 0, all wrong problems have been diagnosed. We add a `useEffect` that fires at that moment, calls `computeExamTopWeaknesses`, then calls `router.replace('/quiz/result', ...)` passing exam data as route params.

We use `router.replace` (not `router.push`) so the exam-result screen is removed from the navigation stack. If we used `router.push`, the `useFocusEffect` in this hook would reload `diagnosedProblems` on back-navigation, re-trigger the condition, and create an infinite loop.

- [ ] **Step 1: Add the navigation useEffect**

In `features/quiz/exam/hooks/use-exam-result-screen.ts`, add after the existing `useFocusEffect`:

1. Add import for `computeExamTopWeaknesses` at the top of the file (after existing imports):
```typescript
import { computeExamTopWeaknesses } from '../compute-exam-top-weaknesses';
```

2. Add `hasNavigatedToReportRef` after `saveAttempted`:
```typescript
const hasNavigatedToReportRef = useRef(false);
```

3. Add the navigation effect after the `useFocusEffect` block (approximately after line 69):
```typescript
// 모든 오답 진단 완료 시 리포트로 이동
useEffect(() => {
  if (wrongCount === 0 || diagnosedCount < wrongCount) return;
  if (!result) return;
  if (hasNavigatedToReportRef.current) return;
  hasNavigatedToReportRef.current = true;

  const topWeaknesses = computeExamTopWeaknesses(diagnosedProblems);
  router.replace({
    pathname: '/quiz/result',
    params: {
      source: 'exam',
      examId: result.examId,
      examTotal: String(result.total),
      examCorrect: String(result.correct),
      examAccuracy: String(result.accuracy),
      examTopWeaknesses: JSON.stringify(topWeaknesses),
    },
  });
}, [diagnosedCount, wrongCount, result, diagnosedProblems]);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "feat(quiz): auto-navigate to report when all exam tiles are diagnosed"
```

---

## Task 4: Wire exam source data into `use-result-screen.ts`

**Files:**
- Modify: `features/quiz/hooks/use-result-screen.ts`

### Background

When `source === 'exam'`, `state.result` from `useQuizSession()` is `undefined` (the quiz session was never used for this mock exam flow). We need to construct a synthetic `QuizResultSummary` from the route params passed in Task 3 so the report view has something to render.

The `persistResult` auto-save logic uses `liveSummary` — for the exam source this path is intentionally skipped (exam result was already saved by `use-exam-result-screen.ts`). We guard this with `requestedSource !== 'exam'`.

- [ ] **Step 1: Extend `QuizResultRouteParams` type**

In `features/quiz/hooks/use-result-screen.ts`, update `QuizResultRouteParams`:

```typescript
export type QuizResultRouteParams = {
  legacyNextStep?: string;
  legacyWeaknessKey?: string;
  requestedSource?: string;
  // exam source params
  examId?: string;
  examTotal?: string;
  examCorrect?: string;
  examAccuracy?: string;
  examTopWeaknesses?: string;
};
```

- [ ] **Step 2: Add `examSummary` useMemo and update `liveSummary`**

In `features/quiz/hooks/use-result-screen.ts`, add these changes to the `useResultScreen` function body after the `liveSummary` declaration (line ~70):

First add import for `QuizResultSummary` if not already present (check: it's in `./types`):
```typescript
import type { QuizResultSummary } from '@/features/quiz/types';
```

Then replace the `liveSummary` block and add `examSummary`:

```typescript
// Before (line 70):
const liveSummary = state.result;

// After:
const liveSessionSummary = state.result;

const examSummary = useMemo<QuizResultSummary | undefined>(() => {
  if (requestedSource !== 'exam') return undefined;
  if (!examTotal || !examCorrect || !examAccuracy || !examTopWeaknesses) return undefined;
  const total = parseInt(examTotal, 10);
  const correct = parseInt(examCorrect, 10);
  const accuracy = parseInt(examAccuracy, 10);
  let topWeaknesses: WeaknessId[] = [];
  try {
    topWeaknesses = JSON.parse(examTopWeaknesses) as WeaknessId[];
  } catch {
    topWeaknesses = [];
  }
  return {
    attemptId: examId ?? 'exam',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    total,
    correct,
    wrong: total - correct,
    accuracy,
    allCorrect: correct === total,
    topWeaknesses,
  };
}, [requestedSource, examId, examTotal, examCorrect, examAccuracy, examTopWeaknesses]);

const liveSummary = examSummary ?? liveSessionSummary;
```

Add `WeaknessId` to the diagnosisMap import at the top:
```typescript
import { diagnosisMap, resolveWeaknessId, type WeaknessId } from '@/data/diagnosisMap';
```

Add `useMemo` to the react import:
```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
```
(It's already there from `snapshotSummaryTitle` useMemo — just confirm it's present.)

Update the destructuring of `useResultScreen` params to include new fields:
```typescript
export function useResultScreen({
  legacyNextStep,
  legacyWeaknessKey,
  requestedSource,
  examId,
  examTotal,
  examCorrect,
  examAccuracy,
  examTopWeaknesses,
}: QuizResultRouteParams): UseResultScreenResult {
```

Guard `persistResult` so it skips for exam source (exam was already saved):
```typescript
const persistResult = useCallback(async () => {
  if (requestedSource === 'exam') return; // exam result already saved by use-exam-result-screen
  if (!liveSummary || !profile || !session || saveState === 'saving') {
    return;
  }
  // ... rest unchanged
}, [liveSummary, profile, recordAttempt, requestedSource, saveState, session, state.answers]);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Update the route file to forward exam params**

`app/quiz/result.tsx` currently only passes `legacyNextStep`, `requestedSource`, and `legacyWeaknessKey`. Update it to also forward the five new exam params:

```typescript
// app/quiz/result.tsx — after:
export default function QuizResultRoute() {
  const params = useLocalSearchParams();

  return (
    <QuizResultScreen
      legacyNextStep={getSingleParam(params.nextStep)}
      requestedSource={getSingleParam(params.source)}
      legacyWeaknessKey={
        getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag)
      }
      examId={getSingleParam(params.examId)}
      examTotal={getSingleParam(params.examTotal)}
      examCorrect={getSingleParam(params.examCorrect)}
      examAccuracy={getSingleParam(params.examAccuracy)}
      examTopWeaknesses={getSingleParam(params.examTopWeaknesses)}
    />
  );
}
```

Stage and commit this file together with `use-result-screen.ts` in Step 5.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/hooks/use-result-screen.ts app/quiz/result.tsx
git commit -m "feat(quiz): parse exam route params into synthetic QuizResultSummary"
```

---

## Task 5: Auto-save useEffect + remove `onFinalConfirm` in `use-diagnostic-screen.ts`

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

### Background

The current flow requires the user to tap "이 약점으로 정리하기" (the `onFinalConfirm` CTA) to submit the diagnosis weakness and advance. The new flow:
1. useEffect watches `diagnosisPages` for any page whose workspace reaches `final` node status
2. Auto-submits weakness + updates chat entries (same logic as current `onFinalConfirm`)
3. Waits 3 seconds then advances — unless this was the **last incomplete page**, in which case we set `shouldDelayResultNavRef = true` so the result navigation effect also delays 3 s
4. The step-complete intermediate screens (`/quiz/step-complete?step=diagnostic` and `step=analysis`) are bypassed entirely; navigation now goes directly to `/quiz/result`

**Key refs to add:**
- `autoCompletedRef = useRef(new Set<number>())` — tracks answerIndex values already processed so the auto-save effect doesn't double-fire
- `shouldDelayResultNavRef = useRef(false)` — set to `true` by the auto-save effect on the last page; read by the `state.result` navigation effect

- [ ] **Step 1: Remove `hasNavigatedToStepComplete` state**

In `use-diagnostic-screen.ts`, remove:
```typescript
// Remove line 123:
const [hasNavigatedToStepComplete, setHasNavigatedToStepComplete] = useState(false);
```

- [ ] **Step 2: Add new refs**

After `hasResumedDiagnosisRef` declaration (line ~119), add:
```typescript
const autoCompletedRef = useRef(new Set<number>());
const shouldDelayResultNavRef = useRef(false);
```

- [ ] **Step 3: Update the reset effect (line ~164)**

Remove `setHasNavigatedToStepComplete(false)` from the reset effect:

```typescript
// Before (lines 164-170):
useEffect(() => {
  if (!state.isDiagnosing) {
    setHasNavigatedToStepComplete(false);
    hasNavigatedToAnalysisRef.current = false;
    hasResumedDiagnosisRef.current = false;
  }
}, [state.isDiagnosing]);

// After:
useEffect(() => {
  if (!state.isDiagnosing) {
    hasNavigatedToAnalysisRef.current = false;
    hasResumedDiagnosisRef.current = false;
    autoCompletedRef.current = new Set<number>();
    shouldDelayResultNavRef.current = false;
  }
}, [state.isDiagnosing]);
```

- [ ] **Step 4: Remove the step-complete navigation effect (lines ~172-184)**

Delete the entire effect that pushes to `step-complete?step=diagnostic`:
```typescript
// Remove this entire block (lines 172-184):
useEffect(() => {
  if (isPreparingFreshSession) {
    return;
  }

  if (state.isDiagnosing && !state.result && !hasNavigatedToStepComplete && !hasResumedDiagnosisRef.current) {
    setHasNavigatedToStepComplete(true);
    router.push({
      pathname: '/quiz/step-complete',
      params: { step: 'diagnostic' },
    });
  }
}, [isPreparingFreshSession, state.isDiagnosing, state.result, hasNavigatedToStepComplete]);
```

- [ ] **Step 5: Update result navigation effect (lines ~186-198)**

Change the result navigation from step-complete to direct report navigation with optional 3 s delay:

```typescript
// Before (lines 186-198):
useEffect(() => {
  if (isPreparingFreshSession) {
    return;
  }

  if (state.result && !hasNavigatedToAnalysisRef.current) {
    hasNavigatedToAnalysisRef.current = true;
    router.replace({
      pathname: '/quiz/step-complete',
      params: { step: 'analysis' },
    });
  }
}, [isPreparingFreshSession, state.result]);

// After:
useEffect(() => {
  if (isPreparingFreshSession) {
    return;
  }

  if (state.result && !hasNavigatedToAnalysisRef.current) {
    hasNavigatedToAnalysisRef.current = true;
    if (shouldDelayResultNavRef.current) {
      setTimeout(() => {
        router.replace('/quiz/result');
      }, 3000);
    } else {
      router.replace('/quiz/result');
    }
  }
}, [isPreparingFreshSession, state.result]);
```

- [ ] **Step 6: Add auto-save useEffect**

Add the following effect **after** the result navigation effect and **before** the pending-diagnostic clear effect (currently around line 206). The effect needs `submitDiagnosisWeakness`, `updateWorkspace`, `createBubbleEntry`, `freezeConversationEntries`, `buildDiagnosisDetailTrace`, `logDiagnosisCompleted`, `scrollToDiagnosisPage`, `setDiagnosisInteracted`, `requestDiagnosisAutoScroll` — all of which are already in scope in the hook.

```typescript
// 최종 노드 자동 저장 — final 노드에 도달한 페이지를 즉시 저장하고 3초 후 다음으로 이동
useEffect(() => {
  if (!state.isDiagnosing) return;

  for (const page of diagnosisPages) {
    const { answerIndex, workspace } = page;
    if (workspace.status === 'completed') continue;
    if (autoCompletedRef.current.has(answerIndex)) continue;

    const activeNode = getActiveFlowNode(workspace);
    if (!activeNode || activeNode.kind !== 'final') continue;

    autoCompletedRef.current.add(answerIndex);

    const weaknessId = activeNode.weaknessId;

    submitDiagnosisWeakness(
      answerIndex,
      weaknessId,
      buildDiagnosisDetailTrace(workspace.flowDraft!, weaknessId),
    );

    updateWorkspace(answerIndex, (current) => ({
      ...current,
      aiHelpState: null,
      chatEntries: [
        ...freezeConversationEntries(current.chatEntries),
        createBubbleEntry(answerIndex, 'user', activeNode.ctaLabel),
        createBubbleEntry(answerIndex, 'assistant', '이 문제는 분석을 마쳤어요.', 'positive'),
      ],
      status: 'completed',
    }));

    setDiagnosisInteracted(answerIndex);
    requestDiagnosisAutoScroll(answerIndex);

    if (profile) {
      logDiagnosisCompleted({
        accountKey: profile.accountKey,
        source: 'unit',
        weaknessId,
      });
    }

    const currentPageIndex = diagnosisPages.findIndex((p) => p.answerIndex === answerIndex);
    const nextPageIndex =
      currentPageIndex === -1
        ? null
        : findNextIncompleteDiagnosisPageIndex(diagnosisPages, currentPageIndex);

    const isLastPage = nextPageIndex === null;
    if (isLastPage) {
      shouldDelayResultNavRef.current = true;
    }

    setTimeout(() => {
      if (!isMountedRef.current) return;
      if (nextPageIndex !== null) {
        scrollToDiagnosisPage(nextPageIndex);
      }
    }, 3000);
  }
}, [
  state.isDiagnosing,
  diagnosisPages,
  submitDiagnosisWeakness,
  updateWorkspace,
  createBubbleEntry,
  freezeConversationEntries,
  buildDiagnosisDetailTrace,
  setDiagnosisInteracted,
  requestDiagnosisAutoScroll,
  logDiagnosisCompleted,
  scrollToDiagnosisPage,
  profile,
]);
```

Note: `createBubbleEntry`, `freezeConversationEntries` are imported from `diagnostic-screen-helpers` — confirm these are already in scope (they are, from line 19 and `useDiagnosisWorkspaces` return value).

- [ ] **Step 7: Remove `onFinalConfirm` function and return value entry**

Delete the `onFinalConfirm` function (lines ~502-560) entirely.

Remove `onFinalConfirm` from the `UseDiagnosticScreenResult` type definition (line ~88).

Remove `onFinalConfirm` from the return object (line ~688).

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `onFinalConfirm` is referenced elsewhere the compiler will catch it — see Task 6 for removing from the view.

- [ ] **Step 9: Commit**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "feat(quiz): replace onFinalConfirm button with auto-save useEffect (3s advance)"
```

---

## Task 6: Remove `onFinalConfirm` prop from `diagnostic-screen-view.tsx` + add `showAvatar`

**Files:**
- Modify: `features/quiz/components/diagnostic-screen-view.tsx`

### Background

`diagnostic-screen-view.tsx` passes `onFinalConfirm` to each `DiagnosisConversationPage` in the FlatList. Now that the hook removes this prop, the view must stop passing it. Additionally, `DiagnosisConversationPage` accepts `showAvatar?: boolean` (default `false`) — we pass `showAvatar={true}` here so the teacher avatar appears in diagnosis chat bubbles.

- [ ] **Step 1: Remove `onFinalConfirm` prop and add `showAvatar`**

In `features/quiz/components/diagnostic-screen-view.tsx`, find the FlatList renderItem block (lines ~115-157) and make two changes:

```typescript
// Before (line 149):
onFinalConfirm={() => onFinalConfirm(item)}

// After: remove this line entirely

// Also add showAvatar after any existing prop (e.g., after onCheckDontKnow):
showAvatar={true}
```

The full renderItem prop list after the change (lines 115-157):
```tsx
<DiagnosisConversationPage
  key={item.answerIndex}
  answerIndex={item.answerIndex}
  width={diagnosisPageWidth}
  isActive={index === activeDiagnosisPageIndex}
  status={item.workspace.status}
  chatEntries={item.workspace.chatEntries}
  methods={item.methods}
  diagnosisInput={item.workspace.diagnosisInput}
  routerResult={item.workspace.routerResult}
  suggestedMethods={item.suggestedMethods}
  analysisErrorMessage={item.workspace.analysisErrorMessage}
  isAnalyzing={item.workspace.isAnalyzing}
  aiHelpInput={item.workspace.aiHelpState?.input ?? ''}
  aiHelpError={item.workspace.aiHelpState?.error ?? ''}
  isAiHelpLoading={item.workspace.aiHelpState?.isLoading ?? false}
  restoreOffset={
    hasStoredDiagnosisOffset(item.answerIndex)
      ? diagnosisScrollOffsetsRef.current[item.answerIndex]
      : undefined
  }
  shouldRestoreScroll={Boolean(
    diagnosisPendingRestoreRef.current[item.answerIndex],
  )}
  shouldAutoScrollToEnd={Boolean(
    diagnosisPendingAutoScrollRef.current[item.answerIndex],
  )}
  showAvatar={true}
  onInputChange={(text) => onInputChange(item.answerIndex, text)}
  onAnalyze={() => void onAnalyzePage(item)}
  onManualSelect={(methodId) => onManualSelect(item, methodId)}
  onConfirmPredicted={() => onConfirmPredicted(item)}
  onChoicePress={(optionId) => onChoicePress(item, optionId)}
  onExplainContinue={() => onExplainContinue(item)}
  onExplainDontKnow={() => onExplainDontKnow(item)}
  onCheckPress={(optionId) => onCheckPress(item, optionId)}
  onCheckDontKnow={() => onCheckDontKnow(item)}
  onAiHelpInputChange={(text) => onAiHelpInputChange(item.answerIndex, text)}
  onAiHelpSubmit={() => onAiHelpSubmit(item)}
  onAiHelpContinue={() => onAiHelpContinue(item)}
  onAiHelpFallback={() => onAiHelpFallback(item)}
  onScrollOffsetChange={handleDiagnosisScrollOffsetChange}
  onAutoScrollHandled={handleDiagnosisAutoScrollHandled}
  onRestoreHandled={handleDiagnosisRestoreHandled}
/>
```

- [ ] **Step 2: Remove `onFinalConfirm` from the destructured props**

Find where the component destructures its props from `UseDiagnosticScreenResult` and remove `onFinalConfirm`:

```typescript
// Find the destructuring near the top of the component (or wherever onFinalConfirm is destructured)
// and remove it.
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/components/diagnostic-screen-view.tsx
git commit -m "feat(quiz): remove onFinalConfirm prop, add showAvatar to diagnosis pages"
```

---

## Task 7: Teacher avatar on exam result screen (`exam-result-screen-view.tsx` + `quiz-result-report-hero.tsx`)

**Files:**
- Modify: `features/quiz/components/quiz-result-report-hero.tsx`
- Modify: `features/quiz/exam/screens/exam-result-screen-view.tsx`

### Background

The exam result screen shows a tile grid and a progress bar. The spec adds a teacher avatar + speech bubble between the hero panel and the body to show a message like "오늘 시험에서 N문제를 분석해 볼게요." We reuse `QuizResultReportHero` for this.

`QuizResultReportHero` currently computes its own `reportMessage` from `pointCount`. We add an optional `message` prop that overrides the internal message.

- [ ] **Step 1: Add `message` prop to `QuizResultReportHero`**

In `features/quiz/components/quiz-result-report-hero.tsx`:

```typescript
// Before:
type QuizResultReportHeroProps = {
  isCompactLayout: boolean;
  pointCount: number;
};

export function QuizResultReportHero({
  isCompactLayout,
  pointCount,
}: QuizResultReportHeroProps) {
  const reportMessage =
    pointCount <= 1
      ? '오늘 푼 10문제를 분석해 보니,\n이 1가지 포인트를 보완하면\n실력이 쑥쑥 늘 거예요!'
      : `오늘 푼 10문제를 분석해 보니,\n이 ${pointCount}가지 포인트를 보완하면\n실력이 쑥쑥 늘 거예요!`;

// After:
type QuizResultReportHeroProps = {
  isCompactLayout: boolean;
  pointCount: number;
  message?: string;
};

export function QuizResultReportHero({
  isCompactLayout,
  pointCount,
  message,
}: QuizResultReportHeroProps) {
  const defaultMessage =
    pointCount <= 1
      ? '오늘 푼 10문제를 분석해 보니,\n이 1가지 포인트를 보완하면\n실력이 쑥쑥 늘 거예요!'
      : `오늘 푼 10문제를 분석해 보니,\n이 ${pointCount}가지 포인트를 보완하면\n실력이 쑥쑥 늘 거예요!`;
  const reportMessage = message ?? defaultMessage;
```

- [ ] **Step 2: Insert hero into `exam-result-screen-view.tsx`**

In `features/quiz/exam/screens/exam-result-screen-view.tsx`:

1. Add import at the top:
```typescript
import { QuizResultReportHero } from '@/features/quiz/components/quiz-result-report-hero';
```

2. Insert between the hero panel (`</View>` closing the `hero` block) and the body (`<View style={styles.body}>`), inside the top-level `ScrollView`:
```tsx
{/* 선생님 아바타 + 약점 분석 안내 */}
{wrongCount > 0 && (
  <View style={styles.heroWrap}>
    <QuizResultReportHero
      isCompactLayout={false}
      pointCount={wrongCount}
      message={`오늘 시험에서 ${wrongCount}문제를 분석해 볼게요.\n하나씩 같이 살펴봐요!`}
    />
  </View>
)}
```

3. Add `heroWrap` to the StyleSheet:
```typescript
heroWrap: {
  paddingHorizontal: 20,
  paddingTop: 16,
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/components/quiz-result-report-hero.tsx features/quiz/exam/screens/exam-result-screen-view.tsx
git commit -m "feat(quiz): add teacher avatar to exam result screen via QuizResultReportHero"
```

---

## Task 8: Compact rows for 4+ weaknesses in `quiz-result-report-view.tsx`

**Files:**
- Modify: `features/quiz/components/quiz-result-report-view.tsx`

### Background

Currently `visibleWeaknesses = summary.topWeaknesses.slice(0, 3)` — only 3 weaknesses are shown. The new design shows the top 3 as full cards and `topWeaknesses[3..N]` as compact rows (topic chip + weakness name). Compact rows only appear when there are 4+ weaknesses total.

`diagnosisMap[weaknessId].topicLabel` provides the topic chip label (e.g., `'이차함수'`).
`diagnosisMap[weaknessId].labelKo` provides the weakness name.

- [ ] **Step 1: Split `visibleWeaknesses` into top 3 + extras**

In `features/quiz/components/quiz-result-report-view.tsx`, replace line 30:

```typescript
// Before (line 30):
const visibleWeaknesses = summary.topWeaknesses.slice(0, 3);

// After:
const topWeaknesses = summary.topWeaknesses.slice(0, 3);
const extraWeaknesses = summary.topWeaknesses.slice(3);
```

Update `primaryWeaknessId` (line 31):
```typescript
// Before:
const primaryWeaknessId = visibleWeaknesses[0];

// After:
const primaryWeaknessId = topWeaknesses[0];
```

- [ ] **Step 2: Update card list to use `topWeaknesses`**

In the JSX, update the `visibleWeaknesses.map(...)` call to `topWeaknesses.map(...)`:

```tsx
// Before (line 75):
{visibleWeaknesses.map((weaknessId) => {

// After:
{topWeaknesses.map((weaknessId) => {
```

- [ ] **Step 3: Add compact row section after card list**

After the closing `</View>` of `cardList` and before `ctaWrap`, add:

```tsx
{extraWeaknesses.length > 0 && (
  <View style={styles.extraSection}>
    <Text style={styles.extraSectionLabel}>
      그 외 약점 {extraWeaknesses.length}개
    </Text>
    <View style={styles.compactList}>
      {extraWeaknesses.map((weaknessId) => {
        const info = diagnosisMap[weaknessId];
        return (
          <View key={weaknessId} style={styles.compactRow}>
            <View style={styles.topicChip}>
              <Text style={styles.topicChipText}>{info.topicLabel}</Text>
            </View>
            <Text style={styles.compactRowName} numberOfLines={1}>
              {info.labelKo}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
)}
```

- [ ] **Step 4: Add styles for compact rows**

In the `StyleSheet.create` block, add after the existing `cardList` style:

```typescript
extraSection: {
  gap: 8,
},
extraSectionLabel: {
  fontFamily: FontFamilies.bold,
  fontSize: 13,
  lineHeight: 18,
  color: '#1C2C19',
},
compactList: {
  gap: 6,
},
compactRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: 'rgba(255, 252, 247, 0.9)',
  borderWidth: 1,
  borderColor: 'rgba(41, 59, 39, 0.10)',
  borderRadius: 11,
  borderCurve: 'continuous',
  paddingHorizontal: 12,
  paddingVertical: 10,
},
topicChip: {
  backgroundColor: 'rgba(74, 124, 89, 0.13)',
  borderRadius: 99,
  paddingHorizontal: 8,
  paddingVertical: 2,
  flexShrink: 0,
},
topicChipText: {
  fontFamily: FontFamilies.bold,
  fontSize: 11,
  lineHeight: 16,
  color: '#2A5C38',
},
compactRowName: {
  flex: 1,
  fontFamily: FontFamilies.bold,
  fontSize: 13,
  lineHeight: 18,
  color: '#1C2C19',
},
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite to check for regressions**

```bash
npx jest
```

Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add features/quiz/components/quiz-result-report-view.tsx
git commit -m "feat(quiz): add compact rows for 4+ weaknesses in report view"
```

---

## Post-implementation checklist

- [ ] Manual smoke test: run 10-question diagnostic to completion → confirm auto-advances through diagnosis pages with 3 s delay → lands on `/quiz/result` directly (no step-complete screen)
- [ ] Manual smoke test: mock exam → diagnose all wrong tiles → confirm auto-navigation to `/quiz/result` report
- [ ] Verify teacher avatar shows on exam result screen when `wrongCount > 0`
- [ ] Verify teacher avatar shows in 10-question diagnosis chat bubbles
- [ ] Verify compact rows appear in report when test data has 4+ weaknesses
- [ ] Verify `router.replace` prevents back-navigation loop from exam result
- [ ] All CI tests pass: `npx jest`
- [ ] TypeScript clean: `npx tsc --noEmit`
