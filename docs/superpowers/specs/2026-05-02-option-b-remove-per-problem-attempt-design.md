# Option B — Remove Per-Problem Diagnosis Attempt + Centralize Legacy Filter

**Date:** 2026-05-02
**Status:** Approved
**Type:** Data model cleanup + hotfix retirement

## Goal

진단 1문제마다 별도로 생성되던 `LearningAttempt` 레코드(prefix `exam-diag-`)를 제거하고, 이미 쌓여있는 legacy 데이터를 controller 레이어에서 일괄 필터링한다. 2026-05-02 hotfix의 `limit: 200` 임시 상한과 화면 단위 client filter를 정리해, 데이터 모델과 약점 집계 로직의 의미적 정합성을 회복한다.

## Background

### Hotfix 시점의 결정

2026-05-02 hotfix(`27e25b1`, `4a2371c`, `f084f5c`)에서 기록 탭 "분석중" 라벨 회귀를 막기 위해 `use-history-screen.ts`에 `EXAM_DIAG_ATTEMPT_PREFIX` 기반 client-side 필터와 `limit: 200` 임시 상한을 도입했다. 이는 표면 증상(라벨 오표시) 차단에는 성공했지만 다음 두 문제는 미해결 상태로 남았다.

1. **계속 쌓이는 polluted record** — `buildExamDiagnosisAttemptInput`이 약점 선택마다 호출되어 redundant per-problem `LearningAttempt`를 계속 생성. `limit: 200`은 임시 상한일 뿐 누적 200개 초과 시 동일 회귀 재발 가능.
2. **다른 consumer의 over-counting** — 약점 집계(`weakness-severity.ts`, `weakness-appearances.ts`)와 약점 상세 화면(`use-weakness-detail-screen.ts`)은 hotfix 필터 범위 밖이라 여전히 per-problem 레코드를 흡수해 카운트 과대 / 타임라인 중복 표시 발생.

### Per-problem record가 redundant인 이유

이전 PR에서 sync point #1~#4를 도입한 뒤로 진단 진행 상태는 **회차 attempt + attemptResults**로 매번 갱신된다(`syncDiagnosisProgressToServer` 등). per-problem POST가 보존하던 정보(`finalWeaknessId`, `methodId`, `diagnosisCompleted`)는 모두 회차의 `attemptResults` children에 이미 존재한다. 즉, per-problem record는 **회차 데이터의 중복 표현**이며 단독으로 읽는 consumer가 0개다.

코드 사용처 조사:

- `weakness-severity.ts` — `topWeaknesses` 집계, 회차 단위로 unique이면 충분
- `weakness-appearances.ts` — 회차 단위 timeline. per-problem이 들어가면 같은 회차가 N번 표시되는 버그
- `use-history-screen.ts` — 회차 목록. per-problem 무관
- `use-weakness-detail-screen.ts` — `loadRecentAttempts` 통해 회차만 필요

→ per-problem record는 보존 가치 0. 제거가 정답.

### 데이터 의미적 정합성 회복

`recentAppearanceCount`의 시맨틱은 "최근 5회차에서 이 약점이 등장한 회차 수"인데, 현재는 같은 회차를 per-problem 개수만큼 카운트한다. 예를 들어 한 회차에서 같은 약점 4문제 진단 시:

- 현재: 카운트 5 (per-problem 4 + 회차 1) → severity `frequent`("단골 약점", 빨강)
- 정상화 후: 카운트 1 → severity `occasional`("가끔 등장", 초록)

이는 신규 사용자에게 약점 카드 색이 약해 보일 가능성이 있으나 본래 의도된 신호이며, 약점 상세 화면 timeline의 중복 제거 효과가 더 크다.

## Approach

### 두 축의 변경

**축 1: per-problem `recordAttempt` 호출 제거 (B2)**

`features/quiz/exam/hooks/use-exam-diagnosis.ts`에서 다음을 정리한다 (use-exam-diagnosis.test.ts에는 관련 직접 테스트 없음):

- Line 363-376: `await recordAttempt(buildExamDiagnosisAttemptInput(...))` 블록 + `attemptRecordedRef.current = true` 삭제
- Line 174: `attemptRecordedRef = useRef(false)` 선언 삭제 (`recordAttempt`만이 비멱등 호출이었으므로 더는 skip-if-done flag 불필요)
- Line 108, 436: `recordAttempt` destructure / useCallback dep 정리 (이 파일에서 다른 사용처 없음, line 363이 유일)
- Line 27: `buildExamDiagnosisAttemptInput` import 제거
- Line 349-350의 비멱등성 관련 주석 정리

