# 09.27 — 사진 원장에 "어느 링크로 왔나"(utm_source) — astra·Fable

> 설계 = astra 1차 + Fable 1·2차, 최종 Fable. 부른 법은 `docs/how-we-decide.md` 그대로.
> 이 문서는 09.27 설계 세션이 구현 세션에 넘긴 요약(🔒 부분 + 버린 안 목록)을 옮긴 것이다. astra·Fable 원문 대화는 여기 없다 —
> 버린 안의 이유는 요약에 적혀 있던 것만 옮기고, 없던 건 "이유 원문 없음"으로 둔다.

## 계기

쇼츠 6호가 **2026-09-28(월) 21:00 KST**에 올라간다. 그 전에 서버·웹이 배포돼 있어야 6호부터 "몇 호 링크로 와서 사진을 올렸나"를 셀 수 있다 — 소급 불가.
판정(약 10.14)은 "실험 링크로 온 비QA 제출 N건"으로 한다.

## 🔒 결정

**이름표 어휘** — `utm_source` 하나에만 담는다. medium/content 안 쓴다.

- 유튜브 고정댓글 `yt_short{N}_pin` · 설명란 `yt_short{N}_desc` · 채널 프로필 `yt_channel`(고정)
- 인스타 프로필 `insta`(고정) · 예전 오르비 `orbi9`·`orbi10`… 그대로

**서버** (`functions/src/photo-analysis-run-log.ts`)

- `RunRequestContext`에 `utmSource: string | null`, `utmSeenAt: string | null`. 문서엔 `...input.context`로 들어간다. `schemaVersion`은 1 그대로
- `utmSource`: 문자열이고 `^[A-Za-z0-9_-]{1,64}$`면 **대소문자 그대로**, 아니면 null
- `utmSeenAt`: `Date#toISOString()` 꼴(정규식) **그리고** 서버 수신 시각 + 5분 이전이면 그대로, 아니면 null. **seenAt이 깨져도 source는 살린다**
- zod에 안 넣는다 — 필드 하나로 400을 내면 학생 분석이 막힌다 (사용량 원장 설계 §10)
- 서버에서 7일 만료 같은 걸로 안 지운다. **창은 집계에서 건다**
- `accountKey`·`participantId`·`channel`과 절대 섞지 않는다

**웹** (`web-proto/app.js`, `web-proto/analytics.js`)

- URL `utm_source`를 먼저 변수로 읽는다(같은 정규식). 유효하고 저장된 `dasida_utm_source`와 **다를 때만** 덮고 `dasida_utm_seen_at = new Date().toISOString()`. 같으면 둘 다 손대지 않는다 — `window.location.reload()`가 쿼리를 들고 다시 열 때마다 시각이 밀리는 걸 막는다
- 틀린 값은 무시하고 기존 값 유지. 만료·삭제 없음
- 저장소가 막히면(사파리 프라이빗) URL 값 + 지금 시각을 메모리에만 두고 이번 제출에 싣는다
- `p`·`utm_source`·`qa`를 URL에서 먼저 읽고 그다음 try로 저장 — 안 고치면 프라이빗 모드로 올린 QA 사진이 진짜 제출로 찍힌다
- GA 쪽 utm은 안 건드린다 (gtag가 URL utm을 스스로 읽는다)

**배포** — functions 배포는 기윤 승인 뒤 (사용량 원장 설계 §0 🔒). 전부 6호 전에.

## 버린 안

| 버린 안 | 이유 |
|---|---|
| `utmSource` 소문자화 | 이유 원문 없음 |
| `utmSeenAt`을 "학생 하한"으로 부르기 | 코드 일치로 사람을 확정하지 않는다 (사용량 원장 설계 §0 🔒). `utmSeenAt` 묶음을 '명'이라 부르지 않는다 |
| attribution 객체 + version | 이유 원문 없음 |
| 웹·서버 7일 만료 | 창은 집계에서 건다 |
| 유효 태그가 올 때마다 시각 갱신 | `reload()`가 쿼리를 들고 다시 열 때마다 시각이 밀린다 |

## 이번에 안 하는 것 (전부 나중에 추가해도 값이 같다)

앱(네이티브, 1.0.9) 쪽 · 집계 스크립트 · GA 맞춤 측정기준 · medium/content 분리 · referrer · 최초 출처 보관.

## 판정 날 세는 법 (기록만, 코드 없음)

- 원장 `kstDate >= '2026-09-28'` 한 필드 범위로 가져와 메모리에서 `channel=='web' && qa==false && utmSource ∈ 실험 목록`
- `ok` 무관 — ok별로 갈라 적는다. 재시도는 `submissionId`, 없으면 `imageHash`로 접는다
- 창은 6번째 게시 + 7일
- 문구: "실험 링크에 귀속된 비QA 제출 N건(ok N / 실패 N)"
- 학생 수는 손 대장으로 확인한 것만
- 기윤 본인은 공개 링크로 사진을 안 올린다. 올렸으면 시각·`submissionId`를 대장에 적고 뺀다

## 구현하며 바뀐 것 (09.27 Claude — astra·Fable에 안 걸었다)

