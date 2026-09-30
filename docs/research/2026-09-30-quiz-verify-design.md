# 쪽지·재도전 검산 장치(요청 2) — 웹 프로토 구현 설계서

2026-09-30 · 코드 안 고침, 설계만. 측정 근거 `~/dev/dasida-measure/2026-09-30-quiz-verify/README.md`(verify.cjs = 프롬프트·스키마 원본). 줄 번호는 `web-proto/app.js` 6bce310 기준.

## 결론 먼저
1. 서버는 새 파일 둘 — `functions/src/verify-quiz-core.ts`(순수) + `verify-quiz.ts`(onRequest `verifyQuiz`), `index.ts`에 export 한 줄. `openai-client.ts`·`analyze-photo*.ts`는 import도 안 한다 → 다른 세션이 뭘 고쳐도 이쪽 빌드는 안 깨진다.
2. **문항마다 요청 하나**(check 1 + retry 1). 묶으면 쪽지 결과가 재도전 지연(최대 8.4초)에 묶인다. 서버는 정답 번호를 프롬프트에 안 넣고, 받은 `marked`와 비교만 해서 `verdict`를 돌려준다.
3. 웹은 `analysis_shown`(:399) 직후 두 fetch를 뒤에서 띄우고, `showCheck`·`startRetry`가 자기 차례에 최대 5초 기다린다. `match`가 아니면 그 문제만 건너뛴다.
4. 건너뜀 ≠ 실패: `checkPassed`(bool) → `checkResult: 'pass'|'fail'|'skip'`, 재도전 건너뜀은 `'unverified'`. 재도전 첫 문구·노트 줄·곡선 셋 다 skip을 ✗로 안 읽는다.
5. GA는 `quiz_verify` 이벤트 하나. 배포는 `--only functions:verifyQuiz` → 33문항 라이브 재현(오탐 0/54 필수) → `deploy:proto`. 되돌리기 = app.js revert 후 `deploy:proto`(호출자가 웹뿐).

## 서버
**파일**
- `verify-quiz-core.ts` (firebase import 없음): `QUIZ_VERIFY_INSTRUCTIONS`(verify.cjs INSTR 글자 그대로) · `QUIZ_VERIFY_SCHEMA` `{solved:string, answerIndex:integer}` strict · `buildQuizVerifyInput({setup,prompt,options})` → `[상황]\n…\n\n[질문]\n…\n\n[보기]\n0. …`(setup 비면 [상황] 블록 생략 — 33문항 전부 setup이 있어서 이 경우는 안 쟀다) · `judgeQuizVerify(answerIndex, marked)` · `VERIFY_QUIZ_TIMEOUT_SECONDS=20` · `VERIFY_QUIZ_OPENAI_TIMEOUT_MS=12_000`.
- `verify-quiz.ts`: `onRequest({ region:'asia-northeast3', timeoutSeconds:20, cors:true, invoker:'public', secrets:[OPENAI_API_KEY], maxInstances:2, concurrency:10 })`. `defineString('OPENAI_VERIFY_MODEL', default 'gpt-5.4-mini')`·`('OPENAI_VERIFY_REASONING_EFFORT', default 'low')`. 클라이언트 자체 생성 `new OpenAI({ apiKey, timeout:12_000, maxRetries:0 })` — 재시도는 웹 5초 밖이라 돈만 쓴다. 출력 파싱(`output_text` → JSON.parse → zod) 자체 5줄.
- `index.ts`: `export { verifyQuiz } from './verify-quiz';`

**요청**(문항 하나)
```json
{ "kind": "check", "setup": "g(x)=∫…(선택)", "prompt": "f(x)<0일 때 …?", "options": ["0", "f(x)", "2f(x)"], "marked": 2, "submissionId": "uuid|null", "qa": false }
```
zod: `kind` enum check|retry · `setup` ≤600 선택 · `prompt` 1~300 · `options` **정확히 3개**(각 1~120; 프롬프트 "번호(0,1,2)"가 3지 전제 — 4지로 가면 프롬프트와 같이 바꾼다) · `marked` 정수 0~2 · `submissionId` ≤64 nullable · `qa` boolean. 본문 4KB 미만.

