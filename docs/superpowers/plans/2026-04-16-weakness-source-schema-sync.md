# 구현 계획: 서버 WeaknessId · LearningSource 스키마 동기화

**날짜**: 2026-04-16
**슬러그**: weakness-source-schema-sync
**설계 문서**: `docs/superpowers/specs/2026-04-16-weakness-source-schema-sync-design.md`
**브랜치**: `claude/brainstorm-superpowers-z93wA`

---

## 구현 상태

미구현. 아래 Task 순서대로 실행.

---

## 변경 파일

```
functions/src/learning-history.ts        (Task 1)
features/quiz/exam/build-exam-attempt-input.ts            (Task 2)
features/quiz/exam/build-exam-diagnosis-attempt-input.ts  (Task 2)
features/quiz/exam/hooks/use-exam-diagnosis.ts            (Task 2)
features/learning/history-types.ts       (Task 3)
```

---

## Task 1: 서버 weaknessOrder + weaknessLabels 확장

### 파일: `functions/src/learning-history.ts`

#### 변경 A — `weaknessOrder` 배열 (line 52–76 교체)

**수정 전** (23개):
```typescript
const weaknessOrder = [
  'formula_understanding',
  'calc_repeated_error',
  // ... 21개 생략 ...
  'counting_overcounting',
] as const;
```

**수정 후** (58개):
```typescript
const weaknessOrder = [
  // base (고1 이하)
  'formula_understanding',
  'calc_repeated_error',
  'min_value_read_confusion',
  'vertex_formula_memorization',
  'coefficient_sign_confusion',
  'derivative_calculation',
  'solving_order_confusion',
  'max_min_judgement_confusion',
  'basic_concept_needed',
  'factoring_pattern_recall',
  'complex_factoring_difficulty',
  'quadratic_formula_memorization',
  'discriminant_calculation',
  'radical_simplification_error',
  'rationalization_error',
  'expansion_sign_error',
  'like_terms_error',
  'imaginary_unit_confusion',
  'complex_calc_error',
  'remainder_substitution_error',
  'simultaneous_equation_error',
  'counting_method_confusion',
  'counting_overcounting',
  // 고2 공통 — 클라이언트 WeaknessId와 동기화
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
  'g2_integral_definite',
  'g2_counting_method',
  'g2_counting_overcounting',
  'g2_inequality_range',
  'g2_function_domain',
  // 고3 공통
  'g3_diff',
  'g3_sequence',
  'g3_log_exp',
  'g3_integral',
  'g3_trig',
  'g3_limit',
  'g3_conic',
  // 고3 확통 특화
  'g3_counting',
  'g3_probability',
  'g3_statistics',
  // 고3 기하·함수 / 고1 기하
  'g3_vector',
  'g3_space_geometry',
  'g1_geometry',
  'g3_function',
] as const;
```

#### 변경 B — `weaknessLabels` Record (line 77~101 이후에 35개 항목 추가)

**수정 후** (기존 23개 유지 + 35개 추가):
```typescript
const weaknessLabels: Record<(typeof weaknessOrder)[number], string> = {
  // 기존 23개 유지
  formula_understanding: '공식 이해 부족',
  calc_repeated_error: '계산 실수 반복',
  min_value_read_confusion: '최솟값 읽기 혼동',
  vertex_formula_memorization: '공식 암기 부족',
  coefficient_sign_confusion: '계수 구분 혼동',
  derivative_calculation: '미분 계산 부족',
  solving_order_confusion: '풀이 순서 혼동',
  max_min_judgement_confusion: '최댓값/최솟값 판단 혼동',
  basic_concept_needed: '기초 개념 학습 필요',
  factoring_pattern_recall: '인수분해 패턴 암기 부족',
  complex_factoring_difficulty: '복잡한 식 인수분해 어려움',
  quadratic_formula_memorization: '근의공식 암기 부족',
  discriminant_calculation: '판별식 계산 실수',
  radical_simplification_error: '√ 간소화 실수',
  rationalization_error: '분모 유리화 실수',
  expansion_sign_error: '전개 부호 실수',
  like_terms_error: '동류항 정리 실수',
  imaginary_unit_confusion: 'i² = -1 혼동',
  complex_calc_error: '복소수 실수부/허수부 정리 실수',
  remainder_substitution_error: '나머지정리 대입 실수',
  simultaneous_equation_error: '연립방정식 설정 실수',
  counting_method_confusion: '경우의 수 방법 혼동',
  counting_overcounting: '중복 처리 실수',
  // 고2 공통 (추가)
  g2_set_operation: '집합 연산 오류',
  g2_set_complement: '여집합 범위 혼동',
  g2_set_count: '원소 개수 계산 오류',
  g2_prop_contrapositive: '역·이·대우 혼동',
  g2_prop_necessary_sufficient: '필요충분조건 오류',
  g2_prop_quantifier: '전칭·존재 명제 혼동',
  g2_trig_unit_circle: '단위원 좌표 혼동',
  g2_trig_equation_range: '삼각방정식 범위 오류',
  g2_trig_identity: '삼각함수 항등식 오류',
  g2_poly_factoring: '인수분해 패턴 누락',
  g2_poly_remainder: '나머지정리 적용 오류',
  g2_eq_setup: '방정식 세우기·순서 오류',
  g2_radical_simplify: '무리식 간소화 오류',
  g2_radical_rationalize: '유리화 계산 오류',
  g2_diff_application: '미분 활용 오류',
  g2_integral_basic: '부정적분 공식 오류',
  g2_integral_definite: '정적분 끝값 대입 오류',
  g2_counting_method: '경우의 수 방법 선택 오류',
  g2_counting_overcounting: '중복 계산 오류',
  g2_inequality_range: '이차부등식 범위 오류',
  g2_function_domain: '정의역·치역 혼동',
  // 고3 공통 (추가)
  g3_diff: '미분 계산',
  g3_sequence: '수열 계산',
  g3_log_exp: '지수·로그 계산',
  g3_integral: '적분 계산',
  g3_trig: '삼각함수 계산',
  g3_limit: '극한 계산',
  g3_conic: '이차곡선',
  // 고3 확통 특화 (추가)
  g3_counting: '경우의 수·순열·조합',
  g3_probability: '확률 계산',
  g3_statistics: '통계 (정규분포·이항분포)',
  // 고3 기하·함수 / 고1 기하 (추가)
  g3_vector: '벡터 연산',
  g3_space_geometry: '공간도형·정사영',
  g1_geometry: '평면기하',
  g3_function: '함수 분석',
};
```

