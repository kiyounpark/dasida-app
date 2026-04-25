# 약점 진단 이어서 하기 — 허브 CTA 오버라이드 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pendingDiagnosisResume`이 있을 때 별도 카드 없이 여정보드 CTA 버튼만으로 진단 이어서 하기를 지원한다.

**Architecture:** `use-quiz-hub-screen.ts`에서 `hasPendingResume`이면 `journey` 객체의 `ctaLabel`을 오버라이드하고, `onPressJourneyCta`가 `onResumeDiagnosis`를 호출하도록 분기한다. 뷰와 여정 상태 계산 로직은 건드리지 않는다.

**Tech Stack:** React Native (Expo), TypeScript, expo-router

---

## 현재 상태 (이미 완료된 것들)

아래는 이미 구현되어 있어 이 플랜에서 건드리지 않는다:

- ✅ `PendingDiagnosisResumeState` 타입 (`features/learner/types.ts`)
- ✅ `setPendingDiagnosisResume` / `clearPendingDiagnosisResume` (controller + provider)
- ✅ `RESUME_DIAGNOSIS` 액션 + reducer (`features/quiz/session.tsx`)
- ✅ 진단 화면 자동 복원 useEffect (`use-diagnostic-screen.ts`)
- ✅ `onExitDiagnosis` — 이탈 시 `pendingDiagnosisResume` 저장
- ✅ `clearPendingDiagnosisResume` on `state.result` — 완료 시 자동 클리어
- ✅ `DiagnosisExitConfirmModal` — `completedCount` 기반 문구 분기
- ✅ `createCompletedDiagnosisWorkspace` 헬퍼
- ✅ `use-diagnosis-workspaces.ts` — `weaknessId` 있으면 completed 워크스페이스로 초기화
- ✅ `hasPendingResume` 계산 (`use-quiz-hub-screen.ts`)
- ✅ `onResumeDiagnosis` — `/quiz/diagnostic`으로 이동 (`use-quiz-hub-screen.ts`)
- ✅ `ResumeDiagnosisCard` 제거 (`quiz-hub-screen-view.tsx`)

## 파일 맵

| 파일 | 변경 내용 |
|---|---|
| `features/quiz/hooks/use-quiz-hub-screen.ts` | `journey` 객체 ctaLabel 오버라이드, `onPressJourneyCta` resume 분기 |

---

### Task 1: 허브 CTA 라벨 + 동작 오버라이드

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

- [ ] **Step 1: `journey` 반환 객체에 ctaLabel 오버라이드 추가**

`use-quiz-hub-screen.ts`에서 `journey` 변수가 현재 이렇게 계산된다 (line ~201):

```ts
const journey = homeState?.journey ?? null;
```

아래로 교체:

```ts
const rawJourney = homeState?.journey ?? null;
const journey =
  hasPendingResume && rawJourney
    ? { ...rawJourney, ctaLabel: '약점 분석 이어서 하기' }
    : rawJourney;
```

- [ ] **Step 2: `onPressJourneyCta`에 resume 분기 추가**

`onPressJourneyCta` 함수 (line ~145) 맨 앞에 추가:

```ts
const onPressJourneyCta = () => {
  if (hasPendingResume) {
    onResumeDiagnosis();
    return;
  }

  const action = homeState?.journey.ctaAction;
  // ... 기존 로직 유지
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 4: Manual QA — CTA 라벨 확인**

시뮬레이터에서:

1. 10문제 퀴즈 완료 (오답 1개 이상)
2. 약점 진단 화면 진입 → 뒤로가기 → "나갈게요"
3. 허브로 돌아왔을 때 하단 CTA 버튼 라벨이 **"약점 분석 이어서 하기"** 로 표시되는지 확인
4. 버튼 탭 → 진단 화면 재진입 확인 (10문제 퀴즈 없이 바로 진단 화면)

추가 케이스:
- 진단 완료 후 허브 돌아가면 CTA 라벨이 원래대로(예: "약점 결과 보기") 복원되는지 확인
- 오답 없이(allCorrect) 퀴즈 완료 후에는 CTA 오버라이드 없는지 확인

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat(diagnosis): 허브 CTA — hasPendingResume 시 라벨/동작 오버라이드"
```

---

## 셀프 리뷰

### 스펙 커버리지 (§3.2 기준)

| 스펙 요구사항 | 구현 |
|---|---|
| `pendingDiagnosisResume` 있으면 별도 카드 없이 CTA 오버라이드 | Task 1 Step 1 |
| CTA 라벨 "약점 분석 이어서 하기" | Task 1 Step 1 |
| CTA 누르면 resume 경로 (`onResumeDiagnosis`) | Task 1 Step 2 |
| 여정보드 노드 상태 변경 없음 | 변경 없음 ✅ |
| "처음부터 다시 풀기" 허브에서 미제공 | `ResumeDiagnosisCard` 제거 완료 ✅ |

### 타입 일관성

- `journey` 타입: `HomeJourneyState | null` — spread로 ctaLabel만 교체, 타입 변경 없음
- `hasPendingResume: boolean` — 이미 계산된 변수, 재사용
- `onResumeDiagnosis: () => void` — 이미 구현, 재사용