**응답 200**
```json
{ "verdict": "match", "answerIndex": 2, "model": "gpt-5.4-mini", "durationMs": 1630 }
```
**판정** `judgeQuizVerify`: `answerIndex === marked` → `match` / 0~2인데 다름 → `mismatch` / -1 `none` / -2 `multiple` / -3 `ambiguous` / 그 외(범위 밖·비정수) `invalid`. 웹은 `match`만 쓴다. answerIndex는 로그용 — 정답 교체 없음.
**에러**: 405 / 400 `{error:'Invalid request body'}` / 500 `{error:'verify_failed'}`(OpenAI 오류·12초 초과·파싱 실패 전부; 로그에서만 `openai_timeout` 구분). 로그 한 줄 `logger.info('verifyQuiz done', { kind, verdict, answerIndex, marked, durationMs, model, responseId, usage, qa, submissionId })` — 문항 본문·solved는 안 남긴다. 원장(photoAnalysisRuns)엔 안 쓴다(그 파일 안 건드림).
**비용 가드**: 사진 없음(입력 ~245·출력 ~289 토큰 = 요청 1 출력의 2~4%). 동시 상한 2×10=20. 정상 트래픽은 사진 1장당 최대 2건.

## 웹 (`web-proto/app.js`)
**바뀌는 자리**
- :5 `VERIFY_URL`. :74 근처 `let verifyRun = null; let verifySeq = 0;` + `VERIFY_WAIT_MS = 5_000`, `VERIFY_FETCH_TIMEOUT_MS = 15_000`.
- :328 `setFile` 끝: `verifySeq += 1; verifyRun = null;`
- :399 `analysis_shown` 뒤 `startQuizVerify(result)` — 조건 `hasSolvingWork && errorCandidates[0] && errorConfidence >= ERROR_CONFIDENCE_MIN`(짚기로 가는 조건과 같음). `verifyRun = { seq: ++verifySeq, waitedOnce:false, check: verifyQuiz(check 4필드), retry: retryShape(cand) ? verifyQuiz(retry 4필드) : null }`. 후보 0만 — `startPointing(0)`밖에 안 부른다(:649 주석).
- 새 `verifyQuiz(body)`: fetch, **절대 안 던짐** → `{ verdict:'match'|'skip', reason, ms }`(non-ok→`error`, Abort→`timeout`, 서버 verdict가 match 아니면 reason=그 verdict).
- 새 `awaitVerdict(kind)`: 이미 와 있으면 0초. 아니면 `Promise.race([run[kind], 5초 → {skip, 'wait_timeout'}])`. 반환에 `stale = run.seq !== verifySeq`. 절대 안 던짐. `run.waitedOnce`: 이미 한 번 5초를 태웠으면(쪽지 wait_timeout → 바로 재도전) 다시 안 기다리고 즉시 skip — 빈 화면 10초 방지.
- `retryShape(cand)`: :748~752 hasRetry 계산을 함수로 빼서 `startRetry`·`startQuizVerify` 둘이 쓴다.
- :702 `showCheck` → async. `const v = await awaitVerdict('check')`; `v.stale`면 return(아무것도 안 그림); `logEvent('quiz_verify', {kind:'check', react, …})`; match 아니면 `startRetry(idx, {…, checkResult:'skip'})`로 직행. match면 기존 그대로, :725 `checkPassed: passed` → `checkResult: passed ? 'pass' : 'fail'`.
- :744 `startRetry` → async. hasRetry 관문(:753) 뒤 `await awaitVerdict('retry')`; stale→return; GA; match 아니면 `showWrongNote(idx, ctx, 'unverified')`.
- :755 `ctx.checkPassed ?` → `ctx.checkResult === 'fail' ? '괜찮아…' : '그럼 진짜 마지막…'`.
- :809~810 노트 줄: 조각 배열 — check pass `쪽지시험 ✔`/fail `✗`/skip 없음 · retry pass·fail만(`unverified`·`skip`·`none` 없음). 조각 0개면 `.note-checks` 비움. retryMark 맵은 모르는 키에 ''라 안전.
- :826~827 곡선: `fail` ⇔ `retryResult==='fail' || (checkResult==='fail' && !recovered)`, 나머지 `success`.
- `note_shown.retry`에 `'unverified'` 값이 새로 생긴다(`none`=서버가 안 줌과 갈라 센다).

