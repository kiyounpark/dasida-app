# 약점 진단 중간 이탈 시 이어서 하기 설계

- **작성일**: 2026-04-23
- **작성자**: 박기윤 + Claude
- **상태**: 기획중
- **관련 기능**: 약점 진단 (Quiz Diagnosis)

## 1. 배경

현재 약점 진단 플로우는 다음과 같다.

1. 사용자가 10문제 퀴즈를 푼다.
2. 오답이 있으면 **약점 진단 단계**로 진입한다 (대화형 진단 UI).
3. 모든 오답에 대해 약점을 분석하면 결과 화면으로 이동한다.

**현재 문제**: 진단 도중 나가기를 누르면 `finishDiagnosis()` → `finalizeQuiz()`가 실행되어 빈 `topWeaknesses`로 결과가 확정되고 Firestore에 저장된다. 다시 진단하려면 **10문제 퀴즈부터 처음부터 다시** 풀어야 한다.

사용자 관점에서 10문제는 이미 풀었고 오답 정보도 있는데, 약점 분석만 미완료라는 이유로 퀴즈 전체를 재수행하게 만드는 것은 학습 이탈을 유발한다.

## 2. 목표와 비목표

### 목표

- 약점 진단 단계에서 이탈한 경우, **10문제 퀴즈는 건너뛰고 약점 분석만 이어서** 할 수 있게 한다.
- 이미 분석을 마친 약점은 재분석하지 않는다 (완료된 진단은 보존).
- 사용자가 명시적으로 "처음부터 다시" 를 선택할 수 있는 경로를 진단 화면 내부에서 유지한다 (허브에서는 제공하지 않음).

### 비목표

- 진단 중간의 **대화 내용 (chat entries, AI help 컴포저 상태)** 복원은 하지 않는다. 완료되지 않은 개별 진단은 재진입 시 초기 상태에서 다시 시작한다.
- 10문제 퀴즈 자체의 중간 이탈 복원은 이번 스펙 범위 밖이다.
- 여러 기기 간 실시간 동기화는 기존 learner profile 저장 매커니즘을 그대로 사용한다 (추가 설계 없음).

## 3. 사용자 흐름

### 3.1 진단 중간 이탈 (신규)

1. 사용자가 약점 진단 화면에서 뒤로가기를 누른다.
2. 기존 `DiagnosisExitConfirmModal`이 뜬다. 완료된 진단 개수에 따라 문구를 분기한다.
   - 공통 제목: **"잠시 멈추고 나갈까요?"**
   - 완료 1개 이상: **"이미 분석한 약점은 저장돼요. 퀴즈는 다시 풀지 않아도 돼요."**
   - 완료 0개: **"퀴즈는 다시 풀지 않아도 돼요. 약점 분석부터 이어서 할 수 있어요."**
   - 버튼: `계속할게요` / `나갈게요`
3. `나갈게요` 를 누르면:
   - `finishDiagnosis()`를 호출하지 않는다.
   - 현재까지의 `answers`, `weaknessScores`, `diagnosisQueue`, `attemptId`, `startedAt`을 `pendingDiagnosisResume` 으로 저장한다.
   - `pendingDiagnosticStartedAt` 플래그는 **clear 하지 않고 유지**한다 (기존 stale 판정이 `latestDiagnosticSummary.completedAt` 기준으로 동작하므로 충돌 없음, §4.1 참고).
   - `/(tabs)/quiz` 허브로 이동한다.
4. 빈 결과로 `finalizeQuiz`가 호출되지 않으므로, 결과 화면의 "추천 약점을 만들지 않았어요" 분기는 이 경로로는 도달하지 않는다 (다른 엣지 케이스용 폴백으로 유지).

### 3.2 허브에서 이어서 하기 진입 (신규)

`pendingDiagnosisResume`이 존재하면 **별도 카드를 띄우지 않고**, 기존 여정 CTA 버튼을 오버라이드한다.

1. 퀴즈 허브 진입 시 `hasPendingResume`(`pendingDiagnosisResume` 유효성 검증 결과)를 확인한다.
2. `hasPendingResume`이면 `use-quiz-hub-screen.ts`에서:
   - `journey.ctaLabel`을 **"약점 분석 이어서 하기"** 로 교체한 journey 객체를 반환한다.
   - `onPressJourneyCta`에서 `hasPendingResume`이면 `onResumeDiagnosis()`를 호출하고 리턴한다.
