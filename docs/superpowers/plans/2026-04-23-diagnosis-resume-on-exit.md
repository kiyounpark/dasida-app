# 약점 진단 중간 이탈 시 이어서 하기 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 진단 도중 이탈해도 10문제 퀴즈를 다시 풀지 않고 진단 단계부터 이어서 할 수 있게 한다.

**Architecture:** 이탈 시 `finishDiagnosis()` 대신 진단 진행 상태(`PendingDiagnosisResumeState`)를 `LearnerProfile`에 저장한다. 허브 재진입 시 저장된 상태를 감지해 "이어서 하기" CTA를 노출하고, 세션에 `RESUME_DIAGNOSIS` 액션으로 복원한다. 완료된 진단 페이지는 `createCompletedDiagnosisWorkspace`로 초기화해 잠금 상태로 표시한다.

**Tech Stack:** React Native (Expo), TypeScript, Firestore (learner profile 저장), useReducer (quiz session), expo-router

---

## 파일 맵

| 파일 | 역할 |
|---|---|
| `features/learner/types.ts` | `PendingDiagnosisResumeState` 타입 추가, `LearnerProfile` 확장 |
| `features/learner/current-learner-controller.ts` | `setPendingDiagnosisResume`, `clearPendingDiagnosisResume` API |
| `features/learner/provider.tsx` | 신규 controller 메서드 노출 |
| `features/quiz/session.tsx` | `RESUME_DIAGNOSIS` 액션 추가 |
| `features/quiz/hooks/diagnostic-screen-helpers.ts` | `createCompletedDiagnosisWorkspace` 추가 |
| `features/quiz/hooks/use-diagnosis-workspaces.ts` | 복원 시 완료 워크스페이스 초기화 |
| `features/quiz/hooks/use-diagnostic-screen.ts` | 이탈 플로우 변경, 완료 시 clear |
| `features/quiz/components/diagnosis-exit-confirm-modal.tsx` | 완료 개수 prop + 문구 분기 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | `hasPendingResume`, `onResumeDiagnosis`, `onRestartDiagnosis` 추가 |
| `features/quiz/components/quiz-hub-screen-view.tsx` | 이어서 하기 카드 렌더링 |

---

### Task 1: PendingDiagnosisResumeState 타입 정의

**Files:**
- Modify: `features/learner/types.ts`

- [ ] **Step 1: `QuizAnswer` import 추가 후 타입 정의**

`features/learner/types.ts` 상단 import에 추가:

```ts
import type { QuizAnswer } from '@/features/quiz/types';
```

`LearnerProfile` 타입 앞에 추가:

```ts
export type PendingDiagnosisResumeState = {
  schemaVersion: 1;
  attemptId: string;
  startedAt: string;   // ISO
  savedAt: string;     // ISO, stale 판정용
  totalQuestions: number;
  answers: QuizAnswer[];
  weaknessScores: Record<string, number>;
  diagnosisQueue: number[];
};
```

- [ ] **Step 2: `LearnerProfile`에 필드 추가**

기존 `LearnerProfile` 타입에 아래 줄 추가 (다른 `pending*` 필드 바로 아래):

```ts
  pendingDiagnosisResume?: PendingDiagnosisResumeState;
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (또는 기존 에러만 있고 새 에러 없음)

- [ ] **Step 4: 커밋**

```bash
git add features/learner/types.ts
git commit -m "feat(diagnosis): PendingDiagnosisResumeState 타입 추가"
```

---

### Task 2: Controller 메서드 추가

**Files:**
- Modify: `features/learner/current-learner-controller.ts`

- [ ] **Step 1: 인터페이스에 메서드 시그니처 추가**

`CurrentLearnerController` 인터페이스 (line ~76 근처)에 기존 `markPendingDiagnosticStarted`, `clearPendingDiagnostic` 바로 아래에 추가:

```ts
  setPendingDiagnosisResume(state: PendingDiagnosisResumeState): Promise<CurrentLearnerSnapshot>;
  clearPendingDiagnosisResume(): Promise<CurrentLearnerSnapshot>;
