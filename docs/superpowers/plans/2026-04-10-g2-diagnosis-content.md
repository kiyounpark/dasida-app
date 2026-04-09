# 고2 진단 콘텐츠 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3년치 고2 학력평가 출제 데이터 기반으로 g2_xxx WeaknessId 20개·진단 문제 10개·복습 콘텐츠를 추가하고, `g2 → g1 fallback`을 제거한다.

**Architecture:** `data/` 폴더의 정적 데이터 파일 4개만 수정한다. UI·훅·네비게이션은 변경하지 않는다. g3 패턴과 동일하게 `g2_xxx` prefix WeaknessId를 사용하고, 5개 신규 SolveMethodId(set/proposition/trig/integral/linear_eq)를 추가하며 기존 4개 method(polynomial/diff/radical/counting)에 g2 서브 선택지를 덧붙인다.

**Tech Stack:** TypeScript, 정적 데이터 파일

**스펙 문서:** `docs/superpowers/specs/2026-04-10-g2-diagnosis-content-design.md`

---

## 파일 맵

| 파일 | 변경 |
|------|------|
| `data/diagnosisMap.ts` | WeaknessId union + weaknessOrder + diagnosisMap에 g2_xxx 20개 추가 |
| `data/diagnosisTree.ts` | SolveMethodId union + methodOptions + diagnosisTree에 5개 신규·4개 확장 |
| `data/problemData.ts` | grade:'g2' 진단 문제 10개 추가, g1 fallback 제거 |
| `data/review-content-map.ts` | g2_xxx 약점 20개 복습 콘텐츠(heroPrompt + thinkingSteps) 추가 |

---

## Task 1: g2 WeaknessId 20개 추가 (`data/diagnosisMap.ts`)

**Files:**
- Modify: `data/diagnosisMap.ts`

- [ ] **Step 1: WeaknessId union에 g2_xxx 20개 추가**

`data/diagnosisMap.ts`의 `g3_space_geometry';` 바로 위에 아래 블록을 삽입한다.

```ts
  // 고2 공통
  | 'g2_set_operation'
  | 'g2_set_complement'
  | 'g2_set_count'
  | 'g2_prop_contrapositive'
  | 'g2_prop_necessary_sufficient'
  | 'g2_prop_quantifier'
  | 'g2_trig_unit_circle'
  | 'g2_trig_equation_range'
  | 'g2_trig_identity'
  | 'g2_poly_factoring'
  | 'g2_poly_remainder'
  | 'g2_eq_setup'
  | 'g2_radical_simplify'
  | 'g2_radical_rationalize'
  | 'g2_diff_application'
  | 'g2_integral_basic'
  | 'g2_counting_method'
  | 'g2_counting_overcounting'
  | 'g2_inequality_range'
  | 'g2_function_domain'
```

결과적으로 WeaknessId 타입은 `| 'g2_function_domain'\n  // 고3 기하 특화\n  | 'g3_vector'` 순서가 된다.

- [ ] **Step 2: weaknessOrder 배열에 g2_xxx 20개 추가**

`weaknessOrder` 배열의 `'g3_diff',` 바로 위에 아래를 삽입한다.

```ts
  // 고2
  'g2_set_operation',
  'g2_set_complement',
  'g2_set_count',
  'g2_prop_contrapositive',
  'g2_prop_necessary_sufficient',
  'g2_prop_quantifier',
  'g2_trig_unit_circle',
  'g2_trig_equation_range',
  'g2_trig_identity',
  'g2_poly_factoring',
  'g2_poly_remainder',
  'g2_eq_setup',
  'g2_radical_simplify',
  'g2_radical_rationalize',
  'g2_diff_application',
  'g2_integral_basic',
  'g2_counting_method',
  'g2_counting_overcounting',
  'g2_inequality_range',
  'g2_function_domain',
```

- [ ] **Step 3: diagnosisMap에 g2_xxx 20개 항목 추가**

`diagnosisMap` 객체의 `g3_diff:` 항목 바로 위에 아래 블록을 삽입한다.

