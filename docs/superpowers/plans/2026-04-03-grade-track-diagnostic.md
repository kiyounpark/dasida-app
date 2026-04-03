# Grade & Track Diagnostic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고1/고2/고3 학년과 고3 트랙(미적분/확통/기하)에 맞는 진단 10문제와 약점 연습 문제를 분리한다.

**Architecture:** `LearnerProfile`에 `track` 필드를 추가하고, `diagnosisMap`에 고3 전용 약점 11개를 추가한다. `problemData`와 `practiceMap`에 고3 트랙별 콘텐츠를 추가한 뒤, `session.tsx`에서 `getDiagnosticProblems(grade, track)`으로 학년/트랙별 문제를 선택한다. 온보딩에서 고3 선택 시 트랙 선택 스텝을 추가한다.

**Tech Stack:** TypeScript, React Native, Expo Router — JS-only 변경, 네이티브 빌드 불필요

**Skills:**
- `dasida-code-structure` — Thin Screen / hook 분리 기준 (Task 7 온보딩 변경 시)
- `building-native-ui` — 온보딩 트랙 선택 UI

---

## File Structure

| 파일 | 변경 종류 | 책임 |
|------|----------|------|
| `features/learner/types.ts` | Modify | `LearnerTrack` 타입, `LearnerProfile.track?` 필드 |
| `data/diagnosisMap.ts` | Modify | g3 WeaknessId 11개 + DiagnosisItem 정의 |
| `data/problemData.ts` | Modify | `grade`/`track` 필드, `getDiagnosticProblems()`, g3 진단 30문제 |
| `data/practiceMap.ts` | Modify | g3 약점별 연습문제 11개 추가 |
| `features/quiz/session.tsx` | Modify | `getDiagnosticProblems(grade, track)` 호출로 전환 |
| `features/learner/current-learner-controller.ts` | Modify | `updateOnboardingProfile(nickname, grade, track?)` |
| `features/learner/local-learner-profile-store.ts` | Modify | `track` 저장 |
| `features/learner/firestore-learner-profile-store.ts` | Modify | `track` 저장 |
| `features/learner/provider.tsx` | Modify | `updateOnboardingProfile` 시그니처 |
| `features/onboarding/hooks/use-onboarding-screen.ts` | Modify | `track` 상태 추가, g3 트랙 선택 |
| `features/onboarding/components/onboarding-screen-view.tsx` | Modify | 트랙 선택 UI 추가 |

---

## Task 1: `features/learner/types.ts` — LearnerTrack 추가

**Files:**
- Modify: `features/learner/types.ts`

- [ ] **Step 1: `LearnerTrack` 타입 추가 + `LearnerProfile`에 `track?` 필드**

`features/learner/types.ts`의 `LearnerGrade` 정의 바로 아래에 추가:

```ts
export type LearnerTrack = 'calc' | 'stats' | 'geom';
```

`LearnerProfile` 타입에 `track?` 필드 추가:

```ts
export type LearnerProfile = {
  accountKey: string;
  learnerId: string;
  nickname: string;
  grade: LearnerGrade;
  track?: LearnerTrack;          // 고3 전용: 'calc' | 'stats' | 'geom'
  createdAt: string;
  updatedAt: string;
  practiceGraduatedAt?: string;
};
```

- [ ] **Step 2: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add features/learner/types.ts
git commit -m "feat: LearnerTrack 타입 추가, LearnerProfile에 track 필드"
```

---

## Task 2: `data/diagnosisMap.ts` — 고3 약점 11개 추가

**Files:**
- Modify: `data/diagnosisMap.ts`

현재 `WeaknessId`는 고1 전용 23개. 고3 트랙별 공통 7개 + 트랙 특화 4개를 추가한다.

- [ ] **Step 1: `WeaknessId` 타입에 고3 약점 추가**

`data/diagnosisMap.ts`의 `WeaknessId` 타입 마지막 줄 (`'counting_overcounting'`) 다음에 추가:

```ts
  // 고3 공통 (미적분·확통·기하 모두)
  | 'g3_diff'
  | 'g3_sequence'
  | 'g3_log_exp'
  | 'g3_integral'
  | 'g3_trig'
  | 'g3_limit'
  | 'g3_conic'
  // 고3 확통 특화
  | 'g3_counting'
  | 'g3_probability'
  | 'g3_statistics'
  // 고3 기하 특화
  | 'g3_vector'
  | 'g3_space_geometry'
```

- [ ] **Step 2: `weaknessOrder`에 고3 약점 추가**

`weaknessOrder` 배열 끝에 추가:

```ts
  // 고3
  'g3_diff',
  'g3_sequence',
  'g3_log_exp',
  'g3_integral',
  'g3_trig',
  'g3_limit',
  'g3_conic',
  'g3_counting',
  'g3_probability',
  'g3_statistics',
  'g3_vector',
  'g3_space_geometry',