**흐름**: 분석 도착 → 두 fetch(뒤) → 학생이 방법 확인·짚기를 읽는 10초+ 사이에 도착 → [아, 이거였구나] → `awaitVerdict('check')` 0초 → 쪽지. 안 왔으면 ≤5초(low p90 5.4초 + 읽는 시간이라 사실상 10초+ 여유) → 없으면 skip → 재도전. 늦게 온 결과는 아무도 안 듣는다.

**함정 답**
1. 두 번 눌림 — `setActions` 클릭 핸들러(:279)가 onPress **전에** `actionsBox.innerHTML=''`로 버튼을 동기로 지운다. 기다리는 5초 동안 버튼 0개, async가 새 버튼을 그리는 건 verdict 뒤. 덤으로 await 뒤 `stale` 검사 — 흐름이 바뀐 뒤 깨어난 continuation이 화면을 덮지 않게.
2. `checkResult` 3값 + `unverified` + 곡선 규칙(위). skip이 ✗·"괜찮아" 톤·fail 곡선 어디로도 안 간다.
3. 재업로드 — `verifySeq`. 오늘 재업로드는 전부 `location.reload()`(:638·:696·:887)라 promise가 같이 죽지만, 실패→업로드→재제출(:368)과 앞으로의 변경에 대한 보험. 늦게 온 옛 verdict는 `stale`로 버림.
4. 새 문구 0개가 기본. 기윤 결정 칸 셋: ① 쪽지 skip 뒤 재도전 첫 줄이 "그럼 진짜 마지막 —"(앞 단계가 없는데 '마지막') → 후보 `'그럼 — 아까 그 자리, 새 숫자로 한 번만 다시 밟아보자.'` ② 5초 대기 중 빈 화면 → 후보 `'잠깐만…'`(기본 안 띄움) ③ 둘 다 skip이면 곡선이 `success`("지금은 잡았어") — 검증 없는 단정. 대안 문구 없음, 두면 둔다.
5. GA `quiz_verify` `{ kind, result:'match'|'skip', reason:'mismatch'|'none'|'multiple'|'ambiguous'|'invalid'|'error'|'timeout'|'wait_timeout', verify_ms, waited_ms, react(check만), submission_id, attempt }`. 문항 **차례에** 한 번 — 도달 못 한 문항은 안 센다(전수는 서버 로그). 10.14 판정 = result 비율·reason 분포. **98%는 GA로 못 잰다**(정답표 필요) — 새 문항 모아 verify.cjs 재실행하는 09.30 방식.
6. 서버 절의 maxInstances 2·concurrency 10·timeoutSeconds 20·zod 크기 상한·이미지 없음.
7. 문항마다 따로. 묶으면 쪽지가 재도전 지연에 묶이고, 하나의 오류가 둘을 잡는다.

## 테스트
서버 `functions/tests/verify-quiz-core.test.ts`(`npm test`):
1. `buildQuizVerifyInput` 출력이 verify.cjs 포맷과 글자 단위로 같다(고정 문자열) · marked를 같이 넣어도 결과가 같다(정답 번호가 프롬프트에 못 들어감).
2. `QUIZ_VERIFY_INSTRUCTIONS === INSTR 원문` — 문구가 바뀌면 측정이 무효라 테스트가 먼저 깨진다.
3. 스키마 strict 불변식(properties 전부 required·additionalProperties false — analyze-photo-core.test 패턴).
4. `judgeQuizVerify` 7경우: match·mismatch·none·multiple·ambiguous·3(범위 밖)·1.5.
5. 요청 zod: options 2·4개 거부, marked 3 거부, setup 601자 거부, setup 없음 허용, kind 'foo' 거부.
6. 예산 `12_000 < 20*1000 - 3_000`.

33문항 재현(서버 배포 뒤): 측정 폴더에 `live.cjs`(저장소 밖) — items.json 33개를 `qa:true`로 verifyQuiz URL에 2회씩 POST, truth.json과 대조(32번은 marked null → 0으로 보내고 none 기대). 합격선: 멀쩡한 27개 오탐 **0/54**(하나라도 막히면 웹 배포 중단), 잘못된 6개 막음 6/12 근처(3 이하면 중단), 32번 2/2, p90 ≤ 6초.

웹(자동 없음): 로컬에서 fetch 가로채 ① match → 쪽지 그대로 ② mismatch → 쪽지 없이 재도전, 노트 "오늘 확인: 재도전 ✔", 곡선 success ③ 8초 지연 → 5초 뒤 skip, 재도전은 즉시 skip(waitedOnce) ④ 둘 다 skip → 노트 확인 줄 빔. GA는 `window.track` 스텁 콘솔로만(운영 GA 테스트 히트 금지). 선택: `scripts/verify-web-proto-storage.mjs` 흉내로 `awaitVerdict`의 race·stale·waitedOnce만 vm으로.

