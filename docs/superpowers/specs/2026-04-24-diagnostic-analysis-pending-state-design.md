# 약점 분석 이어서 하기 — 여정보드 상태 일관화 설계

- **작성일**: 2026-04-24
- **작성자**: 박기윤 + Claude
- **상태**: 기획중
- **관련 기능**: 약점 진단 이어서 하기 (Quiz Diagnosis Resume)
- **선행 스펙**: [2026-04-23-diagnosis-resume-on-exit-design.md](2026-04-23-diagnosis-resume-on-exit-design.md)

## 1. 배경

약점 분석 도중 이탈 후 허브로 복귀했을 때, 여정보드의 시각 요소가 사용자 상태를 **일관되게 반영하지 못하는 문제**가 있다.

현재 동작을 요약하면:

1. 사용자가 약점 분석 도중 "나갈게요" 클릭 → `pendingDiagnosisResume` 저장 + 허브 이동.
2. 허브(여정보드) 렌더링 시:
   - CTA 버튼 라벨만 **"약점 분석 이어서 하기"** 로 오버라이드됨.
   - 말풍선 문구는 여전히 **"풀던 진단 이어할까요?"** (= `diagnostic_in_progress` 상태 copy).
   - 여정보드 노드 상태(`diagnostic` = active, `analysis` = upcoming)도 그대로.

즉 시각적으로 "10문제 퀴즈 도중 이탈"과 "약점 분석 도중 이탈"이 **구분되지 않는다**. 사용자는 버튼 라벨을 읽기 전까지 "10문제를 다시 풀어야 하나?"라는 불안을 겪는다. 이는 이 기능을 만든 근본 목적(= 10문제 재수행 방지) 자체를 체감하지 못하게 한다.

### 왜 이렇게 되었는가

코드를 추적하면 두 컴포넌트가 서로 다른 정보 소스를 본다.

- **`features/learning/home-journey-state.ts`의 `resolveJourneyStateKey`** — `profile.pendingDiagnosticStartedAt`만 참조. `pendingDiagnosisResume`을 인지하지 못함.
- **`features/quiz/hooks/use-quiz-hub-screen.ts`** — `pendingDiagnosisResume`을 보고 `journey.ctaLabel`만 사후 덧씌움.

결과적으로 여정 상태 계산(1차 소스)은 "평소 `diagnostic_in_progress`"를 뱉고, 허브 훅은 그 위에 버튼 라벨만 패치하는 구조가 되었다. 말풍선, 노드, CTA 본문은 1차 소스가 그대로 통과시킨다.

### 이 제약이 원래 합리적이었던 맥락

선행 스펙 §3.2는 "여정보드 노드 상태는 변경하지 않는다"고 명시했다. 당시엔 별도의 `ResumeDiagnosisCard`가 "이어서 하기" UX를 전담하는 설계였기 때문에, 여정보드 자체는 건드리지 않아도 사용자는 카드를 통해 이어서 할 수 있었다.

이후 [2026-04-24-diagnosis-resume-hub-cta-override.md](../plans/2026-04-24-diagnosis-resume-hub-cta-override.md) 플랜에서 카드를 제거하고 CTA 버튼으로 이어서 UX를 흡수했지만, "여정 상태 계산 로직은 건드리지 않는다"는 카드 시절 제약이 그대로 계승되었다. 본 스펙은 이 미검토된 제약을 설계 변경에 맞춰 갱신한다.

## 2. 목표와 비목표

### 목표

- 약점 분석 이어서 하기 상태일 때 여정보드의 **말풍선, CTA 라벨, CTA 본문, 노드 포인터**가 일관된 하나의 상태를 표현하도록 한다.
- "이 기능이 존재한다"를 코드상에 명시적 상태로 문서화한다 (디버깅, 로깅, 분석 시 구분 가능).
- `use-quiz-hub-screen.ts`의 사후 오버라이드 중복을 제거하고, 진실 소스를 `home-journey-state.ts` 한 곳으로 모은다.

### 비목표

- 진단 이탈 시 저장/복원 로직 자체의 변경은 없다 (선행 스펙 구현 그대로).
- 여정 노드 컴포넌트(`journey-step-node.tsx`) 자체의 시각 스타일 변경은 없다. `getStepStatus`에서 반환하는 상태 값(`completed`/`active`/`upcoming`)이 바뀌면 기존 노드가 자동으로 다르게 그려진다.
- 10문제 퀴즈 도중 이탈(약점 분석 단계에 진입하지 않은 상태)의 처리는 그대로 `diagnostic_in_progress` 상태를 유지한다.

## 3. 사용자 흐름

### 3.1 약점 분석 도중 이탈 후 허브 복귀

