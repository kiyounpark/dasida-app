# Phase 2 — 학습 여정 중단 상태 감지 설계

**날짜**: 2026-04-21  
**상태**: 기획중  
**관련 화면**: `QuizHubScreen`, `JourneyBoard`, `use-diagnostic-screen`, `use-practice-screen`

---

## 1. 배경 및 목적

7-state 여정 모델에서 Phase 1은 state 1·3·4·6·7을 구현했다. Phase 2는 나머지 두 state를 완성한다.

| state | 키 | 의미 |
|-------|----|------|
| 2 | `diagnostic_in_progress` | 진단 도중 앱을 나간 상태 |
| 5 | `practice_in_progress` | 약점 연습 도중 앱을 나간 상태 |

**목표**: 유저가 진단/연습을 중단하고 홈으로 돌아왔을 때 올바른 여정 상태를 표시한다. 7-state 모델 완성도가 목적이며, 실제 세션 재개(이어서 풀기)는 이번 스코프가 아니다. CTA는 솔직하게 "다시 시작하기"로 표시한다.

---

## 2. 설계 결정 및 이유

### 채택한 접근: 플래그 기반 상태 감지 (Approach A)

세 접근법을 검토했다:

- **A) LearnerProfile에 timestamp 플래그** ← 채택
- **B) AsyncStorage 로컬 플래그** ← 탈락 (기기 바뀌면 사라짐, 유저가 태블릿+폰 사용)
- **C) QuizSessionState 전체 Firestore 저장 (세션 재개)** ← 탈락 (오버엔지니어링)

Approach C 탈락 이유: 실제 유저 불만 없음, 진단은 3분짜리, 크로스 디바이스 충돌 처리/stale state 버전 호환 비용이 구현 목적 대비 과도함. 실제 유저 피드백이 쌓이면 그때 Phase 3으로 진행.

---

## 3. 데이터 모델 변경

### `features/learner/types.ts`

`LearnerProfile`에 필드 2개 추가:

```typescript
export type LearnerProfile = {
  // ...기존 필드...
  pendingDiagnosticStartedAt?: string; // ISO 타임스탬프. 진단 진입 시 set, 완료 시 clear.
  pendingPracticeStartedAt?: string;   // ISO 타임스탬프. weakness 연습 진입 시 set, 완료 시 clear.
};
```

`boolean` 대신 ISO 타임스탬프를 쓰는 이유: stale 판정(완료 시각과 비교) + 추후 분석 활용.

---

## 4. 상태 감지 로직

### `features/learning/home-journey-state.ts` — `getCurrentState()` 변경

**기존 우선순위:**
```
graduated(7) → not_started(1) → journey_complete_pending(6) → viewed_pre_practice(4) → result_pending(3)
```

**Phase 2 추가 후:**
```
graduated(7)
  → diagnostic_in_progress(2)   [NEW]
    → not_started(1)
      → journey_complete_pending(6)
        → practice_in_progress(5)   [NEW]
          → viewed_pre_practice(4)
            → result_pending(3)
```

### Stale 판정 헬퍼

```typescript
function isPendingDiagnosticFresh(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingDiagnosticStartedAt;
  if (!pending) return false;

  const latestCompleted = summary.latestDiagnosticSummary?.completedAt;
  if (!latestCompleted) return true; // 아직 완료된 진단 없음 → 유효

  // pending이 completedAt보다 이후면 새 진단 시작 중 → 유효
  return Date.parse(pending) > Date.parse(latestCompleted);
}

function isPendingPracticeFresh(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingPracticeStartedAt;
  if (!pending) return false;

  const latestDiagnosticCompleted = summary.latestDiagnosticSummary?.completedAt;
  if (!latestDiagnosticCompleted) return false; // 진단 없으면 연습도 stale

  // 최신 진단 완료 이후 시작된 연습이어야 유효
  return Date.parse(pending) > Date.parse(latestDiagnosticCompleted);
}
```

**stale 예시:**
- 진단 완료 과정에서 `clearPendingDiagnostic` 실패 → `pendingStartedAt < completedAt` → stale 판정 → state 2 건너뜀 → 정상 흐름으로 복귀
- 연습 완료 후 새 진단 시작 → `latestDiagnosticResultViewedAt` 리셋 → state 5 조건 자연히 해소
- review 활동 기록 → state 6이 state 5보다 우선 → 자동 해소

---

## 5. Flag Set/Clear 위치

### `pendingDiagnosticStartedAt`

| 이벤트 | 파일 | 동작 |
|--------|------|------|
| SET | `features/quiz/hooks/use-diagnostic-screen.ts` | `hasStarted` true 진입 시 `markPendingDiagnosticStarted()` — 항상 현재 타임스탬프로 덮어씀 |
| CLEAR | `features/quiz/hooks/use-diagnostic-screen.ts` | `finishDiagnosis` 완료 콜백에서 `clearPendingDiagnostic()` |

### `pendingPracticeStartedAt`

| 이벤트 | 파일 | 동작 |
|--------|------|------|
| SET | `features/quiz/hooks/use-practice-screen.ts` | `practiceMode === 'weakness'` + `hasStarted` 진입 시 SET — 항상 현재 타임스탬프로 덮어씀. review/challenge 모드는 건드리지 않음 |
| CLEAR | `features/quiz/hooks/use-practice-screen.ts` | `practiceCompleted` true 전환 시 `clearPendingPractice()` |

