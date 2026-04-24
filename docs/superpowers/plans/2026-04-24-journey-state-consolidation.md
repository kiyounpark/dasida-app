# 여정보드 상태 관리 정돈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/learning/home-journey-state.ts`의 여정 상태 머신 규약을 명문화하고, `hasValidPendingResume`을 "시간 기반 + attemptId 보조 가드" OR 조합으로 재작성해 stale 판정 패턴을 기존 두 pending 함수와 통일한다.

**Architecture:** 단일 파일(`home-journey-state.ts`) 내에서 세 변경을 수행한다 — (a) 파일 상단에 state/stepKey/stale 판정/우선순위 규약을 정리하는 docstring 추가, (b) 2단계 스펙이 도입한 `hasValidPendingResume` 본문을 시간 체크 + attemptId 보조 가드 OR 조합으로 교체, (c) `getCurrentState` 내부의 번호 주석을 early-return 순서(1~8)와 1:1 정합하도록 재정렬. 코드 동작은 "시간 체크 추가로 cross-device race까지 방어"되는 점만 확장되고, 기존 8개 state 판정 결과는 보존된다.

**Tech Stack:** TypeScript, React Native (Expo)

**선행 스펙:** [docs/superpowers/specs/2026-04-24-journey-state-consolidation-design.md](../specs/2026-04-24-journey-state-consolidation-design.md)

---

## 파일 맵

| 파일 | 역할 | 변경 유형 |
|---|---|---|
| `features/learning/home-journey-state.ts` | 여정 상태 계산 + 규약 문서화 + stale 판정 | Modify |

**이 플랜은 단일 파일만 변경한다**. 타입 선언, 컴포넌트, 훅, 스토어는 건드리지 않는다. 테스트 파일은 작성하지 않는다(본 스펙은 테스트 인프라를 후속 스펙으로 분리).

---

## 선행 조건 (반드시 확인)

아래 두 플랜이 **모두 머지된 상태**에서만 본 플랜을 진행한다.

- [2026-04-23-diagnosis-resume-on-exit](2026-04-23-diagnosis-resume-on-exit.md) — `pendingDiagnosisResume` 데이터 모델 도입
- [2026-04-24-diagnostic-analysis-pending-state](2026-04-24-diagnostic-analysis-pending-state.md) — `diagnostic_analysis_pending` state와 `hasValidPendingResume` 함수 도입

**두 번째 플랜이 현재 다른 대화창에서 진행 중이므로, 착수 전 Task 1에서 반드시 검증한다.**

---

## Task 1: 선행 조건 검증

**Files:**
- Read only: `features/learning/home-journey-state.ts`

- [ ] **Step 1: 2단계 구현의 존재 여부 확인**

```bash
grep -n "hasValidPendingResume\|diagnostic_analysis_pending" features/learning/home-journey-state.ts
```

**기대 결과:**
- `export type JourneyStateKey` 유니온에 `'diagnostic_analysis_pending'` 존재
- `stateToStepKey`에 `diagnostic_analysis_pending: 'analysis'` 존재
- `stateCopyTable`에 `diagnostic_analysis_pending` 엔트리 존재
- `function hasValidPendingResume(...)` 정의 존재
- `getCurrentState` 내부에 `if (hasValidPendingResume(profile, summary))` 분기 존재

**선행 조건 미충족 시:** 본 플랜을 중단하고 2단계 플랜 머지를 기다린다. 이 플랜의 나머지 태스크를 진행하면 merge conflict 또는 "없는 함수 수정 시도" 오류가 난다.

- [ ] **Step 2: `hasValidPendingResume` 현재 본문 스냅샷 저장 (회귀 검증용)**

```bash
grep -A 10 "^function hasValidPendingResume" features/learning/home-journey-state.ts
```

**기대 결과 (2단계 구현 직후 상태):**
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

본문이 이 형태와 다르면 중단하고 **원인 파악 후** 재개한다(다른 스펙이 이미 건드렸을 수 있음).

- [ ] **Step 3: 타입 체크 베이스라인 확보**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

