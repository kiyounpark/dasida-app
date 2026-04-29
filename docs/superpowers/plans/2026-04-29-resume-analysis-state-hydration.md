# Resume Analysis State Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "이어서 분석하기" 진입 시 약점 진단이 정상 동작하고(Bug 1) 모든 약점 완료 후 리포트가 정상 노출되게(Bug 2) 한다.

**Architecture:** `ExamSessionProvider`를 root layout으로 끌어올려 `state.result`를 single source of truth로 유지한다. resume 진입 시 hub가 AsyncStorage에서 `ExamResultSummary` 전체를 읽어 `hydrateResult` 디스패치 후 push한다. 모든 다운스트림(`useExamDiagnosis`, `getUserAnswer`, `ExamResultScreen`)은 분기 코드 없이 그대로 동작.

**Tech Stack:** Expo Router, React Native, React Context + Reducer (`exam-session.tsx`), AsyncStorage, Jest.

> **spec 정정:** spec에서 provider 이동 위치를 `app/quiz/_layout.tsx`로 명시했으나, hub(`app/(tabs)/quiz/index.tsx`)가 이 layout 외부에 있어 `useExamSession()` 접근 불가. 실제 이동 위치는 **`app/_layout.tsx` (root)** 이다.

---

## File Structure

**기존 상태:**
- `ExamSessionProvider`: `app/quiz/exam/_layout.tsx` 안에 있음. `app/quiz/exam/*` 만 cover.
- hub `onResumeAnalysis`: storage 데이터를 읽어 직접 push, provider 우회.
- `latest-exam-attempt-store`: `wrongProblemNumbers`까지만 저장. 점수/answers 없음.

**변경 후:**
- `ExamSessionProvider`: `app/_layout.tsx` (root)에서 `<Stack>`을 감쌈. 앱 전체에서 `useExamSession()` 가능.
- `latest-exam-attempt-store`: `result: ExamResultSummary` 필드 포함하여 저장.
- `exam-session.tsx`: `HYDRATE_RESULT` 액션 + `hydrateResult(result)` context 함수.
- `use-quiz-hub-screen.ts`: `onResumeAnalysis`에서 `hydrateResult` 호출 후 push.
- `exam-analysis-in-progress.ts`: legacy data(`result == null`)면 `isInProgress: false`.
- `use-exam-result-screen.ts`: `saveLatestExamAttempt` 페이로드에 `result` 포함.

**파일 목록:**
- Modify: `features/quiz/exam/exam-analysis-in-progress.ts`
- Modify: `features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts` 또는 inline test (확인 필요)
- Modify: `features/quiz/exam/latest-exam-attempt-store.ts`
- Modify: `features/quiz/exam/latest-exam-attempt-store.test.ts`
- Modify: `features/quiz/exam/exam-session.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/quiz/exam/_layout.tsx`
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.test.ts`
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

---

## Task 1: Extend `LatestExamAttemptSummary` 타입에 `result` 필드 추가

**Files:**
- Modify: `features/quiz/exam/exam-analysis-in-progress.ts:1-30`

`LatestExamAttemptSummary`에 `result: ExamResultSummary | null` 추가. `null`이면 legacy data로 간주. `computeAnalysisInProgressState`는 다음 step에서 처리.

- [ ] **Step 1: 타입 import 추가 + 필드 추가**

`features/quiz/exam/exam-analysis-in-progress.ts` 상단:

```ts
import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamResultSummary } from './types';  // 신규 import

export type LatestExamAttemptSummary = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  wrongProblemNumbers: number[];
  result: ExamResultSummary | null;  // 신규: legacy data는 null
};
```

- [ ] **Step 2: 타입 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -40
```

Expected: `LatestExamAttemptSummary`를 사용하는 다른 파일들에서 타입 에러가 발생할 것 (test 파일 포함). 다음 task에서 순차 수정.

- [ ] **Step 3: 일단 commit**

```bash
git add features/quiz/exam/exam-analysis-in-progress.ts
git commit -m "refactor(exam): add result field to LatestExamAttemptSummary type"
```

---

