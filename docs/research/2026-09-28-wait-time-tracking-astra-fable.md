# 사진 분석 대기 — "몇 초 기다렸나 / 몇 초에 나갔나" 재기 (2026-09-28)

## 결론 먼저

> **✅ 09.28 오후 풀림 — GA는 받고 있었다. 이 숫자들은 지금부터 쌓인다.** 12:40의 "GA 0건"은 기윤 폰 사파리가 개인정보 보호 탭이었던 탓이다(사파리가 GA를 막음). 크롬 503은 실제론 들어갔다. 원문 `docs/research/2026-09-28-ga-browser-hits-investigation.md`.
>
> (옛 줄) **🚧 09.28 12:40 — 배포는 됐지만 GA가 브라우저 기록을 못 받고 있다. 이 숫자들은 아직 안 쌓인다.** 기윤 폰 확인(아래 「폰 확인 결과」)에서 GA 0건. 원인 조사 전까지 이 설계로 판단하지 않는다. 5호 "웹 방문 0"(GA)도 의심 대상 — "사진 제출 0"(원장)은 맞다.

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

## 폰 확인 결과 — GA 0건 (09.28 12:20~12:40)

> **오후 정정:** 원인은 사파리 개인정보 보호 탭, 크롬 503은 실제론 들어감, 아래 "curl 히트가 실시간에 뜸"은 잘못 읽은 것 — `docs/research/2026-09-28-ga-browser-hits-investigation.md`.

- 기윤 폰, **모바일 데이터**(집 와이파이 아님), `?qa=0`. 사파리 × 3(그냥 기다리기/홈 갔다 오기/닫기) + 카톡 "나와의 채팅" 링크 안 브라우저 × 3. 사파리 설정 "고급 추적 및 지문 채취 보호" = 개인정보 보호 브라우징(기본값). 유튜브 6호 고정댓글은 `yt_short6_pin` 오염 때문에 안 씀.
- **원장: 9행 다 옴**, 전부 `channel:web`·`qa:false`·`ok:true`·`utmSource:null` — `HWqm8yY0bEA710IECuu9` `3pqtbZV3utgykgXHNjxH` `dhhXou8vxJMAiKKrYwWb` `QiQKcNcNrF971DcAN4o2` `TLbJ0eOHlLOZlERaFD18` `MwKn1zhBMhpAxTOfQ1ns` `JVnwSTmuY5bXR4YWkTzN` `g2sW4qXqKLERuPSNm7eY` `OneFDYnGfUlDnqkh7WQh` (03:20:49Z~03:25:09Z). 한 `submissionId`(b1e8c236…)가 4행 — 같은 사진을 네 번 보낸 것(왜 그런지는 안 물었다). **집계에서 전부 뺀다.**
- **GA 실시간: 사진 관련 이벤트 0, page_view조차 0.** 30분 창에 잡힌 건 12:06쯤 1명(누군지 모름)과 Claude의 테스트 히트뿐.
- 기윤 **맥 사파리** `?qa=0`로 30초 열어 둠 → 역시 0.
- Claude 크롬(확장 프로그램으로 조종하는 크롬)에서 배포본을 열면 gtag가 로드되고(`google_tag_manager` 있음, `dasida_qa` 없음) `g/collect` 요청이 나가는데 **응답이 HTTP 503**(page_view·scroll 전부).
- 같은 파라미터를 하나씩 붙여 **터미널 curl로 보내면 전부 204**(Safari UA·Origin 헤더를 붙여도 204). **analytics.google.com 페이지 안에서 fetch(credentials omit)로 보내도 204** → 실시간에 뜬다.
- (→ 오후 정정: 원인은 기윤 폰 사파리의 개인정보 보호 탭이었다. 크롬 503도 실제론 들어갔다.) 옛 줄 — 짐작(확인 안 함): gtag가 보내는 요청의 무엇(쿠키·keepalive/beacon·헤더·동의 신호)이 거절 조건이다. GA 속성의 데이터 필터는 "Internal Traffic — 테스트" 하나뿐(제외 안 함).
- (→ 오후 정정: 아래 "오염" 목록은 틀렸다. curl `_dbg=1` 히트는 안 들어간 것으로 보이고, 들어간 건 Claude 크롬 cid `1246322026.1790566186` — 정본은 STATUS ⏱ 줄과 `2026-09-28-ga-browser-hits-investigation.md`.) 옛 줄: **GA 오염(뺄 것):** Claude 디버그 히트 `cid 1.1`(page_view 4, dl 일부 `example.invalid`) · `cid 9.9`(9) · `cid 9.8`(1), 전부 `_dbg=1`, 09.28 12:30~12:40 KST.
- 원장 읽기 스크립트: `~/dev/dasida-measure/2026-09-28-wait-time/ledger-read.cjs`.