**기대 결과:** 오류 없음. 기존 오류가 있으면 본 플랜과 무관한 기존 오류인지 확인하고 기록해둔다(이후 태스크에서 발생한 오류와 구분하기 위함).

---

## Task 2: 파일 상단 규약 docstring 추가

**Files:**
- Modify: `features/learning/home-journey-state.ts` (imports 직후, `JourneyStepKey` 타입 선언 바로 앞)

- [ ] **Step 1: docstring 블록 삽입**

변경 전 (현재 파일 1~6라인):
```ts
import { diagnosisMap } from '@/data/diagnosisMap';
import type { LearnerProfile } from '@/features/learner/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

// 캐릭터가 위치한 시각적 단계 (JourneyBoard의 4노드). state 추가와 무관하게 유지.
export type JourneyStepKey = 'diagnostic' | 'analysis' | 'review' | 'exam';
```

변경 후:
```ts
import { diagnosisMap } from '@/data/diagnosisMap';
import type { LearnerProfile } from '@/features/learner/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

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
 *   1. journey_graduated            (졸업은 항상 최우선)
 *   2. diagnostic_analysis_pending  (진단만 미완료인 이어서 상태)
 *   3. diagnostic_in_progress       (10문제 진단 중단)
 *   4. journey_not_started          (진단 기록 없음)
 *   5. journey_complete_pending     (최신 진단 이후 review 활동 있음)
 *   6. practice_in_progress         (결과 확인 + pending 연습 fresh)
 *   7. viewed_pre_practice          (결과 확인만 완료)
 *   8. result_pending               (기본 — 진단 완료, 결과 미확인)
 */

// 캐릭터가 위치한 시각적 단계 (JourneyBoard의 4노드). state 추가와 무관하게 유지.
export type JourneyStepKey = 'diagnostic' | 'analysis' | 'review' | 'exam';
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

**기대 결과:** 오류 없음 (docstring은 타입에 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "docs(learning): home-journey-state 파일 상단 상태 머신 규약 docstring 추가

state vs stepKey 두 축, stepKey에 복수 state가 매핑되는 의도된 설계,
stale 판정 규칙(시간 기반 + attemptId 보조), 8단계 우선순위 표를
single source of truth로 정리."
```

---

## Task 3: `hasValidPendingResume` 본문 재작성 (시간 기반 + attemptId 보조)

**Files:**
- Modify: `features/learning/home-journey-state.ts` (현재 `hasValidPendingResume` 함수 전체)

- [ ] **Step 1: 함수 본문 교체**

변경 전 (2단계 직후 상태):
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

변경 후:
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

  // ── stale 판정 ①: 시간 기반 (isPendingDiagnosticFresh / isPendingPracticeFresh와 동일 패턴)
  // cross-device race 방어 — 다른 기기에서 새 attempt가 완료된 뒤 구기기의 오래된 resume을 열었을 때 stale 처리.
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

  // ── stale 판정 ②: attemptId 보조 가드 (same-attempt race 방어)
  // finalize 직후 clear 실패 + 뒤늦은 save가 같은 attemptId로 남았을 때 stale 처리.
  if (summary.latestDiagnosticSummary?.attemptId === pending.attemptId) {
    return false;
  }

  return true;
}
```

**핵심 변화:**
- 구조 검증 4줄은 그대로 유지.
- attemptId 체크 앞에 시간 기반 stale 체크를 삽입 — `savedAt <= latestCompletedAt`이면 stale.
- `latestCompletedAt`이 없거나 `Date.parse` 실패 시 시간 블록 전체를 스킵해 보조 가드에 판정을 맡김(기존 `isPendingDiagnosticFresh`와 동일한 방어 패턴).
- 두 체크는 OR 관계 — 둘 중 하나라도 stale 판정을 하면 `false` 반환.

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

**기대 결과:** 오류 없음. `pending.savedAt`은 `PendingDiagnosisResumeState` 타입에 이미 `string`으로 정의되어 있어 추가 타입 작업 불필요.

- [ ] **Step 3: 정적 정합성 확인**

```bash
grep -n "savedAt" features/learner/types.ts
```

**기대 결과:** `savedAt: string` 필드가 `PendingDiagnosisResumeState` 타입에 존재. 존재하지 않는다면 Phase 1 플랜 Task 1이 아직 반영되지 않은 상태 → Task 1 선행 조건 검증으로 되돌아간다.

- [ ] **Step 4: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "refactor(learning): hasValidPendingResume을 시간 기반 + attemptId 보조 가드로 통일

기존 attemptId 단독 체크에 savedAt vs latestCompletedAt 시간 비교를
추가(OR). cross-device race(타 기기에서 새 attempt 완료 후 구기기의
오래된 resume)와 same-attempt race(finalize 직후 clear 실패)를 동시에
방어. 기존 두 pending 함수(isPendingDiagnosticFresh / PracticeFresh)와
패턴 통일."
```

