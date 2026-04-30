# History In-Progress Item Tap (Cross-Device) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기록 탭 "최근 시험 이력"에서 분석중 항목을 탭하면 결과화면으로 이동하게 한다. 그리고 분석중 판단과 진입 흐름을 서버 데이터 기반으로 만들어 태블릿/폰 간 다기기 일관성을 확보한다.

**Architecture:** 읽기는 서버 (`listAttemptResults`)를 권위 출처로 사용하고, 쓰기는 떠날 때 4곳(잠시 쉬기/모두 완료/홈/백그라운드)에서 `recordAttempt`를 호출해 폰 로컬 진단 상태를 서버에 반영한다. 충돌은 last-write-wins로 단순화. 기록 탭 진입 시 서버 데이터로 `ExamResultSummary`를 재구성하고 폰 메모를 시드한 뒤 결과화면(`/quiz/exam/result?resumed=1`)으로 push한다.

**Tech Stack:** Expo Router, React Native, AsyncStorage, Jest, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-30-history-in-progress-item-tap-design.md`

---

## File Structure

### Create
- `features/quiz/exam/build-exam-result-summary-from-attempt.ts` — `LearningAttempt + LearningAttemptResult[]` → `ExamResultSummary` 재구성 (순수 함수)
- `features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts`
- `features/quiz/exam/sync-diagnosis-progress.ts` — `LearningAttemptResult[]` → AsyncStorage `exam-diagnosis-progress` 시드
- `features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts`
- `features/quiz/exam/use-app-background-sync.ts` — `AppState` 리스너로 백그라운드 진입 시 sync 트리거 (sync point #4)
- `features/history/hooks/__tests__/use-history-screen.test.ts` — 신규 핸들러 단위 테스트

### Modify
- `features/learner/current-learner-controller.ts` — controller에 `loadAttemptResults` 추가
- `features/learner/provider.tsx` — provider value에 `loadAttemptResults` 노출
- `features/history/hooks/use-history-screen.ts` — analysisState 출처 서버로 전환 + `onPressExamHistoryItem` 핸들러 추가
- `features/history/components/history-screen-view.tsx` — `examHistoryItem` `View` → `Pressable` + chevron
- `features/quiz/exam/hooks/use-exam-result-screen.ts` — `onReturnHome`에 sync point #3 추가
- `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` — `handlePauseRequested`에 sync point #1 추가
- `features/quiz/exam/hooks/use-exam-result-screen.test.ts` — onReturnHome sync 케이스 추가

---

## Task 1: Expose `loadAttemptResults` via Controller and Provider

**Files:**
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/learner/provider.tsx`

`listAttemptResults`는 repository 레벨에선 이미 존재하지만 controller / `useCurrentLearner`로 노출되어 있지 않음. 본 task는 노출만 추가.

- [ ] **Step 1: Add to `CurrentLearnerController` type**

`features/learner/current-learner-controller.ts`의 `CurrentLearnerController` 타입에 메서드 추가 (line 57 근처 `loadRecentAttempts` 아래):

```typescript
loadAttemptResults(attemptId: string): Promise<LearningAttemptResult[]>;
```

상단 import에 `LearningAttemptResult` 추가:

```typescript
import type { LearningAttempt, LearningAttemptResult } from '@/features/learning/types';
```

- [ ] **Step 2: Implement in controller factory**

`features/learner/current-learner-controller.ts`의 controller 반환 객체에 (line 400 근처 `loadRecentAttempts` 아래) 추가:

```typescript
loadAttemptResults: async (attemptId) => {
  const { session } = await readAccessibleSnapshot();
  return learningHistoryRepository.listAttemptResults(session.accountKey, attemptId);
},
```

- [ ] **Step 3: Expose via provider**

`features/learner/provider.tsx`에서 controller value 타입과 노출 객체에 `loadAttemptResults`를 포함시킨다. provider가 controller 메서드를 그대로 값으로 노출하는 패턴을 따르며, 누락 시 컴파일 에러로 잡힌다.

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: PASS (no new errors)

- [ ] **Step 5: Commit**

```bash
git add features/learner/current-learner-controller.ts features/learner/provider.tsx
git commit -m "feat(learner): expose loadAttemptResults via controller and provider"
```

---

## Task 2: Build `ExamResultSummary` from Server Attempt + Results

**Files:**
- Create: `features/quiz/exam/build-exam-result-summary-from-attempt.ts`
- Test: `features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts`

서버 `LearningAttempt + LearningAttemptResult[]`를 받아 결과화면이 요구하는 `ExamResultSummary`를 재구성하는 순수 함수.

- [ ] **Step 1: Write the failing test**

Create `features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts`:

```typescript
import type { LearningAttempt, LearningAttemptResult } from '@/features/learning/types';

import { buildExamResultSummaryFromAttempt } from '../build-exam-result-summary-from-attempt';

const FAKE_EXAM_ID = '2024-09-mock';

function makeAttempt(overrides?: Partial<LearningAttempt>): LearningAttempt {
  return {
    id: 'attempt-1',
    accountKey: 'acc',
    learnerId: 'learner-1',
    source: 'featured-exam',
    sourceEntityId: FAKE_EXAM_ID,
    gradeSnapshot: 'high2',
    startedAt: '2024-09-01T09:00:00.000Z',
    completedAt: '2024-09-01T10:00:00.000Z',
    questionCount: 3,
    correctCount: 1,
    wrongCount: 2,
    accuracy: 33,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2024-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeResult(
  questionNumber: number,
  overrides?: Partial<LearningAttemptResult>,
): LearningAttemptResult {
  return {
    id: `r-${questionNumber}`,
    attemptId: 'attempt-1',
    accountKey: 'acc',
    source: 'featured-exam',
    sourceEntityId: FAKE_EXAM_ID,
    questionId: `${FAKE_EXAM_ID}-${questionNumber}`,
    questionNumber,
    topic: 'exam',
    selectedIndex: 1,
    isCorrect: false,
    finalWeaknessId: null,
    methodId: null,
    diagnosisSource: null,
    finalMethodSource: null,
    diagnosisCompleted: false,
    usedDontKnow: false,
    usedAiHelp: false,
    schemaVersion: 1,
    resolvedAt: '2024-09-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildExamResultSummaryFromAttempt', () => {
  it('reconstructs basic summary fields from attempt + results', () => {
    const attempt = makeAttempt();
    const results = [
      makeResult(1, { isCorrect: true, selectedIndex: 2 }),
      makeResult(2, { isCorrect: false, selectedIndex: 3 }),
      makeResult(3, { isCorrect: false, selectedIndex: null }),
    ];

    const summary = buildExamResultSummaryFromAttempt({ attempt, results });

    expect(summary.attemptId).toBe('attempt-1');
    expect(summary.examId).toBe(FAKE_EXAM_ID);
    expect(summary.startedAt).toBe(attempt.startedAt);
    expect(summary.completedAt).toBe(attempt.completedAt);
    expect(summary.total).toBe(3);
    expect(summary.correct).toBe(1);
    expect(summary.wrong).toBe(1);
    expect(summary.unanswered).toBe(1);
    expect(summary.accuracy).toBe(33);
  });

  it('orders perProblem by questionNumber ascending', () => {
    const attempt = makeAttempt();
    const results = [makeResult(3), makeResult(1), makeResult(2)];

    const summary = buildExamResultSummaryFromAttempt({ attempt, results });

    expect(summary.perProblem.map((p) => p.number)).toEqual([1, 2, 3]);
  });

  it('returns null sourceEntityId as empty examId fallback', () => {
    const attempt = makeAttempt({ sourceEntityId: null });
    const summary = buildExamResultSummaryFromAttempt({ attempt, results: [] });
    expect(summary.examId).toBe('');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts
```

Expected: FAIL with "Cannot find module '../build-exam-result-summary-from-attempt'".

- [ ] **Step 3: Implement minimal module**

Create `features/quiz/exam/build-exam-result-summary-from-attempt.ts`:

```typescript
import type { LearningAttempt, LearningAttemptResult } from '@/features/learning/types';

import { getExamProblems } from '@/features/quiz/data/exam-problems';

import type { ExamProblemResult, ExamResultSummary } from './types';

/**
 * 서버의 LearningAttempt + LearningAttemptResult[]로부터 결과화면이 요구하는
 * ExamResultSummary를 재구성한다. 정적 시험 데이터(exam-problems)에서 배점을 끌어와
 * totalScore/maxScore도 채운다.
 */
export function buildExamResultSummaryFromAttempt(input: {
  attempt: LearningAttempt;
  results: LearningAttemptResult[];
}): ExamResultSummary {
  const { attempt, results } = input;
  const examId = attempt.sourceEntityId ?? '';
  const problems = examId ? getExamProblems(examId) : [];
  const scoreByNumber = new Map(problems.map((p) => [p.number, p.score]));

  const sortedResults = [...results].sort((a, b) => a.questionNumber - b.questionNumber);

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let totalScore = 0;
  let maxScore = 0;

  const perProblem: ExamProblemResult[] = sortedResults.map((r) => {
    const score = scoreByNumber.get(r.questionNumber) ?? 0;
    maxScore += score;
    const userAnswer = r.selectedIndex ?? null;
    const earnedScore = r.isCorrect ? score : 0;
    if (r.isCorrect) {
      correct += 1;
      totalScore += score;
    } else if (userAnswer === null) {
      unanswered += 1;
    } else {
      wrong += 1;
    }
    return {
      number: r.questionNumber,
      userAnswer,
      correctAnswer:
        problems.find((p) => p.number === r.questionNumber)?.answer ?? 0,
      isCorrect: r.isCorrect,
      earnedScore,
    };
  });

  const total = sortedResults.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    attemptId: attempt.id,
    examId,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    total,
    correct,
    wrong,
    unanswered,
    accuracy,
    totalScore,
    maxScore,
    perProblem,
  };
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/build-exam-result-summary-from-attempt.ts features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts
git commit -m "feat(exam): reconstruct ExamResultSummary from server attempt+results"
```

