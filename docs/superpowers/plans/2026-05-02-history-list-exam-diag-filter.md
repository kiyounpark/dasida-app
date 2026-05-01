# History List — Filter Per-Problem Diagnosis Attempts (Hotfix) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기록 탭의 `recentExamAttempts` 목록에서 per-problem 진단 attempt를 prefix 기반으로 제외해, "분석중" 라벨 회귀를 수정한다.

**Architecture:** `build-exam-diagnosis-attempt-input.ts`에서 `EXAM_DIAG_ATTEMPT_PREFIX` 상수를 export → 별도 순수 함수 `filterRecentExamAttempts`에서 prefix 필터 + 상한 slice → `use-history-screen.ts`의 `loadAttempts`가 fetch limit를 200으로 늘리고 이 필터를 통과시킨다.

**Tech Stack:** TypeScript, React (hooks), Jest. 신규 의존성 없음.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `features/quiz/exam/build-exam-diagnosis-attempt-input.ts` (modify) | `EXAM_DIAG_ATTEMPT_PREFIX` export, `createAttemptId`가 이를 사용하도록 변경 |
| `features/history/hooks/filter-recent-exam-attempts.ts` (create) | per-problem prefix 제외 + 상한 slice 순수 함수 |
| `features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts` (create) | 순수 함수 회귀 테스트 |
| `features/history/hooks/use-history-screen.ts` (modify) | `loadAttempts`에서 limit 200으로 늘리고 필터 적용 |

각 단위는 독립적으로 import/테스트 가능. `filter-recent-exam-attempts.ts`는 사이드 이펙트 없는 순수 함수이므로 hook 외부에서도 재사용 가능.

---

## Task 1: Export EXAM_DIAG_ATTEMPT_PREFIX 상수

**Files:**
- Modify: `features/quiz/exam/build-exam-diagnosis-attempt-input.ts:7-9`

**컨텍스트:** `createAttemptId`가 `'exam-diag-'` prefix를 하드코딩하고 있다. history 측 필터에서 같은 문자열을 import하기 위해 상수로 export.

- [ ] **Step 1: 상수 추가 + `createAttemptId`에서 사용**

`features/quiz/exam/build-exam-diagnosis-attempt-input.ts` 상단 (line 6-9)을 다음으로 교체:

```ts
export const EXAM_DIAG_ATTEMPT_PREFIX = 'exam-diag-';

function createAttemptId(examId: string, problemNumber: number) {
  return `${EXAM_DIAG_ATTEMPT_PREFIX}${examId}-p${problemNumber}-${Date.now().toString(36)}`;
}
```

(기존 함수의 리턴 문자열만 prefix 변수로 교체. 다른 줄 변경 없음.)

- [ ] **Step 2: typecheck 통과 확인**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 3: 기존 테스트 영향 없음 확인**

Run: `npm test -- build-exam-diagnosis-attempt-input` (테스트 파일이 있다면)
또는 전체: `npm test`
Expected: 모든 테스트 통과 (생성 ID 형태가 동일하므로 행위 변화 없음)

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/build-exam-diagnosis-attempt-input.ts
git commit -m "$(cat <<'EOF'
refactor(exam): EXAM_DIAG_ATTEMPT_PREFIX 상수 export

per-problem 진단 attemptId의 prefix를 export 상수로 빼서
history 필터가 같은 source를 참조할 수 있도록 한다.
행위 변화 없음.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: filterRecentExamAttempts 순수 함수 (TDD)

**Files:**
- Create: `features/history/hooks/filter-recent-exam-attempts.ts`
- Create: `features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts`

**컨텍스트:** per-problem attempt를 제외하고 상한 N개로 잘라내는 순수 함수. hook 외부에서 테스트 가능하도록 분리.

- [ ] **Step 1: 실패 테스트 작성**

`features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts` 신규 파일:

