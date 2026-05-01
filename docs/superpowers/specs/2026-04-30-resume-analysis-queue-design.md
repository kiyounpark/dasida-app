# Resume Analysis Queue — Design Spec

**Date:** 2026-04-30
**Status:** Approved

## Goal

홈 화면 "이어서 분석하기"(`onResumeAnalysis`) 진입 시, **이미 진단된 문제는 건너뛰고 미진단 문제만 순서대로 풀게** 한다. 비순차로 진단된 케이스에서도 (1) 미진단 문제가 누락되거나 (2) 이미 진단한 문제를 다시 풀게 되거나 (3) 끝까지 풀어도 리포트가 안 뜨는 현상이 사라져야 한다.

## Background

### 깨진 시나리오

오답 5개 `[10, 15, 20, 25, 30]`이 있을 때:

1. 사용자가 결과 화면에서 **25번 타일을 먼저 클릭**해 진단 (점수 높은 순 정렬 때문에 자연스러운 행동).
2. 25번 진단 완료 → 미니카드에서 "잠시 쉬기" → 홈.
3. 홈에서 "이어서 분석하기" 클릭.
4. **현재 동작**: 15번부터 시작 (10번이 영원히 누락).
5. 30번까지 끝낸 뒤 "리포트 보기" → 결과 화면이 `diagnosedCount(4) < wrongCount(5)`로 판단 → 리포트로 자동 이동하지 않음.

### 근본 원인

`features/quiz/hooks/use-quiz-hub-screen.ts`의 `onResumeAnalysis`(line 197~218)는 **순차 진단 가정** 위에 동작한다:

```javascript
// 비순차 완료가 가능해지면 findIndex 방식으로 교체 필요.
const startIndex = analysisState.isInProgress ? analysisState.diagnosedNotes.length : 0;
```

전체 `wrongProblemNumbers`를 그대로 넘기고 `startIndex`만 "지금까지 진단된 개수"로 잡는다. 그러나 결과 화면 타일 클릭(`onAnalyzeProblem`)은 이미 `buildDiagnosisQueue`로 **클릭한 문제를 큐 첫 자리**에 두는 비순차 진단을 허용한다. 두 진입점이 서로 다른 데이터 모델을 가정해 충돌한다.

### 왜 큐 방식인가

같은 진단 세션을 부르는 두 진입점이 **하나의 멘탈 모델**을 공유하는 게 코드 일관성과 견고성 모두에 유리하다.

| 진입점 | 현재 방식 | 통일 후 |
|--------|-----------|---------|
| `onAnalyzeProblem` (결과 화면 타일) | 큐 (`buildDiagnosisQueue`) | 큐 (그대로) |
| `onResumeAnalysis` (홈 재개) | 인덱스 (`startIndex`) | **큐로 통일** |

`findIndex`로 `startIndex`만 보정하는 안도 검토했으나, 이미 진단된 문제가 큐 중간에 남아 있어 **중복 진단을 강요**하는 잔존 결함이 있다. 큐 방식은 미진단 문제만 세션에 노출되므로 이 결함이 원천 차단된다.

## Approach: Pass Undiagnosed-Only Queue

### `onResumeAnalysis` 동작 변경

`features/quiz/hooks/use-quiz-hub-screen.ts`의 `onResumeAnalysis`는 다음과 같이 동작한다.

1. `latestAttempt.wrongProblemNumbers`(전체 오답)에서 **미진단 문제만 필터링**하여 큐를 만든다.
2. 큐가 비어 있으면 (= 모두 진단됨) 조기 반환. 정상 경로에서는 `computeAnalysisInProgressState`가 이미 `isInProgress: false`를 반환해 카드 자체가 노출되지 않으므로 방어 코드.
3. `hydrateResult(latestAttempt.result)` 호출 (기존 동작 유지).
4. `router.push('/quiz/exam/diagnosis-session', { wrongProblemNumbers: queue, startIndex: '0', totalNotes, diagnosedCountBefore })`.