---

## Task 3: Seed `exam-diagnosis-progress` from Server Results

**Files:**
- Create: `features/quiz/exam/sync-diagnosis-progress.ts`
- Test: `features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts`

서버 `LearningAttemptResult[]`에서 `diagnosisCompleted=true`인 항목을 `{ 문제번호: weaknessId }` 맵으로 변환해 AsyncStorage(`exam-diagnosis-progress`)에 통째로 덮어쓴다. 기록 탭 진입 시 폰 메모를 서버 상태로 시드해야 결과화면이 즉시 정확한 진행률을 표시한다.

- [ ] **Step 1: Write the failing test**

Create `features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningAttemptResult } from '@/features/learning/types';

import { syncDiagnosisProgressFromServer } from '../sync-diagnosis-progress';
import { getDiagnosisProgress } from '../exam-diagnosis-progress';

function makeResult(
  questionNumber: number,
  overrides?: Partial<LearningAttemptResult>,
): LearningAttemptResult {
  return {
    id: `r-${questionNumber}`,
    attemptId: 'attempt-1',
    accountKey: 'acc',
    source: 'featured-exam',
    sourceEntityId: 'exam-1',
    questionId: `q-${questionNumber}`,
    questionNumber,
    topic: 'exam',
    selectedIndex: 1,
    isCorrect: false,
    finalWeaknessId: null,
    methodId: null,
    diagnosisSource: null,
    finalMethodSource: null,
    diagnosisCompleted: false,
    usedDontKnow: false,
    usedAiHelp: false,
    schemaVersion: 1,
    resolvedAt: '2024-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const SCOPE = {
  examId: 'exam-1',
  attemptId: 'attempt-1',
  attemptDateISO: '2024-09-01T10:00:00.000Z',
};

describe('syncDiagnosisProgressFromServer', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('writes a map of diagnosed problems with weakness ids', async () => {
    const results = [
      makeResult(1, { isCorrect: true }),
      makeResult(2, { diagnosisCompleted: true, finalWeaknessId: 'topic-grasping' }),
      makeResult(5, { diagnosisCompleted: true, finalWeaknessId: 'inference' }),
      makeResult(7, { diagnosisCompleted: false, finalWeaknessId: null }),
    ];

    await syncDiagnosisProgressFromServer(SCOPE, results);

    const progress = await getDiagnosisProgress(SCOPE);
    expect(progress).toEqual({ 2: 'topic-grasping', 5: 'inference' });
  });

  it('overwrites existing local progress (server is authoritative)', async () => {
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(2, { diagnosisCompleted: true, finalWeaknessId: 'topic-grasping' }),
    ]);

    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(5, { diagnosisCompleted: true, finalWeaknessId: 'inference' }),
    ]);

    const progress = await getDiagnosisProgress(SCOPE);
    expect(progress).toEqual({ 5: 'inference' });
  });

  it('writes empty object when no diagnosed results present', async () => {
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(1, { isCorrect: true }),
      makeResult(2, { diagnosisCompleted: false }),
    ]);

    const progress = await getDiagnosisProgress(SCOPE);
    expect(progress).toEqual({});
  });

  it('skips entries with diagnosisCompleted=true but null weaknessId (defensive)', async () => {
    await syncDiagnosisProgressFromServer(SCOPE, [
      makeResult(2, { diagnosisCompleted: true, finalWeaknessId: null }),
    ]);

    const progress = await getDiagnosisProgress(SCOPE);
    expect(progress).toEqual({});
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

Create `features/quiz/exam/sync-diagnosis-progress.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { LearningAttemptResult } from '@/features/learning/types';

import type { ExamAttemptScope, ExamDiagnosisProgress } from './exam-diagnosis-progress';

function formatKstDate(iso: string): string {
  const utcMs = new Date(iso).getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}

function storageKey(scope: ExamAttemptScope): string {
  const date = formatKstDate(scope.attemptDateISO);
  return `${StorageKeys.examDiagnosisProgressPrefix}${scope.examId}/${date}-${scope.attemptId}`;
}

/**
 * 서버 LearningAttemptResult[]를 권위 출처로 사용해 exam-diagnosis-progress
 * AsyncStorage 키를 통째로 덮어쓴다. 기록 탭에서 분석중 항목 탭 시 결과화면 진입
 * 직전에 호출해, 결과화면이 즉시 정확한 진행률을 보여주게 한다.
 */