`markProblemDiagnosed`(AsyncStorage)는 멱등이지만 try/catch 블록과 `retryCountRef`, `setSaveError` UX는 **유지**한다. 디스크 fail 등 예외에 대비.

sync point #1~#4가 이미 동일 정보를 회차 단위로 갱신하므로 사용자 관찰 가능한 동작 변화 없음.

`buildExamDiagnosisAttemptInput` 함수와 `EXAM_DIAG_ATTEMPT_PREFIX` 상수는 **유지**한다. 이유:

- legacy data 필터링용으로 prefix 상수가 필요
- 함수는 사용처 0이 되지만 build-exam-diagnosis-attempt-input.ts와 같은 위치에 있어 future 재도입 시 참고 가치 있음. deprecated JSDoc 주석으로 사용 금지 명시

### 축 2: Legacy data 중앙 필터 (X)

`current-learner-controller.ts`에 helper를 두고, `featured-exam` source 쿼리 결과를 모두 통과시킨다. 기존 hotfix의 `filterRecentExamAttempts`를 controller 옆으로 이동·재명명한다.

**위치 결정:**

- Repository 레이어 — 단일 점이지만 비즈니스 로직(prefix 의미)이 데이터 레이어 침투, Firebase/Local repo 2개 모두 수정 부담. 채택 안 함.
- **Controller 레이어** — 도메인 의미가 controller에 사는 게 자연스럽고, 단일 파일 수정으로 두 call site(home state build + loadRecentAttempts) 동시 보호. **채택**.

**필터 적용 대상:**

- `current-learner-controller.ts:259-262` — `listAttempts(source='featured-exam', limit=10)` (home state용)
- `current-learner-controller.ts:401-403` — `loadRecentAttempts(options)` (`options.source === 'featured-exam'`인 경우)

`source` 값이 다른 쿼리(`diagnostic`, `weakness-practice`)는 건드리지 않는다.

### Hotfix 임시 코드 정리

centralized 필터가 도입되면 화면 단위 hotfix 코드는 불필요해진다.

- `use-history-screen.ts`: `limit: 200` → `limit: 5`로 복원, `filterRecentExamAttempts` import 제거, 임시 경고 주석 제거
- `features/history/hooks/filter-recent-exam-attempts.ts` 및 테스트 → `features/learner/`로 이동, 이름을 의도에 맞게 변경 (`filter-legacy-per-problem-attempts`)

### 약점 집계 / 상세 화면

- `weakness-severity.ts`, `weakness-appearances.ts` — 코드 변경 0. 입력 데이터(controller가 만든 `recentExamAndDiagnosticAttempts`)가 깨끗해지므로 자동 정상화.
- `use-weakness-detail-screen.ts` — 코드 변경 0. `loadRecentAttempts({ source: 'featured-exam', limit: 50 })`이 controller에서 자동 필터링됨.

## Scope

### 변경 파일

1. **`features/quiz/exam/hooks/use-exam-diagnosis.ts`** — per-problem `recordAttempt` 호출 제거 (line 362-376 부근)
2. **`features/learner/current-learner-controller.ts`** — `featured-exam` 쿼리 두 곳에 legacy 필터 적용
3. **`features/history/hooks/use-history-screen.ts`** — hotfix 임시 코드 정리 (`limit: 200` → 5, import 제거, 주석 제거)
4. **이동:** `features/history/hooks/filter-recent-exam-attempts.ts` → `features/learner/filter-legacy-per-problem-attempts.ts` + 함수명 `filterLegacyPerProblemAttempts`로 변경 (의도 명확화). hotfix의 `take` 파라미터는 controller가 limit를 호출자에 위임하므로 **제거**하고 단순 prefix 필터만 남김.
5. **이동:** `features/history/hooks/__tests__/filter-recent-exam-attempts.test.ts` → `features/learner/__tests__/filter-legacy-per-problem-attempts.test.ts`. `take` 관련 테스트 케이스(2개)는 제거, prefix 필터 케이스(4개)는 유지.
6. **테스트 추가:** `current-learner-controller`의 home state build와 `loadRecentAttempts` 둘 다에서 `featured-exam` 쿼리 결과에서 `exam-diag-` prefix 레코드가 제외되는지 검증.
7. **테스트 수정:** `use-exam-diagnosis.test.ts`에서 약점 선택 시 `recordAttempt` 호출 안 되는 케이스로 변경.

