# 사진 분석 사용량 로그 — 설계 (2026.09.23)

작성 2026.09.23 · 상태 **구현 완료 (functions 배포 전)** · astra(gpt-6-astra) 1차 → Fable 최종 → Fable 코드리뷰 "빌드·배포해도 된다".
목적: `analyzePhoto` 한 번마다 "누가 · 몇 토큰 · 성공했나"를 남겨서 나중에
(a) 사진 1장 원가 (b) 학생별 사진 장수 (c) "다른 날(KST) 두 번째 사진을 보낸 학생 수"를 셀 수 있게 한다.
1.0.9 빌드 전에 앱·서버를 끝낸다 (STATUS 「👉 다음 세션 첫 일」 2번).

## 0. 결정 목록

- 로그 필드는 `accountKey`(앱) + `participantId`(웹) 둘로 따로. 웹 코드를 `x-dasida-account-key`에 안 섞는다 — 🔒 (둘 다, 09.23 web-return 결론 4)
- 저장소는 **Firestore 컬렉션 `photoAnalysisRuns`** 가 원장, `logger.info`는 장애 기록 — (둘 다)
- 사진 1장(호출 1번)당 문서 **1개**, 끝날 때 한 번 쓴다. 시작/종료 2회 쓰기는 안 한다 — (Fable; astra는 2회)
- 실패 호출도 같은 컬렉션에 남긴다. 단 zod 400(요청 자체가 깨진 것)은 안 남긴다 — (Fable)
- `usage`는 JSON 파싱 **전에** 잡아 파싱 실패에도 남긴다 — (astra)
- 브라우저 자체 발급 `visitorId`는 **안 넣는다** — (astra)
- 웹 참여 코드는 개발자가 발급, 링크 `…/?p=코드`, localStorage에 저장, 코드 없으면 `participantId=null` — (astra)
- anon→user 서버 연결 모듈은 **안 만든다**. 운영은 로그인 필수라 `anon:` 행은 개발 빌드뿐 — (Fable)
- 재시도 판별은 서버 `imageHash`(항상) + 웹만 `submissionId`(재시도에 유지). 앱은 실패하면 사진을 다시 고르므로 `submissionId`를 안 보낸다 — (둘 다 절반씩)
- 앱은 1.0.9에 **인증 정보까지** 싣는다(기존 헤더 셋). 서버는 지금 검증하되 실패해도 분석은 계속, `authVerified:false`로 남긴다 — (둘 다)
- 보존은 **영구**(TTL 없음) — (Fable; astra 13개월은 근거 없음)
- 🔒 **계정을 지우면 그 계정의 `photoAnalysisRuns` 행도 같이 지운다** — 기윤 A안 (09.23). 판정 숫자는 그때까지 센 값이라 안 바뀐다. 이번 최소판에 넣는다(같은 functions 배포 — 빈 틈이 안 생기게)
- 웹 코드 변경은 **1.0.9 전 최소판에서 뺀다**. 서버는 웹 필드를 지금부터 받는다 — (Fable)
- 10.07은 손 대장, 코드 일치로 사람을 확정하지 않는다 — 🔒 (둘 다)
- functions 배포는 사람이 승인한 뒤 — 🔒

## 1. Firestore 스키마

컬렉션 `photoAnalysisRuns` (최상위. `diagnosisMethodRuns`와 같은 자리 — `functions/src/firestore-log.ts:16`).
문서 id: 자동(`add()`). 이 id가 "시도(attempt) id"다.

```
schemaVersion   number          1
channel         string          'app' | 'web' | 'unknown'   — body.channel, 없으면 'unknown' (= 1.0.8 앱·기타)
appVersion      string | null   body.appVersion (앱만)
accountKey      string | null   헤더 x-dasida-account-key 원문 (검증 전 값)
authVerified    boolean         authenticateLearningHistoryRequest 통과 여부
authKind        string | null   'firebase' | 'anonymous' | null
authError       string | null   검증 실패 사유 (LearningHistoryAuthError.message), 통과면 null
participantId   string | null   body.participantId (웹만)
submissionId    string | null   body.submissionId (웹만)
qa              boolean         body.qa, 없으면 false
receivedAt      string          서버 수신 시각 ISO(UTC)
kstDate         string          receivedAt을 KST로 자른 'YYYY-MM-DD' (서버가 계산)
ok              boolean
httpStatus      number          200 | 500
errorKind       string | null   'openai_timeout' | 'openai_error' | 'empty_output' | 'parse_failed' | 'schema_failed' | 'unknown'
errorMessage    string | null   200자 절단. AI 출력 미리보기는 넣지 않는다
durationMs      number          OpenAI 호출 시작~끝 (실패 포함)
modelRequested  string          OPENAI_VISION_MODEL 값
model           string | null   response.model (실제 스냅샷)
reasoningEffort string | null
responseId      string | null
usage           map | null      { input, cached, output, reasoning, total } — 모르면 null
imageBytes      number          imageDataUrl.length
imageMime       string          'jpeg' | 'png' | 'webp'
imageHash       string          sha256(imageDataUrl) hex
result          map | null      { predictedMethodId, confidence, hasSolvingWork, needsManualSelection, errorCandidateCount, errorConfidence }
```

