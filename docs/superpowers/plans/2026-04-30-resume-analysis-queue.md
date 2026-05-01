# Resume Analysis Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "이어서 분석하기" 진입 시 비순차 진단된 케이스에서도 미진단 문제만 정확히 노출하도록 `onResumeAnalysis`를 큐 방식으로 통일한다.

**Architecture:** 새 순수 함수 `buildResumeAnalysisQueue(wrongProblemNumbers, diagnosedNotes)`를 추가해 미진단 문제만 원래 번호 순서대로 추출한다. `use-quiz-hub-screen.ts`의 `onResumeAnalysis`는 이 함수로 큐를 만들고 `wrongProblemNumbers: queue`, `startIndex: '0'`을 diagnosis-session에 전달한다. 다운스트림(session 화면, `useExamDiagnosis`)은 변경 없음.

**Tech Stack:** TypeScript, React Native, Expo Router, Jest (`jest-expo` preset).

---

## File Structure

**Create**
- `features/quiz/exam/build-resume-analysis-queue.ts` — 순수 함수: 미진단 문제 큐 생성.
- `features/quiz/exam/__tests__/build-resume-analysis-queue.test.ts` — 단위 테스트.

**Modify**
- `features/quiz/hooks/use-quiz-hub-screen.ts` — `onResumeAnalysis`가 새 함수로 큐를 만들고, `wrongProblemNumbers: JSON.stringify(queue)` + `startIndex: '0'`로 전달. 기존 주석(`// 비순차 완료가 가능해지면 findIndex 방식으로 교체 필요.`) 제거.

분리 근거: 큐 빌드는 props/hook과 무관한 순수 변환이며, 코드베이스의 기존 패턴(`buildDiagnosisQueue`, `computeAnalysisInProgressState`)과 동일하게 별 파일로 분리해 단위 테스트 가능.

---

### Task 1: `buildResumeAnalysisQueue` — 실패하는 테스트

**Files:**
- Test: `features/quiz/exam/__tests__/build-resume-analysis-queue.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
import type { WeaknessId } from '@/data/diagnosisMap';
import type { DiagnosedNote } from '../exam-analysis-in-progress';
import { buildResumeAnalysisQueue } from '../build-resume-analysis-queue';

const w = (s: string) => s as unknown as WeaknessId;

describe('buildResumeAnalysisQueue', () => {
  it('진단된 문제 없으면 전체 wrongProblemNumbers를 그대로 반환한다', () => {
    expect(buildResumeAnalysisQueue([10, 15, 20, 25, 30], [])).toEqual([
      10, 15, 20, 25, 30,
    ]);
  });

  it('일부 진단 완료 — 미진단 문제만 원래 번호 순서대로 반환한다', () => {
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 10, weaknessId: w('w_a') },
      { problemNumber: 20, weaknessId: w('w_b') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20, 25, 30], diagnosedNotes)).toEqual([
      15, 25, 30,
    ]);
  });

  it('비순차 진단 케이스 — 진단 순서와 무관하게 원래 번호 순서 유지', () => {
    // 25번 → 30번 순으로 비순차 진단된 상태
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 25, weaknessId: w('w_a') },
      { problemNumber: 30, weaknessId: w('w_b') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20, 25, 30], diagnosedNotes)).toEqual([
      10, 15, 20,
    ]);
  });

  it('모두 진단 완료 — 빈 배열 반환', () => {
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 10, weaknessId: w('w_a') },
      { problemNumber: 15, weaknessId: w('w_b') },
      { problemNumber: 20, weaknessId: w('w_c') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20], diagnosedNotes)).toEqual([]);
  });

  it('diagnosedNotes에 wrongProblemNumbers 외 키가 있어도 무시 (재시도 케이스)', () => {
    const diagnosedNotes: DiagnosedNote[] = [
      { problemNumber: 10, weaknessId: w('w_a') },
      { problemNumber: 99, weaknessId: w('w_stale') },
    ];
    expect(buildResumeAnalysisQueue([10, 15, 20], diagnosedNotes)).toEqual([
      15, 20,
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/quiz/exam/__tests__/build-resume-analysis-queue.test.ts`

Expected: FAIL with `Cannot find module '../build-resume-analysis-queue'` (모듈 미존재).

---

