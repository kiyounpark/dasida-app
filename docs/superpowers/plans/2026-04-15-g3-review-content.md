# G3 복습 콘텐츠 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `data/review-content-map.ts`에 G3 10개 약점 × 3 ThinkingStep을 추가해 고3 사용자가 복습 세션을 정상 이용할 수 있게 한다.

**Architecture:** `reviewContentMap` 객체에 `g3_*` 키를 추가하는 순수 데이터 작성 작업이다. 기존 G1/G2 항목과 동일한 `{ heroPrompt, thinkingSteps[] }` 구조를 따른다. 런타임 로직 변경 없음.

**Tech Stack:** TypeScript, `data/review-content-map.ts`

---

### Task 1: g3_diff / g3_integral 추가

**Files:**
- Modify: `data/review-content-map.ts:1559` (closing `};` 바로 앞에 삽입)

- [ ] **Step 1: review-content-map.ts 열기 — 삽입 위치 확인**

`data/review-content-map.ts` 1559번째 줄 `};` 바로 앞 (현재 마지막 항목 `g3_function` 닫힘 직후)이 삽입 위치다.

- [ ] **Step 2: g3_diff 항목 추가**

`};` 직전(1559번 줄)에 아래 내용을 삽입한다:

```typescript
  g3_diff: {
    heroPrompt: '각 항을 독립적으로 미분하는 순서가 기억나나요?',
    thinkingSteps: [
      {
        title: '항별 미분 규칙',
        body: 'xⁿ을 미분하면 nxⁿ⁻¹이 된다. 각 항을 독립적으로 미분한 뒤 합산한다.',
        example: '예) f(x)=3x²+2x+1 → f\'(x)=6x+2',
        choices: [
          { text: '각 항의 지수를 앞으로 내리고 지수에서 1을 뺀다', correct: true },
          { text: '지수를 그대로 두고 계수만 바꾼다', correct: false },
          { text: '상수항도 그대로 내려온다', correct: false },
        ],
      },
      {
        title: '합성함수 체인룰',
        body: 'f(g(x))를 미분할 때는 f\'(g(x))·g\'(x)로 바깥 함수를 먼저 미분하고 안쪽 함수의 미분을 곱한다.',
        example: '예) f(x)=(x²+1)³ → f\'(x)=3(x²+1)²·2x=6x(x²+1)²',
        choices: [
          { text: '바깥 함수를 먼저 미분하고, 안쪽 함수의 미분을 곱한다', correct: true },
          { text: '안쪽 함수를 먼저 미분하고, 바깥 함수의 미분을 곱한다', correct: false },
          { text: '두 함수를 각각 미분한 뒤 더한다', correct: false },
        ],
      },
      {
        title: '곱의 미분',
        body: '(f·g)\'=f\'g+fg\'로, 첫 번째 함수를 미분한 뒤 두 번째 함수를 곱하고, 첫 번째 함수에 두 번째 함수의 미분을 곱해서 더한다.',
        example: '예) f(x)=x²·sinx → f\'(x)=2x·sinx+x²·cosx',
        choices: [
          { text: '앞 미분×뒤 + 앞×뒤 미분', correct: true },
          { text: '앞 미분×뒤 미분', correct: false },
          { text: '앞+뒤를 함께 미분한다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 3: g3_integral 항목 추가**

`g3_diff` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_integral: {
    heroPrompt: '∫xⁿdx 기본 공식부터 확인해볼게요.',
    thinkingSteps: [
      {
        title: '부정적분 기본 공식',
        body: '∫xⁿdx = xⁿ⁺¹/(n+1)+C (n≠-1). 지수에 1을 더하고 그 수로 나눈 뒤 적분상수 C를 붙인다.',
        example: '예) ∫x³dx = x⁴/4+C',
        choices: [
          { text: '지수에 1을 더하고 그 수로 나눈다', correct: true },
          { text: '지수에서 1을 빼고 지수를 곱한다', correct: false },
          { text: '지수를 그대로 두고 계수만 1 올린다', correct: false },
        ],
      },
      {
        title: '정적분 계산',
        body: '∫ₐᵇf(x)dx = [F(x)]ₐᵇ = F(b)-F(a). 부정적분 F(x)를 구한 뒤 위 끝 값을 대입해서 아래 끝 값을 뺀다.',
        example: '예) ∫₀²x²dx = [x³/3]₀² = 8/3-0 = 8/3',
        choices: [
          { text: 'F(b)-F(a) 순서로 계산한다', correct: true },
          { text: 'F(a)-F(b) 순서로 계산한다', correct: false },
          { text: 'F(a)+F(b)를 계산한다', correct: false },
        ],
      },
      {
        title: '넓이와 부호 처리',
        body: '곡선과 x축 사이의 넓이는 f(x)<0인 구간에서 절댓값을 취해야 한다. 구간을 나눠 계산하거나 |f(x)|를 적분한다.',
        example: '예) ∫₋₁¹(x²-1)dx=-4/3이지만 넓이=4/3',
        choices: [
          { text: 'x축 아래 구간은 적분 결과에 절댓값을 취한다', correct: true },
          { text: '부호에 상관없이 적분 결과를 그대로 쓴다', correct: false },
          { text: '넓이는 항상 정적분과 같다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(content): G3 복습 콘텐츠 추가 — g3_diff, g3_integral"
```

