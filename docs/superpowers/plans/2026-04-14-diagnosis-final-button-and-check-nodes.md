# 진단 플로우 — 최종 버튼 버그 수정 + 확인 문제 13개 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 플로우에서 "이 약점으로 정리하기" 버튼이 항상 비활성화되는 버그를 수정하고, g3_/g1_ 약점 13개에 확인 문제를 추가해 모든 메서드에서 확인 문제 경험을 제공한다.

**Architecture:** `use-exam-diagnosis.ts`의 `advanceDraft`에서 final 노드를 `interactive: false`로 렌더링하는 1줄 버그를 수정한다. 이후 `detailedDiagnosisFlows.ts`의 `checkPromptByWeakness`에 13개 항목을 추가하고, TypeScript `satisfies` 키워드로 컴파일 타임에 누락 여부를 자동 검증한다.

**Tech Stack:** TypeScript, React Native (Expo), `npx tsc --noEmit`

---

## 파일 구조

| 파일 | 변경 내용 |
|------|---------|
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | line 220: `interactive` 값 수정 |
| `data/detailedDiagnosisFlows.ts` | `checkPromptByWeakness` 13개 항목 추가 + satisfies 검증 블록 |

---

## Task 1: 최종 버튼 비활성화 버그 수정

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts:220`

---

- [ ] **Step 1: 파일 읽기**

`features/quiz/exam/hooks/use-exam-diagnosis.ts`를 열어 `advanceDraft` 함수(line 204–226)를 확인한다. line 220에서 다음 코드를 찾는다:

```typescript
interactive: node.kind !== 'final',
```

---

- [ ] **Step 2: 1줄 수정**

line 220을 다음과 같이 수정한다:

```typescript
// Before
interactive: node.kind !== 'final',

// After
interactive: true,
```

`advanceDraft` 전체 함수는 수정 후 이렇게 보여야 한다:

```typescript
const advanceDraft = useCallback(
  (nextDraft: DiagnosisFlowDraft, userText: string) => {
    const flow = getDiagnosisFlow(nextDraft.methodId);
    const node = getNode(flow, nextDraft.currentNodeId);

    setDraft(nextDraft);
    setEntries((prev) => {
      const frozen = prev.map((e) => ('interactive' in e ? { ...e, interactive: false } : e));
      if (userText) {
        frozen.push({ kind: 'bubble', id: `user-${nextDraft.currentNodeId}`, role: 'user', text: userText });
      }
      frozen.push({
        kind: 'flow-node',
        id: `node-${nextDraft.currentNodeId}-${Date.now()}`,
        flow,
        draft: nextDraft,
        interactive: true,
      });
      return frozen;
    });
  },
  [],
);
```

---

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (0 errors)

---

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "fix(diagnosis): final 노드 interactive: true 수정 — 약점 정리하기 버튼 활성화"
```

---

## Task 2: 확인 문제 13개 추가 + 검증

**Files:**
- Modify: `data/detailedDiagnosisFlows.ts` (checkPromptByWeakness, line ~397)

---

- [ ] **Step 1: 파일 읽기**

`data/detailedDiagnosisFlows.ts`를 열어 `checkPromptByWeakness` 객체의 마지막 항목 (`counting_overcounting`, line ~396) 다음, 닫는 `};` 직전을 찾는다.

---

- [ ] **Step 2: 13개 항목 추가**

`counting_overcounting` 항목의 닫는 `},` 다음 줄, `};` 직전에 아래 코드를 삽입한다:

