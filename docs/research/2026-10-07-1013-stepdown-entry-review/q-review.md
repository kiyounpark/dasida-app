<!-- astra·Fable에 같은 질문으로 건다. 맥에서 astra에 걸 때는 첫 줄의 작업 폴더만 맥 경로로 바꾼다. -->
작업 폴더: 저장소 루트 — 브랜치 `fix/1013-review-stepdown`.

커밋 하나만 리뷰해라: `3d9ffba`(1.0.13 첫 줄 버그 두 개). 파일은 읽기만 한다. 아무것도 고치지 않는다.
- 보는 법: `git show 3d9ffba`(맥에선 `/usr/bin/git show 3d9ffba` — rtk가 `git show`를 줄인다). 바뀐 파일 주변은 직접 열어 봐라.
- 배경: 1.0.12 빌드 전 리뷰에서 Fable이 1.0.13으로 미룬 두 권고 — 원문 `docs/research/2026-10-06-build-1012-go-nogo/fable-review-fix.md`
  ① 권고 B: `stepDownMissedReviewTasks`를 계정마다 한 번에 하나(진행 중이면 그 Promise를 돌려주고 finally로 지움)
  ② 권고 1: `findReviewTaskForEntry`가 날짜를 안 봐서 밤에 아침 알림을 누르면 며칠 뒤 다음 단계를 당겨 풂 → `scheduledFor.slice(0,10) <= 오늘`
- 고친 모양: ① `features/learning/review-scheduler.ts` 모듈 `Map<accountKey, Promise<void>>` ② `features/learning/review-chain.ts`에 `isScheduledByToday`(기기 날짜) 추가, `features/quiz/hooks/use-review-session-screen.ts`의 찾기가 정확한 id·같은 계열 둘 다 오늘까지인 미완료에서만 고른다.
- 1.0.12 커밋들은 리뷰가 끝났다 — 다시 보지 마라.

묻는 것: 이 커밋에 **「반드시 고칠 것」**이 있나 — 예:
- 정상 진입(홈 카드 `dueTasks`·체인 다음 과제 `resolveNextDueReview`)이 홈으로 튕김
- 날짜 기준이 어긋남: 서버 홈 요약의 due는 KST(`functions/src/learning-history.ts:548`), 앱 찾기는 기기 날짜 — 둘이 다른 날을 가리키는 경우
- 홈과 복습 화면이 서로 다른 store 객체로 같은 계정을 부를 때 Promise를 나눠 쓰는 게 틀린 경우(한쪽 store가 다른 결과를 내야 하는 경우)
- 진행 중 Promise가 안 지워져 다음 내림이 영영 안 도는 경로(거부·취소 포함)
- 노트 과제(weaknessId null) 경로가 깨짐 · 같은 id 완료본을 다시 풂
없으면 첫 줄에 「반드시 고칠 것: 없음」이라고 그대로 써라. 권고는 세 줄 안. 근거는 파일:줄. 한국어 15줄 안.

Claude가 이미 본 것(클라우드 세션 10.07): tsc 0 · 앱 jest 전체 1005/1005(새 테스트 8개 — 고치기 전 ① 2개·② 2개 실패 확인) · eslint 바뀐 파일 경고 7개 = 고치기 전과 같음(새 경고 0). 시뮬레이터·실기기 확인은 안 함.