---

### Task 2: g3_sequence / g3_log_exp 추가

**Files:**
- Modify: `data/review-content-map.ts`

- [ ] **Step 1: g3_sequence 항목 추가**

`g3_integral` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_sequence: {
    heroPrompt: '등차인지 등비인지 먼저 판단하는 흐름이 떠오르나요?',
    thinkingSteps: [
      {
        title: '등차수열 일반항',
        body: '공차 d가 일정하면 등차수열이다. 일반항 aₙ=a₁+(n-1)d로 구한다.',
        example: '예) a₁=2, d=3 → a₅=2+4×3=14',
        choices: [
          { text: 'aₙ=a₁+(n-1)d', correct: true },
          { text: 'aₙ=a₁·dⁿ⁻¹', correct: false },
          { text: 'aₙ=a₁+(n+1)d', correct: false },
        ],
      },
      {
        title: '등비수열 일반항',
        body: '공비 r이 일정하면 등비수열이다. 일반항 aₙ=a₁·rⁿ⁻¹로 구한다.',
        example: '예) a₁=3, r=2 → a₄=3·2³=24',
        choices: [
          { text: 'aₙ=a₁·rⁿ⁻¹', correct: true },
          { text: 'aₙ=a₁·rⁿ', correct: false },
          { text: 'aₙ=a₁+(n-1)r', correct: false },
        ],
      },
      {
        title: '합 공식 적용',
        body: '등차수열 합 Sₙ=n(a₁+aₙ)/2, 등비수열 합 Sₙ=a₁(rⁿ-1)/(r-1) (r≠1). r=1이면 Sₙ=na₁.',
        example: '예) 등차: 1+2+…+10=10×11/2=55',
        choices: [
          { text: '등차는 n(a₁+aₙ)/2, 등비는 a₁(rⁿ-1)/(r-1)', correct: true },
          { text: '등차는 a₁·rⁿ, 등비는 n(a₁+aₙ)/2', correct: false },
          { text: '두 수열 모두 n×aₙ/2로 계산한다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 2: g3_log_exp 항목 추가**

`g3_sequence` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_log_exp: {
    heroPrompt: '지수법칙과 로그 성질 중 어느 것을 먼저 확인하나요?',
    thinkingSteps: [
      {
        title: '지수법칙 정리',
        body: 'aˣ·aʸ=aˣ⁺ʸ, aˣ÷aʸ=aˣ⁻ʸ, (aˣ)ʸ=aˣʸ. 같은 밑끼리만 지수를 더하거나 뺄 수 있다.',
        example: '예) 2³×2⁴=2⁷=128',
        choices: [
          { text: '같은 밑의 곱은 지수를 더한다', correct: true },
          { text: '같은 밑의 곱은 지수를 곱한다', correct: false },
          { text: '밑이 달라도 지수를 더할 수 있다', correct: false },
        ],
      },
      {
        title: '로그 성질 — 곱과 나눗셈',
        body: 'logₐ(bc)=logₐb+logₐc, logₐ(b/c)=logₐb-logₐc. 곱은 로그의 합, 나눗셈은 로그의 차.',
        example: '예) log₂8+log₂4=log₂32=5',
        choices: [
          { text: '곱의 로그는 각 로그의 합이다', correct: true },
          { text: '곱의 로그는 각 로그의 곱이다', correct: false },
          { text: '로그 안의 수를 나누면 지수를 나눈다', correct: false },
        ],
      },
      {
        title: '밑 변환 공식',
        body: 'logₐb=logc(b)/logc(a). 계산기나 표가 없을 때 밑을 바꿔 계산할 수 있다.',
        example: '예) log₂8=log10(8)/log10(2)=3',
        choices: [
          { text: 'logₐb=log b / log a (밑이 같은 로그의 비)', correct: true },
          { text: 'logₐb=log a / log b', correct: false },
          { text: 'logₐb=log(a-b)', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(content): G3 복습 콘텐츠 추가 — g3_sequence, g3_log_exp"
```

---

### Task 3: g3_trig / g3_limit 추가

**Files:**
- Modify: `data/review-content-map.ts`

- [ ] **Step 1: g3_trig 항목 추가**

`g3_log_exp` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_trig: {
    heroPrompt: '단위원에서 sin·cos 값을 읽는 흐름을 다시 볼게요.',
    thinkingSteps: [
      {
        title: '대표각 sin·cos·tan 값',
        body: '단위원에서 x좌표=cosθ, y좌표=sinθ. 0°→(1,0), 30°→(√3/2,1/2), 45°→(√2/2,√2/2), 60°→(1/2,√3/2), 90°→(0,1).',
        example: '예) sin60°=√3/2, cos60°=1/2, tan60°=√3',
        choices: [
          { text: '단위원에서 x좌표=cos, y좌표=sin으로 읽는다', correct: true },
          { text: '단위원에서 x좌표=sin, y좌표=cos으로 읽는다', correct: false },
          { text: '반지름이 1이 아닌 원에서 읽어야 한다', correct: false },
        ],
      },
      {
        title: '삼각함수 항등식',
        body: 'sin²θ+cos²θ=1, tanθ=sinθ/cosθ. 이 두 가지가 모든 변환의 기본이다.',
        example: '예) sinθ=3/5이면 cosθ=±4/5 (sin²+cos²=1 이용)',
        choices: [
          { text: 'sin²θ+cos²θ=1이 기본 항등식이다', correct: true },
          { text: 'sin²θ-cos²θ=1이 기본 항등식이다', correct: false },
          { text: 'sinθ×cosθ=1이 항등식이다', correct: false },
        ],
      },
      {
        title: '각도 변환 공식',
        body: 'sin(90°-θ)=cosθ, cos(90°-θ)=sinθ, sin(180°-θ)=sinθ, cos(180°-θ)=-cosθ.',
        example: '예) sin120°=sin(180°-60°)=sin60°=√3/2',
        choices: [
          { text: 'sin(180°-θ)=sinθ', correct: true },
          { text: 'sin(180°-θ)=-sinθ', correct: false },
          { text: 'sin(90°-θ)=sinθ', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 2: g3_limit 항목 추가**

`g3_trig` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_limit: {
    heroPrompt: '0/0 꼴을 만났을 때 첫 번째 할 일이 뭔지 기억나나요?',
    thinkingSteps: [
      {
        title: '0/0 꼴 — 인수분해 후 약분',
        body: '분자·분모가 모두 0이 되면 공통인수가 있다는 뜻이다. 인수분해해서 약분한 뒤 x값을 대입한다.',
        example: '예) lim(x→2)(x²-4)/(x-2)=lim(x→2)(x+2)=4',
        choices: [
          { text: '인수분해해 공통인수를 약분한 뒤 대입한다', correct: true },
          { text: '그냥 0/0=1로 처리한다', correct: false },
          { text: '극한이 존재하지 않는다고 결론 짓는다', correct: false },
        ],
      },
      {
        title: '∞/∞ 꼴 — 최고차항으로 나누기',
        body: '분자·분모를 최고차항으로 나눠 극한을 구한다. 차수 비교: 분자>분모이면 ±∞, 같으면 계수비, 분자<분모이면 0.',
        example: '예) lim(x→∞)(2x²+1)/(x²-3)=2/1=2',
        choices: [
          { text: '최고차항의 계수비가 극한값이다', correct: true },
          { text: '상수항끼리의 비가 극한값이다', correct: false },
          { text: '분자 차수가 크면 극한은 0이다', correct: false },
        ],
      },
      {
        title: '부정형 해소 후 대입',
        body: '0/0, ∞/∞ 꼴이 아니면 바로 x값을 대입한다. 해소 후에도 부정형이 남으면 유리화 또는 분모 통분을 시도한다.',
        example: '예) lim(x→1)(x+2)=3 (부정형 아님, 바로 대입)',
        choices: [
          { text: '부정형이 아니면 바로 값을 대입한다', correct: true },
          { text: '항상 인수분해를 시도한 뒤 대입한다', correct: false },
          { text: '극한은 절대 직접 대입할 수 없다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(content): G3 복습 콘텐츠 추가 — g3_trig, g3_limit"
```

---

### Task 4: g3_conic / g3_counting 추가

**Files:**
- Modify: `data/review-content-map.ts`

- [ ] **Step 1: g3_conic 항목 추가**

`g3_limit` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_conic: {
    heroPrompt: '포물선·타원·쌍곡선 표준형을 구분하는 기준을 확인할게요.',
    thinkingSteps: [
      {
        title: '이차곡선 표준형 구분',
        body: '포물선: y²=4px 또는 x²=4py. 타원: x²/a²+y²/b²=1 (a≠b). 쌍곡선: x²/a²-y²/b²=1. 부호 차이가 핵심.',
        example: '예) x²/9+y²/4=1 → 타원 (두 항 모두 덧셈)',
        choices: [
          { text: '타원은 두 분수의 합, 쌍곡선은 두 분수의 차', correct: true },
          { text: '타원과 쌍곡선 모두 두 분수의 합', correct: false },
          { text: '부호와 관계없이 계수 크기로 구분한다', correct: false },
        ],
      },
      {
        title: '초점 좌표',
        body: '포물선 y²=4px: 초점(p,0). 타원 x²/a²+y²/b²=1(a>b): c²=a²-b²→초점(±c,0). 쌍곡선 x²/a²-y²/b²=1: c²=a²+b²→초점(±c,0).',
        example: '예) x²/25+y²/16=1 → c²=25-16=9 → c=3 → 초점(±3,0)',
        choices: [
          { text: '타원: c²=a²-b², 쌍곡선: c²=a²+b²', correct: true },
          { text: '타원: c²=a²+b², 쌍곡선: c²=a²-b²', correct: false },
          { text: '두 곡선 모두 c²=a²+b²', correct: false },
        ],
      },
      {
        title: '쌍곡선 점근선',
        body: '쌍곡선 x²/a²-y²/b²=1의 점근선은 y=±(b/a)x. 쌍곡선은 이 두 직선에 한없이 가까워지지만 만나지는 않는다.',
        example: '예) x²/4-y²/9=1 → 점근선 y=±(3/2)x',
        choices: [
          { text: 'y=±(b/a)x', correct: true },
          { text: 'y=±(a/b)x', correct: false },
          { text: 'y=±(a+b)x', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 2: g3_counting 항목 추가**

`g3_conic` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_counting: {
    heroPrompt: '순열과 조합 중 어느 것을 쓸지 먼저 판단하는 법을 볼게요.',
    thinkingSteps: [
      {
        title: '순서 유무 판단',
        body: '문제에서 순서·배열·줄 세우기가 나오면 순열(Permutation). 선택·뽑기·팀 구성이면 조합(Combination).',
        example: '예) 5명 중 회장·부회장 선출 → 순서 있음 → 순열',
        choices: [
          { text: '순서가 중요하면 순열, 순서 무관하면 조합', correct: true },
          { text: '인원이 많으면 순열, 적으면 조합', correct: false },
          { text: '무조건 조합으로 계산한 뒤 순서를 곱한다', correct: false },
        ],
      },
      {
        title: 'P(n,r)와 C(n,r) 계산',
        body: 'P(n,r)=n!/(n-r)!. C(n,r)=n!/r!(n-r)!=P(n,r)/r!. C(n,r)=C(n,n-r) 대칭성도 자주 활용한다.',
        example: '예) P(5,2)=5×4=20, C(5,2)=20/2=10',
        choices: [
          { text: 'C(n,r)=P(n,r)/r!', correct: true },
          { text: 'C(n,r)=P(n,r)×r!', correct: false },
          { text: 'C(n,r)=n!/(n+r)!', correct: false },
        ],
      },
      {
        title: '중복이 있는 경우',
        body: '중복 허용 순열: nʳ. 중복 조합: H(n,r)=C(n+r-1,r). 중복이 포함되는지 문제에서 꼭 확인한다.',
        example: '예) 주사위 2번 → 순서 있고 중복 허용 → 6²=36',
        choices: [
          { text: '중복 허용 순열은 nʳ, 중복 조합은 C(n+r-1,r)', correct: true },
          { text: '중복이 있으면 항상 n!로 계산한다', correct: false },
          { text: '중복 조합은 C(n,r)+n이다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(content): G3 복습 콘텐츠 추가 — g3_conic, g3_counting"
```

---

### Task 5: g3_probability / g3_statistics 추가 + 최종 검증

**Files:**
- Modify: `data/review-content-map.ts`

- [ ] **Step 1: g3_probability 항목 추가**

`g3_counting` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_probability: {
    heroPrompt: '조건부확률 P(A|B)를 구하는 순서가 기억나나요?',
    thinkingSteps: [
      {
        title: '여사건 활용',
        body: '"적어도 하나", "~이 아닌" 표현이 나오면 여사건을 먼저 생각한다. P(Aᶜ)=1-P(A).',
        example: '예) 동전 3번 중 앞면이 적어도 1번 → 1-P(모두 뒷면)=1-1/8=7/8',
        choices: [
          { text: '"적어도"가 나오면 여사건 1-P(Aᶜ)를 활용한다', correct: true },
          { text: '"적어도"가 나와도 직접 경우의 수를 센다', correct: false },
          { text: '여사건은 P(A)×2와 같다', correct: false },
        ],
      },
      {
        title: '조건부확률 공식',
        body: 'P(A|B)=P(A∩B)/P(B). "B가 일어났을 때 A의 확률"은 전체를 B로 좁히고 그 안에서 A∩B를 본다.',
        example: '예) P(A∩B)=0.3, P(B)=0.5 → P(A|B)=0.6',
        choices: [
          { text: 'P(A|B)=P(A∩B)/P(B)', correct: true },
          { text: 'P(A|B)=P(A)/P(B)', correct: false },
          { text: 'P(A|B)=P(A)×P(B)', correct: false },
        ],
      },
      {
        title: '독립 사건 판단',
        body: 'P(A∩B)=P(A)·P(B)이면 A와 B는 독립. 독립이면 P(A|B)=P(A)가 성립한다.',
        example: '예) P(A)=0.4, P(B)=0.3, P(A∩B)=0.12 → 0.4×0.3=0.12 → 독립',
        choices: [
          { text: 'P(A∩B)=P(A)·P(B)이면 독립', correct: true },
          { text: 'P(A∩B)=P(A)+P(B)이면 독립', correct: false },
          { text: '두 사건은 항상 독립이다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 2: g3_statistics 항목 추가**

`g3_probability` 닫힘 바로 뒤에 이어서 삽입한다:

```typescript
  g3_statistics: {
    heroPrompt: '표준화 Z=(X-μ)/σ 공식을 적용하는 흐름을 볼게요.',
    thinkingSteps: [
      {
        title: '이항분포 평균·분산',
        body: '이항분포 B(n,p)에서 평균 μ=np, 분산 σ²=npq (q=1-p). n이 크면 정규분포로 근사한다.',
        example: '예) B(100,0.4) → μ=40, σ²=24, σ=√24=2√6',
        choices: [
          { text: '이항분포 B(n,p)의 평균=np, 분산=npq', correct: true },
          { text: '이항분포의 평균=np², 분산=npq²', correct: false },
          { text: '이항분포의 평균과 분산은 같다', correct: false },
        ],
      },
      {
        title: 'Z 표준화 계산',
        body: 'X~N(μ,σ²)이면 Z=(X-μ)/σ~N(0,1). X를 Z로 변환한 뒤 표준정규분포표를 읽는다.',
        example: '예) X~N(50,4²), P(X≥54)=P(Z≥(54-50)/4)=P(Z≥1)',
        choices: [
          { text: 'Z=(X-μ)/σ로 표준화한 뒤 표를 읽는다', correct: true },
          { text: 'Z=(X+μ)/σ로 계산한다', correct: false },
          { text: 'Z=X×σ-μ으로 계산한다', correct: false },
        ],
      },
      {
        title: '정규분포표 읽기',
        body: '표는 P(0≤Z≤z) 값을 준다. P(Z≥z)=0.5-P(0≤Z≤z), P(Z≤z)=0.5+P(0≤Z≤z). 대칭성을 이용한다.',
        example: '예) P(0≤Z≤1.5)=0.4332이면 P(Z≥1.5)=0.5-0.4332=0.0668',
        choices: [
          { text: '표는 P(0≤Z≤z)를 주므로 0.5에서 더하거나 뺀다', correct: true },
          { text: '표는 P(Z≤z) 전체를 직접 준다', correct: false },
          { text: '표 값을 2배 하면 P(Z≥z)가 된다', correct: false },
        ],
      },
    ],
  },
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 10개 약점 커버리지 확인**

```bash
node -e "
const { getReviewThinkingSteps } = require('./data/review-content-map');
const ids = ['g3_diff','g3_integral','g3_sequence','g3_log_exp','g3_trig','g3_limit','g3_conic','g3_counting','g3_probability','g3_statistics'];
ids.forEach(id => {
  const steps = getReviewThinkingSteps(id);
  console.log(id, steps.length === 3 ? '✓' : '✗ ' + steps.length);
});
"
```

Expected: 10개 모두 `✓` (length 3)

- [ ] **Step 5: 최종 커밋**

```bash
git add data/review-content-map.ts
git commit -m "feat(content): G3 복습 콘텐츠 추가 — g3_probability, g3_statistics (전체 10개 완료)"
```