```typescript
  g3_sequence: {
    title: '수열 공식 확인',
    prompt: '등차수열 {aₙ}에서 a₁=2, 공차 d=3일 때 a₅는?',
    options: [
      { id: 'correct', text: '14', isCorrect: true },
      { id: 'wrong1', text: '12', isCorrect: false },
      { id: 'wrong2', text: '17', isCorrect: false },
    ],
  },
  g3_log_exp: {
    title: '로그 계산 확인',
    prompt: 'log₂8의 값은?',
    options: [
      { id: 'correct', text: '3', isCorrect: true },
      { id: 'wrong1', text: '4', isCorrect: false },
      { id: 'wrong2', text: '2', isCorrect: false },
    ],
  },
  g3_conic: {
    title: '이차곡선 초점 확인',
    prompt: '포물선 y²=8x의 초점의 x좌표는?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'wrong1', text: '4', isCorrect: false },
      { id: 'wrong2', text: '8', isCorrect: false },
    ],
  },
  g3_limit: {
    title: '극한값 확인',
    prompt: 'lim(x→∞) (2x+1)/x의 값은?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'wrong1', text: '1', isCorrect: false },
      { id: 'wrong2', text: '∞', isCorrect: false },
    ],
  },
  g3_vector: {
    title: '벡터 내적 확인',
    prompt: '벡터 a=(3,4), b=(1,0)일 때 a·b는?',
    options: [
      { id: 'correct', text: '3', isCorrect: true },
      { id: 'wrong1', text: '7', isCorrect: false },
      { id: 'wrong2', text: '4', isCorrect: false },
    ],
  },
  g3_probability: {
    title: '조건부확률 확인',
    prompt: 'P(A)=0.4, P(A∩B)=0.2일 때 P(B|A)는?',
    options: [
      { id: 'correct', text: '0.5', isCorrect: true },
      { id: 'wrong1', text: '0.2', isCorrect: false },
      { id: 'wrong2', text: '0.8', isCorrect: false },
    ],
  },
  g3_space_geometry: {
    title: '정사영 길이 확인',
    prompt: '길이 4인 선분이 평면에 45°로 기울어져 있을 때 정사영의 길이는?',
    options: [
      { id: 'correct', text: '2√2', isCorrect: true },
      { id: 'wrong1', text: '4', isCorrect: false },
      { id: 'wrong2', text: '2', isCorrect: false },
    ],
  },
  g3_function: {
    title: '역함수 확인',
    prompt: 'f(x)=3x-1일 때 f⁻¹(5)는?',
    options: [
      { id: 'correct', text: '2', isCorrect: true },
      { id: 'wrong1', text: '14', isCorrect: false },
      { id: 'wrong2', text: '6', isCorrect: false },
    ],
  },
  g3_statistics: {
    title: '정규분포 표준화 확인',
    prompt: 'X~N(50, 4²)일 때 P(X≤58)을 구하려면 표준화 Z는?',
    options: [
      { id: 'correct', text: 'Z=2', isCorrect: true },
      { id: 'wrong1', text: 'Z=1.5', isCorrect: false },
      { id: 'wrong2', text: 'Z=8', isCorrect: false },
    ],
  },
  g1_geometry: {
    title: '피타고라스 정리 확인',
    prompt: '직각삼각형에서 두 변이 3, 4일 때 빗변의 길이는?',
    options: [
      { id: 'correct', text: '5', isCorrect: true },
      { id: 'wrong1', text: '7', isCorrect: false },
      { id: 'wrong2', text: '√7', isCorrect: false },
    ],
  },
  g3_counting: {
    title: '순열·조합 구분 확인',
    prompt: '5명 중 대표 2명을 뽑을 때 (순서 무관) 경우의 수는?',
    options: [
      { id: 'correct', text: '10', isCorrect: true },
      { id: 'wrong1', text: '20', isCorrect: false },
      { id: 'wrong2', text: '5', isCorrect: false },
    ],
  },
  g3_integral: {
    title: '정적분 계산 확인',
    prompt: '∫₀² 2x dx의 값은?',
    options: [
      { id: 'correct', text: '4', isCorrect: true },
      { id: 'wrong1', text: '2', isCorrect: false },
      { id: 'wrong2', text: '8', isCorrect: false },
    ],
  },
  g3_diff: {
    title: '합성함수 미분 확인',
    prompt: 'f(x)=(2x+1)³을 미분하면?',
    options: [
      { id: 'correct', text: '6(2x+1)²', isCorrect: true },
      { id: 'wrong1', text: '3(2x+1)²', isCorrect: false },
      { id: 'wrong2', text: '2(2x+1)³', isCorrect: false },
    ],
  },
```

