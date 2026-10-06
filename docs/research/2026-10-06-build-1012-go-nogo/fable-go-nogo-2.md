# Fable 2차 — astra 「알림 옛 id」 건 (2026-10-06 저녁, 누적 265,956토큰)

**A. 최종: 「반드시 고칠 것」 — 빌드 전에 고친다(astra 안 채택, 이유는 더 세다).** astra의 「로딩만 영원히」는 반쪽이다 — 로딩 화면에도 「뒤로가기」 줄이 있다(`review-session-screen-view.tsx:108-131`). 진짜 문제는 **반대 순서**다: 알림을 바로 눌러 콜드 스타트하면 홈의 한 칸 내림(`use-quiz-hub-screen.ts:107`, load+save 2왕복)과 복습 화면의 `store.load`(`use-review-session-screen.ts:198`, 1왕복)가 경주한다. 복습 쪽이 먼저 오면 옛 `__day7`로 복습이 시작되고, 끝낼 때 `recordAttempt`(`:589-608`)·`completeReviewTask`(`:643`) 둘 다 `task.id`=옛 id → 앱은 「task not found」로 조용히 return(`review-scheduler.ts:48-52`), 서버도 activeTask 못 찾아 그대로(`learning-history.ts:841-845`) → **한 복습이 통째로 안 남고** 바로 다음 과제로 `__day3`(같은 약점)이 또 뜬다(`:657-658`). 이 경로가 ②의 「어제 못 한 복습, 지금 이어서 해요」 알림을 누른 학생의 기본 경로다 — 1.0.11엔 없던 것(id가 안 바뀌었다). 알림 함수 배포 날 1.0.12에서 바로 터진다. 지금 배포된 옛 함수(오늘 과제만)로도 어제 알림을 다음 날 누르면 같다.

**B. 가장 작은 모양 — 파일 1 + 테스트 1 (`use-review-session-screen.ts:197-205`, 모든 입구가 여기로 모인다)**
1. `store.load` 전에 `await stepDownMissedReviewTasks(accountKey, store).catch(console.warn)` — 홈과 같은 함수·같은 store라 두 번 돌아도 같은 결과(`review-scheduler.ts:143`의 `< today`가 거짓). 이게 콜드 스타트 경주(옛 단계로 복습 시작)도 같이 막는다.
2. `tasks.find(id === taskId)`가 없으면 같은 계열 미완료 하나로: 접두 `taskId.slice(0, taskId.lastIndexOf('__') + 2)`로 시작하고 `!completed`인 것. 노트 과제(`__note__`)도 같은 접두 규칙.
3. 그것도 없으면 `setTask(null)` 대신 `router.replace('/(tabs)/quiz')`.
완료 처리는 전부 `task.id`를 쓴다(`:579,590,606,610,643,658`) → 이어 준 과제의 새 id로 끝난다. 체인 `onAdvanceChain`(`:706-709`)은 완료 직후 `store.load`한 id라 그대로.

**C. 같은 꼴 다른 입구 — 없음.** 옛 id를 들고 오는 건 알림뿐(콜드 `_layout.tsx:84-92`·웜 `:115-131`, 둘 다 `resolveNotificationRoute` → 복습 화면, 위 한 자리로 덮인다). 홈 카드 탭은 한 칸 내림 **뒤** `refresh()`한 id · 체인 다음 과제는 완료 직후 재조회 · 홈 켜 둔 채 자정은 내림 자체가 안 돈 상태라 id 불일치 없음.

(go/no-go 판정 「빌드 전에 이것만」 = `app.config.js:7` 버전 + 위 B. 나머지는 1차 그대로.)
