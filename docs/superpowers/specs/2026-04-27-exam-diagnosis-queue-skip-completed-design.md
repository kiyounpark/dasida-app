# 모의고사 결과 화면 — 진단 완료된 문제 큐에서 제외

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:writing-plans 다음으로 superpowers:subagent-driven-development 또는 superpowers:executing-plans

## 문제 (Problem)

모의고사 결과 화면에서 사용자가 오답 타일을 누르면 `wrongProblemNumbers`에 **모든 오답**(이미 진단 완료된 것 포함)이 들어간 상태로 진단 세션이 시작된다.

### 재현 시나리오
1. 모의고사 결과 화면. 오답 = [1, 3, 5].
2. 사용자가 3번 타일을 눌러 진단 완료. 결과 화면에 3 = `done`.
3. 사용자가 5번 타일을 눌러 진단 완료. 결과 화면에 5 = `done`.
4. 사용자가 마지막 1번 타일(`undone`)을 누른다.
5. **현재 동작**: `wrongProblemNumbers = [1, 3, 5]`, `startIndex = 0`. 세션이 1 → 3 → 5 순서로 돌면서 이미 끝낸 3, 5 진단을 처음부터 다시 진행한다.
6. **기대 동작**: 세션이 1번만 처리하고 끝난다. 1 완료 후 결과 화면 자동 복귀, `diagnosedCount === wrongCount` 충족 → 리포트로 자동 이동.

### 영향
- 학습 부담 증가. 30문제 중 10문제 틀린 학생이 마지막 한 문제 진단할 때 9문제를 또 풀어야 한다.
- 잘못된 진단 데이터 덮어쓰기 위험 (이미 끝낸 문제를 다시 진단하면 weakness가 다른 값으로 갱신될 수 있다).
- 학습 의욕 저하.

### 원인 (Root Cause)

[features/quiz/exam/hooks/use-exam-result-screen.ts:182-184](features/quiz/exam/hooks/use-exam-result-screen.ts):

```typescript
const wrongProblemNumbers = result.perProblem
  .filter((p) => !p.isCorrect && p.userAnswer !== null)
  .map((p) => p.number);  // 진단 완료 여부 무시
```

`diagnosedProblems` 상태를 같은 hook에서 보유하고 있으나 `onAnalyzeProblem`에서 활용하지 않음.

---

## 해결 방안 (Solution)

### 사용자 경험 (Approach B 채택)

사용자가 `undone` 타일을 누르면:
1. 클릭한 문제부터 시작
2. 그 뒤로 **남은 미진단** 문제들을 원래 순서대로 이어서 처리
3. 마지막 미진단 문제 완료 시 결과 화면 → 리포트 자동 이동

**예시:**
| 오답 | 진단 완료 | 클릭 | 큐 (전달) |
|------|-----------|------|-----------|
| [1,3,5] | {} | 1 | [1,3,5] |
| [1,3,5] | {3,5} | 1 | [1] |
| [1,3,5] | {5} | 3 | [3,1] |
| [1,3,5] | {5} | 1 | [1,3] |
| [1,3,5] | {1,3,5} | 3 (방어) | [] (네비 막음) |

### 아키텍처

순수 함수 1개를 신규로 추가하고, hook에서 호출하는 단일 변경점.

**Layer 분리 (DASIDA 구조 기준):**
- domain/util: `buildDiagnosisQueue` (순수 함수, 새 파일)
- hook: `use-exam-result-screen.onAnalyzeProblem`이 함수 호출 (단순 위임)
- view/route: 변경 없음
- `useExamDiagnosisSession` (진단 세션 hook): 변경 없음 — 큐의 의미가 동일하므로 그대로 동작

---

## 파일 구조 (File Structure)

| 파일 | 작업 | 책임 |
|------|------|------|
| `features/quiz/exam/build-diagnosis-queue.ts` | NEW | 순수 함수: undiagnosed 필터링 + rotation |
| `features/quiz/exam/__tests__/build-diagnosis-queue.test.ts` | NEW | 6개 테스트 케이스 |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | MODIFY | `onAnalyzeProblem`이 `buildDiagnosisQueue` 사용, 빈 큐일 때 네비게이션 막음 |