1. 사용자가 약점 분석 도중 "나갈게요" 클릭 → `pendingDiagnosisResume` 저장 + `/(tabs)/quiz` 이동 (기존 동작).
2. 허브 진입 시 `resolveJourneyStateKey`가 `pendingDiagnosisResume` 유효성을 확인.
3. 유효하면 `currentStateKey = 'diagnostic_analysis_pending'` 반환.
4. 여정보드가 새 상태 기반으로 렌더링:
   - 말풍선: **"퀴즈는 끝! 약점 분석만 남았어요"**
   - CTA 라벨: **"약점 분석 이어서 하기"**
   - CTA 본문: **"퀴즈는 건너뛰고 분석만 마무리합니다"**
   - 노드: `diagnostic` = `completed`, `analysis` = `active` (포인터 이동)
5. CTA 누르면 `onPressJourneyCta` → `resume_diagnosis` 액션 → `onResumeDiagnosis()` → 진단 화면 재진입 (기존 로직 그대로).

### 3.2 10문제 퀴즈 도중 이탈 후 허브 복귀 (변경 없음)

- `pendingDiagnosisResume`이 없고 `pendingDiagnosticStartedAt`만 있는 상태.
- 기존처럼 `diagnostic_in_progress` 상태로 렌더링.
- 말풍선: "풀던 진단 이어할까요?" / CTA: "진단 다시 시작하기" / 노드: `diagnostic = active`.

### 3.3 "처음부터 다시 풀기" 선택 시 (변경 없음)

- 진단 화면 내부에서만 제공 (기존 그대로).
- `clearPendingDiagnosisResume` + `resetSession` + `/quiz/diagnostic?autostart=1&reset=1` 진입.

## 4. 데이터 모델

### 4.1 `JourneyStateKey` 타입 확장

`features/learning/home-journey-state.ts`

```ts
type JourneyStateKey =
  | 'journey_not_started'
  | 'diagnostic_in_progress'
  | 'diagnostic_analysis_pending'  // NEW
  | 'result_pending'
  | 'viewed_pre_practice'
  | 'practice_in_progress'
  | 'journey_complete_pending'
  | 'journey_graduated';
```

### 4.2 `JourneyCtaAction` 타입 확장

```ts
type JourneyCtaAction =
  | 'none'
  | 'start_diagnostic'
  | 'resume_diagnosis'       // NEW
  | 'open_result'
  | 'open_review'
  | 'graduate_practice';
```

### 4.3 `stateCopyTable` 새 항목

```ts
diagnostic_analysis_pending: {
  bubbleText: '퀴즈는 끝! 약점 분석만 남았어요',
  ctaAction: 'resume_diagnosis',
  ctaLabel: '약점 분석 이어서 하기',
  ctaBody: '퀴즈는 건너뛰고 분석만 마무리합니다',
},
```

### 4.4 `journeyStateToStep` 매핑

```ts
const journeyStateToStep: Record<JourneyStateKey, JourneyStepKey> = {
  journey_not_started: 'diagnostic',
  diagnostic_in_progress: 'diagnostic',
  diagnostic_analysis_pending: 'analysis',  // NEW — 포인터 analysis로 이동
  result_pending: 'analysis',
  // ... 이하 동일
};
```

### 4.5 `resolveJourneyStateKey` 분기 추가

`pendingDiagnosisResume` 유효성 검증은 현재 `use-quiz-hub-screen.ts`의 `hasPendingResume` 계산과 동일한 조건으로 수행:

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

`resolveJourneyStateKey` 내부 순서:

1. `journey_graduated` 체크 (최상위 우선순위 유지).
2. **NEW**: `hasValidPendingResume` → `'diagnostic_analysis_pending'` 반환.
3. 이후 기존 로직 (diagnostic / result / practice / graduated pending 등).

우선순위를 `graduated` 다음에 두는 이유: 이미 여정을 졸업한 사용자에게는 stale `pendingDiagnosisResume`이 있어도 일반 허브를 보여주는 게 맞다.

## 5. 구현 범위

### 5.1 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `features/learning/home-journey-state.ts` | 타입/copy/매핑 확장, `hasValidPendingResume` 헬퍼, `resolveJourneyStateKey` 분기 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | `hasPendingResume` 로컬 계산 제거, `ctaLabel` 사후 오버라이드 제거, `onPressJourneyCta` switch에 `resume_diagnosis` 케이스 추가 |

### 5.2 use-quiz-hub-screen.ts 변경 상세

