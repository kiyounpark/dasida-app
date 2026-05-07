# 알람 스케줄러 오늘 태스크 전용 필터링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 알람이 오늘 날짜(`scheduledFor == today`) 미완료 태스크만 대상으로 발송되도록 스케줄러를 변경한다.

**Architecture:** `scheduleReviewNotifications`에서 태스크 선택 로직을 순수 함수 `pickTodayRepresentativeTask`로 분리해 단위 테스트 가능하게 만들고, 본 함수에서 이를 호출한다. 동시에 더 이상 필요 없는 fallback(슬롯 경과 시 다음날로 이동) 블록을 제거한다.

**Tech Stack:** TypeScript, Jest, `expo-notifications`

**Spec:** [docs/superpowers/specs/2026-05-07-notification-today-only-design.md](../specs/2026-05-07-notification-today-only-design.md)

---

## File Structure

- **Modify**: `features/quiz/notifications/review-notification-scheduler.ts`
  - 새 export: `pickTodayRepresentativeTask(tasks, today)` (순수 함수)
  - `scheduleReviewNotifications` 본문에서 신규 helper 사용
  - fallback 블록 제거 및 관련 `let` → `const` 변경
- **Create**: `features/quiz/notifications/review-notification-scheduler.test.ts`
  - `pickTodayRepresentativeTask` 단위 테스트

순수 함수로 분리하는 이유: `scheduleReviewNotifications`는 `expo-notifications` 부수효과를 갖고 있어 순수 단위 테스트가 어렵다. 선택 로직만 분리하면 깔끔하게 테스트 가능하다.

---

### Task 1: pickTodayRepresentativeTask 순수 함수 추출 및 테스트

**Files:**
- Create: `features/quiz/notifications/review-notification-scheduler.test.ts`
- Modify: `features/quiz/notifications/review-notification-scheduler.ts` (export 추가)

- [ ] **Step 1: 테스트 파일 작성 (실패 예상)**

`features/quiz/notifications/review-notification-scheduler.test.ts` 생성:

```ts
import type { ReviewTask } from '@/features/learning/types';

import { pickTodayRepresentativeTask } from './review-notification-scheduler';

function makeTask(overrides: Partial<ReviewTask> & { id: string; scheduledFor: string }): ReviewTask {
  return {
    accountKey: 'acct',
    weaknessId: 'fn-limit',
    source: 'featured-exam',
    sourceId: 'src-1',
    stage: 'day1',
    completed: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  } as ReviewTask;
}

describe('pickTodayRepresentativeTask', () => {
  const today = '2026-05-07';

  it('returns the today task when one exists', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-07' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)?.id).toBe('t1');
  });

  it('ignores completed tasks even if scheduled for today', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-07', completed: true }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)).toBeUndefined();
  });

  it('ignores overdue tasks', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-03' }),
      makeTask({ id: 't2', scheduledFor: '2026-05-05' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)).toBeUndefined();
  });

  it('ignores future tasks', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-08' }),
      makeTask({ id: 't2', scheduledFor: '2026-05-10' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)).toBeUndefined();
  });

  it('picks a today task when overdue and future tasks coexist', () => {
    const tasks = [
      makeTask({ id: 'overdue', scheduledFor: '2026-05-03' }),
      makeTask({ id: 'today', scheduledFor: '2026-05-07' }),
      makeTask({ id: 'future', scheduledFor: '2026-05-10' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)?.id).toBe('today');
  });

  it('handles ISO timestamp scheduledFor (YYYY-MM-DDTHH:mm:ss.sssZ)', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledFor: '2026-05-07T00:00:00.000Z' }),
    ];
    expect(pickTodayRepresentativeTask(tasks, today)?.id).toBe('t1');
  });

  it('returns undefined for empty input', () => {
    expect(pickTodayRepresentativeTask([], today)).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx jest features/quiz/notifications/review-notification-scheduler.test.ts`
Expected: FAIL — `pickTodayRepresentativeTask` import 실패 (export되지 않음)

- [ ] **Step 3: 순수 함수 export 추가**

`features/quiz/notifications/review-notification-scheduler.ts` 상단에 import 추가하고, 파일 적당한 위치(예: `buildScheduledDate` 함수 바로 다음)에 다음 함수를 추가:

```ts
import type { ReviewTask } from '@/features/learning/types';

// ... (기존 import 들 아래에)

/**
 * 미완료 태스크 중 오늘 날짜(`scheduledFor`의 YYYY-MM-DD가 today와 일치)인 첫 번째 태스크를 반환.
 * 오늘 태스크가 없으면 undefined.
 */
export function pickTodayRepresentativeTask(
  tasks: ReviewTask[],
  today: string,
): ReviewTask | undefined {
  return tasks.find(
    (t) => !t.completed && t.scheduledFor.slice(0, 10) === today,
  );
}
```

`ReviewTask` 타입 import 경로는 `features/learning/types.ts`에 있으니 거기서 가져온다. 기존 파일에 이미 `ReviewTaskStore`를 import하고 있으니 같은 경로 패턴을 따른다.

- [ ] **Step 4: 테스트 재실행해서 통과 확인**

Run: `npx jest features/quiz/notifications/review-notification-scheduler.test.ts`
Expected: PASS — 7 tests pass

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/notifications/review-notification-scheduler.ts \
        features/quiz/notifications/review-notification-scheduler.test.ts
