# 모의고사 진단 큐 — 완료된 문제 제외 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모의고사 결과 화면에서 오답 타일을 누를 때, 이미 진단 완료된 문제를 큐에서 제외하고 클릭한 문제부터 시작하여 미진단 문제만 순차로 진단하도록 변경한다.

**Architecture:** 순수 함수 `buildDiagnosisQueue`를 신규로 도입해 큐 구성 로직을 hook 바깥의 domain layer로 분리한다. `use-exam-result-screen.onAnalyzeProblem`은 이 함수에 위임하고 빈 큐일 때 네비게이션을 막는 가드 한 줄을 추가한다. 진단 세션 hook과 화면은 변경하지 않는다 (큐의 의미가 동일).

**Tech Stack:** TypeScript, React Native (Expo), Jest, expo-router

**Spec:** [docs/superpowers/specs/2026-04-27-exam-diagnosis-queue-skip-completed-design.md](../specs/2026-04-27-exam-diagnosis-queue-skip-completed-design.md)

---

## File Structure

| 파일 | 작업 | 책임 |
|------|------|------|
| `features/quiz/exam/build-diagnosis-queue.ts` | NEW | 순수 함수: undiagnosed 필터링 + clicked 회전 |
| `features/quiz/exam/__tests__/build-diagnosis-queue.test.ts` | NEW | 6개 단위 테스트 |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | MODIFY | `onAnalyzeProblem`에서 `buildDiagnosisQueue` 호출, 빈 큐 가드 |

---

## Task 1: `buildDiagnosisQueue` 순수 함수 + 테스트

**Files:**
- Create: `features/quiz/exam/build-diagnosis-queue.ts`
- Test: `features/quiz/exam/__tests__/build-diagnosis-queue.test.ts`

- [ ] **Step 1: 빈 함수 스텁 작성**

Create `features/quiz/exam/build-diagnosis-queue.ts`:

```typescript
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

export function buildDiagnosisQueue(
  allWrong: number[],
  diagnosed: ExamDiagnosisProgress,
  startProblem: number,
): number[] {
  return [];
}
```

- [ ] **Step 2: 실패하는 테스트 6개 작성**

Create `features/quiz/exam/__tests__/build-diagnosis-queue.test.ts`:

```typescript
import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';
import { buildDiagnosisQueue } from '../build-diagnosis-queue';

describe('buildDiagnosisQueue', () => {
  it('진단된 문제 없으면 클릭한 문제 첫 자리, 나머지 원래 순서', () => {
    expect(buildDiagnosisQueue([1, 3, 5], {}, 1)).toEqual([1, 3, 5]);
    expect(buildDiagnosisQueue([1, 3, 5], {}, 3)).toEqual([3, 1, 5]);
  });

  it('일부 진단 완료 — 미진단만, 클릭한 문제 첫 자리', () => {
    const diagnosed: ExamDiagnosisProgress = { 5: 'formula_understanding' as WeaknessId };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 3)).toEqual([3, 1]);
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1, 3]);
  });

  it('마지막 한 개만 미진단 + 그것 클릭', () => {
    const diagnosed: ExamDiagnosisProgress = {
      3: 'calc_repeated_error' as WeaknessId,
      5: 'formula_understanding' as WeaknessId,
    };
    expect(buildDiagnosisQueue([1, 3, 5], diagnosed, 1)).toEqual([1]);
  });

  it('이미 진단 완료된 문제 클릭 — 빈 배열 (방어)', () => {
    const diagnosed: ExamDiagnosisProgress = { 3: 'calc_repeated_error' as WeaknessId };
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

- [ ] **Step 3: 테스트 실행하여 실패 확인**

Run:
```bash
npx jest features/quiz/exam/__tests__/build-diagnosis-queue.test.ts --no-coverage
```

Expected: 6개 테스트 모두 FAIL (빈 배열을 반환하는 스텁이라 첫 두 케이스부터 expected != actual)

- [ ] **Step 4: 함수 구현**

Replace contents of `features/quiz/exam/build-diagnosis-queue.ts`:

```typescript
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

/**
 * 모의고사 결과 화면에서 진단 세션에 전달할 큐를 만든다.
 *
 * 동작:
 * - 이미 진단 완료된 문제는 제외 (allWrong - diagnosed)
 * - 클릭한 문제를 큐의 첫 자리에 둔다
 * - 나머지 미진단 문제는 allWrong의 원래 순서를 유지한다
 *
 * 방어:
 * - 클릭한 문제가 이미 진단 완료됐거나 allWrong에 없으면 빈 배열을 반환한다.
 *   호출 측에서 빈 배열일 때 네비게이션을 막아야 한다.
 */
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