```

- [ ] **Step 3: `diagnosisMap`에 고3 DiagnosisItem 정의 추가**

`diagnosisMap` 객체의 `counting_overcounting` 항목 다음에 추가:

```ts
  g3_diff: {
    id: 'g3_diff',
    labelKo: '미분 계산',
    desc: '다항함수·합성함수·곱의 미분 계산에서 오류가 발생했습니다.',
    tip: 'f\'(x) 공식을 단계별로 적용하고, 각 항을 독립적으로 미분한 뒤 합산하세요.',
  },
  g3_sequence: {
    id: 'g3_sequence',
    labelKo: '수열 계산',
    desc: '등차·등비수열의 일반항이나 합 공식 적용에서 실수가 있었습니다.',
    tip: '등차수열 aₙ=a₁+(n-1)d, 등비수열 aₙ=a₁·rⁿ⁻¹ 공식을 먼저 확인하세요.',
  },
  g3_log_exp: {
    id: 'g3_log_exp',
    labelKo: '지수·로그 계산',
    desc: '지수법칙이나 로그 성질 적용 과정에서 오류가 있었습니다.',
    tip: 'logₐb + logₐc = logₐ(bc), aˣ·aʸ = aˣ⁺ʸ 등 기본 성질을 점검하세요.',
  },
  g3_integral: {
    id: 'g3_integral',
    labelKo: '적분 계산',
    desc: '부정적분이나 정적분 계산에서 실수가 있었습니다.',
    tip: '∫xⁿdx = xⁿ⁺¹/(n+1)+C 기본 공식부터 확인하고, 정적분은 [F(x)]ₐᵇ = F(b)-F(a)로 계산하세요.',
  },
  g3_trig: {
    id: 'g3_trig',
    labelKo: '삼각함수 계산',
    desc: '삼각함수의 기본 값이나 항등식 적용에서 오류가 있었습니다.',
    tip: '단위원에서 sin·cos·tan의 대표 값(0°, 30°, 45°, 60°, 90°)을 암기하세요.',
  },
  g3_limit: {
    id: 'g3_limit',
    labelKo: '극한 계산',
    desc: '함수의 극한 계산 과정에서 0/0 꼴 처리나 인수분해가 미숙합니다.',
    tip: '0/0 꼴은 분자·분모를 인수분해해 공통인수를 약분한 뒤 대입하세요.',
  },
  g3_conic: {
    id: 'g3_conic',
    labelKo: '이차곡선',
    desc: '포물선·타원·쌍곡선의 표준형과 초점·점근선 공식 적용이 어렵습니다.',
    tip: '각 곡선의 표준형을 먼저 정리하세요: 포물선 y²=4px, 타원 x²/a²+y²/b²=1, 쌍곡선 x²/a²-y²/b²=1.',
  },
  g3_counting: {
    id: 'g3_counting',
    labelKo: '경우의 수·순열·조합',
    desc: '순열과 조합 중 어느 것을 쓸지 판단하거나 중복 처리에서 실수가 있었습니다.',
    tip: '순서가 중요하면 순열 P(n,r), 순서 무관하면 조합 C(n,r). 중복 가능 여부도 함께 체크하세요.',
  },
  g3_probability: {
    id: 'g3_probability',
    labelKo: '확률 계산',
    desc: '조건부확률 또는 독립·종속 사건의 확률 계산에서 오류가 있었습니다.',
    tip: 'P(A|B) = P(A∩B)/P(B). 여사건 P(Aᶜ)=1-P(A)를 활용하면 계산이 편해지는 경우가 많습니다.',
  },
  g3_statistics: {
    id: 'g3_statistics',
    labelKo: '통계 (정규분포·이항분포)',
    desc: '정규분포 표준화나 이항분포 공식 적용에서 실수가 있었습니다.',
    tip: 'Z=(X-μ)/σ로 표준화 후 표준정규분포표를 읽으세요. 이항분포 B(n,p)의 평균=np, 분산=npq.',
  },
  g3_vector: {
    id: 'g3_vector',
    labelKo: '벡터 연산',
    desc: '벡터의 합·내적·크기 계산에서 오류가 있었습니다.',
    tip: '내적: a⃗·b⃗ = |a||b|cosθ = a₁b₁+a₂b₂. 크기: |a⃗| = √(a₁²+a₂²).',
  },
  g3_space_geometry: {
    id: 'g3_space_geometry',
    labelKo: '공간도형·정사영',
    desc: '공간에서 직선·평면의 위치 관계나 정사영 넓이 계산이 어렵습니다.',
    tip: '정사영 넓이 = 원래 넓이 × cosθ (θ: 두 평면이 이루는 각). 이면각을 먼저 구하세요.',
  },
```

- [ ] **Step 4: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add data/diagnosisMap.ts
git commit -m "feat: 고3 약점 12개 추가 (공통 7개 + 확통/기하 특화)"
```

---

## Task 3: `data/problemData.ts` — grade/track 필드 + 고3 진단 30문제

**Files:**
- Modify: `data/problemData.ts`

- [ ] **Step 1: `Problem` 타입에 `grade`와 `track` 필드 추가**

`data/problemData.ts`의 `Problem` 타입을 아래로 교체:

```ts
import type { LearnerGrade, LearnerTrack } from '@/features/learner/types';
import type { SolveMethodId } from './diagnosisTree';

export type Problem = {
  id: string;
  grade: LearnerGrade;
  track?: LearnerTrack;   // 고3 트랙별 문제에만 사용
  question: string;
  choices: string[];
  answerIndex: number;
  topic: string;
  diagnosisMethods: string[];
};
```

