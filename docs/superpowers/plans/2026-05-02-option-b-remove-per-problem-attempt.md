# Option B — per-problem attempt 제거 + Legacy 필터 중앙화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** per-problem 진단 attempt의 redundant `recordAttempt` 호출을 제거하고, 이미 쌓인 legacy `exam-diag-*` 레코드를 controller 레이어 중앙 필터로 차폐해 hotfix의 임시 코드(`limit: 200`, 화면 단위 client filter)를 정리한다.

**Architecture:** 4단계 순차 commit으로 codebase가 매 단계 working state에 머무른다. (1) 새 위치에 필터 함수 + 4 테스트 → (2) controller 두 call site에 필터 적용(이때 hotfix 화면 필터와 이중 보호) → (3) hotfix 임시 코드 정리(controller 필터로 이양 완료) → (4) per-problem `recordAttempt` 제거(새 pollution 차단). 각 단계 후 typecheck + 관련 테스트로 검증.

**Tech Stack:** TypeScript, React Native (hooks), Jest. 신규 의존성 없음.

---

## File Structure

| 파일 | 역할 | 변경 종류 |
|---|---|---|
| `features/learner/filter-legacy-per-problem-attempts.ts` | `featured-exam` 쿼리 결과에서 `exam-diag-` prefix 레코드 제외하는 순수 함수. `take` 파라미터 없음(호출자가 limit 책임) | create |
| `features/learner/__tests__/filter-legacy-per-problem-attempts.test.ts` | 위 함수의 prefix 필터 회귀 테스트 4개 | create |
| `features/learner/current-learner-controller.ts` | home state build (line 259-262) + `loadRecentAttempts` (line 401-403) 두 곳에 필터 적용 | modify |
| `features/history/hooks/use-history-screen.ts` | hotfix 임시 코드 정리: `limit: 200` → 5, `filterRecentExamAttempts` import 제거, 임시 경고 주석 제거 | modify |
| `features/history/hooks/filter-recent-exam-attempts.ts` | hotfix 잔재. controller 필터로 이양됨 | delete |
| `features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts` | 위 파일과 함께 삭제 (테스트는 Task 1의 신규 위치에서 단순화하여 재구성) | delete |
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | per-problem `recordAttempt` 호출 제거 (line 363-377) + `attemptRecordedRef` 제거 + import/destructure/dep 정리 | modify |
| `features/quiz/exam/build-exam-diagnosis-attempt-input.ts` | 함수에 `@deprecated` JSDoc 주석 추가 (사용처 0이지만 retain) | modify |

---

## Task 1: Legacy 필터 함수 신규 (TDD)

**Files:**
- Create: `features/learner/filter-legacy-per-problem-attempts.ts`
- Create: `features/learner/__tests__/filter-legacy-per-problem-attempts.test.ts`

**컨텍스트:** hotfix의 `filterRecentExamAttempts(attempts, take)`는 화면 단위 도구였고 `take` 파라미터로 slice까지 했다. 새 함수는 controller에서 쓰이며 limit는 호출자(repository)가 책임지므로 prefix 필터만 남긴다. 위치도 `features/history/hooks/`에서 `features/learner/`로 이동(소비처 두 곳이 모두 controller 레이어).

- [ ] **Step 1: 실패 테스트 작성**

`features/learner/__tests__/filter-legacy-per-problem-attempts.test.ts` 신규 파일:

```ts
import type { LearningAttempt } from '@/features/learning/types';

import { filterLegacyPerProblemAttempts } from '../filter-legacy-per-problem-attempts';

function makeAttempt(id: string, completedAt: string): LearningAttempt {
  return {
    id,
    accountKey: 'a1',
    learnerId: 'l1',
    source: 'featured-exam',
    sourceEntityId: 'exam-1',
    gradeSnapshot: 'g3',
    startedAt: completedAt,
    completedAt,
    questionCount: 1,
    correctCount: 0,
    wrongCount: 1,
    accuracy: 0,
    primaryWeaknessId: null,
    topWeaknesses: [],
  } as unknown as LearningAttempt;
}

describe('filterLegacyPerProblemAttempts', () => {
  it('removes per-problem diagnosis attempts (exam-diag- prefix)', () => {
    const attempts = [
      makeAttempt('exam-diag-exam-1-p3-aaa', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z'),
    ];

    const result = filterLegacyPerProblemAttempts(attempts);

    expect(result.map((a) => a.id)).toEqual(['exam-attempt-1']);
  });

  it('preserves order of remaining attempts', () => {
    const attempts = [
      makeAttempt('exam-attempt-3', '2026-05-02T12:00:00.000Z'),
      makeAttempt('exam-diag-exam-1-p3-aaa', '2026-05-02T11:00:00.000Z'),
      makeAttempt('exam-attempt-2', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z'),
    ];

    const result = filterLegacyPerProblemAttempts(attempts);

    expect(result.map((a) => a.id)).toEqual([
      'exam-attempt-3',
      'exam-attempt-2',
      'exam-attempt-1',
    ]);
  });

  it('returns empty when input is empty', () => {
    expect(filterLegacyPerProblemAttempts([])).toEqual([]);
  });

  it('returns empty when all are per-problem attempts', () => {
    const attempts = [
      makeAttempt('exam-diag-exam-1-p1-aaa', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-diag-exam-1-p2-bbb', '2026-05-02T11:00:00.000Z'),
    ];

    expect(filterLegacyPerProblemAttempts(attempts)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --testPathPattern=filter-legacy-per-problem-attempts`
Expected: FAIL — `Cannot find module '../filter-legacy-per-problem-attempts'`

- [ ] **Step 3: 구현 작성**

`features/learner/filter-legacy-per-problem-attempts.ts` 신규 파일:

```ts
import type { LearningAttempt } from '@/features/learning/types';
import { EXAM_DIAG_ATTEMPT_PREFIX } from '@/features/quiz/exam/build-exam-diagnosis-attempt-input';

/**
 * `featured-exam` source 쿼리 결과에서 legacy per-problem 진단 attempt
 * (`exam-diag-` prefix)를 제외한다.
 *
 * 2026-05-02 이전 코드가 약점 선택 시 redundant per-problem record를 생성했고,
 * 이미 쌓인 데이터는 client에서 영구 차폐한다. 새 record는 더 이상 생성되지 않는다
 * (Option B에서 `recordAttempt` 호출 제거).
 *
 * 입력 순서를 그대로 유지하며 limit/slice는 호출자가 책임진다.
 */
export function filterLegacyPerProblemAttempts(
  attempts: LearningAttempt[],
): LearningAttempt[] {
  return attempts.filter((a) => !a.id.startsWith(EXAM_DIAG_ATTEMPT_PREFIX));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --testPathPattern=filter-legacy-per-problem-attempts`
Expected: 4 passed

- [ ] **Step 5: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 6: Commit**

```bash
git add features/learner/filter-legacy-per-problem-attempts.ts \
        features/learner/__tests__/filter-legacy-per-problem-attempts.test.ts
git commit -m "$(cat <<'EOF'
feat(learner): legacy per-problem attempt 제외 필터 신규

`featured-exam` source 쿼리 결과에서 `exam-diag-` prefix 레코드를
제외하는 순수 함수 + 회귀 테스트 4개. controller 레이어에서 곧 사용.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Controller에 필터 적용

**Files:**
- Modify: `features/learner/current-learner-controller.ts:251-262, 401-403`

**컨텍스트:** `featured-exam` source로 데이터를 가져오는 두 call site에 Task 1의 필터를 적용한다. 이 시점에 hotfix의 화면 단위 필터(`use-history-screen.ts`)도 그대로 살아있어 이중 보호 상태(다음 Task 3에서 화면 필터 제거).

- [ ] **Step 1: import 추가**

`features/learner/current-learner-controller.ts` 상단 import 블록에 추가 (기존 local import `import { buildProfileForPendingResume } from './learner-profile-builders';` 바로 위 또는 아래):

```ts
import { filterLegacyPerProblemAttempts } from './filter-legacy-per-problem-attempts';
```

- [ ] **Step 2: home state build call site 수정**

`features/learner/current-learner-controller.ts:248-263` 의 `Promise.all` 블록을 다음과 같이 수정:

기존 (라인 248-263):

```ts
    const [peerPresence, reviewTasks, recentReviewAttempts, diagnosticAttempts, examAttempts] = await Promise.all([
      peerPresenceStore.load(),
      reviewTaskStore.load(params.session.accountKey),
      learningHistoryRepository.listAttempts(params.session.accountKey, {
        source: 'weakness-practice',
        limit: 20,
      }),
      learningHistoryRepository.listAttempts(params.session.accountKey, {
        source: 'diagnostic',
        limit: 10,
      }),
      learningHistoryRepository.listAttempts(params.session.accountKey, {
        source: 'featured-exam',
        limit: 10,
      }),
    ]);
