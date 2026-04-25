# Fix: stale pendingDiagnosticStartedAt after onExitDiagnosis

**Date:** 2026-04-24  
**Branch:** claude/wonderful-hawking-06a5d9  
**Related commits:** d139b02, cc19d86, 3a7781c (feat/diagnostic-analysis-pending)

---

## 문제

`onExitDiagnosis`는 유저가 약점 분석 도중 나갈 때 호출된다. 이 함수는 `setPendingDiagnosisResume`으로 재개 상태를 저장하지만, `pendingDiagnosticStartedAt`을 지우지 않는다.

결과적으로 두 필드가 동시에 존재하는 불일치 상태가 발생한다.

```
pendingDiagnosisResume       = { attemptId, diagnosisQueue, ... }  ← 설정됨
pendingDiagnosticStartedAt   = "2026-04-24T..."                    ← stale, 지워지지 않음
```

### 증상

`getCurrentState()` (home-journey-state.ts)의 우선순위:

1. `hasValidPendingResume` → `diagnostic_analysis_pending`
2. `isPendingDiagnosticFresh` → `diagnostic_in_progress`

`hasValidPendingResume`가 false로 판정되는 순간(예: 재개 완료 직후 `clearPendingDiagnosisResume`의 async 반영 전)에 `pendingDiagnosticStartedAt`이 살아있으면, 여정 보드가 "약점 분석 이어서 하기" 대신 "진단 다시 시작하기"를 잘못 표시한다.

### Invariant 위반

> **Rest state invariant:** `pendingDiagnosisResume`이 설정된 rest 상태에서 `pendingDiagnosticStartedAt`은 존재해서는 안 된다.
> resume 재진입 시(`resumeDiagnosis` 호출 → `markPendingDiagnosticStarted` 재실행) 두 필드가 일시적으로 공존할 수 있으나, 이 시점에는 `hasValidPendingResume`이 우선 평가되므로 동작상 문제 없다.

- `pendingDiagnosticStartedAt`: 퀴즈 파트 진행 중 플래그
- `pendingDiagnosisResume`: 퀴즈 파트 완료 후 분석 파트 재개 플래그

두 필드는 상호 배타적인 상태를 나타낸다.

---

## 해결 방법

`setPendingDiagnosisResume` 컨트롤러 메서드에서 `pendingDiagnosisResume` 저장과 동시에 `pendingDiagnosticStartedAt`을 제거한다.

**파일:** `features/learner/current-learner-controller.ts`

```ts
// Before
const nextProfile: LearnerProfile = {
  ...profile,
  pendingDiagnosisResume: resumeState,
  updatedAt: new Date().toISOString(),
};

// After
const nextProfile: LearnerProfile = {
  ...profile,
  pendingDiagnosisResume: resumeState,
  pendingDiagnosticStartedAt: undefined,
  updatedAt: new Date().toISOString(),
};
```

`profileStore.save(nextProfile)`은 Firestore 단일 문서 write이므로 두 필드 변경이 원자적으로 처리된다.

---

## 원자성 보장 범위

| 연산 | write 횟수 | 원자성 |
|------|-----------|--------|
| `setPendingDiagnosisResume` (이번 fix 후) | 1 | ✓ 보장 |
| `state.result` useEffect의 sequential clear | 2 | △ 보장 안 됨 (기존 코드, 이번 스코프 밖) |

이번 스코프는 `setPendingDiagnosisResume` 한 곳만 수정한다. `state.result` useEffect의 두 번 write 패턴은 별도 이슈로 관리한다.

---

## Resume 재진입 시 동작

유저가 재개 화면으로 돌아오면 `resumeDiagnosis` 호출 → `state.hasStarted = true` → `markPendingDiagnosticStarted` effect 재실행 → `pendingDiagnosticStartedAt` 재설정.

이는 의도된 동작(크로스 디바이스 stale 방지)이며, 이 시점에는 `pendingDiagnosisResume`이 유효하게 남아있어 `hasValidPendingResume`이 우선 처리되므로 문제 없다.

---

## 검증 항목

- [ ] `setPendingDiagnosisResume` 호출 결과 프로필에 `pendingDiagnosticStartedAt`이 `undefined`인지 확인
- [ ] 약점 분석 중 나가기 → 홈 진입 시 여정 보드가 `diagnostic_analysis_pending` 상태 표시 확인
- [ ] 재개 후 분석 완료 시 `result_pending` 상태 정상 전환 확인
- [ ] `hasValidPendingResume`이 false인 edge case에서도 `diagnostic_in_progress`가 잘못 표시되지 않는지 확인

---

## 변경 파일

- `features/learner/current-learner-controller.ts` — `setPendingDiagnosisResume` 1줄 수정