---

## Task 4: `getCurrentState` 내부 번호 주석 재정렬

**Files:**
- Modify: `features/learning/home-journey-state.ts` (`getCurrentState` 함수 내부 주석만)

현재 주석은 "원래 state 정의 순서" 기준으로 번호가 매겨져 있어 early-return 실제 순서와 일치하지 않는다(예: 최우선 분기에 `// 7:` 달림). docstring의 우선순위 표와 1:1 정합하도록 재정렬한다.

- [ ] **Step 1: 각 분기 주석 교체**

`getCurrentState` 함수 내부 전체를 아래로 교체 (함수 시그니처, 변수 선언, return 문은 그대로 유지하고 **주석만** 변경):

변경 전 (2단계 머지 후 예상):
```ts
function getCurrentState(
  summary: LearnerSummaryCurrent,
  profile: LearnerProfile | null,
): JourneyStateKey {
  // 7: 졸업은 항상 최우선.
  if (profile?.practiceGraduatedAt) {
    return 'journey_graduated';
  }

  // 약점 분석 이어서 하기: 10문제 퀴즈는 끝났고 분석만 미완료인 상태.
  // graduated 다음으로 우선 체크 — 졸업 후 stale resume 레코드가 있어도 영향 없음.
  if (hasValidPendingResume(profile, summary)) {
    return 'diagnostic_analysis_pending';
  }

  // 2: 진단 중단. 최초 진단이 아직 완료되지 않았거나, 최신 완료 이후 새 진단이 시작돼 중단된 경우.
  if (isPendingDiagnosticFresh(profile, summary)) {
    return 'diagnostic_in_progress';
  }

  // 1: 진단 기록이 하나도 없음.
  const hasLatestDiagnostic = Boolean(summary.latestDiagnosticSummary);
  if (!hasLatestDiagnostic) {
    return 'journey_not_started';
  }

  // 6: 최신 진단 이후 review 활동이 있으면 여정이 거의 끝난 상태.
  const latestDiagnosticAt = summary.latestDiagnosticSummary?.completedAt;
  const hasReviewAfterLatestDiagnostic = hasActivityAfter(summary, 'review', latestDiagnosticAt);
  if (hasReviewAfterLatestDiagnostic) {
    return 'journey_complete_pending';
  }

  // 5: 연습 중단. 4번 조건(결과 확인) 성립 + 최신 진단 이후 시작된 pending 연습이 있을 때.
  if (profile?.latestDiagnosticResultViewedAt && isPendingPracticeFresh(profile, summary)) {
    return 'practice_in_progress';
  }

  // 4: 결과 확인 완료.
  if (profile?.latestDiagnosticResultViewedAt) {
    return 'viewed_pre_practice';
  }

  // 3: 결과 확인 전.
  return 'result_pending';
}
```

