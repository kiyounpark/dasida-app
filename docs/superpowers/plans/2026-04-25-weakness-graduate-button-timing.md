# 약점 연습 완료 버튼 노출 시점 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `약점 연습 완료하기` 버튼이 약점 연습의 모든 문제를 풀었을 때(`solvedCount >= questionCount`)에만 노출되도록 `canGraduate` 조건을 수정한다.

**Architecture:** `canGraduate` 계산 로직을 `computeCanGraduate` 순수 함수로 추출해 단위 테스트를 가능하게 하고, `usePracticeScreen` 훅에서 해당 함수를 호출한다. 백엔드/영속 저장 로직은 변경 없음.

**Tech Stack:** TypeScript, jest-expo (`npm test`)

---

## 파일 구조

| 파일 | 변경 |
|---|---|
| `features/quiz/hooks/use-practice-screen.ts` | `computeCanGraduate` 함수 추가(export) + `canGraduate` 인라인 조건 교체 |
| `features/quiz/hooks/use-practice-screen.test.ts` | 신규 생성 — `computeCanGraduate` 단위 테스트 |

---

### Task 1: 실패하는 테스트 작성

**Files:**
- Create: `features/quiz/hooks/use-practice-screen.test.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// features/quiz/hooks/use-practice-screen.test.ts
import { computeCanGraduate } from './use-practice-screen';

describe('computeCanGraduate', () => {
  const base = {
    activeMode: 'weakness' as const,
    questionCount: 3,
    solvedCount: 3,
    practiceGraduatedAt: undefined as string | undefined,
  };

  it('모든 문제를 풀었을 때 true를 반환한다', () => {
    expect(computeCanGraduate({ ...base, solvedCount: 3 })).toBe(true);
  });

  it('일부만 풀었을 때 false를 반환한다', () => {
    expect(computeCanGraduate({ ...base, solvedCount: 1 })).toBe(false);
    expect(computeCanGraduate({ ...base, solvedCount: 2 })).toBe(false);
  });

  it('한 문제도 안 풀었을 때 false를 반환한다', () => {
    expect(computeCanGraduate({ ...base, solvedCount: 0 })).toBe(false);
  });

  it('이미 졸업한 경우 false를 반환한다', () => {
    expect(
      computeCanGraduate({ ...base, practiceGraduatedAt: '2026-04-25T00:00:00Z' }),
    ).toBe(false);
  });

  it('weakness 모드가 아닌 경우 false를 반환한다', () => {
    expect(computeCanGraduate({ ...base, activeMode: 'review' as const })).toBe(false);
    expect(computeCanGraduate({ ...base, activeMode: 'challenge' as const })).toBe(false);
  });

  it('questionCount가 0인 경우 false를 반환한다 (빈 큐 보호)', () => {
    expect(computeCanGraduate({ ...base, questionCount: 0, solvedCount: 0 })).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

```bash
npm test -- --testPathPattern="use-practice-screen" --no-coverage
```

예상 결과: `SyntaxError` 또는 `Cannot find module` — `computeCanGraduate`가 아직 없어 import 실패

---

### Task 2: `computeCanGraduate` 구현 및 훅 적용

**Files:**
- Modify: `features/quiz/hooks/use-practice-screen.ts`

- [ ] **Step 3: 파일 상단(14번 라인 아래)에 `computeCanGraduate` 함수 추가**

`type ScreenMode = 'weakness' | 'challenge' | 'review';` 바로 아래에 삽입:

```typescript
export function computeCanGraduate(params: {
  activeMode: 'weakness' | 'challenge' | 'review';
  solvedCount: number;
  questionCount: number;
  practiceGraduatedAt: string | undefined;
}): boolean {
  return (
    params.activeMode === 'weakness' &&
    params.questionCount > 0 &&
    params.solvedCount >= params.questionCount &&
    params.practiceGraduatedAt === undefined
  );
}
```

- [ ] **Step 4: 445번 라인의 `canGraduate` 인라인 조건을 함수 호출로 교체**

변경 전 (445번 라인):
```typescript
canGraduate: activeMode === 'weakness' && solvedCount > 0 && !profile?.practiceGraduatedAt,
```

변경 후:
```typescript
canGraduate: computeCanGraduate({
  activeMode,
  solvedCount,
  questionCount: counter.total,
  practiceGraduatedAt: profile?.practiceGraduatedAt,
}),
```

- [ ] **Step 5: 테스트 실행해 통과 확인**

```bash
npm test -- --testPathPattern="use-practice-screen" --no-coverage
```

예상 결과:
```
PASS features/quiz/hooks/use-practice-screen.test.ts
  computeCanGraduate
    ✓ 모든 문제를 풀었을 때 true를 반환한다
    ✓ 일부만 풀었을 때 false를 반환한다
    ✓ 한 문제도 안 풀었을 때 false를 반환한다
    ✓ 이미 졸업한 경우 false를 반환한다
    ✓ weakness 모드가 아닌 경우 false를 반환한다
    ✓ questionCount가 0인 경우 false를 반환한다 (빈 큐 보호)

Tests: 6 passed
```

- [ ] **Step 6: 전체 테스트 실행해 회귀 없음 확인**

```bash
npm test -- --no-coverage
```

예상 결과: 기존 테스트 모두 통과 (새로 추가된 6개 포함)

---

### Task 3: 커밋

- [ ] **Step 7: 변경 파일 스테이징 및 커밋**

```bash
git add features/quiz/hooks/use-practice-screen.ts features/quiz/hooks/use-practice-screen.test.ts
git commit -m "feat(quiz): 약점 연습 완료 버튼 — 전체 문제 풀이 완료 후에만 노출

canGraduate 조건을 solvedCount > 0에서 solvedCount >= questionCount로 강화.
computeCanGraduate 순수 함수 추출 및 단위 테스트 6개 추가.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

### Spec 커버리지 확인

| Spec 요구사항 | 구현 태스크 |
|---|---|
| `solvedCount > 0` → `solvedCount >= questionCount` 변경 | Task 2, Step 4 |
| `questionCount > 0` 빈 큐 보호 가드 추가 | Task 2, Step 3 (`computeCanGraduate` 함수 내) |
| 백엔드/저장 로직 변경 없음 | 변경 파일 목록에 없음 ✓ |
| 중도 이탈 동작 변경 없음 | `onConfirmExit` 등 변경 없음 ✓ |
| 엣지 케이스 — `activeMode !== 'weakness'` | Task 1 테스트 + Task 2 함수 ✓ |
| 엣지 케이스 — `practiceGraduatedAt` 기존 설정 시 | Task 1 테스트 ✓ |
| 엣지 케이스 — `questionCount === 0` | Task 1 테스트 ✓ |

### Placeholder 스캔

없음 ✓

### 타입 일관성

- `computeCanGraduate` 파라미터의 `activeMode` 타입: `'weakness' | 'challenge' | 'review'` — `ScreenMode`와 동일 (private 타입이므로 인라인 유니온 반복)
- `practiceGraduatedAt`: `string | undefined` — `profile?.practiceGraduatedAt`의 타입(`string | undefined`)과 일치
- `counter.total`: `number` — `computeCanGraduate`의 `questionCount: number`와 일치 ✓