---

- [ ] **Step 3: 누락 검증 블록 추가 (컴파일 타임 + 런타임)**

`checkPromptByWeakness` 객체 선언 바로 다음 줄(`;` 이후)에 아래 블록을 추가한다.

- **컴파일 타임**: `satisfies ReadonlyArray<WeaknessId>` → 오타 있는 약점 ID 즉시 에러
- **런타임**: `forEach` 체크 → 항목이 실제로 등록됐는지 모듈 로드 시 검증 (누락 시 앱 시작 시점에 throw)

```typescript
// 검증: 13개 약점 모두 checkPromptByWeakness에 등록 확인
// 컴파일 타임: WeaknessId에 없는 오타 → tsc 에러
// 런타임: checkPromptByWeakness에 실제로 없으면 → 모듈 로드 시 throw
const _requiredCheckNodeWeaknesses = [
  'g3_sequence',
  'g3_log_exp',
  'g3_conic',
  'g3_limit',
  'g3_vector',
  'g3_probability',
  'g3_space_geometry',
  'g3_function',
  'g3_statistics',
  'g1_geometry',
  'g3_counting',
  'g3_integral',
  'g3_diff',
] as const satisfies ReadonlyArray<WeaknessId>;

_requiredCheckNodeWeaknesses.forEach((id) => {
  if (!(id in checkPromptByWeakness)) {
    throw new Error(`[detailedDiagnosisFlows] checkPromptByWeakness missing entry: ${id}`);
  }
});
```

---

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (0 errors)

에러가 나면 원인 확인:
- `Type '"g3_xxx"' is not assignable` → 해당 weakness ID가 checkPromptByWeakness에 없거나 오타

---

- [ ] **Step 5: 정답 검증 테이블 수동 확인**

아래 표를 보며 추가한 코드의 각 항목이 정확한지 확인한다. `isCorrect: true`인 옵션의 텍스트와 풀이가 일치해야 한다.

| weakness | 정답 텍스트 | 풀이 |
|----------|-----------|------|
| g3_sequence | `'14'` | a₅ = 2 + (5-1)×3 = 14 |
| g3_log_exp | `'3'` | log₂8 = log₂2³ = 3 |
| g3_conic | `'2'` | y²=4px → 4p=8 → p=2, 초점 (2,0) |
| g3_limit | `'2'` | lim(2+1/x) = 2 |
| g3_vector | `'3'` | 3×1 + 4×0 = 3 |
| g3_probability | `'0.5'` | 0.2/0.4 = 0.5 |
| g3_space_geometry | `'2√2'` | 4×cos45° = 4×(√2/2) = 2√2 |
| g3_function | `'2'` | f⁻¹(5) = (5+1)/3 = 2 |
| g3_statistics | `'Z=2'` | (58-50)/4 = 2 |
| g1_geometry | `'5'` | √(3²+4²) = √25 = 5 |
| g3_counting | `'10'` | C(5,2) = 10 |
| g3_integral | `'4'` | [x²]₀² = 4 |
| g3_diff | `'6(2x+1)²'` | chain rule: 3(2x+1)²×2 = 6(2x+1)² |

각 항목에서:
- `isCorrect: true`인 옵션이 정확히 1개인지 확인
- 정답 텍스트가 위 표와 일치하는지 확인

불일치가 있으면 코드를 수정한다.

---

- [ ] **Step 6: 최종 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (0 errors)

---

- [ ] **Step 7: 커밋**

```bash
git add data/detailedDiagnosisFlows.ts
git commit -m "feat(diagnosis): checkPromptByWeakness에 g3_/g1_ 확인 문제 13개 추가 + 컴파일 타임 검증"
```
