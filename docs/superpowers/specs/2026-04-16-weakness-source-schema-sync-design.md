# 설계 문서: 서버 WeaknessId · LearningSource 스키마 동기화

**날짜**: 2026-04-16
**슬러그**: weakness-source-schema-sync
**상태**: 기획중

---

## 문제 정의

### 증상

`functions:recordLearningAttempt` Cloud Function 배포 후에도 아래 에러가 지속된다.

```
WARN [FirebaseLearningHistoryRepository] Falling back to local cache for recordAttempt.
[LearningHistoryApiError: Invalid request body]
```

직전 작업(`2026-04-16-solve-method-schema-sync`)에서 `solveMethodIds` 11→30개 확장을 머지·배포했음에도 `recordAttempt` POST가 계속 400으로 거부되어 local fallback으로 빠진다. 서버에 attempt 데이터가 누적되지 않아 `loadCurrentSummary`가 계속 null을 반환, 허브 화면이 "첫 진단 시작하기" 상태로 남는 루트 버그가 해소되지 않았다.

### 기대 동작

- 고1 / 고2 / 고3 진단·연습·수능특강 플로우의 모든 `recordAttempt` 요청이 서버에서 정상 처리(200)되어야 한다.
- 수능특강(대표 모의고사) attempt가 서버뿐 아니라 **로컬 `totals.featuredExamAttempts`** 집계에도 반영되어야 한다.

---

## 근본 원인 분석

서버 Zod 스키마와 클라이언트 타입을 전수 대조한 결과, `solveMethodIds` 외에 2개의 불일치가 추가로 존재한다.

### 원인 1: `WeaknessId` 대규모 불일치 (🔴 핵심 원인)

| 파일 | 값 개수 |
|------|---------|
| 클라이언트 `data/diagnosisMap.ts` `WeaknessId` 타입 | **58개** |
| 서버 `functions/src/learning-history.ts` `weaknessOrder` | **23개** |
| **서버 누락** | **35개** |

서버에 누락된 35개 (클라이언트 전용):

```
// 고3 공통 (7)
g3_diff, g3_sequence, g3_log_exp, g3_integral, g3_trig, g3_limit, g3_conic

// 고3 확통 특화 (3)
g3_counting, g3_probability, g3_statistics

// 고3 기하·함수 (4)
g3_vector, g3_space_geometry, g3_function, g1_geometry

// 고2 공통 (21)
g2_set_operation, g2_set_complement, g2_set_count,
g2_prop_contrapositive, g2_prop_necessary_sufficient, g2_prop_quantifier,
g2_trig_unit_circle, g2_trig_equation_range, g2_trig_identity,
g2_poly_factoring, g2_poly_remainder, g2_eq_setup,
g2_radical_simplify, g2_radical_rationalize,
g2_diff_application, g2_integral_basic, g2_integral_definite,
g2_counting_method, g2_counting_overcounting,
g2_inequality_range, g2_function_domain
```

**영향 경로**: `WeaknessIdSchema`는 아래 필드에 사용된다.

- `FinalizedAttemptInputSchema.primaryWeaknessId`
- `FinalizedAttemptInputSchema.topWeaknesses[]`
- `FinalizedAttemptQuestionInputSchema.finalWeaknessId`

→ 고2·고3 진단 또는 연습에서 해당 weaknessId가 포함되면 서버가 400 반환.

### 원인 2: `LearningSource` `'exam'` 값 누락 (🟡 수능특강 플로우 + 내부 불일치)

| 파일 | 값 |
|------|-----|
| 서버 `learningSources` | `'diagnostic' \| 'featured-exam' \| 'weakness-practice'` |
| 클라이언트 `history-types.ts` `LearningSource` | `'diagnostic' \| 'featured-exam' \| 'weakness-practice' \| 'exam'` |

클라이언트 내부에서도 **모순 상태**가 존재한다.

- `features/quiz/exam/build-exam-attempt-input.ts:18` → `source: 'exam'`
- `features/quiz/exam/build-exam-diagnosis-attempt-input.ts:38` → `source: 'exam'`
- `features/quiz/exam/hooks/use-exam-diagnosis.ts:281` → `source: 'exam'`
- `features/learning/local-learning-history-repository.ts` (line 212, 266, 303, 478) → `'featured-exam'` 기준 집계/표시

