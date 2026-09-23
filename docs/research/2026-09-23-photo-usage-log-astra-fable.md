# 사진 분석 사용량 로그 — astra·Fable (2026.09.23 밤)

> 결정 규칙: `docs/how-we-decide.md` — 둘에 같은 질문, 갈리면 Fable이 astra 답을 보고 최종.
> 이 파일은 원문 보관용이다. 설계 정본은 `docs/superpowers/specs/2026-09-23-photo-usage-log-design.md`.

## 왜 물었나

STATUS 「👉 다음 세션 첫 일」 2번. 앱이 `analyzePhoto`에 누가 보냈는지를 안 싣고(`analyze-photo-request.ts:109`),
서버 로그에도 계정이 없다(`analyze-photo.ts:86`). 웹엔 "같은 학생의 두 번째"를 셀 방법이 없다.
앱도 고쳐야 하니 1.0.9에 같이 태운다(🔒).

질문 다섯: ① 웹 참여 코드 만들기·잇기·두 번째 세기 ② 로그 필드·저장 위치 ③ 앱이 계정을 싣는 법
④ 되돌리기 비싼 것 ⑤ 크기. 질문지 원문은 세션 스크래치패드(`usage-log-prompt.md`)에 있었다.

## 결론 (Fable 최종) — 갈린 곳 7개

1. 브라우저 자체 `visitorId` — **astra**. 안 넣는다
2. anon→user — **Fable**. 새 연결 모듈 안 만든다. 운영은 로그인 필수(`auth-policy.ts:6-12`)
3. 재시도 — **절반씩**. `imageHash`(항상) + `submissionId`는 웹만
4. 보존 — **Fable**. 영구. 계정 삭제 때 처리는 기윤에게
5. usage를 JSON 파싱 전에 확보 — **astra**
6. 웹 — **Fable**. 1.0.9 전 최소판에서 뺀다. 서버는 웹 필드를 지금부터 받는다
7. 크기 — **중간**. 15파일 8~10시간

Claude 확인: astra 인용 7곳, Fable 1차 인용, 설계 파일의 구현 근거 9곳(`current-learner-controller.ts:465-475`,
`photo-route.test.tsx:42-63` 정확 일치 검사, `provider.tsx:55·348`, `app.js:266·306-308`, `use-photo-flow.ts:104-120`,
`APIConnectionTimeoutError`, `learning-history.ts:441`, `firestore.rules` 저장소에 없음) — 전부 적힌 대로 있다.
Claude가 따로 찾은 것: 이관 원장이 `sha256(anon 키)`를 남긴다(`learning-history.ts:1214-1220`) — Fable 2차에 넘겼다.

토큰: astra 40,045 (1회, `model: gpt-6-astra` stderr 확인) · Fable 189,441 + 227,741 (2회).

---

## astra 원문 (gpt-6-astra)

1. **제안: 개발자가 학생마다 무작위 코드를 발급한다.**
`웹주소/?p=코드`를 주고 브라우저에 저장한다. 링크 없이 돌아오면 저장값을 쓰되, 코드 없는 방문은 `participantId=null`로 남긴다. 브라우저 자체 발급은 하지 않는다. 대장에 코드↔오르비 계정·댓글을 연결하고 대화로 사람을 확인한다.
근거: `docs/research/2026-09-23-web-return-astra-fable.md:35–38`.

집계는 서버 수신시각의 KST 날짜가 다른 **서로 다른 사진 제출**이 2건 이상인 학생 수로 제안한다. 재시도·동일 사진·QA·대리 실행은 제외하고 AI 실패는 별도 집계한다. 10.07은 손 대장을 유지한다. QA는 저장된 `dasida_qa`까지 서버에 전달해야 한다.
근거: 위 문서 `:14–15`, `web-proto/analytics.js:19–34`.

2. **제안: Firestore를 집계 원장, Cloud Logging을 장애 기록으로 쓴다.**
현재는 Firestore 기록을 생략하고 성공 요약만 로깅한다고 적혀 있다(`functions/src/analyze-photo.ts:84–99`).

필드는 버전·출처·두 식별자·인증상태·submissionId(재시도 유지)·attemptId·서버시각·QA/대리 여부·이미지 해시/바이트/가로세로·상태/오류코드·모델/responseId·응답시간·입력/캐시입력/출력/추론 usage·결과 요약을 제안한다. 원본·전사·토큰·시크릿은 저장하지 않는다. 해시는 재촬영까지 판별하지 못하므로 대장 검수가 필요하다.