- [ ] **Step 2: 기존 고1 문제 10개에 `grade: 'g1'` 마킹**

기존 `problemData` 배열의 각 문제 객체에 `grade: 'g1'` 필드를 추가한다. 예:

```ts
{
  id: 'q1',
  grade: 'g1',
  question: 'sqrt(75) - 6/sqrt(3) + sqrt(48)의 값은?',
  ...
},
```

(10개 전부 동일하게 `grade: 'g1'` 추가)

- [ ] **Step 3: `getDiagnosticProblems` 유틸리티 함수 추가**

`problemData` 배열 선언 다음에 추가:

```ts
import type { LearnerGrade, LearnerTrack } from '@/features/learner/types';

export function getDiagnosticProblems(
  grade: LearnerGrade,
  track?: LearnerTrack,
): Problem[] {
  // g2는 아직 전용 콘텐츠가 없으므로 g1 fallback
  const effectiveGrade = grade === 'g2' || grade === 'unknown' ? 'g1' : grade;

  return problemData.filter((p) => {
    if (p.grade !== effectiveGrade) return false;
    if (effectiveGrade === 'g3' && p.track !== track) return false;
    return true;
  });
}
```

- [ ] **Step 4: 고3 미적분 진단 10문제 추가**

`problemData` 배열 끝에 추가:

```ts
  // ─── 고3 미적분 (calc) ───────────────────────────────────────────
  {
    id: 'g3_calc_q1',
    grade: 'g3',
    track: 'calc',
    question: 'f(x) = 3x^4 - 2x^3 + x일 때, f\'(x)는?',
    choices: ['12x^3-6x^2+1', '12x^3-6x^2', '3x^3-2x^2+1', '12x^4-6x^3+1', '4x^3-3x^2+1'],
    answerIndex: 0,
    topic: '미분',
    diagnosisMethods: ['g3_diff'],
  },
  {
    id: 'g3_calc_q2',
    grade: 'g3',
    track: 'calc',
    question: 'f(x) = (x^2+1)(2x-3)일 때, f\'(1)은?',
    choices: ['0', '1', '2', '4', '6'],
    answerIndex: 2,
    topic: '미분',
    diagnosisMethods: ['g3_diff'],
  },
  {
    id: 'g3_calc_q3',
    grade: 'g3',
    track: 'calc',
    question: '등차수열 {a_n}에서 a_1=2, 공차=3일 때, a_5는?',
    choices: ['10', '11', '12', '13', '14'],
    answerIndex: 4,
    topic: '수열',
    diagnosisMethods: ['g3_sequence'],
  },
  {
    id: 'g3_calc_q4',
    grade: 'g3',
    track: 'calc',
    question: 'log_2(8) + log_2(4)의 값은?',
    choices: ['3', '4', '5', '6', '7'],
    answerIndex: 2,
    topic: '지수·로그',
    diagnosisMethods: ['g3_log_exp'],
  },
  {
    id: 'g3_calc_q5',
    grade: 'g3',
    track: 'calc',
    question: '정적분 ∫_0^2 (3x^2+2x)dx의 값은?',
    choices: ['8', '10', '12', '14', '16'],
    answerIndex: 2,
    topic: '적분',
    diagnosisMethods: ['g3_integral'],
  },
  {
    id: 'g3_calc_q6',
    grade: 'g3',
    track: 'calc',
    question: 'sin(π/6) + cos(π/3)의 값은?',
    choices: ['0', '1/2', '√2/2', '1', '√3/2'],
    answerIndex: 3,
    topic: '삼각함수',
    diagnosisMethods: ['g3_trig'],
  },
  {
    id: 'g3_calc_q7',
    grade: 'g3',
    track: 'calc',
    question: 'lim_{x→2} (x^2-4)/(x-2)의 값은?',
    choices: ['0', '2', '4', '8', '존재하지 않는다'],
    answerIndex: 2,
    topic: '극한',
    diagnosisMethods: ['g3_limit'],
  },
  {
    id: 'g3_calc_q8',
    grade: 'g3',
    track: 'calc',
    question: '포물선 y^2 = 8x의 초점의 x좌표는?',
    choices: ['1', '2', '4', '8', '-2'],
    answerIndex: 1,
    topic: '이차곡선',
    diagnosisMethods: ['g3_conic'],
  },
  {
    id: 'g3_calc_q9',
    grade: 'g3',
    track: 'calc',
    question: '등비수열 {a_n}에서 a_1=2, 공비=3일 때, a_1+a_2+a_3는?',
    choices: ['20', '22', '24', '26', '28'],
    answerIndex: 3,
    topic: '수열',
    diagnosisMethods: ['g3_sequence'],
  },
  {
    id: 'g3_calc_q10',
    grade: 'g3',
    track: 'calc',
    question: 'f(x) = x^3 - 3x^2일 때, 극솟값은?',
    choices: ['-4', '-3', '-2', '0', '4'],
    answerIndex: 0,
    topic: '미분 (극값)',
    diagnosisMethods: ['g3_diff'],
  },
```