```ts
import type { LearningAttempt } from '@/features/learning/types';

import { filterRecentExamAttempts } from '../filter-recent-exam-attempts';

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

describe('filterRecentExamAttempts', () => {
  it('removes per-problem diagnosis attempts (exam-diag- prefix)', () => {
    const attempts = [
      makeAttempt('exam-diag-exam-1-p3-aaa', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z'),
    ];

    const result = filterRecentExamAttempts(attempts, 5);

    expect(result.map((a) => a.id)).toEqual(['exam-attempt-1']);
  });

  it('preserves order of remaining attempts', () => {
    const attempts = [
      makeAttempt('exam-attempt-3', '2026-05-02T12:00:00.000Z'),
      makeAttempt('exam-diag-exam-1-p3-aaa', '2026-05-02T11:00:00.000Z'),
      makeAttempt('exam-attempt-2', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z'),
    ];

    const result = filterRecentExamAttempts(attempts, 5);

    expect(result.map((a) => a.id)).toEqual([
      'exam-attempt-3',
      'exam-attempt-2',
      'exam-attempt-1',
    ]);
  });

  it('slices to take after filtering', () => {
    const attempts = [
      makeAttempt('exam-attempt-3', '2026-05-02T12:00:00.000Z'),
      makeAttempt('exam-attempt-2', '2026-05-02T11:00:00.000Z'),
      makeAttempt('exam-attempt-1', '2026-05-02T10:00:00.000Z'),
    ];

    const result = filterRecentExamAttempts(attempts, 2);

    expect(result.map((a) => a.id)).toEqual([
      'exam-attempt-3',
      'exam-attempt-2',
    ]);
  });

  it('handles saturated per-problem case (100 per-problem + 1 exam)', () => {
    const perProblems = Array.from({ length: 100 }, (_, i) =>
      makeAttempt(`exam-diag-exam-1-p${i}-${i}`, '2026-05-02T11:00:00.000Z'),
    );
    const examAttempt = makeAttempt('exam-attempt-1', '2026-05-02T09:00:00.000Z');

    const result = filterRecentExamAttempts([...perProblems, examAttempt], 5);

    expect(result.map((a) => a.id)).toEqual(['exam-attempt-1']);
  });

  it('returns empty when input is empty', () => {
    expect(filterRecentExamAttempts([], 5)).toEqual([]);
  });

  it('returns empty when all are per-problem attempts', () => {
    const attempts = [
      makeAttempt('exam-diag-exam-1-p1-aaa', '2026-05-02T10:00:00.000Z'),
      makeAttempt('exam-diag-exam-1-p2-bbb', '2026-05-02T11:00:00.000Z'),
    ];

    expect(filterRecentExamAttempts(attempts, 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- filter-recent-exam-attempts`
Expected: FAIL — `Cannot find module '../filter-recent-exam-attempts'`

- [ ] **Step 3: 최소 구현 작성**

`features/history/hooks/filter-recent-exam-attempts.ts` 신규 파일:

```ts
import type { LearningAttempt } from '@/features/learning/types';
import { EXAM_DIAG_ATTEMPT_PREFIX } from '@/features/quiz/exam/build-exam-diagnosis-attempt-input';

/**
 * `recentExamAttempts` 목록에서 per-problem 진단 attempt(`exam-diag-` prefix)를 제외하고
 * 상한 `take`개만 남긴다. Firestore 쿼리에서 source가 같아 섞여 들어오기 때문에
 * 클라이언트에서 한 번 더 시맨틱 필터를 적용한다.
 *
 * 입력 순서를 그대로 유지하므로 호출자가 정렬을 책임진다.
 */
export function filterRecentExamAttempts(
  attempts: LearningAttempt[],
  take: number,
): LearningAttempt[] {
  return attempts
    .filter((a) => !a.id.startsWith(EXAM_DIAG_ATTEMPT_PREFIX))
    .slice(0, take);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- filter-recent-exam-attempts`
Expected: 6 passed

- [ ] **Step 5: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 6: Commit**

