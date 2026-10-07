# Fable — 2차 리뷰(최종) `3d9ffba` (2026-10-07 오후 · 맥 · 146,812토큰 · 도구 18회 · 4분 40초)

질문 = `q-review.md` + 1차 답 `fable-review-1.md` + astra 답 `astra-review-1.md`(「반드시 고칠 것 1개」 — 시간대 회귀). 프롬프트에 「네 안을 방어하지 마라. astra 안이 나으면 그걸로 가도 된다. 버려도 된다.」를 넣었다. Claude가 근거 두 자리를 직접 확인함: `functions/src/send-review-reminders.ts:29` 「사용자 전원 KST 가정(스펙)」 · `countDueReviews`·`resolveNextDueReview`가 기기 날짜(`features/learning/review-chain.ts:7-11, 26-45`).

---

최종: 반드시 고칠 것 없음

astra가 말한 회귀는 사실이다 — 직접 확인: 홈 카드는 서버가 읽을 때마다 KST로 다시 센 목록(functions/src/learning-history.ts:548·1097-1103 → features/learning/home-today-state.ts:35), 진입은 기기 날짜(features/learning/review-chain.ts:7-16 · features/quiz/hooks/use-review-session-screen.ts:112). 커밋 전엔 정확한 id면 열렸고(diff `tasks.find(id && !completed)`), 커밋 뒤엔 안내 없이 홈(:232-235). 어긋나는 창은 KST 자정~기기 자정 — UTC 기기 9시간·미국 동부 13시간, 매일.
그래도 반드시가 아닌 이유 셋:
① 그 창은 서버 스펙이 이미 뺀 사람 몫이다 — "사용자 전원 KST 가정(스펙)" functions/src/send-review-reminders.ts:29. KST 기기엔 어느 진입도 안 튕긴다: 체인은 같은 식(review-chain.ts:33·42), 로컬 알림·게스트 홈도 기기 날짜(features/quiz/notifications/review-notification-scheduler.ts:19·80 · features/learning/local-learning-history-repository.ts:37·78).
② 커밋 전에도 그 학생은 멀쩡히 본 게 아니다 — 열리긴 했지만 `countDueReviews`(기기 날짜)가 0이라 chainTotal 0으로 끝났다(use-review-session-screen.ts:252·702). 깨진 모양이 바뀐 것이지 처음 깨진 게 아니다.
③ 미뤄도 값이 같다(젓가락급) — 클라이언트 6줄쯤, 데이터·id 모양 안 건드림. 지금 고치면 재리뷰 한 바퀴가 더 든다. 다만 해외 학생이 실제로 있는지는 우리가 모른다 — 그건 확인 안 됐다.
STATUS 「모르는 것/한계」 한 줄: "1.0.13 복습 진입은 기기 날짜·홈 카드는 KST — KST 아닌 기기는 KST 자정~기기 자정(UTC 9h·미 동부 13h) 동안 홈 카드를 눌러도 안내 없이 홈으로. 전원 KST 가정(send-review-reminders.ts:29). 해외 학생이 생기면 알림 진입만 거르는 모양으로(권고 1)."
권고:
1. 고친다면 모양은 "알림 진입만 거른다" — features/quiz/notifications/notification-route.ts:13에 `entry: 'notification'`(타입 :2), use-review-session-screen.ts:112 날짜 필터를 `getSingleParam(params.entry) === 'notification'`일 때만, 홈 카드·체인은 `!completed`만. 테스트: 새 테스트 3개(use-review-session-screen.test.ts:1286-1319)에 `entry` 달기 + "홈 진입은 내일 날짜 정확한 id도 연다" 1개. "정확한 id만 날짜 안 봄"(A)은 spawn이 같은 id를 내일로 옮긴 과제(review-scheduler.ts:218-221)를 알림으로 당겨 풀게 해 두 번째 테스트(:1298)가 깨진다 — 안 권함. KST 통일은 내림(:151)·생성(:82·208)·로컬 알림(:80)이 전부 기기 날짜라 KST보다 동쪽 기기에서 새로 어긋난다 — 다섯 자리를 같이 옮겨야 해서 1.0.13 밖.
2. 1차 권고 2·3 살림 — `resolveNextDueReview`·`countDueReviews`도 `isScheduledByToday`로(review-chain.ts:33·42), 공유 Promise는 첫 호출의 `now`(review-scheduler.ts:134-138).
3. 튕길 때 안내 없음(:232-235)은 KST 기기도 끝낸 과제 알림에서 겪는다 — 홈이 상태를 보여주니 지금은 두고, 초대 뒤 학생 말이 오면 그때.