```typescript
const onResumeAnalysis = useCallback(() => {
  if (!latestAttempt || !latestAttempt.result) return;
  if (!analysisState.isInProgress) return;

  // 미진단 문제만 원래 번호 순서대로 추린다.
  const diagnosedSet = new Set(
    analysisState.diagnosedNotes.map((n) => n.problemNumber),
  );
  const queue = latestAttempt.wrongProblemNumbers.filter(
    (n) => !diagnosedSet.has(n),
  );
  if (queue.length === 0) return;

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

### `buildDiagnosisQueue`와의 관계

`onAnalyzeProblem`은 "클릭한 문제를 큐 첫 자리에 둔다"는 추가 의미가 있어 `buildDiagnosisQueue`를 그대로 사용한다. `onResumeAnalysis`는 "원래 번호 순서를 그대로 유지"가 맞으므로 별도 필터링이 자연스럽다. 두 함수를 억지로 통합하지 않는다.

### 다운스트림 영향

다운스트림(`exam-diagnosis-session-screen.tsx`, `use-exam-diagnosis.ts`)은 변경 불필요하다. 이미 `wrongProblemNumbers`(부분 큐), `startIndex`, `totalNotes`, `diagnosedCountBefore`의 4-튜플을 받아 동작하도록 설계되어 있다(`onAnalyzeProblem` 경로가 그렇게 동작 중).

미니카드의 "X / Y" 카운터는 `currentNoteCountBeforeThis = diagnosedCountBefore + diagnosedIndices.length`로 계산되어 전체 진단 카운트(예: 3/5 → 4/5 → 5/5)를 정확히 표시한다.

마지막 문제가 끝나면 `getNextProblemNumber(lastIndex) === null` → `navigateBackToExamResult(isResumed)` → 결과 화면 → `diagnosedCount === wrongCount` → 리포트 자동 이동.

## Scope

**변경 파일**

- `features/quiz/hooks/use-quiz-hub-screen.ts` — `onResumeAnalysis` 큐 방식으로 교체. 기존 `// 비순차 완료가 가능해지면 findIndex 방식으로 교체 필요.` 주석은 삭제.

**테스트 신규/갱신**

- `features/quiz/hooks/__tests__/use-quiz-hub-screen.test.ts` (없으면 신규) — `onResumeAnalysis`가 다음 시나리오에서 올바른 큐를 만드는지 검증:
  - 비순차 진단(`{25}` 만 진단됨) → 큐 = `[10, 15, 20, 30]`, `startIndex = 0`
  - 순차 진단(`{10, 15}` 진단됨) → 큐 = `[20, 25, 30]`, `startIndex = 0`
  - 모두 진단됨 → `router.push` 호출 안 됨 (방어)
- 통합 테스트 후보(선택): 비순차 진단 + 잠시 쉬기 + 재개 + 모두 완료 → 리포트 진입까지 시뮬레이션. RN navigation을 mock해야 해서 비용 대비 가치는 낮음. 단위 테스트로 커버하고 수동 검증으로 보완.

## Out of Scope

- 결과 화면 정렬 변경(점수 순 → 번호 순) — UX 가치(킬러문항 우선 학습)를 잃기 때문에 채택하지 않음. 큐 방식 수정만으로 충분.
- `onAnalyzeProblem`(결과 화면 타일 클릭) 동작 — 이미 큐 방식이므로 변경 불필요.
- `buildDiagnosisQueue` 내부 동작 — 클릭 문제를 첫 자리로 옮기는 의미 그대로 유지.
- `latest-exam-attempt-store` 스키마 변경 — `wrongProblemNumbers` 그대로 전체 보관, 필터링은 호출 측에서.

## Verification

**자동**

- `npm test -- features/quiz/hooks/__tests__/use-quiz-hub-screen.test.ts` 통과.
- 회귀: 기존 `exam-analysis-in-progress.test.ts`, `latest-exam-attempt-store.test.ts` 통과 유지.

**수동**

오답 5개 모의고사 응시 후:

1. **순차 진단 시나리오** — 결과 화면에서 가장 왼쪽 타일부터 클릭 → 1개 진단 → 잠시 쉬기 → 홈 → 이어서 분석하기 → 남은 4개가 번호 순서대로 노출되는지 확인. 마지막 완료 시 리포트 자동 진입.
2. **비순차 진단 시나리오 (이번 버그 케이스)** — 결과 화면에서 점수 가장 높은 타일(번호상 중간) 클릭 → 1개 진단 → 잠시 쉬기 → 홈 → 이어서 분석하기 → **누락 없이 미진단 4개가 번호 순서대로** 노출되는지 확인. 이미 푼 문제가 다시 안 나오는지 확인. 마지막 완료 시 리포트 자동 진입.
3. **여러 번 비순차 진단** — 25 → 30 → 잠시 쉬기 → 재개 → 10, 15, 20만 노출되는지 확인.
4. **모두 진단 후 잠시 쉬기 (마지막 미니카드 케이스)** — 마지막 문제 미니카드에서 "잠시 쉬기" → 홈에 이어서 분석하기 카드가 **노출되지 않음**(`computeAnalysisInProgressState`의 기존 가드). 사용자가 리포트로 가는 별도 경로는 이번 작업 범위 밖(별도 이슈로 추적).