변경 후:
```ts
function getCurrentState(
  summary: LearnerSummaryCurrent,
  profile: LearnerProfile | null,
): JourneyStateKey {
  // 1: 졸업은 항상 최우선.
  if (profile?.practiceGraduatedAt) {
    return 'journey_graduated';
  }

  // 2: 진단만 미완료인 "이어서" 상태 — 10문제 퀴즈는 끝났고 약점 분석이 남음.
  //   graduated 다음으로 우선 체크 — 졸업 후 stale resume 레코드가 있어도 1번이 먼저 잡음.
  if (hasValidPendingResume(profile, summary)) {
    return 'diagnostic_analysis_pending';
  }

  // 3: 10문제 진단 중단 — 최초 진단 미완료 또는 최신 완료 이후 새 진단이 시작돼 중단된 경우.
  if (isPendingDiagnosticFresh(profile, summary)) {
    return 'diagnostic_in_progress';
  }

  // 4: 진단 기록이 하나도 없음.
  const hasLatestDiagnostic = Boolean(summary.latestDiagnosticSummary);
  if (!hasLatestDiagnostic) {
    return 'journey_not_started';
  }

  // 5: 최신 진단 이후 review 활동이 있으면 여정이 거의 끝난 상태.
  const latestDiagnosticAt = summary.latestDiagnosticSummary?.completedAt;
  const hasReviewAfterLatestDiagnostic = hasActivityAfter(summary, 'review', latestDiagnosticAt);
  if (hasReviewAfterLatestDiagnostic) {
    return 'journey_complete_pending';
  }

  // 6: 연습 중단 — 7번 조건(결과 확인) 성립 + 최신 진단 이후 시작된 pending 연습이 있을 때.
  if (profile?.latestDiagnosticResultViewedAt && isPendingPracticeFresh(profile, summary)) {
    return 'practice_in_progress';
  }

  // 7: 결과 확인 완료.
  if (profile?.latestDiagnosticResultViewedAt) {
    return 'viewed_pre_practice';
  }

  // 8 (기본): 결과 확인 전 — 진단 완료 직후.
  return 'result_pending';
}
```

**변경 요약 (코드 로직 변화 없음, 주석만):**

| 분기 | 기존 주석 번호 | 새 주석 번호 |
|---|---|---|
| `practiceGraduatedAt` | 7 | **1** |
| `hasValidPendingResume` | (번호 없음) | **2** |
| `isPendingDiagnosticFresh` | 2 | **3** |
| `!hasLatestDiagnostic` | 1 | **4** |
| `hasReviewAfterLatestDiagnostic` | 6 | **5** |
| `viewedAt && isPendingPracticeFresh` | 5 | **6** |
| `viewedAt` | 4 | **7** |
| 기본 return | 3 | **8 (기본)** |

또한 6번 주석의 기존 텍스트 "4번 조건(결과 확인)"을 "7번 조건(결과 확인)"으로 함께 수정(새 번호 체계 기준).

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

**기대 결과:** 오류 없음.

- [ ] **Step 3: 로직 회귀 없음 확인 (diff 검토)**

```bash
git diff features/learning/home-journey-state.ts
```

**기대 결과:** 변경 사항이 **주석 라인만** 포함하고 있고 `if (...)` 조건, `return` 문, 변수 선언은 단 한 줄도 바뀌지 않았음을 시각 확인. 하나라도 코드가 바뀌었다면 실수이므로 Step 1로 되돌아간다.

- [ ] **Step 4: 커밋**

```bash
git add features/learning/home-journey-state.ts
git commit -m "docs(learning): getCurrentState 내부 번호 주석을 early-return 순서와 정합

기존 주석은 state 정의 순서 기준이라 실제 우선순위와 불일치했다.
docstring의 8단계 우선순위 표와 1:1 매칭되도록 1~8로 재번호.
로직 변경 없음 — 주석 및 한 곳의 참조 번호(\"4번 조건\" → \"7번 조건\") 수정."
```

---

## Task 5: 수동 QA (스펙 §7.1 체크리스트)

앱 레벨 단위 테스트 인프라가 없으므로 수동 QA가 유일한 기능 검증 수단이다. 2단계 플랜이 머지된 시뮬레이터 상태에서 수행한다.

**Files:**
- Modify: none (검증만)

### Task 5.A — stale 판정 회귀 (기능 보존 확인)