```

다음으로 교체:

```ts
    const [peerPresence, reviewTasks, recentReviewAttempts, diagnosticAttempts, examAttempts] = await Promise.all([
      peerPresenceStore.load(),
      reviewTaskStore.load(params.session.accountKey),
      learningHistoryRepository.listAttempts(params.session.accountKey, {
        source: 'weakness-practice',
        limit: 20,
      }),
      learningHistoryRepository.listAttempts(params.session.accountKey, {
        source: 'diagnostic',
        limit: 10,
      }),
      learningHistoryRepository
        .listAttempts(params.session.accountKey, {
          source: 'featured-exam',
          limit: 10,
        })
        .then(filterLegacyPerProblemAttempts),
    ]);
```

(diagnostic, weakness-practice는 그대로 — featured-exam 한 줄에만 `.then(filterLegacyPerProblemAttempts)` 추가)

- [ ] **Step 3: loadRecentAttempts call site 수정**

`features/learner/current-learner-controller.ts:401-404` 를 다음과 같이 수정:

기존:

```ts
    loadRecentAttempts: async (options) => {
      const { session } = await readAccessibleSnapshot();
      return learningHistoryRepository.listAttempts(session.accountKey, options);
    },
```

다음으로 교체:

```ts
    loadRecentAttempts: async (options) => {
      const { session } = await readAccessibleSnapshot();
      const attempts = await learningHistoryRepository.listAttempts(session.accountKey, options);
      // featured-exam 쿼리에는 legacy per-problem 진단 attempt(`exam-diag-` prefix)가 섞여
      // 들어올 수 있어 클라이언트에서 차폐. 신규 record는 생성되지 않지만 기존 누적 데이터를 처리.
      if (options?.source === 'featured-exam') {
        return filterLegacyPerProblemAttempts(attempts);
      }
      return attempts;
    },
