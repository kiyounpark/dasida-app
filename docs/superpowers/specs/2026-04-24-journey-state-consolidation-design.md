# 여정보드 상태 관리 정돈 설계

- **작성일**: 2026-04-24
- **작성자**: 박기윤 + Claude
- **상태**: 기획중
- **관련 기능**: 여정보드(JourneyBoard) / 학습자 여정 상태 머신
- **선행 스펙**:
  - [2026-04-23-diagnosis-resume-on-exit-design.md](2026-04-23-diagnosis-resume-on-exit-design.md)
  - [2026-04-24-diagnostic-analysis-pending-state-design.md](2026-04-24-diagnostic-analysis-pending-state-design.md)
- **선행 조건**: 위 두 스펙의 구현이 머지된 상태. 특히 2단계 스펙에서 추가된 `hasValidPendingResume` 함수가 존재해야 한다.

## 1. 배경

2단계 스펙(`diagnostic_analysis_pending` 여정 상태 추가) 리뷰 과정에서 `features/learning/home-journey-state.ts`의 상태 관리 구조를 전반적으로 점검한 결과, 즉각적인 버그는 아니지만 **state 개수가 늘어갈수록 혼란의 원천이 될 수 있는 세 가지 관찰**이 나왔다.

1. **stale 판정 패턴 이중화** — 기존 `isPendingDiagnosticFresh`/`isPendingPracticeFresh`는 "시간 비교"로 pending 유효성을 판별하는데, 2단계에서 추가되는 `hasValidPendingResume`은 "attemptId 동일성"으로 판별한다. 두 패턴이 공존하는 근거가 코드 어디에도 명시돼 있지 않아 독자가 혼란을 겪을 수 있다. 또한 각 패턴은 서로 다른 edge case만 커버해 단독으로는 사각지대가 있다.
2. **같은 stepKey에 복수 state 매핑** — 2단계 이후 `stateToStepKey` 테이블에서 모든 stepKey가 2개의 state를 공유하게 된다(`diagnostic`, `analysis`, `review`, `exam`). 이것은 "캐릭터는 같은 노드에 머물되 문구로 상황을 구분한다"는 **의도된 설계**이지만, 코드 어디에도 이 규칙이 명시돼 있지 않아 장래에 혼선을 일으킬 수 있다.
3. **단위 테스트 부재** — `getCurrentState`는 early-return 순서에 기반한 8개 분기를 가진 순수 함수이지만, 앱 레벨에 단위 테스트 인프라 자체가 없어 회귀 방지 장치가 `npx tsc --noEmit`뿐이다.

본 스펙은 이 세 항목을 "상태 관리 정돈"이라는 하나의 묶음으로 다루되, **테스트 인프라 도입은 범위가 크므로 후속 스펙으로 분리**한다.

## 2. 목표와 비목표

### 목표

- `home-journey-state.ts`의 stale 판정 규칙을 단일 패턴(**시간 기반 메인 + attemptId 보조 가드**)으로 통일하고, `hasValidPendingResume`을 그에 맞춰 재작성한다.
- stepKey ↔ state의 다대일 매핑이 **의도된 설계 규약**임을 파일 상단 docstring + 상태 결정 표로 명문화한다.
- `getCurrentState` 우선순위와 각 분기의 판정 근거를 독자가 한눈에 대조할 수 있는 **상태 결정 표**를 코드 주석 또는 인접 문서로 제공한다.
- 단위 테스트 인프라 도입을 위한 후속 스펙을 본 스펙 §8에 공식 예약한다.

### 비목표

- 각 state의 의미·우선순위·copy를 변경하지 않는다. 순수하게 "판정 로직 통일 + 문서화" 수준의 정돈.
- 노드 컴포넌트(`journey-step-node.tsx`)의 시각 스타일 변경은 다루지 않는다. "같은 stepKey에 복수 state가 매핑되어도 시각적으로 동일"은 현상태 그대로 유지.
- 단위 테스트 실제 작성은 본 스펙 범위 밖(→ §8 후속 스펙).
- 진단/연습 pending 플래그의 데이터 스키마 변경은 없다. 기존 `pendingDiagnosticStartedAt`(string), `pendingPracticeStartedAt`(string), `pendingDiagnosisResume`(object) 구조 그대로.

