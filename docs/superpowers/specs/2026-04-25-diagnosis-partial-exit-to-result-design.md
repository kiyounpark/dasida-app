# 약점 분석 부분 완료 후 나가기 시 리포트 자동 이동

**날짜:** 2026-04-25  
**상태:** 설계 완료

---

## 문제 정의

약점 분석 단계에서 1개 이상 문제를 풀고 나가기를 누르면 여정보드로 돌아온다.
사용자는 1개라도 분석했으면 결과 리포트로 이동하길 기대한다.

### 재현 시나리오

1. 10문제 퀴즈 완료 → 약점 분석 시작
2. 분석 0문제 → 나가기 → 여정보드 (정상)
3. 여정보드 "약점 분석 이어서 하기" → 재진입
4. 분석 1문제 완료 → 나가기 → **여정보드** (❌ 리포트여야 함)

---

## 근본 원인

[`features/quiz/hooks/use-diagnostic-screen.ts`](../../../../features/quiz/hooks/use-diagnostic-screen.ts)의 `onExitDiagnosis()`가 분석 완료 수를 확인하지 않고 항상 `pendingDiagnosisResume`을 저장한 뒤 `/(tabs)/quiz`로 이동한다.

리포트로 가는 경로는 `state.result`가 설정될 때 자동으로 동작하는 effect (line 186-198)인데, 이 경로가 `onExitDiagnosis`에서 활용되지 않는다.

```ts
// 현재: 분석 완료 수 무관하게 항상 여정보드
const onExitDiagnosis = () => {
  void setPendingDiagnosisResume({...})
  router.replace('/(tabs)/quiz')  // 항상 여정보드
}
```

---

## 설계

### 동작 정의

| 나가기 시점 | 변경 전 | 변경 후 |
|---|---|---|
| 분석 0개 완료 | 여정보드 | 여정보드 (그대로) |
| 분석 1개 이상 완료 | 여정보드 | **리포트 자동 이동** |

### 변경 방법

`onExitDiagnosis()`에서 분석 완료 수를 확인한다. 1개 이상이면 `finishDiagnosis()`를 호출해 자동 완료 처리한다.

```ts
const onExitDiagnosis = () => {
  setIsExitModalVisible(false);

  const hasCompletedAnyAnalysis =
    state.isDiagnosing &&
    state.diagnosisQueue.some((i) => Boolean(state.answers[i]?.weaknessId));

  if (hasCompletedAnyAnalysis) {
    // finishDiagnosis() → state.result 설정 → 기존 effect → step-complete(analysis) → /quiz/result
    finishDiagnosis();
    return;
  }

  // 기존 동작: 0개 완료 시 pending 저장 후 여정보드
  if (!state.attemptId || !state.startedAt) {
    router.replace('/(tabs)/quiz');
    return;
  }
  void setPendingDiagnosisResume({...}).catch(...)
  router.replace('/(tabs)/quiz');
};
```

### 내부 흐름 (변경 후)

```
finishDiagnosis() 호출
  → FINISH_DIAGNOSIS 액션 → finalizeQuiz() → state.result 설정
  → isDiagnosing: false → effect(line 164) 플래그 초기화
  → state.result effect(line 186) → router.replace('/quiz/step-complete?step=analysis')
  → step-complete(analysis) → router.replace('/quiz/result')
  → 리포트 화면
```

`clearPendingDiagnosisResume`은 `state.result` effect(line 200)에서 자동 호출되므로 별도 처리 불필요.

---

## 영향 범위

- **변경 파일:** `features/quiz/hooks/use-diagnostic-screen.ts` (onExitDiagnosis 함수만)
- **변경 없음:** session reducer, step-complete, result screen, journey state

---

## 엣지 케이스

| 케이스 | 처리 |
|---|---|
| `isDiagnosing: false`인 상태에서 나가기 | `hasCompletedAnyAnalysis: false` → 기존 동작 |
| 모든 분석 문제 완료 후 나가기 | `checkPhaseTransition`이 이미 `finalizeQuiz()` 호출 → `state.result` 설정됨 → `onExitDiagnosis` 도달 전 이미 리포트로 이동 |
| `diagnosisQueue`가 빈 배열 | `some()` → false → 기존 동작 |
