# g2_q5 diagnosisMethods 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** G2 나머지정리 진단 문제(g2_q5)의 `diagnosisMethods`를 `polynomial`에서 `remainder_theorem`으로 수정해 올바른 약점 진단 흐름으로 연결한다.

**Architecture:** `data/problemData.ts`의 `g2_q5` 항목 한 줄 수정. `remainder_theorem`은 이미 `SolveMethodId`, `methodOptions`, `diagnosisTree`, `detailedDiagnosisFlows`에 모두 정의되어 있으므로 추가 파일 변경 없음.

**Tech Stack:** TypeScript, Expo/React Native

---

## 배경

`g2_q5`는 "f(x)를 (x-1)(x+2)로 나눈 나머지가 2x+1, f(1)은?" — 나머지정리 문제다.
현재 `diagnosisMethods: ['polynomial', 'unknown']`으로 설정되어 있어, G2 학생이 이 문제를 틀리면
"다항식 전개" 진단 흐름으로 안내된다. 실제로는 "나머지정리" 흐름이 맞다.

**비교:**
- G1 q5 (동일 유형): `diagnosisMethods: ['remainder_theorem', 'unknown']` ← 올바름
- G2 q5 (나머지정리): `diagnosisMethods: ['polynomial', 'unknown']` ← 잘못됨 (이번 수정 대상)

## 파일 구조

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `data/problemData.ts` | Modify (1줄) | `g2_q5.diagnosisMethods` 수정 |

---

## Task 1: g2_q5 diagnosisMethods 수정

**Files:**
- Modify: `data/problemData.ts:164` (g2_q5 항목의 `diagnosisMethods` 줄)

### 현재 상태 확인

- [ ] **Step 1: 수정 전 코드 확인**

`data/problemData.ts`에서 `g2_q5` 항목을 찾는다:

```ts
{
  id: 'g2_q5',
  grade: 'g2',
  question:
    '다항식 f(x)를 (x-1)(x+2)로 나누었을 때 나머지가 2x+1이었다. f(1)의 값은?',
  choices: ['1', '2', '3', '4', '5'],
  answerIndex: 2,
  topic: '나머지정리',
  diagnosisMethods: ['polynomial', 'unknown'],  // ← 수정 대상
},
```

### 수정

- [ ] **Step 2: diagnosisMethods 수정**

`data/problemData.ts`의 `g2_q5` 항목에서 아래 한 줄을 수정한다:

```ts
// 수정 전
diagnosisMethods: ['polynomial', 'unknown'],

// 수정 후
diagnosisMethods: ['remainder_theorem', 'unknown'],
```

### 검증

- [ ] **Step 3: 타입 체크 실행**

```bash
npm run typecheck
```

기대 출력: 에러 없음 (0 errors)

`remainder_theorem`은 이미 `SolveMethodId` 유니온 타입에 정의되어 있으므로 타입 에러가 발생하지 않아야 한다.

- [ ] **Step 4: 데이터 연결 흐름 수동 확인**

수정 후 다음 체인이 올바르게 연결되어 있는지 머릿속으로 추적한다:

```
getDiagnosticProblems('g2')
  → g2_q5.diagnosisMethods = ['remainder_theorem', 'unknown']
  → buildMethodOptions(problem)
  → methodOptions.filter(option => ['remainder_theorem', 'unknown'].includes(option.id))
  → diagnosisTree['remainder_theorem'] 흐름으로 진단 시작
  → 약점 후보: 'remainder_substitution_error', 'simultaneous_equation_error'
```

- `remainder_theorem`은 `methodOptions`에 존재함 ✓ (`diagnosisTree.ts:61`)
- `remainder_theorem`은 `diagnosisTree`에 존재함 ✓ (`diagnosisTree.ts:300`)
- `remainder_theorem`은 `diagnosisMethodRoutingCatalog`에 존재함 ✓
- `remainder_theorem`은 `detailedDiagnosisFlows`에 자동 생성됨 ✓

### 커밋

- [ ] **Step 5: 커밋**

```bash
git add data/problemData.ts
git commit -m "fix(data): G2 나머지정리 문제 diagnosisMethods를 remainder_theorem으로 수정

g2_q5는 나머지정리 문제인데 polynomial(다항식 전개)로 잘못 설정되어 있었음.
G1 q5(동일 유형)와 동일하게 remainder_theorem으로 수정."
```

---

## Self-Review

**Spec coverage:**
- [x] `g2_q5.diagnosisMethods` 수정 → Task 1 Step 2
- [x] 타입 안전성 검증 → Task 1 Step 3
- [x] 데이터 흐름 확인 → Task 1 Step 4

**Placeholder scan:** 없음. 모든 스텝에 실제 코드/커맨드 포함.

**Type consistency:** `remainder_theorem`은 `SolveMethodId` 타입에 정의된 리터럴 값. 오타 없음.

**범위:** 단일 파일, 단일 줄 수정. 다른 학년/문제에 영향 없음.