3. 여정보드 노드 상태는 변경하지 않는다 (`diagnostic` 노드가 `active` 상태로 유지).
4. "처음부터 다시 풀기" 버튼은 허브에서 제공하지 않는다 (진단 화면 내부에서만 제공).
5. CTA를 누르면:
   - 저장된 상태를 세션에 복원 (`RESUME_DIAGNOSIS` 액션 dispatch).
   - `isDiagnosing = true`, `result = undefined` 로 진단 화면에 재진입.
   - 완료된 진단: `answers[i].weaknessId` 가 존재하는 인덱스는 `use-diagnosis-workspaces` 가 `status: 'completed'` 로 초기 워크스페이스를 만들도록 한다. **현재 워크스페이스 초기화 로직이 `weaknessId` 를 반영하는지 구현 단계에서 검증 필요** (반영하지 않으면 별도 초기화 헬퍼 추가).
   - 미완료 `answerIndex` 는 초기 워크스페이스에서 새로 시작한다 (chat entries 복원 없음).

### 3.3 진단 완료 시

`submitDiagnosisWeakness` 후 진단 큐가 모두 완료되면:
- 기존 `checkPhaseTransition` → `finalizeQuiz` 흐름을 그대로 탄다.
- 추가로 `pendingDiagnosisResume` 을 `clear` 한다.

### 3.4 "처음부터 다시 풀기" 선택 시

- `pendingDiagnosisResume` 을 `clear` 한다.
- `resetSession()` → `/quiz/diagnostic?autostart=1` 진입.

## 4. 데이터 모델

### 4.1 LearnerProfile 확장

`features/learner/types.ts`

```ts
type PendingDiagnosisResumeState = {
  attemptId: string;
  startedAt: string; // ISO
  savedAt: string;   // ISO, 재진입 stale 판정용
  totalQuestions: number;
  answers: QuizAnswer[];         // weaknessId/diagnosisDetailTrace 포함
  weaknessScores: Record<WeaknessId, number>;
  diagnosisQueue: number[];      // answerIndex 배열
  schemaVersion: 1;
};

type LearnerProfile = {
  // ...existing...
  pendingDiagnosisResume?: PendingDiagnosisResumeState;
};
```

- `pendingDiagnosticStartedAt` 플래그는 유지한다 (기존 stale 판정 로직 변경 없음).
- `pendingDiagnosisResume` 은 진단이 **최소 1개 이상 완료**되었을 때 저장 의미가 있지만, 사용자 편의상 완료 0개여도 저장한다 (10문제 재풀이를 피함).

### 4.2 QuizSessionState 추가 액션

`features/quiz/types.ts`, `session.tsx`

```ts
type Action =
  | ...
  | { type: 'RESUME_DIAGNOSIS'; payload: PendingDiagnosisResumeState };
```

reducer:

```ts
case 'RESUME_DIAGNOSIS': {
  const { attemptId, startedAt, totalQuestions, answers, weaknessScores, diagnosisQueue } = action.payload;
  return {
    ...createInitialState(),
    hasStarted: true,
    totalQuestions,
    attemptId,
    startedAt,
    currentQuestionIndex: totalQuestions, // 퀴즈 단계는 끝난 상태
    answers,
    isDiagnosing: true,
    diagnosisQueue,
    weaknessScores,
  };
}
```

## 5. 구현 범위

### 5.1 저장 타이밍

다음 시점에 `pendingDiagnosisResume` 을 업데이트한다.

1. `onFinalConfirm` 에서 개별 약점 진단이 완료된 직후 (점진적 저장).
2. 사용자가 진단 화면에서 이탈을 확정한 시점 (`onExitDiagnosis` 재구성).

클리어 타이밍:
1. 모든 진단 완료 → `finalizeQuiz` 실행 직후.
2. 사용자가 "처음부터 다시 풀기" 선택 시.
3. `schemaVersion` 불일치 또는 만료 (선택, 향후).

### 5.2 주요 파일 변경 예상