안 남기는 것: 사진 원본, `transcription`, `quote`/`why`(학생 글씨 내용), 세션 시크릿, Bearer 토큰.
`accountKey`는 이미 `users/{accountKey}` 문서 경로로 쓰이는 값이라 새 노출이 아니다(`functions/src/learning-history.ts:441`).

**보안 규칙:** 저장소에 `firestore.rules`가 없다(`find` 0건. `firebase.json`엔 emulators.firestore만 `:33`, rules 배포 항목 없음).
규칙은 콘솔에서 관리되는 것 같다 — 확인 안 했다. 서버는 admin SDK라 규칙과 무관하지만, 클라이언트 SDK가
`photoAnalysisRuns`를 읽을 수 있는지는 콘솔 규칙에 달렸다 → 사람에게 올린다(§8).

## 2. 서버 변경

### `functions/src/openai-client.ts` — `requestPhotoAnalysisFromOpenAI` (`:501-552`)

- 반환에 `usage`를 추가한다. `response.usage`를 `input_tokens · input_tokens_details.cached_tokens · output_tokens · output_tokens_details.reasoning_tokens · total_tokens`에서 읽는다(SDK 타입 `node_modules/openai/resources/responses/responses.d.ts:4951-4987`, openai ^6.27).
- **파싱 전에 잡는다.** 지금은 `output_text` 없음(`:543`)·`JSON.parse` 실패(`:548`)가 나면 usage가 같이 사라진다. 순서를 `usage 읽기 → outputText 검사 → parse`로 바꾸고, 실패는 `PhotoAnalysisOutputError { kind: 'empty_output' | 'parse_failed', responseId, usage }`로 던진다. 에러 메시지에 출력 미리보기를 넣지 않는다.
- `model`은 지금 요청값을 그대로 돌려준다(`:550`). `response.model`을 `model`로, 요청값은 `modelRequested`로 따로 돌려준다.
- 순수 함수 `parsePhotoAnalysisResponse({ id, model, output_text, usage })`로 빼서 테스트한다. `new OpenAI(...)`는 그대로 안에 둔다.
- SDK 재시도(`maxRetries: 1`, `:515`) 횟수는 응답에 없다(`responses.d.ts`에 retry 필드 0건) → 시도별 비용은 못 적는다. 대신 월 1회 usage 합을 OpenAI 청구 페이지와 대조한다(§5).

### 새 파일 `functions/src/photo-analysis-run-log.ts`

순수 함수(테스트 대상)와 쓰기 함수 하나.

```
readRunRequestContext(headers, body)  → { channel, appVersion, participantId, submissionId, qa, accountKeyClaimed }
toKstDate(isoUtc)                     → 'YYYY-MM-DD'  (ms + 9h → toISOString().slice(0,10); KST는 DST 없음)
hashImageDataUrl(dataUrl)             → sha256 hex
classifyAnalyzeError(error)           → errorKind  (ZodError→'schema_failed', PhotoAnalysisOutputError→kind,
                                        error.name==='APIConnectionTimeoutError'→'openai_timeout', OpenAI APIError→'openai_error', 그 외 'unknown')
buildPhotoAnalysisRunDoc(draft)       → 문서 객체 (stripUndefined 적용, schemaVersion:1 고정)
writePhotoAnalysisRun(doc)            → Firestore add. 안에서 try/catch, 실패는 logger.error('analyzePhoto run log write failed') 후 삼킨다. 절대 던지지 않는다
```

### `functions/src/analyze-photo.ts`