- [ ] **Step 5: 고3 확통 진단 10문제 추가**

```ts
  // ─── 고3 확률과통계 (stats) ──────────────────────────────────────
  {
    id: 'g3_stats_q1',
    grade: 'g3',
    track: 'stats',
    question: 'f(x) = 4x^3 - 6x + 1일 때, f\'(2)는?',
    choices: ['30', '36', '42', '48', '54'],
    answerIndex: 2,
    topic: '미분',
    diagnosisMethods: ['g3_diff'],
  },
  {
    id: 'g3_stats_q2',
    grade: 'g3',
    track: 'stats',
    question: 'f(x) = x^3 + 3x^2 - 9x일 때, 극댓값은?',
    choices: ['5', '9', '18', '27', '32'],
    answerIndex: 3,
    topic: '미분 (극값)',
    diagnosisMethods: ['g3_diff'],
  },
  {
    id: 'g3_stats_q3',
    grade: 'g3',
    track: 'stats',
    question: '1+3+5+...+9 (홀수 5개의 합)은?',
    choices: ['15', '20', '25', '30', '35'],
    answerIndex: 2,
    topic: '수열',
    diagnosisMethods: ['g3_sequence'],
  },
  {
    id: 'g3_stats_q4',
    grade: 'g3',
    track: 'stats',
    question: '2^(x+1) = 32일 때, x는?',
    choices: ['2', '3', '4', '5', '6'],
    answerIndex: 2,
    topic: '지수',
    diagnosisMethods: ['g3_log_exp'],
  },
  {
    id: 'g3_stats_q5',
    grade: 'g3',
    track: 'stats',
    question: 'tan(π/4) + sin(π/2)의 값은?',
    choices: ['0', '1', '√2', '2', '√3+1'],
    answerIndex: 3,
    topic: '삼각함수',
    diagnosisMethods: ['g3_trig'],
  },
  {
    id: 'g3_stats_q6',
    grade: 'g3',
    track: 'stats',
    question: '정적분 ∫_1^3 (2x+1)dx의 값은?',
    choices: ['6', '8', '10', '12', '14'],
    answerIndex: 2,
    topic: '적분',
    diagnosisMethods: ['g3_integral'],
  },
  {
    id: 'g3_stats_q7',
    grade: 'g3',
    track: 'stats',
    question: '5명 중 2명을 순서 있게 뽑는 경우의 수는?',
    choices: ['10', '15', '20', '24', '30'],
    answerIndex: 2,
    topic: '순열',
    diagnosisMethods: ['g3_counting'],
  },
  {
    id: 'g3_stats_q8',
    grade: 'g3',
    track: 'stats',
    question: '타원 x^2/9 + y^2/4 = 1의 장축의 길이는?',
    choices: ['3', '4', '5', '6', '8'],
    answerIndex: 3,
    topic: '이차곡선',
    diagnosisMethods: ['g3_conic'],
  },
  {
    id: 'g3_stats_q9',
    grade: 'g3',
    track: 'stats',
    question: 'lim_{x→0} sin(2x)/x의 값은?',
    choices: ['0', '1', '2', '4', '존재하지 않는다'],
    answerIndex: 2,
    topic: '극한',
    diagnosisMethods: ['g3_limit'],
  },
  {
    id: 'g3_stats_q10',
    grade: 'g3',
    track: 'stats',
    question: 'P(A)=1/2, P(B|A)=1/3일 때, P(A∩B)는?',
    choices: ['1/8', '1/6', '1/4', '1/3', '5/6'],
    answerIndex: 1,
    topic: '확률',
    diagnosisMethods: ['g3_probability'],
  },
```

- [ ] **Step 6: 고3 기하 진단 10문제 추가**