- [ ] **Step 5: 테스트 통과 확인**

Run:
```bash
npx jest features/quiz/exam/__tests__/build-diagnosis-queue.test.ts --no-coverage
```

Expected: 6개 테스트 모두 PASS

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/exam/build-diagnosis-queue.ts features/quiz/exam/__tests__/build-diagnosis-queue.test.ts
git commit -m "$(cat <<'EOF'
feat(exam): buildDiagnosisQueue 순수 함수 추가

진단 완료된 문제는 큐에서 제외하고, 클릭한 문제를 첫 자리에 두는
큐 빌더 함수. 다음 태스크에서 use-exam-result-screen이 사용한다.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `onAnalyzeProblem`에서 큐 빌더 사용

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts:180-194`

- [ ] **Step 1: import 추가**

In `features/quiz/exam/hooks/use-exam-result-screen.ts`, find the import block at the top (around line 8) and add `buildDiagnosisQueue` import. The existing imports include:

```typescript
import { buildExamAttemptInput, buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
import { computeExamTopWeaknesses } from '../compute-exam-top-weaknesses';
```

Add right after them:

```typescript
import { buildDiagnosisQueue } from '../build-diagnosis-queue';
```

- [ ] **Step 2: `onAnalyzeProblem` 본문 교체**

In the same file, find:

```typescript
    onAnalyzeProblem: (problemNumber: number) => {
      if (!result) return;
      const wrongProblemNumbers = result.perProblem
        .filter((p) => !p.isCorrect && p.userAnswer !== null)
        .map((p) => p.number);
      const startIndex = wrongProblemNumbers.indexOf(problemNumber);
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: result.examId,
          wrongProblemNumbers: JSON.stringify(wrongProblemNumbers),
          startIndex: String(Math.max(0, startIndex)),
        },
      });
    },
```

Replace it with:

```typescript
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

- [ ] **Step 3: 타입체크 통과 확인**

Run:
```bash
npx tsc --noEmit
```

Expected: 에러 없음 (만약 다른 기존 에러가 있다면 본 변경과 무관함)

- [ ] **Step 4: 관련 테스트 실행**

Run:
```bash
npx jest features/quiz/exam/__tests__ --no-coverage
```

Expected: build-diagnosis-queue, build-exam-attempt-input, compute-exam-top-weaknesses 모두 PASS. 기존 테스트도 그대로 PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "$(cat <<'EOF'
fix(exam): 진단 완료된 문제는 다시 진단 세션으로 들어가지 않도록 수정

결과 화면에서 오답 타일을 누르면 모든 오답이 큐에 들어가서
이미 끝낸 진단까지 다시 풀어야 하던 UX 버그 수정.

onAnalyzeProblem이 buildDiagnosisQueue로 위임:
- 진단 완료된 문제는 큐에서 제외
- 클릭한 문제를 큐 첫 자리에 두고 나머지 미진단 문제는 원래 순서 유지
- 빈 큐(이미 done 타일 클릭 등 방어 케이스)일 땐 네비게이션 안 함

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 시뮬레이터 smoke 검증

이 태스크는 자동화 테스트가 아니라 사람의 눈으로 확인이 필요하다. 실패 시 Task 1, 2의 코드를 다시 본다.

**Files:** (변경 없음)

- [ ] **Step 1: 시뮬레이터 빌드 확인**

Run:
```bash
npx expo run:ios
```

Expected: 검정화면 없이 앱 정상 부팅. 만약 패키지 변경이 없었다면 prebuild 불필요.

- [ ] **Step 2: 모의고사 시작 → 일부러 1, 3, 5번 틀리는 답 입력**

기대: 결과 화면에서 1, 3, 5번이 오답 타일로 표시됨 (status='undone').

- [ ] **Step 3: 3번 타일 누르고 진단 완료**

기대:
- 진단 세션이 3번 한 화면만 보여줌 (FlatList 페이지 1개)
- 3번 진단 완료 후 결과 화면 자동 복귀
- 결과 화면에서 3번 타일 status='done' 표시