export async function syncDiagnosisProgressFromServer(
  scope: ExamAttemptScope,
  results: LearningAttemptResult[],
): Promise<void> {
  const next: ExamDiagnosisProgress = {};
  for (const r of results) {
    if (r.diagnosisCompleted && r.finalWeaknessId !== null) {
      next[r.questionNumber] = r.finalWeaknessId;
    }
  }
  try {
    await AsyncStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // 시드 실패 시에도 결과화면 진입은 가능하므로 silently 진행.
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npm test -- features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/sync-diagnosis-progress.ts features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts
git commit -m "feat(exam): seed exam-diagnosis-progress from server results"
```

---

## Task 4: Switch `useHistoryScreen` Read Source to Server

**Files:**
- Modify: `features/history/hooks/use-history-screen.ts`

기록 탭의 `analysisState` 계산을 폰 메모(`getLatestExamAttempt` + `getDiagnosisProgress`) 대신 서버 데이터(`loadRecentAttempts` + `loadAttemptResults`)로 교체. `latestAttempt.result` 의존(폰에서만 가능)도 제거하고 서버 결과를 그대로 사용한다.

- [ ] **Step 1: Read current hook**

`features/history/hooks/use-history-screen.ts` 전체를 읽어, 다음 항목을 파악한다:
- `getLatestExamAttempt` import와 사용 (line 14, 91)
- `getDiagnosisProgress` import와 사용 (line 13, 98-103)
- `setLatestAttempt`, `setAnalysisState` 상태 관리
- `onPrimaryAction`이 `latestAttempt.result`에 의존하는 부분

- [ ] **Step 2: Replace second `useFocusEffect` to fetch from server**

`features/history/hooks/use-history-screen.ts`에서 line 81~113의 두 번째 `useFocusEffect`(폰 메모 기반 분석 상태 계산)를 다음으로 교체:

```typescript
useFocusEffect(
  useCallback(() => {
    let cancelled = false;
    void (async () => {
      // recentExamAttempts가 비어있으면 분석 상태도 없음
      if (recentExamAttempts.length === 0) {
        setLatestAttempt(null);
        setAnalysisState({ isInProgress: false });
        return;
      }
      const latest = recentExamAttempts[0];
      try {
        const results = await loadAttemptResults(latest.id);
        if (cancelled) return;

        const wrongResults = results.filter(
          (r) => !r.isCorrect && r.selectedIndex !== null,
        );
        const wrongProblemNumbers = wrongResults.map((r) => r.questionNumber);
        const summary = buildExamResultSummaryFromAttempt({ attempt: latest, results });

        setLatestAttempt({
          examId: latest.sourceEntityId ?? '',
          attemptId: latest.id,
          attemptDateISO: latest.completedAt,
          wrongProblemNumbers,
          result: summary,
          results,
        });

        const diagnosed: Record<number, WeaknessId> = {};
        for (const r of results) {
          if (r.diagnosisCompleted && r.finalWeaknessId !== null) {
            diagnosed[r.questionNumber] = r.finalWeaknessId;
          }
        }

        setAnalysisState(
          computeAnalysisInProgressState({
            latestAttempt: {
              examId: latest.sourceEntityId ?? '',
              attemptId: latest.id,
              attemptDateISO: latest.completedAt,
              wrongProblemNumbers,
              result: summary,
            },
            diagnosedProblems: diagnosed,
          }),
        );
      } catch {
        if (cancelled) return;
        setAnalysisState({ isInProgress: false });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentExamAttempts]),
);
```

- [ ] **Step 3: Update local state shape and imports**

상단 import 정리:
- `getLatestExamAttempt`, `getDiagnosisProgress` import 제거
- `buildExamResultSummaryFromAttempt` import 추가
- `WeaknessId`, `LearningAttemptResult` 타입 import 추가
- `useCurrentLearner`에서 `loadAttemptResults` 구조분해 추가

`latestAttempt` 로컬 상태 타입을 확장해 `results: LearningAttemptResult[]`을 함께 보관 (다음 task의 onPress 핸들러에서 재사용):

```typescript
type LocalLatestAttempt = LatestExamAttemptSummary & {
  results: LearningAttemptResult[];
};
const [latestAttempt, setLatestAttempt] = useState<LocalLatestAttempt | null>(null);
```

- [ ] **Step 4: Run existing history tests, verify pass**

```bash
npm test -- features/history
```

Expected: PASS. 기존 `history-insights.test.ts`는 `analysisState` 입력이 동일 형태라 영향 없음.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add features/history/hooks/use-history-screen.ts
git commit -m "feat(history): compute analysisState from server listAttemptResults"
```

---

## Task 5: Add `onPressExamHistoryItem` Handler

**Files:**
- Modify: `features/history/hooks/use-history-screen.ts`
- Test: `features/history/hooks/__tests__/use-history-screen.test.ts` (new)

`in_progress` 항목 탭 시: 서버 결과를 폰 메모에 시드 → `hydrateResult` → 결과화면 push.

- [ ] **Step 1: Write the failing test**

Create `features/history/hooks/__tests__/use-history-screen.test.ts`:

```typescript
import { router } from 'expo-router';

const hydrateResult = jest.fn();
const syncDiagnosisProgressFromServer = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: () => undefined,
}));

jest.mock('@/features/quiz/exam/exam-session', () => ({
  useExamSession: () => ({ hydrateResult }),
}));

jest.mock('@/features/quiz/exam/sync-diagnosis-progress', () => ({
  syncDiagnosisProgressFromServer,
}));

import { onPressExamHistoryItemImpl } from '../use-history-screen-handlers';

describe('onPressExamHistoryItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const summary = {
    attemptId: 'a1',
    examId: 'exam-1',
    startedAt: '2024-09-01T09:00:00.000Z',
    completedAt: '2024-09-01T10:00:00.000Z',
    total: 3,
    correct: 1,
    wrong: 2,
    unanswered: 0,
    accuracy: 33,
    totalScore: 0,
    maxScore: 0,
    perProblem: [],
  };

  const latestAttempt = {
    examId: 'exam-1',
    attemptId: 'a1',
    attemptDateISO: '2024-09-01T10:00:00.000Z',
    wrongProblemNumbers: [2, 3],
    result: summary,
    results: [],
  };

  it('navigates to result screen with resumed=1 when in_progress', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'in_progress', attemptId: 'a1' } as any,
      latestAttempt,
      hydrateResult,
    );

    expect(syncDiagnosisProgressFromServer).toHaveBeenCalledWith(
      expect.objectContaining({ examId: 'exam-1', attemptId: 'a1' }),
      [],
    );
    expect(hydrateResult).toHaveBeenCalledWith(summary);
    expect(router.push).toHaveBeenCalledWith('/quiz/exam/result?resumed=1');
  });

  it('does nothing when status is completed', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'completed', attemptId: 'a1' } as any,
      latestAttempt,
      hydrateResult,
    );

    expect(hydrateResult).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does nothing when attemptId mismatch', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'in_progress', attemptId: 'other' } as any,
      latestAttempt,
      hydrateResult,
    );

    expect(hydrateResult).not.toHaveBeenCalled();
  });

  it('does nothing when latestAttempt.result is null', async () => {
    await onPressExamHistoryItemImpl(
      { status: 'in_progress', attemptId: 'a1' } as any,
      { ...latestAttempt, result: null },
      hydrateResult,
    );

    expect(hydrateResult).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
npm test -- features/history/hooks/__tests__/use-history-screen.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Extract pure handler logic**

Create `features/history/hooks/use-history-screen-handlers.ts`:

```typescript
import { router } from 'expo-router';

import { RESUMED_PARAM_VALUE } from '@/features/quiz/exam/exam-result-navigation';
import { syncDiagnosisProgressFromServer } from '@/features/quiz/exam/sync-diagnosis-progress';
import type { ExamResultSummary } from '@/features/quiz/exam/types';
import type { LearningAttemptResult } from '@/features/learning/types';

import type { HistoryExamHistoryItem } from '../history-insights';

type LatestAttemptForTap = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  result: ExamResultSummary | null;
  results: LearningAttemptResult[];
};

/**
 * 분석중 이력 항목을 탭하면 서버 진단 상태를 폰 메모에 시드한 뒤 결과화면을 띄운다.
 * 이력 행 탭은 hero CTA(진단 세션 직진)와 다른 의도된 진입점이며, 사용자가 그리드에서
 * 어떤 문제를 분석할지 직접 고를 수 있게 한다.
 */
export async function onPressExamHistoryItemImpl(
  item: HistoryExamHistoryItem,
  latestAttempt: LatestAttemptForTap | null,
  hydrateResult: (summary: ExamResultSummary) => void,
): Promise<void> {
  if (item.status !== 'in_progress') return;
  if (!latestAttempt || !latestAttempt.result) return;
  if (item.attemptId !== latestAttempt.attemptId) return;

  await syncDiagnosisProgressFromServer(
    {
      examId: latestAttempt.examId,
      attemptId: latestAttempt.attemptId,
      attemptDateISO: latestAttempt.attemptDateISO,
    },
    latestAttempt.results,
  );

  hydrateResult(latestAttempt.result);
  router.push(`/quiz/exam/result?resumed=${RESUMED_PARAM_VALUE}`);
}
```

- [ ] **Step 4: Wire handler into `useHistoryScreen`**

`features/history/hooks/use-history-screen.ts`의 hook 반환 객체에 핸들러 추가:

```typescript
const onPressExamHistoryItem = useCallback(
  (item: HistoryExamHistoryItem) => {
    void onPressExamHistoryItemImpl(item, latestAttempt, hydrateResult);
  },
  [latestAttempt, hydrateResult],
);

return {
  insights,
  isLoadingAttempts,
  isReady,
  isRefreshing,
  onPrimaryAction,
  onPressEmptyStateCta,
  onPressExamHistoryItem,
  onRefresh,
};
```

`HistoryExamHistoryItem` 타입을 hook에 import:

```typescript
import type { HistoryExamHistoryItem } from '@/features/history/history-insights';
import { onPressExamHistoryItemImpl } from './use-history-screen-handlers';
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npm test -- features/history
```

Expected: PASS (existing + 4 new).

- [ ] **Step 6: Commit**

```bash
git add features/history/hooks/use-history-screen-handlers.ts features/history/hooks/use-history-screen.ts features/history/hooks/__tests__/use-history-screen.test.ts
git commit -m "feat(history): add onPressExamHistoryItem handler for in-progress tap"
```

---

## Task 6: Make `examHistoryItem` Pressable + Chevron

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

`in_progress` 항목만 탭 가능. 우측에 `›` chevron 추가. 다른 상태는 무반응.

- [ ] **Step 1: Add `onPressExamHistoryItem` to view props**

`features/history/components/history-screen-view.tsx`의 `HistoryScreenView` 함수 시그니처 (현재 `UseHistoryScreenResult` 직접 spread)에 새 prop이 자동으로 들어옴 (Task 5에서 hook return에 추가됨). 본 task는 사용 코드만 추가.

- [ ] **Step 2: Replace `View` with `Pressable` for examHistoryItem**

`features/history/components/history-screen-view.tsx`의 line 171~196 (`examHistoryItem` 렌더 부분)을 다음으로 교체:

```tsx
{insights.examHistory.map((item) => {
  const isTappable = item.status === 'in_progress';
  return (
    <Pressable
      key={item.attemptId}
      onPress={isTappable ? () => onPressExamHistoryItem(item) : undefined}
      accessibilityRole={isTappable ? 'button' : undefined}
      style={({ pressed }) => [
        styles.examHistoryItem,
        isTappable && pressed && styles.examHistoryItemPressed,
      ]}
    >
      <View style={styles.examHistoryCopy}>
        <Text selectable style={styles.examHistoryTitle} numberOfLines={2}>
          {item.examTitle}
        </Text>
        <Text selectable style={styles.examHistoryMeta}>
          {item.occurredAtLabel} · {item.accuracyLabel}
        </Text>
      </View>
      <View style={styles.examHistoryRight}>
        <View style={[
          styles.examHistoryBadge,
          item.status === 'in_progress' && styles.examHistoryBadgeInProgress,
          item.status === 'completed' && styles.examHistoryBadgeCompleted,
          item.status === 'not_started' && styles.examHistoryBadgeNotStarted,
        ]}>
          <Text selectable style={[
            styles.examHistoryBadgeText,
            item.status === 'in_progress' && styles.examHistoryBadgeTextInProgress,
            item.status === 'completed' && styles.examHistoryBadgeTextCompleted,
            item.status === 'not_started' && styles.examHistoryBadgeTextNotStarted,
          ]}>
            {item.statusLabel}
          </Text>
        </View>
        {isTappable ? (
          <Text style={styles.examHistoryChevron}>›</Text>
        ) : null}
      </View>
    </Pressable>
  );
})}
```

`Pressable`을 react-native import에 추가:

```typescript
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
```

- [ ] **Step 3: Add styles**

`StyleSheet.create` 내에 추가:

```typescript
examHistoryItemPressed: {
  opacity: 0.6,
},
examHistoryRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
examHistoryChevron: {
  fontSize: 14,
  color: BrandColors.mutedText,
  fontWeight: '600',
},
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(history): make in-progress exam history items tappable with chevron"
```

---

## Task 7: Sync Point #3 — `onReturnHome` in Result Screen

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`
- Test: `features/quiz/exam/hooks/use-exam-result-screen.test.ts` (existing)

결과화면에서 "홈으로 돌아가기" 누를 때 현재 폰 메모 진단 상태를 서버에 한 번 동기화한다. `recordAttempt`는 통째로 덮어쓰는 시멘틱이라 last-write-wins로 충분.

- [ ] **Step 1: Update `onReturnHome` in hook**

`features/quiz/exam/hooks/use-exam-result-screen.ts`의 `onReturnHome` 핸들러(line 211~214)를 다음으로 교체:

```typescript
onReturnHome: async () => {
  if (result && profile && session) {
    const diagnosedInput = buildExamAttemptInputWithDiagnosis({
      session,
      profile,
      result,
      diagnosedProblems,
    });
    void recordAttempt(diagnosedInput).catch((err) => {
      console.warn('[Exam] sync on returnHome failed', err);
    });
  }
  resetExam();
  router.replace('/quiz');
},
```

`buildExamAttemptInputWithDiagnosis`는 이미 import되어 있음 (line 9).

- [ ] **Step 2: Read existing test file to learn setup pattern**

```bash
cat features/quiz/exam/hooks/use-exam-result-screen.test.ts | head -60
```

기존 mock 패턴(`useCurrentLearner` mock, `useExamSession` mock, `recordAttempt` jest.fn 등)을 파악한다.

- [ ] **Step 3: Add test case**

기존 파일 끝의 `describe` 블록 안에 케이스 추가. 예시 골격(기존 mock 구조에 맞춰 변수명·import는 파일 기존 컨벤션 사용):

```typescript
it('calls recordAttempt with current diagnosed state when returning home', async () => {
  // 기존 partial diagnosis 케이스(line 157 근처 'second call carries diagnosisCompleted=true...')와 유사
  // 1) result + diagnosedProblems 세팅 (예: { 5: 'topic-grasping' })
  // 2) hook 인스턴스 생성 후 onReturnHome() 호출
  // 3) recordAttempt가 호출된 마지막 인자에서 questions를 검증:
  //    - 5번 문제: diagnosisCompleted=true, finalWeaknessId='topic-grasping'
  //    - 다른 문제들: diagnosisCompleted=false 그대로 유지
  // 4) router.replace('/quiz')가 호출되었는지 확인
});
```

- [ ] **Step 4: Run test**

```bash
npm test -- features/quiz/exam/hooks/use-exam-result-screen.test.ts
```

Expected: PASS (기존 + 신규 케이스).

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts features/quiz/exam/hooks/use-exam-result-screen.test.ts
git commit -m "feat(exam): sync diagnosed state to server on returnHome"
```

---

## Task 8: Sync Point #1 — Pause from Diagnosis Session

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

진단 세션의 "잠시 쉬기" 누를 때 현재 폰 메모 진단 상태를 서버에 동기화. 진단 세션 화면은 `useExamDiagnosisSession`을 통해 examId/attempt 정보를 가지고 있고, 폰 메모에서 직접 진단 상태를 읽어 `recordAttempt`로 보낸다.

- [ ] **Step 1: Add sync call to `handlePauseRequested`**

`features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`의 line 52~54의 `handlePauseRequested`를 다음으로 교체:

```typescript
const { profile, session: authSession, recordAttempt } = useCurrentLearner();
const { state: examState } = useExamSession();

const handlePauseRequested = useCallback(() => {
  void (async () => {
    const result = examState.result;
    if (result && profile && authSession) {
      try {
        const diagnosed = await getDiagnosisProgress({
          examId: result.examId,
          attemptId: result.attemptId,
          attemptDateISO: result.completedAt,
        });
        const input = buildExamAttemptInputWithDiagnosis({
          session: authSession,
          profile,
          result,
          diagnosedProblems: diagnosed,
        });
        await recordAttempt(input).catch((err) => {
          console.warn('[Exam] sync on pause failed', err);
        });
      } catch (err) {
        console.warn('[Exam] sync on pause failed', err);
      }
    }
    router.replace('/(tabs)/quiz');
  })();
}, [router, examState.result, profile, authSession, recordAttempt]);
```

상단 import에 추가:

```typescript
import { useCurrentLearner } from '@/features/learner/provider';
import { buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
import { getDiagnosisProgress } from '../exam-diagnosis-progress';
import { useExamSession } from '../exam-session';
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Manual smoke**

```bash
npx expo run:ios
```

진단 세션 진입 → 1문제 분석 → "잠시 쉬기" → 홈 이동. 네트워크 패널 또는 콘솔에서 `recordAttempt` 호출이 일어나는지 확인.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(exam): sync diagnosed state to server on pause from diagnosis session"
```

---

## Task 9: Sync Point #4 — App Background Listener

**Files:**
- Create: `features/quiz/exam/use-app-background-sync.ts`
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts` (wire)
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` (wire)

앱이 백그라운드로 진입할 때(홈버튼/스와이프) 활성 attempt가 있으면 `recordAttempt` 호출. 강제 종료/배터리 방전 직전 상태를 보존한다. 결과화면과 진단 세션 두 곳에서만 사용.

- [ ] **Step 1: Create hook**

Create `features/quiz/exam/use-app-background-sync.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * 앱이 active → background/inactive로 전환될 때 onSync를 한 번 호출한다.
 * 동일 사이클에서 여러 번 호출되지 않도록 가드를 둔다. fire-and-forget이며 실패해도
 * 다음 sync point(잠시 쉬기/홈)에서 회복된다.
 */
export function useAppBackgroundSync(onSync: () => void): void {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        onSyncRef.current();
      }
    });
    return () => sub.remove();
  }, []);
}
```

- [ ] **Step 2: Wire in result screen**

`features/quiz/exam/hooks/use-exam-result-screen.ts`에 (return 직전):

```typescript
useAppBackgroundSync(() => {
  if (!result || !profile || !session) return;
  const input = buildExamAttemptInputWithDiagnosis({
    session,
    profile,
    result,
    diagnosedProblems,
  });
  void recordAttempt(input).catch(() => {
    /* 다음 sync point에서 회복 */
  });
});
```

상단 import:

```typescript
import { useAppBackgroundSync } from '../use-app-background-sync';
```

- [ ] **Step 3: Wire in diagnosis session screen**

`features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`에 `handlePauseRequested` 정의 직후:

```typescript
useAppBackgroundSync(() => {
  void (async () => {
    const result = examState.result;
    if (!result || !profile || !authSession) return;
    try {
      const diagnosed = await getDiagnosisProgress({
        examId: result.examId,
        attemptId: result.attemptId,
        attemptDateISO: result.completedAt,
      });
      await recordAttempt(
        buildExamAttemptInputWithDiagnosis({
          session: authSession,
          profile,
          result,
          diagnosedProblems: diagnosed,
        }),
      );
    } catch {
      /* 다음 sync point에서 회복 */
    }
  })();
});
```

상단 import:

```typescript
import { useAppBackgroundSync } from '../use-app-background-sync';
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Manual smoke**

