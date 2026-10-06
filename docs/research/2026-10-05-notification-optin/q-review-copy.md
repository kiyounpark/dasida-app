작업 폴더(git worktree): `/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin` — 브랜치 notif-optin.

DASIDA 저장소의 커밋 `39219fc7` 하나만 리뷰해라. 파일은 읽기만 한다. 아무것도 고치지 않는다.

- 보는 법: `/usr/bin/git show 39219fc7` (rtk가 `git show`를 요약판으로 줄이니 반드시 이 경로로). 바뀐 파일의 주변 코드는 직접 열어 봐라.
- 앞 커밋들(`0147826a` · `9c912f13` · `77d9b245`)은 리뷰가 끝났다 — 다시 보지 마라.

## 바뀐 것
- 아침 알림 본문이 과제 단계로 세 갈래(앱 `features/quiz/notifications/review-reminder-copy.ts` · 서버 `functions/src/review-reminder-copy.ts`, 문자열은 양쪽 같아야 한다): day1 / day3 이상(「오늘 놓치면 N일차로 돌아가요」) / 어제 놓친 과제(`missed`).
- 서버 `functions/src/send-review-reminders.ts`: 대표 과제 문서의 `stage`·`scheduledFor`로 갈래를 정함(`reminderTaskFor` in `review-reminder-core.ts`), `pickRepresentativeTaskIdByAccount` → `pickRepresentativeTaskByAccount`(문서째 반환). 저녁 문구는 그대로.
- 앱 로컬(게스트) 스케줄러 `review-notification-scheduler.ts`: 오늘 과제의 stage로 due.
- 홈 배지 `features/quiz/components/review-home-card.tsx` `reviewDeadlineBadge`: day1 / 그 위는 숫자.
- 허락 카드 안내 문구 「아침·저녁」.
- `getPreviousReviewStage`를 `features/learning/review-stage.ts`로 꺼내고 `review-scheduler.ts`의 private 사본을 지움(한 칸 내림 로직은 같은 값을 써야 한다).

## 이미 정한 것 — 다시 열지 마라
- 문구 자체(기윤 10.06 한 줄씩 확정): 좋고 나쁨은 묻지 않는다.
- 놓친 복습 한 칸 내림 규칙(🔒 10.06, `77d9b245`) · 놓친 다음 날 아침 1회(`0147826a`).

## 묻는 것
이 커밋에 **「반드시 고칠 것」**이 있나 — 예: 학생이 받는 문구가 실제 상태와 어긋남(1일차에 「돌아가요」가 감 · 놓친 과제에 「오늘 놓치면」이 감 · 숫자가 틀림), 앱·서버 문자열 불일치, 알림이 안 가게 되는 회귀, 한 칸 내림 동작이 바뀜. 없으면 첫 줄에 「반드시 고칠 것: 없음」이라고 그대로 써라. 권고는 세 줄 안. 근거는 파일:줄. 한국어 15줄 안.

Claude가 이미 본 것(같은 말이면 권고에서 빼도 된다):
- 앱이 열 때 한 칸 내리며 날짜를 오늘로 옮기므로, 학생이 7:30 전에 앱을 열었다면 그날 아침 대표 과제는 이미 내려간 단계(due)다 — 그 단계 기준 문구가 맞다고 봄.
- 저녁 「{label}, 오늘 자기 전 마지막 기회예요」는 day1에선 「마지막」이 엄밀하진 않다(day1은 안 내려감) — 이번 범위 밖, 기록만.
- 「하루 만에」는 1일차 과제가 틀린 다음 날이라는 전제. 3일차를 놓쳐 1일차로 내려간 과제가 그날 아침 대표가 되면(7:30 전에 연 경우만) 「하루 만에」가 엄밀하지 않다 — 드묾, 기록만.