- body 스키마(`:24-29`)에 선택 필드 추가. 모르는 필드는 지금처럼 무시(strict 아님).
  ```
  channel: z.enum(['app','web']).optional()
  appVersion: z.string().max(32).optional()
  submissionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional()
  participantId: z.string().regex(/^[A-Za-z0-9_-]{4,32}$/).optional()
  qa: z.boolean().optional()
  ```
- 헤더 검증: `getLearningHistoryRequestAccountKey`로 키를 읽고, 있으면 `authenticateLearningHistoryRequest(headers, key)`(`learning-history-auth.ts:69-159`)를 try/catch로 부른다. 통과 → `authVerified:true, authKind`. 실패 → `authVerified:false, authError`. **어느 쪽이든 분석은 계속한다.** 키가 없으면 검증을 안 하고 `accountKey:null`.
  (익명 키는 첫 호출에 `users/anon:…/private/auth` 문서를 만든다 `:127-134` — 운영엔 익명이 없어 실질 영향 없음)
- 흐름:
  ```
  receivedAt = now; startedAt = Date.now()
  draft = { ...context, ...auth, receivedAt, kstDate, imageBytes, imageMime, imageHash, modelRequested, reasoningEffort }
  try {
    openAiResponse = await requestPhotoAnalysisFromOpenAI(...)
    draft.usage/model/responseId ← openAiResponse
    raw = VisionRawResultSchema.parse(openAiResponse.result)      // ZodError → schema_failed (usage는 이미 draft에 있다)
    result = buildPhotoRouterResult(raw)
    draft.ok=true, httpStatus=200, result=요약, durationMs
    await writePhotoAnalysisRun(buildPhotoAnalysisRunDoc(draft))   // 안 던진다
    logger.info('analyzePhoto done', { 기존 필드 + accountKey, participantId, qa, usage, durationMs })
    response.status(200).json(result)
  } catch (error) {
    draft.ok=false, httpStatus=500, errorKind=classifyAnalyzeError(error), errorMessage, durationMs
    if (error instanceof PhotoAnalysisOutputError) draft.usage/responseId ← error
    logger.error('analyzePhoto failed', error)
    await writePhotoAnalysisRun(...)
    response.status(500).json({ error: 'Failed to analyze photo' })
  }
  ```
- 로그 쓰기는 응답 **전에** `await`한다(응답 뒤 작업은 v2에서 잘릴 수 있다). `writePhotoAnalysisRun`이 안 던지므로 응답을 막지 않는다 — `diagnosis-method.ts:121-136`과 같은 규약.
- SDK 타임아웃 45초 < 함수 60초(`:49`, `openai-client.ts:514-515`)라 타임아웃도 catch에 들어와 한 줄 남는다. 인스턴스가 통째로 죽는 경우만 행이 빠진다 — 감수한다.
- `:84-85` 주석("의도적으로 생략")을 지운다.

## 3. 앱 변경

헤더는 다른 함수와 **같은 셋**: `x-dasida-account-key` + (로그인) `Authorization: Bearer <idToken>` / (게스트) `x-dasida-session-secret` — `createRemoteAuthHeaders`(`features/learning/firebase-learning-history-api.ts:143-155`) 그대로 쓴다.
`usePhotoFlow`는 accountKey만 받는다(`use-photo-flow.ts:66-69`, 훅이 프로바이더를 직접 안 부르는 이유는 `:62-65`) → 헤더를 만드는 닫힌 함수를 `registerPushToken`처럼(`features/learner/provider.tsx:55, :348`) 위에서 내려준다.