```ts
  // ─── 고2 공통 ────────────────────────────────────────────────────
  g2_set_operation: {
    id: 'g2_set_operation',
    labelKo: '집합 연산 오류',
    topicLabel: '집합',
    desc: '합집합·교집합 계산에서 원소 중복 처리나 연산 순서를 잘못 적용했습니다.',
    tip: 'A∪B는 두 집합의 모든 원소, A∩B는 공통 원소임을 벤 다이어그램으로 먼저 그려보세요.',
  },
  g2_set_complement: {
    id: 'g2_set_complement',
    labelKo: '여집합 범위 혼동',
    topicLabel: '집합',
    desc: '전체집합 U에서 여집합 A^c의 범위를 잘못 설정했습니다.',
    tip: 'A^c = U - A임을 먼저 확인하고, 전체집합 U의 범위를 명시적으로 적어보세요.',
  },
  g2_set_count: {
    id: 'g2_set_count',
    labelKo: '원소 개수 계산 오류',
    topicLabel: '집합',
    desc: 'n(A∪B) = n(A)+n(B)-n(A∩B) 공식 적용에서 중복 원소를 빠뜨리거나 더 뺐습니다.',
    tip: '공식을 쓰기 전에 n(A∩B)를 먼저 구하고, 중복된 원소를 딱 한 번만 빼는지 확인하세요.',
  },
  g2_prop_contrapositive: {
    id: 'g2_prop_contrapositive',
    labelKo: '역·이·대우 혼동',
    topicLabel: '명제',
    desc: 'p→q의 역(q→p), 이(~p→~q), 대우(~q→~p)를 혼동했습니다.',
    tip: '대우는 가설과 결론을 모두 부정하고 순서를 바꾼다. 역·이·대우 표를 직접 채워보세요.',
  },
  g2_prop_necessary_sufficient: {
    id: 'g2_prop_necessary_sufficient',
    labelKo: '필요충분조건 오류',
    topicLabel: '명제',
    desc: 'p→q와 q→p 방향을 모두 확인하지 않고 필요·충분 조건을 결정했습니다.',
    tip: 'p이면 q인가(충분), q이면 p인가(필요) 두 방향을 각각 화살표로 그려보세요.',
  },
  g2_prop_quantifier: {
    id: 'g2_prop_quantifier',
    labelKo: '전칭·존재 명제 혼동',
    topicLabel: '명제',
    desc: '"모든 x에 대해"와 "어떤 x에 대해" 명제를 구별하지 못했습니다.',
    tip: '전칭 명제는 반례 하나로 거짓, 존재 명제는 예시 하나로 참임을 기억하세요.',
  },
  g2_trig_unit_circle: {
    id: 'g2_trig_unit_circle',
    labelKo: '단위원 좌표 혼동',
    topicLabel: '삼각함수',
    desc: '각도 θ에서 sinθ·cosθ·tanθ 값을 단위원 좌표에서 잘못 읽었습니다.',
    tip: '단위원에서 x좌표=cosθ, y좌표=sinθ임을 먼저 확인하고 사분면 부호를 결정하세요.',
  },
  g2_trig_equation_range: {
    id: 'g2_trig_equation_range',
    labelKo: '삼각방정식 범위 오류',
    topicLabel: '삼각함수',
    desc: '삼각방정식의 해를 구할 때 주어진 각도 범위를 벗어난 해를 포함하거나 누락했습니다.',
    tip: '단위원에서 조건을 만족하는 각도를 모두 찾은 뒤, 범위에 해당하는 것만 선택하세요.',
  },
  g2_trig_identity: {
    id: 'g2_trig_identity',
    labelKo: '삼각함수 항등식 오류',
    topicLabel: '삼각함수',
    desc: 'sin²θ+cos²θ=1, tanθ=sinθ/cosθ 등 기본 항등식을 잘못 적용했습니다.',
    tip: '항등식을 쓰기 전에 sinθ·cosθ·tanθ의 관계를 한 줄로 먼저 적어보세요.',
  },
  g2_poly_factoring: {
    id: 'g2_poly_factoring',
    labelKo: '인수분해 패턴 누락',
    topicLabel: '다항식',
    desc: '고차 다항식에서 인수분해 공식(인수정리 활용, 치환 등)을 떠올리지 못했습니다.',
    tip: '상수항의 약수를 대입해 근을 찾고, 조립제법으로 인수를 하나씩 꺼내는 흐름을 연습하세요.',
  },
  g2_poly_remainder: {
    id: 'g2_poly_remainder',
    labelKo: '나머지정리 적용 오류',
    topicLabel: '다항식',
    desc: 'f(x)를 (x-a)로 나눈 나머지가 f(a)임을 잘못 적용하거나 인수정리 조건을 혼동했습니다.',
    tip: '나머지 = f(나누는 식의 근) 임을 먼저 확인하고, 조건식에 대입하는 순서를 지키세요.',
  },
  g2_eq_setup: {
    id: 'g2_eq_setup',
    labelKo: '방정식 세우기·순서 오류',
    topicLabel: '방정식',
    desc: '조건을 방정식으로 변환하는 단계 또는 풀이 순서(근 구하기 → 검증)를 잘못 설정했습니다.',
    tip: '구하는 값을 x로 놓고, 주어진 조건을 하나씩 식으로 적은 뒤 풀이 순서를 정리하세요.',
  },
  g2_radical_simplify: {
    id: 'g2_radical_simplify',
    labelKo: '무리식 간소화 오류',
    topicLabel: '무리수',
    desc: '√a·√b = √(ab), √(a²) = |a| 등 무리식 간소화 규칙을 잘못 적용했습니다.',
    tip: '근호 안 숫자를 소인수분해하여 제곱수를 꺼내는 순서를 단계별로 적어보세요.',
  },
  g2_radical_rationalize: {
    id: 'g2_radical_rationalize',
    labelKo: '유리화 계산 오류',
    topicLabel: '무리수',
    desc: '분모의 무리수를 유리화할 때 켤레식을 잘못 곱하거나 전개에서 실수했습니다.',
    tip: '분모가 a+√b 형태면 켤레 a-√b를 분자·분모 모두 곱하고, 분모 전개 결과를 먼저 확인하세요.',
  },
  g2_diff_application: {
    id: 'g2_diff_application',
    labelKo: '미분 활용 오류',
    topicLabel: '미분',
    desc: "f'(x)=0의 해를 구한 뒤 증감표로 최댓값·최솟값을 결정하는 단계에서 오류가 발생했습니다.",
    tip: "f'(x)=0의 x값 → 증감표 작성 → 극값 결정의 3단계를 순서대로 적어보세요.",
  },
  g2_integral_basic: {
    id: 'g2_integral_basic',
    labelKo: '정적분 계산 오류',
    topicLabel: '적분',
    desc: '∫xⁿdx = xⁿ⁺¹/(n+1)+C 적용 또는 정적분 [F(x)]_a^b = F(b)-F(a) 계산에서 실수했습니다.',
    tip: '부정적분을 먼저 구하고, 위 끝값에서 아래 끝값을 빼는 순서를 한 줄씩 적어보세요.',
  },
  g2_counting_method: {
    id: 'g2_counting_method',
    labelKo: '경우의 수 방법 선택 오류',
    topicLabel: '경우의 수',
    desc: '순열·조합·곱의 법칙·합의 법칙 중 어느 방법을 써야 하는지 잘못 판단했습니다.',
    tip: '순서가 있으면 순열(P), 없으면 조합(C). 독립 사건은 곱, 배타 사건은 합임을 먼저 확인하세요.',
  },
  g2_counting_overcounting: {
    id: 'g2_counting_overcounting',
    labelKo: '중복 계산 오류',
    topicLabel: '경우의 수',
    desc: '조건이 겹치는 경우를 중복으로 세거나 빠뜨렸습니다.',
    tip: '포함-배제 원리: n(A∪B) = n(A)+n(B)-n(A∩B). 겹치는 케이스를 명시적으로 표시하세요.',
  },
  g2_inequality_range: {
    id: 'g2_inequality_range',
    labelKo: '이차부등식 범위 오류',
    topicLabel: '부등식',
    desc: '이차부등식을 풀 때 a의 부호에 따른 포물선 방향을 잘못 적용하거나 해의 범위를 반대로 썼습니다.',
    tip: 'ax²+bx+c>0의 해: a>0이면 근의 바깥, a<0이면 근의 안쪽임을 그래프로 먼저 그려보세요.',
  },
  g2_function_domain: {
    id: 'g2_function_domain',
    labelKo: '정의역·치역 혼동',
    topicLabel: '함수',
    desc: '합성함수나 역함수의 정의역·치역을 잘못 설정하거나 함수 성립 조건을 확인하지 못했습니다.',
    tip: '합성함수 f∘g는 g 결과가 f의 정의역 안에 있어야 함. 단계별로 범위를 확인하세요.',
  },
```

- [ ] **Step 4: typecheck 실행**

```bash
npm run typecheck
```

Expected: 에러 없음. `diagnosisMap` 객체가 `Record<WeaknessId, DiagnosisItem>` 타입을 만족해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add data/diagnosisMap.ts
git commit -m "feat(g2): WeaknessId g2_xxx 20개 추가 — diagnosisMap"
```

---

## Task 2: SolveMethodId 확장 (`data/diagnosisTree.ts`)

**Files:**
- Modify: `data/diagnosisTree.ts`

- [ ] **Step 1: SolveMethodId union에 5개 신규 추가**

`diagnosisTree.ts`의 `| 'counting';` 바로 위에 삽입한다.

```ts
  | 'set'
  | 'proposition'
  | 'trig'
  | 'integral'
  | 'linear_eq'
```

결과: `| 'linear_eq'\n  | 'counting';`

- [ ] **Step 2: methodOptions에 5개 항목 추가**

`{ id: 'unknown', labelKo: '잘 모르겠어' },` 바로 위에 삽입한다.

```ts
  { id: 'set', labelKo: '집합 연산' },
  { id: 'proposition', labelKo: '명제 판별' },
  { id: 'trig', labelKo: '삼각함수' },
  { id: 'integral', labelKo: '적분' },
  { id: 'linear_eq', labelKo: '부등식·함수' },