### Task 2: `buildResumeAnalysisQueue` — 구현

**Files:**
- Create: `features/quiz/exam/build-resume-analysis-queue.ts`

- [ ] **Step 1: Create the pure function**

```typescript
import type { DiagnosedNote } from './exam-analysis-in-progress';

/**
 * 홈 "이어서 분석하기" 진입 시 진단 세션에 전달할 큐를 만든다.
 *
 * 동작:
 * - 미진단 문제만 원래 번호 순서(wrongProblemNumbers의 순서)대로 추출.
 * - 진단 순서와 무관하게 일관된 결과를 반환 (비순차 진단 시에도 안전).
 *
 * `buildDiagnosisQueue`와 차이점:
 * - 클릭한 문제를 첫 자리로 옮기지 않음 (재개 시 항상 첫 미진단 문제부터).
 */
export function buildResumeAnalysisQueue(
  wrongProblemNumbers: number[],
  diagnosedNotes: DiagnosedNote[],
): number[] {
  const diagnosedSet = new Set(diagnosedNotes.map((n) => n.problemNumber));
  return wrongProblemNumbers.filter((n) => !diagnosedSet.has(n));
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest features/quiz/exam/__tests__/build-resume-analysis-queue.test.ts`

Expected: PASS — 5 tests passed.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/build-resume-analysis-queue.ts \
        features/quiz/exam/__tests__/build-resume-analysis-queue.test.ts
git commit -m "feat(quiz): buildResumeAnalysisQueue 순수 함수 추가

비순차 진단 케이스에서도 미진단 문제를 원래 번호 순서대로 추출한다.
onResumeAnalysis에서 사용 예정."
```

---

### Task 3: `onResumeAnalysis` 큐 방식으로 교체

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:197-218`

- [ ] **Step 1: Add import**

`features/quiz/hooks/use-quiz-hub-screen.ts` 상단의 import 블록에서 `@/features/quiz/exam/exam-analysis-in-progress` import 라인 아래에 다음을 추가한다.

```typescript
import { buildResumeAnalysisQueue } from '@/features/quiz/exam/build-resume-analysis-queue';
```

- [ ] **Step 2: Replace `onResumeAnalysis` body**

`features/quiz/hooks/use-quiz-hub-screen.ts:197-218`의 `onResumeAnalysis` 전체를 다음으로 교체한다.

```typescript
  const onResumeAnalysis = useCallback(() => {
    if (!latestAttempt || !latestAttempt.result) return;
    if (!analysisState.isInProgress) return;

    // 미진단 문제만 원래 번호 순서대로 추린다. 비순차 진단(결과 화면에서
    // 점수 높은 문제부터 클릭한 케이스 등)에서도 누락 없이 정확한 큐를 만든다.
    const queue = buildResumeAnalysisQueue(
      latestAttempt.wrongProblemNumbers,
      analysisState.diagnosedNotes,
    );
    if (queue.length === 0) return;

    // dispatch(HYDRATE_RESULT)는 동기적이므로 router.push 이전에 state 업데이트가 완료된다.
    // diagnosis-session이 mount될 때 state.result가 이미 hydrate된 상태임이 보장된다.
    hydrateResult(latestAttempt.result);

    router.push({
      pathname: '/quiz/exam/diagnosis-session',
      params: {
        examId: latestAttempt.examId,
        wrongProblemNumbers: JSON.stringify(queue),
        startIndex: '0',
        totalNotes: String(latestAttempt.wrongProblemNumbers.length),
        diagnosedCountBefore: String(analysisState.diagnosedNotes.length),
      },
    });
  }, [latestAttempt, analysisState, hydrateResult]);
```

변경 요점:
- `startIndex` 계산 로직 제거 → 항상 `'0'` (큐가 첫 미진단 문제부터 시작).
- `wrongProblemNumbers`를 큐로 교체 (전체 → 미진단만).
- `totalNotes`는 그대로 전체 오답 수 (미니카드 "X / 5" 카운터용).
- `diagnosedCountBefore`는 이미 진단된 개수 (`diagnosedNotes.length`).
- 기존 주석 `// diagnosedNotes.length를 startIndex로 사용하는 것은 ... findIndex 방식으로 교체 필요.` 제거.
- 빈 큐 방어 (`queue.length === 0`) 추가 — 정상 경로에서는 도달 불가하지만 안전 가드.

