# 복습 알림 (Push Notification) — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Goal

에빙하우스 복습 스케줄(Day1→Day3→Day7→Day30)에 맞춰 로컬 push notification을 발송한다.
고1~고3 타겟 기준 아침 7:30 + 저녁 8:00 하루 두 번 고정 알림으로 재방문을 유도한다.

## Background

- `ReviewTask` / `LocalReviewTaskStore` 이미 존재 (`features/learning/review-task-store.ts`)
- `completeReviewTask`, `rescheduleReviewTask`, `applyOverduePenalties` 이미 구현 (`features/learning/review-scheduler.ts`)
- `applyOverduePenalties`는 홈 화면 마운트 시 1회 실행되며 overdue task의 stage를 한 단계 하락시키고 `scheduledFor`를 갱신함
- `expo-notifications` 미설치 — 신규 추가 필요 (native module이므로 prebuild 필요)

## 확정된 설계

### 1. 알림 시간

| 알림 | 시간 |
|------|------|
| 아침 | 07:30 |
| 저녁 | 20:00 |

고1~고3 등교 전(7:30)과 야자 전후(20:00) 기준. 사용자 커스텀 없는 고정값.

### 2. 알림 예약 트리거

| 상황 | 동작 |
|------|------|
| 진단 완료 | Day1 알림 예약 (scheduledFor 날짜 기준, 아침+저녁 2개) |
| 복습 완료 ("기억났어요") | 현재 task 알림 취소 → 다음 stage scheduledFor 기준 재예약 |
| 복습 재예약 ("다시 볼게요") | 현재 task 알림 취소 → 새 scheduledFor 기준 재예약 |
| 앱 홈 마운트 (overdue penalty 후) | 전체 알림 취소 → 현재 미완료 task 목록 기준 재예약 |
| Day30 완료 (졸업) | 복습 관련 알림 전체 취소 |

### 3. 권한 요청 시점

진단 완료 직후 결과 화면에서 opt-in 요청.
- 학습 결과를 확인한 직후라 알림 필요성을 자연스럽게 납득하는 시점
- 거절해도 앱 정상 동작 (알림만 비활성)
- 거절 시 알림 예약 시도하지 않음 (시스템 설정에서 나중에 켤 수 있음)

### 4. 알림 문구

약점 이름을 포함해 개인화. 약점 이름을 알 수 없는 경우 fallback 사용.

| 케이스 | 제목 | 본문 |
|--------|------|------|
| 약점 이름 있음 | `{약점명}, 잊기 전에 확인해요` | `3분만 다시 보면 기억이 살아납니다 →` |
| fallback | `오늘 복습이 기다리고 있어요` | `잠깐 들어와서 기억을 살려보세요 →` |

### 5. 알림 탭 시 딥링크

알림 탭 → `/quiz/review-session` 직접 진입.
`app/_layout.tsx`의 `Notifications.addNotificationResponseReceivedListener`에서 처리.

### 6. 알림 식별자 규칙

task별 알림 2개를 관리하기 위해 identifier 규칙을 고정:

```
review_{taskId}_morning   ← 아침 7:30
review_{taskId}_evening   ← 저녁 20:00
```

취소 시 두 identifier 모두 `cancelScheduledNotificationAsync`로 삭제.

### 7. overdue penalty 후 알림 재예약 흐름

```
앱 홈 마운트
  → applyOverduePenalties()       ← 기존 코드
  → rescheduleAllReviewNotifications()  ← 신규 추가
  → refresh()
```

`rescheduleAllReviewNotifications`: 전체 알림 취소 후 미완료 task 목록의 scheduledFor 기준으로 재예약.

## 변경 파일

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `package.json` | Modify | `expo-notifications` 추가 |
| `app.json` | Modify | iOS `UIBackgroundModes`, Android notification 권한 설정 |
| `features/quiz/notifications/review-notification-scheduler.ts` | Create | `scheduleReviewNotifications`, `cancelReviewNotifications`, `rescheduleAllReviewNotifications`, `requestNotificationPermission` |
| `features/quiz/hooks/use-result-screen.ts` | Modify | 진단 완료 시 권한 요청 + Day1 알림 예약 |
| `features/learning/review-scheduler.ts` | Modify | `completeReviewTask`, `rescheduleReviewTask` 완료 후 알림 재예약 호출 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | Modify | `applyOverduePenalties` 후 `rescheduleAllReviewNotifications` 호출 |
| `app/_layout.tsx` | Modify | `addNotificationResponseReceivedListener` 등록 → `/quiz/review-session` 딥링크 |

## Out of Scope

- 사용자 커스텀 알림 시간 (추후 설정 화면에서 추가 가능)
- FCM 서버발송 (Phase 2)
- 알림 설정 화면 내 opt-out 버튼 (시스템 설정에서 끌 수 있음)
- 알림 클릭 통계/analytics

## Future

- 설정 화면에서 알림 시간 커스텀
- FCM 기반 원격 알림으로 전환
- 알림 클릭 후 학습 진입률 측정