## 3. 결정사항 요약

| 항목 | 결정 | 대안과의 비교 근거 |
|---|---|---|
| (1) stale 판정 패턴 | **시간 기반 메인 + attemptId 보조 가드** | 시간 단독은 "same-attempt race" 사각지대, attemptId 단독은 "다기기 신규 attempt 완료" 사각지대. 두 체크를 함께 쓰면 단독 대비 방어력 상승 + 기존 두 pending과 모양 일관. |
| (2) stepKey 중복 매핑 | **컨벤션 명문화만 (코드 변경 없음)** | 같은 패턴이 4개 stepKey 전부에서 이미 쓰이고 있음. UX 구분이 필요하다면 별도 디자인 스펙이 맞음. 이번 스펙은 문서화로 충분. |
| (3) 단위 테스트 | **후속 스펙으로 분리** | 앱 단위 테스트 인프라 자체가 없음(Jest/Vitest 미설치). 단일 함수 때문에 배관 작업을 끌어오기보다, 인프라 도입을 독립 스펙으로. 이번 스펙에는 "수동 QA 체크리스트 + 상태 결정 표"로 단기 공백을 메움. |

## 4. 상세 설계

### 4.1 stale 판정 패턴 통일

**변경 대상**: `features/learning/home-journey-state.ts::hasValidPendingResume`

**현재(2단계 구현 후 예상)**:

```ts
function hasValidPendingResume(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingDiagnosisResume;
  if (!pending) return false;
  if (pending.schemaVersion !== 1) return false;
  if (!pending.attemptId) return false;
  if (pending.diagnosisQueue.length === 0) return false;
  if (summary.latestDiagnosticSummary?.attemptId === pending.attemptId) return false;
  return true;
}
```

**변경 후**:

```ts
function hasValidPendingResume(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingDiagnosisResume;

  // ── 구조 검증 ──
  if (!pending) return false;
  if (pending.schemaVersion !== 1) return false;
  if (!pending.attemptId) return false;
  if (pending.diagnosisQueue.length === 0) return false;

  // ── stale 판정 ①: 시간 기반 (isPendingDiagnosticFresh / isPendingPracticeFresh와 동일 패턴) ──
  const savedAtMs = Date.parse(pending.savedAt);
  const latestCompletedAtRaw = summary.latestDiagnosticSummary?.completedAt;
  if (latestCompletedAtRaw) {
    const latestCompletedAtMs = Date.parse(latestCompletedAtRaw);
    if (
      !Number.isNaN(savedAtMs) &&
      !Number.isNaN(latestCompletedAtMs) &&
      savedAtMs <= latestCompletedAtMs
    ) {
      return false;
    }
  }

  // ── stale 판정 ②: attemptId 보조 가드 (same-attempt race 방어) ──
  if (summary.latestDiagnosticSummary?.attemptId === pending.attemptId) {
    return false;
  }

  return true;
}
```

**설계 의도**:

- **메인 체크 = 시간 기반**: `isPendingDiagnosticFresh`/`isPendingPracticeFresh`와 동일한 구조(`pendingAt <= latestCompletedAt` → stale). 독자가 한 번 이해하면 세 함수를 동일한 모양으로 읽을 수 있다.
- **보조 체크 = attemptId 동일성**: 시간 기반은 clock skew나 저장 레이스에서 "같은 attemptId인데 savedAt이 completedAt보다 나중"이라는 엣지를 놓친다. 이 경우 attemptId가 같다면 이미 완료된 attempt이므로 stale. 시간 체크와 AND가 아니라 OR(둘 중 하나라도 stale이면 stale)로 작동한다.
- **단독 대비 우위**: 시간 체크와 attemptId 체크는 각자 다른 사각지대를 커버한다(시간 체크만 있으면 same-attempt race, attemptId 체크만 있으면 cross-device race). OR로 결합하면 **둘 중 어느 단독 구성보다 엄격한 stale 판정**이 되어 기능 후퇴 없이 방어력만 올라간다. 2단계 스펙의 attemptId 단독 체크 대비로도 기능 후퇴가 없다.