```

- [ ] **Step 3: diagnosisTree에 신규 5개 method 항목 추가**

`counting:` 항목 바로 뒤, `};` 닫기 전에 삽입한다.

```ts
  set: {
    methodId: 'set',
    prompt: '집합 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'set_operation',
        text: '합집합·교집합 계산에서 원소를 잘못 셌어요.',
        weaknessId: 'g2_set_operation',
      },
      {
        id: 'set_complement',
        text: '여집합 범위를 잘못 잡았어요.',
        weaknessId: 'g2_set_complement',
      },
      {
        id: 'set_count',
        text: 'n(A∪B) 공식에서 중복 원소 처리가 헷갈렸어요.',
        weaknessId: 'g2_set_count',
      },
    ],
  },
  proposition: {
    methodId: 'proposition',
    prompt: '명제 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'prop_contrapositive',
        text: '역·이·대우 중 어느 것인지 헷갈렸어요.',
        weaknessId: 'g2_prop_contrapositive',
      },
      {
        id: 'prop_necessary_sufficient',
        text: '필요조건·충분조건 구분이 어려웠어요.',
        weaknessId: 'g2_prop_necessary_sufficient',
      },
      {
        id: 'prop_quantifier',
        text: '"모든"과 "어떤" 명제 판단이 헷갈렸어요.',
        weaknessId: 'g2_prop_quantifier',
      },
    ],
  },
  trig: {
    methodId: 'trig',
    prompt: '삼각함수 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'trig_unit_circle',
        text: '단위원에서 sinθ·cosθ 값을 읽는 게 헷갈렸어요.',
        weaknessId: 'g2_trig_unit_circle',
      },
      {
        id: 'trig_equation_range',
        text: '삼각방정식의 해 범위를 잘못 설정했어요.',
        weaknessId: 'g2_trig_equation_range',
      },
      {
        id: 'trig_identity',
        text: '삼각함수 항등식 적용에서 막혔어요.',
        weaknessId: 'g2_trig_identity',
      },
    ],
  },
  integral: {
    methodId: 'integral',
    prompt: '적분 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'integral_basic',
        text: '부정적분 공식 적용에서 실수했어요.',
        weaknessId: 'g2_integral_basic',
      },
      {
        id: 'integral_definite',
        text: 'F(b)-F(a) 계산에서 끝값 대입을 잘못했어요.',
        weaknessId: 'g2_integral_basic',
      },
      {
        id: 'integral_diff',
        text: '적분보다 미분 활용(최댓·최솟값) 단계에서 막혔어요.',
        weaknessId: 'g2_diff_application',
      },
    ],
  },
  linear_eq: {
    methodId: 'linear_eq',
    prompt: '부등식·함수 문제에서 어디가 가장 어려웠나요?',
    choices: [
      {
        id: 'linear_eq_range',
        text: '이차부등식 해의 범위를 반대로 썼어요.',
        weaknessId: 'g2_inequality_range',
      },
      {
        id: 'linear_eq_domain',
        text: '함수의 정의역·치역 설정이 헷갈렸어요.',
        weaknessId: 'g2_function_domain',
      },
      {
        id: 'linear_eq_setup',
        text: '조건을 방정식·부등식으로 세우는 단계가 막혔어요.',
        weaknessId: 'g2_eq_setup',
      },
    ],
  },
```

- [ ] **Step 4: 기존 4개 method에 g2 서브선택지 추가**

각 기존 method의 `choices` 배열 끝에 아래 항목들을 추가한다.

**`polynomial` choices 배열 끝에:**
```ts
      {
        id: 'g2_poly_factoring',
        text: '고차 다항식 인수분해 패턴이 안 떠올랐어요.',
        weaknessId: 'g2_poly_factoring',
      },
      {
        id: 'g2_poly_remainder',
        text: '나머지정리를 어디에 어떻게 쓰는지 헷갈렸어요.',
        weaknessId: 'g2_poly_remainder',
      },
```

**`diff` choices 배열 끝에:**
```ts
      {
        id: 'g2_diff_application',
        text: '증감표 작성 후 최댓·최솟값 결정에서 막혔어요.',
        weaknessId: 'g2_diff_application',
      },
```

**`radical` choices 배열 끝에:**
```ts
      {
        id: 'g2_radical_simplify',
        text: '근호 안 수를 간소화하는 단계가 헷갈렸어요.',
        weaknessId: 'g2_radical_simplify',
      },
      {
        id: 'g2_radical_rationalize',
        text: '켤레식으로 유리화하는 계산에서 실수했어요.',
        weaknessId: 'g2_radical_rationalize',
      },
```

**`counting` choices 배열 끝에:**
```ts
      {
        id: 'g2_counting_method',
        text: '순열·조합·곱·합 중 어느 방법을 써야 할지 헷갈렸어요.',
        weaknessId: 'g2_counting_method',
      },
      {
        id: 'g2_counting_overcounting',
        text: '겹치는 경우를 중복으로 세거나 빠뜨렸어요.',
        weaknessId: 'g2_counting_overcounting',
      },
```

- [ ] **Step 5: typecheck 실행**

```bash
npm run typecheck
```

Expected: 에러 없음. `diagnosisTree`가 `Record<SolveMethodId, DiagnosisMethodStep>`을 만족해야 한다.

- [ ] **Step 6: 커밋**

```bash
git add data/diagnosisTree.ts
git commit -m "feat(g2): SolveMethodId 5개 신규·4개 확장 — diagnosisTree"
```

---

## Task 3: g2 진단 문제 10개 추가 + fallback 제거 (`data/problemData.ts`)

**Files:**
- Modify: `data/problemData.ts`

- [ ] **Step 1: g2 진단 문제 10개 추가**

`problemData` 배열의 g3 문제들 앞, 즉 첫 번째 `grade: 'g3'` 항목 바로 위에 삽입한다.

```ts
  // ─── 고2 공통 ────────────────────────────────────────────────────
  {
    id: 'g2_q1',
    grade: 'g2',
    question:
      '집합 A={1,2,3,4,5}, B={2,4,6}일 때, n(A∪B) - n(A∩B)의 값은?',
    choices: ['2', '3', '4', '5', '6'],
    answerIndex: 2,
    topic: '집합',
    diagnosisMethods: ['set', 'unknown'],
  },
  {
    id: 'g2_q2',
    grade: 'g2',
    question:
      '명제 "소수이면 홀수이다"의 역은?',
    choices: [
      '소수이면 홀수이다',
      '홀수이면 소수이다',
      '소수가 아니면 홀수가 아니다',
      '홀수가 아니면 소수가 아니다',
      '소수이면 홀수가 아니다',
    ],
    answerIndex: 1,
    topic: '명제',
    diagnosisMethods: ['proposition', 'unknown'],
  },
  {
    id: 'g2_q3',
    grade: 'g2',
    question:
      '다음 중 참인 명제는?',
    choices: [
      'x>0이면 x²>x이다',
      '모든 실수 x에 대해 x²≥0이다',
      'x²>0이면 x>0이다',
      '모든 정수 n에 대해 n²은 홀수이다',
      'x+y>0이면 x>0이고 y>0이다',
    ],
    answerIndex: 1,
    topic: '명제',
    diagnosisMethods: ['proposition', 'unknown'],
  },
  {
    id: 'g2_q4',
    grade: 'g2',
    question: 'sin(150°)의 값은?',
    choices: ['-√3/2', '-1/2', '0', '1/2', '√3/2'],
    answerIndex: 3,
    topic: '삼각함수',
    diagnosisMethods: ['trig', 'unknown'],
  },
  {
    id: 'g2_q5',
    grade: 'g2',
    question:
      '다항식 f(x)를 (x-1)(x+2)로 나누었을 때 나머지가 2x+1이었다. f(1)의 값은?',
    choices: ['1', '2', '3', '4', '5'],
    answerIndex: 2,
    topic: '나머지정리',
    diagnosisMethods: ['polynomial', 'unknown'],
  },
  {
    id: 'g2_q6',
    grade: 'g2',
    question:
      'x에 대한 방정식 x²-4x+k=0이 허근을 가질 때, 정수 k의 최솟값은?',
    choices: ['3', '4', '5', '6', '7'],
    answerIndex: 2,
    topic: '방정식',
    diagnosisMethods: ['diff', 'unknown'],
  },
  {
    id: 'g2_q7',
    grade: 'g2',
    question: '√18 - √8 + √2의 값은?',
    choices: ['√2', '2√2', '3√2', '4√2', '5√2'],
    answerIndex: 1,
    topic: '무리수',
    diagnosisMethods: ['radical', 'unknown'],
  },
  {
    id: 'g2_q8',
    grade: 'g2',
    question:
      '5명 중에서 회장 1명, 부회장 1명을 선출하는 방법의 수는?',
    choices: ['10', '15', '20', '25', '30'],
    answerIndex: 2,
    topic: '경우의 수',
    diagnosisMethods: ['counting', 'unknown'],
  },
  {
    id: 'g2_q9',
    grade: 'g2',
    question: '∫₀² (3x²-2x+1)dx의 값은?',
    choices: ['4', '5', '6', '7', '8'],
    answerIndex: 2,
    topic: '적분',
    diagnosisMethods: ['integral', 'unknown'],
  },
  {
    id: 'g2_q10',
    grade: 'g2',
    question: 'x에 대한 이차부등식 x²-3x-4<0의 해는?',
    choices: [
      'x<-1 또는 x>4',
      '-4<x<1',
      '-1<x<4',
      'x<-4 또는 x>1',
      'x≥-1 또는 x≤4',
    ],
    answerIndex: 2,
    topic: '부등식',
    diagnosisMethods: ['linear_eq', 'unknown'],
  },
