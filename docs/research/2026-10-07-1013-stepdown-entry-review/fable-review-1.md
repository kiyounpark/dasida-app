# Fable — 1차 리뷰 `3d9ffba` (2026-10-07 낮 · 클라우드 세션 · 146,889토큰 · 도구 22회 · 3분 39초)

질문 = 같은 폴더 `q-review.md`. **고치지 않고 남김(기윤 10.07)** — 맥에서 astra 리뷰 → Fable 2차가 이 답과 astra 답을 같이 보고 최종 → 그때 고친다.

---

반드시 고칠 것: 없음
근거:
- 정상 진입 안 튕김 — 체인 `resolveNextDueReview`·`countDueReviews`는 `slice(0,10) <= todayStr()`(review-chain.ts:27-34, 40-43)로 `isScheduledByToday`(:14-16)와 같은 식·같은 기기 날짜라 늘 같은 답. 홈 카드 `dueTasks`는 서버 요약(home-today-state.ts:35)이고 인증은 KST(functions/src/learning-history.ts:487-489, 547-550)·게스트는 기기 날짜(local-learning-history-repository.ts:78)인데, 기기가 KST인 한(서버 스펙 가정 send-review-reminders.ts:29) 같은 날. 어긋나는 건 기기가 KST보다 서쪽 시간대일 때 KST 자정~기기 자정 사이뿐 — 커밋 전에도 내림(review-scheduler.ts:151)·체인·로컬 알림(review-notification-scheduler.ts:80)이 이미 기기 날짜라 새 축이 아님.
- store — 홈·복습 화면 둘 다 `useCurrentLearner().reviewTaskStore` = 모듈 싱글턴 `routedReviewTaskStore`(features/learner/provider.tsx:62, 351 · use-quiz-hub-screen.ts:78 · use-review-session-screen.ts:131). 라우터가 호출마다 세션으로 원격/로컬을 고르니(review-task-store-router.ts:15-33) 같은 계정이면 같은 결과 — Promise 공유가 맞다. 내림을 부르는 다른 호출자 없음.
- 지움 — `.finally`가 성공·거부 둘 다 지운다(review-scheduler.ts:138-140), 거부 뒤 새로 도는 테스트 있음(review-scheduler.test.ts:367-376). 훅의 `cancelled`는 뒤 `.then`만 막고 Promise 취소 경로는 없어 영영 매달릴 길 없음. 호출자 셋 다 `.catch` 달려 미처리 거부 없음(use-quiz-hub-screen.ts:109, 141 · use-review-session-screen.ts:227). `finally` 선례 features/consent/consent-sync.ts:36.
- 노트·완료본 — 필터는 `!completed && 오늘까지`만 더했고(use-review-session-screen.ts:112), `isWeaknessReviewTask` 가름(:237)·계열 자르기(:115-120)는 그대로. 완료본은 `open`에 못 들어오니 다시 못 풂. 서버 푸시의 옛 id(어제 놓친 과제, send-review-reminders.ts:65, 102)는 내림 뒤 오늘·새 id라 계열 fallback이 잡는다.
- 테스트 — review-scheduler·review-chain·use-review-session-screen 세 파일 91/91 통과(직접 돌림).
권고:
1. KST 아닌 기기(해외 체류)는 홈 카드가 보여도 눌러서 홈으로 돌아올 수 있다 — 지금은 받아들이고 STATUS 「모르는 것/한계」에 한 줄.
2. `resolveNextDueReview`·`countDueReviews`(review-chain.ts:33, 42)도 `isScheduledByToday`를 쓰면 규칙이 한 곳 — 다음 손댈 때.
3. 공유 Promise는 첫 호출의 `now`로 돈다(review-scheduler.ts:134-138) — 운영은 둘 다 기본값이라 무해, `now`를 넘기는 호출자가 생기면 주의.
