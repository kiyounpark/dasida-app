# diagnostic_analysis_pending 여정 상태 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 분석 이어서 하기 상태일 때 여정보드의 말풍선·CTA·노드가 일관된 `diagnostic_analysis_pending` 상태를 표현하도록 한다.

**Architecture:** `home-journey-state.ts`에 새 상태 키를 추가하고 `getCurrentState`가 `pendingDiagnosisResume`을 판별하도록 한다. `use-quiz-hub-screen.ts`의 사후 ctaLabel 오버라이드와 hasPendingResume 중복 계산을 제거해 진실 소스를 하나로 모은다.

**Tech Stack:** TypeScript, React Native (Expo), expo-router

---

## 파일 맵

| 파일 | 역할 | 변경 유형 |
|---|---|---|
| `features/learning/home-journey-state.ts` | 여정 상태 계산 및 copy 테이블 | Modify |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | 허브 화면 훅 — 중복 오버라이드 제거 | Modify |

---

## Task 1: home-journey-state.ts — 타입·테이블·로직 확장

**Files:**
- Modify: `features/learning/home-journey-state.ts`

### Step 1.1: `JourneyStateKey`에 신규 키 추가

- [ ] `features/learning/home-journey-state.ts` 10–18라인 `JourneyStateKey` 타입을 아래로 교체:

```ts
export type JourneyStateKey =
  | 'journey_not_started'
  | 'diagnostic_in_progress'
  | 'diagnostic_analysis_pending'
  | 'result_pending'
  | 'viewed_pre_practice'
  | 'practice_in_progress'
  | 'journey_complete_pending'
  | 'journey_graduated';
```

### Step 1.2: `JourneyCtaAction`에 `resume_diagnosis` 추가

- [ ] 19–25라인 `JourneyCtaAction` 타입을 아래로 교체:

```ts
export type JourneyCtaAction =
  | 'start_diagnostic'
  | 'resume_diagnosis'
  | 'open_result'
  | 'open_review'
  | 'graduate_practice'
  | 'none';
```

### Step 1.3: `stateToStepKey` 매핑에 새 키 추가

- [ ] 59–68라인 `stateToStepKey` 객체를 아래로 교체:

```ts
const stateToStepKey: Record<JourneyStateKey, JourneyStepKey> = {
  journey_not_started: 'diagnostic',
  diagnostic_in_progress: 'diagnostic',
  diagnostic_analysis_pending: 'analysis',
  result_pending: 'analysis',
  viewed_pre_practice: 'review',
  practice_in_progress: 'review',
  journey_complete_pending: 'exam',
  journey_graduated: 'exam',
};
```

### Step 1.4: `stateCopyTable`에 새 항목 추가

- [ ] `stateCopyTable` 내 `diagnostic_in_progress` 항목 바로 다음에 추가:

```ts
  diagnostic_analysis_pending: {
    bubbleText: '퀴즈는 끝! 약점 분석만 남았어요',
    ctaAction: 'resume_diagnosis',
    ctaLabel: '약점 분석 이어서 하기',
    ctaBody: '퀴즈는 건너뛰고 분석만 마무리합니다',
  },
```

완성된 `stateCopyTable` 순서:
```ts
const stateCopyTable: Record<JourneyStateKey, StateCopy> = {
  journey_not_started: { ... },
  diagnostic_in_progress: { ... },
  diagnostic_analysis_pending: {   // ← 신규
    bubbleText: '퀴즈는 끝! 약점 분석만 남았어요',
    ctaAction: 'resume_diagnosis',
    ctaLabel: '약점 분석 이어서 하기',
    ctaBody: '퀴즈는 건너뛰고 분석만 마무리합니다',
  },
  result_pending: { ... },
  // ... 이하 동일
};
```

### Step 1.5: `hasValidPendingResume` 헬퍼 함수 추가