## Task 2: legacy data 가드를 `computeAnalysisInProgressState`에 추가 (TDD)

**Files:**
- Modify: `features/quiz/exam/exam-analysis-in-progress.ts:31-57`
- Modify: `features/quiz/exam/exam-analysis-in-progress.test.ts` (또는 위치 확인)

`result == null`인 attempt는 resume 비활성화.

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/exam/exam-analysis-in-progress.test.ts`에 추가:

```ts
it('legacy data (result == null)면 inactive', () => {
  expect(
    computeAnalysisInProgressState({
      latestAttempt: {
        examId: 'e1',
        attemptId: 'a1',
        attemptDateISO: '2026-04-26',
        wrongProblemNumbers: [1, 2, 3],
        result: null,  // legacy
      },
      diagnosedProblems: {},
    }),
  ).toEqual({ isInProgress: false });
});
```

기존 케이스의 mock data에도 `result: null` 또는 적절한 값을 추가해 타입 만족시키기.

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest features/quiz/exam/exam-analysis-in-progress.test.ts -t "legacy data" 2>&1 | tail -20
```

Expected: 새 케이스 FAIL — 기존 함수는 `result == null`을 체크하지 않으므로 `isInProgress: true` 반환.

- [ ] **Step 3: 가드 구현**

`features/quiz/exam/exam-analysis-in-progress.ts:36-38`:

```ts
export function computeAnalysisInProgressState(
  input: AnalysisInProgressInput,
): AnalysisInProgressState {
  const { latestAttempt, diagnosedProblems } = input;

  if (!latestAttempt || latestAttempt.wrongProblemNumbers.length === 0) {
    return { isInProgress: false };
  }
  if (latestAttempt.result === null) {
    return { isInProgress: false };  // legacy data, resume 비활성
  }
  // ... 이하 기존 로직 동일
```

- [ ] **Step 4: 테스트 실행 (성공 확인)**

```bash
npx jest features/quiz/exam/exam-analysis-in-progress.test.ts 2>&1 | tail -20
```

Expected: 모든 케이스 PASS.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/exam-analysis-in-progress.ts features/quiz/exam/exam-analysis-in-progress.test.ts
git commit -m "feat(exam): skip resume when latestAttempt.result is null (legacy data)"
```

---

## Task 3: `latest-exam-attempt-store`가 `result`를 포함하여 저장/조회 (TDD)

**Files:**
- Modify: `features/quiz/exam/latest-exam-attempt-store.ts`
- Modify: `features/quiz/exam/latest-exam-attempt-store.test.ts`

`result: ExamResultSummary | null` 필드를 직렬화/역직렬화. 기존 페이로드(result 필드 없음)는 `result: null`로 자연스럽게 매핑.

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/exam/latest-exam-attempt-store.test.ts` 상단의 `SAMPLE_ATTEMPT` 갱신:

```ts
const SAMPLE_RESULT: ExamResultSummary = {
  attemptId: 'attempt-abc',
  examId: 'exam-001',
  startedAt: '2026-04-27T00:00:00.000Z',
  completedAt: '2026-04-27T00:30:00.000Z',
  total: 30,
  correct: 27,
  wrong: 3,
  unanswered: 0,
  accuracy: 90,
  totalScore: 95,
  maxScore: 100,
  perProblem: [
    { number: 3, userAnswer: 1, correctAnswer: 2, isCorrect: false, earnedScore: 0 },
    { number: 7, userAnswer: 3, correctAnswer: 4, isCorrect: false, earnedScore: 0 },
    { number: 12, userAnswer: 2, correctAnswer: 1, isCorrect: false, earnedScore: 0 },
  ],
};

const SAMPLE_ATTEMPT: LatestExamAttemptSummary = {
  examId: 'exam-001',
  attemptId: 'attempt-abc',
  attemptDateISO: '2026-04-27T00:00:00.000Z',
  wrongProblemNumbers: [3, 7, 12],
  result: SAMPLE_RESULT,
};
```

`ExamResultSummary` import 추가:

```ts
import type { ExamResultSummary } from '@/features/quiz/exam/types';
```

