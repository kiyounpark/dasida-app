# Review First-Attempt Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션 완료 시 각 ThinkingStep에서 첫 번째 선택의 정답 여부를 기반으로 `LearningAttempt`를 기록하여, `WeaknessAccuracyChart`의 복습 막대에 실제 첫 시도 정답률이 표시되도록 한다.

**Architecture:** `useReviewSessionScreen` 훅에서 각 step의 첫 번째 선택이 `correct`인지를 ref로 추적한다. `onPressRemember` 실행 시 `recordAttempt(source='weakness-practice')`를 호출하여 첫 시도 accuracy를 기록한다. 나머지 파이프라인(controller → `buildHomeLearningState` → `WeaknessProgressItem.reviewAccuracy` → `WeaknessAccuracyChart`)은 이미 구현되어 있어 별도 수정 불필요.

**Tech Stack:** TypeScript, React Native, React hooks (useRef), AsyncStorage (LocalLearningHistoryRepository)

---

### Task 1: `useReviewSessionScreen`에 첫 시도 정답 추적 + `recordAttempt` 호출

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

**Background:**
- `ThinkingStep.choices` 각 항목에 `correct: boolean` 필드가 이미 있음
- `useCurrentLearner()` 는 `profile: LearnerProfile | null`, `recordAttempt(input: FinalizedAttemptInput): Promise<void>` 를 노출함
- `FinalizedAttemptInput.reviewContext = { reviewTaskId, reviewStage }` 를 전달하면 로컬 리포지토리가 ReviewTask 완료 처리도 수행함
- `completeReviewTask(store)` 는 별도의 `LocalReviewTaskStore`를 업데이트하므로, `recordAttempt` 이후에도 기존대로 호출해야 함

**Pre-existing errors (무시):**
- `use-review-session-screen.ts:62` — `ThinkingStep[]` readonly 타입 에러 — 이번 작업과 무관

- [ ] **Step 1: `useCurrentLearner`에서 `profile`과 `recordAttempt` 추가 destructure**

`use-review-session-screen.ts` 39번째 줄:

```ts
const { session, refresh, profile, recordAttempt } = useCurrentLearner();
```

- [ ] **Step 2: 세션 시작 시각 ref와 첫 시도 결과 ref 추가**

기존 `const isFetchingRef = useRef(false);` 바로 아래에 추가:

```ts
const sessionStartedAtRef = useRef(new Date().toISOString());
// 각 step 인덱스 → 첫 번째 선택이 정답이었는지. null = 아직 선택 안 함
const firstAttemptCorrectRef = useRef<Array<boolean | null>>([]);
```

그리고 steps가 로드된 후 ref를 초기화하기 위해 기존 `useEffect` (task 로드) 내부, `setSteps(found)` 바로 뒤에 추가:

```ts
if (found) {
  setSteps(getReviewThinkingSteps(found.weaknessId));
  firstAttemptCorrectRef.current = new Array(
    getReviewThinkingSteps(found.weaknessId).length,
  ).fill(null);
  sessionStartedAtRef.current = new Date().toISOString();
}
```

- [ ] **Step 3: `onSelectChoice`에서 첫 시도 정답 여부 기록**

기존 `onSelectChoice`:
```ts
const onSelectChoice = (index: number) => {
  setSelectedChoiceIndex(index);
};
```

아래로 교체:
```ts
const onSelectChoice = (index: number) => {
  setSelectedChoiceIndex(index);
  // 이 step에서 아직 첫 시도가 기록되지 않았을 때만 기록
  if (
    stepPhase === 'input' &&
    firstAttemptCorrectRef.current[currentStepIndex] === null
  ) {
    const isCorrect = steps[currentStepIndex]?.choices[index]?.correct ?? false;
    firstAttemptCorrectRef.current[currentStepIndex] = isCorrect;
  }
};
```

- [ ] **Step 4: `onPressRemember`에서 `recordAttempt` 호출**

기존 `onPressRemember`:
```ts
const onPressRemember = async () => {
  if (!task) {
    return;
  }
  try {
    await completeReviewTask(accountKey, task.id, store);
    await refresh();
  } catch (error) {
    console.warn('Failed to complete review task', error);
  }
  router.back();
};
```

아래로 교체:
```ts
const onPressRemember = async () => {
  if (!task || !profile) {
    return;
  }

  const completedAt = new Date().toISOString();
  const results = firstAttemptCorrectRef.current;
  const questionCount = steps.length;
  const correctCount = results.filter((r) => r === true).length;
  // steps가 없는 약점(g3_*)은 accuracy 100으로 처리
  const accuracy =
    questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 100;

  try {
    await recordAttempt({
      attemptId: `review-${task.id}-${Date.now().toString(36)}`,
      accountKey,
      learnerId: profile.learnerId,
      source: 'weakness-practice',
      sourceEntityId: task.sourceId,
      gradeSnapshot: profile.grade,
      startedAt: sessionStartedAtRef.current,
      completedAt,
      questionCount,
      correctCount,
      wrongCount: questionCount - correctCount,
      accuracy,
      primaryWeaknessId: task.weaknessId,
      topWeaknesses: [task.weaknessId],
      reviewContext: {
        reviewTaskId: task.id,
        reviewStage: task.stage,
      },
      questions: steps.map((step, i) => ({
        questionId: `${task.id}-step-${i}`,
        questionNumber: i + 1,
        topic: step.title,
        selectedIndex: null,
        isCorrect: results[i] ?? false,
        finalWeaknessId: task.weaknessId,
        methodId: null,
        diagnosisSource: null,
        finalMethodSource: null,
        diagnosisCompleted: true,
        usedDontKnow: false,
        usedAiHelp: false,
      })),
    });
  } catch (error) {
    console.warn('Failed to record review attempt', error);
  }

  try {
    await completeReviewTask(accountKey, task.id, store);
    await refresh();
  } catch (error) {
    console.warn('Failed to complete review task', error);
  }
  router.back();
};
```

- [ ] **Step 5: 타입체크 — 기존 에러 외에 새 에러 없음 확인**

```bash
npx tsc --noEmit 2>&1 | grep "use-review-session-screen" | head -10
```

기존 pre-existing 에러 1건 외 새 에러 없음 확인.

- [ ] **Step 6: 수동 검증**

1. `npx expo run:ios` 실행
2. 개발 설정 → `seedPreview('review-day3-available')` 실행
3. 복습 세션 진입 → 각 ThinkingStep에서 의도적으로 일부 정답/오답 선택
4. "기억났어요!" 완료
5. 홈 화면 → 차트에서 복습 막대(진한 녹색)가 표시되는지 확인
6. 정답률이 실제 선택과 일치하는지 확인 (예: 4 step 중 3 정답 → 75%)

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat: 복습 세션 완료 시 첫 시도 정답률 기반 LearningAttempt 기록"
git push origin main
```
