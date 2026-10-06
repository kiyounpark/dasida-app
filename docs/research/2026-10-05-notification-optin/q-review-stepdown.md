DASIDA 저장소 브랜치 `notif-optin`의 커밋 `77d9b245` 하나만 리뷰해라. 파일은 읽기만 한다. 아무것도 고치지 않는다.

- 보는 법: `/usr/bin/git show 77d9b245` (rtk가 `git show`를 요약판으로 줄이니 반드시 이 경로로). 바뀐 파일 6개의 주변 코드는 직접 열어 봐라.
- 앞 커밋들(`0147826a` 본판 · `9c912f13` 안드 13+)은 리뷰가 끝났다 — 다시 보지 마라.

## 바뀐 것

- `features/learning/review-scheduler.ts:123-165` `repairDemotedReviewTasks` → `stepDownMissedReviewTasks(accountKey, store, now)`: 날짜 앞 10글자가 오늘(기기 날짜)보다 앞인 미완료 과제를 한 칸(day30→7→3→1) 내리고, 날짜는 오늘, id는 `buildReviewTaskId`로 새 단계. day1은 그대로. 1.0.11이 내려 둔 과제(id day3 · stage day1)는 id를 stage로 다시 만든다(날짜 그대로, 지났으면 그날 또 한 칸). 새 id와 같은 id의 다른 줄(지난번 완료본)은 빼서 내린 과제가 그 id를 가진다(`:161-162`). 바뀐 게 0이면 저장 안 함(`:157`).
- 같은 파일 `completeReviewTask`: `alreadyExists`는 미완료만 본다(`:67`) + 다음 단계 id의 완료본이 있으면 push 대신 그 자리를 덮는다(`:83-88`).
- `features/quiz/hooks/use-quiz-hub-screen.ts:107`(마운트, 이름만) · `:136-144`(포커스 효과에도 한 칸 내림 → refresh).
- `features/quiz/components/review-home-card.tsx:19-26,79`: 배지 「오늘 안 하면 리셋」 → day1 「오늘 안 하면 내일 또 떠요」 / 그 위 「오늘 안 하면 한 칸 내려가요」. **문자열은 초안 — 기윤 검수 전**(코드 주석에도 적음).
- 테스트: `features/learning/review-scheduler.test.ts:156-349` 다시 씀(하루 놓침 한 칸 · 같은 날 두 번 · 일주일 · 매일 한 칸 · day1 · 저장 안 함 · 완료본 제자리 교체 · 1.0.11 과제 셋 · 노트 과제 · completeReviewTask 둘) · `features/quiz/components/__tests__/review-home-card-badge.test.ts` 새로(카드 렌더는 `jest.setup.js`가 PlatformConstants를 막아 못 한다).
- 확인: 앱 jest 974 → 988 · functions 289/289 · tsc 0(앱·functions) · web-proto 번들 입력에 고친 파일 0(esbuild metafile).

## 이미 정한 것 — 다시 열지 마라

- 한 칸 내림 자체와 모양(열 때 한 칸 · 날짜 오늘 · 표식 필드 없음 · id 새 단계 · 완료본 제자리 교체 · 1.0.11 과제는 id를 stage로): 🔒 10.06 기윤 + Fable 최종 `docs/research/2026-10-05-notification-optin/fable-stepdown-2.md`. astra 안(날짜 그대로 + 표식 + 서버 트랜잭션)은 버렸다.
- 서버 로직은 안 건드린다 — saveAll diff로 따라온다. 기기 2대 동시 저장은 1.0.12 밖.
- 학생 문구 세 줄(아침 알림 본문 · 홈 배지 · 허락 카드 안내)은 이 커밋에서 확정 안 한다. 아침 본문 「오늘 안 하면 내일도 홈에 그대로 남아요」가 한 칸 내림 뒤 거짓인 건 알고 있다 — 문구 커밋에서 고친다. 문구 좋고 나쁨은 묻지 않는다.

## 묻는 것

이 커밋에 **「반드시 고칠 것」**(과제가 사라지거나 · 같은 id가 둘 생기거나 · 한 칸보다 더 내려가거나 · 다음 복습이 안 생기거나 · 서버 저장이 거절되는 것)이 있나. 없으면 첫 줄에 「반드시 고칠 것: 없음」이라고 그대로 써라. 권고는 세 줄 안. 근거는 파일:줄. 한국어 15줄 안.

Claude가 이미 본 것(같은 말이면 권고에서 빼도 된다):
- 서버 저장이 `batch.set(..., { merge: true })`(`functions/src/learning-history.ts:1162-1167`)라 완료본 자리를 덮으면 옛 `completedAt`이 미완료 문서에 남는다. 읽는 곳(`:755` 최근 활동 · 앱 `local-learning-history-repository.ts:250`)은 `completed`로 먼저 거르고, 다시 끝낼 때 덮인다 → 학생 화면 영향 없다고 봄(짐작 — 실서버 확인 안 함). 틀림 리셋(`review-scheduler.ts:209-220` push)도 예전부터 같은 모양.
- 포커스 경로는 게스트 로컬 알림을 다시 잡지 않는다(마운트 경로만 `rescheduleAllReviewNotifications`).
- 자정에 홈이 떠 있는 채 포커스가 오면, 한 칸 내림 저장과 refresh 사이에 옛 id 카드를 누를 수 있다(복습 화면이 과제를 못 찾음).
- `e2e/review-session.spec.ts:28`이 「오늘 안 하면 리셋」을 찾는다 — 같은 테스트가 찾는 「사고 흐름 확인하기」가 이미 코드에 0곳이라 이 커밋 전부터 깨져 있었다. 안 고침.