만약 3번 외에 1번, 5번까지 표시되면 버그가 안 고쳐진 것 → Task 2 코드 다시 확인.

- [ ] **Step 4: 5번 타일 누르고 진단 완료**

기대:
- 진단 세션이 5번 한 화면만 보여줌
- 5번 진단 완료 후 결과 화면 자동 복귀
- 결과 화면에서 5번 타일 status='done', 1번만 'undone'

- [ ] **Step 5: 1번 타일 누르고 진단 완료 (핵심 검증)**

기대:
- **진단 세션이 1번 한 화면만 보여줌 (3, 5번 안 나옴)**
- 1번 진단 완료 후 결과 화면 거쳐 자동으로 리포트 화면으로 router.replace
- 콘솔에 `[Exam] attempt weakness update failed` 같은 경고 없음

만약 1번 외에 3번 또는 5번이 나오면 버그가 안 고쳐진 것.

- [ ] **Step 6: 회전 케이스 검증 (별도 회차)**

새 모의고사로 다시 진입 후 1, 3, 5번 틀리고 결과 화면 진입.
3번 타일을 먼저 누르기.

기대:
- 진단 세션이 [3, 1, 5] 순서로 진행 (3번 끝나면 1번, 그 다음 5번)
- 즉, 클릭한 문제가 첫 자리에 오고 나머지 미진단은 원래 순서 유지

- [ ] **Step 7: 푸시**

```bash
git push origin main && npm run log:commit
```

기대: 두 커밋이 원격에 푸시됨. log:commit으로 PROGRESS.md 업데이트.

---

## Task 4: Notion 업데이트

**Files:** (코드 변경 없음 — 메타데이터)

- [ ] **Step 1: Notion 페이지 상태 변경**

Notion "DASIDA 개발 기록" 데이터베이스에서 "모의고사 결과 화면 — 진단 완료된 문제 큐에서 제외" 페이지를 업데이트:

- 상태 → `구현완료`
- 구현완료일 → 오늘 날짜 (2026-04-27)
- Spec 필드 → 커밋 해시 포함 GitHub permalink로 업데이트
- 본문 `## 완료 메모` 섹션 추가:

```markdown
## 완료 메모
- 시뮬레이터 smoke 검증 완료: 1, 3, 5번 틀린 후 3 → 5 → 1 순서로 진단 시 1번 클릭 시 1번만 진단 진행 확인.
- 회전 케이스 검증: 진단 시작 시점에 3번 클릭 → [3, 1, 5] 순서 진행 확인.
- buildDiagnosisQueue 단위 테스트 6개 통과.
```

---

## Self-Review

**Spec coverage check:**

| Spec 항목 | 구현 태스크 |
|-----------|-------------|
| 문제 (재현 시나리오) | Task 3 Step 2-5 (smoke 검증) |
| 원인 (use-exam-result-screen.ts:182-184) | Task 2 (해당 블록 교체) |
| Approach B (rotation) | Task 1 Step 4 (구현), Task 3 Step 6 (검증) |
| `buildDiagnosisQueue` 인터페이스 | Task 1 Step 1, 4 |
| `onAnalyzeProblem` 호출 변경 | Task 2 Step 2 |
| 빈 큐 가드 | Task 2 Step 2 (`if (queue.length === 0) return;`) |
| 6개 테스트 케이스 | Task 1 Step 2 |
| 시뮬레이터 smoke | Task 3 |
| 회귀 위험 (처음 진단 시작) | Task 3 Step 6 (회전 검증이 처음 진단 시작 케이스도 커버) |
| 자동 리포트 이동 | Task 3 Step 5 ("결과 화면 거쳐 자동으로 리포트 화면으로") |

모든 spec 항목이 태스크에 매핑됨.

**Placeholder scan:** TBD/TODO/Similar to/etc 없음. 모든 step에 실제 코드 또는 명확한 명령이 들어 있음.

**Type consistency:**
- `buildDiagnosisQueue(allWrong: number[], diagnosed: ExamDiagnosisProgress, startProblem: number): number[]` — Task 1과 Task 2에서 호출 시그니처 일치.
- `ExamDiagnosisProgress` import 경로 (`../exam-diagnosis-progress`) — 신규 파일과 테스트 파일 모두 동일.
- `diagnosedProblems` 변수명 — `use-exam-result-screen`의 기존 state 이름. Task 2에서 그대로 사용.

이슈 없음.
