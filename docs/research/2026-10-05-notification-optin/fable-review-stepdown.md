# Fable — 한 칸 내림 커밋 77d9b245 리뷰 (2026-10-06, 163,910토큰)

반드시 고칠 것: 없음

근거(다섯 칸, 읽은 것):
- 사라짐: `features/learning/review-scheduler.ts:162`는 안 움직인 줄 중 내린 과제의 새 id와 같은 것만 뺀다 — 정상 데이터에선 그 자리가 완료본뿐(spawn `:191-208`·complete `:67-70`이 쌍당 미완료 하나로 유지). 서버 `functions/src/learning-history.ts:624`는 next에 없는 옛 id 문서(예 `__day7`)만 지운다.
- 같은 id 둘: 완료본은 `:161-162`에서 빠지고 서버는 문서 id로 덮는다(`learning-history.ts:1163-1167`). `review-scheduler.test.ts:143-157`가 잡는다.
- 두 칸: 날짜가 오늘이 돼 `:143`의 `< todayKey`가 거짓 — 같은 날 두 번, 마운트(`use-quiz-hub-screen.ts:107`)와 포커스(`:141`)가 겹쳐도 같은 입력·같은 결과. 1.0.11 과제(id day7·stage day3)는 stage 기준 한 칸(day1) — 요청서가 받아들인 모양.
- 다음 복습: 완료는 `use-review-session-screen.ts:589`(서버 기록) → `:643`(앱 completeReviewTask) 순서. 내린 뒤 옛 상위 id 문서는 서버에서 지워져 있어 서버 `learning-history.ts:867`의 `some`도 거짓 → 다음 과제 생긴다. 리셋 뒤 완료본이 남은 경우는 앱 `:67`이 메운다.
- 서버 거절: `SaveReviewTasksRequestSchema`(`learning-history.ts:425-428`) — 개수는 늘지 않고, `scheduledFor`는 `addDaysToToday`의 `T00:00:00.000Z`라 `datetime()` 통과, 잔류 `completedAt`은 optional(`:266`).

권고(기록만):
1. 서버 `learning-history.ts:867`·게스트 `local-learning-history-repository.ts:416`은 아직 완료본까지 보고 다음 과제를 안 만든다 — 지금은 앱 `completeReviewTask(:67)`가 뒤에 돌아 메우지만, 서버 커밋 때 `!completed`로 맞출 것.
2. `:161-162`는 내린 과제 둘이 같은 새 id가 되면(같은 쌍 미완료 둘) 둘 다 남긴다 — 정상 흐름엔 안 생기고, 생겨도 서버는 Map이 하나로 합치지만(`:617`) 로컬 저장소엔 둘 남는다.