```ts
  // ─── 고3 기하 (geom) ────────────────────────────────────────────
  {
    id: 'g3_geom_q1',
    grade: 'g3',
    track: 'geom',
    question: 'f(x) = x^4 - 4x^3일 때, f\'(3)은?',
    choices: ['-12', '-4', '0', '4', '12'],
    answerIndex: 2,
    topic: '미분',
    diagnosisMethods: ['g3_diff'],
  },
  {
    id: 'g3_geom_q2',
    grade: 'g3',
    track: 'geom',
    question: 'g(x) = (2x-1)^3일 때, g\'(1)은?',
    choices: ['2', '4', '6', '8', '12'],
    answerIndex: 2,
    topic: '미분 (합성함수)',
    diagnosisMethods: ['g3_diff'],
  },
  {
    id: 'g3_geom_q3',
    grade: 'g3',
    track: 'geom',
    question: '등차수열에서 a_3=7, a_7=19일 때, a_5는?',
    choices: ['11', '12', '13', '14', '15'],
    answerIndex: 2,
    topic: '수열',
    diagnosisMethods: ['g3_sequence'],
  },
  {
    id: 'g3_geom_q4',
    grade: 'g3',
    track: 'geom',
    question: 'sin60° × cos30°의 값은?',
    choices: ['1/4', '1/2', '3/4', '1', '√3/2'],
    answerIndex: 2,
    topic: '삼각함수',
    diagnosisMethods: ['g3_trig'],
  },
  {
    id: 'g3_geom_q5',
    grade: 'g3',
    track: 'geom',
    question: '쌍곡선 x^2/4 - y^2/9 = 1의 점근선 기울기의 절댓값은?',
    choices: ['1/3', '2/3', '1', '3/2', '2'],
    answerIndex: 3,
    topic: '이차곡선',
    diagnosisMethods: ['g3_conic'],
  },
  {
    id: 'g3_geom_q6',
    grade: 'g3',
    track: 'geom',
    question: 'log_3(27) - log_3(3)의 값은?',
    choices: ['1', '2', '3', '6', '9'],
    answerIndex: 1,
    topic: '로그',
    diagnosisMethods: ['g3_log_exp'],
  },
  {
    id: 'g3_geom_q7',
    grade: 'g3',
    track: 'geom',
    question: '정적분 ∫_0^1 (4x^3-2x)dx의 값은?',
    choices: ['-1', '0', '1', '2', '4'],
    answerIndex: 1,
    topic: '적분',
    diagnosisMethods: ['g3_integral'],
  },
  {
    id: 'g3_geom_q8',
    grade: 'g3',
    track: 'geom',
    question: 'lim_{x→3} (x^2-9)/(x-3)의 값은?',
    choices: ['0', '3', '6', '9', '존재하지 않는다'],
    answerIndex: 2,
    topic: '극한',
    diagnosisMethods: ['g3_limit'],
  },
  {
    id: 'g3_geom_q9',
    grade: 'g3',
    track: 'geom',
    question: '벡터 a⃗=(3,4)의 크기는?',
    choices: ['3', '4', '5', '7', '√7'],
    answerIndex: 2,
    topic: '벡터',
    diagnosisMethods: ['g3_vector'],
  },
  {
    id: 'g3_geom_q10',
    grade: 'g3',
    track: 'geom',
    question: '정사면체의 꼭짓점 수, 모서리 수, 면 수의 합은?',
    choices: ['10', '12', '14', '16', '18'],
    answerIndex: 2,
    topic: '공간도형',
    diagnosisMethods: ['g3_space_geometry'],
  },
```

- [ ] **Step 7: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

- [ ] **Step 8: 커밋**

```bash
git add data/problemData.ts
git commit -m "feat: 고3 트랙별 진단 30문제 추가 (미적분·확통·기하 각 10문제)"
```

---

## Task 4: `data/practiceMap.ts` — 고3 약점 연습문제 11개 추가

**Files:**
- Modify: `data/practiceMap.ts`

현재 `practiceMap`은 `Record<WeaknessId, PracticeProblem>`. `WeaknessId`에 g3 약점이 추가됐으므로 누락 항목을 채운다.

- [ ] **Step 1: 고3 연습문제 11개 추가**

`practiceMap` 객체의 `counting_overcounting` 항목 다음에 추가:

```ts
  // ─── 고3 공통 ────────────────────────────────────────────────────
  g3_diff: {
    id: 'p_g3_diff',
    weaknessId: 'g3_diff',
    question: 'f(x) = x^3 - 6x^2 + 9x + 1일 때, 극솟값을 주는 x는?',
    choices: ['1', '2', '3', '4', '6'],
    answerIndex: 2,
    hint: 'f\'(x)=0의 두 근에서 f\'의 부호 변화(음→양)를 확인하세요.',
    explanation: 'f\'(x)=3x^2-12x+9=3(x-1)(x-3). x=1에서 양→음(극대), x=3에서 음→양(극소). 극솟값은 x=3.',
  },
  g3_sequence: {
    id: 'p_g3_sequence',
    weaknessId: 'g3_sequence',
    question: '등비수열 {a_n}에서 a_1=2, a_3=18일 때, 공비는?',
    choices: ['1', '2', '3', '6', '9'],
    answerIndex: 2,
    hint: 'a_3 = a_1 × r^2 를 이용하세요.',
    explanation: 'a_3 = a_1·r^2 → 18 = 2·r^2 → r^2=9 → r=3 (r>0 가정).',
  },
  g3_log_exp: {
    id: 'p_g3_log_exp',
    weaknessId: 'g3_log_exp',
    question: 'log_2(x) = 4일 때, x의 값은?',
    choices: ['4', '8', '12', '16', '32'],
    answerIndex: 3,
    hint: 'log_a(x) = n이면 x = a^n 입니다.',
    explanation: 'log_2(x)=4 → x=2^4=16.',
  },
  g3_integral: {
    id: 'p_g3_integral',
    weaknessId: 'g3_integral',
    question: '정적분 ∫_0^3 2x dx의 값은?',
    choices: ['3', '6', '9', '12', '18'],
    answerIndex: 2,
    hint: '∫2x dx = x^2+C. 정적분은 [x^2]_0^3 = 3^2 - 0^2 으로 계산하세요.',
    explanation: '[x^2]_0^3 = 9 - 0 = 9.',
  },
  g3_trig: {
    id: 'p_g3_trig',
    weaknessId: 'g3_trig',
    question: 'sin^2θ + cos^2θ의 값은?',
    choices: ['0', '1/2', '1', '√2', '2'],
    answerIndex: 2,
    hint: '삼각함수의 피타고라스 항등식을 떠올려보세요.',
    explanation: 'sin^2θ + cos^2θ = 1 은 항상 성립하는 삼각함수 항등식입니다.',
  },
  g3_limit: {
    id: 'p_g3_limit',
    weaknessId: 'g3_limit',
    question: 'lim_{x→1} (x^2-1)/(x-1)의 값은?',
    choices: ['0', '1', '2', '4', '존재하지 않는다'],
    answerIndex: 2,
    hint: '분자 x^2-1 = (x-1)(x+1)로 인수분해하세요.',
    explanation: '(x^2-1)/(x-1) = (x-1)(x+1)/(x-1) = x+1. x=1 대입 → 2.',
  },
  g3_conic: {
    id: 'p_g3_conic',
    weaknessId: 'g3_conic',
    question: '포물선 y^2 = 4x의 초점의 좌표는?',
    choices: ['(-1,0)', '(0,1)', '(1,0)', '(4,0)', '(0,-1)'],
    answerIndex: 2,
    hint: 'y^2 = 4px에서 초점은 (p, 0)에 있습니다.',
    explanation: 'y^2=4px에서 4p=4이므로 p=1. 초점은 (1, 0).',
  },
  // ─── 고3 확통 특화 ───────────────────────────────────────────────
  g3_counting: {
    id: 'p_g3_counting',
    weaknessId: 'g3_counting',
    question: '4명을 2명씩 두 팀으로 나누는 방법의 수는?',
    choices: ['2', '3', '4', '6', '12'],
    answerIndex: 1,
    hint: '두 팀이 구별되지 않으면 C(4,2)를 2로 나눕니다.',
    explanation: 'C(4,2)=6. 두 팀의 순서 구별이 없으므로 6/2=3.',
  },
  g3_probability: {
    id: 'p_g3_probability',
    weaknessId: 'g3_probability',
    question: '동전 2개를 던질 때 적어도 1개가 앞면이 나올 확률은?',
    choices: ['1/4', '1/2', '3/4', '3/8', '1'],
    answerIndex: 2,
    hint: '여사건을 이용하세요: P(적어도 1개 앞면) = 1 - P(모두 뒷면).',
    explanation: 'P(모두 뒷면)=(1/2)^2=1/4. 따라서 1-1/4=3/4.',
  },
  g3_statistics: {
    id: 'p_g3_statistics',
    weaknessId: 'g3_statistics',
    question: '확률변수 X ~ B(4, 1/2)일 때, E(X)는?',
    choices: ['1', '2', '3', '4', '1/2'],
    answerIndex: 1,
    hint: '이항분포 B(n,p)의 평균 E(X) = np.',
    explanation: 'E(X) = np = 4 × 1/2 = 2.',
  },
  // ─── 고3 기하 특화 ───────────────────────────────────────────────
  g3_vector: {
    id: 'p_g3_vector',
    weaknessId: 'g3_vector',
    question: '벡터 a⃗=(2,-1), b⃗=(-1,3)일 때, a⃗+b⃗는?',
    choices: ['(1,2)', '(3,4)', '(-1,2)', '(1,-2)', '(3,-4)'],
    answerIndex: 0,
    hint: '벡터의 합은 성분별로 더합니다.',
    explanation: '(2+(-1), -1+3) = (1, 2).',
  },
  g3_space_geometry: {
    id: 'p_g3_space_geometry',
    weaknessId: 'g3_space_geometry',
    question: '정사면체의 꼭짓점(V), 모서리(E), 면(F)의 수의 합 V+E+F는?',
    choices: ['10', '12', '14', '16', '18'],
    answerIndex: 2,
    hint: '정사면체: 꼭짓점 4개, 모서리 6개, 면 4개.',
    explanation: 'V=4, E=6, F=4. 합=14. (오일러 공식 V-E+F=2 확인: 4-6+4=2 ✓)',
  },
```

- [ ] **Step 2: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add data/practiceMap.ts
git commit -m "feat: 고3 약점 연습문제 11개 추가"
```

---

## Task 5: `features/quiz/session.tsx` — getDiagnosticProblems 호출

**Files:**
- Modify: `features/quiz/session.tsx`

현재 `session.tsx`는 `problemData`를 모듈 레벨 상수로 사용한다. `QuizSessionProvider`는 `CurrentLearnerProvider` 안에 있으므로 `useCurrentLearner()`를 호출할 수 있다.

- [ ] **Step 1: import 교체**

기존:
```ts
import { problemData } from '@/data/problemData';
```

교체:
```ts
import { getDiagnosticProblems } from '@/data/problemData';
```

- [ ] **Step 2: `TOTAL_QUESTIONS` 상수 제거 + `QuizSessionProvider` 내부에서 동적 계산**

기존 모듈 레벨:
```ts
const TOTAL_QUESTIONS = problemData.length;
```

이 줄을 삭제한다.

`QuizSessionProvider` 함수 상단에 추가:

```ts
export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const { profile } = useCurrentLearner();
  const problems = getDiagnosticProblems(
    profile?.grade ?? 'unknown',
    profile?.track,
  );
  const TOTAL_QUESTIONS = problems.length;
  // ... 나머지 기존 코드