```

- [ ] **Step 2: g1 fallback 로직 제거**

`getDiagnosticProblems` 함수에서 아래 두 줄을 찾아서:

```ts
  // g2는 아직 전용 콘텐츠가 없으므로 g1 fallback
  const effectiveGrade = grade === 'g2' || grade === 'unknown' ? 'g1' : grade;
```

아래로 교체한다:

```ts
  const effectiveGrade = grade === 'unknown' ? 'g1' : grade;
```

그리고 `filter` 내부의 `effectiveGrade` 참조를 확인한다. `p.grade !== effectiveGrade` 조건은 그대로 유지된다.

- [ ] **Step 3: typecheck 실행**

```bash
npm run typecheck
```

Expected: 에러 없음.

- [ ] **Step 4: 진단 문제 필터링 수동 검증**

```bash
node -e "
const { getDiagnosticProblems } = require('./data/problemData.ts');
// TSX 환경이므로 typecheck로 대체; 아래 확인은 앱에서 시뮬레이터로 진행
console.log('g2 문제 수:', getDiagnosticProblems('g2').length); // 기대값: 10
console.log('g1 문제 수:', getDiagnosticProblems('g1').length); // 기대값: 기존 문제 수 유지
"
```

> 참고: 위 node 실행이 어려우면 시뮬레이터에서 고2 계정으로 진단 화면 진입하여 문제 10개가 표시되는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add data/problemData.ts
git commit -m "feat(g2): 진단 문제 10개 추가 + g1 fallback 제거"
```

---

## Task 4: g2 복습 콘텐츠 20개 추가 (`data/review-content-map.ts`)

**Files:**
- Modify: `data/review-content-map.ts`

> 참고: `ThinkingStep` 타입은 `choices: Array<{ text: string; correct: boolean }>` 필드가 필수다. 각 step에 3개의 choices가 있어야 한다.

- [ ] **Step 1: g2 복습 콘텐츠 20개 추가**

`reviewContentMap` 객체의 마지막 항목(`counting_overcounting:` 또는 최하단 항목) 뒤, `};` 닫기 전에 삽입한다.

