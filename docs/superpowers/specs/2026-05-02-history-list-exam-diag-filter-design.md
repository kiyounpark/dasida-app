# History List — Filter Out Per-Problem Diagnosis Attempts (Hotfix)

**Date:** 2026-05-02
**Status:** Approved
**Type:** Regression hotfix

## Goal

기록 탭의 "분석중" 라벨이 1문제 진단 후 "잠시 쉬기"로 나간 경우에 표시되지 않는 회귀를 수정한다. 현재는 진단 1문제 완료 시점에 별도로 생성되는 per-problem `LearningAttempt` 레코드가 `recentExamAttempts` 목록 맨 앞에 오면서 `latestAttemptId` 매칭이 깨지고, `analysisState.isInProgress`가 `false`로 계산된다.

## Background

### 회귀 발생 경위

이번 PR에서 `analysisState` 계산 출처를 폰 메모(AsyncStorage) → 서버 `listAttemptResults`로 교체했다(commit `e4079e0`). 서버 데이터는 다기기 정합성을 위한 source of truth지만, 동시에 **per-problem 진단 attempt가 같은 `source: 'featured-exam'`으로 섞여 있다**는 사실이 드러났다. 폰 메모 출처일 때는 attempt 매칭이 아니라 로컬 `exam-diagnosis-progress` 키만 봤으므로 이 폴루션이 보이지 않았다.

### 데이터 모델

`features/quiz/exam/build-exam-diagnosis-attempt-input.ts`의 `buildExamDiagnosisAttemptInput`은 약점 선택 시점에 호출되며, 다음 형태의 attempt를 만든다.

```ts
{
  attemptId: `exam-diag-${examId}-p${problemNumber}-${ts}`,  // ← 매번 새 ID
  source: 'featured-exam',                                    // ← 회차 attempt와 동일
  questionCount: 1,
  wrongCount: 1,
  primaryWeaknessId: weaknessId,
  topWeaknesses: [weaknessId],
  questions: [{ selectedIndex: null, isCorrect: false, ... }],
}
```

`use-exam-diagnosis.ts:362-376`에서 약점 선택 직후에 매번 호출된다. 이번 PR에서 sync point #1~#4를 추가한 뒤로는 이 per-problem POST가 **완전히 중복**이지만(전체 attempt 상태가 sync point에서 매번 갱신되므로), 제거는 약점 집계(`weakness-severity`, `weakness-appearances`, 홈 약점 카드)에 영향이 가서 별도 spec에서 다룬다.

### 현재 흐름의 깨진 지점

`features/history/hooks/use-history-screen.ts:42`의 `loadAttempts`:

```ts
const attempts = await loadRecentAttempts({
  source: 'featured-exam',
  limit: 5,
});
setRecentExamAttempts(attempts);
```

5개 한도 안에 per-problem attempt들이 먼저 차서, 진짜 회차 attempt가 잘릴 수 있다. 더 치명적으로 `recentExamAttempts[0]`이 per-problem이 되면:

1. `latestAttemptId = recentExamAttempts[0].id` = per-problem ID
2. `loadAttemptResults(latestAttemptId)`가 per-problem의 1문항 result만 반환
3. `wrongResults = results.filter((r) => !r.isCorrect && r.selectedIndex !== null)` → per-problem result는 `selectedIndex: null` 이므로 빈 배열
4. `wrongProblemNumbers.length === 0` → `computeAnalysisInProgressState`가 `{isInProgress: false}` 반환
5. 라벨 분기에서 `attempt.primaryWeaknessId !== null` 통과 → status `'completed'`, 라벨 "분석 완료"

→ 사용자는 "분석중 1/N"을 기대했는데 "분석 완료"가 표시된다.

## Approach

`recentExamAttempts`에서 per-problem attempt를 prefix 기반으로 필터링한다. 수정 단위는 클라이언트 1곳, 영향 범위는 기록 탭 한정.

### 필터 위치 — 클라이언트 한정

`features/history/hooks/use-history-screen.ts`의 `loadAttempts` 안에서 필터.

검토한 다른 위치:

- **`current-learner-controller.ts`의 `loadRecentAttempts`** — 다른 호출자(있을 수 있음)에 영향. 이번 폴루션은 "기록 탭 회차 목록" 시맨틱 한정이라 부적합.
- **서버 함수 (Cloud Function)** — 가장 정확하나 변경 단위 큼, 배포 리스크. 후속 Option B에서 per-problem POST 자체를 제거하므로 서버 측 필터는 불필요해짐.

### 필터 기준 — Prefix 매칭

`buildExamDiagnosisAttemptInput`의 `createAttemptId`가 `exam-diag-` prefix를 하드코딩하고 있다. 이를 export 상수로 빼서 history 쪽에서 import해 쓴다.