- [ ] `isPendingDiagnosticFresh` 함수(현재 122라인) **바로 앞에** 아래 함수를 삽입:

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

### Step 1.6: `getCurrentState`에 `diagnostic_analysis_pending` 분기 추가

- [ ] `getCurrentState` 함수 내부에서 `journey_graduated` 체크 바로 다음에 신규 분기 삽입:

현재 코드 (216라인~):
```ts
function getCurrentState(
  summary: LearnerSummaryCurrent,
  profile: LearnerProfile | null,
): JourneyStateKey {
  // 7: 졸업은 항상 최우선.
  if (profile?.practiceGraduatedAt) {
    return 'journey_graduated';
  }

  // 2: 진단 중단.
  if (isPendingDiagnosticFresh(profile, summary)) {
    return 'diagnostic_in_progress';
  }
  // ...
```

변경 후:
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

  // 2: 진단 중단.
  if (isPendingDiagnosticFresh(profile, summary)) {
    return 'diagnostic_in_progress';
  }
  // ...
```

### Step 1.7: 타입 체크

- [ ] 아래 명령 실행:

```bash
npx tsc --noEmit 2>&1 | head -40
```

기대 결과: 오류 없음. 오류가 있으면 `JourneyStateKey`나 `JourneyCtaAction`을 참조하는 `switch`/`Record` 누락 항목을 확인한다.

### Step 1.8: 커밋

- [ ] 커밋:

```bash
git add features/learning/home-journey-state.ts
git commit -m "feat(diagnosis): diagnostic_analysis_pending 여정 상태 추가"
```

---

## Task 2: use-quiz-hub-screen.ts — 중복 오버라이드 제거 및 resume_diagnosis 케이스 추가

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

### Step 2.1: `UseQuizHubScreenResult` 타입에서 `onResumeDiagnosis` 제거

- [ ] 29라인 `onResumeDiagnosis: () => void;` 줄을 삭제.

변경 전:
```ts
export type UseQuizHubScreenResult = {
  authNoticeMessage: string | null;
  homeState: CurrentLearnerSnapshot['homeState'];
  isCompactLayout: boolean;
  isReady: CurrentLearnerSnapshot['isReady'];
  journey: HomeJourneyState | null;
  onDismissAuthNotice: () => void;
  onOpenPractice: () => void;
  onOpenRecentResult: () => void;
  onPressExam: () => void;
  onPressJourneyCta: () => void;
  onPressReviewCard: () => void;
  onRediagnose: () => void;
  onRefresh: CurrentLearnerSnapshot['refresh'];
  onResumeDiagnosis: () => void;   // ← 삭제
  onStartDiagnostic: () => void;
  // ...
};
```

### Step 2.2: `hasPendingResume` 계산 블록 제거

- [ ] 142–149라인 아래 블록 전체 삭제:

```ts
// 삭제
const pendingResume = profile?.pendingDiagnosisResume;
const hasPendingResume = Boolean(
  pendingResume &&
    pendingResume.schemaVersion === 1 &&
    pendingResume.attemptId &&
    pendingResume.diagnosisQueue.length > 0 &&
    summary?.latestDiagnosticSummary?.attemptId !== pendingResume.attemptId,
);
```

### Step 2.3: `onPressJourneyCta`에서 `hasPendingResume` 분기 제거 + `resume_diagnosis` 케이스 추가

- [ ] `onPressJourneyCta` 함수를 아래로 교체:

변경 전:
```ts
const onPressJourneyCta = () => {
  if (hasPendingResume) {
    onResumeDiagnosis();
    return;
  }

  const action = homeState?.journey.ctaAction;

  if (!action || action === 'none') {
    return;
  }

  switch (action) {
    case 'open_result':
      onOpenRecentResult();
      return;
    case 'open_review':
      onOpenPractice();
      return;
    case 'graduate_practice':
      if (isGraduatingRef.current) return;
      isGraduatingRef.current = true;
      void graduateToPractice()
        .then(() => {
          isGraduatingRef.current = false;
          router.replace('/(tabs)/quiz');
        })
        .catch((err) => {
          isGraduatingRef.current = false;
          console.warn('[QuizHub] graduateToPractice failed', err);
        });
      return;
    case 'start_diagnostic':
    default:
      onStartDiagnostic();
  }
};
```

변경 후:
```ts
const onPressJourneyCta = () => {
  const action = homeState?.journey.ctaAction;

  if (!action || action === 'none') {
    return;
  }

  switch (action) {
    case 'resume_diagnosis':
      onResumeDiagnosis();
      return;
    case 'open_result':
      onOpenRecentResult();
      return;
    case 'open_review':
      onOpenPractice();
      return;
    case 'graduate_practice':
      if (isGraduatingRef.current) return;
      isGraduatingRef.current = true;
      void graduateToPractice()
        .then(() => {
          isGraduatingRef.current = false;
          router.replace('/(tabs)/quiz');
        })
        .catch((err) => {
          isGraduatingRef.current = false;
          console.warn('[QuizHub] graduateToPractice failed', err);
        });
      return;
    case 'start_diagnostic':
    default:
      onStartDiagnostic();
  }
};
```

### Step 2.4: `ctaLabel` 사후 오버라이드 제거

- [ ] 195–199라인 아래 블록을 단순 할당으로 교체:

변경 전:
```ts
const rawJourney = homeState?.journey ?? null;
const journey =
  hasPendingResume && rawJourney
    ? { ...rawJourney, ctaLabel: '약점 분석 이어서 하기' }
    : rawJourney;
