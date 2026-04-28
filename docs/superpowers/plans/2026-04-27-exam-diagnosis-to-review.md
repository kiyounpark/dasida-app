# 모의고사 진단 → 복습 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모의고사 진단 완료 시 약점 데이터를 attempt 기록에 반영하고, ReviewTask를 생성해 복습 큐에 연결한다.

**Architecture:** 진단 완료 시점에 `recordAttempt()`를 weakness 데이터가 채워진 input으로 재호출한다. `recordAttempt()`는 이미 같은 `attemptId`를 교체(upsert)하므로 새 메서드가 필요 없다. `buildReviewTasks()`의 `source !== 'diagnostic'` 가드를 확장해 `featured-exam`도 ReviewTask를 생성하도록 한다. practice screen의 fallback 우선순위를 뒤집어 URL param이 옛날 진단 데이터보다 우선하도록 한다.

**Tech Stack:** TypeScript, Jest, React Native/Expo

---

## File Map

| 파일 | 역할 |
|---|---|
| `features/quiz/exam/build-exam-attempt-input.ts` | `buildExamAttemptInputWithDiagnosis` 헬퍼 추가 |
| `features/quiz/exam/__tests__/build-exam-attempt-input.test.ts` | 위 헬퍼 단위 테스트 (신규) |
| `features/learning/local-learning-history-repository.ts` | `buildReviewTasks` 가드 확장 + source-aware 필터 |
| `features/learning/local-learning-history-repository.test.ts` | ReviewTask 생성 테스트 (신규) |
| **`functions/src/learning-history.ts`** | **백엔드 `buildReviewTasks`도 동일 수정 (필수)** |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | 진단 완료 시 `recordAttempt` 재호출 트리거 |
| `features/quiz/hooks/use-practice-screen.ts` | URL param 우선 사용 (폴백 + 시딩 가드) |

> **백엔드 사전 검증 결과:** Firebase `recordAttempt`는 `merge: true` upsert로 attemptId 멱등 ✅. 단, 백엔드도 `buildReviewTasks`에 똑같은 가드/필터 버그가 있어 함께 고치고 배포해야 함 (안 그러면 백엔드 응답이 로컬 캐시를 덮어쓰면서 ReviewTask 소실).

---

## Task 1: `buildExamAttemptInputWithDiagnosis` 헬퍼 작성

진단 결과(`ExamDiagnosisProgress`)를 받아 weakness 필드가 채워진 `FinalizedAttemptInput`을 반환하는 함수.

**Files:**
- Modify: `features/quiz/exam/build-exam-attempt-input.ts`
- Create: `features/quiz/exam/__tests__/build-exam-attempt-input.test.ts`

- [ ] **Step 1: 테스트 파일 생성**

`features/quiz/exam/__tests__/build-exam-attempt-input.test.ts`:

```typescript
import type { AuthSession } from '@/features/auth/types';
import type { LearnerProfile } from '@/features/learner/types';
import { buildExamAttemptInput, buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
import type { ExamDiagnosisProgress } from '../exam-diagnosis-progress';
import type { ExamResultSummary } from '../types';

const SESSION: AuthSession = {
  accountKey: 'acc-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'anonymous',
  provider: 'anonymous',
  subject: 'sub-1',
  requestSecret: 'secret-1',
};

const PROFILE: LearnerProfile = {
  accountKey: 'acc-1',
  learnerId: 'learner-1',
  nickname: '테스트',
  grade: 'g2',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const RESULT: ExamResultSummary = {
  examId: 'exam-2025-csat',
  attemptId: 'attempt-abc',
  startedAt: '2026-04-27T09:00:00Z',
  completedAt: '2026-04-27T10:00:00Z',
  total: 30,
  correct: 27,
  wrong: 2,
  unanswered: 1,
  accuracy: 90,
  totalScore: 88,
  maxScore: 100,
  perProblem: [
    { number: 5, isCorrect: false, userAnswer: 2, correctAnswer: 3, earnedScore: 0 },
    { number: 12, isCorrect: false, userAnswer: 3, correctAnswer: 1, earnedScore: 0 },
    { number: 20, isCorrect: true, userAnswer: 1, correctAnswer: 1, earnedScore: 2 },
  ],
};

describe('buildExamAttemptInputWithDiagnosis', () => {
  it('finalWeaknessId를 diagnosedProblems에서 채운다', () => {
    const diagnosedProblems: ExamDiagnosisProgress = {
      5: 'formula_understanding',
      12: 'calc_repeated_error',
    };
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems,
    });

    const q5 = input.questions.find((q) => q.questionNumber === 5);
    const q12 = input.questions.find((q) => q.questionNumber === 12);
    const q20 = input.questions.find((q) => q.questionNumber === 20);

    expect(q5?.finalWeaknessId).toBe('formula_understanding');
    expect(q5?.diagnosisCompleted).toBe(true);
    expect(q12?.finalWeaknessId).toBe('calc_repeated_error');
    expect(q12?.diagnosisCompleted).toBe(true);
    expect(q20?.finalWeaknessId).toBeNull(); // 정답 문제 — 진단 없음
    expect(q20?.diagnosisCompleted).toBe(false);
  });

  it('topWeaknesses를 빈도순으로 채운다', () => {
    const diagnosedProblems: ExamDiagnosisProgress = {
      5: 'formula_understanding',
      12: 'formula_understanding',
      15: 'calc_repeated_error',
    };
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems,
    });

    expect(input.topWeaknesses[0]).toBe('formula_understanding'); // 2회
    expect(input.topWeaknesses[1]).toBe('calc_repeated_error'); // 1회
  });

  it('primaryWeaknessId는 topWeaknesses[0]이다', () => {
    const diagnosedProblems: ExamDiagnosisProgress = {
      5: 'calc_repeated_error',
      12: 'formula_understanding',
    };
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems,
    });

    expect(input.primaryWeaknessId).toBe(input.topWeaknesses[0]);
  });

  it('diagnosedProblems가 비어 있으면 topWeaknesses는 빈 배열, primaryWeaknessId는 null', () => {
    const input = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems: {},
    });

    expect(input.topWeaknesses).toEqual([]);
    expect(input.primaryWeaknessId).toBeNull();
  });

  it('attemptId, source 등 기본 필드는 buildExamAttemptInput과 동일하다', () => {
    const base = buildExamAttemptInput({ session: SESSION, profile: PROFILE, result: RESULT });
    const withDiag = buildExamAttemptInputWithDiagnosis({
      session: SESSION,
      profile: PROFILE,
      result: RESULT,
      diagnosedProblems: {},
    });

    expect(withDiag.attemptId).toBe(base.attemptId);
    expect(withDiag.source).toBe(base.source);
    expect(withDiag.accountKey).toBe(base.accountKey);
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx jest features/quiz/exam/__tests__/build-exam-attempt-input.test.ts --no-coverage
```

Expected: `buildExamAttemptInputWithDiagnosis is not a function` 오류

- [ ] **Step 3: 헬퍼 구현**

`features/quiz/exam/build-exam-attempt-input.ts` 에 함수 추가:

```typescript
import { computeExamTopWeaknesses } from './compute-exam-top-weaknesses';
import type { ExamDiagnosisProgress } from './exam-diagnosis-progress';

export function buildExamAttemptInputWithDiagnosis(params: {
  session: AuthSession;
  profile: LearnerProfile;
  result: ExamResultSummary;
  diagnosedProblems: ExamDiagnosisProgress;
}): FinalizedAttemptInput {
  const { profile, result, session, diagnosedProblems } = params;

  const topWeaknesses = computeExamTopWeaknesses(diagnosedProblems);

  return {
    attemptId: result.attemptId,
    accountKey: session.accountKey,
    learnerId: profile.learnerId,
    source: 'featured-exam',
    sourceEntityId: result.examId,
    gradeSnapshot: profile.grade,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    questionCount: result.total,
    correctCount: result.correct,
    wrongCount: result.wrong,
    accuracy: result.accuracy,
    primaryWeaknessId: topWeaknesses[0] ?? null,
    topWeaknesses,
    questions: result.perProblem.map((p) => {
      const weaknessId = diagnosedProblems[p.number] ?? null;
      return {
        questionId: `${result.examId}/${p.number}`,
        questionNumber: p.number,
        topic: 'exam',
        selectedIndex: p.userAnswer,
        isCorrect: p.isCorrect,
        finalWeaknessId: weaknessId,
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: weaknessId !== null,
        usedDontKnow: false,
        usedAiHelp: false,
      };
    }),
  };
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npx jest features/quiz/exam/__tests__/build-exam-attempt-input.test.ts --no-coverage
```

