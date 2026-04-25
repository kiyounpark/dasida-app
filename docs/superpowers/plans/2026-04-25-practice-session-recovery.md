# 약점 연습 세션 복구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여정보드 "연습 다시 시작하기" 버튼 클릭 시 빈 화면/크래시 없이 약점 연습 화면이 정상 표시되도록 세션 복구 로직을 추가한다.

**Architecture:** `QuizSessionProvider`가 새로 마운트될 때 `practiceQueue`가 비어있으면, Firebase에 이미 저장된 `latestDiagnosticSummary.topWeaknesses`로 자동 시딩한다. 세션 reducer에 `SEED_PRACTICE_QUEUE` 액션을 추가하고, `use-practice-screen.ts`에서 마운트 시 복구 useEffect를 실행한다. `ADVANCE_PRACTICE` 가드도 `state.result` 의존에서 `practiceMode + practiceQueue` 의존으로 완화한다.

**Tech Stack:** React (useReducer, useEffect, useMemo), Expo Router, Firebase (읽기 전용 — 기존 `summary.latestDiagnosticSummary` 활용)

---

### Task 1: session.tsx — SEED_PRACTICE_QUEUE 액션 추가 + ADVANCE_PRACTICE 가드 완화

**Files:**
- Modify: `features/quiz/session.tsx`
- Test: `features/quiz/session.test.ts` (새로 생성)

> **배경:** `reducer` 함수는 현재 export되지 않는다. 테스트를 위해 named export를 추가한다.

---

- [ ] **Step 1-1: reducer export 추가 + SEED_PRACTICE_QUEUE 타입 추가 — 테스트 먼저**

`features/quiz/session.test.ts`를 생성하고 아직 존재하지 않는 동작에 대한 failing test를 작성한다.

```ts
// features/quiz/session.test.ts
import { reducer } from '@/features/quiz/session';
import type { WeaknessId } from '@/data/diagnosisMap';

const baseState = {
  hasStarted: false,
  totalQuestions: 10,
  attemptId: undefined,
  startedAt: undefined,
  currentQuestionIndex: 0,
  answers: [],
  isDiagnosing: false,
  diagnosisQueue: [],
  weaknessScores: {} as Record<WeaknessId, number>,
  result: undefined,
  practiceMode: undefined as 'weakness' | 'challenge' | undefined,
  practiceQueue: [] as WeaknessId[],
  practiceIndex: 0,
  practiceCompleted: false,
  challengeCompleted: false,
};

const weaknesses: WeaknessId[] = ['formula_understanding', 'calc_repeated_error'];

describe('SEED_PRACTICE_QUEUE', () => {
  it('빈 큐에 약점 목록을 채운다', () => {
    const next = reducer(baseState, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses },
    });
    expect(next.practiceQueue).toEqual(weaknesses);
    expect(next.practiceIndex).toBe(0);
    expect(next.practiceMode).toBe('weakness');
    expect(next.practiceCompleted).toBe(false);
  });

  it('result가 이미 있으면 무시한다', () => {
    const stateWithResult = {
      ...baseState,
      result: { allCorrect: false, topWeaknesses: weaknesses } as any,
    };
    const next = reducer(stateWithResult, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses },
    });
    expect(next).toBe(stateWithResult);
  });

  it('practiceQueue가 이미 차 있으면 무시한다', () => {
    const stateWithQueue = { ...baseState, practiceQueue: ['formula_understanding'] as WeaknessId[] };
    const next = reducer(stateWithQueue, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses },
    });
    expect(next).toBe(stateWithQueue);
  });

  it('weaknesses가 빈 배열이면 무시한다', () => {
    const next = reducer(baseState, {
      type: 'SEED_PRACTICE_QUEUE',
      payload: { weaknesses: [] },
    });
    expect(next).toBe(baseState);
  });
});

describe('ADVANCE_PRACTICE (가드 완화)', () => {
  it('state.result 없어도 practiceMode=weakness + 큐 있으면 인덱스를 증가시킨다', () => {
    const seededState = {
      ...baseState,
      practiceMode: 'weakness' as const,
      practiceQueue: weaknesses,
      practiceIndex: 0,
    };
    const next = reducer(seededState, { type: 'ADVANCE_PRACTICE' });
    expect(next.practiceIndex).toBe(1);
  });

  it('마지막 약점에서 advance하면 practiceCompleted가 true가 된다', () => {
    const seededState = {
      ...baseState,
      practiceMode: 'weakness' as const,
      practiceQueue: weaknesses,
      practiceIndex: 1, // 마지막 인덱스
    };
    const next = reducer(seededState, { type: 'ADVANCE_PRACTICE' });
    expect(next.practiceCompleted).toBe(true);
  });

  it('practiceMode가 weakness가 아니면 무시한다', () => {
    const challengeState = {
      ...baseState,
      practiceMode: 'challenge' as const,
      practiceQueue: [],
    };
    const next = reducer(challengeState, { type: 'ADVANCE_PRACTICE' });
    expect(next).toBe(challengeState);
  });

  it('practiceQueue가 비어있으면 무시한다', () => {
    const emptyQueueState = {
      ...baseState,
      practiceMode: 'weakness' as const,
      practiceQueue: [],
    };
    const next = reducer(emptyQueueState, { type: 'ADVANCE_PRACTICE' });
    expect(next).toBe(emptyQueueState);
  });
});
```