### 크로스 디바이스 동작

- 태블릿 진단 시작 → `pendingDiagnosticStartedAt = T1` Firestore 저장
- 폰 열기 → LearnerProfile 로드 → state 2 감지 → "진단 다시 시작하기" CTA 표시
- 폰에서 진단 완료 → flag clear + `latestDiagnosticSummary` 업데이트
- 태블릿 새로고침 → flag 없음 → state 3/4 정상 표시

---

## 6. 신규 Repository 메서드

`features/learner/current-learner-controller.ts`에 4개 메서드 추가 (`graduateToPractice` 패턴 동일):

```typescript
markPendingDiagnosticStarted(): Promise<CurrentLearnerSnapshot>
clearPendingDiagnostic(): Promise<CurrentLearnerSnapshot>
markPendingPracticeStarted(): Promise<CurrentLearnerSnapshot>
clearPendingPractice(): Promise<CurrentLearnerSnapshot>
```

`features/learner/provider.tsx`에서 context expose.

---

## 7. CTA 카피 업데이트

`features/learning/home-journey-state.ts` — `stateCopyTable` 기존 placeholder 교체:

```typescript
diagnostic_in_progress: {
  bubbleText: '풀던 진단이 있어요. 다시 시작할까요?',
  ctaAction: 'start_diagnostic',  // 기존 액션 재사용
  ctaLabel: '진단 다시 시작하기',
  ctaBody: '처음부터 다시 풀면 최신 약점을 잡을 수 있어요',
},
practice_in_progress: {
  bubbleText: '풀던 약점 연습이 있어요. 다시 시작할까요?',
  ctaAction: 'open_review',       // 기존 액션 재사용
  ctaLabel: '연습 다시 시작하기',
  ctaBody: '약점 연습을 마치면 여정이 완성됩니다',
},
```

**Journey Board 스텝 상태**: 기존 `stateToStepKey` 매핑이 이미 두 state를 커버(state 2 → `diagnostic` active, state 5 → `review` active). 추가 변경 없음.

**비고**: `getCurrentStepBody`는 state 2/5 모두 기존 `currentStepKey` 기반 메시지를 공유. 렌더링 후 어색하면 `profile.pendingDiagnosticStartedAt` 분기 추가 고려 (Optional).

---

## 8. 변경 파일 요약

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `features/learner/types.ts` | 수정 | `LearnerProfile`에 필드 2개 추가 |
| `features/learner/current-learner-controller.ts` | 수정 | 4개 메서드 추가 |
| `features/learner/provider.tsx` | 수정 | 4개 함수 context expose |
| `features/learning/home-journey-state.ts` | 수정 | `getCurrentState()` 분기 + stale 헬퍼 + copy table |
| `features/quiz/hooks/use-diagnostic-screen.ts` | 수정 | SET/CLEAR 호출 추가 |
| `features/quiz/hooks/use-practice-screen.ts` | 수정 | SET/CLEAR 호출 추가 (weakness만) |

---

## 9. 테스트 전략

### 단위 테스트 (`home-journey-state.test.ts` 확장)

**state 2 감지:**
- `pendingDiagnosticStartedAt` 있고 `latestDiagnosticSummary` 없음 → state 2
- `pendingDiagnosticStartedAt > completedAt` → state 2
- `pendingDiagnosticStartedAt < completedAt` → stale, state 3으로 fallback
- `practiceGraduatedAt` 있으면 state 2보다 7이 우선

**state 5 감지:**
- viewed_pre_practice 조건 + `pendingPracticeStartedAt > latestDiagnosticCompletedAt` → state 5
- `pendingPracticeStartedAt < latestDiagnosticCompletedAt` → stale, state 4로 fallback
- review 활동 있으면 state 6이 우선

**우선순위 순서 검증:**
`graduated(7) > state 2 > not_started(1) > journey_complete_pending(6) > state 5 > viewed_pre_practice(4) > result_pending(3)`

### 훅 통합 테스트

- `use-diagnostic-screen`: `hasStarted` 시 `markPendingDiagnosticStarted` 호출 / `finishDiagnosis` 시 `clearPendingDiagnostic` 호출
- `use-practice-screen` (weakness): 동일 패턴
- `use-practice-screen` (review, challenge): flag 건드리지 않음 (회귀 방지)

### 수동 QA (크로스 디바이스)

1. 태블릿 진단 시작 → 앱 종료 → 폰 열기 → state 2 표시 확인
2. 폰에서 진단 완료 → 태블릿 새로고침 → state 3/4 전환 확인
3. 약점 연습 동일 시나리오
4. stale 시나리오: 진단 완료 후 flag 수동 잔존 시뮬레이션 → state 2 건너뜀 확인

---

## 10. 스코프 밖 (Phase 3 후보)

- **실제 세션 재개** (Approach C): 진단 4번 문제부터 이어서 풀기. 유저 피드백 이후 재검토.
- `pendingExamStartedAt`: 모의고사 in-progress state. 현재 여정 스코프 밖.
