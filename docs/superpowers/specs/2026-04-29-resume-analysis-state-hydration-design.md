# Resume Analysis State Hydration — Design Spec

**Date:** 2026-04-29
**Status:** Approved

## Goal

홈 화면의 "이어서 분석하기"(resume analysis) 진입 시 약점 진단 세션이 정상 동작하도록 만든다. 현재는 (1) 약점 선택 후 다음 문제로 넘어가지 않고, (2) 모든 약점을 끝내도 리포트가 노출되지 않는 두 버그가 있다.

## Background

### 정상 흐름 (working)

`solve` → `result` → `diagnosis-session`이 모두 같은 `app/quiz/exam/_layout.tsx`의 `ExamSessionProvider` 아래에서 이어진다. `state.result`(`ExamResultSummary`)가 메모리에 살아 있어 `useExamDiagnosis`, `getUserAnswer`, `ExamResultScreen`이 모두 정상 동작한다.

### 깨진 흐름 (resume)

`features/quiz/hooks/use-quiz-hub-screen.ts`의 `onResumeAnalysis`는 Home(`/(tabs)/quiz`)에서 곧장 `/quiz/exam/diagnosis-session`으로 `router.push`한다. 이때 `ExamSessionProvider`는 새로 mount되어 `state.result = null`이다.

이로 인한 결함:

1. **Bug 1 — 자동 advance 안 됨.** `features/quiz/exam/hooks/use-exam-diagnosis.ts`의 `useEffect`(line 317~)가 `if (!attemptId || !attemptDateISO) return;`에서 조기 반환한다. `setIsDone(true)`도 `freezeAndAppend([mini-card])`도 실행되지 않아 "다음 문제 →" 버튼이 영원히 나타나지 않는다.
2. **Bug 2 — 리포트 누락.** `use-exam-diagnosis-session.ts`의 `onBackToResult`가 `router.back()`이라, resume 진입 시 스택이 `[Home → diagnosis-session]`이므로 Home으로 돌아간다. 설령 result 화면으로 직접 navigate해도 `state.result`가 `null`이라 빈 화면이 노출된다.
3. **숨은 결함 — `userAnswer` 0 표시.** `getUserAnswer`도 `state.result?.perProblem`을 참조하므로, resume 흐름에서 모든 문제 카드의 "내 답"이 0으로 표시된다. Bug 1 때문에 사용자가 진단을 끝까지 못 가서 아직 보고된 적은 없으나 잠재 결함.

### 근본 원인

`ExamSessionProvider.state.result`가 시험 진단의 single source of truth인데, resume 플로우는 이 provider를 우회한다. 누락된 데이터(`attemptId`, `attemptDateISO`, `perProblem`, 점수 요약)를 route params로 분산 전달하는 방식은 (a) verbose하고 (b) `useExamDiagnosis`/`getUserAnswer`/`ExamResultScreen`에 각각 두 갈래 코드 경로를 만들어야 한다.

## Approach: Hydrate Provider From Storage

`latest-exam-attempt-store`에 `ExamResultSummary` 전체를 저장하고, resume 진입 직전에 `ExamSessionProvider`로 hydrate 디스패치한다. 모든 다운스트림 소비자는 `state.result`만 보면 되므로 분기 코드가 없다.

### 데이터 모델 변경

`features/quiz/exam/latest-exam-attempt-store.ts`의 저장 스키마에 `result: ExamResultSummary` 필드를 추가한다.

```ts
type LatestExamAttemptRecord = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  wrongProblemNumbers: number[];
  result: ExamResultSummary;  // 신규 — 전체 시험 결과
};
```

`LatestExamAttemptSummary`(`features/quiz/exam/exam-analysis-in-progress.ts`)도 같이 확장하거나, hub에서만 쓰는 별도 reader를 추가한다.

### Provider 액션 추가

`features/quiz/exam/exam-session.tsx`의 reducer에 `HYDRATE_RESULT` 액션을 추가한다.

```ts
type Action =
  | ...
  | { type: 'HYDRATE_RESULT'; payload: { result: ExamResultSummary } };

case 'HYDRATE_RESULT':
  return { ...state, isFinished: true, result: action.payload.result, hasStarted: true };
```

`isFinished: true` / `hasStarted: true`를 함께 세팅하여 `SUBMIT_EXAM` 이후 상태와 동등하게 만든다. context value에 `hydrateResult(result: ExamResultSummary)` 함수를 노출한다.

### Hub → Diagnosis-Session 진입 변경

`use-quiz-hub-screen.ts`의 `onResumeAnalysis`는 다음 순서로 동작한다.

