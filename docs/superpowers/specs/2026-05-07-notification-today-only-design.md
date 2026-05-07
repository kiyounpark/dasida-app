# 알람 스케줄러: 오늘 태스크만 알람 대상으로 변경

**날짜**: 2026-05-07  
**상태**: 설계 완료

## 문제

`scheduleReviewNotifications`가 미완료 태스크 전체 중 날짜가 가장 이른 것을 알람 대상으로 선택한다. overdue 태스크가 있으면 오늘 태스크가 아닌 과거 태스크를 가리키는 알람이 발송된다.

## 결정

알람은 오늘 날짜(`scheduledFor == today`) 태스크만 대상으로 한다.

- 오늘 태스크 없음 → 알람 없음
- overdue 태스크 → 알람 제외, 홈 UI의 `dueReviewTasks`가 처리

## 변경 범위

**파일**: `features/quiz/notifications/review-notification-scheduler.ts`

**현재 (62-66번 줄):**
```ts
const incompleteTasks = tasks
  .filter((t) => !t.completed)
  .sort((a, b) => a.scheduledFor.slice(0, 10).localeCompare(b.scheduledFor.slice(0, 10)));

const representativeTask = incompleteTasks[0];
```

**변경 후:**
```ts
const today = toLocalDateString(new Date());
const todayTasks = tasks
  .filter((t) => !t.completed && t.scheduledFor.slice(0, 10) === today)
  .sort((a, b) => a.scheduledFor.slice(0, 10).localeCompare(b.scheduledFor.slice(0, 10)));

const representativeTask = todayTasks[0];
```

`toLocalDateString`은 파일 내 기존 함수(17번 줄)를 그대로 재사용한다.

## 역할 분리

| 레이어 | 담당 |
|--------|------|
| 알람 | 오늘 날짜 태스크만 |
| 홈 카드 UI (`dueReviewTasks`) | overdue + 오늘 태스크 모두 |

## 영향 없는 항목

- `rescheduleAllReviewNotifications` — 내부에서 `scheduleReviewNotifications` 호출하므로 자동 반영
- `scheduleTestNotification` — 개발용, 변경 없음
- 홈 UI, 복습 세션 화면 — 변경 없음