- [ ] **Step 1: diagnostic_analysis_pending 정상 진입**

1. 시뮬레이터에서 10문제 퀴즈 완료 (오답 2개 이상).
2. 약점 분석 1개 완료.
3. 뒤로가기 → "나갈게요" → 허브 이동.
4. 허브에서 아래 확인:
   - 말풍선: "퀴즈는 끝! 약점 분석만 남았어요"
   - CTA 라벨: "약점 분석 이어서 하기"
   - `analysis` 노드 active
5. CTA 탭 → 진단 화면 재진입 → 남은 약점 분석 완료 → 결과 화면 이동.

**Pass 기준:** 모든 화면이 스펙 §7.2 상태 결정 표의 `diagnostic_analysis_pending` 행과 일치.

- [ ] **Step 2: 분석 완료 후 state 전이**

Step 1 이후 허브로 돌아와 아래 확인:
- 말풍선: "약점 찾기 끝! 결과 볼까요?"
- CTA 라벨: "약점 결과 보기"
- 상태: `result_pending` (시각은 여전히 `analysis` 노드 active, 말풍선/CTA로만 구분)

**Pass 기준:** `diagnostic_analysis_pending` → `result_pending` 자동 전이. 문구가 바뀌지만 노드 active 위치는 유지.

### Task 5.B — 8개 state 전수 확인

- [ ] **Step 3: 각 state 진입 후 허브 화면이 스펙 §7.2 표와 일치하는지 대조**

| state | 조작 방법 (요약) |
|---|---|
| `journey_not_started` | 신규 계정으로 허브 첫 진입 |
| `diagnostic_in_progress` | 10문제 도중 이탈 (약점 분석 단계 진입 전) |
| `diagnostic_analysis_pending` | Task 5.A Step 1과 동일 |
| `result_pending` | Task 5.A Step 2와 동일 |
| `viewed_pre_practice` | 결과 화면 본 직후 허브 복귀 |
| `practice_in_progress` | 약점 연습 도중 이탈 후 허브 복귀 |
| `journey_complete_pending` | 연습 완료 후 허브 복귀 |
| `journey_graduated` | 졸업 CTA 탭 후 (여정보드 숨김 확인) |

**Pass 기준:** 각 state에서 말풍선/CTA 라벨/노드 active 위치가 스펙 §7.2 표와 일치.

### Task 5.C — 우선순위 회귀

- [ ] **Step 4: 졸업 사용자 + stale resume 동시 존재**

(Firebase 에뮬레이터 또는 디버그 콘솔에서 프로파일 수동 조작) 졸업 상태 프로파일에 stale `pendingDiagnosisResume` 레코드를 인위로 남긴 뒤 허브 진입.

**Pass 기준:** 여정보드 자체가 숨겨짐 (1번 분기 우선 판정).

- [ ] **Step 5: `pendingDiagnosticStartedAt`과 `pendingDiagnosisResume` 동시 fresh**

(수동 조작) 두 필드가 모두 fresh 조건을 만족하도록 프로파일 조작 후 허브 진입.

**Pass 기준:** `diagnostic_analysis_pending`이 판정됨 (2번이 3번보다 우선).

- [ ] **Step 6: QA 결과 기록**

Task 5.A~5.C 중 실패한 항목이 있다면 Task 3/4로 되돌아가 수정. 모두 Pass하면 다음 태스크로.

---

## Task 6: 원격 동기화 및 후속 조치

- [ ] **Step 1: 최종 상태 확인**

```bash
git log --oneline -5
git status
```

**기대 결과:** Task 2/3/4 커밋 3개가 최상단에 차례로 있고, working tree는 clean.

- [ ] **Step 2: 원격에 푸시**

```bash
git push origin main
```

(본 저장소는 `pre-commit` 미사용. CLAUDE.md §8 절차 준수 — 푸시 후 log:commit 실행.)

- [ ] **Step 3: log:commit 실행**

```bash
npm run log:commit
```

- [ ] **Step 4: Notion "DASIDA 개발 기록" 페이지 업데이트**