```ts
  // ─── 고2 공통 ────────────────────────────────────────────────────
  g2_set_operation: {
    heroPrompt: '합집합과 교집합 계산에서 원소를 세는 순서를 다시 떠올려볼게요.',
    thinkingSteps: [
      {
        title: '두 집합 원소 나열',
        body: 'A와 B의 원소를 각각 적고, 공통 원소를 먼저 찾는다.',
        example: '예) A={1,2,3}, B={2,3,4} → 공통: {2,3}',
        choices: [
          { text: '공통 원소를 먼저 찾아야 한다', correct: true },
          { text: '두 집합을 그냥 합쳐서 세면 된다', correct: false },
          { text: '원소 개수만 더하면 된다', correct: false },
        ],
      },
      {
        title: '합집합 구성',
        body: 'A∪B는 A와 B의 모든 원소를 중복 없이 모은 집합이다.',
        example: '예) A∪B = {1,2,3,4}',
        choices: [
          { text: '중복 원소는 한 번만 쓴다', correct: true },
          { text: '중복 원소는 두 번 써야 한다', correct: false },
          { text: '합집합은 더 큰 집합만 가리킨다', correct: false },
        ],
      },
      {
        title: 'n(A∪B) 공식 적용',
        body: 'n(A∪B) = n(A) + n(B) - n(A∩B)로 원소 개수를 계산한다.',
        example: '예) n(A)=3, n(B)=3, n(A∩B)=2 → n(A∪B)=4',
        choices: [
          { text: '공통 원소 개수를 한 번 뺀다', correct: true },
          { text: '공통 원소 개수를 더한다', correct: false },
          { text: '공통 원소가 없어도 빼야 한다', correct: false },
        ],
      },
    ],
  },
  g2_set_complement: {
    heroPrompt: '여집합을 구할 때 전체집합 U를 기준으로 생각하는 흐름을 확인해볼게요.',
    thinkingSteps: [
      {
        title: '전체집합 U 확인',
        body: '문제에서 전체집합 U가 무엇인지 먼저 명시적으로 적는다.',
        example: '예) U={1,2,3,4,5,6}',
        choices: [
          { text: 'U를 먼저 확인해야 한다', correct: true },
          { text: 'U 없이 여집합을 바로 구할 수 있다', correct: false },
          { text: 'U는 항상 자연수 전체이다', correct: false },
        ],
      },
      {
        title: 'A의 원소 제거',
        body: 'A^c = U에서 A의 원소를 모두 제거한 나머지 집합이다.',
        example: '예) A={2,4} → A^c = {1,3,5,6}',
        choices: [
          { text: 'U에서 A를 빼면 A^c가 된다', correct: true },
          { text: 'A에서 U를 빼면 A^c가 된다', correct: false },
          { text: 'A^c는 A의 원소를 뒤집은 것이다', correct: false },
        ],
      },
      {
        title: '검증',
        body: 'A와 A^c를 합하면 반드시 U가 되어야 한다.',
        example: '예) A∪A^c = {1,2,3,4,5,6} = U 확인',
        choices: [
          { text: 'A와 A^c를 합치면 U가 된다', correct: true },
          { text: 'A와 A^c의 교집합이 U이다', correct: false },
          { text: 'A와 A^c의 원소 개수는 항상 같다', correct: false },
        ],
      },
    ],
  },
  g2_set_count: {
    heroPrompt: '원소 개수 공식 n(A∪B) = n(A)+n(B)-n(A∩B)를 단계별로 적용해볼게요.',
    thinkingSteps: [
      {
        title: 'n(A∩B) 먼저',
        body: '공식에서 빼야 하는 n(A∩B)를 먼저 구한다.',
        example: '예) A={1,2,3,4}, B={3,4,5} → n(A∩B)=2',
        choices: [
          { text: 'n(A∩B)를 먼저 구해야 한다', correct: true },
          { text: 'n(A∪B)를 먼저 세면 된다', correct: false },
          { text: 'n(A)와 n(B)만 알면 충분하다', correct: false },
        ],
      },
      {
        title: '공식 대입',
        body: 'n(A∪B) = n(A)+n(B)-n(A∩B)에 각 값을 대입한다.',
        example: '예) 4+3-2 = 5',
        choices: [
          { text: 'n(A∩B)를 한 번만 뺀다', correct: true },
          { text: 'n(A∩B)를 두 번 뺀다', correct: false },
          { text: 'n(A∩B)를 더한다', correct: false },
        ],
      },
      {
        title: '검증',
        body: '결과가 max(n(A), n(B)) 이상이고 n(A)+n(B) 이하인지 확인한다.',
        example: '예) n(A∪B)=5: 4≤5≤7 ✓',
        choices: [
          { text: 'n(A∪B) ≤ n(A)+n(B)이어야 한다', correct: true },
          { text: 'n(A∪B)는 항상 n(A)+n(B)와 같다', correct: false },
          { text: 'n(A∪B)는 두 집합 중 작은 것보다 작을 수 있다', correct: false },
        ],
      },
    ],
  },
  g2_prop_contrapositive: {
    heroPrompt: '역·이·대우 중 어느 것인지 헷갈릴 때는 표를 직접 채워보는 게 가장 빠릅니다.',
    thinkingSteps: [
      {
        title: 'p→q 원래 명제 확인',
        body: '주어진 명제에서 가설 p와 결론 q를 분리한다.',
        example: '예) "소수이면 홀수이다" → p:소수, q:홀수',
        choices: [
          { text: '가설과 결론을 먼저 분리한다', correct: true },
          { text: '명제 전체를 통째로 뒤집는다', correct: false },
          { text: 'p와 q의 구분은 중요하지 않다', correct: false },
        ],
      },
      {
        title: '역·이·대우 정의 적용',
        body: '역: q→p, 이: ~p→~q, 대우: ~q→~p',
        example: '역: "홀수이면 소수이다" / 대우: "홀수가 아니면 소수가 아니다"',
        choices: [
          { text: '대우는 p와 q를 모두 부정하고 순서를 바꾼다', correct: true },
          { text: '역은 p와 q를 모두 부정한다', correct: false },
          { text: '이는 p와 q의 순서만 바꾼다', correct: false },
        ],
      },
      {
        title: '참·거짓 관계',
        body: '원명제와 대우는 항상 참·거짓이 같다. 역과 이도 서로 참·거짓이 같다.',
        example: '원명제 참 → 대우 참 / 역은 별도 판단',
        choices: [
          { text: '원명제가 참이면 대우도 참이다', correct: true },
          { text: '원명제가 참이면 역도 반드시 참이다', correct: false },
          { text: '원명제와 이는 항상 참·거짓이 같다', correct: false },
        ],
      },
    ],
  },
  g2_prop_necessary_sufficient: {
    heroPrompt: '필요조건·충분조건은 화살표 방향으로 정리하면 헷갈리지 않아요.',
    thinkingSteps: [
      {
        title: 'p→q 화살표 방향 확인',
        body: 'p→q가 참이면 p는 q의 충분조건, q는 p의 필요조건이다.',
        example: '예) "정삼각형 → 이등변삼각형": 정삼각형은 이등변삼각형의 충분조건',
        choices: [
          { text: 'p→q이면 p가 충분조건이다', correct: true },
          { text: 'p→q이면 p가 필요조건이다', correct: false },
          { text: '화살표 방향은 조건 판단과 무관하다', correct: false },
        ],
      },
      {
        title: '역방향 q→p 확인',
        body: 'q→p도 참이면 p와 q는 서로 필요충분조건(동치)이다.',
        example: '예) 이등변삼각형이 정삼각형은 아니므로 q→p는 거짓 → 충분조건만',
        choices: [
          { text: '두 방향 모두 참이어야 필요충분조건이다', correct: true },
          { text: '한 방향만 참이어도 필요충분조건이다', correct: false },
          { text: '필요충분조건은 반례가 있어도 성립한다', correct: false },
        ],
      },
      {
        title: '결론 도출',
        body: '화살표 방향을 정리하여 필요조건·충분조건·필요충분조건 중 하나를 선택한다.',
        example: 'p→q만 참: p는 충분조건, q는 필요조건',
        choices: [
          { text: 'p→q만 참이면 p는 충분조건, q는 필요조건이다', correct: true },
          { text: 'p→q만 참이면 p는 필요조건이다', correct: false },
          { text: '두 방향 중 하나만 참이면 동치이다', correct: false },
        ],
      },
    ],
  },
  g2_prop_quantifier: {
    heroPrompt: '"모든"과 "어떤" 명제를 판별할 때는 반례 또는 예시 하나로 판단할 수 있어요.',
    thinkingSteps: [
      {
        title: '명제 유형 파악',
        body: '"모든 x에 대해 P(x)"는 전칭 명제, "어떤 x에 대해 P(x)"는 존재 명제이다.',
        example: '"모든 실수 x에 대해 x²≥0" vs "어떤 실수 x에 대해 x²<0"',
        choices: [
          { text: '"모든"은 전칭, "어떤"은 존재 명제이다', correct: true },
          { text: '"어떤"은 전칭, "모든"은 존재 명제이다', correct: false },
          { text: '두 유형은 판별 방법이 같다', correct: false },
        ],
      },
      {
        title: '거짓/참 판별 전략',
        body: '전칭 명제는 반례 하나로 거짓. 존재 명제는 예시 하나로 참.',
        example: '"모든 정수 n에서 n²은 짝수" → n=1: 1²=1(홀수) → 반례 → 거짓',
        choices: [
          { text: '전칭 명제는 반례 하나로 거짓이 된다', correct: true },
          { text: '전칭 명제는 예시 하나로 참이 된다', correct: false },
          { text: '존재 명제는 반례로 참을 판별한다', correct: false },
        ],
      },
      {
        title: '부정 명제 확인',
        body: '"모든 x에 대해 P(x)"의 부정은 "어떤 x에 대해 ~P(x)"이다.',
        example: '"모든 x: x²≥0"의 부정 → "어떤 x: x²<0"',
        choices: [
          { text: '"모든"의 부정은 "어떤 ~"이다', correct: true },
          { text: '"모든"의 부정은 "모든 ~"이다', correct: false },
          { text: '전칭 명제의 부정은 전칭 명제이다', correct: false },
        ],
      },
    ],
  },
  g2_trig_unit_circle: {
    heroPrompt: '삼각함수 단위원에서 좌표를 읽는 방법을 다시 떠올려볼게요.',
    thinkingSteps: [
      {
        title: '단위원의 기본',
        body: '각도 θ에서 단위원 위 점의 좌표는 (cosθ, sinθ)이다.',
        example: '예) θ=90° → (cos90°, sin90°) = (0, 1)',
        choices: [
          { text: 'x좌표=cosθ, y좌표=sinθ이다', correct: true },
          { text: 'x좌표=sinθ, y좌표=cosθ이다', correct: false },
          { text: '좌표는 각도와 무관하다', correct: false },
        ],
      },
      {
        title: '사분면 부호 판단',
        body: '각도가 속한 사분면에 따라 sin·cos·tan의 부호가 결정된다.',
        example: '2사분면: sinθ>0, cosθ<0, tanθ<0',
        choices: [
          { text: '사분면을 먼저 확인하고 부호를 결정한다', correct: true },
          { text: '부호는 항상 양수이다', correct: false },
          { text: '사분면은 값에 영향을 주지 않는다', correct: false },
        ],
      },
      {
        title: '특수각 값 적용',
        body: '30°·45°·60°의 sin·cos값을 기억에서 꺼내 대입한다.',
        example: 'sin30°=1/2, cos30°=√3/2, sin45°=√2/2',
        choices: [
          { text: '특수각 값을 외워두어야 한다', correct: true },
          { text: '특수각 값은 매번 계산한다', correct: false },
          { text: '특수각 외 각도는 같은 값을 쓴다', correct: false },
        ],
      },
    ],
  },
  g2_trig_equation_range: {
    heroPrompt: '삼각방정식 풀이에서 범위 설정이 핵심입니다. 단위원에서 해를 모두 찾아볼게요.',
    thinkingSteps: [
      {
        title: '기본 해 구하기',
        body: '단위원에서 주어진 삼각함수 값을 만족하는 각도를 먼저 찾는다.',
        example: 'sinθ=1/2 → θ=30° (1사분면 기본각)',
        choices: [
          { text: '기본각을 먼저 구한다', correct: true },
          { text: '범위부터 먼저 확인한다', correct: false },
          { text: '해는 항상 하나이다', correct: false },
        ],
      },
      {
        title: '대칭 해 추가',
        body: '단위원의 대칭성으로 같은 값을 갖는 각도를 추가로 찾는다.',
        example: 'sinθ=1/2 → 1사분면 30°, 2사분면 150° (두 해)',
        choices: [
          { text: '대칭 각도를 추가로 찾아야 한다', correct: true },
          { text: '기본각 하나만으로 충분하다', correct: false },
          { text: '대칭 해는 항상 존재하지 않는다', correct: false },
        ],
      },
      {
        title: '주어진 범위로 필터링',
        body: '찾은 해 중 문제에서 주어진 θ의 범위에 해당하는 것만 최종 답으로 선택한다.',
        example: '0≤θ<2π → 30°(=π/6), 150°(=5π/6) 모두 포함',
        choices: [
          { text: '범위를 벗어난 해는 제외한다', correct: true },
          { text: '모든 해를 답으로 쓴다', correct: false },
          { text: '범위는 확인하지 않아도 된다', correct: false },
        ],
      },
    ],
  },
  g2_trig_identity: {
    heroPrompt: '삼각함수 항등식을 적용하기 전에 sin·cos·tan의 관계를 먼저 적어볼게요.',
    thinkingSteps: [
      {
        title: '기본 항등식 확인',
        body: 'sin²θ+cos²θ=1, tanθ=sinθ/cosθ를 먼저 적는다.',
        example: 'sin²θ+cos²θ=1 → cos²θ=1-sin²θ로 변환 가능',
        choices: [
          { text: '기본 항등식을 먼저 적어야 한다', correct: true },
          { text: '항등식 없이 바로 계산한다', correct: false },
          { text: '항등식은 특정 각도에서만 성립한다', correct: false },
        ],
      },
      {
        title: '치환 방향 결정',
        body: '식에서 sin과 cos 중 하나로 통일할지, 아니면 tan으로 변환할지 결정한다.',
        example: '1-cos²θ → sin²θ로 치환하여 단순화',
        choices: [
          { text: '하나의 함수로 통일하면 계산이 쉬워진다', correct: true },
          { text: '항상 tanθ로 변환해야 한다', correct: false },
          { text: '치환 없이 원형을 유지해야 한다', correct: false },
        ],
      },
      {
        title: '변환 후 계산',
        body: '치환 후 식을 정리하고 최종 값을 계산한다.',
        example: 'sin²θ+sinθ·cosθ = sinθ(sinθ+cosθ)로 인수분해',
        choices: [
          { text: '치환 후 인수분해나 간소화를 시도한다', correct: true },
          { text: '치환 후 바로 답이 나온다', correct: false },
          { text: '변환 후에도 항등식을 다시 쓴다', correct: false },
        ],
      },
    ],
  },
  g2_poly_factoring: {
    heroPrompt: '고차 다항식 인수분해에서는 인수정리를 활용해 근을 먼저 찾아볼게요.',
    thinkingSteps: [
      {
        title: '상수항 약수 대입',
        body: '상수항의 약수를 x에 대입하여 f(x)=0이 되는 값을 찾는다.',
        example: 'f(x)=x³-6x²+11x-6에서 f(1)=0 → (x-1)이 인수',
        choices: [
          { text: '상수항 약수를 대입해 근을 찾는다', correct: true },
          { text: '최고차 계수 약수를 대입한다', correct: false },
          { text: '대입 없이 인수를 바로 쓴다', correct: false },
        ],
      },
      {
        title: '조립제법으로 나누기',
        body: '찾은 근 a로 조립제법 또는 다항식 나눗셈을 수행한다.',
        example: 'f(x) ÷ (x-1) = x²-5x+6',
        choices: [
          { text: '조립제법으로 나머지 없이 나누어진다', correct: true },
          { text: '조립제법에서 나머지가 남아도 된다', correct: false },
          { text: '나눗셈 없이 인수를 바로 적는다', correct: false },
        ],
      },
      {
        title: '몫 추가 인수분해',
        body: '나눗셈의 몫을 다시 인수분해하여 완전히 분해한다.',
        example: 'x²-5x+6 = (x-2)(x-3) → f(x)=(x-1)(x-2)(x-3)',
        choices: [
          { text: '몫을 다시 인수분해해야 완성된다', correct: true },
          { text: '첫 번째 인수 하나면 충분하다', correct: false },
          { text: '몫은 더 이상 인수분해할 수 없다', correct: false },
        ],
      },
    ],
  },
  g2_poly_remainder: {
    heroPrompt: '나머지정리: f(x)를 (x-a)로 나눈 나머지는 f(a)입니다. 이 흐름을 확인해볼게요.',
    thinkingSteps: [
      {
        title: '나누는 식의 근 확인',
        body: '(x-a)로 나눌 때 나머지는 f(a). 근 a를 먼저 구한다.',
        example: '(x-2)로 나누면 근=2 → 나머지=f(2)',
        choices: [
          { text: '나누는 식의 근을 먼저 구한다', correct: true },
          { text: '나누는 식의 계수를 대입한다', correct: false },
          { text: '나머지는 항상 0이다', correct: false },
        ],
      },
      {
        title: 'f(a) 계산',
        body: 'x=a를 f(x)에 대입하여 나머지 값을 계산한다.',
        example: 'f(x)=x³-2x+1에서 f(2)=8-4+1=5 → 나머지=5',
        choices: [
          { text: 'x=a를 f(x)에 대입한다', correct: true },
          { text: 'x=0을 대입한다', correct: false },
          { text: 'f(x)를 직접 나눈 값을 구한다', correct: false },
        ],
      },
      {
        title: '인수정리 활용',
        body: 'f(a)=0이면 (x-a)는 f(x)의 인수. 이를 활용해 인수분해와 연결한다.',
        example: 'f(2)=0 → (x-2)는 f(x)의 인수 → 조립제법으로 분해',
        choices: [
          { text: 'f(a)=0이면 (x-a)가 인수이다', correct: true },
          { text: 'f(a)=0이어도 인수가 아닐 수 있다', correct: false },
          { text: '인수정리는 나머지정리와 다른 개념이다', correct: false },
        ],
      },
    ],
  },
  g2_eq_setup: {
    heroPrompt: '방정식을 세우는 단계에서 조건을 하나씩 식으로 옮기는 연습을 해볼게요.',
    thinkingSteps: [
      {
        title: '구하는 값 정의',
        body: '문제에서 구하는 것을 x(또는 다른 변수)로 놓고 명시적으로 적는다.',
        example: '"두 수의 합이 10" → 작은 수를 x, 큰 수를 10-x로 놓기',
        choices: [
          { text: '구하는 값을 변수로 먼저 정의한다', correct: true },
          { text: '바로 방정식을 세운다', correct: false },
          { text: '변수 없이 풀 수 있다', correct: false },
        ],
      },
      {
        title: '조건을 식으로 변환',
        body: '문제의 각 조건을 변수를 이용한 등식·부등식으로 변환한다.',
        example: '"두 수의 곱이 21" → x(10-x)=21',
        choices: [
          { text: '조건 하나씩 식으로 적는다', correct: true },
          { text: '모든 조건을 한 번에 식으로 쓴다', correct: false },
          { text: '조건은 무시하고 풀이 공식을 쓴다', correct: false },
        ],
      },
      {
        title: '풀기 + 검증',
        body: '방정식을 풀어 x 값을 구하고, 원래 조건에 대입하여 검증한다.',
        example: 'x(10-x)=21 → x²-10x+21=0 → x=3 또는 7. 조건 확인: 3×7=21 ✓',
        choices: [
          { text: '답을 원래 조건에 대입해 검증한다', correct: true },
          { text: '방정식의 해가 바로 최종 답이다', correct: false },
          { text: '검증은 필요하지 않다', correct: false },
        ],
      },
    ],
  },
  g2_radical_simplify: {
    heroPrompt: '무리식 간소화는 소인수분해에서 시작합니다. 순서를 확인해볼게요.',
    thinkingSteps: [
      {
        title: '근호 안 소인수분해',
        body: '근호 안의 수를 소인수분해하여 제곱수를 찾는다.',
        example: '√18 = √(2·3²) → 3²을 밖으로 꺼낼 수 있다',
        choices: [
          { text: '소인수분해로 제곱수를 찾는다', correct: true },
          { text: '근호 안 수를 반으로 나눈다', correct: false },
          { text: '소인수분해 없이 간소화할 수 있다', correct: false },
        ],
      },
      {
        title: '제곱수 밖으로 꺼내기',
        body: '√(a²·b) = a√b 규칙으로 제곱수의 제곱근을 근호 밖으로 꺼낸다.',
        example: '√18 = √(9·2) = 3√2',
        choices: [
          { text: '제곱수의 양의 제곱근을 밖으로 꺼낸다', correct: true },
          { text: '제곱수를 그대로 근호 안에 둔다', correct: false },
          { text: '제곱수를 나누기로 처리한다', correct: false },
        ],
      },
      {
        title: '동류항 합산',
        body: '간소화 후 √a 형태가 같은 항끼리 계수를 더하거나 뺀다.',
        example: '3√2 - 2√2 + √2 = (3-2+1)√2 = 2√2',
        choices: [
          { text: '√a 앞 계수끼리만 더하거나 뺀다', correct: true },
          { text: '근호 안 수도 함께 더한다', correct: false },
          { text: '√a가 같아도 합산할 수 없다', correct: false },
        ],
      },
    ],
  },
  g2_radical_rationalize: {
    heroPrompt: '분모 유리화는 켤레식을 곱하는 것부터 시작합니다. 단계별로 확인해볼게요.',
    thinkingSteps: [
      {
        title: '분모 유형 확인',
        body: '분모가 √a이면 √a를, a+√b이면 켤레 a-√b를 곱한다.',
        example: '1/(2+√3) → 켤레: (2-√3)',
        choices: [
          { text: '분모의 켤레를 분자·분모 모두 곱한다', correct: true },
          { text: '분자에만 켤레를 곱한다', correct: false },
          { text: '분모에만 켤레를 곱한다', correct: false },
        ],
      },
      {
        title: '분모 전개',
        body: '(a+√b)(a-√b) = a²-b 공식으로 분모를 계산한다.',
        example: '(2+√3)(2-√3) = 4-3 = 1',
        choices: [
          { text: '(a+b)(a-b)=a²-b² 공식을 쓴다', correct: true },
          { text: '분모를 (a+√b)²으로 전개한다', correct: false },
          { text: '분모 전개 결과는 항상 1이다', correct: false },
        ],
      },
      {
        title: '분자 전개 후 정리',
        body: '분자도 전개하고, 분모가 유리수가 된 분수를 최종 정리한다.',
        example: '1·(2-√3)/1 = 2-√3',
        choices: [
          { text: '분자를 전개하고 분모로 나눈다', correct: true },
          { text: '분자는 그대로 두고 분모만 정리한다', correct: false },
          { text: '유리화 후 분자에도 근호가 남아야 한다', correct: false },
        ],
      },
    ],
  },
  g2_diff_application: {
    heroPrompt: "미분으로 최댓·최솟값을 찾으려면 f'(x)=0 → 증감표 → 극값 결정의 3단계가 핵심입니다.",
    thinkingSteps: [
      {
        title: "f'(x) 구하기",
        body: 'f(x)를 미분하여 f\'(x)를 구한다. 각 항을 항별로 미분한다.',
        example: "f(x)=x³-3x+2 → f'(x)=3x²-3",
        choices: [
          { text: '각 항의 지수를 앞으로 내리고 지수를 1 감소시킨다', correct: true },
          { text: 'f(x) 전체에 지수를 곱한다', correct: false },
          { text: '상수항도 미분하면 값이 남는다', correct: false },
        ],
      },
      {
        title: "f'(x)=0 풀기 + 증감표",
        body: "f'(x)=0이 되는 x를 구하고, 그 주위에서 f'(x)의 부호 변화로 증감표를 작성한다.",
        example: "3x²-3=0 → x=±1. x<-1: +, -1~1: -, x>1: + → 극대 x=-1, 극소 x=1",
        choices: [
          { text: "f'(x) 부호 변화로 극대·극소를 결정한다", correct: true },
          { text: "f'(x)=0인 점이 반드시 극값이다", correct: false },
          { text: '증감표 없이 극값을 바로 판단할 수 있다', correct: false },
        ],
      },
      {
        title: '극값 계산 + 최종 판단',
        body: '극대·극소에서 f(x)값을 계산하고, 주어진 범위가 있으면 끝점도 확인한다.',
        example: 'f(-1)=4(극대), f(1)=0(극소). 범위 [-2,2]이면 f(-2), f(2)도 확인',
        choices: [
          { text: '닫힌 구간이면 끝점도 반드시 확인한다', correct: true },
          { text: '극값만 확인하면 충분하다', correct: false },
          { text: '끝점은 항상 극값보다 작다', correct: false },
        ],
      },
    ],
  },
  g2_integral_basic: {
    heroPrompt: '정적분은 부정적분을 먼저 구한 뒤 위 끝값에서 아래 끝값을 빼는 순서입니다.',
    thinkingSteps: [
      {
        title: '부정적분 공식 적용',
        body: '∫xⁿdx = xⁿ⁺¹/(n+1)+C (n≠-1). 각 항별로 적용한다.',
        example: '∫(3x²-2x+1)dx = x³-x²+x+C',
        choices: [
          { text: '지수를 1 증가시키고 증가된 지수로 나눈다', correct: true },
          { text: '지수를 앞으로 내리고 1을 빼면 된다', correct: false },
          { text: '상수항은 적분해도 사라진다', correct: false },
        ],
      },
      {
        title: '정적분 계산 [F(x)]_a^b',
        body: 'F(b)-F(a)를 계산한다. 위 끝값을 먼저 대입하고 아래 끝값을 빼는 순서를 지킨다.',
        example: '[x³-x²+x]₀² = (8-4+2) - (0) = 6',
        choices: [
          { text: 'F(위끝값) - F(아래끝값) 순서이다', correct: true },
          { text: 'F(아래끝값) - F(위끝값) 순서이다', correct: false },
          { text: '두 끝값의 평균을 대입한다', correct: false },
        ],
      },
      {
        title: '계산 검증',
        body: '각 끝값 대입 결과를 별도로 계산하고, 빼기 부호를 빠뜨리지 않았는지 확인한다.',
        example: 'F(2)=6, F(0)=0 → 6-0=6. 부호 확인 ✓',
        choices: [
          { text: '두 값을 따로 계산하고 뺀다', correct: true },
          { text: '한 번에 계산해도 실수가 없다', correct: false },
          { text: '아래 끝값은 항상 0이다', correct: false },
        ],
      },
    ],
  },
  g2_counting_method: {
    heroPrompt: '경우의 수 방법 선택은 순서·중복·독립 여부로 결정합니다. 체크해볼게요.',
    thinkingSteps: [
      {
        title: '순서 있음/없음 판단',
        body: '선택 순서가 중요하면 순열(P), 순서 무관하면 조합(C)을 쓴다.',
        example: '"회장·부회장 선출" → 순서 있음 → ₅P₂=20',
        choices: [
          { text: '순서가 있으면 순열(P)을 쓴다', correct: true },
          { text: '순서가 있으면 조합(C)을 쓴다', correct: false },
          { text: '순서는 경우의 수와 무관하다', correct: false },
        ],
      },
      {
        title: '독립/배타 사건 판단',
        body: '두 사건이 동시에 일어나면 곱의 법칙, 어느 한 쪽만 일어나면 합의 법칙을 쓴다.',
        example: '"A 또는 B" → 합의 법칙 / "A 그리고 B" → 곱의 법칙',
        choices: [
          { text: '"또는"이면 합, "그리고"이면 곱의 법칙이다', correct: true },
          { text: '"또는"이면 곱, "그리고"이면 합의 법칙이다', correct: false },
          { text: '항상 곱의 법칙을 쓴다', correct: false },
        ],
      },
      {
        title: '공식 대입',
        body: '결정한 방법으로 ₙPr = n!/(n-r)! 또는 ₙCr = n!/(r!(n-r)!)를 계산한다.',
        example: '₅P₂ = 5×4 = 20 / ₅C₂ = 5×4/2 = 10',
        choices: [
          { text: 'P는 나누지 않고, C는 r!로 나눈다', correct: true },
          { text: 'P와 C의 계산 방법이 같다', correct: false },
          { text: 'C는 P보다 항상 크다', correct: false },
        ],
      },
    ],
  },
  g2_counting_overcounting: {
    heroPrompt: '중복 계산 오류는 포함-배제 원리로 해결합니다. 겹치는 경우를 명시적으로 찾아볼게요.',
    thinkingSteps: [
      {
        title: '각 경우의 수 계산',
        body: '조건 A, B 각각의 경우의 수를 따로 구한다.',
        example: '"3의 배수 또는 5의 배수": A=3의 배수 개수, B=5의 배수 개수',
        choices: [
          { text: 'A와 B를 각각 먼저 구한다', correct: true },
          { text: 'A와 B를 한 번에 구한다', correct: false },
          { text: '조건이 두 개면 그냥 더하면 된다', correct: false },
        ],
      },
      {
        title: '겹치는 경우 찾기',
        body: 'A와 B 조건을 동시에 만족하는 경우(A∩B)를 구한다.',
        example: '"3과 5의 공배수 = 15의 배수": n(A∩B) 계산',
        choices: [
          { text: '두 조건을 동시에 만족하는 경우를 찾는다', correct: true },
          { text: '겹치는 경우는 항상 없다', correct: false },
          { text: '겹치는 경우는 무시한다', correct: false },
        ],
      },
      {
        title: '포함-배제 원리 적용',
        body: 'n(A∪B) = n(A)+n(B)-n(A∩B)로 중복을 제거한다.',
        example: 'n(A)=33, n(B)=20, n(A∩B)=6 → 33+20-6=47',
        choices: [
          { text: '겹치는 경우를 정확히 한 번 뺀다', correct: true },
          { text: '겹치는 경우를 두 번 뺀다', correct: false },
          { text: '겹치는 경우를 더한다', correct: false },
        ],
      },
    ],
  },
  g2_inequality_range: {
    heroPrompt: '이차부등식 풀이는 포물선 그래프 방향으로 해의 범위를 결정합니다.',
    thinkingSteps: [
      {
        title: '이차방정식 풀어 근 구하기',
        body: '부등식을 =으로 바꿔 이차방정식의 두 근 α, β를 구한다 (α<β).',
        example: 'x²-3x-4=0 → (x-4)(x+1)=0 → x=-1, x=4',
        choices: [
          { text: '먼저 =으로 바꿔 근을 구한다', correct: true },
          { text: '부등식을 직접 풀 수 있다', correct: false },
          { text: '근을 구하지 않아도 범위를 쓸 수 있다', correct: false },
        ],
      },
      {
        title: '포물선 방향과 해 범위 결정',
        body: 'a>0일 때: >0이면 x<α 또는 x>β, <0이면 α<x<β',
        example: 'x²-3x-4<0, a=1>0 → -1<x<4 (근의 안쪽)',
        choices: [
          { text: 'a>0이고 <0이면 두 근 사이가 해이다', correct: true },
          { text: 'a>0이고 <0이면 두 근 바깥이 해이다', correct: false },
          { text: 'a의 부호는 해 범위에 영향을 주지 않는다', correct: false },
        ],
      },
      {
        title: '부등호 방향 최종 확인',
        body: '등호 포함(≤,≥) 여부에 따라 등호를 포함하거나 제외한다.',
        example: '<이면 등호 제외: -1<x<4 / ≤이면 등호 포함: -1≤x≤4',
        choices: [
          { text: '<이면 등호를 제외한다', correct: true },
          { text: '<이면 등호를 포함한다', correct: false },
          { text: '등호 포함 여부는 중요하지 않다', correct: false },
        ],
      },
    ],
  },
  g2_function_domain: {
    heroPrompt: '합성함수나 역함수의 정의역·치역은 단계별로 범위를 추적해야 합니다.',
    thinkingSteps: [
      {
        title: '내부 함수의 치역 확인',
        body: '합성함수 f∘g에서 g(x)의 치역이 f의 정의역 안에 있어야 한다.',
        example: 'g(x)=x² (치역: x≥0), f(x)=√x (정의역: x≥0) → 문제없음',
        choices: [
          { text: 'g의 치역이 f의 정의역 안에 있어야 한다', correct: true },
          { text: 'f의 치역이 g의 정의역 안에 있어야 한다', correct: false },
          { text: '정의역 확인 없이 합성할 수 있다', correct: false },
        ],
      },
      {
        title: '역함수의 정의역·치역 교환',
        body: '역함수 f⁻¹의 정의역 = f의 치역, f⁻¹의 치역 = f의 정의역이다.',
        example: 'f: [1,3]→[2,8] 이면 f⁻¹: [2,8]→[1,3]',
        choices: [
          { text: '역함수에서 정의역과 치역이 서로 바뀐다', correct: true },
          { text: '역함수에서 정의역과 치역이 같다', correct: false },
          { text: '역함수는 항상 모든 실수가 정의역이다', correct: false },
        ],
      },
      {
        title: '함수 성립 조건 확인',
        body: '하나의 x에 대해 f(x) 값이 오직 하나여야 함수이다 (일대일 대응 여부와 별개).',
        example: 'f(x)=±√x는 x=4에서 f=2, -2 두 값 → 함수가 아님',
        choices: [
          { text: '한 x에 하나의 y값이 대응되어야 한다', correct: true },
          { text: '한 y에 여러 x가 대응될 수 없다', correct: false },
          { text: '모든 식은 함수이다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 2: typecheck 실행**

```bash
npm run typecheck
```

Expected: 에러 없음. `reviewContentMap`이 `Partial<Record<WeaknessId, ReviewContent>>`를 만족해야 한다.

- [ ] **Step 3: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(g2): 복습 콘텐츠 g2_xxx 20개 추가 — review-content-map"
```