git commit -m "feat(notifications): add pickTodayRepresentativeTask pure helper"
```

---

### Task 2: scheduleReviewNotifications 리팩터링 + fallback 제거

**Files:**
- Modify: `features/quiz/notifications/review-notification-scheduler.ts:54-140`

- [ ] **Step 1: 기존 함수 본문 교체**

`scheduleReviewNotifications` 본문을 다음과 같이 교체한다. 변경점:
1. `incompleteTasks` 정렬 + 첫 번째 선택 → `pickTodayRepresentativeTask` 사용
2. 한 번 결정된 `scheduledDateString`은 변경되지 않으므로 `let` → `const`
3. fallback 블록(91-105번 줄에 해당하는 부분) 제거

```ts
export async function scheduleReviewNotifications(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const tasks = await store.load(accountKey);
  const today = toLocalDateString(new Date());
  const representativeTask = pickTodayRepresentativeTask(tasks, today);
  if (!representativeTask) return;

  const label = representativeTask.weaknessId
    ? diagnosisMap[representativeTask.weaknessId]?.labelKo
    : undefined;

  const morningTitle = label
    ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
    : '벌써 잊혀지고 있어요. 지금 3분이면 돼요';
  const morningBody = '오늘 안 하면 내일 처음부터예요';

  const eveningTitle = label
    ? `${label}, 오늘 자기 전 마지막 기회예요`
    : '오늘 복습 마감, 자기 전 3분만요';
  const eveningBody = '잠들기 전 3분, 기억이 굳어져요';

  const now = new Date();

  const scheduledDateString = representativeTask.scheduledFor.slice(0, 10);
  const morningDate = buildScheduledDate(scheduledDateString, MORNING_HOUR, MORNING_MINUTE);
  const eveningDate = buildScheduledDate(scheduledDateString, EVENING_HOUR, EVENING_MINUTE);

  if (morningDate > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_NOTIFICATION_ID,
      content: {
        title: morningTitle,
        body: morningBody,
        sound: 'default',
        data: { taskId: representativeTask.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: morningDate,
        channelId: 'review',
      },
    });
  }

  if (eveningDate > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_NOTIFICATION_ID,
      content: {
        title: eveningTitle,
        body: eveningBody,
        sound: 'default',
        data: { taskId: representativeTask.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: eveningDate,
        channelId: 'review',
      },
    });
  }
}
```

`store` 파라미터는 여전히 `tasks` 로드용으로 사용되므로 시그니처는 그대로. `saveAll` 호출이 사라지므로 store가 read-only 용도로만 쓰임.

- [ ] **Step 2: 타입 체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: PASS — 타입 에러 없음

- [ ] **Step 3: 기존 단위 테스트 재실행**

Run: `npx jest features/quiz/notifications/review-notification-scheduler.test.ts`
Expected: PASS — Task 1에서 추가한 테스트 7개 모두 통과 (helper 분리 그대로라 영향 없음)

- [ ] **Step 4: 변경 부위 수동 점검**

`features/quiz/notifications/review-notification-scheduler.ts` 파일을 열어 다음을 확인:
- `incompleteTasks` 변수 더 이상 존재하지 않음
- `let scheduledDateString` / `let morningDate` / `let eveningDate` 표현 없음 (모두 `const`)
- "Fallback: if both slots have already passed" 주석 제거됨
- `store.saveAll` 호출 제거됨
- `MORNING_NOTIFICATION_ID`, `EVENING_NOTIFICATION_ID` 알람 예약 블록 두 개 그대로 유지

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/notifications/review-notification-scheduler.ts
git commit -m "feat(notifications): scope review alarms to today's tasks only

- Use pickTodayRepresentativeTask to filter today scheduledFor
- Remove fallback that auto-advanced overdue today task to tomorrow
- Overdue tasks are handled by home UI dueReviewTasks; alarm should
  not point to overdue or future tasks"
```

---

### Task 3: 통합 검증 (수동)

**Files:** None (실기기/시뮬레이터 검증)

- [ ] **Step 1: Expo prebuild 필요 여부 확인**

본 변경은 JS only 변경이며 네이티브 의존성 추가/변경 없음. `expo prebuild --clean` 불필요.

- [ ] **Step 2: 시뮬레이터 실행**

Run: `npx expo run:ios`

- [ ] **Step 3: 수동 시나리오 검증**

다음 케이스를 확인:
1. 진단 완료 직후 → `rescheduleAllReviewNotifications` 호출됨. day1 태스크는 내일 날짜이므로 오늘 알람 예약되지 않음 (정상).
2. 오늘 날짜 복습 태스크가 존재하는 상태(테스트 데이터로 강제 세팅 또는 시점 시뮬레이션)에서 앱 마운트 → 7:30/20:00 알람이 예약되는지 expo-notifications 로그/기기 알람 목록에서 확인.
3. overdue 태스크만 있는 상태에서 앱 마운트 → 알람 예약되지 않음, 홈 UI 카드만 노출되는지 확인.

(이 단계는 사람의 검증이 필요하며, 자동화된 테스트로는 expo-notifications 부수효과까지 커버하기 어렵다.)

- [ ] **Step 4: 검증 결과 요약 보고**

수동 검증 결과를 사용자에게 한 줄 요약으로 보고.