```bash
git add features/history/hooks/filter-recent-exam-attempts.ts \
        features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts
git commit -m "$(cat <<'EOF'
feat(history): per-problem 진단 attempt 제외 순수 필터 추가

`exam-diag-` prefix attempt를 제외하고 상한 N개로 자르는
순수 함수 + 회귀 테스트 6개. use-history-screen에서 곧 사용.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: useHistoryScreen에서 필터 적용 + limit 200

**Files:**
- Modify: `features/history/hooks/use-history-screen.ts:50-57`

**컨텍스트:** `loadAttempts`가 fetch한 attempts에 필터를 통과시키고, per-problem이 많아도 진짜 회차가 누락되지 않도록 limit를 200으로 올린다.

- [ ] **Step 1: import 추가**

`features/history/hooks/use-history-screen.ts:18` (기존 import 블록 마지막에 추가):

```ts
import { filterRecentExamAttempts } from './filter-recent-exam-attempts';
```

(기존 `import { onPressExamHistoryItemImpl } from './use-history-screen-handlers';` 바로 위 또는 아래.)

- [ ] **Step 2: loadAttempts 본문 교체**

`features/history/hooks/use-history-screen.ts:50-57` (현재):

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

다음으로 교체:

```ts
    setIsLoadingAttempts(true);
    try {
      // per-problem 진단 attempt(`exam-diag-` prefix)가 같은 source로 섞여 있어
      // 5 한도로는 회차 attempt가 잘릴 수 있다. 넉넉히 200까지 fetch한 뒤
      // filterRecentExamAttempts에서 prefix 제외 + 5개로 자른다.
      const attempts = await loadRecentAttempts({
        source: 'featured-exam',
        limit: 200,
      });
      if (!isMountedRef.current) return;
      setRecentExamAttempts(filterRecentExamAttempts(attempts, 5));
    } catch {
```

- [ ] **Step 3: typecheck 통과 확인**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 4: 기존 use-history-screen 테스트 통과 확인**

Run: `npm test -- use-history-screen`
Expected: 모든 테스트 통과 (필터는 추가 동작이고 onPressExamHistoryItem 핸들러는 영향 없음)

- [ ] **Step 5: Commit**

```bash
git add features/history/hooks/use-history-screen.ts
git commit -m "$(cat <<'EOF'
fix(history): per-problem 진단 attempt 필터링으로 분석중 회귀 수정

기록 탭 회차 목록에서 per-problem 진단 attempt(`exam-diag-` prefix)를
제외해, 1문제 진단 후 "잠시 쉬기"한 회차에 "분석중" 라벨이
정상 표시되도록 한다. fetch limit는 5 → 200으로 늘리고 필터 후
slice(0,5)로 잘라낸다 (회차당 진단 30문항 × 5회차 가정).

Fixes regression introduced in commit e4079e0 (analysisState
출처를 폰 메모 → 서버 listAttemptResults로 교체).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 전체 검증 + 수동 회귀 재현

**Files:** 없음 (검증 단계)

- [ ] **Step 1: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 모든 테스트 통과 (기존 135 + 신규 6 = 141 passed)

- [ ] **Step 2: typecheck**

Run: `npx tsc --noEmit`
Expected: `TypeScript: No errors found`

- [ ] **Step 3: 수동 회귀 재현**

iPad 시뮬레이터에서:

1. 모의고사 응시 → 채점 결과 → 진단 세션 진입
2. 1문제 약점 선택 → 미니카드 → "잠시 쉬기" 탭
3. 홈탭 이동 → 기록 탭 이동
4. **확인**: 해당 회차 항목에 "진행 중 1/N" 라벨 표시되는지
5. **확인**: 항목 우측에 chevron `›` 표시 + 탭 가능한지
6. **확인**: 항목 탭 시 결과 화면으로 이동, 진단 1문제 완료 표시되는지

- [ ] **Step 4: 변경 없으면 작업 종료. 회귀가 다시 보이면 진단 후 추가 task 작성.**

---

## Self-Review Notes

- **Spec coverage**:
  - 필터 위치(use-history-screen) → Task 3 ✓
  - 필터 기준(prefix 상수) → Task 1 + Task 2 ✓
  - limit 200 → Task 3 ✓
  - 회귀 테스트 → Task 2 (6 cases, spec의 mixed/saturation 둘 다 포함) ✓
  - 변경 파일 목록(3개) → Task별 1:1 매칭 ✓
- **Placeholder scan**: 모든 step에 실제 코드/명령 포함, "TBD" 없음
- **Type consistency**: `EXAM_DIAG_ATTEMPT_PREFIX`, `filterRecentExamAttempts` 시그니처 Task 간 일치
- **Out of scope** (spec과 일치):
  - per-problem `recordAttempt` 제거(Option B) — 별도 spec 필요
  - 약점 집계 로직 변경 — Option B에서 검토