레거시 케이스 추가:

```ts
it('result 필드 없는 페이로드 → result: null로 정상화', async () => {
  const legacyPayload = {
    examId: 'exam-001',
    attemptId: 'attempt-abc',
    attemptDateISO: '2026-04-27T00:00:00.000Z',
    wrongProblemNumbers: [3, 7, 12],
    // result 없음
  };
  mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(legacyPayload));
  await expect(getLatestExamAttempt(ACCOUNT_KEY)).resolves.toEqual({
    ...legacyPayload,
    result: null,
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest features/quiz/exam/latest-exam-attempt-store.test.ts 2>&1 | tail -30
```

Expected: 기존 SAMPLE_ATTEMPT 사용 케이스들 + 새 케이스 FAIL. 직렬화는 풀 통과하지만 `result: null` 정상화는 미구현.

- [ ] **Step 3: store 구현 갱신**

`features/quiz/exam/latest-exam-attempt-store.ts:8-18`:

```ts
function parseAttempt(raw: string): LatestExamAttemptSummary | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.wrongProblemNumbers)) {
      return null;
    }
    // result 필드가 없는 legacy payload는 null로 정상화
    const result = parsed.result && typeof parsed.result === 'object' ? parsed.result : null;
    return {
      examId: parsed.examId,
      attemptId: parsed.attemptId,
      attemptDateISO: parsed.attemptDateISO,
      wrongProblemNumbers: parsed.wrongProblemNumbers,
      result,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 실행 (성공 확인)**

```bash
npx jest features/quiz/exam/latest-exam-attempt-store.test.ts 2>&1 | tail -20
```

Expected: 모든 케이스 PASS.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/latest-exam-attempt-store.ts features/quiz/exam/latest-exam-attempt-store.test.ts
git commit -m "feat(exam): persist full ExamResultSummary in latest-exam-attempt-store"
```

---

## Task 4: `ExamSessionProvider`에 `HYDRATE_RESULT` 액션 추가

**Files:**
- Modify: `features/quiz/exam/exam-session.tsx`

resume 진입 시 hub가 호출할 `hydrateResult(result)` context 함수와 reducer 액션 추가.

- [ ] **Step 1: Action 타입 추가**

`features/quiz/exam/exam-session.tsx:22-29`:

```ts
type Action =
  | { type: 'INIT_EXAM'; payload: { examId: string; problems: ExamProblem[] } }
  | { type: 'SET_ANSWER'; payload: { index: number; answer: ExamAnswer } }
  | { type: 'GO_TO_NEXT' }
  | { type: 'GO_TO_PREV' }
  | { type: 'GO_TO_INDEX'; payload: { index: number } }
  | { type: 'SUBMIT_EXAM' }
  | { type: 'RESET' }
  | { type: 'HYDRATE_RESULT'; payload: { result: ExamResultSummary } };  // 신규
```

- [ ] **Step 2: Reducer case 추가**

`features/quiz/exam/exam-session.tsx`의 `reducer` switch 안 (`case 'RESET':` 위에):

```ts
    case 'HYDRATE_RESULT': {
      const { result } = action.payload;
      // SUBMIT_EXAM 이후 상태와 동등하게 만든다.
      // problems/answers는 비어있어도 다운스트림 소비자가 state.result만 참조하므로 무방.
      return {
        ...createInitialState(),
        examId: result.examId,
        attemptId: result.attemptId,
        startedAt: result.startedAt,
        hasStarted: true,
        isFinished: true,
        result,
      };
    }
```

- [ ] **Step 3: Context value에 `hydrateResult` 노출**

`features/quiz/exam/exam-session.tsx:9-18`:

```ts
type ExamSessionContextValue = {
  state: ExamSessionState;
  initExam: (examId: string, problems: ExamProblem[]) => void;
  setAnswer: (index: number, answer: ExamAnswer) => void;
  goToNext: () => void;
  goToPrev: () => void;
  goToIndex: (index: number) => void;
  submitExam: () => void;
  resetExam: () => void;
  hydrateResult: (result: ExamResultSummary) => void;  // 신규
};
```