### 변경하지 않는 것

- `EXAM_DIAG_ATTEMPT_PREFIX` 상수 — 필터에서 계속 사용
- `buildExamDiagnosisAttemptInput` 함수 — unused 되지만 retain (future re-intro 참고용)
- `weakness-severity.ts`, `weakness-appearances.ts` — 입력만 깨끗해지면 자동 정상화
- `use-weakness-detail-screen.ts` — controller가 자동 필터링
- 서버(Cloud Function) 변경 없음. 기존 polluted record는 client filter로 영구 차폐.

## Migration & Rollback

### 기존 polluted record 처리

서버 cleanup 마이그레이션은 수행하지 않는다. 이유:

- Cloud Function 배포 위험(비가역 delete)
- client-side 필터로 모든 consumer가 자동 차폐되므로 사용자 영향 0
- 사용자가 앱 재오픈할 때 새 client 코드가 알아서 무시

장기적으로 진짜 cleanup이 필요하면 후속 spec에서 다룬다.

### Rollback 전략

만약 약점 카운트 변화가 사용자 컴플레인을 야기하면:

- 코드 레벨 즉시 복귀: controller의 `filterLegacyPerProblemAttempts` 호출 2곳을 제거하면 per-problem 레코드가 다시 흡수되어 hotfix 직전 동작으로 복원 (단, hotfix의 화면 단위 필터를 동시에 되살려야 history 탭 회귀가 재발하지 않음)
- per-problem `recordAttempt` 자체는 이미 제거된 상태이므로 새 record는 만들어지지 않음. 새로 누적되지 않는 한 carry-over는 시간이 지날수록 자연 감쇄.

revert을 단순화하려면 이 PR을 단일 커밋으로 squash해 관리할 것.

## Testing Plan

### 자동화

**신규/수정 테스트:**

- `features/learner/__tests__/filter-legacy-per-problem-attempts.test.ts` — prefix 필터 4 케이스 (이동 + 단순화)
- `features/learner/current-learner-controller.test.ts` (해당 파일 없으면 신규) — 두 call site에서 per-problem 레코드 제외 검증
- `features/quiz/exam/hooks/use-exam-diagnosis.test.ts` — 직접적인 `recordAttempt` 검증 케이스는 현재 없음. 추가 테스트는 mock spy로 호출 0회 검증을 1 케이스 추가하는 정도. 큰 변경 없음.

**기존 테스트 통과 확인:**

- `weakness-severity.test.ts`, `weakness-appearances.test.ts` — 입력 데이터 형태 유지하므로 영향 없을 것. 테스트 안 깨지는지 확인.
- `use-history-screen.test.ts` — hotfix 흔적 제거 후도 통과해야 함.

**전체 검증:**

- `npx tsc --noEmit` — 타입 에러 0
- `npm test` — 모든 테스트 통과

### 수동

이전 회귀 시나리오 + 약점 카드 정상화 확인:

1. 모의고사 응시 → 채점 결과 → 진단 세션 진입
2. **같은 약점**으로 4문제 연속 진단 → 미니카드 → "잠시 쉬기"
3. 홈탭 이동 → 기록 탭
4. **확인 1**: 회차 항목에 "분석중 4/N" 표시 (hotfix와 동일)
5. **확인 2**: 항목 탭 → 결과 화면 정상 진입
6. 홈탭의 약점 카드:
7. **확인 3**: 해당 약점 severity가 `occasional`("가끔 등장", 초록) — 1회차만 카운트되므로
8. 약점 상세 화면 진입:
9. **확인 4**: "등장 기록" 타임라인에 해당 모의고사가 **1번**만 표시 (이전엔 4번)

## Out of Scope

### 서버 cleanup 마이그레이션

기존 `exam-diag-*` 레코드를 Firestore에서 삭제하는 Cloud Function. client filter로 차폐되므로 즉시 필요성 없음. 만약 storage 비용 / 분석 데이터 정리 필요 시 별도 spec.

### `recentAppearanceCount` 윈도우/시맨틱 재검토

`RECENT_WINDOW = 5`가 적절한지, 시즌별/시간 가중 등 다른 metric이 더 나은지는 별도 product 결정. 이번 PR은 의미적 정합성 회복만 다룬다.

### `buildExamDiagnosisAttemptInput` 완전 제거

unused가 되더라도 함수는 그대로 둔다. 의도를 명확히 하기 위해 deprecated JSDoc 주석 추가. 완전 제거는 future cleanup PR에서.
