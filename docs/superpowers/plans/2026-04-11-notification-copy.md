# 복습 알림 메시지 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 알림을 시간대당 1개로 통합하고, 아침/저녁 별도 긴박감 문구로 교체한다.

**Architecture:** `scheduleReviewNotifications`에서 미완료 과제 전체 루프를 제거하고, `scheduledFor` 기준 가장 이른 과제 1개를 대표로 선택한다. 아침/저녁 알림 identifier를 고정값(`review_morning`, `review_evening`)으로 단순화한다.

**Tech Stack:** expo-notifications, TypeScript

---

## File Map

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `features/quiz/notifications/review-notification-scheduler.ts` | Modify | 루프 → 대표 과제 1개, 고정 ID, 시간대별 문구 |

---

### Task 1: 고정 알림 ID 상수 추가 + 헬퍼 함수 정리

**Files:**
- Modify: `features/quiz/notifications/review-notification-scheduler.ts`

현재 `morningId(taskId)`, `eveningId(taskId)` 함수와 `cancelReviewNotifications(taskId)` 는 task별 ID를 쓰는데, 고정 ID 방식으로 전환하면 불필요해진다. 미사용 함수를 제거하고 고정 ID 상수를 추가한다.

- [ ] **Step 1: 기존 헬퍼 함수 3개를 고정 상수 2개로 교체**

`features/quiz/notifications/review-notification-scheduler.ts` 에서 아래 코드를:

```typescript
const NOTIFICATION_ID_PREFIX = 'review_';

function morningId(taskId: string) {
  return `${NOTIFICATION_ID_PREFIX}${taskId}_morning`;
}

function eveningId(taskId: string) {
  return `${NOTIFICATION_ID_PREFIX}${taskId}_evening`;
}
```

다음으로 교체:

```typescript
const NOTIFICATION_ID_PREFIX = 'review_';
const MORNING_NOTIFICATION_ID = 'review_morning';
const EVENING_NOTIFICATION_ID = 'review_evening';
```

- [ ] **Step 2: `cancelReviewNotifications` 함수 삭제**

아래 함수 전체를 삭제 (외부에서 호출하는 곳 없음):

```typescript
/**
 * 특정 task 알림 취소 (아침 + 저녁).
 */
export async function cancelReviewNotifications(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(morningId(taskId)).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(eveningId(taskId)).catch(() => {});
}
```

- [ ] **Step 3: 타입 체크로 컴파일 오류 확인**

```bash
npx tsc --noEmit
```

오류 없으면 다음 단계 진행.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/notifications/review-notification-scheduler.ts
git commit -m "refactor(notifications): task별 ID 헬퍼 제거, 고정 ID 상수로 전환"
```

---

### Task 2: `scheduleReviewNotifications` 로직 교체

**Files:**
- Modify: `features/quiz/notifications/review-notification-scheduler.ts`

전체 루프를 제거하고, 가장 이른 과제 1개 선택 + 시간대별 문구 분기로 교체한다.

- [ ] **Step 1: `scheduleReviewNotifications` 함수 본문을 아래로 교체**

기존:

```typescript
export async function scheduleReviewNotifications(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const tasks = await store.load(accountKey);
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const now = new Date();

  for (const task of incompleteTasks) {
    const label = task.weaknessId ? diagnosisMap[task.weaknessId]?.labelKo : undefined;
    const title = label ? `${label}, 잊기 전에 확인해요` : '오늘 복습이 기다리고 있어요';
    const body = '3분만 다시 보면 기억이 살아납니다 →';

    const morningDate = buildScheduledDate(task.scheduledFor, MORNING_HOUR, MORNING_MINUTE);
    const eveningDate = buildScheduledDate(task.scheduledFor, EVENING_HOUR, EVENING_MINUTE);

    if (morningDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: morningId(task.id),
        content: {
          title,
          body,
          sound: 'default',
          data: { taskId: task.id },
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
        identifier: eveningId(task.id),
        content: {
          title,
          body,
          sound: 'default',
          data: { taskId: task.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: eveningDate,
          channelId: 'review',
        },
      });
    }
  }
}
```

교체 후:

```typescript
export async function scheduleReviewNotifications(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const tasks = await store.load(accountKey);
  const incompleteTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  const representativeTask = incompleteTasks[0];
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
  const morningDate = buildScheduledDate(
    representativeTask.scheduledFor,
    MORNING_HOUR,
    MORNING_MINUTE,
  );
  const eveningDate = buildScheduledDate(
    representativeTask.scheduledFor,
    EVENING_HOUR,
    EVENING_MINUTE,
  );

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

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

오류 없으면 다음 단계 진행.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/notifications/review-notification-scheduler.ts
git commit -m "feat(notifications): 시간대별 긴박감 문구 + 대표 과제 1개 알림 구조"
```

---

### Task 3: 개발 기기에서 수동 검증

**Files:** 없음 (코드 변경 없음)

dev 빌드(`npm start`)로 기기 연결 후 아래 시나리오를 확인한다.

- [ ] **Step 1: 앱 실행 후 설정 탭 → "알림 테스트 (5초 후)" 버튼 탭**

기대: 5초 후 `판별식, 잊기 전에 확인해요` 테스트 알림 수신 (테스트 버튼은 scheduleTestNotification 별도 함수 사용 — 이번 변경과 무관)

- [ ] **Step 2: `scheduleTestNotification` 의 문구도 새 스타일로 업데이트**

`features/quiz/notifications/review-notification-scheduler.ts` 내 `scheduleTestNotification` 의 title/body를 새 문구로 교체:

```typescript
export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: 'dev-test-notification',
    content: {
      title: '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
      sound: 'default',
      data: { taskId: 'dev-test-task' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: 'review',
    },
  });
}
```

- [ ] **Step 3: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
git add features/quiz/notifications/review-notification-scheduler.ts
git commit -m "fix(notifications): 테스트 알림 문구도 새 스타일로 통일"
```

- [ ] **Step 4: 푸시**

```bash
git push origin main
npm run notify:done -- "복습 알림 메시지 개선 완료 — 아침/저녁 긴박감 문구, 대표 과제 1개 발송 구조"
```