- [ ] **Step 1-2: 테스트 실행 — fail 확인**

```bash
npx jest features/quiz/session.test.ts --no-coverage
```

Expected: `Cannot find module '@/features/quiz/session'` 또는 `reducer is not exported` 오류

---

- [ ] **Step 1-3: session.tsx 구현**

`features/quiz/session.tsx`를 아래와 같이 수정한다.

**① `reducer` 함수에 `export` 추가 (line 148 근처)**

```ts
// 변경 전:
function reducer(state: QuizSessionState, action: Action): QuizSessionState {

// 변경 후:
export function reducer(state: QuizSessionState, action: Action): QuizSessionState {
```

**② `Action` 유니언 타입에 `SEED_PRACTICE_QUEUE` 추가 (line 54 근처, `COMPLETE_CHALLENGE` 바로 위)**

```ts
// 변경 전:
  | { type: 'COMPLETE_CHALLENGE' };

// 변경 후:
  | { type: 'SEED_PRACTICE_QUEUE'; payload: { weaknesses: WeaknessId[] } }
  | { type: 'COMPLETE_CHALLENGE' };
```

**③ `ADVANCE_PRACTICE` 가드 수정 (line 262)**

```ts
// 변경 전:
case 'ADVANCE_PRACTICE': {
  if (!state.result || state.practiceMode !== 'weakness') return state;

// 변경 후:
case 'ADVANCE_PRACTICE': {
  if (state.practiceMode !== 'weakness' || state.practiceQueue.length === 0) return state;
```

**④ `SEED_PRACTICE_QUEUE` 케이스 추가 (`COMPLETE_CHALLENGE` 바로 위)**

```ts
    case 'SEED_PRACTICE_QUEUE': {
      if (state.result || state.practiceQueue.length > 0) return state;
      if (action.payload.weaknesses.length === 0) return state;
      return {
        ...state,
        practiceMode: 'weakness',
        practiceQueue: action.payload.weaknesses,
        practiceIndex: 0,
        practiceCompleted: false,
      };
    }

    case 'COMPLETE_CHALLENGE': {
```

**⑤ `QuizSessionContextValue` 타입에 `seedPracticeQueue` 추가 (line 13 근처)**

```ts
type QuizSessionContextValue = {
  problems: Problem[];
  state: QuizSessionState;
  startSession: () => void;
  goToPreviousQuestion: () => void;
  submitAnswer: (problemId: string, selectedIndex: number, isCorrect: boolean) => void;
  confirmDiagnosisMethod: (answerIndex: number, trace: DiagnosisRoutingTrace) => void;
  submitDiagnosisWeakness: (
    answerIndex: number,
    weaknessId: WeaknessId,
    detailTrace?: DiagnosisDetailTrace,
  ) => void;
  finishDiagnosis: () => void;
  resumeDiagnosis: (resumeState: PendingDiagnosisResumeState) => void;
  advancePractice: () => void;
  completeChallenge: () => void;
  resetSession: () => void;
  seedPracticeQueue: (weaknesses: WeaknessId[]) => void;  // 추가
};
```

**⑥ Provider value에 `seedPracticeQueue` 추가 (line 344 근처, `resetSession` 바로 다음)**

```ts
      resetSession: () => {
        dispatch({ type: 'RESET' });
      },
      seedPracticeQueue: (weaknesses: WeaknessId[]) => {
        dispatch({ type: 'SEED_PRACTICE_QUEUE', payload: { weaknesses } });
      },
```

- [ ] **Step 1-4: 테스트 실행 — pass 확인**

```bash
npx jest features/quiz/session.test.ts --no-coverage
```

Expected: 전체 PASS (8개 테스트)

- [ ] **Step 1-5: 커밋**

```bash
git add features/quiz/session.tsx features/quiz/session.test.ts
git commit -m "feat(quiz): add SEED_PRACTICE_QUEUE action + relax ADVANCE_PRACTICE guard"
```

---

### Task 2: use-practice-screen.ts — 시딩 useEffect + 조건 완화

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`

---

- [ ] **Step 2-1: `seedPracticeQueue` 디스트럭처링 추가 (line 93)**

```ts
// 변경 전:
  const { state, advancePractice, completeChallenge, resetSession } = useQuizSession();

// 변경 후:
  const { state, advancePractice, completeChallenge, resetSession, seedPracticeQueue } = useQuizSession();
```

- [ ] **Step 2-2: `activeWeaknessId` useMemo 조건 완화 (line 138)**

```ts
// 변경 전:
    if (state.result && activeMode === 'weakness') {
      return state.practiceQueue[state.practiceIndex];
    }

