# Fix: 모의고사 결과 화면에서 이전 회차 약점 분석 완료 상태가 잘못 표시되는 문제

**Date:** 2026-04-25
**Branch:** main (작업 브랜치는 별도 생성 예정)
**Related files:**
- `features/quiz/exam/exam-diagnosis-progress.ts`
- `features/quiz/exam/hooks/use-exam-result-screen.ts`
- `features/quiz/exam/hooks/use-exam-diagnosis.ts`
- `constants/storage-keys.ts`

---

## 문제

모의고사를 같은 시험으로 두 번 이상 응시하면, 새 회차의 결과 화면에 들어왔을 때 **이번 회차에서 분석하지 않은 문제들이 "✓ 완료"로 표시**된다.

### 증상

- 1회차에 모의고사 X를 풀고 5번·12번 문제를 약점 분석함
- 며칠 뒤 2회차로 같은 모의고사 X를 다시 풀고 결과 화면 진입
- 5번·12번이 또 오답이라면, 이번 회차에서 손도 안 댔는데 "✓ 완료"로 표시되어 "왜 틀렸지?" 버튼이 눌리지 않음
- 진행률 바도 잘못 계산됨 (`diagnosedCount / wrongCount`)

### 원인

`features/quiz/exam/exam-diagnosis-progress.ts`의 AsyncStorage 키가 `examId`만 포함한다.

```ts
function storageKey(examId: string) {
  return StorageKeys.examDiagnosisProgressPrefix + examId;
}
// 결과: "dasida/exam-diagnosis/{examId}"
```

`use-exam-result-screen.ts:67`에서 `getDiagnosisProgress(result.examId)`로 읽어와 그대로 `diagnosedProblems` state에 셋하고, `problemTiles` 매핑에서 `diagnosedProblems[p.number]`가 truthy이면 `'done'`으로 마킹한다. 회차(`attemptId`) 정보가 어디에도 반영되지 않아, 한 번이라도 진단한 문제는 모든 후속 회차에서 영구적으로 완료 상태가 된다.

### Invariant

> 결과 화면의 진단 진행률은 **이번 회차(`attemptId`) 안에서 분석을 완료한 문제만** 반영해야 한다.

---

## 해결 방법

AsyncStorage 키에 회차 정보를 포함하여 데이터를 회차별로 분리한다.

### 키 포맷

```
dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}
```

- `YYYY-MM-DD`: `result.completedAt`에서 파생한 KST 로컬 날짜. 사람이 읽기 좋은 라벨 역할 (회차 식별은 attemptId가 책임지므로 날짜는 디버깅·정리용 라벨)
- `{attemptId}`: 같은 날 두 번 응시해도 충돌하지 않도록 보장하는 식별자
- 데이터 모양은 그대로 `Record<problemNumber, WeaknessId>`

### 옛날 키 마이그레이션

기존 `dasida/exam-diagnosis/{examId}` 형태의 키는 결과 화면 첫 진입 시 한 번 삭제한다. 진단 이력은 백엔드 `recordAttempt` 레코드에 보존되므로 손실되지 않는다.

### 오래된 키 정리

별도 정책 없음 (YAGNI). 한 사용자가 같은 시험을 수십 번 풀 가능성이 낮고, 각 키 값이 작은 JSON이라 AsyncStorage 용량 부담이 없다.

---

## 변경 사항

### 1. `features/quiz/exam/exam-diagnosis-progress.ts`

함수 시그니처에 attempt 식별 정보를 추가한다.

```ts
type AttemptScope = {
  examId: string;
  attemptId: string;
  // 키 라벨 생성용. completedAt 또는 startedAt(ISO 문자열) 사용
  attemptDateISO: string;
};

function storageKey(scope: AttemptScope): string {
  const localDate = formatLocalDate(scope.attemptDateISO); // "YYYY-MM-DD" (KST)
  return `${StorageKeys.examDiagnosisProgressPrefix}${scope.examId}/${localDate}-${scope.attemptId}`;
}

export async function getDiagnosisProgress(
  scope: AttemptScope,
): Promise<ExamDiagnosisProgress> { ... }

export async function markProblemDiagnosed(
  scope: AttemptScope,
  problemNumber: number,
  weaknessId: WeaknessId,
): Promise<void> { ... }

// 옛날 키(attemptId 없는 형태)만 정확히 일치할 때 삭제
export async function purgeLegacyDiagnosisKey(examId: string): Promise<void> {
  const legacyKey = StorageKeys.examDiagnosisProgressPrefix + examId;
  await AsyncStorage.removeItem(legacyKey);
}
```