CLAUDE.md §8 Notion 워크플로우에 따라:
1. 본 플랜에 대응하는 Notion 페이지("여정보드 상태 관리 정돈") 상태를 `구현완료`로 변경.
2. 구현완료일 = 오늘 날짜.
3. Spec/Plan 필드를 GitHub permalink(커밋 해시 포함 URL)로 업데이트.
4. 본문 `## 완료 메모`에 특이사항 기록(없으면 생략).

**특히 포함할 메모:** "§8 후속 스펙(`unit-test-infra`) 예약됨 — Notion에 별도 기획중 페이지로 등록 완료되었는지 확인."

- [ ] **Step 5: 후속 스펙 예약 — Notion 초안 페이지 생성**

스펙 §8에 예약된 **단위 테스트 인프라 후속 스펙**에 대한 초안 페이지를 Notion "DASIDA 개발 기록"에 **기획중** 상태로 생성한다. 착수 트리거가 올 때 쉽게 찾기 위함.

- 제목: "앱 레벨 단위 테스트 인프라 도입" (또는 유사)
- 상태: `기획중`
- 카테고리: 인프라 / 테스트
- 본문: 스펙 §8.2~§8.4 복사 (범위 초안, 착수 트리거 4개, 회귀 근거 누적 로그 — 빈 섹션 포함)

- [ ] **Step 6: 완료 알림**

```bash
npm run notify:done -- "여정보드 상태 관리 정돈 — 시간+attemptId stale 판정 통일 + 규약 docstring + 번호 주석 정렬 완료. 단위 테스트 인프라는 후속 스펙으로 예약됨."
```

---

## 셀프 리뷰

### 스펙 커버리지

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| §4.1 `hasValidPendingResume` 시간 + attemptId 재작성 | Task 3 |
| §4.2 파일 상단 규약 docstring | Task 2 |
| §4.3 `getCurrentState` 번호 주석 재정렬 | Task 4 |
| §5.2 선행 조건 확인 | Task 1 |
| §6 엣지 케이스 (cross-device race / same-attempt race) | Task 3 코드 구현으로 커버 |
| §7.1 수동 QA 체크리스트 | Task 5 (A/B/C 3단계) |
| §7.2 상태 결정 표 | Task 5.B Step 3에서 대조 검증 |
| §8 후속 스펙 예약 — Notion 초안 생성 | Task 6 Step 5 |
| CLAUDE.md §8 종료 절차 (push, log:commit, Notion, notify) | Task 6 Steps 2/3/4/6 |

### 의도적 제외 사항

| 제외 | 이유 |
|---|---|
| 단위 테스트 작성 | 앱 레벨 테스트 인프라 부재. 후속 스펙(§8)으로 분리. |
| `isPendingDiagnosticFresh` / `isPendingPracticeFresh` 재작성 | 참조 데이터(string 타임스탬프)에 attemptId 없어 보조 가드 불가. 원형 유지. |
| 노드 시각 스타일 변경 | 스펙 §2 비목표에 명시. UX 구분 필요 시 별도 스펙. |
| `ResumeDiagnosisCard` 또는 `RESUME_DIAGNOSIS` 액션 건드리기 | 선행 스펙이 완료한 부분. 본 플랜은 `home-journey-state.ts`만 본다. |

### 타입 일관성 확인

- `PendingDiagnosisResumeState.savedAt: string` — Phase 1 플랜 Task 1에서 정의됨(Task 1 Step 3 선행 조건 확인으로 가드).
- `LearnerSummaryCurrent.latestDiagnosticSummary?.completedAt: string | undefined` — 기존 타입 유지, 변경 없음.
- `LearnerSummaryCurrent.latestDiagnosticSummary?.attemptId: string | undefined` — Phase 1에서 사용 중인 타입 그대로.
- Task 3 변경 후 `Date.parse`가 받는 값은 모두 `string | undefined`를 안전하게 처리(`if (latestCompletedAtRaw)` 가드 + `Number.isNaN` 가드).