호출 시작/종료를 기록하고 실패 usage는 모르면 null로 둔다. 현재 SDK 재시도와 JSON 파싱이 있어, usage는 파싱 전에 확보하고 재시도별 비용 누락도 표시해야 한다(`functions/src/openai-client.ts:515–550`). 원가는 성공 장수와 전체 시도 비용을 따로 계산한다.

보존은 원장 13개월·장애 로그 30일, 월별 추출 집계를 **제안**한다. 사진당 원장 쓰기 2회가 드는 설계다. 실제 보존 설정·단가·예산은 확인 안 했으므로 저렴하다고 단정하지 않는다.

3. **제안: 1.0.9에 인증정보까지 싣고 서버에서 지금 검증한다.**
`x-dasida-account-key`와 로그인 사용자의 `Authorization: Bearer …`, 게스트의 `x-dasida-session-secret`을 기존 방식대로 보낸다. 현재 사진 요청은 Content-Type뿐이다.
근거: `features/photo/flow/analyze-photo-request.ts:109`, `features/learning/firebase-learning-history-api.ts:143–154`.

검증 실패·키 없음은 이번 계측판에서는 분석을 계속하되 검증된 accountKey는 null로 두고 과금 집계에서 제외할 것을 제안한다. 기존 검증 함수는 uid 대조와 게스트 시크릿 검증을 한다(`functions/src/learning-history-auth.ts:91–143`).

로그인 때 이전 게스트 시크릿과 새 토큰을 모두 검증한 `anon→user` 연결을 서버에 남기고 원본 로그는 유지한다. 연결 실패는 재전송하도록 보존한다. 이전 세션은 로그인 반환값에 있지만 새 계정 구조에 이전 키는 없다(`features/auth/firebase-auth-client.ts:354–358`, `features/auth/session-store.ts:244–252`).

4. **지금 확정할 것은 식별자 분리·게스트 연결·제출/시도 분리·usage 확보다.**
나중에 소급하기 어려운 데이터이므로 최소판에 포함할 것을 제안한다. 근거: 위 인증 코드와 `docs/research/2026-09-23-web-return-astra-fable.md:77–83`.
개발자에게 올릴 것은 되돌리기 비싼 계정 연결·보존기간, 아래 작업시간, functions 배포 승인이다. 이번에는 화면 변경을 제안하지 않는다.

5. **최소판도 테스트 포함 2~3일로 추정한다.**
수정 제안: `analyze-photo.ts`, `openai-client.ts`, `analyze-photo-request.ts`, `use-photo-flow.ts`, `firebase-auth-client.ts`, 웹 `app.js`·`analytics.js`. 신규: 기록·계정연결 모듈, 집계 스크립트, 관련 테스트. 호출 지점은 `features/photo/hooks/use-photo-flow.ts:104`다.

KST 자정·중복/재시도·QA/대리·AI 실패·인증 실패·로그인 연결 재전송을 검증한다. 대시보드·결제·유사사진 자동 판별은 제외한다. 빌드 일정은 확인 안 했으므로 **1.0.9 전 완료를 보장할 수는 없다.** 파일 수정은 하지 않았다.

---

## Fable 1차 원문

**1. 웹 참여 코드 — 둘 다 쓴다: 개발자 발급 코드(`participantId`, 링크 `…/?p=코드`) + 브라우저가 스스로 만든 `visitorId`. 둘 다 localStorage에 저장해 링크 없이 와도 이어진다.**
근거: 손 대장이 최종이고 "코드 일치만으로 사람 확정 안 함"(`docs/research/2026-09-23-web-return-astra-fable.md` 결론 2·4) → 코드는 대장(오르비 계정·댓글 URL·코드)과 잇는 열쇠일 뿐이다. 브라우저 저장은 `web-proto/analytics.js:23-26`이 `dasida_qa`로 이미 하는 방식 그대로(`dasida_participant`, `dasida_visitor`). 사파리가 localStorage를 7일 뒤 지우는지는 확인 안 했다(STATUS도 "기억"이라 적혀 있다).
"다른 날 두 번째"는 서버가 `receivedAt`(UTC ISO)을 남기고 세는 쪽에서 `Asia/Seoul`로 날짜를 잘라 distinct day ≥ 2 — 서버는 이미 KST 가정이다(`send-review-reminders.ts:27, :131`). 재시도·같은 사진은 `imageHash`(sha256) 같으면 하나로 접는다. QA·개발자 대리 실행은 **웹이 body에 `qa:true`를 실어야** 한다 — 지금 `analytics.js:31`은 GA만 끄고 서버엔 아무것도 안 간다(`app.js:293-298` body는 `imageDataUrl` 하나). AI 실패는 `ok:false` 행으로 따로. 코드 없이 온 방문자는 `participantId` 없이 `visitorId`만 남기고 사람으로 세지 않는다.