### Task 1 검증

```bash
cd functions && npx tsc --noEmit
```

예상 출력: 에러 없음. `weaknessLabels`의 키가 `weaknessOrder` 타입과 불일치하면 TypeScript가 즉시 빌드 실패로 알려준다.

### Task 1 커밋 메시지

```
fix(functions): weaknessOrder 23→58개 확장 — 고2·고3 진단 400 에러 수정
```

---

## Task 2: 클라이언트 `source: 'exam'` → `'featured-exam'` 치환

### 파일 A: `features/quiz/exam/build-exam-attempt-input.ts`, line 18

**수정 전**:
```typescript
    source: 'exam',
```

**수정 후**:
```typescript
    source: 'featured-exam',
```

### 파일 B: `features/quiz/exam/build-exam-diagnosis-attempt-input.ts`, line 38

**수정 전**:
```typescript
    source: 'exam',
```

**수정 후**:
```typescript
    source: 'featured-exam',
```

### 파일 C: `features/quiz/exam/hooks/use-exam-diagnosis.ts`, line 281

**수정 전**:
```typescript
      source: 'exam',
```

**수정 후**:
```typescript
      source: 'featured-exam',
```

### Task 2 검증

```bash
# 루트에서
npx tsc --noEmit
```

`'exam'` 리터럴이 `LearningSource` 타입에서 아직 제거 안 됐으므로(Task 3 전) 이 단계에서는 TypeScript가 ok. Task 3 이후 최종 확인.

잔여 `source: 'exam'` 없는지 확인:
```bash
grep -rn "source: 'exam'" features/quiz/exam/
# 결과: 없음
```

### Task 2 커밋 메시지

```
fix(exam): source 'exam' → 'featured-exam' 통일 — 수능특강 recordAttempt 400·로컬 집계 버그 수정
```

---

## Task 3: 클라이언트 `LearningSource` 타입에서 `'exam'` 제거

### 파일: `features/learning/history-types.ts`, line 2

**수정 전**:
```typescript
export type LearningSource = 'diagnostic' | 'featured-exam' | 'weakness-practice' | 'exam';
```

**수정 후**:
```typescript
export type LearningSource = 'diagnostic' | 'featured-exam' | 'weakness-practice';
```

### Task 3 검증

```bash
npx tsc --noEmit
```

예상 출력: 에러 없음. 만약 `'exam'`을 아직 쓰는 곳이 남아 있으면 TypeScript가 에러로 잡아준다 — 그 위치를 수정하면 됨.

### Task 3 커밋 메시지

```
fix(types): LearningSource에서 'exam' 제거 — 'featured-exam'으로 완전 통일
```

---

## 서브에이전트 검증 기준

### Spec Compliance Review 기준

1. `weaknessOrder` 배열 총 58개인가?
2. 추가된 35개가 스펙의 목록과 정확히 일치하는가?
3. `weaknessLabels` 타입 `Record<(typeof weaknessOrder)[number], string>` — 키 58개 모두 있는가?
4. 라벨 텍스트가 `data/diagnosisMap.ts`의 `labelKo` 값과 일치하는가?
5. `build-exam-attempt-input.ts`, `build-exam-diagnosis-attempt-input.ts`, `use-exam-diagnosis.ts` 세 파일에 `source: 'exam'`이 남아 있지 않은가?
6. `LearningSource` 타입에 `'exam'`이 제거됐는가?

### Code Quality Review 기준

1. `weaknessOrder` 그룹핑 주석 (base / 고2 공통 / 고3 공통 / 고3 확통 / 고3 기하)이 가독성에 기여하는가?
2. `weaknessLabels` 주석이 그룹별로 명확하게 구분되는가?
3. 기존 23개 라벨 값이 원본과 한 글자도 다르지 않게 보존됐는가?
4. TypeScript strict 빌드(`npx tsc --noEmit`) 에러 없음 확인됐는가?
5. `list-learning-attempts.ts` 등 다른 서버 파일의 `source` enum에 변경 불필요한지 확인됐는가?

---

## 배포 명령

```bash
# 서버 (Firebase Functions)
firebase deploy --only functions:recordLearningAttempt

# 클라이언트 (Expo OTA 또는 새 빌드)
npx expo export  # 또는 EAS Update
```