```

- [ ] **Step 3: `useCurrentLearner` import 추가**

파일 상단에:
```ts
import { useCurrentLearner } from '@/features/learner/provider';
```

- [ ] **Step 4: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음 (`diagnostic-screen-helpers.ts`의 `problemById`는 전체 `problemData`를 사용하므로 변경 불필요)

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/session.tsx
git commit -m "feat: 진단 문제를 학년/트랙별로 동적 선택 (getDiagnosticProblems)"
```

---

## Task 6: `updateOnboardingProfile` — track 파라미터 추가

**Files:**
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/learner/local-learner-profile-store.ts`
- Modify: `features/learner/firestore-learner-profile-store.ts`
- Modify: `features/learner/provider.tsx`

- [ ] **Step 1: `current-learner-controller.ts` — 시그니처 변경**

`updateOnboardingProfile` 인터페이스 및 구현에 `track?` 추가.

인터페이스:
```ts
updateOnboardingProfile(
  nickname: string,
  grade: Exclude<LearnerProfile['grade'], 'unknown'>,
  track?: LearnerProfile['track'],
): Promise<CurrentLearnerSnapshot>;
```

구현부 (`async` 함수):
```ts
updateOnboardingProfile: async (nickname, grade, track) => {
  const snapshot = await learnerController.updateOnboardingProfile(nickname, grade, track);
  ...
}
```

컨트롤러 내부 로직에서 `track`을 `profileStore.save()`로 전달:
```ts
await profileStore.save({
  ...existingProfile,
  nickname,
  grade,
  ...(track ? { track } : {}),
  updatedAt: new Date().toISOString(),
});
```

- [ ] **Step 2: `local-learner-profile-store.ts` — `track` 저장 확인**

`LearnerProfile` 타입에 이미 `track?`이 추가됐으므로 별도 변경 없이 저장된다. TypeScript 체크로 확인.

- [ ] **Step 3: `provider.tsx` — `updateOnboardingProfile` 시그니처 업데이트**

`updateOnboardingProfile` 타입 정의:
```ts
updateOnboardingProfile: (
  nickname: string,
  grade: Exclude<LearnerGrade, 'unknown'>,
  track?: LearnerTrack,
) => Promise<void>;
```

- [ ] **Step 4: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add features/learner/current-learner-controller.ts features/learner/provider.tsx
git commit -m "feat: updateOnboardingProfile에 track 파라미터 추가"
```

---

## Task 7: 온보딩 UI — 고3 트랙 선택 스텝

**Files:**
- Modify: `features/onboarding/hooks/use-onboarding-screen.ts`
- Modify: `features/onboarding/components/onboarding-screen-view.tsx`

**dasida-code-structure 참고:**
- `use-onboarding-screen.ts`는 현재 52줄. 트랙 상태 추가 후 ~70줄. hook 분리 기준(80줄) 이하, 분리 불필요.
- `onboarding-screen-view.tsx`는 현재 ~280줄. 트랙 카드 UI 추가 후 ~320줄. screen 분리 기준(200줄) 초과 상태이나 이번 변경 범위 외.

- [ ] **Step 1: `use-onboarding-screen.ts` — track 상태 추가**

`use-onboarding-screen.ts` 전체 교체:

```ts
import { router } from 'expo-router';
import { useState } from 'react';

import type { LearnerGrade, LearnerTrack } from '@/features/learner/types';
import { useCurrentLearner } from '@/features/learner/provider';

export type UseOnboardingScreenResult = {
  nickname: string;
  grade: Exclude<LearnerGrade, 'unknown'> | null;
  track: LearnerTrack | null;
  showTrackStep: boolean;
  isBusy: boolean;
  isReady: boolean;
  errorMessage: string | null;
  onChangeNickname: (value: string) => void;
  onSelectGrade: (grade: Exclude<LearnerGrade, 'unknown'>) => void;
  onSelectTrack: (track: LearnerTrack) => void;
  onSubmit: () => Promise<void>;
};

export function useOnboardingScreen(): UseOnboardingScreenResult {
  const { updateOnboardingProfile } = useCurrentLearner();
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<Exclude<LearnerGrade, 'unknown'> | null>(null);
  const [track, setTrack] = useState<LearnerTrack | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showTrackStep = grade === 'g3';
  const isReady =
    nickname.trim().length > 0 &&
    grade !== null &&
    (grade !== 'g3' || track !== null);

  const onSelectGrade = (newGrade: Exclude<LearnerGrade, 'unknown'>) => {
    setGrade(newGrade);
    if (newGrade !== 'g3') {
      setTrack(null);
    }
  };

  const onSubmit = async () => {
    if (!isReady || isBusy || !grade) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await updateOnboardingProfile(
        nickname.trim(),
        grade,
        grade === 'g3' ? (track ?? undefined) : undefined,
      );
      router.replace('/(tabs)/quiz');
    } catch {
      setErrorMessage('저장 중 오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setIsBusy(false);
    }
  };

  return {
    nickname,
    grade,
    track,
    showTrackStep,
    isBusy,
    isReady,
    errorMessage,
    onChangeNickname: setNickname,
    onSelectGrade,
    onSelectTrack: setTrack,
    onSubmit,
  };
}
```

