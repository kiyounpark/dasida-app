# 모의고사 진단 → 복습 연결 설계 (Phase 1)

작성일: 2026-04-27
브랜치: main
상태: DRAFT (코드 검증 후 재정리)

---

## 문제 정의

모의고사를 풀고 약점 진단까지 완료해도, 그 결과가 학습 기록에 제대로 남지 않고 복습 큐에도 연결되지 않는다.

**현재 증상:**
- 채점 결과 화면이 열리는 순간 약점 정보 없이(`finalWeaknessId: null`) 기록 저장됨
- 진단 완료 후 약점 데이터를 기록에 업데이트하는 로직 없음
- `ReviewTask`가 생성되지 않아 홈 "오늘의 복습"에 모의고사 약점이 뜨지 않음
- "약점 기반 연습문제 풀러가기" 버튼이 옛날 10문제 약점진단 결과로 가버림

**10문제 약점진단과 비교:**
| | 10문제 약점진단 | 모의고사 |
|---|---|---|
| 진단 결과 저장 | ✅ | ❌ (null로 저장) |
| ReviewTask 생성 | ✅ | ❌ |
| 복습 큐 연결 | ✅ | ❌ |
| 약점 기반 연습 | ✅ | ❌ (옛날 데이터로 감) |

---

## 목표 (Phase 1)

1. 모의고사 진단 완료 시 → 약점 데이터를 기존 attempt 기록에 반영
2. 모의고사 진단 완료 시 → `ReviewTask` 생성 (`source: 'featured-exam'`)
3. "약점 기반 연습문제 풀러가기" → 모의고사에서 진단된 약점 기반으로 표시

**명시적으로 이번 범위에서 제외 (Phase 2에서 진행):**
- 홈 "내 약점" 섹션의 누적 집계 뷰 (`함수의 극한 ●●● 3회` 형태)

---

## 핵심 통찰 — 새 파이프라인이 필요 없다

자가 검토 중 코드를 다시 읽고 발견:

### 1) `recordAttempt()`는 이미 attemptId 기준 멱등

[`local-learning-history-repository.ts:471`](../../features/learning/local-learning-history-repository.ts):

```typescript
const existingAttempt = attempts.find((attempt) => attempt.id === input.attemptId);
const attempt = buildAttempt(input, existingAttempt?.createdAt ?? input.completedAt);
const nextAttempts = sortAttempts([
  attempt,
  ...attempts.filter((existing) => existing.id !== input.attemptId),
]);
```

같은 `attemptId`로 두 번 호출하면 기존 레코드를 교체한다. 진단 완료 후 약점이 채워진 input을 만들어 `recordAttempt()`를 다시 호출하면 끝. **새 repository 메서드 불필요.**

### 2) `latestDiagnosticSummary` 안전성은 코드 구조상 자동 보장

[`local-learning-history-repository.ts:278`](../../features/learning/local-learning-history-repository.ts):

```typescript
const latestDiagnosticAttempt = sortedAttempts.find(
  (attempt) => attempt.source === 'diagnostic',
);
```

`buildSummary`는 `source === 'diagnostic'` attempt만 `latestDiagnosticSummary`로 매핑한다. featured-exam attempt를 갱신해도 영향 없음. 별도 가드 로직 불필요.

### 3) 진짜 막혀 있는 곳은 `buildReviewTasks` 한 곳

[`local-learning-history-repository.ts:423`](../../features/learning/local-learning-history-repository.ts):

```typescript
if (input.source !== 'diagnostic') {
  return sortReviewTasks(existingTasks);
}
```

이 가드 때문에 `featured-exam` source는 ReviewTask가 생성되지 않는다. 이 함수만 확장하면 `recordAttempt()` 재호출 한 번으로 attempt 갱신 + ReviewTask 생성이 자동으로 이루어진다.

---

## 설계

### 데이터 흐름

**현재:**
```
채점 완료 → recordAttempt(input with null weakness) → attempt 저장 (weaknessId: null)
진단 완료 → exam-diagnosis-progress.ts (로컬 캐시만)
        → 끝 (업데이트 없음)
```

**변경 후:**
```
채점 완료 → recordAttempt(input with null weakness) → attempt 저장 (기존 동일)
진단 완료 → exam-diagnosis-progress.ts (로컬 캐시, 기존 동일)
        → buildExamAttemptInputWithDiagnosis() 로 진단 결과 채운 input 생성
        → recordAttempt(updated input) 재호출
              → 같은 attemptId 매칭 → 기존 attempt 교체 (weakness 채워짐)
              → buildReviewTasks (featured-exam도 처리하도록 확장됨)
                  → ReviewTask[] 생성 (source: 'featured-exam')
              → buildSummary → latestDiagnosticSummary는 source 필터로 영향 없음
```