```bash
npx expo run:ios
```

진단 세션 진입 → 1문제 분석 → 홈버튼으로 백그라운드 → 다른 기기에서 기록 탭 새로고침 → 분석중 카운트가 반영되는지 확인.

- [ ] **Step 6: Commit**

```bash
git add features/quiz/exam/use-app-background-sync.ts features/quiz/exam/hooks/use-exam-result-screen.ts features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(exam): sync diagnosed state to server on app background"
```

---

## Task 10: End-to-End Manual Verification

**Files:** N/A — manual testing only

- [ ] **Step 1: Build dev client**

패키지 변경은 없지만 신규 파일이 추가됐으므로 안전하게:

```bash
npx expo prebuild --clean
npx expo run:ios
```

- [ ] **Step 2: 단일 기기 회귀**

1. 한 기기에서 모의고사 응시 → 채점 → 결과화면 진입
2. 일부 문제만 분석 (예: 5문제 중 2개) → 미니카드에서 "잠시 쉬기"
3. 기록 탭 진입 → "분석중 2/5" 표시 확인
4. 그 항목 탭 → 결과화면 진입 → 진행률 바와 그리드 정확히 표시
5. 나머지 분석 → 자동으로 리포트 화면(`/quiz/result`) 이동

- [ ] **Step 3: 다기기 가시성 (태블릿 → 폰)**