- [ ] **Step 2: `onboarding-screen-view.tsx` — TrackCard 컴포넌트 + 트랙 선택 섹션 추가**

`OnboardingScreenView` props 타입에 `track`, `showTrackStep`, `onSelectTrack` 추가:

```tsx
import type { LearnerTrack } from '@/features/learner/types';

const TRACK_OPTIONS: { value: LearnerTrack; label: string; sub: string }[] = [
  { value: 'calc', label: '미적분', sub: '미적분 선택' },
  { value: 'stats', label: '확통', sub: '확률과통계 선택' },
  { value: 'geom', label: '기하', sub: '기하 선택' },
];
```

`GradeCard`와 동일한 패턴으로 `TrackCard` 컴포넌트 추가 (같은 스타일 재사용):

```tsx
function TrackCard({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePress = () => {
    scale.value = withSpring(1.06, { damping: 12 }, () => {
      scale.value = withSpring(selected ? 1 : 1.04);
    });
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 선택`}
      accessibilityState={{ selected }}
      style={styles.gradeCardWrap}>
      <Animated.View style={[styles.gradeCard, selected && styles.gradeCardSelected, animatedStyle]}>
        <Text style={[styles.gradeLabel, selected && styles.gradeLabelSelected]}>{label}</Text>
        <Text style={[styles.gradeSub, selected && styles.gradeSubSelected]}>{sub}</Text>
      </Animated.View>
    </Pressable>
  );
}
```

학년 선택 섹션 다음에 트랙 선택 섹션 추가 (고3 선택 시만 표시):

```tsx
{showTrackStep ? (
  <Animated.View entering={FadeInUp.duration(220).delay(200)} style={styles.fieldBlock}>
    <Text selectable style={styles.fieldLabel}>수능 수학 선택과목</Text>
    <View style={styles.gradeRow}>
      {TRACK_OPTIONS.map((option) => (
        <TrackCard
          key={option.value}
          label={option.label}
          sub={option.sub}
          selected={track === option.value}
          onPress={() => onSelectTrack(option.value)}
        />
      ))}
    </View>
  </Animated.View>
) : null}
```

`OnboardingScreenView` props에 `track`, `showTrackStep`, `onSelectTrack` 추가:

```tsx
export function OnboardingScreenView({
  nickname,
  grade,
  track,
  showTrackStep,
  isBusy,
  isReady,
  errorMessage,
  onChangeNickname,
  onSelectGrade,
  onSelectTrack,
  onSubmit,
}: UseOnboardingScreenResult) {
```

- [ ] **Step 3: TypeScript 체크**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add features/onboarding/hooks/use-onboarding-screen.ts \
        features/onboarding/components/onboarding-screen-view.tsx
git commit -m "feat: 온보딩 고3 트랙 선택 스텝 추가 (미적분/확통/기하)"
```

---

## Task 8: 전체 검증

- [ ] **Step 1: 전체 TypeScript 검사**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: 출력 없음 (오류 없음)

- [ ] **Step 2: Push**

```bash
git push origin main && npm run log:commit
```

- [ ] **Step 3: 수동 검증 체크리스트**

Metro 캐시 클리어 후 확인:
```bash
npx expo start --clear
```

확인 항목:
1. **고1 온보딩** → 트랙 선택 없음 → 진단 시작 → 기존 고1 문제 10개 표시
2. **고3 온보딩** → 학년 고3 선택 시 트랙 선택 섹션 등장 → 미적분/확통/기하 중 선택 가능
3. **고3 확통 선택** → 진단 시작 → g3_stats_q1 ~ g3_stats_q10 문제 표시
4. **고3 미적분 선택** → 진단 완료 후 약점 → `practiceMap.g3_diff` 연습문제 표시
5. **고2** → 트랙 선택 없음, 진단은 고1 문제 fallback

---

## Self-Review

**Spec coverage:**
- ✅ `LearnerTrack` 타입 추가 — Task 1
- ✅ `LearnerProfile.track?` 필드 — Task 1
- ✅ 고3 WeaknessId 11개 — Task 2
- ✅ `problemData.grade` + `track` 필드 — Task 3
- ✅ `getDiagnosticProblems(grade, track)` — Task 3
- ✅ 고3 진단 30문제 (트랙별 10개) — Task 3
- ✅ 고3 연습문제 11개 — Task 4
- ✅ `session.tsx` 동적 문제 선택 — Task 5
- ✅ `updateOnboardingProfile` track 파라미터 — Task 6
- ✅ 온보딩 트랙 선택 UI — Task 7
- ✅ 고2 → g1 fallback — Task 3 (`getDiagnosticProblems`)

**Placeholder scan:** 없음 — 모든 단계에 실제 코드 포함

**Type consistency:**
- `LearnerTrack` — Task 1 정의, Task 3/5/6/7에서 사용 ✅
- `getDiagnosticProblems(grade, track?)` — Task 3 정의, Task 5에서 호출 ✅
- `updateOnboardingProfile(nickname, grade, track?)` — Task 6 변경, Task 7에서 호출 ✅
