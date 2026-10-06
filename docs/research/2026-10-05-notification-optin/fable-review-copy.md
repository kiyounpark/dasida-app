# Fable — 문구 커밋 39219fc7 리뷰 (2026-10-06)

반드시 고칠 것: 없음

근거(커밋 `39219fc7`, `/usr/bin/git show`로 읽음 · 주변 파일 직접 엶):
- 1일차에 「돌아가요」 안 감: 앱 `features/quiz/notifications/review-reminder-copy.ts:42-46`(getPreviousReviewStage→null이면 day1 문구) · 서버 `functions/src/review-reminder-copy.ts:5-10,42-46`(STEP_DOWN_DAY.day1=null). 모르는 단계도 day1로 떨어짐(`functions/src/review-reminder-core.ts:176`).
- 놓친 과제에 「오늘 놓치면」 안 감: 서버 `review-reminder-core.ts:172-174`(scheduledFor < todayGte → missed). 로컬(게스트)은 오늘 날짜 과제만 고름(`review-notification-scheduler.ts:36-43,89`) — 놓친 건 열 때 오늘로 옮겨지니(`review-scheduler.ts:142-147`) 내려간 단계 기준 문구가 맞음.
- 숫자: `review-stage.ts:3-10`(day3→day1=1 · day7→day3=3 · day30→day7=7) = 서버 STEP_DOWN_DAY(1·3·7). 문자열 비교는 양쪽 다 `YYYY-MM-DDT00:00:00.000Z` 꼴이라 안전(`review-scheduler.ts:19-23`, `local-learning-history-repository.ts:49-53`, `review-reminder-core.ts:5-16`).
- 앱·서버 문자열: 두 파일의 리터럴·템플릿 전부 뽑아 대조 — 제목 2종·저녁 2종·아침 3갈래 모두 같음(양쪽 23-24·30-32·40·44·46줄).
- 알림 회귀 없음: `send-review-reminders.ts:96-102` 대표 과제 없으면 continue는 그대로, reminderTaskFor는 throw 경로 없음. 저녁은 lookback 0이라 항상 due, 문구는 단계 무관.
- 한 칸 내림 동작 그대로: `review-stage.ts:26-29`는 지운 private 함수와 본문이 같고, `review-scheduler.ts:142` 호출 자리만 바뀜.
- 직접 돌림: functions `npm test` 295/295 통과 · 앱 jest 해당 경로 18 suites/122 통과 · `tsc --noEmit` 0.

권고(기록만):
- `review-notification-scheduler.ts:155` 개발용 테스트 알림 body가 옛 문구 「오늘 안 하면 내일 처음부터예요」 — __DEV__ 전용이라 학생엔 안 감.
- 서버 STEP_DOWN_DAY(`functions/src/review-reminder-copy.ts:5-10`)는 앱 단계표의 손 사본 — 지금은 양쪽 테스트가 1·3·7을 못 박아 드리프트가 바로 깨짐. 단계를 늘리면 두 곳.