**2. 로그 — Firestore `photoAnalysisRuns` 컬렉션에 사진 1장당 문서 1개 + `logger.info` 한 줄. 실패도 같은 컬렉션에 남긴다.**
필드: `channel`(app/web), `accountKey?`, `participantId?`, `visitorId?`, `qa`, `authVerified`, `receivedAt`, `ok`, `httpStatus`, `errorKind?`, `durationMs`, `model`, `reasoningEffort`, `responseId`, `usage{input, cached, output, reasoning}`, `imageBytes`(dataUrl.length), `imageHash`, 결과 요약(`predictedMethodId·confidence·hasSolvingWork·needsManualSelection·errorCandidateCount·errorConfidence` — `analyze-photo.ts:86-95`에 이미 있는 값).
근거: `usage`는 SDK가 준다 — `input_tokens·cached_tokens·output_tokens·reasoning_tokens`(`functions/node_modules/openai/resources/responses/responses.d.ts:4951-4987`), 지금 `openai-client.ts:547-551`은 안 돌려준다. Firestore 런 로그 패턴은 이미 있다(`firestore-log.ts:16` `diagnosisMethodRuns`, `diagnosis-method.ts:121-136` — try/catch라 로그 실패가 응답을 안 막는다). Cloud Logging만이면 기본 보존 30일(기억, 문서 확인 안 함)이라 11.18·3월 판정을 못 센다. 비용은 월 수백 건이면 Firestore 무료 한도 안일 것 같다(확인 안 함). 사진 원본·transcription·quote는 안 남긴다 — hash만. 계정 삭제(`delete-account.ts:46-51`)는 `users/{accountKey}`만 지우므로 별도 컬렉션의 로그는 남는다 → 4번에 올렸다.

**3. 앱 — 기존 헤더 셋을 그대로 싣는다(`x-dasida-account-key` + `Authorization: Bearer` 또는 `x-dasida-session-secret`). 서버는 1.0.9 시점엔 "있으면 검증하고 결과를 `authVerified`로 적되, 실패해도 분석은 계속". 과금 때는 서버만 바꿔 막는다 → 앱 재출시 불필요.**
근거: `createRemoteAuthHeaders`(`firebase-learning-history-api.ts:143-155`)와 `registerPushToken`이 부르는 방식(`register-push-token-api.ts:17-23`)이 그대로 쓰인다. 서버 검증은 `authenticateLearningHistoryRequest`(`learning-history-auth.ts:75`) 재사용. 검증 실패로 분석을 막으면 학생 화면이 바뀐다(4번 기준 1).
anon→user: 운영 앱은 로그인 필수라(`auth-policy.ts:6-12` `canUseDevGuestAuth = __DEV__`, `_layout.tsx:182-184`가 `/sign-in`으로 보냄) 운영 로그의 accountKey는 사실상 `user:uid`뿐이다. `anon:` 행은 그대로 두고 집계는 `user:`만 센다. 나중에 잇고 싶으면 이관 원장이 anon 키의 sha256을 갖고 있어(`learning-history-import-ops.ts:74-76`) 로그 쪽 키를 해시해 대조할 수 있다. accountKey 없음(`app/photo.tsx:9` `?? null`): 헤더 없이 보내고 서버가 `accountKey:null`로 남긴다. 구조상 `usePhotoFlow`는 accountKey만 받으니(`use-photo-flow.ts:66-69`) provider에서 `registerPushToken`처럼(`provider.tsx:348`) 헤더 만드는 닫힌 함수를 내려준다.

**4. 되돌리기 비싼 것 (지금 안 정하면 로그를 버리거나 앱을 또 낸다)**
- 앱이 1.0.9에 인증 헤더까지 싣는 것 — 키만 실으면 과금 때 1.0.10
- 저장소가 Firestore(영구)라는 것 — Cloud Logging만이면 30일 뒤 소실
- `imageHash`·`qa`·`receivedAt`·실패 행을 첫날부터 — 나중엔 소급 못 센다
- `accountKey`/`participantId` 둘 따로, 키는 uid(🔒 이미)
사람에게 올릴 것: ① 계정 삭제 때 로그를 지울지 익명화할지(개인정보·되돌리기 비쌈) ② 검증 실패해도 분석을 계속한다는 것(학생 화면 안 바뀜을 확인받는 용도) ③ functions 배포 승인(🔒). 링크 모양 `?p=`는 젓가락급.

