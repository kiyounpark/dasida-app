# 사진 분석 대기 — "몇 초 기다렸나 / 몇 초에 나갔나" 재기 (2026-09-28)

## 결론 먼저

- **웹만, GA로만 잰다.** 서버·원장은 안 건드린다. `web-proto/app.js` 한 파일(+22줄), 앱은 1.0.10 때.
- **남기는 것** — `analysis_shown`·`analysis_failed`에 `wait_ms`(사진 올리기 버튼부터 그 순간까지)·`submission_id`·`attempt`(같은 사진 몇 번째 시도). `analysis_shown`엔 `was_hidden`(대기 중 화면을 벗어났었나), `analysis_failed`엔 `stage`(`downscale`=사진 줄이기 실패 — 전엔 아무 데도 안 찍혔다 · `request`=서버). 새 이벤트 `analysis_hidden`(대기 화면에서 처음 숨겨질 때 1회).
- **"나감" 읽는 법** — 실시간으로 안 가른다. `analysis_hidden` 뒤에 같은 `submission_id`의 `analysis_shown`이 오면 "갔다 돌아옴", 안 오면 "나감". 폰에서 닫을 때 이벤트가 안 갈 수 있다(짐작 — 폰 실측 전).
- **GA 등록 끝(09.28, Claude가 기윤 크롬으로)** — 속성 "다시다 웹 프로토(사진)"(`G-4HW2VRNME0`): 맞춤 측정기준 `was_hidden`·`stage`·`attempt`·`has_work`·`error_found`, 맞춤 측정항목 `wait_ms`(밀리초). `submission_id`는 고유값이 많아 등록 안 함 — 원장과 잇는 건 시각으로 손으로. 등록 전 데이터는 소급 안 된다.
- **남은 확인** — 기윤 폰: 사파리·유튜브 앱 안 각 1회 × (그냥 기다리기 / 기다리다 홈 갔다 오기 / 기다리다 닫기) → GA 실시간. `?qa=1`이면 GA가 꺼지니 qa 없이. 그 제출은 원장에 `qa:false`로 찍히니 시각을 대장에 적고 뺀다.
- 결정: astra·Fable → 갈려서 Fable 최종. 토큰 astra 3.2만 · Fable 21.3만(2회).

## 갈린 자리와 최종 (Fable)

| | astra | Fable 1차 | 최종 |
|---|---|---|---|
| 서버 | `photoWaitEvents` 수집 API + sendBeacon + 중복 제거, 요청·원장에 attemptId | 안 건드림 | **안 건드림** — 방문 0에 함수 배포 하나가 더 붙는다. 재시도는 GA `attempt`로 가른다 |
| 이벤트 | `wait_hidden`·`wait_resumed`·실패 `stage`·`event_id` | `analysis_hidden` + `was_hidden` | Fable 안 + astra의 `stage`만. 1회 플래그라 `event_id` 불필요 |
| shown 시점 | 결과가 visible일 때, 숨긴 동안 끝났으면 복귀 후 | — | **지금 자리 그대로** — 복귀 뒤로 미루면 앱 안 브라우저가 visible을 다시 안 줄 때 이벤트가 통째로 사라진다 |
| GA 등록 | ID는 등록 안 함 | `submission_id` 등록 | **astra 안** |
| 확인 | 별도 QA GA + DebugView | qa 없이 기윤 폰, 행은 대장에서 뺌 | Fable 안 + astra 시나리오 |

## 로컬 확인 (09.28, Claude — fetch 가로채기)

사진 줄이기 실패 → `analysis_failed {stage:'downscale', attempt:1}` · 서버 500 → `{stage:'request', attempt:1}` · 같은 사진 다시 누름 → 같은 `submission_id`에 `attempt:2` · 대기 중 visibilitychange+pagehide 둘 다 → `analysis_hidden` 1회만 · 결과 → `analysis_shown {was_hidden:1, wait_ms:1509}` · 결과 화면에서 숨김 → 안 찍힘. 콘솔 에러는 일부러 낸 500뿐. `node scripts/verify-web-proto-storage.mjs` 12/12.

재료(질문·astra 원문): 저장소 밖 `~/dev/dasida-measure/2026-09-28-wait-time/`.