`formatLocalDate`는 새로 만들거나 (utils 폴더에 있으면 재사용), 인라인으로 KST 기준 `YYYY-MM-DD`를 만든다.

### 2. `features/quiz/exam/hooks/use-exam-result-screen.ts`

```ts
useFocusEffect(
  useCallback(() => {
    if (!result) return;
    getDiagnosisProgress({
      examId: result.examId,
      attemptId: result.attemptId,
      attemptDateISO: result.completedAt,
    }).then(setDiagnosedProblems);
  }, [result]),
);

// 마운트 시 한 번만 옛날 키 정리
useEffect(() => {
  if (!result) return;
  purgeLegacyDiagnosisKey(result.examId);
}, [result?.examId]);
```

### 3. `features/quiz/exam/hooks/use-exam-diagnosis.ts`

`markProblemDiagnosed` 호출 시 attempt scope를 함께 전달한다. 호출 사이트 변경을 줄이기 위해 훅 내부에서 `useExamSession`으로 `state.result.attemptId`, `state.result.completedAt`을 직접 읽는다(파라미터 추가 X).

```ts
const { state } = useExamSession();
// ... final node effect 안에서
const attemptId = state.result?.attemptId;
const attemptDateISO = state.result?.completedAt;
if (!attemptId || !attemptDateISO) return; // 이론상 발생하지 않음 (결과 화면에서만 진입)

markProblemDiagnosed(
  { examId, attemptId, attemptDateISO },
  problemNumber,
  weaknessId,
),
```

`exam-diagnosis-session-screen.tsx` 등 호출 사이트는 변경하지 않는다.

### 4. (선택) `constants/storage-keys.ts`

`examDiagnosisProgressPrefix` 그대로 유지. 새 키는 같은 프리픽스 + `/{date-attemptId}` 서브패스로 자연스럽게 확장된다.

---

## 비변경

- 백엔드 attempt 레코드(`recordAttempt`) — 그대로
- 진단 세션 내부 로직 (`use-exam-diagnosis.ts`의 flow advance/save) — 그대로
- 결과 화면 UI/스타일 — 그대로
- `ExamDiagnosisProgress`, `WeaknessId` 등 타입 — 그대로

---

## 검증 항목

- [ ] **새 회차에서 이전 회차 영향 없음**: 같은 examId로 1회차 진단 완료 → 2회차 응시 → 결과 화면의 모든 틀린 문제가 `'undone'` 상태로 시작
- [ ] **회차 내 진행 상태 유지**: 결과 화면 진입 → 한 문제 분석 완료 → 결과 화면으로 돌아옴 → 해당 문제만 `'done'`으로 표시 (포커스 시 갱신)
- [ ] **옛날 키 정리**: 옛날 형태(`dasida/exam-diagnosis/{examId}`) 키가 있는 상태에서 결과 화면 첫 진입 → 옛날 키 삭제 확인. 백엔드 attempt 레코드는 그대로 남아있는지 확인
- [ ] **같은 날 재응시**: 같은 날 같은 시험을 두 번 응시해도 두 회차의 진행 데이터가 섞이지 않는지 확인 (attemptId 분리 검증)
- [ ] **TypeScript 타입 체크 통과**: `npm run typecheck` 또는 동등한 명령으로 시그니처 변경이 모든 호출 사이트에서 반영되었는지 확인

---

## 변경 파일 요약

- `features/quiz/exam/exam-diagnosis-progress.ts` — 키 생성·시그니처 변경, `purgeLegacyDiagnosisKey` 추가
- `features/quiz/exam/hooks/use-exam-result-screen.ts` — `getDiagnosisProgress` 호출 인자 변경, 마운트 시 1회 마이그레이션
- `features/quiz/exam/hooks/use-exam-diagnosis.ts` — `markProblemDiagnosed` 호출 인자 변경