```

파일 상단 import에 추가:

```ts
import type { PendingDiagnosisResumeState } from '@/features/learner/types';
```

(이미 types import가 있다면 해당 import에 추가)

- [ ] **Step 2: 구현 추가**

`clearPendingDiagnostic` 구현 바로 아래에 추가:

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
clearPendingDiagnosisResume: async () => {
  const { session, profile, summary } = await readAccessibleSnapshot();
  if (!profile.pendingDiagnosisResume) {
    return buildSnapshot({
      authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
      profile,
      session,
      summary,
    });
  }
  const nextProfile: LearnerProfile = {
    ...profile,
    pendingDiagnosisResume: undefined,
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

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "feat(diagnosis): setPendingDiagnosisResume / clearPendingDiagnosisResume controller 추가"
```

---

### Task 3: Provider에 신규 메서드 노출

**Files:**
- Modify: `features/learner/provider.tsx`

- [ ] **Step 1: 컨텍스트 타입에 추가**

provider.tsx 내 컨텍스트 타입 정의 (line ~112 근처, `markPendingDiagnosticStarted`, `clearPendingDiagnostic` 바로 아래)에 추가:

```ts
  setPendingDiagnosisResume(state: PendingDiagnosisResumeState): Promise<void>;
  clearPendingDiagnosisResume(): Promise<void>;
```

파일 상단에 import 추가:

```ts
import type { PendingDiagnosisResumeState } from '@/features/learner/types';
```

- [ ] **Step 2: 구현 추가**

provider.tsx 내 `clearPendingDiagnostic` 구현 바로 아래:

```ts
setPendingDiagnosisResume: async (resumeState: PendingDiagnosisResumeState) => {
  const snapshot = await learnerController.setPendingDiagnosisResume(resumeState);
  setSnapshot(snapshot);
},
clearPendingDiagnosisResume: async () => {
  const snapshot = await learnerController.clearPendingDiagnosisResume();
  setSnapshot(snapshot);
},
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: 커밋**

```bash
git add features/learner/provider.tsx
git commit -m "feat(diagnosis): provider에 setPendingDiagnosisResume 노출"
```

---

### Task 4: Session에 RESUME_DIAGNOSIS 액션 추가

**Files:**
- Modify: `features/quiz/session.tsx`

- [ ] **Step 1: Action 타입에 추가**

`session.tsx` 상단 Action union type에 추가:

```ts
import type { PendingDiagnosisResumeState } from '@/features/learner/types';
```

Action 타입에 추가 (기존 `| { type: 'FINISH_DIAGNOSIS' }` 바로 아래):

```ts
  | { type: 'RESUME_DIAGNOSIS'; payload: PendingDiagnosisResumeState }
```

- [ ] **Step 2: reducer case 추가**

`case 'FINISH_DIAGNOSIS':` 블록 바로 아래에 추가:

```ts
case 'RESUME_DIAGNOSIS': {
  const {
    attemptId,
    startedAt,
    totalQuestions,
    answers,
    weaknessScores,
    diagnosisQueue,
  } = action.payload;
  return {
    ...createInitialState(),
    hasStarted: true,
    totalQuestions,
    attemptId,
    startedAt,
    currentQuestionIndex: totalQuestions,
    answers,
    isDiagnosing: true,
    diagnosisQueue,
    weaknessScores,
  };
}
```

- [ ] **Step 3: context value에 `resumeDiagnosis` 추가**

`useMemo` 안의 context value 객체에 추가 (기존 `finishDiagnosis` 바로 아래):

```ts
resumeDiagnosis: (resumeState: PendingDiagnosisResumeState) => {
  dispatch({ type: 'RESUME_DIAGNOSIS', payload: resumeState });
},
```

context 타입 정의에도 추가:

```ts
resumeDiagnosis: (resumeState: PendingDiagnosisResumeState) => void;
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/session.tsx
git commit -m "feat(diagnosis): RESUME_DIAGNOSIS 액션 추가"
```

---

### Task 5: createCompletedDiagnosisWorkspace 헬퍼 추가

**Files:**
- Modify: `features/quiz/hooks/diagnostic-screen-helpers.ts`

- [ ] **Step 1: 함수 추가**

`createInitialDiagnosisWorkspace` 함수 바로 아래에 추가:

```ts
export function createCompletedDiagnosisWorkspace(
  answerIndex: number,
  problem: Problem,
): DiagnosisWorkspace {
  return {
    aiHelpState: null,
    aiHelpUsed: false,
    analysisErrorMessage: '',
    answerIndex,
    chatEntries: [
      {
        id: `${answerIndex}-problem`,
        kind: 'problem',
        question: problem.question,
        topic: problem.topic,
      },
      {
        id: `${answerIndex}-done`,
        kind: 'bubble',
        role: 'assistant',
        text: '이 문제는 분석을 마쳤어요.',
        tone: 'positive',
      } as DiagnosisConversationEntry,
    ],
    diagnosisInput: '',
    flowDraft: null,
    isAnalyzing: false,
    methodId: null,
    problemId: problem.id,
    routerResult: null,
    status: 'completed',
  };
}
```

> Note: `DiagnosisConversationEntry`가 이미 import되어 있는지 확인. 없으면 같은 파일 내 기존 import에서 type을 확인.

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/diagnostic-screen-helpers.ts
git commit -m "feat(diagnosis): createCompletedDiagnosisWorkspace 추가"
```