- 새 `features/learning/remote-auth-headers.ts` — `createGetRemoteAuthHeaders(authClient)` → `(accountKey) => Promise<Record<string,string>>`. `getRemoteAuthContext(accountKey)` 성공이면 `createRemoteAuthHeaders(ctx)`, 실패(세션 불일치·토큰 못 받음)면 `{ 'x-dasida-account-key': accountKey }`만 돌려주고 `console.warn`. 절대 던지지 않는다 — 헤더 때문에 사진 분석이 멈추면 안 된다.
- `features/learner/provider.tsx` — `const getRemoteAuthHeaders = createGetRemoteAuthHeaders(authClient)`; `CurrentLearnerContextValue`에 `getRemoteAuthHeaders` 추가, value에 넣는다.
- `app/photo.tsx`, `app/dev/photo-flow.tsx` — `useCurrentLearner()`에서 `getRemoteAuthHeaders`도 집어 `PhotoFlowScreen`에 내려준다.
- `features/photo/screens/photo-flow-screen.tsx:22-26` — prop `getRemoteAuthHeaders?` 받아 `usePhotoFlow`에 그대로.
- `features/photo/hooks/use-photo-flow.ts:104` — `const headers = accountKey && getRemoteAuthHeaders ? await getRemoteAuthHeaders(accountKey) : {};` → `requestAnalyze(imageDataUrl, { headers, qa: __DEV__ })`.
- `features/photo/flow/analyze-photo-request.ts:102-112` — 시그니처 `requestAnalyze(imageDataUrl, options?: { headers?; qa? })`. `headers: { 'Content-Type': 'application/json', ...options.headers }`, body `{ imageDataUrl, channel: 'app', appVersion: Constants.expoConfig?.version ?? undefined, qa: options.qa ?? false }`. `expo-constants`는 `firebase-auth-client.ts:10`·`profile-screen-view.tsx:399`가 이미 쓴다.

- `qa`: 앱은 `__DEV__`. 스토어 빌드에서 기윤이 직접 돌린 건 집계 스크립트의 제외 목록(기윤 계정 키)으로 뺀다(§5).
- accountKey가 없는 순간(`app/photo.tsx:9` `?? null`)은 헤더 없이 보내고 서버가 `accountKey:null`로 남긴다.
- anon→user: 운영 앱은 로그인 필수(`features/auth/auth-policy.ts:6-8` `isMandatorySocialAuthEnabled()=true`, `:10-12` `canUseDevGuestAuth()=__DEV__`, `app/_layout.tsx:182-184`가 `/sign-in`으로 보낸다) → 운영 로그의 `accountKey`는 `user:{uid}`뿐이다. `anon:` 행은 개발 빌드(`qa:true`)에서만 생기고 집계에서 빠진다. 나중에 잇고 싶으면 이관 원장이 `sha256(anon 키)`를 갖고 있어(`functions/src/learning-history.ts:1214-1220`, `learning-history-import-ops.ts:74-76`) 로그 키를 해시해 대조하면 된다 — 단 이관은 게스트→로그인 전환 때만 돈다(`current-learner-controller.ts:465-475`). 게스트를 운영에 여는 날엔 이 항목을 예약급으로 다시 연다.

## 4. 웹 변경 — 이번 최소판에서 뺀다

이유: 10.07 판정은 손 대장이고 두 번째 풀이는 오르비로 온다(🔒). 11.18·3월 판정은 앱 기준. 웹 배포(`deploy:proto`, `package.json:24`)는 앱 빌드와 독립이라 언제 해도 값이 같다. 서버가 필드를 먼저 받으니(§2) 웹은 1.0.9 제출 직후 따로 한다.

할 때 바꿀 것(`web-proto/app.js`, 10~15줄):
- 시작 시 `new URLSearchParams(location.search).get('p')`가 있으면 `localStorage.setItem('dasida_participant', p)` (`analytics.js:19-26`과 같은 try/catch). 코드 형식 `^[A-Za-z0-9_-]{4,32}$` 아니면 무시.
- `setFile()`(`:266`)에서 `submissionId = crypto.randomUUID()` 새로 만든다 — 같은 파일로 다시 누르면(`:306-308`은 `selectedFile`을 유지한다) 같은 값이 간다.
- `fetch(ANALYZE_URL` body(`:296`)에 `channel:'web', participantId(없으면 생략), submissionId, qa: localStorage.dasida_qa==='1' || isLocal`. 지금은 `?qa=1`이 GA만 끄고 서버엔 아무것도 안 간다(`analytics.js:31-35`).
- `analytics.js`는 안 건드린다.
- 코드 발급: 기윤이 학생마다 8자 무작위 코드를 만들어 오르비 답글 링크에 붙이고, 대장에 코드·오르비 계정·댓글 URL·첫 풀이 날짜를 적는다. 링크 없이 다시 와도 localStorage로 이어진다(사파리가 며칠 뒤 지우는지는 확인 안 했다). 코드 없는 방문은 `participantId:null`.

## 5. 세는 법 (집계 스크립트는 뒤로, 규칙은 지금 고정)