즉 수능특강 flow가 보내는 `'exam'` 값은 **로컬 레포지토리의 `totals.featuredExamAttempts`와 "대표 모의고사 완료" 활동 표시에서도 누락**되고 있다. 서버 400은 그 중 한 단면에 불과.

---

## 설계 결정

### 검토한 접근 방식

| 접근 | 설명 | 결정 |
|------|------|------|
| 접근 1 | 클라이언트 타입을 서버 기준으로 축소 | 기각 (고2/고3 진단 기능 손실) |
| 접근 2 | `'exam'`을 서버 enum에 추가 | 기각 (의미 중복 — 서버 정식명 `'featured-exam'` 이미 존재) |
| **접근 3** | **서버 enum을 클라이언트 기준으로 확장 + 클라이언트 `'exam'` → `'featured-exam'` 통일** | **채택** |

### 채택 이유 (접근 3)

1. **`WeaknessId`는 확장만 가능**: 클라이언트가 실제 사용 중인 고2/고3 진단 트리를 서버가 수용해야 한다.
2. **`'exam'` → `'featured-exam'` 통일**: 서버 정식명은 `'featured-exam'`이고, 클라이언트 로컬 레포·화면 표시도 이미 `'featured-exam'` 기준이므로, 수능특강 build 함수 3개만 통일하면 **로컬 버그까지 동시 해결**된다.
3. **기존 저장 데이터 호환성**: `source: 'exam'`으로 서버에 저장 성공한 레코드는 존재하지 않는다(전부 400으로 거부됐기 때문). 하위호환 shim 불필요.

---

## 수정 내용

### 파일 1: `functions/src/learning-history.ts`

**변경점 A — `weaknessOrder` 배열 (line 52~76)**: 현재 23개 → **58개**로 확장.

```typescript
const weaknessOrder = [
  // 기존 23개 (base)
  'formula_understanding', 'calc_repeated_error', 'min_value_read_confusion',
  'vertex_formula_memorization', 'coefficient_sign_confusion', 'derivative_calculation',
  'solving_order_confusion', 'max_min_judgement_confusion', 'basic_concept_needed',
  'factoring_pattern_recall', 'complex_factoring_difficulty', 'quadratic_formula_memorization',
  'discriminant_calculation', 'radical_simplification_error', 'rationalization_error',
  'expansion_sign_error', 'like_terms_error', 'imaginary_unit_confusion',
  'complex_calc_error', 'remainder_substitution_error', 'simultaneous_equation_error',
  'counting_method_confusion', 'counting_overcounting',
  // 추가 35개 — 클라이언트 WeaknessId와 동기화
  // 고3 공통
  'g3_diff', 'g3_sequence', 'g3_log_exp', 'g3_integral', 'g3_trig', 'g3_limit', 'g3_conic',
  // 고3 확통
  'g3_counting', 'g3_probability', 'g3_statistics',
  // 고3 기하·함수
  'g3_vector', 'g3_space_geometry', 'g3_function', 'g1_geometry',
  // 고2 공통
  'g2_set_operation', 'g2_set_complement', 'g2_set_count',
  'g2_prop_contrapositive', 'g2_prop_necessary_sufficient', 'g2_prop_quantifier',
  'g2_trig_unit_circle', 'g2_trig_equation_range', 'g2_trig_identity',
  'g2_poly_factoring', 'g2_poly_remainder', 'g2_eq_setup',
  'g2_radical_simplify', 'g2_radical_rationalize',
  'g2_diff_application', 'g2_integral_basic', 'g2_integral_definite',
  'g2_counting_method', 'g2_counting_overcounting',
  'g2_inequality_range', 'g2_function_domain',
] as const;
```

> 정렬 전략: **그룹핑 우선**(base → g3 → g2) + 그룹 내 의미 순. 이전 `solveMethodIds` 작업에서 알파벳 정렬을 사용했지만, WeaknessId는 학년대별 묶음 가독성이 가치가 크므로 그룹 정렬을 채택. 대안 제시 가능.

**변경점 B — `weaknessLabels` Record (line 77~101)**: 추가된 35개에 대한 `labelKo` 매핑 추가.

라벨 출처는 클라이언트 `data/diagnosisMap.ts`의 `diagnosisItems[id].labelKo`. 예시:

```typescript
const weaknessLabels: Record<(typeof weaknessOrder)[number], string> = {
  // 기존 23개 유지
  formula_understanding: '공식 이해 부족',
  // ... (기존 값 보존)
  // 추가 35개
  g3_diff: '미분 계산',
  g2_set_operation: '집합 연산 오류',
  g1_geometry: '도형 기본 개념',
  // ... (diagnosisItems에서 전체 복사)
};
```

> `Record<(typeof weaknessOrder)[number], string>` 타입 제약상 35개 모두 넣지 않으면 TypeScript 빌드 실패. 이는 누락 방지 가드로 작동.

**변경점 C — `learningSources` 배열**: 변경 없음 (클라이언트 쪽 정리로 해결).

### 파일 2~4: 클라이언트 수능특강 빌더 — `'exam'` → `'featured-exam'` 치환

- `features/quiz/exam/build-exam-attempt-input.ts:18`
- `features/quiz/exam/build-exam-diagnosis-attempt-input.ts:38`
- `features/quiz/exam/hooks/use-exam-diagnosis.ts:281`

모두 `source: 'exam'` 리터럴을 `source: 'featured-exam'`으로 변경.

### 파일 5: `features/learning/history-types.ts:2`

```diff
- export type LearningSource = 'diagnostic' | 'featured-exam' | 'weakness-practice' | 'exam';
+ export type LearningSource = 'diagnostic' | 'featured-exam' | 'weakness-practice';
```

클라이언트에서 `'exam'` 리터럴 사용이 완전히 제거되면 union도 축소. 타입 체크로 잔존 사용처가 있으면 빌드 실패로 드러남.

---

## 영향 범위

| 항목 | 값 |
|------|-----|
| 변경 파일 수 | 5 (서버 1 + 클라이언트 4) |
| 서버 재배포 필요 | ✅ `firebase deploy --only functions:recordLearningAttempt` |
| 클라이언트 빌드 재배포 | ✅ JS bundle 변경 → Expo OTA 또는 새 빌드 |
| 하위 호환성 (읽기) | 서버 `LearningAttemptSchema`/`LearningAttemptResultSchema`에도 `WeaknessIdSchema` 사용 → **확장이므로 기존 저장 데이터 읽기에 영향 없음** |
| 하위 호환성 (쓰기) | `'exam'`으로 저장 성공한 서버 레코드 없음 (400 거부됨) → 마이그레이션 불필요 |

---

## 검증 시나리오

### 핵심 시나리오

1. **고2 진단 플로우**: `finalWeaknessId: 'g2_set_operation'` 포함 `recordAttempt` → 서버 200
2. **고3 진단 플로우**: `finalWeaknessId: 'g3_diff'` 포함 `recordAttempt` → 서버 200
3. **수능특강 플로우**: `source: 'featured-exam'` 요청 → 서버 200
4. **수능특강 로컬 집계**: `totals.featuredExamAttempts` 증가 확인 (이전엔 `'exam'`이라 누락됐음)
5. **허브 복구**: 진단 완료 후 `loadCurrentSummary` 200 + non-null → 허브 CTA가 "첫 진단 시작하기"가 아닌 다음 단계로 전환

### 기존 호환 시나리오

6. 기존 23개 base weaknessId (`formula_understanding` 등) — 여전히 200
7. 기존 `source: 'diagnostic'`, `'weakness-practice'` — 여전히 200

### 회귀 검증 포인트

8. TypeScript 빌드 — 서버 `weaknessLabels`가 35개 새 키를 누락하면 빌드 실패 (강제 가드)
9. 클라이언트 TypeScript 빌드 — `LearningSource`에서 `'exam'` 제거 시 잔존 사용처가 있으면 즉시 실패
10. 서버 `list-learning-attempts.ts:10`의 `source` 쿼리 파라미터 enum도 확인 (현재 3개 → 변경 필요 없음)

---

## 미해결 질문

- 없음. 구현 시 `weaknessLabels`에 넣을 35개 라벨 텍스트는 `data/diagnosisMap.ts`의 `diagnosisItems[id].labelKo`를 그대로 복사한다.

---

## 배포 순서 (참고)

1. 클라이언트 변경 4개 파일 + 서버 변경 1개 파일을 동일 PR로 묶어 머지
2. Firebase Functions 배포: `firebase deploy --only functions:recordLearningAttempt`
3. 클라이언트 재빌드 또는 OTA 업데이트
4. 디바이스에서 고2/고3 진단 1회 + 수능특강 1회 실행해 200 응답 확인