---

### Task 6: 복원 시 완료 워크스페이스 초기화

**Files:**
- Modify: `features/quiz/hooks/use-diagnosis-workspaces.ts`

- [ ] **Step 1: import 추가**

파일 상단 `createInitialDiagnosisWorkspace` import에 `createCompletedDiagnosisWorkspace` 추가:

```ts
import {
  ...
  createInitialDiagnosisWorkspace,
  createCompletedDiagnosisWorkspace,
  ...
} from '@/features/quiz/hooks/diagnostic-screen-helpers';
```

- [ ] **Step 2: 워크스페이스 초기화 로직 수정**

현재 line ~85:
```ts
next[answerIndex] = prev[answerIndex] ?? createInitialDiagnosisWorkspace(answerIndex, problem);
```

아래로 교체:
```ts
next[answerIndex] =
  prev[answerIndex] ??
  (answer.weaknessId
    ? createCompletedDiagnosisWorkspace(answerIndex, problem)
    : createInitialDiagnosisWorkspace(answerIndex, problem));
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Manual QA — 복원 후 완료 페이지 표시 확인**

시뮬레이터에서:
1. 10문제 퀴즈 완료 (오답 2개 이상)
2. 첫 번째 진단 페이지에서 약점 분석 완료 (`onFinalConfirm` 호출)
3. (아직 이탈 로직 없음 — Task 7에서 완성되므로 여기서는 워크스페이스 상태만 콘솔 확인)

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-diagnosis-workspaces.ts
git commit -m "feat(diagnosis): 복원 시 완료 진단 페이지 createCompletedDiagnosisWorkspace로 초기화"
```

---

### Task 7: 이탈 플로우 변경 (use-diagnostic-screen.ts)

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

- [ ] **Step 1: provider에서 신규 메서드 구조분해**

`useCurrentLearner()` 구조분해에 추가 (line ~113 근처):

```ts
const { profile, markPendingDiagnosticStarted, clearPendingDiagnostic, setPendingDiagnosisResume, clearPendingDiagnosisResume } = useCurrentLearner();
```

또한 `resumeDiagnosis`도 session에서 구조분해:

```ts
const {
  problems,
  state,
  resetSession,
  startSession,
  goToPreviousQuestion,
  submitAnswer,
  confirmDiagnosisMethod,
  submitDiagnosisWeakness,
  finishDiagnosis,
  resumeDiagnosis,
} = useQuizSession();
```

- [ ] **Step 2: completedDiagnosisCount 계산 추가**

`quizStage` 변수 계산 근처 (line ~557)에 추가:

```ts
const completedDiagnosisCount = state.isDiagnosing
  ? state.diagnosisQueue.filter((i) => Boolean(state.answers[i]?.weaknessId)).length
  : 0;
```

- [ ] **Step 3: onExitDiagnosis 수정**

기존 (line ~531-537):
```ts
const onExitDiagnosis = () => {
  setIsExitModalVisible(false);
  finishDiagnosis();
  void clearPendingDiagnostic().catch((err) => {
    console.warn('[DiagnosticScreen] clearPendingDiagnostic failed', err);
  });
};
```

아래로 교체:
```ts
const onExitDiagnosis = () => {
  setIsExitModalVisible(false);
  // finishDiagnosis() 대신 상태를 보존해 나중에 이어서 할 수 있게 한다.
  void setPendingDiagnosisResume({
    schemaVersion: 1,
    attemptId: state.attemptId!,
    startedAt: state.startedAt!,
    savedAt: new Date().toISOString(),
    totalQuestions: state.totalQuestions,
    answers: state.answers,
    weaknessScores: state.weaknessScores,
    diagnosisQueue: state.diagnosisQueue,
  }).catch((err) => {
    console.warn('[DiagnosticScreen] setPendingDiagnosisResume failed', err);
  });
  router.replace('/(tabs)/quiz');
};
```

