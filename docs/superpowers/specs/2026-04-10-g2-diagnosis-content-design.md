# 고2 진단 콘텐츠 설계 문서

**날짜:** 2026-04-10
**상태:** 승인됨

---

## 배경

`data/problemData.ts:422`에 `g2`는 `g1` fallback 처리 중이다.

```ts
// g2는 아직 전용 콘텐츠가 없으므로 g1 fallback
const effectiveGrade = grade === 'g2' || grade === 'unknown' ? 'g1' : grade;
```

고2 학생이 로그인하면 모의고사(30문제)는 정상 작동하지만, 10문제 진단·약점 분석·복습은 고1 개념 기준으로 진행된다. 학생 입장에서 학년이 맞지 않는 콘텐츠를 보게 되는 문제가 있다.

---

## 목표

3년치 고2 학력평가(2024·2025·2026년 3월) 출제 데이터를 기반으로 고2 전용 진단 콘텐츠를 구축한다.

- 고2 전용 WeaknessId 20개 정의 (`g2_xxx` prefix)
- 고2 진단 문제 10개 작성
- 고2 진단 트리(SolveMethod → 약점 라우팅) 구성
- 고2 약점별 복습 콘텐츠(heroPrompt + thinkingSteps) 작성
- `g2 → g1 fallback` 제거

---

## 범위 결정

### 시험 범위: 학력평가 전체 단원

고2 3월 학력평가(공통)는 고1 공통수학 + 수학I 초반 내용을 포함한다.
실제 출제 데이터를 기반으로 하는 것이 가장 실전적이므로, 수학I 단원만이 아닌 학력평가 전체 출제 범위를 커버한다.

3년치 출제 빈도 (2024·2025·2026 합산):

| 단원 | 빈도 | diagnosisMethod |
|------|------|----------------|
| 방정식/미분 | 최다 | `diff` (기존 + g2 서브선택지) |
| 명제 | 높음 | `proposition` (신규) |
| 집합 | 높음 | `set` (신규) |
| 다항식 | 중간 | `polynomial` (기존 + g2 서브선택지) |
| 무리수/실수 | 중간 | `radical` (기존 + g2 서브선택지) |
| 순열/조합 | 중간 | `counting` (기존 + g2 서브선택지) |
| 삼각함수 | 중간 | `trig` (신규) |
| 이차방정식 | 낮음 | `quadratic`/`vertex` (기존) |
| 적분 | 낮음 | `integral` (신규) |
| 부등식/함수 | 낮음 | `linear_eq` (신규) |

### 약점 구조: g2_xxx 완전 분리 (g3 패턴)

g3(`g3_diff`, `g3_trig` 등)와 동일한 방식으로 g2_xxx prefix를 사용한다.
고1 WeaknessId와 완전 분리하여 학년별 맞춤 설명·팁을 작성한다.

---

## 설계

### 1. WeaknessId — 20개

#### 집합 (3개)
```ts
'g2_set_operation'     // 합집합·교집합 연산 오류
'g2_set_complement'    // 여집합·전체집합 범위 혼동
'g2_set_count'         // 원소 개수 계산 오류
```

#### 명제 (3개)
```ts
'g2_prop_contrapositive'        // 역·이·대우 혼동
'g2_prop_necessary_sufficient'  // 필요충분조건 구분 오류
'g2_prop_quantifier'            // 전칭·존재 명제 혼동
```

#### 삼각함수 (3개)
```ts
'g2_trig_unit_circle'      // 단위원 좌표 혼동
'g2_trig_equation_range'   // 삼각방정식 범위 설정 오류
'g2_trig_identity'         // 삼각함수 항등식 활용 오류
```

#### 다항식·방정식 (3개)
```ts
'g2_poly_factoring'   // 인수분해 패턴 누락
'g2_poly_remainder'   // 나머지정리 적용 오류
'g2_eq_setup'         // 방정식 세우기·풀이 순서 오류
```

#### 무리수·실수 (2개)
```ts
'g2_radical_simplify'     // 무리식 간소화 오류
'g2_radical_rationalize'  // 유리화 계산 오류
```

#### 미분·적분 (2개)
```ts
'g2_diff_application'  // 미분 활용(최댓·최솟값) 오류
'g2_integral_basic'    // 정적분 기본 계산 오류
```

#### 경우의 수 (2개)
```ts
'g2_counting_method'       // 경우의 수 방법 선택 오류
'g2_counting_overcounting' // 중복 계산 오류
```

#### 부등식·함수 (2개)
```ts
'g2_inequality_range'  // 이차부등식 범위 판단 오류
'g2_function_domain'   // 함수 정의역·치역 혼동
```

---

### 2. 진단 문제 10개 구성

학력평가 출제 빈도 비례로 단원 배분한다. 문제는 고1 방식과 동일하게 텍스트 기반으로 작성한다 (이미지 기반 아님).