```ts
// features/quiz/exam/build-exam-diagnosis-attempt-input.ts
export const EXAM_DIAG_ATTEMPT_PREFIX = 'exam-diag-';

function createAttemptId(examId: string, problemNumber: number) {
  return `${EXAM_DIAG_ATTEMPT_PREFIX}${examId}-p${problemNumber}-${Date.now().toString(36)}`;
}
```

```ts
// features/history/hooks/use-history-screen.ts
import { EXAM_DIAG_ATTEMPT_PREFIX } from '@/features/quiz/exam/build-exam-diagnosis-attempt-input';
// ...
const examOnly = attempts
  .filter((a) => !a.id.startsWith(EXAM_DIAG_ATTEMPT_PREFIX))
  .slice(0, 5);
setRecentExamAttempts(examOnly);
```

대안 검토:

- `questionCount === 1` — 1문항 모의고사가 추가될 가능성이 0%가 아님. 시맨틱 어긋남.
- 신규 metadata 필드 — 데이터 모델 변경. 후속 Option B로 prefix 자체가 사라질 예정이라 과한 투자.

→ prefix 상수 import가 1:1 매칭 + 단일 source로 가장 정확.

### Fetch limit 조정

현재 `limit: 5`. per-problem이 회차당 최대 30문항(모의고사 회차당 문항 수 상한 가정), 사용자 회차 5개 = 최악 155 + 회차 5 = 160 attempt. 5 한도로는 진짜 회차가 잘림.

`limit: 200`으로 올리고 필터 후 `slice(0, 5)`. 200을 선택한 이유:

- 최악 160 + 안전 여유 = 200
- attempt 메타만 fetch하므로 payload 가벼움
- Firestore read 비용 200 doc = 무시 가능

### 회귀 테스트

`features/history/hooks/__tests__/use-history-screen.test.ts`에 두 케이스 추가:

1. **혼합 응답** — per-problem 5개 + 회차 1개 mock 응답 → 필터 후 회차 1개만 남고 `latestAttemptId`가 회차 ID로 잡히는지
2. **포화 케이스** — per-problem 100개 + 회차 1개 → 회차가 200 한도 안에 포함되는지, 필터 후 정상 처리되는지

기존 `onPressExamHistoryItem` 테스트는 그대로 유지.

## Scope

### 변경 파일

- **`features/quiz/exam/build-exam-diagnosis-attempt-input.ts`** — `EXAM_DIAG_ATTEMPT_PREFIX` 상수 export, `createAttemptId`가 이를 사용하도록 변경
- **`features/history/hooks/use-history-screen.ts`** — `loadAttempts`에서 prefix 필터 + `limit: 200` + `slice(0, 5)`
- **`features/history/hooks/__tests__/use-history-screen.test.ts`** — 회귀 테스트 2개 추가

### 변경하지 않는 것

- per-problem `recordAttempt` 호출 자체는 유지 (Option B에서 다룸)
- 약점 집계 로직 (Option B에서 영향 분석 후 결정)
- 서버(Cloud Function) 변경 없음
- 다른 sync point 로직 변경 없음

## Out of Scope (Follow-up)

### Option B — per-problem `recordAttempt` 완전 제거

`features/quiz/exam/hooks/use-exam-diagnosis.ts:362-376`의 `recordAttempt(buildExamDiagnosisAttemptInput(...))` 제거. 이번 PR의 sync point #1~#4가 이미 전체 attempt 상태를 갱신하므로 중복.

선결 조건 (별도 spec 필요):

- `weakness-severity.ts`, `weakness-appearances.ts`, `home-state.ts:243`에서 `topWeaknesses` 카운트가 어떻게 변하는지 분석
- 홈 화면 약점 카드/섹션 사용자 가시 수치 변화 시뮬레이션 (현재는 동일 약점 N문제 진단 시 N+1번 카운트 → 정상화 시 1번)
- 마이그레이션 정책: 기존 폴루션 데이터를 서버에서 정리할지, 클라이언트 필터(이번 PR)로 영구 가림처리할지

이번 hotfix는 표시 문제만 빠르게 잠그고, 데이터 모델 정리는 별도 단계로 넘긴다.

## Testing Plan

### 자동화

- `npm test -- use-history-screen.test.ts` — 회귀 테스트 2개 통과
- `npx tsc --noEmit` — 타입 에러 0
- 기존 135개 테스트 영향 없음 확인

### 수동

이번 회귀를 발견한 시나리오를 그대로 재현:

1. iPad 시뮬레이터에서 모의고사 응시 → 채점 결과 → 진단 세션 진입
2. 1문제 약점 선택 → 미니카드 → "잠시 쉬기" 탭
3. 홈탭으로 이동됨 → 기록 탭 이동
4. **기대**: 해당 회차 항목에 "진행 중 1/N" 라벨 + chevron `›` 표시, 탭 가능
5. **기대**: 항목 탭 시 결과 화면으로 이동, 진단 1문제 완료 표시

같은 사용자가 두 기기에서 동시에 같은 회차에 진단을 진행하지 않는 한 (last-write-wins 정책) 회귀 없음.