Expected: 5 tests pass

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/build-exam-attempt-input.ts features/quiz/exam/__tests__/build-exam-attempt-input.test.ts
git commit -m "feat(exam): buildExamAttemptInputWithDiagnosis 헬퍼 추가"
```

---

## Task 2: `buildReviewTasks` — `featured-exam` 처리 추가

`local-learning-history-repository.ts`의 `buildReviewTasks`를 수정해 `featured-exam` source도 ReviewTask를 생성하도록 한다.

**Files:**
- Modify: `features/learning/local-learning-history-repository.ts`
- Create: `features/learning/local-learning-history-repository.test.ts`

- [ ] **Step 1: 테스트 파일 생성**

`features/learning/local-learning-history-repository.test.ts`:

```typescript
import { buildReviewTasks, buildSummary } from './local-learning-history-repository';
import type { FinalizedAttemptInput } from './history-repository';
import type { LearningAttempt, ReviewTask } from './types';

// buildReviewTasks, buildSummary는 export 필요 (다음 단계에서 확인)

function makeExamInput(overrides: Partial<FinalizedAttemptInput> = {}): FinalizedAttemptInput {
  return {
    attemptId: 'exam-attempt-1',
    accountKey: 'acc-1',
    learnerId: 'learner-1',
    source: 'featured-exam',
    sourceEntityId: 'exam-2025-csat',
    gradeSnapshot: 'g2',
    startedAt: '2026-04-27T09:00:00Z',
    completedAt: '2026-04-27T10:00:00Z',
    questionCount: 30,
    correctCount: 28,
    wrongCount: 2,
    accuracy: 93,
    primaryWeaknessId: 'formula_understanding',
    topWeaknesses: ['formula_understanding', 'calc_repeated_error'],
    questions: [],
    ...overrides,
  };
}

describe('buildReviewTasks — featured-exam', () => {
  it('featured-exam attempt로 day1 ReviewTask를 생성한다', () => {
    const input = makeExamInput();
    const result = buildReviewTasks(input, []);

    expect(result).toHaveLength(2);
    expect(result[0].source).toBe('featured-exam');
    expect(result[0].stage).toBe('day1');
    expect(result[0].weaknessId).toBe('formula_understanding');
    expect(result[1].weaknessId).toBe('calc_repeated_error');
  });

  it('topWeaknesses가 비어 있으면 ReviewTask를 생성하지 않는다', () => {
    const input = makeExamInput({ topWeaknesses: [], primaryWeaknessId: null });
    const result = buildReviewTasks(input, []);

    expect(result).toHaveLength(0);
  });

  it('같은 attemptId로 재호출해도 ReviewTask 중복 생성 안 됨', () => {
    const input = makeExamInput();
    const firstResult = buildReviewTasks(input, []);
    const secondResult = buildReviewTasks(input, firstResult);

    expect(secondResult).toHaveLength(2); // 중복 없음
  });

  it('기존 diagnostic ReviewTask에 영향 없음', () => {
    const existingTask: ReviewTask = {
      id: 'diag-1__formula_understanding__day1', // createTaskId 포맷: ${sourceId}__${weaknessId}__${stage}
      accountKey: 'acc-1',
      weaknessId: 'formula_understanding',
      source: 'diagnostic',
      sourceId: 'diag-1',
      scheduledFor: '2026-04-28T00:00:00Z',
      stage: 'day1',
      completed: false,
      createdAt: '2026-04-27T00:00:00Z',
    };

    const input = makeExamInput();
    const result = buildReviewTasks(input, [existingTask]);

    // diagnostic task는 남아있고, exam task도 추가됨
    expect(result.some((t) => t.source === 'diagnostic')).toBe(true);
    expect(result.filter((t) => t.source === 'featured-exam')).toHaveLength(2);
  });
});