// 변경 후:
    if (activeMode === 'weakness' && state.practiceQueue.length > 0) {
      return state.practiceQueue[state.practiceIndex];
    }
```

useMemo 의존 배열도 함께 확인: `state.result` 대신 `state.practiceQueue` 참조가 이미 있는지 확인하고, `state.practiceQueue` 자체가 deps에 없다면 추가한다. (기존에 `state.practiceQueue`와 `state.practiceIndex`는 이미 deps에 포함되어 있다 — line 147-149 근처)

- [ ] **Step 2-3: `isLastWeakness` 조건 완화 (line 389 근처)**

```ts
// 변경 전:
  const isLastWeakness =
    state.result && state.practiceMode === 'weakness'
      ? state.practiceIndex >= state.practiceQueue.length - 1
      : true;

// 변경 후:
  const isLastWeakness =
    state.practiceMode === 'weakness' && state.practiceQueue.length > 0
      ? state.practiceIndex >= state.practiceQueue.length - 1
      : true;
```

- [ ] **Step 2-4: `counter` 조건 완화 (line 395 근처)**

```ts
// 변경 전:
    if (activeMode === 'weakness' && state.result && state.practiceMode === 'weakness') {

// 변경 후:
    if (activeMode === 'weakness' && state.practiceMode === 'weakness' && state.practiceQueue.length > 0) {
```

- [ ] **Step 2-5: `continueAfterPersistence` 약점 분기 조건 완화 (line 290)**

답안 제출 후 다음 약점 문제로 넘기거나 마지막에 step-complete로 이동하는 핵심 로직. 시딩된 세션도 이 분기를 타야 advance가 동작한다.

```ts
// 변경 전 (line 290):
    if (state.result && state.practiceMode === 'weakness') {
      const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
      advancePractice();

      if (isLast) {
        resetSession();
        ...

// 변경 후:
    if (state.practiceMode === 'weakness' && state.practiceQueue.length > 0) {
      const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
      advancePractice();

      if (isLast) {
        resetSession();
        ...
```

- [ ] **Step 2-6: `continueLabel` 약점 모드 라벨 조건 완화 (line 424)**

마지막 약점에서 "연습 완료" 라벨을 표시하는 분기. 시딩된 세션도 같은 라벨을 보여야 한다.

```ts
// 변경 전 (line 422-426):
          : isLastWeakness
            ? state.result && state.practiceMode === 'weakness'
              ? '연습 완료'
              : '피드백 화면으로 이동'
            : '다음 약점 문제',

// 변경 후:
          : isLastWeakness
            ? state.practiceMode === 'weakness' && state.practiceQueue.length > 0
              ? '연습 완료'
              : '피드백 화면으로 이동'
            : '다음 약점 문제',
```

- [ ] **Step 2-7: 시딩 useEffect 추가**

`markPendingPracticeStarted` useEffect (line 181-193) **바로 아래**에 추가한다.

```ts
  useEffect(() => {
    if (activeMode !== 'weakness') return;
    if (state.result) return;
    if (state.practiceQueue.length > 0) return;
    const weaknesses = summary?.latestDiagnosticSummary?.topWeaknesses;
    if (!weaknesses?.length) return;
    seedPracticeQueue(weaknesses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, state.result, state.practiceQueue.length, summary?.latestDiagnosticSummary?.attemptId]);
```

- [ ] **Step 2-8: TypeScript 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep -E "session|practice-screen" | head -20
```

Expected: 관련 에러 없음

- [ ] **Step 2-9: 기존 테스트 pass 확인**

```bash
npx jest features/quiz/ --no-coverage
```

Expected: 전체 PASS

- [ ] **Step 2-10: 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts
git commit -m "fix(quiz): seed practice queue from latestDiagnosticSummary on re-entry"
```

---

### Task 3: 수동 검증

**검증할 흐름 2가지:**

**흐름 A (버그 A 재현 → 수정 확인)**
1. 진단 10문제 완료 → 결과 화면 확인
2. "약점 연습 시작하기" → 연습 화면 진입 확인
3. 뒤로가기 또는 탭 이동으로 `/(tabs)/quiz` 허브로 이동
4. 여정보드 "연습 다시 시작하기" 버튼 클릭
5. **기대**: 첫 번째 약점 문제가 정상 표시됨 (빈 화면 없음)

**흐름 B (전체 큐 진행 확인)**
1. 위 흐름 A 이후 첫 번째 약점 문제 풀기 (정답 또는 해설 확인)
2. "다음 약점 문제" 버튼 클릭
3. **기대**: 두 번째 약점 문제로 넘어감 (advancePractice 정상 동작)
4. 마지막 약점 풀기 → "연습 완료" 버튼 노출 확인

**흐름 C (기존 정상 흐름 회귀 없음 확인)**
1. 진단 완료 → 결과 → "약점 연습 시작하기" (허브 거치지 않고 바로)
2. **기대**: 기존과 동일하게 동작 (시딩 useEffect가 `state.result` 조건으로 스킵됨)