- [ ] **Step 4: return 값에 completedDiagnosisCount 추가**

`onExitDiagnosis` 반환 객체에 추가:

```ts
completedDiagnosisCount,
```

`UseDiagnosticScreenResult` 타입에도 추가:

```ts
completedDiagnosisCount: number;
```

- [ ] **Step 5: 진단 완료 시 pendingDiagnosisResume clear**

기존 `state.result`를 감지해 `clearPendingDiagnostic`을 호출하는 useEffect (line ~205-214) 아래에 새 useEffect 추가:

```ts
useEffect(() => {
  if (!state.result) {
    return;
  }
  void clearPendingDiagnosisResume().catch((err) => {
    console.warn('[DiagnosticScreen] clearPendingDiagnosisResume failed', err);
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [state.result]);
```

- [ ] **Step 6: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-diagnostic-screen.ts
git commit -m "feat(diagnosis): 이탈 시 finishDiagnosis 대신 setPendingDiagnosisResume로 상태 보존"
```

---

### Task 8: 이탈 모달 문구 분기

**Files:**
- Modify: `features/quiz/components/diagnosis-exit-confirm-modal.tsx`

- [ ] **Step 1: props 타입에 completedCount 추가**

```ts
type DiagnosisExitConfirmModalProps = {
  visible: boolean;
  completedCount: number;
  onContinue: () => void;
  onExit: () => void;
};
```

- [ ] **Step 2: 제목/본문 교체**

컴포넌트 함수 본문에서 기존 제목/본문을 교체:

```tsx
export function DiagnosisExitConfirmModal({
  visible,
  completedCount,
  onContinue,
  onExit,
}: DiagnosisExitConfirmModalProps) {
  const bodyText =
    completedCount > 0
      ? '이미 분석한 약점은 저장돼요. 퀴즈는 다시 풀지 않아도 돼요.'
      : '퀴즈는 다시 풀지 않아도 돼요. 약점 분석부터 이어서 할 수 있어요.';
  
  return (
    <Modal ...>
      <View style={styles.card}>
        ...
        <Text selectable style={styles.title}>
          잠시 멈추고 나갈까요?
        </Text>
        <Text selectable style={styles.body}>
          {bodyText}
        </Text>
        ...
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: 모달 사용처에서 prop 전달**

`features/quiz/components/diagnostic-screen-view.tsx` (또는 `use-diagnostic-screen.ts` 반환값을 사용하는 곳)에서 모달에 `completedCount={completedDiagnosisCount}` prop 전달.

`DiagnosisExitConfirmModal` 사용처를 검색:

```bash
grep -r "DiagnosisExitConfirmModal" /Users/baggiyun/dev/dasida-app/features --include="*.tsx" -l
```

찾은 파일에서 `<DiagnosisExitConfirmModal` 에 `completedCount={...}` 추가. `completedDiagnosisCount`가 훅 반환값으로 이미 노출되어 있으므로 view에서 가져다 씀.

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/diagnosis-exit-confirm-modal.tsx
git commit -m "feat(diagnosis): 이탈 모달 완료 개수에 따라 문구 분기"
```

---

### Task 9: 허브 훅에 이어서 하기 로직 추가

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

- [ ] **Step 1: provider와 session에서 필요한 것 구조분해**

기존 `useCurrentLearner()` 구조분해에 `profile` 확인 (이미 있음), `clearPendingDiagnosisResume` 추가:

```ts
const {
  ...
  profile,
  clearPendingDiagnosisResume,
  ...
} = useCurrentLearner();
```

session에서 `resumeDiagnosis`, `resetSession` 추가:

```ts
const { resumeDiagnosis, resetSession } = useQuizSession();
```

- [ ] **Step 2: hasPendingResume 계산 추가**

`journey` 변수 계산 근처에 추가:

```ts
const pendingResume = profile?.pendingDiagnosisResume;
const hasPendingResume = Boolean(
  pendingResume &&
  pendingResume.schemaVersion === 1 &&
  pendingResume.attemptId &&
  pendingResume.diagnosisQueue.length > 0,
);
```

- [ ] **Step 3: onResumeDiagnosis, onRestartDiagnosis 추가**

```ts
const onResumeDiagnosis = () => {
  if (!pendingResume || !hasPendingResume) return;
  resumeDiagnosis(pendingResume);
  router.push('/quiz/diagnostic');
};

const onRestartDiagnosis = () => {
  void clearPendingDiagnosisResume().catch(console.warn);
  resetSession();
  router.push({
    pathname: '/quiz/diagnostic',
    params: { autostart: '1', reset: '1' },
  });
};
```

- [ ] **Step 4: return에 추가**

```ts
return {
  ...
  hasPendingResume,
  onResumeDiagnosis,
  onRestartDiagnosis,
};
```

`UseQuizHubScreenResult` 타입에도 추가:

```ts
hasPendingResume: boolean;
onResumeDiagnosis: () => void;
onRestartDiagnosis: () => void;
```

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat(diagnosis): 허브 훅에 hasPendingResume / onResumeDiagnosis 추가"
```

---

### Task 10: 허브 뷰에 이어서 하기 카드 렌더링

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: props 구조분해에 신규 props 추가**

`QuizHubScreenView` 함수 props 구조분해에 추가:

```tsx
export function QuizHubScreenView({
  ...
  hasPendingResume,
  onResumeDiagnosis,
  onRestartDiagnosis,
}: UseQuizHubScreenResult) {
```

- [ ] **Step 2: 이어서 하기 카드 컴포넌트 추가 (파일 상단)**

`FeedbackCard` 컴포넌트 아래에 추가:

```tsx
function ResumeDiagnosisCard({
  onResume,
  onRestart,
}: {
  onResume: () => void;
  onRestart: () => void;
}) {
  return (
    <View style={styles.resumeCard}>
      <Text selectable style={styles.resumeCardTitle}>
        약점 분석이 완료되지 않았어요
      </Text>
      <Text selectable style={styles.resumeCardBody}>
        지난번에 시작한 약점 분석을 이어서 할 수 있어요.
      </Text>
      <Pressable style={styles.resumeButton} onPress={onResume}>
        <Text selectable style={styles.resumeButtonText}>약점 분석 이어서 하기</Text>
      </Pressable>
      <Pressable style={styles.restartButton} onPress={onRestart}>
        <Text selectable style={styles.restartButtonText}>처음부터 다시 풀기</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: ScrollView 안에 조건부 렌더링 추가**

허브 메인 렌더링 블록 (`return` 내 ScrollView contentContainerStyle 부근)에서 `JourneyCtaButton` 또는 journey CTA 렌더링 바로 앞에:

```tsx
{hasPendingResume ? (
  <ResumeDiagnosisCard
    onResume={onResumeDiagnosis}
    onRestart={onRestartDiagnosis}
  />
) : null}
```

- [ ] **Step 4: styles 추가**

`StyleSheet.create` 안에 추가:

```ts
resumeCard: {
  borderRadius: BrandRadius.lg,
  borderCurve: 'continuous',
  backgroundColor: BrandColors.surface,
  padding: BrandSpacing.lg,
  gap: BrandSpacing.sm,
  marginHorizontal: BrandSpacing.md,
  marginBottom: BrandSpacing.md,
},
resumeCardTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: BrandColors.ink,
},
resumeCardBody: {
  fontSize: 14,
  color: BrandColors.inkMuted,
  lineHeight: 20,
},
resumeButton: {
  borderRadius: BrandRadius.sm,
  borderCurve: 'continuous',
  backgroundColor: BrandColors.primary,
  paddingVertical: 12,
  alignItems: 'center',
},
resumeButtonText: {
  fontSize: 15,
  fontWeight: '700',
  color: '#FFFFFF',
},
restartButton: {
  borderRadius: BrandRadius.sm,
  borderCurve: 'continuous',
  backgroundColor: 'transparent',
  paddingVertical: 10,
  alignItems: 'center',
},
restartButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: BrandColors.inkMuted,
},
```

> `BrandColors`, `BrandRadius`, `BrandSpacing` 사용 가능한 값은 `constants/brand.ts`를 확인할 것.

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(diagnosis): 허브에 약점 분석 이어서 하기 카드 추가"
```