**`isPendingDiagnosticFresh` / `isPendingPracticeFresh`는 변경하지 않는다**. 이들은 이미 "시간 기반"이고, 참조하는 데이터(타임스탬프 문자열)에 attemptId가 없어 보조 가드를 걸 수단이 없다. 구조 변경 없이 통일할 수 있는 유일한 포인트가 `hasValidPendingResume`이다.

### 4.2 stepKey ↔ state 규약 명문화

**변경 대상**: `features/learning/home-journey-state.ts` 파일 상단 docstring

**추가할 내용**: 아래 블록을 `JourneyStepKey` 타입 선언 바로 위에 삽입한다.

```ts
/**
 * 여정보드 상태 머신 규약
 * =====================================
 *
 * 이 파일은 학습자 여정의 진실 소스(single source of truth)다.
 *
 * ## 두 축: state vs stepKey
 *
 * - `JourneyStateKey` — 사용자가 지금 어느 "상황"에 있는지.
 *   copy(말풍선/CTA/본문)와 동작(ctaAction)을 결정한다. state는 자주 늘어난다.
 * - `JourneyStepKey` — 캐릭터가 보드 위 어느 "노드"에 시각적으로 머무는지.
 *   4개 노드(diagnostic/analysis/review/exam)로 고정. 노드 UI 확장과 함께가 아니면 늘리지 않는다.
 *
 * ## 다대일 매핑은 의도된 설계
 *
 * 하나의 stepKey는 복수 state를 받는다. 예:
 *   - diagnostic: journey_not_started, diagnostic_in_progress
 *   - analysis:   result_pending, diagnostic_analysis_pending
 *   - review:     viewed_pre_practice, practice_in_progress
 *   - exam:       journey_complete_pending, journey_graduated
 *
 * 같은 노드에서 시각은 동일하되 말풍선/CTA로 "무엇을 해야 하는지"를 분화한다.
 * 시각까지 구분해야 한다면 그것은 별도 UX 스펙의 결정이지, state 추가의 문제가 아니다.
 *
 * ## stale 판정 규칙
 *
 * pending 플래그가 fresh한지 판정할 때는 **시간 기반을 메인**으로 쓴다
 * (pendingAt > latestCompletedAt). attemptId가 함께 저장된 pending에는
 * **attemptId 동일성을 보조 가드**로 덧붙여 same-attempt race를 방어한다.
 * `isPendingDiagnosticFresh`, `isPendingPracticeFresh`, `hasValidPendingResume`
 * 세 함수는 이 규약을 따른다.
 *
 * ## 우선순위는 getCurrentState의 early-return 순서가 그대로 스펙이다
 *
 * 새 state를 추가할 때는 아래 순서 중 어디에 끼울지 반드시 명시한다:
 *   1. journey_graduated        (졸업은 항상 최우선)
 *   2. diagnostic_analysis_pending  (진단만 미완료인 이어서 상태)
 *   3. diagnostic_in_progress   (10문제 진단 중단)
 *   4. journey_not_started      (진단 기록 없음)
 *   5. journey_complete_pending (최신 진단 이후 review 활동 있음)
 *   6. practice_in_progress     (결과 확인 + pending 연습 fresh)
 *   7. viewed_pre_practice      (결과 확인만 완료)
 *   8. result_pending           (기본 — 진단 완료, 결과 미확인)
 */
```

**설계 의도**:

- 3개의 규약(state vs stepKey / 다대일 매핑 / stale 판정)과 우선순위 표를 파일 상단에 집약 → 독자는 이 블록 하나만 읽으면 상태 머신 전체 개념을 이해한다.
- 우선순위 표의 번호는 `getCurrentState` 내부 코드 주석(`// 1: ...`, `// 2: ...`)과 1:1로 대응하도록 업데이트한다. 불일치가 회귀의 단서가 된다.
- 기존 `// 7: 졸업은 항상 최우선.`처럼 절반만 달려 있는 번호 주석을 새 순서에 맞게 재번호한다.