- [ ] **Step 3: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit`

Expected: 에러 없음.

- [ ] **Step 4: 전체 단위 테스트 회귀 확인**

Run: `npm test`

Expected: 모든 테스트 통과 (Task 1에서 추가한 5개 + 기존 테스트). 회귀 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "fix(quiz): onResumeAnalysis 큐 방식으로 통일

비순차 진단 케이스에서 일부 문제가 누락되거나, 끝까지 풀어도
리포트가 안 뜨던 버그 수정.

- startIndex 가정 제거 → wrongProblemNumbers 자체를 미진단 큐로 전달
- onAnalyzeProblem(buildDiagnosisQueue)와 동일한 멘탈 모델로 통일"
```

---

### Task 4: 수동 검증

**Files:** 없음 (런타임 검증).

- [ ] **Step 1: 개발 빌드 실행**

Run: `npx expo run:ios`

Expected: 시뮬레이터에서 앱 실행.

- [ ] **Step 2: 시나리오 A — 비순차 진단 (이번 버그 케이스)**

1. 모의고사 응시 (오답 5개 이상 나오는 시험 선택). 이미 응시한 시험 회차가 있다면 그 결과 화면으로 진입.
2. 결과 화면에서 **점수 가장 높은 타일(번호 중간)** 을 클릭 → 진단 세션 진입.
3. 첫 문제 진단 완료 → 미니카드 등장.
4. 미니카드의 **"잠시 쉬기"** 누름 → 퀴즈 탭 홈으로 이동.
5. 홈 화면에 "이어서 분석하기" 카드 노출 확인.
6. 카드 누름 → 진단 세션 재진입.
7. **확인:** 첫 화면이 **번호상 가장 작은 미진단 문제** 인지 확인 (점수 높은 순으로 클릭했던 문제는 노출 안 됨).
8. 남은 문제를 모두 진단 → 마지막 문제 미니카드의 "리포트 보기 →" 누름.
9. **확인:** 리포트 화면(`/quiz/result`)이 자동으로 노출되는지 확인.

Expected: 누락 없이 4개 노출 → 모두 진단 → 리포트 자동 진입.

- [ ] **Step 3: 시나리오 B — 순차 진단 회귀 확인**

1. 새 모의고사 응시 또는 다른 회차 결과 화면 진입.
2. 결과 화면에서 **번호 가장 작은 문제부터** 차례로 클릭 → 1~2개 진단 후 잠시 쉬기.
3. 홈 → 이어서 분석하기 → 남은 문제가 정상 노출되는지 확인.
4. 마지막 문제까지 진단 → 리포트 진입 확인.

Expected: 기존 동작과 동일 (회귀 없음).

- [ ] **Step 4: 시나리오 C — 여러 번 잠시 쉬기**

1. 진단 → 잠시 쉬기 → 재개 → 진단 → 잠시 쉬기 → 재개 → 끝까지.
2. 매 재개마다 미진단 문제만 순서대로 노출되는지 확인.

Expected: 중복 진단 강요 없음, 누락 없음, 마지막에 리포트 진입.

- [ ] **Step 5: 검증 완료 보고**

수동 검증 결과를 사용자에게 보고하고, 회귀나 누락이 없으면 PR 작성 단계로 진행.

---

## Self-Review Notes

- **Spec 커버리지**: spec의 Goal/Background/Approach/Verification 모든 항목이 Task 1~4로 커버됨.
- **Placeholder 없음**: 모든 step에 실제 코드/명령/검증 항목 포함.
- **Type 일관성**: `DiagnosedNote`는 `exam-analysis-in-progress.ts`에서 export된 기존 타입 사용. `buildResumeAnalysisQueue` 시그니처가 Task 1 테스트와 Task 2 구현, Task 3 호출부에서 모두 일치.
- **DRY**: 큐 빌드 로직은 단일 함수로 분리 (테스트 가능 + 호출부 명확).
- **YAGNI**: 결과 화면 정렬 변경, `latest-exam-attempt-store` 스키마 변경 등은 spec out-of-scope에 따라 plan 포함 안 함.
- **TDD**: Task 1 (red) → Task 2 (green) → Task 3 (integration). 커밋 단위 명확.
