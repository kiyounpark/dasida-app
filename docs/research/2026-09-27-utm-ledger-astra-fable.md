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
- 로컬 확인: ①~⑤는 브라우저에서 분석 요청을 가로채 body를 봤다. ⑥은 localhost면 `isLocal`이 qa를 항상 true로 만들어 브라우저로 못 재서, 실제 `app.js` 윗블록과 `analytics.js` 전체를 Node `vm`에 비로컬 주소(저장소 완전 차단 / 쓰기만 막힘)로 돌렸다 — 11개 통과, 고치기 전 코드(HEAD)로 돌리면 `?qa=1` 경우가 깨지는 것까지 확인