## 배포 순서 · 되돌리기
1. `cd functions && npm test && npm run build` 초록.
2. **깨끗한 트리에서**(predeploy `tsc`가 다른 세션의 WIP까지 컴파일한다 — 커밋된 상태나 별도 worktree) `firebase deploy --only functions:verifyQuiz --project dasida-app`. analyzePhoto는 안 올라간다.
3. 33문항 라이브 재현 → 합격선.
4. app.js → 로컬 ①~④ → `npm run deploy:proto`.
5. 학생 1장 뒤 Cloud Logging `verifyQuiz done` 2줄·GA `quiz_verify` 확인.

되돌리기: 웹 커밋 revert → `deploy:proto`(2분) — 호출자가 웹뿐이라 끝. 서버는 놔둬도 비용 0, 지우려면 `firebase functions:delete verifyQuiz --region asia-northeast3`. 주의: 다른 세션이 자기 브랜치에서 `--only functions`(전체)로 올리면 verifyQuiz 삭제를 묻는다 — N.

## 이 설계가 망가지는 경우
- **원 문제 조건이 쪽지 문장에 없으면 통과시킨다** — 09.30 놓친 6개 중 4개(7·8·13·18), p=2 카드가 그 예. 90% 장치지 98%가 아니다.
- 요청 1과 모델이 **같은 방향으로 틀리면** match — 검산기가 못 보는 칸.
- OpenAI 장애·429 → 전부 `error` → 쪽지·재도전이 통째로 사라진다(잠근 규칙대로, maxRetries 0). `quiz_verify` reason=error 급증이 신호.
- 다른 세션이 요청 1의 문항 모양(보기 개수·필드)을 바꾸면 400 → 전부 skip. **조용히 죽는다** — reason=error 100%로만 보인다.
- 학생이 분석 도착 5초 안에 쪽지까지 오면 `wait_timeout`. p90 5.4초라 드물다, `waited_ms`로 본다.
- 모델 드리프트로 오탐이 0에서 뜨면 학생은 이유 없이 쪽지를 못 받는다 — 33문항 재현을 서버 배포 때마다.
- 앱(`features/photo/flow/quiz-guard.ts`)은 이 장치 없이 그대로다 — 1.0.10까지 앱 학생은 09.30식 틀린 카드(세운 08 기준 1/3)를 받을 수 있다.

## 검토·결정 기록 (09.30 저녁)
- 판단 순서(`docs/how-we-decide.md`): ① 방법 A~E — astra B(서버 코드 검산) · Fable D(두 번째 호출) → Fable 최종: astra 첫 단계 + D 검산기. ② 측정(`~/dev/dasida-measure/2026-09-30-quiz-verify/`) 뒤 구조 — 둘 다 "만든다·low·막기만·뒤에서(나)·5초 안팎"; 문맥 입력은 astra "재측정 후" vs Fable "카드만" → **Fable 최종: 카드만**(transcription엔 극솟값 조건이 없고 검산표에 틀린 "p = 2"가 들어 있어 넣으면 오독을 같이 준다). ③ 이 설계서 = Fable, astra 검토 "반드시 고칠 것" 1건 — 67줄 32번 합격선 4/4 → **2/2**(low만 2회 돌리므로). 설계 변경 없음.
- **기윤 기준(🔒 09.30): 쪽지·재도전 정답 정확도 지금 90%, 최종 98%.** 쪽지·재도전은 빼지 않는다. 09.30 표본(사진 2장·33문항) 기준 82% → 장치 뒤 약 90%. 98%는 요청 1이 문제 본문까지 적게 된 뒤.
- 학생 문구: 새 문구 0개로 구현. ① 쪽지 건너뜀 뒤 재도전 첫 줄 "그럼 진짜 마지막 —"은 그대로(기윤 결정 대기) ② 대기 중 문구 없음 ③ 둘 다 건너뛰면 곡선 success 그대로.
- 토큰: astra 22,843 + 39,734 + 48,554 · Fable 약 16만 + 17만(판정) + 16만 + 17만(구조) + 18만(설계).