**제거**:
```ts
// 제거됨
const pendingResume = profile?.pendingDiagnosisResume;
const hasPendingResume = Boolean(/* ... */);

const onPressJourneyCta = () => {
  if (hasPendingResume) {       // 제거
    onResumeDiagnosis();
    return;
  }
  // ...
};

const journey =
  hasPendingResume && rawJourney
    ? { ...rawJourney, ctaLabel: '약점 분석 이어서 하기' }   // 제거
    : rawJourney;
```

**추가** — `onPressJourneyCta` switch 내부:
```ts
case 'resume_diagnosis':
  onResumeDiagnosis();
  return;
```

**유지** — `onResumeDiagnosis` 함수 자체 (여전히 필요, 이제 `ctaAction === 'resume_diagnosis'` 경로로만 호출됨).

**검토 필요** — 외부에서 `onResumeDiagnosis`를 직접 호출하는 경로가 있다면 유지, 없다면 훅 반환값에서도 제거 가능.

## 6. 엣지 케이스

### 6.1 `pendingDiagnosisResume`가 stale하지만 `pendingDiagnosticStartedAt`은 fresh
- 예: 이전 attempt가 이미 완료됐는데 `pendingDiagnosisResume` 레코드만 남아있는 경우.
- `hasValidPendingResume`에서 `summary.latestDiagnosticSummary?.attemptId === pending.attemptId` 체크가 걸러냄 → `diagnostic_analysis_pending`으로 가지 않음.
- 이 경우 기존 `pendingDiagnosticStartedAt` 로직으로 흘러 `diagnostic_in_progress` 또는 다른 상태로 정상 분류.

### 6.2 `pendingDiagnosisResume` 유효한데 `pendingDiagnosticStartedAt`은 stale
- 실제로는 잘 생기지 않는 조합이지만 방어적 처리 관점에서 확인.
- `diagnostic_analysis_pending`이 먼저 판정되므로 영향 없음.

### 6.3 `schemaVersion` 불일치
- `hasValidPendingResume`에서 걸러짐 → 기존 상태로 폴백.
- 자동 clear는 선행 스펙 §5.1 대로 향후 과제.

### 6.4 졸업 후 stale `pendingDiagnosisResume`
- 우선순위 상 `journey_graduated`가 먼저 판정됨 → 여정보드 자체가 숨겨져 있으므로 영향 없음.

### 6.5 복원 진입 직후 `pendingDiagnosticStartedAt`만 유지, resume 데이터 clear 타이밍
- 기존 흐름대로 `finalizeQuiz` 직후 `pendingDiagnosisResume` clear.
- clear 이후엔 `hasValidPendingResume` = false → 상태 자연 전이.

## 7. 테스트 관점

### 단위
- `resolveJourneyStateKey` 반환값 테스트:
  - 유효한 `pendingDiagnosisResume` + 완료되지 않은 진단 → `'diagnostic_analysis_pending'`.
  - `diagnosisQueue.length === 0` → 기존 분기로 폴백.
  - `latestDiagnosticSummary.attemptId`와 동일 → 기존 분기로 폴백.
  - 졸업 상태 + resume 존재 → `'journey_graduated'` 우선.
- `journeyStateToStep['diagnostic_analysis_pending'] === 'analysis'` 확인.

### 통합 (manual QA)
- 10문제 풀고 약점 분석 0개 완료 → 이탈 → 허브 진입 → **말풍선 "퀴즈는 끝!..."**, **CTA "약점 분석 이어서 하기"**, **`analysis` 노드 active** 확인.
- 10문제 풀고 약점 분석 1개 완료 → 이탈 → 동일하게 `diagnostic_analysis_pending` 상태 확인.
- 진단 화면 재진입 → 완료 후 허브 복귀 → `diagnostic_analysis_pending` 자동 해제 확인.
- 10문제 퀴즈 도중 이탈 (분석 단계 진입 전) → `diagnostic_in_progress` 상태 유지 확인 (회귀 없음).
- 졸업 사용자의 경우 여정보드 자체가 숨겨짐 (회귀 없음).

### 회귀 확인
- `ctaAction === 'start_diagnostic'` / `'open_result'` / `'open_review'` / `'graduate_practice'` 경로 동작.
- `pendingDiagnosticStartedAt` 기반 기존 상태 전이 로직.

## 8. 결정된 사항

- `onResumeDiagnosis`는 **제거** — 외부 호출자 없음 확인. `UseQuizHubScreenResult` 타입과 `return {}` 에서 삭제, 훅 내부 함수로만 유지.
- `diagnostic_analysis_pending` 상태에서 `currentStepBody` / `getStepDetail` / `getStepStatusLabel`이 적절한 문구를 반환하는지 구현 시 검토 필요 (기존 `analysis` 단계 문구가 상황에 맞는지).