기본 필터: `qa == false`, 계정별 (b)(c)는 **`authVerified == true`도** — 공개 엔드포인트라 `accountKey`는 검증 안 된 주장값이다(Fable 코드리뷰), 제외 목록(기윤 계정 키 — STATUS D칸에 적힌 로그인 계정 `user:iWaB…`가 기윤 것인지는 기윤이 확인) 제거.
- (a) 사진 1장 원가 = `ok==true && usage!=null` 행의 토큰 × 모델 단가 합 ÷ 행 수. 실패 포함 총비용은 따로 낸다(`ok` 무관, usage 있는 행). 단가표는 저장소에 없다 — 월 1회 OpenAI 청구 페이지와 대조해 usage 누락(타임아웃·SDK 재시도)을 잡는다.
- (b) 학생별 장수 = `ok==true` 행을 `accountKey`(`user:`만)로 묶어 **distinct imageHash** 수. 같은 사진 재전송·실패 후 재시도는 1장.
- (c) 다른 날 두 번째 = 한 `accountKey`의 `ok==true` 행 중 **kstDate가 다르고 imageHash도 다른** 두 행이 있는 학생 수. 웹은 `participantId`로 같은 규칙 — 단 사람 확정은 대장에서.
- AI 실패 = `ok==false`를 `errorKind`별로. 제출 수(시도)와 따로 본다.
- 1.0.8 앱 트래픽은 `channel:'unknown'`, 헤더 없음으로 구분된다.
- **재촬영 (09.24 astra·Fable 둘 다)**: 같은 문제를 다음 날 다시 찍으면 해시가 달라 (c)에 "두 번째"로 세진다. 학생 글씨를 안 남겨서 원장만으론 못 가른다 → **칸을 더 저장하지 않고 사람이 확인한다**(3명 = 만나서 묻는 표본). 같은 문제라고 무조건 빼지 말고 새로 풀어 보낸 건지 본다. (c)는 원장으로 "후보"까지만 센다
- **첫 집계 전에 정할 것**: ① "두 번째"의 정의 — 사진 올림(마케팅 문서 `:804`, 원장이 세는 것) vs 사진 노트 생성 완료(`:722`, 복습 과제 `source:'photo'`로 따로 셈) ② 제외할 기윤 계정 키

## 6. 테스트 — 무엇이 깨지면 잡히나

서버 (`functions/tests/*.test.ts`, node:test — `functions/package.json:11`):
- `photo-analysis-run-log.test.ts`: `toKstDate('2026-09-23T14:59:59Z')==='2026-09-23'`, `'…T15:00:00Z'==='2026-09-24'` (자정 경계); `hashImageDataUrl` 같은 입력 같은 값; `readRunRequestContext`가 형식 틀린 `participantId`를 버리고 `qa` 기본 false, `channel` 기본 'unknown'; `buildPhotoAnalysisRunDoc`에 `undefined`가 없고 `schemaVersion===1`; `classifyAnalyzeError`가 ZodError→`schema_failed`, 타임아웃 이름→`openai_timeout`.
- `openai-client-photo-output.test.ts`: `parsePhotoAnalysisResponse`가 깨진 JSON에서 `PhotoAnalysisOutputError`를 던지고 그 에러에 `usage·responseId`가 붙어 있다; `usage` 없는 응답은 `null`.
- 기존 `analyze-photo-core.test.ts`는 그대로.
- 핸들러 자체는 단위 테스트가 없다(지금도 없다). 배포 뒤 개발 빌드로 1장 보내 Firestore 문서를 눈으로 본다.

앱 (jest):
- `features/learning/__tests__/remote-auth-headers.test.ts`: firebase 컨텍스트→`x-dasida-account-key`+`Authorization`; anonymous→`x-dasida-session-secret`; `getRemoteAuthContext`가 던지면 키 헤더만 돌려주고 안 던진다.
- `features/photo/flow/__tests__/analyze-photo-request.test.ts`: 기존 5xx·4xx 테스트 유지 + 헤더가 `Content-Type`과 합쳐지고 body에 `channel:'app'`·`qa`가 있다.
- `features/photo/screens/__tests__/photo-flow-screen.test.tsx:47-50`: `getRemoteAuthHeaders`를 prop으로 주면 `requestAnalyze` 두 번째 인자에 그 헤더가 들어간다 1개; prop 없이도 흐름이 돈다(기존 21개가 그 증거).
- `app/__tests__/photo-route.test.tsx:42-63`: `toEqual`에 `getRemoteAuthHeaders` 추가(지금 정확 일치 검사라 안 고치면 깨진다).

