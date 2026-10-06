# astra — 문구 커밋 39219fc7 리뷰 (2026-10-06, gpt-6-astra 45,058토큰)

반드시 고칠 것: 없음

- 아침 세 갈래와 숫자(day3→1, day7→3, day30→7)가 앱·서버에서 일치합니다. 근거: [앱 review-reminder-copy.ts:38](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/notifications/review-reminder-copy.ts:38), [서버 review-reminder-copy.ts:38](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/review-reminder-copy.ts:38).
- 서버는 오늘 과제를 우선하고, 어제 과제는 `missed`로 분기하며 같은 과제 ID를 전송합니다. 근거: [review-reminder-core.ts:139](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/review-reminder-core.ts:139), [send-review-reminders.ts:100](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/send-review-reminders.ts:100).
- 로컬은 오늘 과제의 단계로 문구를 생성합니다. 변경으로 인한 예약·발송 회귀는 발견하지 못했습니다. 근거: [review-notification-scheduler.ts:81](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/notifications/review-notification-scheduler.ts:81).
- 한 칸 내림 함수는 기존 구현과 동일하며 홈 배지도 같은 함수를 사용합니다. 근거: [review-stage.ts:26](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/learning/review-stage.ts:26), [review-home-card.tsx:28](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/components/review-home-card.tsx:28).

`39219fc7`과 주변 코드만 읽었습니다. 파일 수정·테스트 실행은 하지 않았습니다.