```

변경 후:
```ts
const journey = homeState?.journey ?? null;
```

### Step 2.5: 반환값에서 `onResumeDiagnosis` 제거

- [ ] `return { ... }` 블록에서 `onResumeDiagnosis,` 줄 삭제 (현재 235라인).

`onResumeDiagnosis` 함수 정의 자체(151–153라인)는 **유지** — 이제 훅 내부에서만 사용되는 private 함수.

### Step 2.6: 타입 체크

- [ ] 아래 명령 실행:

```bash
npx tsc --noEmit 2>&1 | head -40
```

기대 결과: 오류 없음. `onResumeDiagnosis`를 외부에서 참조하는 코드가 있다면 이 단계에서 타입 오류로 잡힌다.

### Step 2.7: 커밋

- [ ] 커밋:

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "refactor(diagnosis): hasPendingResume 중복 제거 — 진실 소스 home-journey-state로 통합"
```

---

## Manual QA 체크리스트

구현 완료 후 시뮬레이터에서 직접 확인:

- [ ] **약점 분석 도중 이탈 후 허브 복귀**
  - 말풍선: **"퀴즈는 끝! 약점 분석만 남았어요"**
  - CTA 버튼 라벨: **"약점 분석 이어서 하기"**
  - CTA 본문: **"퀴즈는 건너뛰고 분석만 마무리합니다"**
  - `analysis` 노드가 **active** (이전 단계 `diagnostic` 노드는 completed)

- [ ] **CTA 누르면 진단 화면 재진입** — 완료된 약점은 잠기고 미완료는 새로 시작

- [ ] **10문제 퀴즈 도중 이탈 후 허브 복귀 (회귀)**
  - 말풍선: **"풀던 진단 이어할까요?"** (기존 그대로)
  - CTA 라벨: **"진단 다시 시작하기"** (기존 그대로)
  - `diagnostic` 노드 active (기존 그대로)

- [ ] **약점 분석 완료 후 허브 복귀**
  - `diagnostic_analysis_pending` 상태 해제 → `result_pending` 상태로 전이
  - CTA: "약점 결과 보기"

- [ ] **졸업 사용자 + stale `pendingDiagnosisResume` 남아있는 경우**
  - 여정보드 자체가 숨겨짐 (회귀 없음)