### 4.3 getCurrentState 내부 번호 주석 재정렬

**변경 대상**: `features/learning/home-journey-state.ts::getCurrentState`

2단계 스펙이 머지되면 `hasValidPendingResume` 체크가 `journey_graduated` 다음에 삽입된다. 본 스펙에서는 각 early-return 앞의 번호 주석을 §4.2의 우선순위 표와 맞춘다.

| 위치 | 주석 |
|---|---|
| `practiceGraduatedAt` 체크 | `// 1: 졸업은 항상 최우선.` |
| `hasValidPendingResume` 체크 | `// 2: 진단만 미완료인 "이어서" 상태.` |
| `isPendingDiagnosticFresh` 체크 | `// 3: 10문제 진단 중단.` |
| `!hasLatestDiagnostic` 체크 | `// 4: 진단 기록 없음.` |
| `hasReviewAfterLatestDiagnostic` 체크 | `// 5: 최신 진단 이후 review 활동.` |
| `viewedAt && isPendingPracticeFresh` 체크 | `// 6: 연습 중단.` |
| `viewedAt` 체크 | `// 7: 결과 확인 완료.` |
| 기본 return | `// 8 (기본): 결과 확인 전.` |

코드 동작은 변경되지 않는다. 주석만 정렬.

## 5. 구현 범위

### 5.1 변경 파일

| 파일 | 변경 유형 | 변경 내용 |
|---|---|---|
| `features/learning/home-journey-state.ts` | Modify | (a) 파일 상단 규약 docstring 추가, (b) `hasValidPendingResume` 본문을 §4.1 구현으로 교체, (c) `getCurrentState` 내부 번호 주석 재정렬 |

**이 스펙이 변경하는 파일은 위 한 개뿐이다.** 선행 스펙들이 이미 대부분의 구조를 만들어두었고, 본 스펙은 "한 함수의 구현 교체 + 문서화"에 집중한다.

### 5.2 선행 조건 확인

본 스펙 구현 착수 전 아래가 머지되어 있어야 한다:

- [2026-04-23-diagnosis-resume-on-exit](../plans/2026-04-23-diagnosis-resume-on-exit.md) — `pendingDiagnosisResume` 데이터 모델과 저장 로직
- [2026-04-24-diagnostic-analysis-pending-state](../plans/2026-04-24-diagnostic-analysis-pending-state.md) — `diagnostic_analysis_pending` state 추가와 `hasValidPendingResume` 함수 도입

두 플랜 중 어느 하나라도 미머지 상태면 본 스펙의 구현은 merge conflict와 "교체 대상 함수가 아직 존재하지 않음" 문제에 부딪힌다.

## 6. 엣지 케이스

### 6.1 `summary.latestDiagnosticSummary`가 `undefined`인 경우

**첫 진단 사용자가 분석 단계에서 이탈한 자연스러운 시나리오**. 아직 완료된 진단이 없어 `latestDiagnosticSummary` 자체가 `undefined`이다. 새 로직에서는 `latestCompletedAtRaw`가 `undefined`이므로 시간 체크 블록 전체를 스킵하고, 보조 가드의 `summary.latestDiagnosticSummary?.attemptId`도 `undefined`가 되어 `pending.attemptId !== undefined` → 통과. 결과적으로 `fresh` 반환 → 허브가 `diagnostic_analysis_pending`으로 판정. 의도된 동작.

### 6.2 `Date.parse` 실패

`pending.savedAt` 또는 `latestCompletedAt`이 잘못된 ISO 문자열일 수 있다. `Number.isNaN` 체크로 방어한다. 둘 중 하나라도 NaN이면 시간 체크를 건너뛰고 attemptId 보조 가드에 맡긴다. 기존 `isPendingDiagnosticFresh`와 동일한 방어 패턴.

