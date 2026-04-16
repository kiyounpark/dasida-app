# 구현 계획: 서버 solveMethodIds 스키마 동기화

**날짜**: 2026-04-16
**슬러그**: solve-method-schema-sync
**설계 문서**: `docs/superpowers/specs/2026-04-16-solve-method-schema-sync-design.md`
**브랜치**: `claude/brainstorm-superpowers-z93wA`
**구현 커밋**: `97f0e7e` (main 머지: `3b290e6`)

---

## 구현 상태

커밋 `97f0e7e`에서 구현 완료. 이 플랜은 구현 검증 기준으로 사용.

---

## 변경 파일

```
functions/src/learning-history.ts
```

---

## Task 1: solveMethodIds 배열 확장

### 파일: `functions/src/learning-history.ts`, lines 19–31

**수정 전** (11개):
```typescript
const solveMethodIds = [
  'cps', 'vertex', 'diff', 'unknown', 'factoring', 'quadratic',
  'radical', 'polynomial', 'complex_number', 'remainder_theorem', 'counting',
] as const;
```

**수정 후** (30개):
```typescript
const solveMethodIds = [
  'cps', 'vertex', 'diff', 'unknown', 'factoring', 'quadratic',
  'radical', 'polynomial', 'complex_number', 'remainder_theorem', 'counting',
  // 추가: 클라이언트 SolveMethodId와 동기화
  'set', 'proposition', 'trig', 'integral', 'linear_eq', 'sequence',
  'log_exp', 'conic', 'limit', 'vector', 'probability', 'space_geometry',
  'function', 'statistics', 'geometry', 'permutation', 'sequence_limit',
  'integral_advanced', 'diff_advanced',
] as const;
```

### Task 1 검증 체크리스트

- [ ] `solveMethodIds` 배열이 클라이언트 `SolveMethodId` 30개와 정확히 일치
- [ ] `as const` 유지 (TypeScript literal type)
- [ ] `SolveMethodIdSchema = z.enum(solveMethodIds)` 자동 반영
- [ ] `FinalizedAttemptQuestionInputSchema.methodId` 필드에 신규 값 허용
- [ ] 기존 11개 값 유지

---

## Task 2: 의존성 영향 검증

### 확인 항목

1. **`SolveMethodIdSchema` 사용처** (`functions/src/learning-history.ts` 내):
   - `LearningAttemptResultSchema.methodId` — 읽기 스키마, 확장으로 하위 호환
   - `FinalizedAttemptQuestionInputSchema.methodId` — 쓰기 스키마, 신규 값 수용

2. **다른 스키마 미영향 확인**:
   - `WeaknessIdSchema` — 변경 없음
   - `LearnerGradeSchema` — 변경 없음
   - `FinalizedAttemptInputSchema` superRefine — 변경 없음

3. **`SolveMethodId` 타입 동기화**:
   - 클라이언트: `data/diagnosisTree.ts` (30개)
   - 서버: `functions/src/learning-history.ts` (30개로 확장됨)
   - 일치 여부 수동 비교

### Task 2 검증 체크리스트

- [ ] `LearningAttemptResultSchema` — 기존 동작 유지
- [ ] `FinalizedAttemptQuestionInputSchema` — 신규 methodId 수용
- [ ] `WeaknessIdSchema`, `LearnerGradeSchema` 등 무관 스키마 변경 없음
- [ ] 클라이언트 30개 == 서버 30개 정확히 일치

---

## 서브에이전트 검증 기준

### Spec Compliance Review 기준

1. 추가된 19개 값이 모두 존재하는가?
   (`set, proposition, trig, integral, linear_eq, sequence, log_exp, conic,
   limit, vector, probability, space_geometry, function, statistics, geometry,
   permutation, sequence_limit, integral_advanced, diff_advanced`)
2. 기존 11개 값이 모두 유지되는가?
3. 클라이언트 `SolveMethodId` 30개와 서버 `solveMethodIds` 30개가 완전히 일치하는가?
4. `as const` assertion이 유지되는가?
5. `SolveMethodIdSchema`가 `z.enum(solveMethodIds)`로 정의되어 자동 반영되는가?

### Code Quality Review 기준

1. 주석이 "왜 추가됐는지"를 설명하는가?
2. 값 정렬/그룹핑이 가독성에 도움이 되는가?
3. TypeScript 타입 안전성 — `as const`로 literal union 타입 유지되는가?
4. 다른 스키마(`WeaknessId`, `LearnerGrade`)와 패턴 일관성
5. 회귀 위험 — 기존 저장된 데이터 읽기에 영향 없는가?
6. Firebase Functions 배포 후 즉시 효력 발생하는 구조인가?

---

## 배포 명령

```bash
firebase deploy --only functions:recordLearningAttempt
```
