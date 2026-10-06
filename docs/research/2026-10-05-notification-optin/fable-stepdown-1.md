# Fable 1차 — 놓친 복습 「한 칸 내림」 모양 (q-missed-stepdown.md, 2026-10-05 밤, 145,017토큰)

## R1. 「한 칸 내림」 모양 (제안 — 코드로 확인한 근거 붙임)
- **언제**: 앱을 열 때, 지금 repair가 도는 자리 그대로(`features/quiz/hooks/use-quiz-hub-screen.ts:95-110`, `[session?.accountKey]` — 켤 때 1회, 포커스마다 아님). 서버엔 안 넣는다: 손님(로컬 저장)도 있어 앱 쪽은 어차피 필요하고, 서버는 앱이 saveAll한 목록을 id로 diff해 따라온다(`functions/src/learning-history.ts:615-624` upsert/delete, `1162-1171` batch set/delete). 끝낼 때는 안 내린다.
- **며칠 = 한 칸**: 열었을 때 `scheduledFor(앞 10글자) < 오늘`이면 한 칸 — 며칠 지났든 한 번 여는 데 한 칸. 1.0.11 판정 그대로(`git show 0c45017`: `>= today`면 건너뜀). 매일 열고 안 하면 매일 한 칸 = 기윤 원문 「하나씩」. (지난 날수만큼 여러 칸은 안 권함 — 돌아온 학생을 더 때린다.)
- **날짜 = 오늘(돌아온 날)**. 이유 둘: ⓐ가 사라지고(홈 due는 `<= today`, `features/learning/local-learning-history-repository.ts:78-80` · 서버 `learning-history.ts:548-550`), 「같은 과제가 같은 날 또 내려가는」 문제가 공짜로 풀린다 — 오늘로 밀면 `< 오늘`이 거짓이라 새 필드(missedAt 같은 것) 없이 1회로 끝난다. 서버 스키마(`learning-history.ts:255-268`) 안 건드림. 1.0.11의 「오늘+간격」은 안 쓴다.
- **id도 새 단계로 다시 만든다**(`functions/src/review-task-contract.ts:31`). 안 그러면 ⓑ 재발: 앱 completeReviewTask는 id로 다음 단계를 세고(`features/learning/review-scheduler.ts:53`), 서버 buildReviewTasks는 stage로 센다(`learning-history.ts:861`; 복습 끝낼 때 서버 기록이 먼저 `use-review-session-screen.ts:605-607`, 앱 complete가 뒤 `:643`). id=stage여야 둘이 같다. 옛 id는 목록에서 빼면 서버가 삭제한다.
- **충돌 주의**: 내려간 단계 id(`…__day3`)는 이미 **완료된** 문서로 남아 있을 수 있다. `spawnMistakeReviewTasks`가 이미 같은 방식(완료된 `__day1` 그대로 두고 새 `__day1` push, `review-scheduler.ts:161-174`)이라 전례는 있지만, 로컬 배열에 같은 id가 둘이면 `find`(`:43`)가 완료본을 먼저 잡는다. 내릴 땐 **완료된 같은 id도 목록에서 빼고** 새로 넣을 것. 서버는 merge:true(`:1163-1167`)라 옛 completedAt 찌꺼기가 남을 수 있다 — 읽는 곳이 있는지는 확인 안 했다.
- **1.0.11이 내려 둔 과제(id day3·stage day1)**: 새 규칙에선 「이미 한 칸 내려간 것」이 맞다. `repairDemotedReviewTasks`(`review-scheduler.ts:101-119`)를 뒤집는다 — stage를 id로 되돌리지 말고 **id를 stage로 다시 만든다**(날짜는 그대로; 지났으면 그날 또 한 칸). 운영에 몇 건인지는 모른다 — Firestore `reviewTasks` 그룹에서 id 꼬리≠stage를 세면 나온다(안 돌렸음).

## R2. 알림·문구
- 놓친 다음 날 아침 1회(`functions/src/review-reminder-core.ts:21-23`, 07:30 KST `send-review-reminders.ts:143`)는 그대로 맞다. 단 날짜를 오늘로 밀면 「열고 안 한 날」마다 다음 날 아침 또 1회 간다(발송 기록이 날짜별, `review-reminder-core.ts:47-53`) — 안 열면 하루 뒤 끊김. 이 모양이 맞는지는 기윤 판단.
- 아침 본문 「내일도 홈에 그대로 남아요」는 거짓이 된다. 두 파일 같이(`functions/src/review-reminder-copy.ts:15` · `features/quiz/notifications/review-reminder-copy.ts:14`, 서버 주석이 「문자열 동일」 요구). 초안: 「오늘 안 하면 한 단계 내려가요」. 옛 「내일 처음부터예요」도 거짓(day1까진 안 감). dev 테스트 알림 `review-notification-scheduler.ts:153`은 개발용이라 무관.
- 홈 배지 「오늘 안 하면 리셋」(`features/quiz/components/review-home-card.tsx:69`) → 「오늘 안 하면 한 칸 내려가요」가 정확. day1 과제엔 내려갈 데가 없어 거짓 — day1이면 「오늘 안 하면 내일 또 떠요」로 갈라야 한다(초안).
- 손님 로컬 알림은 **오늘 날짜 과제만** 잡는다(`review-notification-scheduler.ts:41` `=== today`) → 놓친 과제엔 0건. 날짜를 오늘로 밀면 열 때 재예약(`use-quiz-hub-screen.ts:115`)으로 그날 알림이 잡힌다. 정확히 말하면 「다음에 열면 내려간다」 — 학생 눈엔 같다.

## R3. 범위·위험
- 앱: `review-scheduler.ts`(repair→내림 한 함수, id 재생성) · `review-scheduler.test.ts:156-211`(① 테스트 5개 다시 씀: 157·168·182·192·200) · `review-home-card.tsx:69` · `features/quiz/notifications/review-reminder-copy.ts:14`+테스트 · `use-quiz-hub-screen.ts` 호출 이름. 서버: `review-reminder-copy.ts:15`+`functions/tests/review-reminder-copy.test.ts` 문구만 — 로직은 손 안 댐. 서버 배포는 문구 때문에 필요한데, `0147826a`의 lookback도 미배포라 어차피 한 번.
- 1.0.12에 넣는 쪽을 권한다 — 예약급: 과제 id·stage 모양이 학생 데이터에 박히고, 초대 뒤 바꾸면 두 규칙을 거친 과제가 생긴다.
- 반대할 이유(짧게): ① 매일 열고 안 하면 day30→day1까지 사흘 — 「열기만 해도 벌」로 읽힐 수 있다. ② 「틀림=day1 리셋」과 「놓침=한 칸」 규칙이 둘이 된다. ③ 어제 🔒한 ①을 빌드 전에 다시 뒤집는 것 — 결정은 기윤.