- `readRunRequestContext(body, receivedAt = new Date())` — "+5분" 기준 시각을 받으려고 인자를 하나 더했다. `analyze-photo.ts`는 `receivedAt`을 넘긴다
- `app.js`의 `isQa`: 저장소가 **읽기는 되고 쓰기만 막힐 때**(옛 사파리 프라이빗·용량 초과) `isQa = getItem('dasida_qa') === '1'`이 주소의 `qa=1`을 false로 덮었다. `if (getItem(...) === '1') isQa = true`로 바꿨다 — 저장소가 정상이면 동작이 같다
- 코드리뷰 뒤 두 줄 더 (아래 「코드리뷰」 — Fable이 준 수정): `app.js`에서 `dasida_qa` 읽기를 try 첫 줄(쓰기보다 앞)로 올렸고, 이름표를 덮기 전에 `removeItem('dasida_utm_seen_at')`을 넣었다. 키 이름은 그대로
- 로컬 확인: ①~⑤는 브라우저에서 분석 요청을 가로채 body를 봤다. ⑥은 localhost면 `isLocal`이 qa를 항상 true로 만들어 브라우저로 못 재서, 실제 `app.js` 윗블록과 `analytics.js` 전체를 Node `vm`에 비로컬 주소(저장소 완전 차단 / 쓰기만 막힘)로 돌렸다 — 11개 통과, 고치기 전 코드(HEAD)로 돌리면 `?qa=1` 경우가 깨지는 것까지 확인

## 코드리뷰 (09.27, 커밋 `083ed63`만 · 멈춤 규칙)

"반드시 고칠 것"은 (a) 학생 분석이 막히거나 깨짐 (b) 원장에 utmSource·utmSeenAt·qa·participantId가 틀리게 쌓임, 둘뿐. 나머지는 권고로 기록만.

| | 판정 | 반드시 고칠 것 |
|---|---|---|
| astra 1차 (`gpt-6-astra`, stderr `model:` 확인 · 51,903 토큰) | 고치고 배포 | ① 저장된 `qa=1` + 쓰기만 막힘 + `?p=…` → 참여 코드 쓰기가 던져 qa 읽기를 건너뜀 → qa=false ② 이름표 쓰기 성공·시각 쓰기만 실패 → 다음 방문부터 새 이름표에 옛 링크 시각 |
| Fable 1차 (141,052 토큰) | 배포 | 없음 |
| Fable 2차 (astra 답을 통째로 받고, 알림 기준 151,557 토큰 — 1차와 누적인지는 알림만으론 모름) | **배포 (최종)** | 없음 — astra ①② 둘 다 권고로 내림 |

- Claude가 astra ①②를 실제 코드로 재현했다 — 둘 다 그 조건에선 재현됨. ①의 순서는 HEAD^에도 있던 것
- Fable 2차 근거: 두 건 다 "값이 이미 저장된 뒤 쓰기만 던지는 저장소"가 전제인데, 실제로 그런 길은 용량 초과뿐이고 이 origin은 키 4개·수십 바이트만 쓴다(Claude가 셈: `dasida_qa`·`dasida_participant`·`dasida_utm_source`·`dasida_utm_seen_at`, 다른 스크립트는 저장소 안 씀). ②는 틀리는 필드가 `utmSeenAt`인데 판정은 `kstDate`+`utmSource`로 센다
- Fable이 준 한 줄 수정 둘(키 이름 안 건드림, "끼워도 되고 빼도 된다")은 Claude가 넣었다 — 위 「구현하며 바뀐 것」. 넣은 뒤 흉내 11개 통과, astra ①은 qa=true, ②(용량 초과 = 지우기는 됨)는 옛 시각 대신 null
- Fable은 1차 권고 3("쓰기만 막힌 저장소는 어차피 비어 있다")이 용량 초과엔 안 맞는 말이었다고 2차에서 스스로 고쳤다
- Fable 1차 줄 번호(`app.js:43`·`:335`·`:613`·`:671`·`:862`, `analytics.js:23`, `analyze-photo.ts:84`·`:95`)는 Claude가 전부 맞는 것 확인

**권고 (기록만)**
- ✅ 옮김 (09.27, 기윤 요청): 웹 흉내 스크립트를 저장소로 — **`node scripts/verify-web-proto-storage.mjs`** (12경우, `app.js` 윗블록·`analytics.js`를 만지면 다시 돌린다). 원래 권고는 `web-proto/tests/`였지만 `deploy:proto`가 `web-proto` 폴더를 통째로 올려서 `scripts/`에 뒀다 (Fable 1차). astra의 `?qa=0/off` + 저장된 qa=1 경우, astra ①② 경우도 넣었다 — 리뷰 수정 전 코드(`083ed63`)로 돌리면 ①②만 깨진다
- **유튜브·인스타 앱 안 브라우저는 사파리와 저장소가 따로다.** 사파리에서 `?qa=1`을 찍어둬도 앱 안 브라우저엔 없어서, 기윤이 자기 고정댓글 링크를 앱에서 눌러 사진을 올리면 `qa=false`로 찍힌다 — 「판정 날 세는 법」의 "올렸으면 대장에 적고 뺀다"가 이 경우 (Fable 1차)
- 리뷰 중 astra가 `npm run notify`(Slack)를 보내려 했다 — 읽기 전용 샌드박스라 `fetch failed`로 안 나갔다. 다음 리뷰 프롬프트엔 "알림·쓰기 명령 금지"를 넣는다
