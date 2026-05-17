# 복습 완료 — 자기평가 버튼 제거 + 오답 기반 복습 자동 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 완료 화면의 자기평가 2버튼을 "완료" 1버튼으로 바꾸고, 첫 시도 오답이 데려간 보충 경로 약점으로 day1 복습 task를 중복 없이 자동 생성/갱신한다.

**Architecture:** 순수 스케쥴링 함수 `spawnMistakeReviewTasks`를 `features/learning/review-scheduler.ts`에 추가. 세션 hook `onComplete`가 `completeReviewTask` 후 store를 재로드해 호출. UI는 `DoneView` 비졸업 분기를 단일 버튼으로 단순화. 콘텐츠 불변식 테스트로 미태깅 오답 0 보장.

**Tech Stack:** TypeScript, React Native (Expo), Jest, AsyncStorage 기반 `ReviewTaskStore`.

---

## Spec

`docs/superpowers/specs/2026-05-17-review-completion-mistake-driven-design.md` (commit c8b4cf6)

## File Structure

- `data/review-content-map.ts` — 수정: 미태깅 오답 6개에 `weaknessId` 추가.
- `data/review-content-map.test.ts` — 수정: "모든 오답 weaknessId 필수" 불변식 테스트 추가.
- `features/learning/review-scheduler.ts` — 수정: `addDaysToToday` export, `spawnMistakeReviewTasks` 추가.
- `features/learning/review-scheduler.test.ts` — 생성/수정: `spawnMistakeReviewTasks` 단위 테스트.
- `features/quiz/hooks/use-review-session-screen.ts` — 수정: `onPressRemember`→`onComplete` 일원화, `onPressRetry` 삭제, spawn 호출.
- `features/quiz/components/review-session/done-view.tsx` — 수정: 비졸업 단일 버튼, `onPressRetry` prop 제거.
- `features/quiz/components/review-session-screen-view.tsx` — 수정: `onPressRetry` 배선 제거.

---

## Task 1: 미태깅 오답 콘텐츠 보강 + 불변식 테스트

**Files:**
- Modify: `data/review-content-map.ts` (`basic_concept_needed` step1~3, 각 step의 c0·c2 choice)
- Test: `data/review-content-map.test.ts`

- [ ] **Step 1: 불변식 테스트 추가 (실패하는 테스트)**

`data/review-content-map.test.ts`의 `describe('weaknessId membership (spec §2.1)', ...)` 블록 안, 기존 `it('every weaknessId ... in weaknessOrder')` 다음에 추가:

```ts
  it('every correct:false choice has a weaknessId (spec 2026-05-17)', () => {
    const offenders: string[] = [];
    for (const [weaknessKey, content] of Object.entries(reviewContentMap)) {
      if (!content) continue;
      content.thinkingSteps.forEach((step, sIdx) => {
        step.choices.forEach((choice, cIdx) => {
          if (choice.correct === false && !choice.weaknessId) {
            offenders.push(`${weaknessKey}.step${sIdx + 1}.choice${cIdx}`);
          }
        });
      });
    }
    expect(offenders).toEqual([]);
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest data/review-content-map.test.ts -t "every correct:false choice has a weaknessId"`
Expected: FAIL — offenders에 `basic_concept_needed.step1.choice0`, `.step1.choice2`, `.step2.choice0`, `.step2.choice2`, `.step3.choice0`, `.step3.choice2` 6개.

- [ ] **Step 3: 6개 오답에 weaknessId 추가**

`data/review-content-map.ts`의 `basic_concept_needed` ReviewContent에서 step1·step2·step3의 `correct: false`이고 `weaknessId`가 없는 choice(각 step의 첫째·셋째 오답) 객체에 `weaknessId: 'basic_concept_needed'`를 추가한다. 예 (step1 c0):

```ts
{ text: 'b를 그대로 쓰면 된다', correct: false, feedback: 'b를 그대로 쓰면 완전제곱 꼴이 만들어지지 않아요. (x+?)²을 만들려면 b/2가 필요하다는 점에 다시 주목해봐요.', remedialFlowStartNodeId: 'fu_step1_A_explain', weaknessId: 'basic_concept_needed' },
```