---

### Task 11: 복원 후 diagnostic 화면 진입 처리

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

`isDiagnosing: true` 상태로 진입했을 때 (`RESUME_DIAGNOSIS` 후) `shouldAutoStart`가 false여도 진단 화면이 정상 동작하는지 확인한다.

- [ ] **Step 1: 진단 복원 경로 확인**

`onResumeDiagnosis`에서 `router.push('/quiz/diagnostic')`으로 이동한다. `app/quiz/diagnostic.tsx`가 어떤 파라미터로 화면을 초기화하는지 확인:

```bash
cat /Users/baggiyun/dev/dasida-app/app/quiz/diagnostic.tsx
```

- [ ] **Step 2: reset 방지**

`/quiz/diagnostic` 진입 시 `shouldResetOnMount`가 true이면 기존 복원 상태가 날아간다. `onResumeDiagnosis`에서 `reset` 파라미터 없이 navigate해야 한다 (Task 9에서 `params: { autostart: '1', reset: '1' }`을 쓰지 않은 이유).

`app/quiz/diagnostic.tsx`에서 `reset` 파라미터가 없을 때 `shouldResetOnMount = false`인지 확인. 맞으면 패스. 아니면 해당 파라미터 처리를 수정.

- [ ] **Step 3: isDiagnosing=true 진입 시 quizStage null 여부 확인**