- `features/learner/types.ts` — 타입 추가
- `features/learner/current-learner-controller.ts` — `setPendingDiagnosisResume`, `clearPendingDiagnosisResume` API
- `features/learner/provider.tsx` — 프로바이더 노출
- `features/quiz/session.tsx` — `RESUME_DIAGNOSIS` 액션
- `features/quiz/hooks/use-diagnostic-screen.ts` — 이탈 시 저장, 진입 시 복원
- `features/quiz/components/diagnosis-exit-confirm-modal.tsx` — 문구 변경
- `features/quiz/hooks/use-quiz-hub-screen.ts` — `hasPendingResume`일 때 `journey.ctaLabel` 오버라이드, `onPressJourneyCta` resume 분기 추가, `onRestartDiagnosis` 제거
- `features/quiz/components/quiz-hub-screen-view.tsx` — `ResumeDiagnosisCard` 컴포넌트 및 렌더링 코드 제거, 관련 props(`hasPendingResume`, `onResumeDiagnosis`, `onRestartDiagnosis`) 제거

## 6. 엣지 케이스

### 6.1 10문제 퀴즈 중간 이탈
- 약점 진단 단계 진입 전 이탈 → `pendingDiagnosisResume` 저장하지 않음 (기존 동작 유지).
- `isDiagnosing === false && !hasStarted === false` 상태에서 이탈은 영향 없음.

### 6.2 저장된 상태가 만료/손상된 경우
- `schemaVersion` 불일치 → 자동 clear 후 "진단 시작" 으로 폴백.
- 필수 필드 누락 → 동일하게 폴백.

### 6.3 결과 이미 확정된 상태에서 `pendingDiagnosisResume` 이 있는 경우
- `latestDiagnosticSummary.attemptId === pendingDiagnosisResume.attemptId` 이면 의미 없음 → clear.

### 6.6 재진입 후 다시 이탈하는 경우
- 같은 `attemptId` 로 `pendingDiagnosisResume` 을 **덮어쓴다** (merge 아님).
- `savedAt` 은 마지막 저장 시각으로 갱신, `attemptId`/`startedAt` 은 유지.
- `answers`, `weaknessScores`, `diagnosisQueue` 는 현재 세션 상태의 스냅샷으로 대체.

### 6.4 `allCorrect` 케이스
- 오답이 없으면 진단 단계 자체에 진입하지 않으므로 `pendingDiagnosisResume` 생성되지 않음.

### 6.5 기존 이탈 결과 ("추천 약점을 만들지 않았어요" 화면)
- 이번 스펙에서 신규 이탈 경로는 이 화면을 거치지 않는다.
- 하지만 엣지 케이스 (예: 복원 실패) 대비해 폴백 문구는 유지한다.

## 7. 테스트 관점

- **단위**
  - `RESUME_DIAGNOSIS` reducer: 상태 복원 정확성.
  - `setPendingDiagnosisResume` / `clearPendingDiagnosisResume` 저장 경로.
- **통합 (manual QA)**
  - 10문제 풀고 진단 중 0개 완료 → 이탈 → 허브 재진입 → "이어서" CTA 노출 → 진단 화면 재진입 시 모든 페이지 미완료 상태.
  - 10문제 풀고 진단 3개 중 1개 완료 → 이탈 → 재진입 시 완료된 1개는 `completed` 로 잠기고 나머지 2개는 초기화.
  - 진단 모두 완료 → `pendingDiagnosisResume` 자동 클리어 확인.
  - 진단 화면 내부의 "처음부터 다시 풀기" 선택 시 `resetSession` 동작 및 `pendingDiagnosisResume` 클리어 확인.
- **회귀**
  - `pendingDiagnosticStartedAt` 기반 stale 판정이 기존처럼 작동.
  - 결과 화면의 `topWeaknesses === 0` 폴백 문구가 레거시 경로에서는 여전히 유효.

## 8. 열린 질문

1. `pendingDiagnosisResume` 을 "진단 완료 0개" 상태에서도 저장할지 (= 10문제 재풀이만 피하는 케이스) — **기본안: 저장한다**.
2. "이어서 하기" CTA 의 위치 — **결정: 기존 CTA 문구 교체** (`ResumeDiagnosisCard` 별도 카드 제거, 여정 CTA 버튼 오버라이드).
3. 저장 실패 시 UX — `console.warn` 만 남기고 이탈은 그대로 진행 (기존 `markPendingDiagnosticStarted` 패턴 따름).