```

- [ ] **Step 4: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 5: 기존 테스트 영향 없음 확인**

Run: `npm test -- --testPathPattern=use-history-screen`
Expected: 모든 테스트 통과 (hotfix 화면 필터가 아직 살아있어 행동 동일)

Run: `npm test`
Expected: 전체 통과

- [ ] **Step 6: Commit**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "$(cat <<'EOF'
feat(learner): controller 두 call site에 legacy per-problem 필터 적용

home state build(line 259-262) + loadRecentAttempts(line 401-403)에서
featured-exam 쿼리 결과를 filterLegacyPerProblemAttempts로 통과시킨다.
약점 집계(severity, appearances)와 약점 상세 화면도 같은 controller를
거치므로 자동 보호. hotfix 화면 단위 필터는 다음 커밋에서 정리.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Hotfix 임시 코드 정리 + 옛 파일 삭제

**Files:**
- Modify: `features/history/hooks/use-history-screen.ts:18, 50-65`
- Delete: `features/history/hooks/filter-recent-exam-attempts.ts`
- Delete: `features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts`

**컨텍스트:** Task 2에서 controller 필터가 적용되었으므로 화면 단위 필터는 더 불필요. `limit: 200`도 5로 복원(controller가 깨끗한 데이터를 주므로 5만 받아도 회차 attempt가 잘리지 않음).

- [ ] **Step 1: use-history-screen.ts import 제거**

`features/history/hooks/use-history-screen.ts:18` 의 다음 라인 삭제:

```ts
import { filterRecentExamAttempts } from './filter-recent-exam-attempts';
```

- [ ] **Step 2: loadAttempts 본문 정리**

`features/history/hooks/use-history-screen.ts` 의 `loadAttempts` 콜백 안 try 블록 (현재 라인 51-65 부근)을 다음과 같이 수정:

기존:

```ts
    setIsLoadingAttempts(true);
    try {
      // per-problem 진단 attempt(`exam-diag-` prefix)가 같은 source로 섞여 있어
      // 5 한도로는 회차 attempt가 잘릴 수 있다. 넉넉히 200까지 fetch한 뒤
      // filterRecentExamAttempts에서 prefix 제외 + 5개로 자른다.
      // ⚠ 임시 상한: per-problem attempt가 누적 200개를 초과하면 동일 회귀 재발 가능.
      // 근본 수정은 source를 'featured-exam-diagnosis'로 분리해야 한다 (Option B).
      const attempts = await loadRecentAttempts({
        source: 'featured-exam',
        limit: 200,
      });
      if (!isMountedRef.current) return;
      setRecentExamAttempts(filterRecentExamAttempts(attempts, 5));
    } catch {
```

다음으로 교체:

```ts
    setIsLoadingAttempts(true);
    try {
      const attempts = await loadRecentAttempts({
        source: 'featured-exam',
        limit: 5,
      });
      if (!isMountedRef.current) return;
      setRecentExamAttempts(attempts);
    } catch {
```

- [ ] **Step 3: 옛 파일 삭제**

```bash
git rm features/history/hooks/filter-recent-exam-attempts.ts \
       features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts
```

- [ ] **Step 4: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 5: use-history-screen 테스트 통과 확인**

Run: `npm test -- --testPathPattern=use-history-screen`
Expected: 모든 테스트 통과

- [ ] **Step 6: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 전체 통과 (Task 1의 신규 4 테스트 추가, hotfix의 6 테스트 삭제)

- [ ] **Step 7: Commit**

```bash
git add features/history/hooks/use-history-screen.ts \
        features/history/hooks/filter-recent-exam-attempts.ts \
        features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts
git commit -m "$(cat <<'EOF'
refactor(history): hotfix 화면 단위 필터 제거, controller 필터로 이양

use-history-screen에서 limit:200 + filterRecentExamAttempts 임시 코드를
정리. controller 레이어에서 featured-exam 쿼리에 legacy 필터를 적용하므로
화면은 limit:5 단순 호출만으로 회귀 없이 동작.

옛 features/history/hooks/filter-recent-exam-attempts.ts와 테스트는
features/learner/filter-legacy-per-problem-attempts로 대체되어 삭제.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: per-problem `recordAttempt` 제거 + deprecated JSDoc

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts:27, 108, 174, 349-377, 436`
- Modify: `features/quiz/exam/build-exam-diagnosis-attempt-input.ts`

**컨텍스트:** sync point #1~#4가 회차 단위로 모든 진단 상태를 갱신하므로 per-problem `recordAttempt`는 redundant. 이 호출을 제거하면 새 `exam-diag-*` 레코드가 생성되지 않는다(기존 누적 데이터는 Task 2의 controller 필터로 차폐).

`buildExamDiagnosisAttemptInput` 함수와 `EXAM_DIAG_ATTEMPT_PREFIX` 상수는 유지(필터에서 prefix 상수 import 필요). 함수에는 deprecated JSDoc 추가.

- [ ] **Step 1: import 제거**

`features/quiz/exam/hooks/use-exam-diagnosis.ts:27` 의 다음 라인 삭제:

```ts
import { buildExamDiagnosisAttemptInput } from '../build-exam-diagnosis-attempt-input';
```

- [ ] **Step 2: destructure에서 recordAttempt 제거**

`features/quiz/exam/hooks/use-exam-diagnosis.ts:108` 을 다음과 같이 수정:

기존:

```ts
  const { session, profile, recordAttempt } = useCurrentLearner();
```

다음으로:

```ts
  const { session, profile } = useCurrentLearner();
```

- [ ] **Step 3: attemptRecordedRef 선언 제거**

`features/quiz/exam/hooks/use-exam-diagnosis.ts:174` 라인 삭제:

```ts
  const attemptRecordedRef = useRef(false); // recordAttempt 성공 여부 (비멱등, 재시도 skip)
```

(line 173의 `diagnosedRef`는 유지)

- [ ] **Step 4: recordAttempt 블록 제거 + 주석 정리**

`features/quiz/exam/hooks/use-exam-diagnosis.ts:349-377` 부근의 try 블록을 수정.

기존:

```ts
    // 순차 실행 + skip-if-done: recordAttempt는 비멱등 POST이므로 성공 후 재시도 금지.
    // markProblemDiagnosed(AsyncStorage)는 멱등이지만 동일하게 skip 처리.
    void (async () => {
      try {
        if (!diagnosedRef.current) {
          await markProblemDiagnosed(
            { examId, attemptId, attemptDateISO },
            problemNumber,
            weaknessId,
          );
          diagnosedRef.current = true;
        }

        if (!attemptRecordedRef.current) {
          await recordAttempt(
            buildExamDiagnosisAttemptInput({
              session,
              profile,
              examId,
              problemNumber,
              topic: problem?.topic ?? 'exam',
              methodId: draft.methodId,
              weaknessId,
              startedAt: startedAt.current,
              completedAt,
            }),
          );
          attemptRecordedRef.current = true;
        }

        if (!isMountedRef.current) return;
```

다음으로 교체:

```ts
    // markProblemDiagnosed(AsyncStorage)는 멱등이지만 skip-if-done으로 중복 호출 방지.
    // 회차 단위 attempt 상태는 sync point에서 갱신되므로 여기서 별도 recordAttempt 안 함.
    void (async () => {
      try {
        if (!diagnosedRef.current) {
          await markProblemDiagnosed(
            { examId, attemptId, attemptDateISO },
            problemNumber,
            weaknessId,
          );
          diagnosedRef.current = true;
        }

        if (!isMountedRef.current) return;
```

(retry 로직 `retryCountRef`, `setSaveError`는 그대로 유지 — markProblemDiagnosed의 이론적 실패에 대비)

- [ ] **Step 5: useCallback dep에서 recordAttempt 제거**

`features/quiz/exam/hooks/use-exam-diagnosis.ts:436` 부근의 useCallback deps 배열을 수정.

기존:

```ts
  }, [draft, isDone, session, profile, examId, problemNumber, problem, recordAttempt, attemptId, attemptDateISO, currentNoteCountBeforeThis, totalNotes, isLastProblem, methods, freezeAndAppend]);
```

다음으로:

```ts
  }, [draft, isDone, session, profile, examId, problemNumber, problem, attemptId, attemptDateISO, currentNoteCountBeforeThis, totalNotes, isLastProblem, methods, freezeAndAppend]);
```

(중간의 `recordAttempt` 한 토큰만 제거)

- [ ] **Step 6: buildExamDiagnosisAttemptInput에 deprecated JSDoc 추가**

`features/quiz/exam/build-exam-diagnosis-attempt-input.ts:13-23` 의 `export function buildExamDiagnosisAttemptInput(...)` 직전에 JSDoc 추가.

기존 (line 13 근처):

```ts
export function buildExamDiagnosisAttemptInput(params: {
```

다음으로 교체:

```ts
/**
 * @deprecated 2026-05-02부터 호출되지 않음. per-problem attempt 생성은
 * sync point #1~#4(회차 단위 갱신)와 redundant이므로 use-exam-diagnosis에서
 * 호출이 제거되었다. `EXAM_DIAG_ATTEMPT_PREFIX` 상수는 legacy 데이터 차폐
 * 필터(`features/learner/filter-legacy-per-problem-attempts.ts`)에서 사용 중.
 *
 * 함수 자체는 future re-introduction 또는 historical reference를 위해 retain.
 * 새 코드에서 호출하지 말 것.
 */
export function buildExamDiagnosisAttemptInput(params: {
```

(기존 매개변수/본문 라인은 변경 없음)

- [ ] **Step 7: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

(이 시점에 `recordAttempt`가 destructure에서 빠졌지만 useCurrentLearner는 여전히 그것을 노출하므로 unused warning 없음. `buildExamDiagnosisAttemptInput`은 사용처 0이지만 export되어 있어 unused warning 없음)

- [ ] **Step 8: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 전체 통과 (recordAttempt 직접 검증 케이스가 use-exam-diagnosis.test.ts에 없으므로 변경 없음)

- [ ] **Step 9: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts \
        features/quiz/exam/build-exam-diagnosis-attempt-input.ts
git commit -m "$(cat <<'EOF'
refactor(exam): per-problem recordAttempt 호출 제거

sync point #1~#4가 회차 단위로 진단 상태를 갱신하므로 per-problem
recordAttempt는 redundant. 호출 + attemptRecordedRef + 관련 import/dep을
정리. markProblemDiagnosed(AsyncStorage)는 그대로 유지.

buildExamDiagnosisAttemptInput는 사용처 0이지만 EXAM_DIAG_ATTEMPT_PREFIX
상수가 legacy 필터에서 쓰이므로 파일 retain. 함수에 @deprecated JSDoc 추가.

이로써 새 exam-diag-* record는 더 이상 생성되지 않는다.
기존 누적 데이터는 controller 필터(commit <Task 2 SHA>)가 차폐.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 최종 검증 + 수동 회귀 재현

**Files:** 없음 (검증 단계)

- [ ] **Step 1: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 2: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 3: 수동 회귀 재현 (이전 hotfix 시나리오)**

iPad 시뮬레이터에서:

1. 모의고사 응시 → 채점 결과 → 진단 세션 진입
2. **같은 약점**으로 4문제 연속 진단 → 미니카드 → "잠시 쉬기"
3. 홈탭 이동 → 기록 탭 이동
4. **확인 1**: 회차 항목에 "분석중 4/N" 표시 (hotfix와 동일)
5. **확인 2**: 항목 우측에 chevron `›` + 탭 가능
6. **확인 3**: 항목 탭 시 결과 화면으로 이동, 진단 4문제 완료 표시

- [ ] **Step 4: 수동 회귀 재현 (약점 카운트 정상화)**

같은 시뮬레이터 세션에서 홈탭의 약점 카드 확인:

1. **확인 4**: 해당 약점 severity가 `occasional`("가끔 등장", 초록 1 dot) — 1회차만 카운트되므로 정상화
   - 만약 5회차 이상 누적 사용자라면 다른 회차 영향으로 `often` 또는 `frequent`도 정상

2. 약점 상세 화면 진입:
3. **확인 5**: "등장 기록" 타임라인에 해당 모의고사가 **1번**만 표시 (hotfix 후에도 4번 표시되었으나 이제 정상)

- [ ] **Step 5: Push + 알림**

```bash
git push origin main
npm run log:commit
npm run notify:done -- "Option B: per-problem recordAttempt 제거 + controller 중앙 필터로 hotfix 임시 코드 정리"
```

- [ ] **Step 6: Notion 페이지 업데이트**

CLAUDE.md 가이드대로 "DASIDA 개발 기록" 데이터베이스의 해당 페이지를:
- 상태 → `구현완료`
- 구현완료일 → 오늘 날짜
- Spec/Plan 필드 → GitHub permalink (커밋 해시 포함)
- 본문 `## 완료 메모` 섹션에 약점 카운트 변화(`frequent` → `occasional` 가능성) 사용자 영향 메모

---

## Self-Review Notes

### Spec Coverage

- ✅ B2: per-problem `recordAttempt` 제거 → Task 4
- ✅ X: controller 레이어 중앙 prefix 필터 → Task 1 (함수) + Task 2 (적용)
- ✅ Hotfix 임시 코드 정리(`limit: 200`, 화면 단위 import) → Task 3
- ✅ 옛 hotfix 파일 이동/이름 변경 → Task 1 (신규) + Task 3 (삭제)
- ✅ `take` 파라미터 제거 → Task 1 의 함수 시그니처 (단순화)
- ✅ `attemptRecordedRef` 정리 → Task 4 Step 3
- ✅ `buildExamDiagnosisAttemptInput` deprecated JSDoc → Task 4 Step 6
- ✅ Test 추가/수정 → Task 1 (신규 4), Task 3 (옛 6 삭제)
- ✅ 약점 카운트 정상화 자동 적용(코드 변경 0) → Task 5 Step 4 검증
- ✅ Manual regression 두 시나리오 → Task 5 Step 3-4

### Type Consistency

- `filterLegacyPerProblemAttempts(attempts: LearningAttempt[]): LearningAttempt[]` — Task 1, 2 일관
- `EXAM_DIAG_ATTEMPT_PREFIX` (string) — Task 1 import, Task 4에서 retain 보장
- `LearningSource` 타입의 `'featured-exam'` literal — Task 2의 `options?.source === 'featured-exam'` 비교에 사용 (LearningSource는 union이므로 type-safe)

### Placeholder Scan

각 step에 실제 코드/명령 포함, "TBD" / "TODO" / "implement later" 없음.

### Out of Scope (spec과 일치)

- 서버 cleanup 마이그레이션 (Cloud Function delete) — 별도 spec
- `RECENT_WINDOW = 5` 윈도우 시맨틱 재검토 — 별도 product 결정
- `buildExamDiagnosisAttemptInput` 완전 제거 — future cleanup PR
