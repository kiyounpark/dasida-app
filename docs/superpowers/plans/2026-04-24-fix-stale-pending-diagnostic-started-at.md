# Fix: stale pendingDiagnosticStartedAt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `setPendingDiagnosisResume` 호출 시 `pendingDiagnosticStartedAt`을 원자적으로 제거해 두 필드가 동시에 존재하는 불일치 상태를 방지한다.

**Architecture:** `features/learner/current-learner-controller.ts`의 `setPendingDiagnosisResume` 메서드에서 `nextProfile` 객체를 구성할 때 `pendingDiagnosticStartedAt: undefined`를 추가한다. `profileStore.save(nextProfile)`은 단일 Firestore 문서 write이므로 두 필드 변경이 원자적으로 처리된다.

**Tech Stack:** TypeScript, Firebase Firestore (profileStore 추상화), Expo/React Native

**Spec:** `docs/superpowers/specs/2026-04-24-fix-stale-pending-diagnostic-started-at-design.md`

---

## 변경 파일 맵

| 파일 | 역할 | 변경 유형 |
|------|------|---------|
| `features/learner/current-learner-controller.ts` | Firestore 프로필 write 로직 | Modify (1줄 추가) |

---

### Task 1: `setPendingDiagnosisResume`에서 `pendingDiagnosticStartedAt` 원자적 제거

**Files:**
- Modify: `features/learner/current-learner-controller.ts` (line 595–609)

- [ ] **Step 1: 현재 코드 확인**

`features/learner/current-learner-controller.ts`의 `setPendingDiagnosisResume` 메서드(line 595)를 열어 현재 상태를 확인한다.

현재 코드:
```ts
setPendingDiagnosisResume: async (resumeState: PendingDiagnosisResumeState) => {
  const { session, profile, summary } = await readAccessibleSnapshot();
  const nextProfile: LearnerProfile = {
    ...profile,
    pendingDiagnosisResume: resumeState,
    updatedAt: new Date().toISOString(),
  };
  await profileStore.save(nextProfile);
  return buildSnapshot({
    authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
    profile: nextProfile,
    session,
    summary,
  });
},
```

- [ ] **Step 2: `pendingDiagnosticStartedAt: undefined` 추가**

`nextProfile` 객체에 `pendingDiagnosticStartedAt: undefined`를 추가한다.

변경 후:
```ts
setPendingDiagnosisResume: async (resumeState: PendingDiagnosisResumeState) => {
  const { session, profile, summary } = await readAccessibleSnapshot();
  const nextProfile: LearnerProfile = {
    ...profile,
    pendingDiagnosisResume: resumeState,
    pendingDiagnosticStartedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  await profileStore.save(nextProfile);
  return buildSnapshot({
    authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
    profile: nextProfile,
    session,
    summary,
  });
},
```

- [ ] **Step 3: TypeScript 타입 체크**

```bash
npm run typecheck
```

Expected: 에러 없이 종료. `LearnerProfile.pendingDiagnosticStartedAt`은 `string | undefined` 타입이므로 `undefined` 할당이 유효하다.

타입 정의 확인 (`features/learner/types.ts` line 64):
```ts
pendingDiagnosticStartedAt?: string; // ISO 타임스탬프
```

- [ ] **Step 4: Commit**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "fix(learner): setPendingDiagnosisResume에서 pendingDiagnosticStartedAt 원자적 클리어

약점 분석 중 나가기(onExitDiagnosis) 호출 시 pendingDiagnosisResume은 저장되지만
pendingDiagnosticStartedAt이 stale하게 남는 invariant 위반을 수정한다.

두 필드는 상호 배타적이어야 함:
- pendingDiagnosticStartedAt: 퀴즈 파트 진행 중
- pendingDiagnosisResume: 퀴즈 완료, 분석 파트 재개 가능

단일 profileStore.save() write로 원자적 처리.

Ref: docs/superpowers/specs/2026-04-24-fix-stale-pending-diagnostic-started-at-design.md"
```

---

### Task 2: 수동 검증

**Files:** 없음 (기기/시뮬레이터에서 직접 확인)

- [ ] **Step 1: 시뮬레이터 빌드 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: 정상 흐름 검증**

1. 앱 실행 → 홈 화면 → 진단 시작
2. 10문제 모두 풀기 → 약점 분석 화면 진입
3. 분석 화면에서 나가기(×) → 홈으로 이동
4. 여정 보드 확인: **"약점 분석 이어서 하기"** 버튼이 보여야 함 (`diagnostic_analysis_pending`)
   - "진단 다시 시작하기"가 보이면 버그 재발

- [ ] **Step 3: 재개 후 완료 흐름 검증**

1. Step 2 상태에서 "약점 분석 이어서 하기" 탭
2. 모든 약점 분석 완료
3. 홈으로 돌아왔을 때 여정 보드 확인: **`result_pending`** 상태 ("약점 결과 보기" 버튼)

- [ ] **Step 4: Firestore 데이터 확인 (선택)**

Firebase Console 또는 Firestore 에뮬레이터에서 해당 유저 프로필 문서 확인:
- `pendingDiagnosisResume`: 분석 나가기 직후에는 설정됨, 완료 후에는 제거됨
- `pendingDiagnosticStartedAt`: 분석 나가기 직후 **`undefined`(필드 없음)** 확인

---

## Self-Review

**Spec coverage:**
- [x] `setPendingDiagnosisResume`에서 `pendingDiagnosticStartedAt` 제거 → Task 1
- [x] 원자적 단일 write → `profileStore.save(nextProfile)` 단일 호출로 보장
- [x] 검증 항목 → Task 2 수동 QA 커버

**Placeholder 스캔:** 없음

**Type consistency:** `pendingDiagnosticStartedAt?: string` (optional) → `undefined` 할당 유효