1. AsyncStorage에서 `latestExamAttempt.result`를 읽는다.
2. `result`가 누락되어 있으면(legacy data) resume 비활성화 — 이 경우 카드 자체가 노출되지 않도록 `computeAnalysisInProgressState`에서도 같은 체크를 한다.
3. `hydrateResult(result)` 호출.
4. `router.push('/quiz/exam/diagnosis-session', { ...기존 params })`.

`hydrateResult`를 hub에서 직접 호출하려면 `ExamSessionProvider`가 hub보다 상위 레이어에 있어야 한다. 현재 provider는 `app/quiz/exam/_layout.tsx`에 있어 `(tabs)` 트리에서 접근 불가. 두 옵션:

- **(a)** Provider를 `app/_layout.tsx`(루트) 또는 `app/quiz/_layout.tsx`(quiz 루트)로 끌어올림.
- **(b)** Hub는 hydrate 신호만 navigation params로 전달(`hydrate=1` + storage 키)하고, `app/quiz/exam/_layout.tsx`나 `diagnosis-session-screen` 마운트 시 hydrate 실행.

**(a)를 채택한다.** `ExamSessionProvider`의 책임은 "현재 사용자의 시험 세션 상태"이며, 이는 quiz 트리 전체에 걸친 관심사다. 위치 이동은 1회성 비용이고 향후 비슷한 hydrate 요구가 있을 때 자연스럽다. (b)는 mount 타이밍 race를 만들고 분기 코드를 늘린다.

이동 위치: `app/quiz/_layout.tsx` (현재 존재하는 layout). 기존 `app/quiz/exam/_layout.tsx`에서는 제거.

### Result 저장 시점 확장

`features/quiz/exam/hooks/use-exam-result-screen.ts`의 `saveLatestExamAttempt` 호출(line 74~)에 `result: result` 추가.

## Migration Policy (선택지 A)

기존 `latestExamAttempt`(perProblem/result 없음)를 가진 사용자는 **resume 진입을 조용히 비활성화**한다.

- `computeAnalysisInProgressState`에서 `latestAttempt.result == null`이면 `isInProgress: false` 반환.
- 따라서 Home 카드 자체가 안 뜸. 사용자는 다음 시험 응시 후부터 resume 사용 가능.
- 결함 있는 UX(userAnswer = 0 등)를 한 번도 노출하지 않는다.

대안 B(레거시 데이터로 attempt만 살리고 userAnswer 0 노출)는 채택하지 않음.

## Scope

변경 파일:

- `features/quiz/exam/latest-exam-attempt-store.ts` — 스키마에 `result` 추가, reader/writer 갱신.
- `features/quiz/exam/exam-analysis-in-progress.ts` — `LatestExamAttemptSummary`에 `result` 추가, `result == null`일 때 `isInProgress: false` 가드.
- `features/quiz/exam/exam-session.tsx` — `HYDRATE_RESULT` 액션 + `hydrateResult` context 함수.
- `app/quiz/_layout.tsx` — `ExamSessionProvider`로 감싸기.
- `app/quiz/exam/_layout.tsx` — `ExamSessionProvider` 제거.
- `features/quiz/hooks/use-quiz-hub-screen.ts` — `onResumeAnalysis`가 `hydrateResult` 호출 후 push.
- `features/quiz/exam/hooks/use-exam-result-screen.ts` — `saveLatestExamAttempt` 페이로드에 `result` 추가.

테스트 갱신:

- `features/quiz/exam/exam-analysis-in-progress.test.ts` — legacy data(`result: null`) 케이스 추가.
- `features/quiz/exam/latest-exam-attempt-store.test.ts` — 스키마 변경 반영.

## Out of Scope

- `ExamResultScreen`의 자체 동작은 변경하지 않는다. hydrate 후에는 정상 흐름과 동일하게 작동.
- `onResumeAnalysis` 외의 진입점(`onAnalyzeProblem` 등)은 기존 흐름이 정상 동작하므로 손대지 않는다.
- 진단 도중 앱 강제 종료 → 재실행 시나리오는 이번 작업이 자동으로 커버한다 (`state.result`가 storage에 있으니 hydrate 가능). 별도 수동 테스트 케이스만 추가.

## Verification

- 신규 시험 응시 → 채점 결과 → 진단 도중 홈 이탈 → "이어서 분석하기" → 남은 문제 진단 → 모든 문제 완료 → 리포트 노출까지 정상.
- 진단 도중 앱 강제 종료(swipe up) → 앱 재실행 → 홈에 "이어서 분석하기" 카드 → 동일 시나리오로 리포트 노출까지.
- `userAnswer`가 모든 문제 카드에서 정확히 표시되는지(채점 시 입력한 값과 일치) 확인.
- Legacy data(이번 변경 이전 시험 응시 기록)만 있는 경우 "이어서 분석하기" 카드가 안 뜨는지 확인.
