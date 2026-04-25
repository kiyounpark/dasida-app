# 약점 연습 세션 복구 설계

**날짜**: 2026-04-25
**상태**: 설계 완료

---

## 문제

약점 진단 후 연습 화면에 진입했다가 나오면, 여정보드의 "연습 다시 시작하기" 버튼을 눌렀을 때 두 가지 버그가 발생한다.

- **버그 A**: "연습 문제를 찾지 못했어요." 빈 화면
- **버그 B**: `use-practice-screen.ts:447` 크래시

### 원인

`QuizSessionProvider`는 `app/quiz/_layout.tsx` 레벨에 마운트된다. 사용자가 연습 화면을 나와 `/(tabs)/quiz` 허브로 돌아오면 `app/quiz/` 스택이 POP되면서 Provider가 언마운트 → 세션 state가 소멸된다.

이후 "연습 다시 시작하기"를 누르면:
1. `router.push('/quiz/practice?mode=weakness')` — `weaknessId` 파라미터 없음
2. `QuizSessionProvider` 새로 마운트 — `state = 초기값`
3. `use-practice-screen` 에서 `activeWeaknessId` 계산:
   - `state.result` 없음 → `practiceQueue` 조건 탈락
   - URL param 없음 → `fallbackWeaknessId = undefined`
4. `activeProblem = undefined` → 빈 화면 또는 크래시

### 왜 첫 진입은 동작하는가

진단(diagnostic) → 결과(result) → 연습(practice) 흐름은 모두 `app/quiz/` 스택 안에서 이루어진다. 스택을 나가지 않으므로 `QuizSessionProvider`가 유지되고, `state.result`와 `practiceQueue`가 살아있다.

---

## 해결 방향

`QuizSessionProvider`가 새로 마운트되는 구조는 그대로 유지한다. 대신 연습 화면이 마운트될 때, 세션에 `practiceQueue`가 없으면 Firebase에 저장된 `latestDiagnosticSummary.topWeaknesses`로 자동 채워주는 복구 로직을 추가한다.

Firebase 데이터는 Provider 언마운트와 무관하게 항상 존재하므로, 어떤 진입 경로에서도 일관되게 동작한다.

---

## 변경 사항

### 1. `features/quiz/session.tsx`

**새 액션: `SEED_PRACTICE_QUEUE`**

```ts
// Action 타입 추가
| { type: 'SEED_PRACTICE_QUEUE'; payload: { weaknesses: WeaknessId[] } }

// Reducer 케이스 추가
case 'SEED_PRACTICE_QUEUE': {
  // 이미 result가 있거나 queue가 채워진 경우 무시 (기존 세션 보호)
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
```

**Context에 노출**

```ts
seedPracticeQueue: (weaknesses: WeaknessId[]) => void;
// → dispatch({ type: 'SEED_PRACTICE_QUEUE', payload: { weaknesses } })
```

**`ADVANCE_PRACTICE` 가드 완화**

기존: `if (!state.result || state.practiceMode !== 'weakness') return state;`
변경: `if (state.practiceMode !== 'weakness' || state.practiceQueue.length === 0) return state;`

`state.result` 없이 시딩된 경우에도 다음 약점으로 넘어갈 수 있어야 한다.

---

### 2. `features/quiz/hooks/use-practice-screen.ts`

**① 시딩 useEffect 추가**

```ts
const { state, advancePractice, completeChallenge, resetSession, seedPracticeQueue } = useQuizSession();

useEffect(() => {
  if (activeMode !== 'weakness') return;
  if (state.result) return;                    // 세션 result 있으면 불필요
  if (state.practiceQueue.length > 0) return;  // 이미 채워져 있으면 불필요

  const weaknesses = summary?.latestDiagnosticSummary?.topWeaknesses;
  if (!weaknesses?.length) return;

  seedPracticeQueue(weaknesses);
}, [activeMode, state.result, state.practiceQueue.length, summary?.latestDiagnosticSummary?.attemptId]);
// topWeaknesses 배열 대신 attemptId(string)를 dep으로 사용 — 배열은 참조 불안정으로 불필요한 재실행 유발 가능
```

**② `activeWeaknessId` 조건 완화**

기존:
```ts
if (state.result && activeMode === 'weakness') {
  return state.practiceQueue[state.practiceIndex];
}
```

변경:
```ts
if (activeMode === 'weakness' && state.practiceQueue.length > 0) {
  return state.practiceQueue[state.practiceIndex];
}
```

**③ `isLastWeakness` 조건 완화**

기존: `state.result && state.practiceMode === 'weakness'`
변경: `state.practiceMode === 'weakness' && state.practiceQueue.length > 0`

**④ `counter` 조건 완화**

기존: `activeMode === 'weakness' && state.result && state.practiceMode === 'weakness'`
변경: `activeMode === 'weakness' && state.practiceMode === 'weakness' && state.practiceQueue.length > 0`

**⑤ `continueAfterPersistence` 약점 분기 조건 완화**

답안 제출 후 다음 약점으로 이동하거나 마지막 약점에서 step-complete로 이동하는 핵심 로직.

기존: `if (state.result && state.practiceMode === 'weakness')`
변경: `if (state.practiceMode === 'weakness' && state.practiceQueue.length > 0)`

**⑥ `continueLabel` 약점 모드 라벨 조건 완화**

마지막 약점 문제에서 버튼 라벨 결정 분기.

기존: `state.result && state.practiceMode === 'weakness'`
변경: `state.practiceMode === 'weakness' && state.practiceQueue.length > 0`

---

## 엣지 케이스

| 케이스 | 동작 |
|---|---|
| `latestDiagnosticSummary` 없음 (진단 미완료) | 시딩 안 됨 → 기존처럼 빈 화면 (올바른 동작) |
| `topWeaknesses`가 빈 배열 (allCorrect) | 시딩 안 됨 → challenge 모드로 자연스럽게 분기 |
| 세션 result 있을 때 (첫 진입 정상 흐름) | `state.result` 체크로 시딩 스킵 → 기존 흐름 유지 |
| `practiceQueue` 이미 채워진 경우 | 중복 시딩 방지 |
| 여러 번 마운트/언마운트 반복 | 매번 index 0부터 시작 (B 옵션: "처음부터") |

---

## 회귀 위험

- 기존 진단 → 결과 → 연습 첫 진입 흐름: `state.result` 조건으로 시딩 스킵, 영향 없음
- `ADVANCE_PRACTICE` 가드 완화: `practiceMode === 'weakness'`와 `practiceQueue.length > 0` 조건이 동일한 의도를 유지
- review 모드, challenge 모드: `activeMode` 조건으로 분리되어 영향 없음

---

## 변경 파일 요약

| 파일 | 변경 유형 |
|---|---|
| `features/quiz/session.tsx` | `SEED_PRACTICE_QUEUE` 액션 추가, `ADVANCE_PRACTICE` 가드 완화 |
| `features/quiz/hooks/use-practice-screen.ts` | 시딩 useEffect 추가, `state.result` 의존 조건 5곳 완화 |