## 7. 1.0.9 전 최소판 / 뒤로 미룬 것

최소판(앱 빌드에 묶인 것만): §2 서버 전부 + §3 앱 전부 + §6 테스트 + 계정 삭제 시 행 삭제(아래) + functions 배포(승인 후) + 개발 빌드로 1장 실측.
뒤로(앱 빌드와 무관, 언제 해도 값이 같다): §4 웹 10~15줄(1시간), 집계 스크립트 `scripts/photo-usage-report.ts`(2시간).

**계정 삭제 시 행 삭제** (`functions/src/delete-account.ts:46-51`, 기윤 A안): `users/` 두 경로를 지우는 `Promise.all` 옆에서
`photoAnalysisRuns`를 `where('accountKey', '==', accountKey)`로 찾아 지운다(`BulkWriter` — 500건 배치 한도를 신경 안 써도 된다).
단일 필드 동등 쿼리라 색인을 새로 안 만든다. 테스트: 쿼리·삭제를 순수 함수로 빼서 "그 키 행만 지우고 다른 키는 안 건드린다" 1개.

## 8. 사람에게 올릴 것

- ✅ **계정 삭제 때 `photoAnalysisRuns` 행을 지울지** → 기윤 A안(09.23): 같이 지운다. §7에 넣었다.
- **콘솔 Firestore 규칙에서 `photoAnalysisRuns`가 클라이언트에 닫혀 있는지** (저장소에 rules 없음). 추천: 다른 최상위 컬렉션(`diagnosisMethodRuns`)과 같은 상태인지 한 번 보고, 열려 있으면 닫는다.
- **검증 실패해도 분석을 계속한다** — 학생 화면이 안 바뀌는 쪽이라 확인만. 과금을 켤 때 서버만 바꿔 막는다(앱 재출시 없음).
- **functions 배포 승인** (🔒).
- 1.0.9 빌드를 이 작업 뒤로 미루는 것(시간). 09.24 아침 E 확인 → 이 작업(하루) → 빌드 순서 추천.

## 9. 크기

파일: 서버 4(`analyze-photo.ts`, `openai-client.ts`, 새 `photo-analysis-run-log.ts`, 테스트 2) · 앱 11(`provider.tsx`, 새 `remote-auth-headers.ts`+테스트, `analyze-photo-request.ts`+테스트, `use-photo-flow.ts`, `photo-flow-screen.tsx`+테스트, `app/photo.tsx`, `app/dev/photo-flow.tsx`, `photo-route.test.tsx`) ≈ **15파일**.
여기에 계정 삭제 행 삭제(A안) 서버 1~2파일(`delete-account.ts` + 테스트)이 붙어 **16~17파일**.
시간(견적): 서버 3h · 앱 3h · 테스트 2h · 삭제 처리 1h · 배포·실측 1h = **9~11시간**. 웹·스크립트까지 하면 +3h.
astra의 "2~3일"은 계정 연결 모듈·집계 스크립트·웹·시작/종료 2회 쓰기를 포함한 값이다 — 그 넷을 뺐다.

## 10. 구현하며 바뀐 것 (09.23)

- **선택 필드는 zod에 안 넣었다.** 설계 §2는 body 스키마에 `channel`·`participantId` 등을 넣자고 했지만, 그러면 형식이 틀린 필드 하나로 400이 나서 학생 분석이 막힌다. zod는 `imageDataUrl`만 보고, `readRunRequestContext`가 형식 틀린 값을 조용히 `null`로 버린다. Fable 리뷰: 맞다
- 계정 키 헤더가 200자를 넘으면 검증 없이 `accountKey:null` (`delete-account.ts:10` 스키마와 같은 상한)
- `writePhotoAnalysisRun`은 문서 객체가 아니라 만들 재료를 받아 **만들기까지 try 안에서** 한다 — 만들기가 던지면 성공한 분석이 500으로 가지 않게 (Fable 권고)
- `PhotoAnalysisOutputError`가 `model`도 싣는다 — `parse_failed`·`empty_output` 행에도 실제 스냅샷이 남는다 (Fable 권고)
- 인증 검증(`resolveRunAuth`)을 AI 호출과 **동시에** 돌린다 — 응답을 늦추지 않게 (Fable 권고 2). 실패 경로는 소요 시간을 인증 대기 전에 잰다
- 계정 삭제는 `bulkWriter.delete` 건별 promise를 `close()`와 같이 기다린다 — `close()`는 건별 실패에 reject하지 않아서, 안 기다리면 삭제 실패가 성공으로 보고된다