`use-diagnostic-screen.ts` line ~557:
```ts
const quizStage =
  state.hasStarted && !state.isDiagnosing && currentProblem
    ? { ... }
    : null;
```

`RESUME_DIAGNOSIS` 후에는 `isDiagnosing = true`이므로 `quizStage = null`. 이는 의도된 동작 (진단 화면은 quizStage가 아닌 diagnosisPages를 사용).

`diagnosisPages`는 `state.isDiagnosing && state.diagnosisQueue.length > 0`일 때 생성되므로 정상 동작. 추가 수정 불필요.

- [ ] **Step 4: Manual QA — 전체 플로우 검증**

시뮬레이터에서:

1. 10문제 퀴즈 완료 (오답 2개 이상)
2. 진단 화면 진입 → 첫 번째 약점 분석 완료
3. 뒤로가기 → 이탈 모달 확인
   - 제목: "잠시 멈추고 나갈까요?"
   - 본문: "이미 분석한 약점은 저장돼요. 퀴즈는 다시 풀지 않아도 돼요."
4. "나갈게요" → 허브로 이동
5. 허브에서 "약점 분석 이어서 하기" 카드 확인
6. 카드 탭 → 진단 화면 재진입
7. 완료된 첫 번째 페이지가 "이 문제는 분석을 마쳤어요." 상태인지 확인
8. 나머지 페이지에서 약점 분석 완료 → 결과 화면으로 정상 이동
9. 결과 화면 이동 후 허브로 돌아가면 이어서 하기 카드 사라짐 확인

추가 케이스:
- 0개 완료 후 이탈 → 모달 본문: "퀴즈는 다시 풀지 않아도 돼요. 약점 분석부터 이어서 할 수 있어요."
- "처음부터 다시 풀기" 탭 → 진단 화면 초기화 (10문제부터)

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "feat(diagnosis): 약점 진단 이어서 하기 전체 플로우 완성"
```

---

## 셀프 리뷰

### 스펙 커버리지

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 진단 이탈 시 finishDiagnosis 대신 상태 저장 | Task 7 |
| 완료된 진단 보존 | Task 5, 6 |
| "처음부터 다시" 경로 유지 | Task 9, 10 |
| 모달 문구 완료 개수 분기 | Task 7, 8 |
| 허브에서 이어서 하기 CTA | Task 9, 10 |
| pendingDiagnosticStartedAt 유지 | Task 7 (finishDiagnosis 미호출) |
| 진단 완료 시 pendingDiagnosisResume clear | Task 7 step 5 |
| schemaVersion 불일치 폴백 | Task 9 step 2 (`schemaVersion === 1` 체크) |
| 재진입 후 또 이탈 시 덮어쓰기 | Task 7 (setPendingDiagnosisResume 단순 overwrite) |

### 타입 일관성

- `PendingDiagnosisResumeState` → Task 1 정의, Task 2/3/4/7/9에서 동일 타입 사용
- `resumeDiagnosis(PendingDiagnosisResumeState)` → Task 4 정의, Task 9에서 호출
- `completedDiagnosisCount: number` → Task 7 계산, Task 8 prop으로 전달
- `hasPendingResume: boolean` → Task 9 계산, Task 10 view에서 소비