`useMemo` value 객체에 추가 (`features/quiz/exam/exam-session.tsx:160-172`):

```ts
const value = useMemo<ExamSessionContextValue>(
  () => ({
    state,
    initExam: (examId, problems) => dispatch({ type: 'INIT_EXAM', payload: { examId, problems } }),
    setAnswer: (index, answer) => dispatch({ type: 'SET_ANSWER', payload: { index, answer } }),
    goToNext: () => dispatch({ type: 'GO_TO_NEXT' }),
    goToPrev: () => dispatch({ type: 'GO_TO_PREV' }),
    goToIndex: (index) => dispatch({ type: 'GO_TO_INDEX', payload: { index } }),
    submitExam: () => dispatch({ type: 'SUBMIT_EXAM' }),
    resetExam: () => dispatch({ type: 'RESET' }),
    hydrateResult: (result) => dispatch({ type: 'HYDRATE_RESULT', payload: { result } }),  // 신규
  }),
  [state],
);
```

- [ ] **Step 4: 타입 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(exam-session|HYDRATE)" | head -10
```

Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/exam-session.tsx
git commit -m "feat(exam): add HYDRATE_RESULT action to ExamSessionProvider"
```

---

## Task 5: `ExamSessionProvider`를 root layout으로 이동

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/quiz/exam/_layout.tsx`

hub에서 `useExamSession()` 호출 가능하도록 provider를 위로 끌어올림. `(tabs)/quiz`와 `quiz/exam/*` 양쪽에서 같은 인스턴스 사용.

- [ ] **Step 1: root layout에 provider 추가**

`app/_layout.tsx` import 추가:

```ts
import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';
```

`RootLayout` return JSX 수정 (`app/_layout.tsx:131-144`):

```tsx
return (
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <CurrentLearnerProvider>
      <ExamSessionProvider>
        <AuthGateRedirector />
        <Stack>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="quiz" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      </ExamSessionProvider>
    </CurrentLearnerProvider>
    <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
  </ThemeProvider>
);
```

- [ ] **Step 2: `app/quiz/exam/_layout.tsx`에서 provider 제거**

기존:

```tsx
import { Stack } from 'expo-router';
import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';

export default function ExamLayout() {
  return (
    <ExamSessionProvider>
      <Stack>
        <Stack.Screen name="solve" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
        <Stack.Screen name="diagnosis-session" options={{ headerShown: false }} />
      </Stack>
    </ExamSessionProvider>
  );
}
```

변경 후:

```tsx
import { Stack } from 'expo-router';

export default function ExamLayout() {
  return (
    <Stack>
      <Stack.Screen name="solve" options={{ headerShown: false }} />
      <Stack.Screen name="result" options={{ headerShown: false }} />
      <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
      <Stack.Screen name="diagnosis-session" options={{ headerShown: false }} />
    </Stack>
  );
}
```

- [ ] **Step 3: 타입 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx app/quiz/exam/_layout.tsx
git commit -m "refactor(layout): hoist ExamSessionProvider to root for cross-tab access"
```

---

## Task 6: 시험 결과 저장 시 full `result`도 함께 persist

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts:74-79`
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.test.ts` (test 파일 존재 확인)

`saveLatestExamAttempt` 페이로드에 `result: result` 추가.

- [ ] **Step 1: 실패 테스트 작성 (또는 보강)**

`features/quiz/exam/hooks/use-exam-result-screen.test.ts`에 — 이미 `saveLatestExamAttempt`을 mock해 호출 인자를 검증하는 케이스가 있다면 인자에 `result` 포함 단언을 추가. 없으면 신규 추가:

```ts
it('saveLatestExamAttempt에 ExamResultSummary 전체를 포함', async () => {
  // ... arrange: 시험 완료된 result mock ...
  // ... render hook ...
  // ... act ...
  await waitFor(() => {
    expect(saveLatestExamAttempt).toHaveBeenCalledWith(
      'account-key',
      expect.objectContaining({
        examId: expect.any(String),
        attemptId: expect.any(String),
        attemptDateISO: expect.any(String),
        wrongProblemNumbers: expect.any(Array),
        result: expect.objectContaining({ perProblem: expect.any(Array) }),  // 신규 단언
      }),
    );
  });
});
```

> 기존 테스트 파일이 어떻게 mock하는지 먼저 확인하고 패턴을 맞추세요. 테스트 파일이 너무 큰 변경이 필요하면 이 step을 skip하고 step 4의 통합 검증으로 대체.

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest features/quiz/exam/hooks/use-exam-result-screen.test.ts 2>&1 | tail -20
```

Expected: `result` 미포함으로 단언 FAIL.

- [ ] **Step 3: 구현 갱신**

`features/quiz/exam/hooks/use-exam-result-screen.ts:74-79`:

```ts
void saveLatestExamAttempt(session.accountKey, {
  examId: result.examId,
  attemptId: result.attemptId,
  attemptDateISO: result.completedAt,
  wrongProblemNumbers: wrongNums,
  result,  // 신규: full ExamResultSummary
});
```

- [ ] **Step 4: 테스트 실행 (성공 확인)**

```bash
npx jest features/quiz/exam/hooks/use-exam-result-screen.test.ts 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts features/quiz/exam/hooks/use-exam-result-screen.test.ts
git commit -m "feat(exam): include full result in saveLatestExamAttempt payload"
```

---

## Task 7: hub `onResumeAnalysis`에서 `hydrateResult` 호출 후 push

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:195-211`

`latestAttempt.result`를 hydrate한 뒤 diagnosis-session으로 push. `result`가 null인 케이스(legacy)는 task 2의 가드로 이미 카드 자체가 안 뜨므로 도달 불가.

- [ ] **Step 1: hook import + 사용**

`features/quiz/hooks/use-quiz-hub-screen.ts` 상단:

```ts
import { useExamSession } from '@/features/quiz/exam/exam-session';
```

`useQuizHubScreen` 함수 내부 (state 선언 부근):

```ts
const { hydrateResult } = useExamSession();
```

- [ ] **Step 2: `onResumeAnalysis` 갱신**

`features/quiz/hooks/use-quiz-hub-screen.ts:195-211`:

```ts
const onResumeAnalysis = useCallback(() => {
  if (!latestAttempt || !latestAttempt.result) return;
  // diagnosedNotes.length를 startIndex로 사용하는 것은 진단 세션이 순차적으로 저장된다는
  // 불변성에 의존한다. 비순차 완료가 가능해지면 findIndex 방식으로 교체 필요.
  const startIndex = analysisState.isInProgress ? analysisState.diagnosedNotes.length : 0;

  // ExamSessionProvider에 결과를 hydrate — useExamDiagnosis가 attemptId/attemptDateISO,
  // getUserAnswer가 perProblem을 정상적으로 읽도록 한다.
  hydrateResult(latestAttempt.result);

  router.push({
    pathname: '/quiz/exam/diagnosis-session',
    params: {
      examId: latestAttempt.examId,
      wrongProblemNumbers: JSON.stringify(latestAttempt.wrongProblemNumbers),
      startIndex: String(startIndex),
      totalNotes: String(latestAttempt.wrongProblemNumbers.length),
      diagnosedCountBefore: String(startIndex),
    },
  });
}, [latestAttempt, analysisState, hydrateResult]);
```

- [ ] **Step 3: 타입 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "fix(quiz): hydrate exam session before resuming analysis (Bug 1)"
```

---

## Task 8: Bug 2 — 모든 약점 완료 시 리포트로 navigation

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx:51-68`

resume 흐름에서는 스택이 `[Home → diagnosis-session]`이라 `router.back()`이 Home으로 간다. 이를 해결하기 위해 모든 약점 완료 시 `router.replace('/quiz/exam/result')`로 명시 navigate한다. result 화면은 hydrate된 `state.result`를 보고 자체 `useEffect`가 `/quiz/result?source=exam`으로 redirect한다 (`use-exam-result-screen.ts:109-144` 기존 로직).

> Fresh flow도 같은 코드 경로를 타지만 `state.result`가 이미 set되어 있고 result 화면에서 redirect만 일어나므로 동일하게 동작한다. 스택에 result가 한 번 쌓이는 비용이 있으나 사용자가 보지 못하는 짧은 transition에 한정.

- [ ] **Step 1: `handlePageComplete` 갱신**

`features/quiz/exam/screens/exam-diagnosis-session-screen.tsx:57-68`:

```tsx
const handlePageComplete = useCallback(
  (index: number) => {
    session.onComplete(index);
    const hasNext = session.getNextProblemNumber(index) !== null;
    if (hasNext) {
      session.onScrollToNext(index);
    } else {
      // 모든 약점 진단 완료 → result 화면으로 명시 navigate.
      // resume 흐름(스택에 result 없음)에서도 일관되게 동작하도록 router.back() 대신 replace 사용.
      // result 화면이 diagnosedCount >= wrongCount를 감지하면 자동으로 /quiz/result?source=exam으로 redirect한다.
      router.replace('/quiz/exam/result');
    }
  },
  [session],
);
```

router import 추가 (이미 `useRouter`로 import되어 있다면 `router.replace` 대신 `router.replace`):

```tsx
import { useLocalSearchParams, useRouter, router } from 'expo-router';
```

- [ ] **Step 2: 헤더 back 버튼은 그대로 `router.back()` 유지 확인**

`session.onBackToResult`(`use-exam-diagnosis-session.ts:97-99`)는 헤더 `onBack` prop에서만 사용되며 `router.back()` 그대로. 사용자가 진행 중 헤더 back을 누르면:
- fresh: 스택에 result 있음 → result로
- resume: 스택에 result 없음 → Home으로 (기존 의도된 동작, 진단 일시중단)

⚠️ 이 step에서 코드 변경 없음. 위 동작이 의도와 부합하는지 한 번 더 검토만.

- [ ] **Step 3: 타입 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "fix(quiz): navigate to result on diagnosis completion to ensure report shows (Bug 2)"
```

---

## Task 9: 통합 검증 (수동)

코드 변경은 끝. iOS/Android 시뮬레이터에서 실제 동작을 검증한다.

- [ ] **Step 1: prebuild + run (의존성 변경은 없으나, 안전을 위해 한 번)**

```bash
npx expo prebuild --clean
npx expo run:ios
```

Expected: 빌드/번들 성공.

- [ ] **Step 2: Fresh flow 회귀 테스트**

시나리오:
1. 시험(`/quiz/exam/solve`)을 풀고 제출
2. 결과 화면(`/quiz/exam/result`)에서 오답 문제 하나 클릭 → diagnosis-session
3. 약점 선택 후 미니카드 "다음 문제 →" 동작 확인
4. 모든 오답 진단 완료 → 약점 리포트(`/quiz/result?source=exam`) 노출

✓ 모든 단계 정상이면 fresh flow 회귀 없음.

- [ ] **Step 3: Resume flow 정상 동작 검증**

시나리오:
1. 시험 풀이 → 채점 → 진단 세션 진입
2. 약점 1~2개만 진단하고 헤더 back으로 빠져나옴 → Home으로 돌아옴
3. Home에 "이어서 분석하기" 카드 노출 확인
4. 카드 탭 → diagnosis-session 진입
5. **Bug 1 회귀 검증:** 약점 선택 후 미니카드(또는 마일스톤 배너) 노출, "다음 문제 →" 탭 시 다음 문제로 자동 advance
6. 문제 카드의 "내 답"이 정확히 채점 시 입력한 값과 일치
7. 마지막 약점까지 진단 완료
8. **Bug 2 회귀 검증:** `/quiz/result?source=exam` 리포트가 정상 노출

- [ ] **Step 4: App kill + relaunch resume 검증**

시나리오:
1. 진단 도중 앱 강제 종료(swipe up)
2. 앱 재실행 → Home에 "이어서 분석하기" 카드 노출
3. Step 3과 동일한 순서로 정상 동작 확인

이 시나리오는 hydrate가 storage 기반이므로 자동 커버됨.

- [ ] **Step 5: Legacy data 무해성 검증**

이번 변경 이전에 시험을 본 사용자(storage에 `result` 필드 없는 페이로드)가 있다면:
- "이어서 분석하기" 카드가 안 뜨는지 확인 (Task 2 가드)
- 새 시험을 한 번 보면 그 다음부터 resume 사용 가능

⚠️ 직접 storage를 manipulate하기 어렵다면, 개발 환경에서:
```ts
// 임시 코드로 storage에 legacy payload 주입 후 hub 진입
await AsyncStorage.setItem(`dasida/latest-exam-attempt/${accountKey}`, JSON.stringify({
  examId: 'exam-001',
  attemptId: 'a',
  attemptDateISO: '2026-04-01',
  wrongProblemNumbers: [1, 2, 3],
  // result 없음 — legacy
}));
```
주입 후 Home에서 카드가 안 뜨는지 확인.

- [ ] **Step 6: 통과 시 푸시**

```bash
git push origin <current-branch>
npm run log:commit
```

---

## Self-Review 체크포인트

이 plan을 spec과 대조해 빈 곳이 없는지 확인.

- [x] **Spec — Bug 1 (auto-advance):** Task 7(hub의 hydrateResult 호출) → useExamDiagnosis가 attemptId/attemptDateISO를 정상 읽음 → `freezeAndAppend([mini-card])` 정상 발화 → "다음 문제 →" 노출.
- [x] **Spec — Bug 2 (리포트 누락):** Task 8(`router.replace('/quiz/exam/result')`) → result 화면에서 `state.result` 정상 → `useEffect`가 `/quiz/result?source=exam`으로 redirect.
- [x] **Spec — userAnswer 0 표시 결함:** Task 7에서 `state.result` hydrate되면서 `getUserAnswer`가 `perProblem`을 정상 조회.
- [x] **Spec — Migration 정책 A (legacy 비활성화):** Task 2(가드) + Task 3(parser가 `result`를 null로 정상화).
- [x] **Spec — provider 위치:** Task 5에서 root로 이동 (spec의 "app/quiz/_layout.tsx" 명시는 정정 — hub layout 문제 때문).
- [x] **Spec — verification 시나리오:** Task 9 step 2~5에서 모두 cover.

---

## 참고: 영향 받지 않는 코드 (변경 없음)

- `features/quiz/exam/hooks/use-exam-diagnosis.ts` — `state.result?.attemptId`/`completedAt` 읽기 그대로. hydrate 후 정상 동작.
- `features/quiz/exam/hooks/use-exam-diagnosis-session.ts` — `getUserAnswer`/`onBackToResult` 그대로.
- `features/quiz/exam/screens/exam-result-screen.tsx` 및 `use-exam-result-screen.ts` — `if (!hook.result) return null` / 자동 redirect useEffect 그대로. hydrate 후 정상 동작.
- `useExamDiagnosis`의 `recordAttempt(buildExamDiagnosisAttemptInput(...))`는 진단 결과를 저장하는 호출이므로 resume에서도 정상 발화 (이건 새 데이터, 중복 아님).
- 시험 attempt 자체의 record는 fresh flow에서 result 화면 mount 시 한 번 발화하며, resume 시 result 화면을 거치지 않으면 재호출되지 않음. Task 8에서 result로 navigate하더라도 `saveAttempted` ref가 fresh mount이므로 한 번 더 호출되긴 하나, 동일 attempt-id로 멱등 처리되는지는 backend 책임.

> **만약 backend가 attempt 멱등 처리를 보장하지 않으면** Task 8에 `?resumed=1` 쿼리 파라미터 추가 + result 화면의 첫 useEffect에서 skip 로직 필요. 이 경우 본 plan의 Task 8 step 1을 다음으로 교체:
> ```tsx
> router.replace('/quiz/exam/result?resumed=1');
> ```
> 그리고 `use-exam-result-screen.ts:58-80`에 `useLocalSearchParams`로 `resumed` 읽어 첫 useEffect 가드 추가. backend 검증 후 결정.