1. 태블릿에서 시험 응시 + 일부 분석 + "잠시 쉬기"
2. 폰에서 같은 계정 로그인 → 기록 탭
3. 같은 attempt가 같은 분석중 카운트로 보이는지

- [ ] **Step 4: 다기기 이어서 분석**

1. 태블릿: 3/5까지 분석 → "잠시 쉬기"
2. 폰: 기록 탭 → 분석중 행 탭 → 결과화면 진입
3. 폰에서 4번째 문제 분석 → "홈으로"
4. 태블릿: 기록 탭 새로고침 → 4/5 표시 확인

- [ ] **Step 5: 앱 백그라운드 동기화**

1. 분석 도중 홈버튼 또는 스와이프로 백그라운드
2. 다른 기기에서 기록 탭 새로고침
3. 최신 카운트 반영 확인

- [ ] **Step 6: 만점/시작전 표시**

1. 만점 attempt → "만점" 배지
2. 분석 0개인 attempt(latest) → "분석 시작 전" 표시

- [ ] **Step 7: hero CTA 회귀**

1. 분석중 상태에서 hero "이어서 분석하기 →" 버튼 → 진단 세션으로 직진(결과화면 경유 X)

- [ ] **Step 8: 시각 affordance**

1. `in_progress` 행에 chevron `›` 표시
2. `completed` / `not_started` / `만점` 행은 chevron 없고 탭해도 무반응

- [ ] **Step 9: PROGRESS.md 업데이트**

`docs/PROGRESS.md`에 한 줄 항목 추가 (날짜 + 변경 요약 + 관련 spec 링크).

- [ ] **Step 10: Notion 페이지 업데이트**

Notion "DASIDA 개발 기록"에서 [기록 탭 분석중 항목 탭하면 결과화면 이동 (다기기 지원)](https://app.notion.com/p/35273f86260481dd803ed8de63df249e) 페이지의 상태를 `구현완료`로, 구현완료일을 오늘 날짜로 업데이트. Spec 필드를 GitHub permalink로 갱신.