**5. 크기 — 약 14파일, 8~10시간(견적). 1.0.9 전 최소판은 앱+서버만 5~6시간.**
서버: `analyze-photo.ts`(헤더·body 필드·로그 호출), `openai-client.ts:547-551`(usage 반환), 새 `photo-usage-log.ts` + `functions/tests/photo-usage-log.test.ts`. 앱: `analyze-photo-request.ts:102-112`(헤더 인자), `use-photo-flow.ts`, `photo-flow-screen.tsx:22-26`, `app/photo.tsx`, `app/dev/photo-flow.tsx`, `provider.tsx`; 테스트 `analyze-photo-request.test.ts`, `photo-flow-screen.test.tsx:47-50`, `photo-route.test.tsx:42-63`. 웹: `app.js:293-298`(body에 `participantId·visitorId·qa`), `analytics.js` 옆 저장 몇 줄.
최소판 = 앱 헤더 셋 + 서버가 헤더 읽어 `usage`·결과·실패를 Firestore에 남기는 것. 웹 셋(`participantId·visitorId·qa`)은 앱 빌드와 무관해 1.0.9 뒤에 해도 값이 같다 — 단 필드 이름은 지금 스키마에 박아둔다.

---

## Fable 최종 원문 (astra 답을 보고)

1. `visitorId` — **astra**. 안 넣는다. 10.07은 손 대장, 11.18·3월은 앱 기준이라 소비처가 없고, 브라우저 단위 재방문은 GA가 이미 한다(`analytics.js:48-50`). 세 번째 식별자는 "참여자·브라우저를 같은 식별자로 잡지 말라"는 경고와도 겹친다.
2. anon→user — **Fable**. 새 연결 모듈 안 만든다. 운영은 로그인 필수(`auth-policy.ts:6-12`, `_layout.tsx:182-184`)라 `anon:` 행은 개발 빌드(`qa:true`)뿐. 필요하면 이관 원장의 `sha256(anon 키)`(`learning-history-import-ops.ts:74-76`)로 사후 대조. 게스트를 운영에 여는 날 예약급으로 다시 연다.
3. 재시도 — **절반씩**. 서버 `imageHash`(항상) + `submissionId`는 **웹만**(재시도 때 `selectedFile`이 유지된다 `app.js:306-308`). 앱은 실패하면 `upload`로 돌아가 사진을 다시 고르므로(`use-photo-flow.ts:117-120`) `submissionId`가 뜻이 없다. attemptId는 문서 id.
4. 보존 — **Fable**. 영구, TTL 없음. astra 13개월은 본인도 "제안·확인 안 함". 계정 삭제 때 행 삭제(`delete-account.ts:46-51`은 지금 `users/`만 지운다)는 사람에게 올렸다.
5. usage 파싱 전 확보 — **astra**. `openai-client.ts:542-548` 순서를 usage→outputText→parse로 바꾸고 실패는 `PhotoAnalysisOutputError{usage, responseId}`로 던진다. 덤으로 `:550`이 요청 모델명을 돌려주던 것을 `response.model`로 바꿔 실제 스냅샷을 남긴다. SDK 재시도 횟수는 응답에 없어(`responses.d.ts` retry 0건) 시도별 비용은 못 적고, 월 1회 OpenAI 청구와 대조한다.
6. 웹 — **Fable**. 최소판에서 뺀다. 서버는 `participantId·submissionId·qa·channel` 필드를 지금부터 받고, 웹 10~15줄은 1.0.9 제출 직후 `deploy:proto`로 따로(앱 빌드와 독립).
7. 크기 — **중간**. 최소판(서버 4·앱 11 = 15파일) 8~10시간. astra 2~3일은 계정 연결 모듈·집계 스크립트·웹·시작/종료 2회 쓰기를 포함한 값이라 그 넷을 뺐다.

참고: `firestore.rules`는 저장소에 없어(`firebase.json`엔 emulators만) 규칙 확인은 사람 몫으로 올렸다.

---

## 코드리뷰 판 (09.23 밤~09.24)