나머지 5개(step1 c2, step2 c0, step2 c2, step3 c0, step3 c2)도 동일하게 `weaknessId: 'basic_concept_needed'`만 추가. 다른 필드·텍스트는 변경 금지.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest data/review-content-map.test.ts`
Expected: PASS (기존 테스트 포함 전부).

- [ ] **Step 5: 커밋**

```bash
git add data/review-content-map.ts data/review-content-map.test.ts
git commit -m "fix(review-content): 미태깅 오답 6개 weaknessId 보강 + 불변식 테스트"
```

---

## Task 2: spawnMistakeReviewTasks 순수 함수

**Files:**
- Modify: `features/learning/review-scheduler.ts`
- Test: `features/learning/review-scheduler.test.ts`

- [ ] **Step 1: 실패하는 단위 테스트 작성**

`features/learning/review-scheduler.test.ts`에 추가(파일 없으면 생성, 상단 import 포함):

```ts
import { spawnMistakeReviewTasks } from './review-scheduler';
import type { ReviewTask } from './types';
import type { ReviewTaskStore } from './review-task-store';

function memStore(initial: ReviewTask[]): ReviewTaskStore & { all: () => ReviewTask[] } {
  let tasks = [...initial];
  return {
    load: async () => [...tasks],
    saveAll: async (_k, next) => { tasks = [...next]; },
    all: () => tasks,
  };
}

function task(p: Partial<ReviewTask>): ReviewTask {
  return {
    id: `${p.sourceId}__${p.weaknessId}__${p.stage}`,
    accountKey: 'acc', source: 'weakness-practice',
    sourceId: 'src1', weaknessId: 'discriminant_calculation' as any,
    stage: 'day1', scheduledFor: '2026-05-01',
    completed: false, createdAt: '2026-05-01T00:00:00.000Z', ...p,
  } as ReviewTask;
}

