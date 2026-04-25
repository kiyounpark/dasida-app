# 약점 분석 부분 완료 후 나가기 시 리포트 자동 이동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 분석 중 1개 이상 문제를 완료하고 나가기를 누르면 여정보드 대신 결과 리포트로 이동한다.

**Architecture:** `onExitDiagnosis()`에 분석 완료 수 체크를 추가한다. 1개 이상 완료 시 `finishDiagnosis()`를 호출해 `state.result`를 설정하고, 기존 `useEffect`(line 186-198)가 자동으로 `step-complete?step=analysis` → `/quiz/result`로 이동시키도록 한다. 0개 완료 시 기존 동작(pending 저장 + 여정보드)을 유지한다.

**Tech Stack:** React Native, Expo Router, useReducer (QuizSessionContext)

---

## 변경 파일 맵

| 파일 | 역할 |
|---|---|
| `features/quiz/hooks/use-diagnostic-screen.ts` | `onExitDiagnosis()` 수정 (유일한 변경) |

---

### Task 1: onExitDiagnosis 수정

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts` (onExitDiagnosis 함수, line 558-577)

**현재 코드 (line 558-577):**
```ts
const onExitDiagnosis = () => {
  setIsExitModalVisible(false);
  if (!state.attemptId || !state.startedAt) {
    router.replace('/(tabs)/quiz');
    return;
  }
  void setPendingDiagnosisResume({
    schemaVersion: 1,
    attemptId: state.attemptId,
    startedAt: state.startedAt,
    savedAt: new Date().toISOString(),
    totalQuestions: state.totalQuestions,
    answers: state.answers,
    weaknessScores: state.weaknessScores,
    diagnosisQueue: state.diagnosisQueue,
  }).catch((err) => {
    console.warn('[DiagnosticScreen] setPendingDiagnosisResume failed', err);
  });
  router.replace('/(tabs)/quiz');
};
```

- [ ] **Step 1: onExitDiagnosis 함수 수정**

`features/quiz/hooks/use-diagnostic-screen.ts`의 `onExitDiagnosis`를 아래 코드로 교체한다:

```ts
const onExitDiagnosis = () => {
  setIsExitModalVisible(false);

  const hasCompletedAnyAnalysis =
    state.isDiagnosing &&
    state.diagnosisQueue.some((i) => Boolean(state.answers[i]?.weaknessId));

  if (hasCompletedAnyAnalysis) {
    finishDiagnosis();
    return;
  }

  if (!state.attemptId || !state.startedAt) {
    router.replace('/(tabs)/quiz');
    return;
  }
  void setPendingDiagnosisResume({
    schemaVersion: 1,
    attemptId: state.attemptId,
    startedAt: state.startedAt,
    savedAt: new Date().toISOString(),
    totalQuestions: state.totalQuestions,
    answers: state.answers,
    weaknessScores: state.weaknessScores,
    diagnosisQueue: state.diagnosisQueue,
  }).catch((err) => {
    console.warn('[DiagnosticScreen] setPendingDiagnosisResume failed', err);
  });
  router.replace('/(tabs)/quiz');
};
```

`finishDiagnosis`는 이미 `useQuizSession()`에서 destructure되어 있다 (line 101-112). 추가 import 불필요.

- [ ] **Step 2: TypeScript 타입 확인**

```bash
npx tsc --noEmit 2>&1 | grep -E "use-diagnostic-screen|error"
```

Expected: 에러 없음

- [ ] **Step 3: 수동 검증 — 시나리오 A (핵심 버그 수정 확인)**

앱 실행 (`npx expo run:ios`) 후 아래 흐름 검증:

1. 10문제 퀴즈 완료 (오답 1개 이상)
2. step-complete 화면에서 "계속" 누름
3. 약점 분석 화면에서 오답 1개 분석 완료 (onFinalConfirm 호출까지)
4. 나가기 버튼 누름
5. **기대 결과:** 여정보드가 아닌 step-complete(analysis) → `/quiz/result` 리포트로 이동

- [ ] **Step 4: 수동 검증 — 시나리오 B (0개 완료 시 기존 동작 유지)**

1. 10문제 퀴즈 완료
2. 약점 분석 화면 진입 후 아무 문제도 완료하지 않고 나가기
3. **기대 결과:** 여정보드로 이동 (기존 동작 그대로)

- [ ] **Step 5: 수동 검증 — 시나리오 C (0개 → 재진입 → 1개)**

1. 10문제 완료 → 분석 0개 → 나가기 (여정보드)
2. "약점 분석 이어서 하기" 누름 → 재진입
3. 분석 1개 완료 → 나가기
4. **기대 결과:** 리포트로 이동

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "fix(diagnosis): 분석 1개 이상 완료 후 나가기 시 리포트로 이동"
```

---

## 변경 로직 흐름 요약

```
onExitDiagnosis() 호출
  ├─ isDiagnosing && diagnosisQueue에 weaknessId 있는 항목 존재?
  │   ├─ YES → finishDiagnosis()
  │   │         → FINISH_DIAGNOSIS → finalizeQuiz() → state.result 설정
  │   │         → isDiagnosing: false → effect(line 164) 플래그 초기화
  │   │         → state.result effect(line 186) → step-complete?step=analysis
  │   │         → step-complete → router.replace('/quiz/result') ✅
  │   └─ NO  → pendingDiagnosisResume 저장 → /(tabs)/quiz (여정보드) ✅
  └─ (attemptId 없으면 바로 여정보드)
```