### 6.3 same-attempt race (savedAt > completedAt, attemptId 동일)

finalize 직후 clear 실패 + in-flight save가 나중에 도착하는 드문 경우. 시간 체크만으로는 fresh로 판정되지만, 보조 가드가 `attemptId === latestAttemptId`를 잡아 stale 반환. **본 스펙의 핵심 방어 시나리오**.

### 6.4 다기기 race (attemptId 다름, 구기기에 오래된 resume)

기기 A에서 attempt A1 저장 → 기기 B에서 attempt A2 완료 → 기기 A 재진입. 시간 체크가 `savedAt < latestCompletedAt`으로 stale 반환. attemptId 단독 체크만으로는 잡지 못하는 케이스 — 본 스펙의 시간 체크가 이 방어를 담당.

### 6.5 졸업 사용자 + stale `pendingDiagnosisResume`

`getCurrentState`에서 `practiceGraduatedAt` 체크가 `hasValidPendingResume`보다 먼저 → 졸업 판정이 우선. 여정보드 자체가 숨겨지므로 사용자 영향 없음. 회귀 없음.

## 7. 테스트 관점

### 7.1 수동 QA 체크리스트

**A. stale 판정 회귀**
- [ ] 10문제 완료 + 분석 1개 완료 후 이탈 → 허브 `diagnostic_analysis_pending` 판정.
- [ ] 해당 attempt를 분석 끝까지 완료 → 허브 재진입 시 `result_pending`으로 전이(not `diagnostic_analysis_pending`).
- [ ] (수동 상태 조작) `pendingDiagnosisResume.savedAt`을 `latestDiagnosticSummary.completedAt`과 동일/이전으로 설정 → 허브에서 `diagnostic_analysis_pending` 표시 안 됨 (stale 판정 정상).

**B. 8개 state 전수 확인**
각 state에 진입하는 자연스러운 조작을 한 번씩 수행하고 허브 화면의 말풍선/CTA/노드가 §4.2 우선순위 표와 일치하는지 확인.

**C. 우선순위 회귀**
- [ ] 졸업 사용자 프로파일에 stale `pendingDiagnosisResume` 남겨둔 상태 → 허브에서 여정보드 자체 비노출.
- [ ] `pendingDiagnosticStartedAt`과 `pendingDiagnosisResume`이 **동시에** fresh한 인위 상태 조합 → `diagnostic_analysis_pending`이 판정됨(2번이 3번보다 우선).

### 7.2 상태 결정 표(레퍼런스)

| # | state | profile 조건 | summary 조건 | stepKey | CTA action |
|---|---|---|---|---|---|
| 1 | `journey_graduated` | `practiceGraduatedAt` 존재 | — | exam | none |
| 2 | `diagnostic_analysis_pending` | `hasValidPendingResume = true` | attempt 미완료 | analysis | resume_diagnosis |
| 3 | `diagnostic_in_progress` | `isPendingDiagnosticFresh = true` | — | diagnostic | start_diagnostic |
| 4 | `journey_not_started` | — | `latestDiagnosticSummary` 없음 | diagnostic | start_diagnostic |
| 5 | `journey_complete_pending` | — | 최신 진단 이후 `recentActivity[kind=review]` 있음 | exam | graduate_practice |
| 6 | `practice_in_progress` | `viewedAt` 있음 + `isPendingPracticeFresh = true` | — | review | open_review |
| 7 | `viewed_pre_practice` | `viewedAt` 있음 | — | review | open_review |
| 8 | `result_pending` | (기본) | `latestDiagnosticSummary` 있음 | analysis | open_result |

이 표는 docstring으로도 제공되며, 구현 시 `getCurrentState` 함수 바로 위에 인접 주석으로 복제한다.

### 7.3 회귀 확인 명령

```bash
npx tsc --noEmit
```

단위 테스트 부재로 타입 체크가 유일한 자동화된 회귀 방어선. 본 스펙은 이 상황을 §8의 후속 스펙으로 해소한다.