const TOMORROW = (() => {
  const d = new Date();
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`;
})();

describe('spawnMistakeReviewTasks', () => {
  it('약점 task 없으면 day1·내일로 신규 생성', async () => {
    const store = memStore([]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t).toHaveLength(1);
    expect(t[0].stage).toBe('day1');
    expect(t[0].id).toBe('src1__discriminant_calculation__day1');
    expect(t[0].scheduledFor).toBe(TOMORROW);
    expect(t[0].completed).toBe(false);
  });

  it('상위 단계 미완료 task는 삭제 후 day1 재생성 (in-place 변경 금지)', async () => {
    const store = memStore([task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day7', scheduledFor: '2026-09-01' })]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t).toHaveLength(1);
    expect(t[0].id).toBe('src1__discriminant_calculation__day1');
    expect(t[0].stage).toBe('day1');
    expect(t[0].scheduledFor).toBe(TOMORROW);
    expect(t.some((x) => x.id === 'src1__discriminant_calculation__day7')).toBe(false);
  });

  it('이미 day1이면 신규 생성 없이 scheduledFor만 내일로', async () => {
    const store = memStore([task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day1', scheduledFor: '2026-01-01' })]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t).toHaveLength(1);
    expect(t[0].stage).toBe('day1');
    expect(t[0].scheduledFor).toBe(TOMORROW);
  });

  it('완료된 task는 무시하고 신규 생성', async () => {
    const store = memStore([task({ sourceId: 'src1', weaknessId: 'discriminant_calculation' as any, stage: 'day7', completed: true })]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation'] as any, store);
    const t = store.all();
    expect(t.filter((x) => !x.completed)).toHaveLength(1);
    expect(t.find((x) => !x.completed)!.stage).toBe('day1');
  });

  it('같은 약점 중복 입력은 task 1개만', async () => {
    const store = memStore([]);
    await spawnMistakeReviewTasks('acc', 'src1', ['discriminant_calculation', 'discriminant_calculation'] as any, store);
    expect(store.all()).toHaveLength(1);
  });

  it('빈 입력이면 store 변경 없음', async () => {
    const store = memStore([task({ stage: 'day7' })]);
    await spawnMistakeReviewTasks('acc', 'src1', [], store);
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0].stage).toBe('day7');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/learning/review-scheduler.test.ts -t spawnMistakeReviewTasks`
Expected: FAIL — `spawnMistakeReviewTasks` is not a function / not exported.

- [ ] **Step 3: 함수 구현**

`features/learning/review-scheduler.ts`에서 `addDaysToToday`를 `export function addDaysToToday(...)`로 export 변경(기존 동작 유지). 그리고 파일 끝에 추가:

```ts
import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * "오답 기반 복습 자동 생성" — 세션에서 틀린 실수가 데려간 약점들을
 * day1·내일로 생성/갱신한다. 중복키 = (sourceId, weaknessId), stage 무시.
 * 상위 단계 미완료 task는 id/stage 정합성을 위해 삭제 후 __day1 재생성한다.
 */
export async function spawnMistakeReviewTasks(
  accountKey: string,
  sourceId: string,
  mistakeWeaknessIds: WeaknessId[],
  store: ReviewTaskStore,
): Promise<void> {
  const unique = Array.from(new Set(mistakeWeaknessIds));
  if (unique.length === 0) return;

  const tasks = await store.load(accountKey);
  const tomorrow = addDaysToToday(1);
  let next = [...tasks];

  for (const weaknessId of unique) {
    const pending = next.filter(
      (t) =>
        !t.completed &&
        t.sourceId === sourceId &&
        t.weaknessId === weaknessId,
    );

    const day1Existing = pending.find((t) => t.stage === 'day1');
    if (day1Existing) {
      next = next.map((t) =>
        t.id === day1Existing.id ? { ...t, scheduledFor: tomorrow } : t,
      );
      // day1 외 잔여 pending이 있으면(비정상) 정리 — 약점당 1개 불변식 자가 치유
      const stale = new Set(pending.filter((t) => t.id !== day1Existing.id).map((t) => t.id));
      next = next.filter((t) => !stale.has(t.id));
      continue;
    }

    // pending 전부 제거(day3/day7/day30) 후 day1 신규 생성
    const removeIds = new Set(pending.map((t) => t.id));
    next = next.filter((t) => !removeIds.has(t.id));
    const day1Id = `${sourceId}__${weaknessId}__day1`;
    next.push({
      id: day1Id,
      accountKey,
      weaknessId,
      source: 'weakness-practice',
      sourceId,
      scheduledFor: tomorrow,
      stage: 'day1',
      completed: false,
      createdAt: new Date().toISOString(),
    });
  }

  await store.saveAll(accountKey, next);
}
```

`source: 'weakness-practice'`의 타입이 안 맞으면 `tasks`에서 같은 (sourceId) 기존 task의 `source`를 재사용하거나 `ReviewTask['source']` 타입에 맞는 기본값을 사용한다(기존 `completeReviewTask`가 만드는 next task의 `source: task.source`와 동일 규칙).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/learning/review-scheduler.test.ts`
Expected: PASS (6 케이스 전부).

- [ ] **Step 5: 커밋**

```bash
git add features/learning/review-scheduler.ts features/learning/review-scheduler.test.ts
git commit -m "feat(review-scheduler): spawnMistakeReviewTasks 추가 (오답 기반 day1 생성/강등)"
```

---

## Task 3: 세션 hook 일원화 (onComplete) + spawn 호출 + onPressRetry 삭제

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`
- Test: `features/quiz/hooks/use-review-session-screen.test.ts`

- [ ] **Step 1: 실수 약점 수집 + 순서 회귀 테스트 작성**

`features/quiz/hooks/use-review-session-screen.test.ts`에 추가(기존 테스트 파일 패턴/모킹 헬퍼 재사용). 핵심 검증: 세션 종료 시 `completeReviewTask`가 먼저, 그 다음 store 재로드 후 `spawnMistakeReviewTasks`가 호출되고, 첫 시도 오답 스텝의 `discoveredPerStepRef` 약점만 전달된다.

```ts
it('onComplete: completeReviewTask 후 store 재로드해 spawn 호출, 오답 약점만 전달', async () => {
  // Arrange: 2-step 세션, step0 정답 / step1 첫 시도 오답(weaknessId 'basic_concept_needed')
  // (기존 테스트 헬퍼로 hook 렌더 → step0 정답 선택 → step1 오답 선택 → 보충 진행 → 완료)
  // Act: onComplete() 호출
  // Assert:
  //  - completeReviewTask 호출 1회 (task.id)
  //  - 그 후 spawnMistakeReviewTasks 호출 1회, 인자 weaknessIds에 'basic_concept_needed' 포함, step0 약점 미포함
  //  - 호출 순서: completeReviewTask → store.load → spawnMistakeReviewTasks → rescheduleAllReviewNotifications
});
```

(테스트는 기존 파일의 모킹 스타일에 맞춰 `jest.mock('@/features/learning/review-scheduler')`로 `completeReviewTask`/`spawnMistakeReviewTasks` 스파이를 두고 `mock.invocationCallOrder`로 순서를 단언한다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts -t onComplete`
Expected: FAIL — `spawnMistakeReviewTasks` 미호출.

- [ ] **Step 3: import에 spawn 추가**

`features/quiz/hooks/use-review-session-screen.ts` 상단 import 수정:

```ts
import { completeReviewTask, spawnMistakeReviewTasks } from '@/features/learning/review-scheduler';
```

(`rescheduleReviewTask` import 제거 — Task 3에서 더 이상 사용 안 함.)

- [ ] **Step 4: 실수 약점 수집 헬퍼 + onComplete 구현**

기존 `onPressRemember`(약 514행)의 본문 끝부분 `try { await completeReviewTask(...) ... router.back(); }` 블록을 아래로 교체. `recordAttempt` 등 앞부분은 그대로 둔다.

```ts
    // 첫 시도 오답 스텝이 데려간 약점 전부 (완전정복; discoveredPerStepRef)
    const mistakeWeaknessIds = Array.from(
      new Set(
        firstAttemptCorrectRef.current.flatMap((correct, i) =>
          correct === false ? (discoveredPerStepRef.current[i] ?? []) : [],
        ),
      ),
    );

    try {
      await completeReviewTask(accountKey, task.id, store);
      // F4: completeReviewTask가 만든 다음 단계 task까지 보고 강등하도록 재로드 후 spawn
      await spawnMistakeReviewTasks(
        accountKey,
        task.sourceId,
        mistakeWeaknessIds,
        store,
      );
      void rescheduleAllReviewNotifications(accountKey, store).catch(console.warn);
      await refresh();
    } catch (error) {
      console.warn('Failed to complete review task', error);
    }
    router.back();
  };
```

함수명을 `onPressRemember` → `onComplete`로 rename(선언부 `const onComplete = async () => {`).

- [ ] **Step 5: onPressRetry 및 배선 삭제**

- `onPressRetry` 함수 선언 전체 삭제(약 590~602행).
- 반환 객체에서 `onPressRemember,` `onPressRetry,` 두 줄을 `onComplete,` 한 줄로 교체.
- hook 반환 타입(약 50~57행)에서 `onPressRemember: () => void;`·`onPressRetry: () => void;`를 `onComplete: () => void;`로 교체.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx jest features/quiz/hooks/use-review-session-screen.test.ts`
Expected: PASS. 추가로 `grep -rn "onPressRetry" features/quiz | grep -v test` → 0건(다음 Task에서 view 정리 후 최종 0 확인).

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-review-session-screen.ts features/quiz/hooks/use-review-session-screen.test.ts
git commit -m "feat(review-session): onComplete 일원화 + 오답 spawn 호출, onPressRetry 제거"
```

---

## Task 4: DoneView 단일 버튼 + screen-view 배선 정리

**Files:**
- Modify: `features/quiz/components/review-session/done-view.tsx`
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: DoneView prop/버튼 단순화**

`done-view.tsx`:
- `DoneViewProps`에서 `onPressRetry: () => void;` 제거. `onPressRemember`를 `onComplete: () => void;`로 rename.
- 구조분해 `onPressRetry` 제거, `onPressRemember` → `onComplete`.
- 비졸업 분기(`) : (` 이후 `<View style={styles.buttons}>` 블록)를 아래로 교체:

```tsx
        <View style={styles.buttons}>
          <Pressable
            style={[styles.primaryBtn, { flex: 1 }]}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="완료">
            <Text style={styles.primaryBtnText}>완료</Text>
          </Pressable>
        </View>
```

- 졸업 분기의 `onPress={onPressRemember}`도 `onPress={onComplete}`로 변경.
- 더 이상 쓰지 않는 스타일(`secondaryBtn`, `secondaryBtnText`, `primaryBtnDone`)이 다른 곳에서 미사용이면 제거.

- [ ] **Step 2: screen-view 배선 정리**

`review-session-screen-view.tsx`:
- props 구조분해에서 `onPressRemember,` `onPressRetry,` → `onComplete,`.
- `<DoneView ... onPressRetry={onPressRetry} onPressRemember={onPressRemember} />` → `<DoneView ... onComplete={onComplete} />`.
- props 타입 정의가 있으면 동일하게 `onComplete: () => void` 단일화.

- [ ] **Step 3: 타입체크 + 잔여 참조 0 확인**

Run: `npx tsc --noEmit` (또는 프로젝트 타입체크 스크립트)
Run: `grep -rn "onPressRetry\|onPressRemember" features/quiz | grep -v "\.test\."`
Expected: 타입 에러 0, grep 0건.

- [ ] **Step 4: 관련 테스트 실행**

Run: `npx jest features/quiz/components/review-session`
Expected: PASS (기존 done-view/entry 등 회귀 없음).

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/review-session/done-view.tsx features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review-session): 완료 화면 단일 버튼화, onComplete 배선 정리"
```

---

## Task 5: 전체 회귀 + Expo 검증

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: 전체 테스트**

Run: `npx jest features/learning features/quiz data/review-content-map.test.ts`
Expected: 전부 PASS.

- [ ] **Step 2: 졸업(day30) 경로 수동 점검**

`done-view.tsx` 졸업 분기가 단일 "홈으로 돌아가기" 버튼 + `onComplete` 호출인지 코드 확인. day30 task 완료 시 `completeReviewTask`가 다음 task 미생성(졸업)인지, spawn은 오답 있을 때만 동작하는지 확인.

- [ ] **Step 3: Expo 빌드 확인 (네이티브 변경 없음 → prebuild 불필요)**

패키지/네이티브 의존성 변경이 없으므로 `npx expo prebuild --clean` 불필요. `npx expo start`로 번들 로드만 확인(검정화면 없음).

- [ ] **Step 4: 시뮬레이터 골든 패스**

`npx expo run:ios` 후: 복습 세션 진입 → 일부 첫 시도 오답 → 보충 진행 → 완료 화면에 **단일 "완료" 버튼만** 표시 → 완료 누름 → 홈 복귀. 다음날(또는 기기 날짜 조정) 해당 오답 약점 복습이 떠 있는지 확인.

- [ ] **Step 5: 최종 커밋/푸시**

```bash
git push origin claude/gracious-raman-daec61
npm run log:commit
```

---

## Self-Review (작성자 점검 결과)

- **Spec 커버리지:** 전제1=Task4, 전제2=Task1·Task3, 전제3=Task2, 전제4=기존 `completeReviewTask` 유지(Task3에서 미변경), F1=Task1, F2=Task3 Step4(discoveredPerStepRef), F3=Task2 Step3(삭제후재생성), F4=Task3 Step4(완료→재로드→spawn 순서+테스트), F5=Task2(features/learning 순수함수). 누락 없음.
- **Placeholder:** Task3 Step1 테스트는 기존 hook 테스트 모킹 스타일 의존이라 의사코드 주석 포함 — 구현 시 기존 `use-review-session-screen.test.ts` 패턴을 그대로 따른다(완전 임의 placeholder 아님, 단언 항목 명시됨).
- **타입 일관성:** `onComplete` 명칭을 hook 반환·screen-view·DoneView 전부 통일. `spawnMistakeReviewTasks(accountKey, sourceId, WeaknessId[], store)` 시그니처가 Task2 정의와 Task3 호출에서 일치.
