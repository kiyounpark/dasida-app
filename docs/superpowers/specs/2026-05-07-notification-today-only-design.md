# 알람 스케줄러: 오늘 태스크만 알람 대상으로 변경

**날짜**: 2026-05-07
**상태**: 설계 완료

## 문제

`scheduleReviewNotifications`가 미완료 태스크 전체 중 날짜가 가장 이른 것을 알람 대상으로 선택한다. overdue 태스크가 있으면 오늘 태스크가 아닌 과거 태스크를 가리키는 알람이 발송된다.

## 결정

알람은 오늘 날짜(`scheduledFor == today`) 태스크만 대상으로 한다.

- 오늘 태스크 없음 → 알람 없음
- overdue 태스크 → 알람 제외, 홈 UI의 `dueReviewTasks`가 처리
- 오늘 태스크가 있지만 7:30/20:00 두 슬롯 모두 지난 시점에 호출됨 → 알람 없음 (다음날 `applyOverduePenalties`가 자연스럽게 처리)

## 변경 범위

**파일**: `features/quiz/notifications/review-notification-scheduler.ts`

### 1. 태스크 선택 로직 (62-66번 줄)

**현재:**
```ts
const incompleteTasks = tasks
  .filter((t) => !t.completed)
  .sort((a, b) => a.scheduledFor.slice(0, 10).localeCompare(b.scheduledFor.slice(0, 10)));

const representativeTask = incompleteTasks[0];
```

**변경 후:**
```ts
const today = toLocalDateString(new Date());
const todayTasks = tasks.filter(
  (t) => !t.completed && t.scheduledFor.slice(0, 10) === today,
);
const representativeTask = todayTasks[0];
```

- 모든 todayTasks가 같은 날짜이므로 정렬 불필요
- `toLocalDateString`은 파일 내 기존 함수(17번 줄) 재사용

### 2. Fallback 로직 제거 (91-105번 줄)

**현재:**
```ts
// Fallback: if both slots have already passed (e.g. user completed diagnostic after 20:00),
// advance to tomorrow so at least the next morning slot fires.
// Also update the store so applyOverduePenalties does not wrongly penalize this task.
if (morningDate <= now && eveningDate <= now) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  scheduledDateString = toLocalDateString(tomorrow);
  morningDate = buildScheduledDate(scheduledDateString, MORNING_HOUR, MORNING_MINUTE);
  eveningDate = buildScheduledDate(scheduledDateString, EVENING_HOUR, EVENING_MINUTE);

  const updatedTasks = tasks.map((t) =>
    t.id === representativeTask.id ? { ...t, scheduledFor: scheduledDateString } : t,
  );
  await store.saveAll(accountKey, updatedTasks);
}
```

**변경 후:** 블록 전체 삭제. 동시에 `scheduledDateString`/`morningDate`/`eveningDate`를 `let`에서 `const`로 변경.

**근거**:
- 모든 태스크가 `addDaysToToday(REVIEW_STAGE_OFFSETS[stage])` (N ≥ 1)로 생성됨 → 생성 시점에 "오늘 날짜 + 양 슬롯 지남" 케이스 없음
- 오늘 태스크가 양 슬롯 모두 지난 상태로 남는 경우는 사용자가 하루 종일 앱을 열지 않은 케이스 → `applyOverduePenalties`가 정상적으로 패널티 부과하는 게 의도된 흐름
- 자동으로 다음날로 미루는 동작은 사용자에게 불투명하고 패널티를 회피시킴

## 동작 비교

| 시나리오 | 현재 동작 | 변경 후 |
|---------|----------|---------|
| 오늘 태스크 있음, 슬롯 미경과 | 오늘 알람 예약 | 동일 |
| 오늘 태스크 없음, overdue만 있음 | overdue 태스크로 알람 (내일 슬롯) | 알람 없음 |
| 오늘 태스크 있음, 양 슬롯 경과 | 내일로 자동 이동 + 내일 알람 | 알람 없음, 태스크는 그대로 (다음날 패널티) |

## 역할 분리

| 레이어 | 담당 |
|--------|------|
| 알람 | 오늘 날짜 태스크만 |
| 홈 카드 UI (`dueReviewTasks`) | overdue + 오늘 태스크 모두 |
| `applyOverduePenalties` | overdue 태스크 stage 하락 처리 |

## 영향 없는 항목

- `rescheduleAllReviewNotifications` — 내부에서 `scheduleReviewNotifications` 호출하므로 자동 반영
- `scheduleTestNotification` — 개발용, 변경 없음
- 홈 UI, 복습 세션 화면 — 변경 없음
- `applyOverduePenalties` — 변경 없음, 기존 동작 유지

## 검증

- 오늘 날짜 태스크가 있는 상태에서 `scheduleReviewNotifications` 호출 → 7:30/20:00 알람 예약 확인
- overdue 태스크만 존재 → 알람 예약 안 됨 확인
- 미완료 태스크 없음 → 알람 예약 안 됨 (early return)