### 핵심 원칙

- **새 인터페이스 추가 안 함**: 기존 `recordAttempt` 재사용
- **10문제 약점진단 기록 보존**: `buildSummary`의 source 필터로 자동 보장
- **복습 태스크 독립 누적**: `diagnostic` 태스크와 `featured-exam` 태스크가 각자 쌓임
- **진단 중단 시 안전**: 진단을 중간에 멈춰도 기존 attempt 기록은 보존됨. 모든 오답 진단 완료 시에만 재호출.

### 트리거 시점

[`use-exam-result-screen.ts:106-125`](../../features/quiz/exam/hooks/use-exam-result-screen.ts) 의 routing useEffect 내부에서 라우팅 직전에 트리거:

```typescript
useEffect(() => {
  if (wrongCount === 0 || diagnosedCount < wrongCount) return;
  if (!result) return;
  if (hasNavigatedToReportRef.current) return;
  hasNavigatedToReportRef.current = true;

  // ── 추가 ── 진단 결과로 attempt 재기록
  const input = buildExamAttemptInputWithDiagnosis({
    session, profile, result, diagnosedProblems,
  });
  void recordAttempt(input).catch((err) => console.warn('[Exam] update attempt failed', err));

  // 기존 라우팅
  router.replace({ pathname: '/quiz/result', params: { ... } });
}, [diagnosedCount, wrongCount, result, diagnosedProblems]);
```

**예외 처리:**
- `wrongCount === 0` (만점): 진단 대상이 없으므로 재호출 스킵 (기존 가드)
- 재호출은 `hasNavigatedToReportRef`로 1회만 보장 (기존 가드 재사용)
- 재호출 실패 시 라우팅은 계속 진행 (사용자 경험 우선, 다음 진단 시도에서 회복)

### `buildReviewTasks` 확장

[`local-learning-history-repository.ts:423`](../../features/learning/local-learning-history-repository.ts) 의 가드 변경:

```typescript
// 현재
if (input.source !== 'diagnostic') {
  return sortReviewTasks(existingTasks);
}

// 변경
if (input.source !== 'diagnostic' && input.source !== 'featured-exam') {
  return sortReviewTasks(existingTasks);
}
```

기존 day1 ReviewTask 생성 로직은 그대로 재사용. `sourceId`는 `input.sourceEntityId ?? input.attemptId` 패턴 유지. 같은 `taskId` 중복 방지 로직(`createTaskId` 기반)도 그대로 작동하므로 멱등성 보장.

### `buildExamAttemptInputWithDiagnosis` 헬퍼

새 파일: `features/quiz/exam/build-exam-attempt-input.ts` 에 함수 추가 (또는 별도 파일).

기존 `buildExamAttemptInput`을 확장:
- `diagnosedProblems: ExamDiagnosisProgress` 받음
- `questions[]` 의 `finalWeaknessId`를 `diagnosedProblems[problemNumber]`로 채움
- `diagnosisCompleted: true`
- `topWeaknesses` = `computeExamTopWeaknesses(diagnosedProblems)`
- `primaryWeaknessId` = `topWeaknesses[0] ?? null`

다른 필드는 기존 `buildExamAttemptInput`과 동일.

### Firebase 멱등성 검증 — 완료 (2026-04-27)

[`functions/src/learning-history.ts:982-1015`](../../functions/src/learning-history.ts) 확인 결과:
- `batch.set(attemptRef, ..., { merge: true })` → 같은 `attemptId`는 **upsert (멱등)**. ✅
- `createdAt`은 기존 레코드 값을 보존 (line 989-994).

**단, 추가로 발견한 이슈:** 백엔드도 `buildReviewTasks`에 동일한 `source !== 'diagnostic'` 가드와 source 무시 필터를 갖고 있다 ([`learning-history.ts:855, 865-867`](../../functions/src/learning-history.ts:855)). 클라이언트만 고치면:
1. 클라이언트가 로컬 캐시에 featured-exam ReviewTask 생성
2. 백엔드 POST 응답에는 ReviewTask 없음 (가드에 막혀 빈 결과)
3. 클라이언트가 백엔드 응답으로 로컬 캐시 덮어씀 → ReviewTask 소실

따라서 백엔드도 동일하게 고치고 Firebase Functions 배포 필수. (구현 plan에 반영)

### 약점 기반 연습 — practice screen 버그 수정

[`use-practice-screen.ts:143-144`](../../features/quiz/hooks/use-practice-screen.ts):

```typescript
// 현재 (옛날 진단 결과가 URL param 우선)
const recoveryWeakness = summary?.latestDiagnosticSummary?.topWeaknesses?.[0];
return recoveryWeakness ?? fallbackWeaknessId;

// 변경 (URL param이 명시되면 그게 우선)
return fallbackWeaknessId ?? recoveryWeakness;
```