1. **Fable 1차** (722f0cb 전체): "빌드·배포해도 된다, 반드시 고칠 것 없음" + 권고 6 → 전부 반영(722f0cb·47ddefc)
2. **Fable 2차** (47ddefc만): "배포해도 된다" + 권고 4
3. **astra** (두 커밋 전체, 기윤 요청): **"보류"** — P1 인증·원장 대기 상한 없음 / P1 재시도 sleep이 55초 신호를 안 봄 / P2 앱 헤더 대기 상한 없음
4. **Fable 최종** (astra 답을 보고): **"고치고 배포."** *"astra의 P1-a·P2는 내가 '선택'으로 내린 게 틀렸다"* — Firestore commit 기본 60초, RN 토큰 갱신 60초라 상한 없이는 성공한 분석도 504. P1-a·P2 지금, P1-b(재시도 sleep)는 뒤로(회귀 아님·드묾·SDK 재시도를 다시 짜야 함). 예산 52+2+3초, 앱 5초. 기윤에게 올릴 것 없음

Claude 확인: `client.js:437-464`(retry-after 상한 없음·sleep이 신호 안 봄), `firebase-auth-client.ts:554-556`(getIdToken), `firestore_client_config.json:69`(Commit 60000), `@firebase/auth/dist/rn` `Delay(30000, 60000)` — 전부 적힌 대로. Firestore 콘솔 규칙은 크롬으로 확인(`users/{uid}/profile/data`만 본인 허용, 나머지 거부).

토큰: astra 코드리뷰 55,126 · Fable 1차 160,367 · 2차 197,795 · 최종 214,239.

### astra 코드리뷰 원문 (gpt-6-astra)

**배포·1.0.9 빌드는 보류.** 학생 응답을 지연시키는 경로와 55초 마감의 빈틈이 확인됐습니다.

**반드시 고칠 것**
- **P1 — 인증·원장 대기에 시간 제한이 없습니다.** `functions/src/analyze-photo.ts:123`, `:144`에서 인증을, `functions/src/photo-analysis-run-log.ts:191`에서 Firestore 쓰기를 기다립니다. 병렬 실행·예외 삼키기는 지연을 막지 못합니다. **장애 시 예상:** 분석이 끝나도 60초를 넘어 504가 나고 원장이 누락될 수 있습니다. 인증 fallback과 원장 대기에 남은 응답 예산을 적용해야 합니다. 현재 "항상 문서 정확히 1개"도 보장되지 않습니다.
- **P1 — 55초 신호가 재시도 대기를 끊지 못합니다.** `functions/src/openai-client.ts:620`은 신호만 전달하지만, SDK `functions/node_modules/openai/client.js:439`는 서버의 재시도 대기 시간을 받아 `:463`에서 취소 불가능한 sleep을 합니다. **예상 재현:** 429와 `Retry-After: 120`이면 함수 한도를 넘깁니다.
- **P2 — 앱도 인증 헤더를 기다리느라 분석 시작이 지연될 수 있습니다.** `features/photo/hooks/use-photo-flow.ts:110`에서 헤더를 먼저 기다리며, `features/learning/remote-auth-headers.ts:13`에는 대기 제한이 없습니다. 실제 토큰 취득은 `features/auth/firebase-auth-client.ts:555`입니다.

**권고** — 마감 테스트는 숫자 비교뿐(`openai-client-photo-output.test.ts:84`). `app.config.js:7`은 1.0.8 — 1.0.9 빌드 전에 올려야 원장 버전이 맞다.

**확인한 것** — 본문 중단은 `AbortError` 경로(`client.js:526`), `TimeoutError` 누락 지적은 근거 없어 제외. 실패 경로 메타데이터 보존 확인. 원장에 사진·학생 글씨·토큰 저장 필드 없음.

### 3차 판 (076050d, 09.24) — 기윤 요청 "둘 다 돌려서 확인"

- **astra 2차** (37,018 토큰): "앱 빌드 OK, **서버 배포 보류**" — P1 원장 0건 가능: 쓰기가 3초를 넘기면 응답 뒤로 넘기는데 Cloud Run은 응답 뒤 CPU를 줄여 인스턴스가 내려가면 사라진다(코드 + 공식 문서 근거, 재현 아님). P1-a·P2는 해결 확인
- **Fable 3차** (243,235): "배포·빌드해도 된다, 반드시 고칠 것 없음" — 같은 자리를 권고 2로만 봄("Firestore가 멈춘 날만")
- **Fable 최종** (254,070): **"고치고 배포."** *"내 권고 2에서 'Firestore가 멈춘 날'만 봤는데, 더 흔한 방아쇠를 놓쳤다"* — 새 인스턴스에선 원장 add가 첫 Firestore 호출이라 3초를 넘길 수 있고 트래픽이 적어 대부분이 그런 인스턴스. 고정 3초 → 응답 마감 57초까지 남은 만큼(Claude가 낸 가운데 안), 안 끝나면 문서를 로그에 통째로. 앱은 안 바뀜. 기윤에게 올릴 것 없음