describe('buildSummary — featured-exam은 latestDiagnosticSummary에 영향 없음', () => {
  it('featured-exam attempt 갱신 후에도 latestDiagnosticSummary는 diagnostic만 반영', () => {
    const diagnosticAttempt: LearningAttempt = {
      id: 'diag-1',
      accountKey: 'acc-1',
      learnerId: 'learner-1',
      source: 'diagnostic',
      sourceEntityId: null,
      gradeSnapshot: 'g2',
      startedAt: '2026-04-20T00:00:00Z',
      completedAt: '2026-04-20T01:00:00Z',
      questionCount: 10,
      correctCount: 7,
      wrongCount: 3,
      accuracy: 70,
      primaryWeaknessId: 'formula_understanding',
      topWeaknesses: ['formula_understanding'],
      createdAt: '2026-04-20T01:00:00Z',
      schemaVersion: 1,
    };

    const examAttempt: LearningAttempt = {
      ...diagnosticAttempt,
      id: 'exam-1',
      source: 'featured-exam',
      sourceEntityId: 'exam-2025-csat',
      topWeaknesses: ['calc_repeated_error'],
      primaryWeaknessId: 'calc_repeated_error',
    };

    const summary = buildSummary('acc-1', [examAttempt, diagnosticAttempt], [], [], null);

    expect(summary.latestDiagnosticSummary?.attemptId).toBe('diag-1');
    expect(summary.latestDiagnosticSummary?.topWeaknesses[0]).toBe('formula_understanding');
  });
});
```

- [ ] **Step 2: `buildReviewTasks`와 `buildSummary`를 export로 변경 확인**

```bash
grep -n "^function buildReviewTasks\|^function buildSummary\|^export function buildReviewTasks\|^export function buildSummary" features/learning/local-learning-history-repository.ts
```

`export function buildSummary`는 이미 export. `buildReviewTasks`는 파일 내부 함수. 테스트에서 import하려면 export 필요:

`features/learning/local-learning-history-repository.ts:374` 의 선언을:
```typescript
function buildReviewTasks(
```
→
```typescript
export function buildReviewTasks(
```

- [ ] **Step 3: 테스트 실행 — FAIL 확인 (가드 아직 안 바꿨으므로)**

```bash
npx jest features/learning/local-learning-history-repository.test.ts --no-coverage
```

Expected: `featured-exam attempt로 day1 ReviewTask를 생성한다` 실패

- [ ] **Step 4: `buildReviewTasks` 가드 수정**

`features/learning/local-learning-history-repository.ts:423`:

```typescript
// 변경 전
if (input.source !== 'diagnostic') {
  return sortReviewTasks(existingTasks);
}

// 변경 후
if (input.source !== 'diagnostic' && input.source !== 'featured-exam') {
  return sortReviewTasks(existingTasks);
}
```

- [ ] **Step 4-1: 필터 source-aware로 수정 (중요)**

`features/learning/local-learning-history-repository.ts:433-435`:

기존 필터는 `weaknessId`만 비교해서 다른 source의 pending 태스크까지 삭제한다. 모의고사가 끝났을 때 같은 weakness의 diagnostic 태스크가 사라지면 스펙의 "독립 누적" 원칙 위반. 같은 source일 때만 교체하도록 수정.

```typescript
// 변경 전
const nextTasks = existingTasks.filter(
  (task) => task.completed || !reviewWeaknesses.includes(task.weaknessId),
);

// 변경 후
const nextTasks = existingTasks.filter(
  (task) =>
    task.completed
    || task.source !== input.source
    || !reviewWeaknesses.includes(task.weaknessId),
);
```

이렇게 하면:
- 같은 source의 같은 weakness pending 태스크 → 교체 (기존 diagnostic 동작 유지)
- 다른 source의 같은 weakness pending 태스크 → 보존 (독립 누적)

- [ ] **Step 5: 테스트 실행 — PASS 확인**

```bash
npx jest features/learning/local-learning-history-repository.test.ts --no-coverage
```

Expected: 5 tests pass

- [ ] **Step 6: 전체 테스트 회귀 확인**

```bash
npx jest --no-coverage
```

Expected: 기존 테스트 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add features/learning/local-learning-history-repository.ts features/learning/local-learning-history-repository.test.ts
git commit -m "feat(learning): buildReviewTasks에 featured-exam source 추가"
```

---

## Task 2.5: 백엔드 `buildReviewTasks` 동일 수정 + 배포

`functions/src/learning-history.ts`의 `buildReviewTasks`에 같은 버그가 있다. 클라이언트만 고치면 백엔드 응답이 로컬 캐시를 덮어쓰면서 featured-exam ReviewTask가 사라짐. 동일하게 수정 후 Firebase Functions 배포 필수.

**Files:**
- Modify: `functions/src/learning-history.ts`

- [ ] **Step 1: 가드 수정 (line 855)**

```typescript
// 변경 전
if (input.source !== 'diagnostic') {
  return sortReviewTasks(existingTasks);
}

// 변경 후
if (input.source !== 'diagnostic' && input.source !== 'featured-exam') {
  return sortReviewTasks(existingTasks);
}
```

- [ ] **Step 2: 필터 source-aware로 수정 (line 865-867)**

```typescript
// 변경 전
const nextTasks = existingTasks.filter(
  (task) => task.completed || !reviewWeaknesses.includes(task.weaknessId),
);

// 변경 후
const nextTasks = existingTasks.filter(
  (task) =>
    task.completed
    || task.source !== input.source
    || !reviewWeaknesses.includes(task.weaknessId),
);
```

- [ ] **Step 3: functions 빌드 확인**

```bash
cd functions && npm run build
```

Expected: 컴파일 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app
git add functions/src/learning-history.ts
git commit -m "feat(functions): buildReviewTasks에 featured-exam source 추가 + source-aware 필터"
```

- [ ] **Step 5: Firebase Functions 배포 (사용자 승인 후 실행)**

> **주의:** 이건 공유 인프라 변경. 사용자에게 명시적 승인 받고 실행. CI 자동 배포가 있으면 그 경로 사용.

```bash
cd functions
firebase deploy --only functions:recordLearningAttemptHandler
```

배포 후 클라이언트 앱에서 모의고사 진단 완료 시나리오를 한 번 돌려 ReviewTask가 실제로 Firestore에 생성되는지 확인 (Firestore Console에서 `users/{accountKey}/reviewTasks` 문서 확인).

---

## Task 3: `use-exam-result-screen.ts` — 진단 완료 시 `recordAttempt` 재호출

모든 오답 진단 완료 시점(종합 리포트로 이동 직전)에 weakness가 채워진 input으로 `recordAttempt()`를 재호출한다.

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`

- [ ] **Step 1: `recordAttempt`를 hook에서 구조분해**

`use-exam-result-screen.ts:41` 의 `useCurrentLearner()` 구조분해에 `recordAttempt` 추가:

```typescript
// 변경 전
const { profile, recordAttempt, session } = useCurrentLearner();

// 변경 후 (이미 있음 — 확인만)
const { profile, recordAttempt, session } = useCurrentLearner();
```

이미 있으므로 확인만.

- [ ] **Step 2: import 추가**

`use-exam-result-screen.ts` 상단에 import 추가:

```typescript
import { buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
```

- [ ] **Step 3: 진단 완료 useEffect에 재호출 로직 추가**

`use-exam-result-screen.ts:106-125` 의 useEffect를 다음과 같이 수정:

```typescript
// 모든 오답 진단 완료 시 리포트로 이동
useEffect(() => {
  if (wrongCount === 0 || diagnosedCount < wrongCount) return;
  if (!result || !profile || !session) return;
  if (hasNavigatedToReportRef.current) return;
  hasNavigatedToReportRef.current = true;

  // 진단 결과로 attempt 갱신 + ReviewTask 생성
  const diagnosedInput = buildExamAttemptInputWithDiagnosis({
    session,
    profile,
    result,
    diagnosedProblems,
  });
  void recordAttempt(diagnosedInput).catch((err) =>
    console.warn('[Exam] attempt weakness update failed', err),
  );

  const topWeaknesses = computeExamTopWeaknesses(diagnosedProblems);
  router.replace({
    pathname: '/quiz/result',
    params: {
      source: 'exam',
      examId: result.examId,
      examTotal: String(result.total),
      examCorrect: String(result.correct),
      examAccuracy: String(result.accuracy),
      examTopWeaknesses: JSON.stringify(topWeaknesses),
      examWrong: String(wrongCount),
    },
  });
}, [diagnosedCount, wrongCount, result, diagnosedProblems, profile, session, recordAttempt]);
```

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | grep "use-exam-result-screen"
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "feat(exam): 진단 완료 시 recordAttempt 재호출로 약점 데이터 반영"
```

---

## Task 4: `use-practice-screen.ts` — URL param 우선 처리

URL param으로 넘어온 `weaknessId`가 옛날 10문제 진단 결과보다 우선 사용되도록 한다. 두 곳을 동시에 고쳐야 함:
1. `activeWeaknessId` 폴백 우선순위 (line 143-144)
2. `seedPracticeQueue` 시딩 effect — URL param이 있을 땐 시딩 자체를 스킵 (line 196-206)

**왜 둘 다 필요한가:** 시딩 effect가 mount 직후 `latestDiagnosticSummary`로 practiceQueue를 채우면, `activeWeaknessId` 로직이 `practiceQueue.length > 0` 분기를 먼저 타서 URL param까지 도달 못 함.

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`

- [ ] **Step 1: 현재 코드 확인**

```bash
grep -n "recoveryWeakness\|fallbackWeaknessId\|seedPracticeQueue" features/quiz/hooks/use-practice-screen.ts
```

Expected:
- 143번째 줄 근처: `return recoveryWeakness ?? fallbackWeaknessId;`
- 196-206번째 줄: `seedPracticeQueue(weaknesses)` useEffect

- [ ] **Step 2: `activeWeaknessId` 폴백 우선순위 수정**

`features/quiz/hooks/use-practice-screen.ts` 의 `activeWeaknessId` useMemo 내부 마지막 두 줄 수정:

```typescript
// 변경 전
const recoveryWeakness = summary?.latestDiagnosticSummary?.topWeaknesses?.[0];
return recoveryWeakness ?? fallbackWeaknessId;

// 변경 후
const recoveryWeakness = summary?.latestDiagnosticSummary?.topWeaknesses?.[0];
return fallbackWeaknessId ?? recoveryWeakness;
```

- [ ] **Step 3: 시딩 effect에 URL param 가드 추가**

`features/quiz/hooks/use-practice-screen.ts:196-206` 수정:

```typescript
// 변경 전
useEffect(() => {
  if (activeMode !== 'weakness') return;
  if (state.result) return;
  if (state.practiceQueue.length > 0) return;
  const weaknesses = summary?.latestDiagnosticSummary?.topWeaknesses;
  if (!weaknesses?.length) return;
  seedPracticeQueue(weaknesses);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeMode, state.result, state.practiceQueue.length, summary?.latestDiagnosticSummary?.attemptId]);

// 변경 후 — URL param이 있으면 그게 우선이므로 시딩 스킵
useEffect(() => {
  if (activeMode !== 'weakness') return;
  if (state.result) return;
  if (state.practiceQueue.length > 0) return;
  if (fallbackWeaknessId) return; // URL param이 있으면 그것을 사용 (모의고사/특정 약점 진입)
  const weaknesses = summary?.latestDiagnosticSummary?.topWeaknesses;
  if (!weaknesses?.length) return;
  seedPracticeQueue(weaknesses);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeMode, state.result, state.practiceQueue.length, summary?.latestDiagnosticSummary?.attemptId, fallbackWeaknessId]);
```

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | grep "use-practice-screen"
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts
git commit -m "fix(practice): URL param weaknessId가 latestDiagnosticSummary보다 우선되도록 수정"
```

---

## Task 5: 전체 테스트 + 최종 확인

- [ ] **Step 1: 전체 테스트 실행**

```bash
npx jest --no-coverage
```

Expected: 모든 테스트 통과. 새로 추가된 테스트 포함.

- [ ] **Step 2: TypeScript 전체 빌드 확인 (클라이언트)**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 오류 없음

- [ ] **Step 3: TypeScript 빌드 확인 (functions)**

```bash
cd functions && npm run build && cd ..
```

Expected: 오류 없음

- [ ] **Step 4: 수동 검증 체크리스트**

> **전제:** Task 2.5 Step 5(Functions 배포)가 완료된 상태여야 함. 안 되어 있으면 클라이언트 fix가 의미 없음.

다음 시나리오를 앱에서 직접 확인:

1. 모의고사 채점 → 모든 오답 진단 완료 → 종합 리포트 화면 → 다음 날 앱 열기 → 홈 "오늘의 복습"에 약점 나타남
2. 종합 리포트 → "약점 기반 연습문제 풀러가기" → 모의고사에서 진단된 약점으로 문제 표시
3. 10문제 약점진단 후 연습 → 여전히 10문제 진단 약점으로 표시 (회귀 없음)
4. **다른 source 독립 누적:** 10문제 진단으로 `formula_understanding` ReviewTask 생성 → 모의고사로 같은 약점 진단 → diagnostic 태스크 보존 + featured-exam 태스크 추가 (둘 다 존재)
5. 진단 중단(홈으로 이동) → 기존 attempt 기록 보존 확인
6. Firestore Console 확인: `users/{accountKey}/reviewTasks` 컬렉션에 `source: 'featured-exam'` 문서 존재

- [ ] **Step 5: 최종 커밋 (필요 시)**

```bash
git push origin main
npm run notify:done -- "모의고사 진단→복습 연결 Phase 1 구현 완료: buildExamAttemptInputWithDiagnosis, buildReviewTasks featured-exam 확장, practice screen 우선순위 수정"
```