| ID | 단원 | 진단할 약점 후보 |
|----|------|----------------|
| q2_1 | 집합 | g2_set_operation / g2_set_complement / g2_set_count |
| q2_2 | 명제 (역·이·대우) | g2_prop_contrapositive / g2_prop_necessary_sufficient |
| q2_3 | 명제 (전칭·존재) | g2_prop_quantifier / g2_prop_necessary_sufficient |
| q2_4 | 삼각함수 (단위원) | g2_trig_unit_circle / g2_trig_equation_range |
| q2_5 | 다항식·나머지 | g2_poly_factoring / g2_poly_remainder |
| q2_6 | 방정식·미분 | g2_eq_setup / g2_diff_application |
| q2_7 | 무리수 | g2_radical_simplify / g2_radical_rationalize |
| q2_8 | 경우의 수 | g2_counting_method / g2_counting_overcounting |
| q2_9 | 적분 | g2_integral_basic / g2_diff_application |
| q2_10 | 부등식·함수 | g2_inequality_range / g2_function_domain |

---

### 3. 진단 트리 (SolveMethodId 확장)

#### 신규 SolveMethodId 5개

```ts
'set'         // 집합 연산
'proposition' // 명제 판별
'trig'        // 삼각함수
'integral'    // 적분
'linear_eq'   // 부등식·함수
```

기존 `polynomial`, `diff`, `radical`, `counting`은 유지하고 g2용 서브 선택지를 추가한다.

#### 진단 트리 흐름

```
문제 틀림
  → 어떤 방법으로 접근했나요? (SolveMethodId 선택)
    → 어디서 막혔나요? (DiagnosisSubChoice)
      → g2_xxx WeaknessId 확정
```

각 SolveMethod당 서브 선택지 3개 (g2 맞춤 문구). 예시:

```ts
set: {
  methodId: 'set',
  prompt: '집합 문제에서 어디가 가장 어려웠나요?',
  choices: [
    { id: 'set_operation', text: '합집합·교집합 계산에서 헷갈렸어요.', weaknessId: 'g2_set_operation' },
    { id: 'set_complement', text: '여집합 범위를 잘못 잡았어요.', weaknessId: 'g2_set_complement' },
    { id: 'set_count', text: '원소 개수를 세다가 틀렸어요.', weaknessId: 'g2_set_count' },
  ],
},
```

---

### 4. 복습 콘텐츠 (review-content-map.ts)

20개 약점 × 각 3단계 사고 흐름 = 60개 항목.

구조는 고1과 동일:

```ts
type ReviewContent = {
  heroPrompt: string;
  thinkingSteps: Array<{ title: string; body: string }>;
};
```

예시:

```ts
g2_trig_unit_circle: {
  heroPrompt: '삼각함수 단위원에서 좌표를 읽는 방법을 다시 떠올려볼게요.',
  thinkingSteps: [
    { title: '단위원의 기본', body: '각도 θ에서 x=cosθ, y=sinθ임을 먼저 확인' },
    { title: '사분면 부호 판단', body: 'x/y 부호를 사분면으로 먼저 확인하고 값을 읽기' },
    { title: '특수각 적용', body: '30°·45°·60° 값을 기억에서 복원하여 대입' },
  ],
},
```

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `data/diagnosisMap.ts` | `WeaknessId` union에 `g2_xxx` 20개 추가; `diagnosisMap`에 각 항목 설명·팁 작성 |
| `data/diagnosisTree.ts` | `SolveMethodId` union에 5개 신규 추가; `methodOptions`에 한국어 레이블 추가; `diagnosisTree`에 g2 서브 선택지 작성 |
| `data/problemData.ts` | `grade: 'g2'` 진단 문제 10개 추가; `effectiveGrade` fallback 로직 제거 |
| `data/review-content-map.ts` | g2 약점 20개 복습 콘텐츠(heroPrompt + thinkingSteps) 추가 |

**변경 없음:** UI 화면·훅·네비게이션 — 기존 `grade` 분기로 자동 처리됨. 고1·고3 기존 동작에 영향 없음.

---

## 범위 밖

- 고2 수학II 전용 단원 (고2 3월 학력평가 출제 범위 외)
- 이미지 기반 진단 UI (기존 텍스트 진단 구조 유지)
- 고2 복습 완료 통계 화면 (별도 작업)
- 고2 전용 모의고사 추가 확보 (현재 3세트 유지)

---

## 검증 항목

1. g2 학생 로그인 → 진단 10문제가 g2 콘텐츠로 출력됨 (g1 fallback 없음)
2. 진단 완료 후 약점이 `g2_xxx` ID로 저장됨
3. 복습 카드에서 g2 약점별 heroPrompt·사고 흐름이 표시됨
4. g1·g3 진단 흐름 회귀 없음 (`npm run typecheck` 통과)
5. 신규 SolveMethodId가 diagnosisTree에 모두 등록됨