종합 리포트의 "약점 기반 연습문제 풀러가기" 버튼은 이미 [`use-result-screen.ts:265`](../../features/quiz/hooks/use-result-screen.ts) 에서 `weaknessId` URL param으로 모의고사의 primary weakness를 전달하고 있음. practice screen이 이를 우선 사용하면 자동으로 모의고사 약점이 뜬다.

10문제 진단 직후 결과 화면 → 연습 흐름도 동일하게 작동 (역시 URL param 전달).

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| [`features/quiz/exam/hooks/use-exam-result-screen.ts`](../../features/quiz/exam/hooks/use-exam-result-screen.ts) | 진단 완료 시 `recordAttempt` 재호출 트리거 추가 |
| [`features/quiz/exam/build-exam-attempt-input.ts`](../../features/quiz/exam/build-exam-attempt-input.ts) | `buildExamAttemptInputWithDiagnosis` 헬퍼 추가 |
| [`features/learning/local-learning-history-repository.ts`](../../features/learning/local-learning-history-repository.ts) | `buildReviewTasks` 가드에 `'featured-exam'` 추가 |
| [`features/quiz/hooks/use-practice-screen.ts`](../../features/quiz/hooks/use-practice-screen.ts) | `fallbackWeaknessId` 우선순위 상향 |
| (검증) [`features/learning/firebase-learning-history-repository.ts`](../../features/learning/firebase-learning-history-repository.ts) | 백엔드 attemptId 멱등 동작 확인 (코드 변경은 결과 따라) |

이전 스펙에서 제안했던 새 repository 인터페이스 메서드(`updateAttemptWeaknesses`)와 `createExamReviewTasks` 별도 함수는 모두 **불필요**.

---

## 성공 기준

1. 모의고사 모든 문제 진단 완료 후 다음 날 앱 열면 "오늘의 복습"에 해당 약점 나타남
2. "약점 기반 연습문제 풀러가기" → 모의고사에서 진단된 약점으로 문제 표시
3. 10문제 약점진단 복습 데이터는 영향 없음 (`buildSummary` source 필터로 자동 보장)
4. 진단 중단 시 기존 기록 손상 없음 (재호출은 모든 진단 완료 시에만)
5. 진단 두 번 시도해도 ReviewTask 중복 생성 없음 (`createTaskId` 기반 dedupe)

---

## 이번 구현에서 의도적으로 보류한 항목

### 회귀 #1 — Release Note 업데이트

**내용:** CHANGELOG.md 또는 릴리스 노트에 이번 Phase 1 변경(모의고사 진단→복습 연결)을 기재.

**보류 이유:** 버전 bump(v0.x.y) 타이밍에 맞춰 작성해야 changelog가 의미 있음. 기능 구현 직후 별도 커밋으로 추가하면 "미출시 기능 선반영" 혼선 가능. **트리거:** 다음 `chore: bump version` 커밋 시 함께 작성.

---

### 회귀 #2 — Firebase 2차 호출 attemptId 마커

**내용:** `recordAttempt` 2차 호출(진단 완료 후 재기록)을 Firebase에서 구분할 수 있도록 attempt 레코드에 `diagnosisCompleted: true` 같은 마커 필드를 추가.

**보류 이유:** 현재 Firebase Functions의 `recordLearningAttempt`는 클라이언트에서 올라오는 필드를 그대로 `merge: true`로 저장한다. 마커가 있어도 없어도 기능 동작은 동일하다. 이 마커가 필요한 유스케이스(예: 서버사이드 analytics에서 "진단 완료율" 집계)가 생기는 시점에 추가하는 것이 YAGNI 원칙에 맞음. **트리거:** 서버사이드 analytics 또는 "진단 완료율" 지표가 필요해지는 시점.

---

## 다음 단계 (Phase 2) — 반드시 진행해야 함

홈 "내 약점" 섹션 누적 집계 뷰:

```
내 약점
함수의 극한   ●●● 3회 (진단 1회 + 모의고사 2회)
수열의 극한   ●● 2회
적분          ●● 2회
```

**데이터 출처:**
- `LearningAttemptResult[]` 의 `finalWeaknessId` 를 weakness별로 카운트 (per-question 정밀도)
- 또는 `LearningAttempt.topWeaknesses[]` 합산 (per-attempt 단위)
- 둘 중 어느 정밀도를 쓸지는 Phase 2 시작 시 결정

**제약:**
- 소스(diagnostic / featured-exam) 구분 없이 누적
- "내가 반복적으로 틀리는 약점"을 한눈에 파악 가능
- Phase 1이 완료되어 모의고사 약점 데이터가 제대로 저장된 이후에 의미 있음
