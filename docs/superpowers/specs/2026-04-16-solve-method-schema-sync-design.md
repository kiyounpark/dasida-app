# 설계 문서: 서버 solveMethodIds 스키마 동기화

**날짜**: 2026-04-16
**슬러그**: solve-method-schema-sync
**상태**: 기획중

---

## 문제 정의

### 증상

```
WARN [FirebaseLearningHistoryRepository] Falling back to local cache for recordAttempt.
[LearningHistoryApiError: Invalid request body]
```

`recordAttempt` POST가 서버에서 400 "Invalid request body"를 반환하며 local fallback으로 빠짐.
서버에 진단/연습 결과가 저장되지 않아 `loadCurrentSummary` GET이 null을 반환
→ 허브 화면이 "첫 진단 시작하기"를 유지하는 버그의 **진짜 근본 원인**.

### 기대 동작

모든 `SolveMethodId` 값이 포함된 `recordAttempt` 요청이 서버에서 정상 처리(200)되어야 한다.

---

## 근본 원인 분석

### 불일치 현황

**클라이언트** (`data/diagnosisTree.ts` `SolveMethodId` 타입, 30개):
```
cps, vertex, diff, unknown, factoring, quadratic, radical, polynomial,
complex_number, remainder_theorem, counting,
set, proposition, trig, integral, linear_eq, sequence, log_exp, conic,
limit, vector, probability, space_geometry, function, statistics,
geometry, permutation, sequence_limit, integral_advanced, diff_advanced
```

**서버** (`functions/src/learning-history.ts` `solveMethodIds`, 기존 11개):
```
cps, vertex, diff, unknown, factoring, quadratic, radical, polynomial,
complex_number, remainder_theorem, counting
```

**누락 (19개)**: `set, proposition, trig, integral, linear_eq, sequence, log_exp,
conic, limit, vector, probability, space_geometry, function, statistics,
geometry, permutation, sequence_limit, integral_advanced, diff_advanced`

### 실제 사용 확인

`data/problemData.ts`의 `diagnosisMethods`에서 실제 사용 중인 누락 값 (15개):
`conic, diff_advanced, integral, integral_advanced, limit, linear_eq, log_exp,
permutation, probability, proposition, sequence, set, space_geometry, trig, vector`

---

## 설계 결정

### 검토된 접근 방식

| 접근 | 설명 | 결정 |
|------|------|------|
| **접근 1** | 서버 `solveMethodIds` 배열을 클라이언트 전체 목록으로 확장 | **채택** |
| 접근 2 | 클라이언트에서 서버 미지원 methodId를 `null`로 치환 | 기각 (데이터 소실) |
| 접근 3 | 클라이언트 타입을 서버 기준으로 축소 | 기각 (불가능) |

### 채택된 설계 (접근 1)

**수정 파일**: `functions/src/learning-history.ts`

**수정 내용**: `solveMethodIds` 배열에 클라이언트 `SolveMethodId` 전체 목록 추가

```typescript
// 수정 후 (30개 — 클라이언트와 완전 동기화)
const solveMethodIds = [
  // 기존 11개
  'cps', 'vertex', 'diff', 'unknown', 'factoring', 'quadratic',
  'radical', 'polynomial', 'complex_number', 'remainder_theorem', 'counting',
  // 추가 19개
  'set', 'proposition', 'trig', 'integral', 'linear_eq', 'sequence',
  'log_exp', 'conic', 'limit', 'vector', 'probability', 'space_geometry',
  'function', 'statistics', 'geometry', 'permutation', 'sequence_limit',
  'integral_advanced', 'diff_advanced',
] as const;
```

---

## 영향 범위

- **변경 파일**: `functions/src/learning-history.ts` (1개)
- **영향 경로**: `SolveMethodIdSchema` → `FinalizedAttemptQuestionInputSchema` → `FinalizedAttemptInputSchema`
- **배포 필요**: Firebase Functions 재배포 (`firebase deploy --only functions:recordLearningAttempt`)
- **하위 호환성**: 기존 저장된 데이터 영향 없음 (읽기 스키마 변경 없음, 쓰기 스키마만 확장)

---

## 검증 시나리오

1. **핵심**: `trig`, `set`, `integral` 등 신규 추가 methodId가 포함된 요청 → 서버 200 응답
2. **기존 호환**: 기존 11개 methodId (cps, vertex 등) → 여전히 200 응답
3. **타입 일관성**: 서버 `SolveMethodId` 타입이 클라이언트와 동일한 30개 값
4. **다른 스키마 영향 없음**: `WeaknessIdSchema`, `LearnerGradeSchema` 등 나머지 스키마 변경 없음