---

## 인터페이스 (Interface)

```typescript
// features/quiz/exam/build-diagnosis-queue.ts
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

export function buildDiagnosisQueue(
  allWrong: number[],
  diagnosed: ExamDiagnosisProgress,
  startProblem: number,
): number[] {
  const undone = allWrong.filter((n) => !(n in diagnosed));
  if (!undone.includes(startProblem)) return [];
  return [startProblem, ...undone.filter((n) => n !== startProblem)];
}
```

**계약:**
- 입력 `allWrong`: 결과 화면이 정한 오답 번호 배열 (공란 제외, 채점 결과의 원래 순서 유지)
- 입력 `diagnosed`: `Record<number, WeaknessId>` — `getDiagnosisProgress`로 읽은 현재 진단 상태
- 입력 `startProblem`: 사용자가 누른 타일의 문제 번호
- 출력: 진단 세션에 전달할 큐 (`number[]`). 첫 원소가 `startProblem`이고, 나머지는 `allWrong`의 원래 순서를 유지한 미진단 문제들
- 빈 배열 반환 = 네비게이션하지 않음 (방어)

---

## 호출 변경 (Caller Change)

```typescript
// features/quiz/exam/hooks/use-exam-result-screen.ts (변경 후)
onAnalyzeProblem: (problemNumber: number) => {
  if (!result) return;
  const allWrong = result.perProblem
    .filter((p) => !p.isCorrect && p.userAnswer !== null)
    .map((p) => p.number);
  const queue = buildDiagnosisQueue(allWrong, diagnosedProblems, problemNumber);
  if (queue.length === 0) return;
  router.push({
    pathname: '/quiz/exam/diagnosis-session',
    params: {
      examId: result.examId,
      wrongProblemNumbers: JSON.stringify(queue),
      startIndex: '0',
    },
  });
},
```

**핵심:**
- `startIndex`는 항상 `'0'` — 큐 자체가 클릭한 문제부터 시작하도록 구성됨
- `queue.length === 0` 가드 — done 타일 클릭 / race / 잘못된 입력 시 네비게이션 안 함

---

## 데이터 흐름 (Data Flow)

```
[사용자 타일 클릭]
        ↓
[use-exam-result-screen.onAnalyzeProblem]
        ↓ (allWrong, diagnosedProblems, problemNumber)
[buildDiagnosisQueue] ── 순수 함수 ──→ queue: number[]
        ↓
[router.push(/quiz/exam/diagnosis-session, { wrongProblemNumbers: queue, startIndex: '0' })]
        ↓
[ExamDiagnosisSessionScreen 파라미터 파싱]
        ↓
[useExamDiagnosisSession({ wrongProblemNumbers: queue, startIndex: 0 })]
        ↓
[순서대로 진단 진행 → onComplete → onScrollToNext or onBackToResult]
        ↓
[결과 화면 복귀, useFocusEffect로 diagnosedProblems 갱신]
        ↓
[useEffect: diagnosedCount >= wrongCount → router.replace(/quiz/result, ...)]
```

---

## 에러 처리 (Error Handling)

이 변경은 새로운 에러 경로를 만들지 않는다. 모두 입력 검증 + 방어 분기.

| 케이스 | 동작 |
|--------|------|
| `allWrong = []` (오답 없음) | 호출되지 않음 (UI에 타일 없음) |
| `diagnosed` 비어있음 | 큐 = `allWrong`을 회전한 형태. 처음 진입과 동일. |
| `startProblem` ∉ `allWrong` | 큐 = `[]` → no-op |
| `startProblem`이 이미 진단 완료 | 큐 = `[]` → no-op |
| 모두 진단 완료 (race) | 큐 = `[]` → no-op |

---

## 테스트 (Testing)

### Unit: `build-diagnosis-queue.test.ts`