---

## Task 5: 통합 검증

- [ ] **Step 1: typecheck + lint 전체 실행**

```bash
npm run typecheck && npm run lint
```

Expected: 에러 없음.

- [ ] **Step 2: g2 진단 흐름 시뮬레이터 확인**

고2 계정(또는 프로필에서 학년을 고2로 변경)으로 진단 화면 진입 후 아래 항목을 수동 확인한다.

```
□ 진단 문제 10개가 표시됨 (g1 문제 아닌 g2 문제: 집합/명제/삼각함수 등)
□ 틀린 후 풀이법 선택지에 "집합 연산"·"명제 판별"·"삼각함수" 등이 표시됨
□ 서브 선택지 선택 후 g2_xxx WeaknessId로 저장됨 (디버그 로그 또는 홈 화면 약점 카드)
□ 복습 세션 진입 시 g2 heroPrompt와 thinkingSteps가 표시됨
□ g1 학생 진단 흐름 회귀 없음 (g1 문제 그대로 출력됨)
□ g3 학생 진단 흐름 회귀 없음 (g3 문제 그대로 출력됨)
```

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "feat(g2): 고2 진단 콘텐츠 통합 검증 완료"
```

---

## Self-Review 체크

| 항목 | 결과 |
|------|------|
| WeaknessId 20개 모두 diagnosisMap에 정의됨 | ✅ |
| WeaknessId 20개 모두 weaknessOrder에 포함됨 | ✅ |
| 신규 SolveMethodId 5개 모두 diagnosisTree에 정의됨 (Record 완전성) | ✅ |
| g2 진단 문제 10개의 diagnosisMethods가 모두 유효한 SolveMethodId | ✅ |
| review-content-map의 g2 항목 20개 모두 ThinkingStep.choices 포함 | ✅ |
| g1 fallback `grade === 'g2'` 조건 제거됨 | ✅ |
| 기존 g1·g3 데이터 변경 없음 | ✅ |