## 8. 후속 스펙 예약 — 앱 레벨 단위 테스트 인프라

### 8.1 배경

본 스펙 §7.3에서 확인되듯, 현재 앱 저장소에는 Jest/Vitest 같은 JS 단위 테스트 러너가 설치되어 있지 않다(`package.json`의 `scripts`에 test 엔트리 없음, `features/` 아래 `.test.ts` 파일 0개). `getCurrentState`처럼 순수 함수이면서 분기가 많은 로직이 늘어나고 있지만 자동화된 회귀 검증 장치가 타입 체크뿐이다.

### 8.2 후속 스펙 개요

- **가칭 슬러그**: `unit-test-infra`
- **저장 경로(예정)**: `docs/superpowers/specs/YYYY-MM-DD-unit-test-infra-design.md`
- **범위 초안**:
  - jest-expo 프리셋 또는 Vitest(+ @vitest/expect) 중 선택
  - `tsconfig.json` path alias(`@/`) 연동
  - Firebase / expo-router / AsyncStorage 모듈 mock 전략
  - `getCurrentState` 첫 테스트 파일 — §7.2 상태 결정 표의 8개 행을 per-state 케이스로 전수 커버
  - CI(GitHub Actions 또는 EAS Workflow) 게이트 여부 결정

### 8.3 착수 트리거 (코드 변경 기반)

아래 중 **먼저 오는 것**을 착수 신호로 본다:

1. 여정보드에 **9번째 state 추가** 논의가 시작될 때.
2. `features/quiz/session.tsx` reducer에 **새 액션 추가**가 필요할 때 (`RESUME_DIAGNOSIS` 이후의 다음 확장).
3. `getCurrentState` **우선순위 재정렬**이 필요한 요구가 생길 때(기존 state 간 순서가 흔들리는 변경).
4. 위 조건과 무관하게, 이 스펙 머지 이후 **상태 관련 회귀 버그가 2회 이상 발생**하면 즉시 착수(아래 §8.4 로그로 확인).

### 8.4 회귀 근거 누적 로그(본 스펙 머지 이후 작성)

이 스펙이 머지되는 시점에 비워둔다. `home-journey-state.ts` 또는 관련 훅에서 회귀 버그가 발견될 때마다 본 섹션 또는 후속 스펙에 한 줄씩 추가한다. 두 번째 로그가 찍히는 순간 §8.3의 4번 트리거가 발화한다.

```
- (빈 섹션 — 회귀 발생 시 `- YYYY-MM-DD: <요약> (커밋 해시)` 형식으로 추가)
```

### 8.5 Notion 기획중 등록

본 스펙 머지 직후 Notion "DASIDA 개발 기록" 데이터베이스에 후속 스펙 초안 페이지(상태: 기획중)를 생성해, 트리거가 올 때 쉽게 찾을 수 있도록 한다. CLAUDE.md 8절 Notion 워크플로우와 동일 절차.

## 9. 결정된 사항

- stale 판정 함수 세 개 중 `hasValidPendingResume`만 변경한다. `isPendingDiagnosticFresh`, `isPendingPracticeFresh`는 참조 데이터에 attemptId가 없어 보조 가드를 걸 수단이 없으므로 **원형 유지**.
- `savedAt` / `completedAt` 파싱 실패 시 시간 체크를 건너뛰고 attemptId 보조 가드에만 의존한다(기존 `isPendingDiagnosticFresh`와 동일 방어 패턴).
- stepKey 중복 매핑에 대해 **시각 구분을 위한 UI 작업은 이번 스펙 범위 밖**. 필요 시 별도 UX 스펙으로 분리.
- 단위 테스트는 **본 스펙에 포함하지 않는다**. §8의 후속 스펙으로 분리하며, 본 스펙 머지 시점에 Notion에 기획중 페이지로 예약한다.
- `getCurrentState` 내부 번호 주석은 새 우선순위 8단계와 1:1 정합이 되도록 재정렬한다. 정렬 불일치는 코드 리뷰 체크 포인트로 삼는다.