```typescript
describe('buildDiagnosisQueue', () => {
  it('진단된 문제 없으면 클릭한 문제 첫 자리, 나머지 원래 순서', () => {
    expect(buildDiagnosisQueue([1, 3, 5], {}, 1)).toEqual([1, 3, 5]);
    expect(buildDiagnosisQueue([1, 3, 5], {}, 3)).toEqual([3, 1, 5]);
  });

  it('일부 진단 완료 — 미진단만, 클릭한 문제 첫 자리', () => {
    const diagnosed = { 5: 'formula_understanding' as WeaknessId };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 3)).toEqual([3, 1]);
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1, 3]);
  });

  it('마지막 한 개만 미진단 + 그것 클릭', () => {
    const diagnosed = {
      3: 'calc_repeated_error' as WeaknessId,
      5: 'formula_understanding' as WeaknessId,
    };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1]);
  });

  it('이미 진단 완료된 문제 클릭 — 빈 배열 (방어)', () => {
    const diagnosed = { 3: 'calc_repeated_error' as WeaknessId };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 3)).toEqual([]);
  });

  it('allWrong에 없는 번호 클릭 — 빈 배열 (방어)', () => {
    expect(buildDiagnosisQueue([1, 3, 5], {}, 99)).toEqual([]);
  });

  it('JSON.parse 결과처럼 string 키여도 동작 (in 연산자 coercion)', () => {
    const diagnosed = JSON.parse('{"5":"formula_understanding"}') as ExamDiagnosisProgress;
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1, 3]);
  });
});
```

### Smoke 검증 (시뮬레이터)
- 모의고사 1, 3, 5번 틀리는 답 입력 → 결과 화면
- 3번 진단 완료 → 결과 화면 복귀, 3 = done 표시 확인
- 5번 진단 완료 → 결과 화면 복귀, 5 = done 표시 확인
- 1번 클릭 → 진단 세션이 **1번만** 표시하는지 확인 (3, 5 안 나옴)
- 1번 진단 완료 → 결과 화면 거쳐 자동으로 리포트로 이동

---

## 회귀 위험 (Regression Risk)

| 영역 | 위험도 | 이유 |
|------|--------|------|
| 처음 진단 시작 (모두 미진단) | 낮음 | 큐 = allWrong과 동일 순서 (rotation 무영향) |
| 진단 세션 hook 동작 | 없음 | 입력 의미 동일 (number[]) |
| 자동 리포트 이동 | 없음 | `diagnosedCount >= wrongCount` 로직 그대로 |
| Firebase attempt 기록 | 없음 | `recordAttempt` 호출 위치/조건 변경 없음 |
| Done 타일이 클릭되는 경우 | 낮음 | view에서 `undone`만 onPress 활성화돼 있을 가능성 높음. 함수가 빈 배열 반환으로 방어. |

### 명시적으로 다루지 않는 것
- **타일 정렬**: 결과 화면 타일은 점수 내림차순 정렬 (변경 없음). 큐 순서는 `allWrong`의 perProblem 순서(번호 오름차순)를 따름. 의도된 분리.
- **회차 분리**: `attemptId`별로 `diagnosedProblems`가 분리되어 있음 (이전 회차의 진단이 이번 회차에 영향 없음). 변경 없음.

---

## 구현 순서 제안 (Implementation Order)

1. `build-diagnosis-queue.ts` 신규 작성 (순수 함수)
2. `__tests__/build-diagnosis-queue.test.ts` 6개 테스트 작성 → 통과 확인
3. `use-exam-result-screen.ts`의 `onAnalyzeProblem` 수정 (import 추가, 호출 교체)
4. 시뮬레이터 smoke 테스트
5. 커밋 → 푸시

---

## 비범위 (Out of Scope)

- 진단 세션 화면 자체의 큐 동기화 로직 변경
- 결과 화면 타일 정렬/표시 로직
- 진단 결과 저장 키 구조 (`exam-diagnosis-progress.ts`)
- "Phase 2: 홈 내 약점 누적 집계 뷰" — 별개 spec
