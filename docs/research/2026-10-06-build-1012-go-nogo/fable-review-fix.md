# Fable — 고친 커밋 44d3892f·11c08a99 리뷰 (2026-10-06 밤, 1차 157,694토큰 + 2차)

## 1차
반드시 고칠 것: 없음 — ① 정상 진입 안 튕김(홈 카드는 due만, 체인은 완료 직후 재조회) ② 노트 과제 안 깨짐(찾은 뒤 isWeaknessReviewTask로 가름 · 완료된 노트 id면 홈 — 의도) ③ 두 칸 안 내려감(날짜 오늘 → 같은 날 두 번째 움직임 0·저장 0) ④ 동시 저장(같은 입력→같은 배열 — **2차에서 빠뜨린 순서 인정**) ⑤ 완료본 안 다시 풂 ⑥ 버전 app.config.js:7 1.0.12 · runtimeVersion appVersion · buildNumber/versionCode remote autoIncrement. 약점 id에 `__` 없음(diagnosisMap 0) — 계열 자르기 안전.
권고 1: findReviewTaskForEntry가 날짜를 안 본다 — 밤에 알림센터의 아침 알림을 누르면 +7일 day7을 오늘 당겨 풂(앱은 delivered 알림을 안 지움). 해법 `scheduledFor.slice(0,10) <= 오늘`(review-chain.ts:35-40과 같은 규칙). 빌드 막을 급 아님.
권고 2: 체인 한 칸마다 내림이 돌아 GET 한 번 더 — 성능뿐.

## 2차 (astra 「홈 늦은 저장」 건을 보고)
A. 최종: 반드시 고칠 것 아님 — 1.0.12는 이 두 커밋 그대로 빌드.
- astra 순서는 가능 — 홈 POST는 25초 타임아웃×재시도 1회(firebase-learning-history-api.ts:3,86-130)에 401이면 토큰 갱신 후 한 번 더(remote-review-task-store.ts:24-45)라 최대 50~100초 떠 있을 수 있고 3문항 복습은 그보다 짧을 수 있다.
- 그러나 이 커밋이 연 위험이 아니다 — 커밋 전에도 같은 순서면 복습이 옛 `__day7`을 정확히 찾아 완료·day30을 저장했고 늦은 홈 저장이 똑같이 되돌렸다. 전체 목록 저장의 last-writer-wins는 저장하는 8군데(review-scheduler.ts:62,96,163,222 · current-learner-controller.ts:800,833,886,916) 전부의 기존 성질이고 1.0.11 홈 repair도 같은 모양. 이 커밋이 더한 내림 저장은 복습 시작 전에 끝나므로 창을 넓히지 않는다.
- 피해도 되돌릴 수 있다: 과제가 day3 미완료·오늘로 돌아와 홈에 다시 뜨고, 풀이 기록은 recordAttempt로 따로 남는다. 서버 diff는 생성된 day7만 지운다.
B. 고친다면(1.0.13 목록): review-scheduler.ts 한 파일 — 모듈 `Map<accountKey, Promise<void>>`로 stepDownMissedReviewTasks 진행 중이면 그 Promise를 돌려주고 finally로 지움(≈10줄) · 테스트 1개(지연 store로 동시 두 번 → load·saveAll 각 1회). 한계: 클라이언트가 25초에 끊은 POST를 서버가 늦게 처리하는 경우와 나머지 7군데 저장은 못 막는다 — 서버 버전 검사(또는 diff 전송)가 필요.
C. 최종: 권고 1(날짜 조건)도 이번엔 안 넣는다 — 피해는 한 단계 당겨 풀기뿐, 커밋을 하나 더 만들면 리뷰가 한 바퀴 더 돈다(멈춤 규칙). B와 함께 1.0.13 목록에.