## 11. 알고 있는 빈틈

- ~~타임아웃 + SDK 재시도면 행이 안 남는다~~ → **고침.** SDK는 타임아웃도 재시도해서(`functions/node_modules/openai/client.js:309-317`) 45초 + 재시도가 함수 60초를 넘겼다. 호출 전체에 `AbortSignal.timeout`(`PHOTO_ANALYSIS_DEADLINE_MS`)을 걸어 마감에 끊기면 재시도 없이 `APIUserAbortError`로 던지고 `openai_timeout` 행이 남는다
- **60초 예산 (09.24, astra 코드리뷰 두 판 → Fable 최종 두 번)**: AI 마감 **52초** + 인증 대기 상한 **2초**(`RUN_AUTH_WAIT_MS`, 넘기면 `authError:'auth_timeout'`) → 원장 쓰기는 **응답 마감 57초(`RESPONSE_DEADLINE_MS`, 요청 도착 기준)까지 남은 만큼** 기다린다(`runLogWriteWaitMs` — 보통 분석 18초면 39초, 최악에도 3초 `RUN_LOG_WRITE_MIN_MS`) → 파싱·응답 여유 3초 ≤ 60초. 고정 3초였던 076050d를 바꾼 이유(astra 2차 "보류" → Fable이 자기 권고를 뒤집음): 새 인스턴스에선 원장 `add`가 첫 Firestore 호출이라(토큰·gRPC 채널) 3초를 넘길 수 있고, v2는 응답 뒤 CPU를 줄여 뒤로 넘긴 쓰기가 사라질 수 있다 — 성공 행이 빠지면 (b)(c)가 작게 나온다. 그래도 안 끝나면 응답 먼저 + 문서를 `logger.warn(..., { doc })`로 통째로 남겨 30일 안에 손으로 되살린다. 근거: Firestore commit 기본 60초(`firestore_client_config.json:69`), firebase-admin 인증서 fetch엔 timeout 없음. 예산 두 줄은 테스트가 `ANALYZE_PHOTO_TIMEOUT_SECONDS`에 묶는다. 학생은 60초 504 대신 52초에 같은 안내문, Firestore가 느린 날엔 결과가 늦게라도 온다. `authPromise`엔 만들 때 바로 `.catch`(처리기 없는 거부 = Node 22 인스턴스 종료)
- **앱 헤더 대기 상한 5초** (astra P2): 모바일 Firebase 토큰 갱신은 망이 멈추면 60초(`@firebase/auth` `Delay(30000, 60000)`). 5초 넘으면 계정 키만 싣는다. 헤더는 사진 줄이는 동안 같이 받는다
- **남은 빈틈 — 재시도 대기 (astra P1-b, Fable "뒤로")**: SDK는 `retry-after` 헤더만큼 신호를 안 보고 잔다(`client.js:437-464`, 상한 없음). 늦게 온 429가 길게 기다리라 하면 60초 504·행 없음. 47ddefc 전부터 있던 동작이고 OpenAI 429의 retry-after는 보통 ms~초라 드물다. 고치려면 SDK 재시도를 직접 짜야 한다 — 원장에서 보이면 그때
- ✅ **클라이언트는 `photoAnalysisRuns`를 못 읽는다 (로그인해도).** 콘솔 규칙(09.24 Claude가 크롬으로 확인)은 `users/{uid}/profile/data`를 본인에게만 열고(`request.auth.uid == uid`) 나머지는 규칙이 없다 = 전부 거부. 로그인 안 한 요청은 Firestore REST로도 `403 PERMISSION_DENIED` 확인. 서버는 admin SDK라 규칙과 무관
- 빌드 체크리스트: **`app.config.js:7` `version`을 1.0.9로 올려야** 원장 `appVersion`이 맞게 찍힌다 (Fable)
- **1.0.9가 뜬 날 스토어 빌드로 1장** 보내 `qa:false`·`appVersion:"1.0.9"`·`authVerified:true`를 눈으로 본다 — 09.24 실측은 개발 빌드(`qa:true`)뿐 (Fable)
- **"더 할 게 있나" (09.24 astra·Fable 둘 다)**: 코드로 더 할 건 없다. 1.0.9 전엔 버전 한 줄뿐
