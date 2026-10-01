# B 설계 최종 — 「웹·앱 대본 하나로」 (2026-10-01, main `14b0998` 기준, Fable 최종)

> 1차 `b-design-fable-1.md`를 astra 검토(`astra-design-review.out`, 반드시 고칠 것 7 + 권고 1)로 고쳐 쓴 **완결본**이다. 구현자는 이 파일 하나만 읽고 시작한다.
> 파일은 전부 직접 열었다. 코드는 안 고쳤다. 줄 번호는 `14b0998`. "짐작"이라고 적은 곳 말고는 확인한 것이다.

## 결론 먼저

> **🔒 10.01 기윤 — §9 갈림길 넷 추천대로.** ① 📌 "수능장에서…" 접기 줄 앱 노트 카드에도 ② 약점 고르기 말풍선은 앱만 ③ 설문 결말 약점 카드는 이번엔 저장 안 함 — 대신 카드로 끝난 수 : 노트로 끝난 수를 센다(웹 `weakness_card_shown`·`note_shown`, 앱 `photo_weakness_card_shown`·`photo_note_shown`), **카드 쪽이 더 많아지면 저장을 붙인다** ④ 아래첨자 aₙ 웹·앱 유니코드 통일. B는 1.0.11로 따로 내지 않고 **1.0.10에 합쳐** 한 번에 제출(🔒 10.01 17시). 구현 판정: 무거움·xhigh, 커밋 1(골든 녹음)부터.

1. **모양** — 대본은 `features/photo/script/photo-script.ts`의 **대본 객체** `createPhotoScript(io, deps)`. 웹 `app.js:518~1177`의 흐름 함수 28개(660줄)를 TS로 옮기고 `coachSays/userSays/setActions`(`app.js:307·316·340`)를 `ScriptIO`(say·mySay·ask·askText·showNote·showWeaknessCard·end·run·log)로 바꾼다. 리듀서는 안 쓴다. 검산 5초 대기·diagnoseMethod는 **모듈 안**, fetch만 주입. **모든 `await` 뒤에 `alive` 검사**, 어댑터는 새 사진·처음부터 다시·**화면 이탈(unmount)**에서 `dispose()`.
2. **글자까지 같게** — 수식 표기도 대본이다. 웹 `fmtMath`(`app.js:220-249`)와 앱 `formatMathText`(`MathText.tsx:262-285`)는 `x^{2}` 규칙 하나가 다르고(웹만 있음), 아래첨자 `a_n`은 웹만 `<sub>`로 그린다(`app.js:261-267`). **공용 포매터 `components/math/format-math-text.ts`** 하나(웹 규칙 10개 + 아래첨자 유니코드 규칙)를 둘 다 쓰게 하고, 골든은 **포매터를 거친 글자**로 비교한다. 수식이 든 fixture를 뺀 1차 안은 버린다.
3. **경계** — 분석 결과가 닿은 첫 코치 말부터 결과 카드(노트·약점 카드)까지, 같은 결과·같은 누름에서 코치 말·내 말·버튼·입력칸·카드 안 글자가 (포매터 뒤) 글자까지 같다. 카드 뒤(웹 곡선·스토어 / 앱 저장·복습·[처음부터 다시])는 플랫폼 `end()`. 예외 하나 = 앱만 켜는 약점 고르기 말풍선(`profile.picksWeakness`).
4. **증명** — ① 포매터 → ② 골든 17개를 **옮기기 전 웹**(jsdom, `@jest-environment jsdom` + `window.eval`)으로 녹음·커밋 → 옮긴 뒤 웹(번들+새 app.js)과 앱(스크립트 jest)이 같은 골든을 낸다. 검산 5초 경계·첫 timeout 뒤 재도전·dispose 뒤 늦은 응답은 골든이 아니라 **러너 단위 테스트(가짜 시계 + 제어 Promise)**가 잰다. `PhotoNote` 저장 모양은 **안 바뀐다**.
5. **순서·견적(짐작)** — 커밋 8개: 포매터 → 골든 → 모듈 → 웹 어댑터 → 앱 ①②③ → ④ 입력칸 → 재빌드·제출 → 웹 배포. **자르기 판단 시점 = 커밋 3이 끝난 날 저녁**: 그날이 10.06(월) 이후면 웹 어댑터·웹 배포를 건너뛰고 앱만 간다(앱 전용 경로 = 커밋 1·2·3·5·6·7). 3~4 세션, 코드 10.02~07 · 제출 10.07~08 · 두 스토어 10.09~11. 10.14(수) 신호가 켜지면 ④ 앱 입력칸(`profile.textInput:false`)부터 자른다. ①②③은 안 자른다(`STATUS.md:195` — 기윤이 B를 1.0.10에 합친 이유).

---

## astra 7개 처리표 (+ 권고 1)

| # | astra 지적 | 판정 | 확인한 근거 | 고친 절 |
|---|---|---|---|---|
| 1 | 검산 전역변수를 지우면 `setFile()`에서 `ReferenceError` | **받음** | `app.js:412-413` `verifySeq += 1; verifyRun = null;` — 1차 안은 이 둘을 지우면서 `resetUpload`만 고쳤다 | §1.6 (setFile도 `script?.dispose(); script = null`) |
| 2 | `survey-data.js` 삭제 ↔ gate 스크립트 "그대로"는 양립 불가 | **받음** | `scripts/verify-web-proto-gate.mjs:13` `SOURCES = ['flow-bundle.js', 'survey-data.js', 'app.js']` 무조건 읽음 → ENOENT | §1.6·§5 커밋 4·§10 (같은 커밋에서 `:13` 목록 수정) |
| 3 | 설문 엔딩 곡선 라벨이 `WeaknessCardView`에 없음 | **받음** | `app.js:1102-1104`가 `catalog`·`SURVEY.TYPES`로 라벨 계산, `:1128` 표시 — 1차 타입은 title·body뿐 | §1.3 (`methodLabel`·`typeLabel` 추가, null → '방법 미상') |
| 4 | 화면 이탈 dispose 없음 · diagnose await 뒤 생존 검사 없음 | **받음** | `app/_layout.tsx:241-244` photo 헤더 뒤로가기 허용 · `use-photo-flow.ts`에 `useEffect` 0개(grep) · `:790-801` 저장·복습이 화면 상태와 무관 — **1.0.10에도 있는 구멍**(seq만 봄) | §1.5·§1.7 (unmount dispose, 모든 await 뒤 `alive`) |
| 5 | 수식 제외 골든은 웹·앱 글자 차이를 숨김 | **받음** | 웹 `app.js:231-235` `^{n}` 규칙, 앱 `MathText.tsx:262-285`엔 없음(`^( )` 273·`^문자` 277·`^숫자` 281만) · 웹 `app.js:261-267` `a_n`→`<sub>`, 앱은 `a_n` 그대로 · 앱 말풍선(`photo-chat-bubble.tsx:57`)·버튼(`photo-action-buttons.tsx:31`)·노트(`photo-note-card.tsx:112`) 전부 이 포매터를 거침 | **§1.8(새)·§4** — 공용 포매터, 골든은 포매터 뒤 글자 |
| 6 | 녹음기로는 5초 경합·늦은 응답을 못 잼 | **받음** | `app.js:928-941` 핵심은 pending Promise vs 5초 타이머 경합 · gate 스텁 `verify-web-proto-gate.mjs:127` `setTimeout: (fn) => { fn(); return 0; }`(즉시 실행) · 1차 안 앱 녹음기는 즉시 resolve | §4.3 (러너 단위 테스트 — 가짜 시계·제어 Promise, 웹 1건은 jsdom 환경의 jest 가짜 시계) |
| 7 | `weakness` 추가 시 `PhotoChatBubble` 타입이 깨짐 | **받음** | `photo-chat-bubble.tsx:21` `Exclude<PhotoBubble, { kind: 'note' }>`, `:33` `bubble.paras` | §1.7·§10 (`Extract<PhotoBubble, { kind: 'coach' \| 'me' }>`로, 파일 목록에 추가) |
| 권고 | "커밋 뒤 즉시 웹 배포" ↔ "나중에 웹 전환 자르기"의 판단 시점·앱 전용 커밋 경로 명시 | **받음** | — | §5·§7 (판단 시점 = 커밋 3 끝난 날 저녁, 10.06 기준 · 앱 전용 경로 1·2·3·5·6·7) |

반박한 것: 없다. 7개 전부 코드에서 확인됐다.

---

## 0. 전제 — 직접 확인한 것

- 웹 흐름 함수는 `web-proto/app.js:518~1177` **660줄**, 함수 28개(`awk`·grep으로 셈). 앱 훅 `use-photo-flow.ts` 815줄.
- 글자가 다른 자리(둘 다 파일에서 확인): 짚기 `app.js:823` "여기가 틀린 자리야" vs `use-photo-flow.ts:546` "여기서 틀린 것 같아. 맞아?" · 풀이 없음 `app.js:778` "짧게만 알려줘" vs `:448` "풀었는지만 알려줘" · `app.js:781` "✏️ 직접 알려줄게" vs `:452` "✏️ 내가 방법 고를게" · `app.js:662` "여기에도 없어, 직접 쓸게" vs `:415` "여기에도 없어" · `app.js:765` "그럼 전체 목록에서 직접 골라볼래?" vs `:429` "그럼 전체에서 골라볼래?" + 웹의 [잘 모르겠어](`app.js:768`)가 앱에 없음.
- **수식 표기 차이**(astra 5): 웹 `fmtMath`(`app.js:220-249`) 규칙 = `<= >= !=` · `*`→× · `/`→⁄ · `sqrt(`→√( · `√(x)`→√x · **`^{n}`**(231-235) · `^(n)`(237-240) · `^문자`(241-244) · `^숫자`(245-248). 앱 `formatMathText`(`MathText.tsx:262-285`) = 같은 순서에서 **`^{n}`만 없음**(node로 둘 다 돌려 확인: 웹 `x^{2}`→`x²`, `x^{n-1}`→`xⁿ⁻¹`). 아래첨자: 웹 `mathSpan`(`app.js:256-270`)이 수식 토큰 안의 `_n`·`_(n+1)`을 `<sub>`로 그린다 — DOM 글자는 `aₙ`처럼 보이고 앱은 `a_n` 그대로다. 앱 `MATH_CHUNK_PATTERN`(`MathText.tsx:21-22`)엔 `_`도 아래첨자 글자도 없다.
- 앱에서 포매터를 쓰는 자리: `photo-chat-bubble.tsx:57` `splitMathDisplaySegments`(안에서 `formatMathText`, `MathText.tsx:220`) · `photo-action-buttons.tsx:31` `<MathText>` · `photo-note-card.tsx:112` `<MathText highlightMath>`. 앱 전체에서 `components/math/MathText`를 import하는 파일은 5개(photo 3 + `features/quiz/components/quiz-question-card.tsx` + 1).
- 웹 번들이 실제로 쓰는 export는 5개뿐: `F.diagnosisMethodRoutingCatalog·ro·methodOptions·weaknessCandidatesFor·diagnosisMap`(`app.js:64-66·1074-1075`). `flow-entry.ts:11-18`의 진단 엔진 export 6개는 app.js에서 안 쓴다.
- **esbuild가 `package.json`에 없다.** `devDependencies`에도, `node_modules/.bin`에도 없고 `~/.npm/_npx` 캐시 3곳에만 있다. `flow-entry.ts:2`의 빌드 명령은 `npx esbuild`. `deploy:proto`는 `--no-build`(`package.json:24`).
- 웹 자동 테스트: jest엔 없다(`jest.config.js` `testMatch` `*.test.ts(x)`, web-proto 테스트 0). `scripts/verify-web-proto-gate.mjs`가 실제 `flow-bundle.js·survey-data.js·app.js`를 가짜 DOM(`vm`)에서 돌린다(`:13` SOURCES, `:144-145` runInContext). 가짜 DOM `innerHTML` 파서는 평평한 `<div class>`만(`:63-70`), 타이머 스텁은 즉시 실행(`:127`). astra가 돌린 결과 gate 8/8·storage 12/12 통과. `playwright.config.ts`는 `e2e/`·expo 웹용.
- **jsdom 20.0.3이 `node_modules`에 있다**(`jest-environment-jsdom` 딸림, `package.json`엔 없음). jsdom 창에 `AbortSignal.timeout`·`Element.prototype.scrollIntoView`·`createImageBitmap`은 **없다**(node로 확인 — 스텁 필요).
- 서버 `diagnoseMethod`: `functions/src/index.ts:7` → `diagnosis-method.ts`. `allowedMethodIds` ≤35(`:23`), `exampleUtterances` ≤5(`:16`), timeout 30초(`:79`), 로그 `logDiagnosisMethodRun`(`:121`), 응답 `:136-143`. 방법 31개(`data/diagnosisTree.ts:53-`).
- 서버 `ErrorCandidate.concept`는 이미 온다(`functions/src/analyze-photo-core.ts:47·156-161`), 앱 타입에도 있다(`types.ts:30`).
- `survey-data.js` `TYPES` 6종 = `features/photo/flow/mistake-types.ts` `MISTAKE_TYPES`와 글자까지 같다(node로 6개 비교). 웹 전용으로 남는 건 `DEFAULT_OPTIONS·BY_METHOD·ANSWER_READ_HINT·optionsFor`(`survey-data.js:15-46`).
- 플랫폼 중립 flow 파일: `route-from-analysis.ts`(상수 0.5·0.45·5 = `app.js:71·73·69`), `quiz-guard.ts`, `verify-quiz-request.ts`(fetch+AbortController), `mistake-types.ts`, `korean-particle.ts`, `weakness-mistake-type-map.ts`. RN 전용: `analyze-photo-request.ts`(expo import `:1-4`), `ask-photo-source.ts`(`:1`), 훅의 `__DEV__`(`use-photo-flow.ts:161·233`).
- 사진 화면은 헤더 뒤로가기가 있다(`app/_layout.tsx:241-244` `headerShown: true, headerBackTitle: '홈'`). 훅엔 `useEffect`가 없다(grep 0) → 떠난 뒤 깨어난 await가 저장·복습 과제를 만든다(1.0.10 포함).
- 1.0.10 빌드 번호는 EAS가 올린다(`eas.json:4` remote, `:44` autoIncrement). `app.config.js:7` 1.0.10 그대로 재빌드.
- 화면 테스트 `photo-flow-screen.test.tsx` `it` 49개. 691개 전체는 안 돌렸다(요청서 숫자).

---

## 1. 공용 모듈의 모양

### 1.1 어디에, 무엇을

```
components/math/
  format-math-text.ts     ← 새. 공용 수식 포매터(§1.8). 순수 TS. MathText.tsx가 import, 웹은 번들로.
  MathText.tsx            formatMathText 본체 제거 → format-math-text.ts에서 import·re-export
features/photo/script/    ← 새 폴더. 규칙: DOM·react-native·expo import 금지. 순수 TS + fetch 주입.
  photo-script.ts         대본 본체 createPhotoScript (app.js 518~1177 이식)
  script-io.ts            ScriptIO·ScriptDeps·NoteView·WeaknessCardView·ScriptEnding·TextPrompt
  script-events.ts        ScriptEvent(의미만) — 전송 이름은 어댑터
  quiz-verify-runner.ts   검산 러너(출발·5초 대기·waitedOnce·dispose) — app.js:903-941 = use-photo-flow.ts:227-295
  transcript-recorder.ts  테스트용 ScriptIO — 말풍선 합치기 규칙(use-photo-thread.ts:30-40 = app.js:307-315) + 포매터 적용
  __fixtures__/golden/*.json       골든 17개 (§4)
  __tests__/photo-script.test.ts   골든 비교(앱)
  __tests__/web-golden.test.ts     골든 비교(웹, @jest-environment jsdom)
  __tests__/quiz-verify-runner.test.ts  5초 경계·waitedOnce·dispose (astra 6)
features/photo/flow/
  survey-options.ts            survey-data.js:15-46 이식 (TYPES는 mistake-types.ts)
  diagnose-method-request.ts   app.js:720-732 요청 + 90-98 descriptor (fetch+AbortController, 안 던짐 → null)
```

`flow/`가 아니라 `script/`를 새로 두는 이유: `flow/`엔 RN 전용 파일이 섞여 있어 "여기 것은 다 번들에 실어도 된다"는 선이 없다. 포매터를 `features/photo`가 아니라 `components/math`에 두는 이유: `components/**`는 feature를 넘는 공용(`docs/ARCHITECTURE.md`)이고 이미 quiz도 쓴다 — feature 파일을 `components`가 import하면 층이 거꾸로 선다.

### 1.2 왜 대본 객체인가 (리듀서가 아니라)

- 웹과 앱 훅은 **이미 같은 꼴**이다 — 함수가 `say/mySay/ask`를 부르고 버튼 `onPress` 클로저가 다음 함수를 부른다(`use-photo-thread.ts:21-23`). 660줄을 리듀서로 다시 쓰면 `excludeIds` 누적(`app.js:643·596`), `textAskCount`(`:87`), 검산 run, 노트 ctx를 직렬화 가능한 상태로 재설계해야 한다 — 글자 옮기기에 설계를 하나 더 얹는 것.
- 리듀서의 장점(직렬화 대본)은 **녹음기 IO**로 얻는다(§4).
- 비동기를 모듈 안에 두는 이유: 5초 대기·`waitedOnce`·stale 규칙이 웹(`app.js:926-941`)·앱(`use-photo-flow.ts:263-295`) 두 벌 있다. 어댑터에 두면 세 벌째. 플랫폼이 다른 건 `fetch`뿐 — `verify-quiz-request.ts`는 이미 중립이라 웹도 번들로 같은 함수를 쓰면 `verifyQuizFetch`(`app.js:884-900`)가 사라진다.

### 1.3 API (타입 시그니처)

```ts
// features/photo/script/script-io.ts
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { WeaknessId } from '@/data/diagnosisMap';
import type { AnalyzePhotoResult, MistakeTypeId, PhotoAction, RetryResult } from '../types';
import type { QuizVerifyBody, QuizVerdict } from '../flow/verify-quiz-request';
import type { DiagnoseMethodResult } from '../flow/diagnose-method-request';
import type { ScriptEvent } from './script-events';

/** 웹 retryResult 'unverified'(app.js:1006)는 앱 RetryResult(types.ts:65)에 없다. 저장 땐 어댑터가 'none'(1.0.10 그대로, use-photo-flow.ts:635-636) */
export type ScriptRetryResult = RetryResult | 'unverified';
/** 웹 ctx.checkResult(app.js:999) — 앱 checkPassed·checkSkipped(types.ts:106-112) 둘을 하나로 */
export type CheckResult = 'pass' | 'fail' | 'skip';

/** 노트 카드에 들어갈 것 전부(날것 — 포매터는 그릴 때). id·createdAt·schemaVersion은 앱 어댑터가 붙인다 */
export type NoteView = {
  dateLabel: string;                 // `${m}/${d}` (app.js:1054 = use-photo-flow.ts:766)
  photoUri: string | null;
  quote: string;                     // ''이면 '(없음)' (app.js:1059 = photo-note-card.tsx:64)
  why: string;
  fix: string;                       // cand.fix || mistakeTypeFix (app.js:1061 = use-photo-flow.ts:772)
  methodId: SolveMethodId;
  mistakeType: MistakeTypeId;
  methodLabel: string;
  typeLabel: string;
  weaknessIds: WeaknessId[];         // weaknessCandidatesFor (app.js:1074 = use-photo-flow.ts:685)
  primaryWeaknessId: WeaknessId | null;
  checkResult: CheckResult;
  retryResult: ScriptRetryResult;
  askLine: boolean;                  // 📌 "수능장에서…"(app.js:1051) — §9 갈림길 1
};

/** 설문 결말 카드(app.js:987-991). 저장 안 함(§9 갈림길 3). 라벨은 곡선(app.js:1102-1104·1128)이 쓴다 — astra 3 */
export type WeaknessCardView = {
  methodId: SolveMethodId | null;    // showAllMethods [잘 모르겠어]는 null (app.js:770)
  mistakeType: MistakeTypeId;
  methodLabel: string;               // methodLabel(methodId) — null이면 '방법 미상' (route-from-analysis.ts:19-21)
  typeLabel: string;                 // mistakeTypeLabel — 모르면 '유형 미상' (mistake-types.ts:36-38)
  title: string;                     // `오늘 찾은 약점 — ${methodLabel} × ${typeLabel}`
  body: string;                      // '(네가 직접 짚어준 것)\n' + fix
};

export type ScriptEnding =
  | { kind: 'note'; variant: 'success' | 'fail'; note: NoteView }   // curveFail 규칙 app.js:1084-1085
  | { kind: 'weakness'; card: WeaknessCardView }
  | { kind: 'closed' };              // "오늘은 여기까지" → "알겠어…" 뒤. 웹 = 버튼 없음, 앱 = [처음부터 다시]

export type ScriptEffect = 'restart' | 'retake_from_gate';

/** 입력칸(app.js:687-710). PhotoAction(types.ts:127-131)은 버튼뿐이라 따로 */
export type TextPrompt = {
  placeholder: string;               // '예: 근의 공식에 바로 대입했어'
  maxLength: number;                 // 200
  submitLabel: string;               // '보내기'
  onSubmit: (text: string) => void;  // 빈 문자열은 어댑터가 막는다 (app.js:701)
};

export type ScriptIO = {
  say: (text: string) => void;
  mySay: (text: string) => void;
  ask: (actions: PhotoAction[]) => void;        // 누르면 버튼부터 비우는 건 어댑터(press/setActions)
  askText: (prompt: TextPrompt) => void;        // 보내면 입력칸부터 비우는 것도 어댑터
  showNote: (note: NoteView) => void;
  showWeaknessCard: (card: WeaknessCardView) => void;
  end: (ending: ScriptEnding) => void;
  run: (effect: ScriptEffect) => void;
  log: (event: ScriptEvent) => void;
};

export type ScriptDeps = {
  verifyQuiz: (body: QuizVerifyBody) => Promise<QuizVerdict>;                 // 절대 안 던짐(verify-quiz-request.ts:27)
  diagnoseMethod: (rawText: string) => Promise<DiagnoseMethodResult | null>;  // 실패·오프라인 = null
  submissionId: string | null;       // 검산 body(app.js:908 = use-photo-flow.ts:233)
  qa: boolean;                       // 웹 isQa||isLocal · 앱 __DEV__
  photoUri: string | null;           // 웹 uploadedImageDataUrl · 앱 photoUriRef
  now?: () => Date;                  // 테스트에서 고정
  profile: {
    picksWeakness: boolean;          // 앱 true(🔒 08.11·09.20) · 웹 false — §2
    textInput: boolean;              // 둘 다 true. ④를 자를 때만 앱 false(§7)
  };
};

export type PhotoScript = {
  /** 분석 결과가 닿은 순간. 거르기·풀이 없음도 여기로 — routeFromAnalysis(flow/route-from-analysis.ts:34)는 안에서 */
  start: (result: AnalyzePhotoResult) => void;
  /** 새 사진·처음부터 다시·화면 이탈. 이 뒤에 깨어난 모든 await는 아무것도 안 한다(출력·로그·저장·효과 전부) — astra 4 */
  dispose: () => void;
};

export function createPhotoScript(io: ScriptIO, deps: ScriptDeps): PhotoScript;
```

```ts
// features/photo/script/script-events.ts — 의미만. 이름은 웹 GA 이름 그대로(웹 어댑터 1:1), 앱 어댑터가 photo_*로
export type ScriptEvent =
  | { name: 'method_confirm'; answer: 'yes' | 'no'; mode: 'assert' | 'soft' }                    // app.js:573-574·589-594
  | { name: 'error_point_react'; react: 'got_it' | 'dont_get_why' | 'not_mine' }                 // app.js:828
  | { name: 'quiz_verify'; kind: 'check' | 'retry'; result: 'match' | 'skip'; reason: string;
      verify_ms: number | null; waited_ms: number; react?: string }                             // app.js:944-947 = use-photo-flow.ts:297-309
  | { name: 'check_answer'; passed: 0 | 1; react: string }                                       // app.js:972
  | { name: 'survey_pick'; mistake: MistakeTypeId | 'dont_know' }                                // app.js:1164·1172
  | { name: 'weakness_card_shown'; method: string; mistake: string }                             // app.js:994
  | { name: 'note_shown'; retry: ScriptRetryResult }                                             // app.js:1080
  | { name: 'weakness_labeled'; method_id: string; mistake_type: string; weakness_count: number; labeled: boolean }  // use-photo-flow.ts:689
  | { name: 'weakness_picked'; method_id: string; mistake_type: string; candidate_count: number; picked: string | null }; // :711
```

```ts
// features/photo/flow/diagnose-method-request.ts
export type DiagnoseMethodResult = {
  predictedMethodId: SolveMethodId; confidence: number; candidateMethodIds: SolveMethodId[];
  needsManualSelection: boolean; reason: string;          // 서버 응답 diagnosis-method.ts:136-143
};
/** app.js:720-732 그대로. problemId는 서버 로그 구분(diagnosis-method.ts:121) — 웹 'photo-flow-web'(app.js:724), 앱 'photo-flow-app' */
export async function requestDiagnoseMethod(rawText: string, options: { problemId: string }): Promise<DiagnoseMethodResult | null>;

// features/photo/flow/survey-options.ts
export type SurveyOption = { type: MistakeTypeId; text: string };
export const ANSWER_READ_HINT: SurveyOption;                                        // survey-data.js:41
export function surveyOptionsFor(methodId: SolveMethodId | null): SurveyOption[];  // survey-data.js:43-46, slice 복사 유지

// components/math/format-math-text.ts (§1.8)
export function formatMathText(input: string): string;
```

### 1.4 대본 함수 이식표

| 함수 | 웹 `app.js` | 앱 `use-photo-flow.ts` | B 뒤 |
|---|---|---|---|
| 라우팅 | 543-557 | `flow/route-from-analysis.ts:34-75` | `start()`가 `routeFromAnalysis`를 부른다. GA `analysis_*`(518-540)는 **웹 어댑터에 남는다** |
| assertMethod | 560-576 | 332-353 | 글자 같음. `method_confirm`은 웹에만 있던 이벤트 → 공용 |
| softAssertMethod | 584-600 | 356-377 | 같음 |
| confirmMethod | 603-617 | 482-509 | **웹판.** 앱의 `photo_dead_end` 두 갈래(492-508)는 설문으로 |
| methodButton | 619-624 | 433-441 | 같음 |
| showCandidateCards | 627-646 | 380-399 | 같음 |
| showTopicMethods | 650-667 | 402-420 | **웹판** — ghost "여기에도 없어, 직접 쓸게" → askMethodByText |
| matchMethodsByKeywords | 670-684 | `route-from-analysis.ts:105-121` | 이미 순수. `lastAnalysisText`(85·541·705)는 스크립트 지역 상태 |
| askMethodByText | 687-710 | 없음 | `io.askText` |
| routeFromText | 714-760 | 없음 | `await deps.diagnoseMethod` **뒤 `alive` 검사**(astra 4). `textAskCount`(87)는 지역 상태 |
| showAllMethods | 764-773 | 427-431 | **웹판** — [잘 모르겠어] → `showFeelingSurvey(null)` |
| offerRetake | 776-783 | 444-457 | **웹판** "✏️ 직접 알려줄게". 📷 → `io.run('restart')` |
| GATE_COPY·offerRetakeForGate | 787-808 | 69-78·460-479 | 사본 둘 → 하나. 📷 → `io.run('retake_from_gate')`, [오늘은 여기까지] → say + `io.end({kind:'closed'})` |
| startPointing | 816-837 | 516-569(사다리) | **웹판 버튼 셋.** 사다리·`showWhy`(571-576)·`pointing_rejected`(521-537) 삭제 |
| explainAgain | 844-855 | 없음 | 그대로 |
| stopMisread | 859-867 | 없음 | 그대로. 📷 → `run('restart')`, [오늘은 여기까지] → `end({kind:'closed'})` |
| retryShape | 873-881 | `flow/quiz-guard.ts:42-51` | `readRetryQuiz`. 웹 `showCheck`(949)는 보기 깨짐을 안 거르는데(`STATUS.md:175`) 앱은 `readCheckQuiz`로 거른다 → **공용은 거른다** |
| verifyQuizFetch | 884-900 | `flow/verify-quiz-request.ts:28-56` | 웹도 번들의 `requestQuizVerify` |
| startQuizVerify | 903-924 | 227-261 | `quiz-verify-runner.ts`, **0번만** |
| awaitVerdict | 928-941 | 267-295 | 러너. stale = `dispose()` 뒤 |
| logQuizVerify | 944-947 | 297-309 | `io.log({name:'quiz_verify',…})`. 웹의 `submission_id·attempt`는 웹 어댑터가 덧붙인다 |
| showCheck | 949-983 | 578-623 | **웹판**(react 인자). await 뒤 `alive` |
| showWeaknessCard | 987-996 | 없음 | `io.showWeaknessCard(card)` → `io.end({kind:'weakness', card})`. 곡선은 어댑터 |
| startRetry | 1000-1028 | 625-673 | 같음. `'unverified'` 유지(이벤트용). await 뒤 `alive` |
| showWrongNote | 1033-1090 | 683-736 + finishNote 744-807 | 통역표 → `weakness_labeled` → (`profile.picksWeakness`면 묻는 말풍선 702-735) → `io.showNote(view)` → `note_shown` → `io.end({kind:'note', variant})`. 카드 DOM(1041-1079)은 웹 어댑터 |
| showForgettingCurve | 1101-1149 | 없음 | **웹 어댑터**. 라벨은 ending의 `note`/`card`의 `methodLabel·typeLabel` |
| showFeelingSurvey | 1152-1177 | 없음 | 그대로, `surveyOptionsFor` |
| endHere | 없음 | 810-812 | **앱 어댑터** `end()` |

### 1.5 비동기 — 모듈 안, 이렇게

- `start(result)` 첫 줄에서 러너가 0번 후보 검산을 **출발**(웹 `app.js:542`, 앱 `:180`과 같은 자리). 조건 `hasSolvingWork && errorCandidates[0] && errorConfidence >= ERROR_CONFIDENCE_MIN`, 보기 정확히 3개(`verify-quiz-request.ts:17`).
- `showCheck`·`startRetry`는 `await runner.verdict('check'|'retry')`. cap = `waitedOnce ? 0 : 5000`(`app.js:934` = `use-photo-flow.ts:278`). `Promise.race` + `clearTimeout`은 앱 코드(`:279-286`) 그대로.
- **`alive` 규칙(astra 4):** 스크립트의 모든 `await` 바로 다음 줄은 `if (!alive) return;`이다 — `showCheck`·`startRetry`의 검산 대기, `routeFromText`의 diagnose 대기 셋. `dispose()`가 `alive = false`. 이 한 줄이 웹 `verifySeq`(`app.js:80`)·앱 `verifySeqRef`(`:131`)를 대신하고, 1.0.10에 없던 "화면 이탈 뒤 저장"도 막는다. 러너 안에서도 `dispose()` 뒤 도착한 verdict는 버린다(테스트 §4.3).
- `routeFromText`의 30초는 요청 함수 안(`app.js:729`). null이면 키워드 폴백(`:746`).
- 타이머는 `setTimeout`만(웹·RN 둘 다 있음).

### 1.6 웹이 붙는 법 (IIFE 번들 + DOM)

`web-proto/flow-entry.ts` 추가 export: `createPhotoScript`, `requestQuizVerify`, `requestDiagnoseMethod`, `ERROR_CONFIDENCE_MIN`(`analysis_shown`의 `error_found`, `app.js:538`), **`formatMathText`**(§1.8). 기존 5개 유지. 안 쓰는 진단 엔진 6개는 이번엔 안 뺀다.

`web-proto/app.js`는 **웹 어댑터**가 된다. 남는 것: 설정·GA·참여 코드(1-98, 단 `verifyRun·verifySeq·VERIFY_*`(77-83)·`lastAnalysisText·textAskCount`(85-87)·`methodDescriptors`(89-98)·`pocket`(76) 삭제), 화면 전환·대기 문구·예시 카드(100-199), 수식 표기(201-291 → §1.8대로 `fmtMath`는 `F.formatMathText` 호출, `mathSpan`의 `<sub>` 분리 제거), 채팅 프리미티브(293-354), 업로드·축소·분석 요청·실패(356-515), `showForgettingCurve`(1101-1149), 노트 카드 DOM(1041-1079 → `renderNoteCard(view)`), `storeUrl`. 지우는 것: 518-1040·1152-1177의 대본 함수와 `GATE_COPY·SURVEY·catalog·selectableMethods`.

**astra 1 — `setFile()`(`app.js:407-417`)의 `verifySeq += 1; verifyRun = null;`(412-413)은 `script?.dispose(); script = null;`로 바꾼다.** `resetUpload`(421-433)도 같은 두 줄. 둘 다 안 고치면 사진을 고르는 순간 `ReferenceError`다.

```js
// app.js — 분석 결과 도착 (옛 routeFromAnalysis 518-542의 GA 부분만 남긴다)
let script = null;
function onAnalysisResult(result) {
  const gateDecision = result.gate?.decision;
  if (typeof gateDecision === 'string' && gateDecision.startsWith('blocked')) { /* analysis_gate 로그 그대로 */ }
  else { /* analysis_shown 로그 그대로, error_found는 F.ERROR_CONFIDENCE_MIN */ }
  script?.dispose();
  script = F.createPhotoScript(webIO, {
    verifyQuiz: F.requestQuizVerify,
    diagnoseMethod: (t) => F.requestDiagnoseMethod(t, { problemId: 'photo-flow-web' }),
    submissionId, qa: isQa || isLocal, photoUri: uploadedImageDataUrl,
    profile: { picksWeakness: false, textInput: true },
  });
  script.start(result);
}
const webIO = {
  say: coachSays, mySay: userSays, ask: setActions,
  askText: (p) => { /* 687-709의 input+보내기 DOM — 빈 값 막기·disabled·비우기 포함 */ },
  showNote: renderNoteCard,                          // 1041-1079
  showWeaknessCard: (c) => cardEl(c.title, c.body, 'final'),
  end: (e) => { if (e.kind === 'note') showForgettingCurve(e.variant, e.note);                 // note.methodLabel·typeLabel
                else if (e.kind === 'weakness') showForgettingCurve('survey', e.card);         // card.methodLabel·typeLabel (astra 3)
                /* closed: 없음 */ },
  run: (fx) => fx === 'restart' ? window.location.reload() : resetUpload(),
  log: (ev) => { const { name, ...params } = ev;
                 logEvent(name, name === 'quiz_verify' ? { ...params, submission_id: submissionId, attempt } : params); },
};
```
`showForgettingCurve(variant, labels)`는 `catalog`·`SURVEY` 조회(`:1102-1104`) 대신 인자의 `methodLabel·typeLabel`을 쓴다. `index.html`의 `survey-data.js` 태그와 파일은 지운다 — **같은 커밋에서 `scripts/verify-web-proto-gate.mjs:13` `SOURCES`를 `['flow-bundle.js', 'app.js']`로**(astra 2). 결과 app.js ≈ 1178 − 660 + 130 ≈ 650줄(짐작).

**번들 빌드를 배포에 묶는다**(`package.json`):
```json
"devDependencies": { "esbuild": "<핀 — npx 캐시판 버전으로>", "jsdom": "^20.0.3" },
"scripts": {
  "build:proto":  "esbuild web-proto/flow-entry.ts --bundle --format=iife --global-name=DasidaFlow --tsconfig=tsconfig.json --platform=browser --outfile=web-proto/flow-bundle.js",
  "verify:proto": "node scripts/verify-web-proto-gate.mjs && node scripts/verify-web-proto-storage.mjs && jest features/photo/script components/math",
  "deploy:proto": "npm run build:proto && npm run verify:proto && netlify deploy --dir=web-proto --prod --no-build --site ee644b12-…"
}
```
npm script로 두는 이유 둘: `npx`는 이 맥에서 rtk 훅이 가로챈다(메모리 `project_expo_cli_rtk_conflict`), 캐시판 esbuild는 버전이 흔들린다. `flow-entry.ts:2` 주석도 `npm run build:proto`로. `flow-bundle.js`는 지금처럼 커밋.

스크립트에 RN이 섞이면 esbuild가 `react-native` 소스(Flow)를 못 읽어 빌드가 터진다(짐작). 안 터져도 `verify-web-proto-gate.mjs`가 번들을 `vm`에서 실행해 `require` 잔재에서 죽는다. 이 둘이 "script/는 중립"의 자동 검사다.

### 1.7 앱이 붙는 법 (RN 훅)

`use-photo-thread.ts`(72줄) 확장:
```ts
export type PhotoThread = {
  bubbles: PhotoBubble[];
  actions: PhotoAction[];
  textPrompt: TextPrompt | null;              // 새. actions와 둘 중 하나만
  say; mySay; showNote(note: PhotoNote); ask;
  askText: (prompt: TextPrompt) => void;      // 새. actions=[] + 마지막 코치 말풍선 ask=true(markAsk, app.js:693)
  submitText: (text: string) => void;         // 새. textPrompt=null 먼저, 그다음 onSubmit — press(:61-64)와 같은 순서
  showWeaknessCard: (card: WeaknessCardView) => void;  // 새. bubble kind 'weakness'
  press; clear;
};
// types.ts PhotoBubble에 | { id: number; kind: 'weakness'; card: WeaknessCardView }
// photo-chat-bubble.tsx:21 — Exclude<PhotoBubble,{kind:'note'}> → Extract<PhotoBubble, { kind: 'coach' | 'me' }>  (astra 7)
// photo-chat-thread.tsx:11-16 — kind === 'weakness' → <PhotoWeaknessCard>, 그다음 note, 그다음 PhotoChatBubble
```
`ask()`는 `textPrompt=null`도 한다.

`use-photo-flow.ts`는 `start/restart/retakeFromGate/resetToUpload`(135-215)와 앱 전용 로그(`photo_submit·photo_analyzed`)만 남기고 311-812를 지운다. 대신:
```ts
const scriptRef = useRef<PhotoScript | null>(null);
// astra 4 — 헤더 뒤로가기(_layout.tsx:241-244)로 떠나면 unmount. 깨어난 await가 저장·복습 과제를 만들지 않게
useEffect(() => () => { scriptRef.current?.dispose(); scriptRef.current = null; }, []);

const appIO: ScriptIO = {
  say, mySay, ask, askText: thread.askText, showWeaknessCard: thread.showWeaknessCard,
  showNote: (view) => {                         // finishNote 744-801의 저장 부분
    const createdAt = new Date().toISOString(); const noteId = `photo-${createdAt}`;   // :755-756 그대로
    const stored = accountKey && photoUriRef.current ? persistNotePhoto(noteId, photoUriRef.current) : null;
    const note: PhotoNote = { id: noteId, createdAt, schemaVersion: 1, ...view 필드,
      photoUri: stored ?? photoUriRef.current,
      checkPassed: view.checkResult === 'pass', checkSkipped: view.checkResult === 'skip',
      retryResult: view.retryResult === 'unverified' ? 'none' : view.retryResult };
    showNote(note);
    if (accountKey) void savePhotoNote(accountKey, { ...note, photoUri: stored });
    if (accountKey && reviewTaskStore && view.primaryWeaknessId)
      spawnMistakeReviewTasks(accountKey, noteId, [view.primaryWeaknessId], reviewTaskStore, 'photo').catch(console.warn);
  },
  end: () => endHere(),                         // note·weakness·closed 전부 [처음부터 다시](810-812)
  run: (fx) => (fx === 'restart' ? restart() : retakeFromGate()),
  log: (ev) => { const { name, ...params } = ev; logEvent(APP_EVENT_NAME[name], params); },
};
// start()의 runRoute(route) 자리(181):
scriptRef.current?.dispose();
scriptRef.current = createPhotoScript(appIO, {
  verifyQuiz: requestQuizVerify, diagnoseMethod: (t) => requestDiagnoseMethod(t, { problemId: 'photo-flow-app' }),
  submissionId: submissionIdRef.current, qa: __DEV__, photoUri: photoUriRef.current,
  profile: { picksWeakness: true, textInput: true },
});
scriptRef.current.start(result);
```
`resetToUpload`(205-215)에 `scriptRef.current?.dispose()`. `resetQuizVerify·startQuizVerify·awaitQuizVerdict·logQuizVerify·verifyRunsRef·verifySeqRef·methodIdRef·NoteContext·QuizVerifyRun·GATE_COPY·VERIFY_WAIT_MS` 삭제. 훅 815 → 약 290줄(짐작).

`event-types.ts` 추가(과거 이름은 안 바꾼다):
```ts
| 'photo_method_confirm' | 'photo_error_point_react' | 'photo_check_answer' | 'photo_survey_pick'
| 'photo_weakness_card_shown' | 'photo_note_shown'
// photo_quiz_verify에 react?: string 추가(웹 app.js:953과 같이). photo_weakness_labeled·photo_weakness_picked 그대로.
// photo_dead_end는 타입에 남긴다(1.0.10까지 찍힌 이름) — 호출부만 사라진다. 주석 "1.0.10까지"
const APP_EVENT_NAME: Record<ScriptEvent['name'], EventName> = { method_confirm: 'photo_method_confirm', …,
  quiz_verify: 'photo_quiz_verify', weakness_labeled: 'photo_weakness_labeled', weakness_picked: 'photo_weakness_picked' };
```
웹 어댑터는 이름 그대로 — 웹 GA에 `weakness_labeled`가 새로 생긴다(지금 웹엔 없던 이벤트). ⑥ "의미만 공용, 전송은 플랫폼별"이 이 두 줄이다.

### 1.8 공용 수식 포매터 (astra 5 — 새 절)

**왜 대본에 넣나.** 기윤 기준은 "글자까지 같게"다. 같은 문자열 `x^{2}`가 웹에선 `x²`, 앱에선 `x^{2}`로 보이면 학생 눈엔 다른 글자다 — 그리기(서체·색)가 아니라 글자다. 그러니 **문자열→문자열 변환은 대본 쪽, 서체·색·칩·칠판 줄은 그리기 쪽**으로 선을 긋는다.

**`components/math/format-math-text.ts`** = 웹 `fmtMath`(`app.js:220-249`) 규칙 10개 + 아래첨자 1개:
1. `<=`→≤ `>=`→≥ `!=`→≠ (`app.js:222-224` = `MathText.tsx:264-266`)
2. `a*b`→`a×b`, `a/b`→`a⁄b` (lookahead 규칙 그대로, `app.js:227-228` = `:269-270`)
3. `sqrt(`→`√(`, `√(x)`→`√x` (`:229-230` = `:271-272`)
4. **`x^{n-1}`→`xⁿ⁻¹`** (`app.js:231-235` — 앱에 없던 것)
5. `ar^(n-1)`→`ar⁽ⁿ⁻¹⁾`, `e^x`→`eˣ`, `x^-1`→`x⁻¹` (`:237-248` = `:273-284`). 못 바꾸는 글자(대문자·q)가 섞이면 원문 유지 — "반쪽 변환 금지"(`app.js:215`)
6. **아래첨자(새):** `a_n`·`a_{n+1}`·`a_(n+1)` → `aₙ`·`aₙ₊₁`. 유니코드 아래첨자가 있는 글자만(숫자 0-9, `+ - = ( )`, 소문자 a e h i j k l m n o p r s t u v x) — 하나라도 없으면 원문 유지(5와 같은 규칙). 웹은 지금 `<sub>` 태그로 아무 글자나 내린다(`app.js:261-267`) — RN `Text`엔 `<sub>`가 없어 **둘 다 유니코드로** 맞춘다(§9 갈림길 4).

`MathText.tsx:262-285`의 `formatMathText` 본체는 지우고 `format-math-text.ts`에서 import·re-export — `splitQuestionDisplaySegments`(`:157`)·`splitMathDisplaySegments`(`:220`)·`<MathText>`(`:294·297`)가 전부 자동으로 새 규칙을 탄다. **앱 전체(quiz 포함)의 수식 표시에 `^{}`·`_` 규칙이 추가되는 것**이다 — 바뀌는 건 이 두 패턴이 든 문자열뿐이고 나머지는 글자 하나 안 바뀐다(규칙 1-3·5가 같은 코드라서). 그래도 범위가 photo 밖이니 §7에 적는다.

웹 `app.js`: `fmtMath`(220-249)는 `return F.formatMathText(input)` 한 줄로, `mathSpan`(256-270)의 `_` split·`<sub>`는 지운다(아래첨자가 이미 글자로 와 있다). `MATH_TRIGGER`(`:254`)의 `⁰-₟`는 유니코드 아래첨자(U+2080-209C)를 이미 품는다 → 서체 적용은 그대로 된다. 앱 `MATH_MARKER_PATTERN·MATH_CHUNK_PATTERN·DISPLAY_TOKEN_PATTERN`(`MathText.tsx:19-35`)엔 아래첨자 글자를 추가한다 — 이건 **서체(그리기)**라 골든 대상이 아니다.

**테스트** `components/math/__tests__/format-math-text.test.ts`: 위 11규칙 입·출력 표(웹 `fmtMath`를 node로 돌린 값이 기대값 — `x^{2}`→`x²`, `x^{n-1}`→`xⁿ⁻¹`, `ar^(n-1)`→`ar⁽ⁿ⁻¹⁾`, `4*1*2`→`4×1×2`, `a/b`→`a⁄b`, `sqrt(2)`→`√2`, `a<=b`→`a≤b`, `e^x`→`eˣ`, `2^10`→`2¹⁰`, `a_n`→`aₙ`, `a_{n+1}`→`aₙ₊₁`, `S_q`→`S_q`(q 없음, 원문)). 그리고 **`photo-chat-bubble.test.tsx`에 한 줄**: `x^{2}`가 `x²`로 뜬다.

---

## 2. 공용 ↔ 플랫폼 경계

**한 줄 정의:** 분석 결과가 닿은 첫 코치 말부터 결과 카드까지, 같은 결과·같은 누름 열에서 **코치 말·내 말·버튼 글자·순서·입력칸·카드 안 글자(인용·왜·다음엔·오늘 확인·태그·이름표)가 공용 포매터를 거친 뒤 글자까지 같다. 서체·색·칩·칠판 줄·카드 뒤는 플랫폼.**

| 자리 | 웹 | 앱 | 어디 |
|---|---|---|---|
| 업로드·대기·분석 요청·실패 문구 | app.js 356-515 | use-photo-flow.ts 135-189 + analyze-photo-request.ts | 플랫폼(이미 같은 값 — 1.0.10) |
| 대화 전부(라우팅~카드) | 518-1090 | 311-807 | **공용 스크립트** |
| 수식 글자(`^{}`·`^()`·`*`·`/`·`sqrt`·`_`) | fmtMath 220-249 + mathSpan 261-267 | MathText.tsx 262-285 | **공용 포매터**(§1.8) |
| 수식 서체·칩·칠판 줄 | MATH_RUN·.m·.math-line | splitMathDisplaySegments·styles | 플랫폼 |
| 노트 카드 글자 | 1054-1078 | photo-note-card.tsx 64-86 | 공용 `NoteView` → 그리기는 각자 |
| 📸 카드 밑 줄 | "여기선 저장 안 돼 — 캡처해서 가져가"(1052) | "여기 남겨뒀어 — 지난 오답노트에서 다시 볼 수 있어"(:90) | 플랫폼(둘 다 참말, 통일하면 거짓) |
| 📌 접기 문장 | 1051 있음 | 없음 | **갈림길 1(§9)** — 추천: 앱도 |
| 약점 고르기 말풍선 | 없음("A 또는 B", 1077) | 702-735 | **앱만** `profile.picksWeakness` — 08.11 🔒 "저장 경로를 붙일 때"(app.js:1071 주석) |
| 노트 뒤 끝 | 곡선 + "앱에서는…" + [📱 다시다에서 이어서 하기][다른 문제도 올려보기](1092-1149) | 저장·복습 과제 + [처음부터 다시](787-812) | 플랫폼 `end({kind:'note'})` |
| 약점 카드 뒤 끝 | 곡선 'survey'(995) | [처음부터 다시] | 플랫폼 `end({kind:'weakness'})` |
| "오늘은 여기까지" 뒤 | 버튼 없음 | [처음부터 다시] | 플랫폼 `end({kind:'closed'})` |
| 다시 찍기 | `location.reload()`(780·863) · `resetUpload`(804) | `restart`(450) · `retakeFromGate`(468) | 플랫폼 `run()` |

앱 끝에 망각곡선을 넣지 않는 이유: 곡선의 말 "앱에서는 이걸 알림으로 해줘"(1137)가 앱 안에선 거짓이다. 앱의 끝은 E칸(복습 과제)이 그 약속의 실물이다.

---

## 3. 앱 새 UI

- **입력칸** `features/photo/components/photo-text-input.tsx`(새, ~50줄): `TextInput` 한 줄(웹 `<input>`도 한 줄, `app.js:689`) `maxLength={200}` `autoFocus` `returnKeyType="send"` `onSubmitEditing` + 아래 [보내기] primary 버튼(`PhotoActionButtons`와 같은 모양, 라벨 `app.js:698`). 생김새 `index.html:172` `.fallback-input`(테두리 1.5 line·둥글기 12·패딩 13·글자 15) = `PhotoTheme`. 빈 값이면 안 보냄, 보내면 `thread.submitText(text)`. `FallbackInputCard`(`features/quiz/components/review-session/fallback-input-card.tsx`)는 Paper 토큰·"↑"·힌트 문구라 웹 모양과 달라 재사용 안 함.
- **키보드·스크롤**: `photo-flow-screen.tsx:70-82`의 `ScrollView`를 `KeyboardAvoidingView`로 감싼다 — `review-session-screen-view.tsx:273-284` 그대로(`behavior="padding"` `enabled={EXPO_OS !== 'ios'}`, iOS `automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps="handled"`). `scrollToEnd` 효과(`:52-56`) deps에 `textPrompt`.
- **약점 카드** `photo-weakness-card.tsx`(새, ~40줄): 제목+본문. 웹 `.card.final`(`index.html:110`: 크림 바탕·green-soft 테두리). `PhotoChatThread`에 분기 한 줄, `PhotoChatBubble` 타입 좁힘(astra 7).
- **설문 버튼**: 새 컴포넌트 없음 — `PhotoAction`(웹도 `setActions`, `app.js:1176`).
- **노트 카드**: `PhotoNoteCard` 그대로. 갈림길 1이 "넣는다"면 `variant==='flow'`에 📌 Text 한 줄(`photo-note-card.tsx:89-91` 옆).
- **수식**: 새 컴포넌트 없음 — `MathText`가 공용 포매터를 쓰게 되면 말풍선·버튼·노트가 자동으로 같아진다(§1.8).

---

## 4. 같은지 증명

### 4.1 골든 대본 — 옮기기 전, 포매터 뒤의 웹으로 녹음

순서가 핵심이다: **포매터(커밋 1) → 골든 녹음(커밋 2) → 이식**. 골든은 "지금 화면"의 글자다(포매터 변경분 `^{}`·`_`는 커밋 1의 단위 테스트가 따로 증명한다).

골든 파일 `features/photo/script/__fixtures__/golden/<번호>-<이름>.json`:
```json
{ "result": <AnalyzePhotoResult>, "verdicts": { "check": "match", "retry": "match" }, "diagnose": [null | <DiagnoseMethodResult>],
  "steps": ["맞아, 시작하자", "아, 이거였구나", "9를 더하고 뺀다", "25를 더하고 뺀다"],   // 버튼은 라벨, 입력은 {"text":"…"}
  "transcript": [
    { "coach": ["풀이 읽었어. \"x²+4x+4=5\" — 완전제곱식으로 접근했네.", "그럼 여기서부터 같이 보자."], "ask": true },
    { "buttons": [["맞아, 시작하자","primary"],["아니야, 다른 방법으로 풀었어","ghost"]] },
    { "me": "맞아" }, …,
    { "note": { "quote": "\"x²+4x+4=5\"", "why": "…", "fix": "…", "checks": "오늘 확인: 쪽지시험 ✔ · 재도전 ✔", "tags": "#완전제곱식 #절차 누락", "weakness": ["…"] } },
    { "ending": "note:success" },
    { "event": { "name": "check_answer", "passed": 1, "react": "got_it" } } ] }
```
**글자는 전부 포매터를 거친 값이다.** fixture엔 일부러 `x^{2}`·`x^2`·`2*3`·`sqrt(2)`·`a_n`·`a_{n+1}`을 넣는다(astra 5) — 1차 안의 "수식 없는 fixture만"은 버린다. 기존 fixture `__fixtures__/analysis.ts:6` `'x^2 + 4x + 4'`도 그대로 쓴다.

### 4.2 녹음기 둘

- **웹** `__tests__/web-golden.test.ts` — 파일 맨 위 `/** @jest-environment jsdom */`. `document.body.innerHTML = index.html의 <main>`, `window.eval(flow-bundle.js)` → (`survey-data.js`, 커밋 2·3까지만) → `window.eval(app.js)`. **`new JSDOM()`을 따로 만들지 않는다** — jest의 jsdom 전역을 쓰고 `window.eval`로 돌려야 `app.js`의 맨 `setTimeout`이 jest 가짜 시계에 잡힌다(§4.3). 스텁(jsdom에 없는 것, node로 확인): `AbortSignal.timeout`, `Element.prototype.scrollIntoView`, `createImageBitmap`, canvas `getContext/toDataURL`, `fetch`(result를 돌려줌), `window.track`(이벤트 수집), `alert`, `location.reload`(기록만). 사진 고르기→제출→fetch 응답으로 대화를 시작시키고(IIFE라 이 길뿐), `#thread .bubble.coach`의 `.p` textContent·`.ask`·`#actions button`(textContent·className)·`.fallback-input` placeholder·`.note-card`의 `.note-quote/.note-why/.note-fix/.note-checks/.note-tags/.note-weakness`·`.card.final`·곡선 첫 문장(`CURVE_LINES` 3종 → ending)·`track` 호출을 위 모양으로 적는다. **첫 실행은 "녹음" 모드로 골든을 쓰고 커밋**, 그 뒤는 비교. 옮긴 뒤 같은 테스트가 새 번들+새 app.js로 같은 골든을 내야 한다 → 웹 회귀 증명.
- **앱** `__tests__/photo-script.test.ts` — `createPhotoScript(recorder, deps)`에 같은 result·steps. `transcript-recorder.ts`가 (ⅰ) 말풍선 합치기(`use-photo-thread.ts:30-40` = `app.js:307-315`) (ⅱ) **모든 글자에 `formatMathText`**(say·mySay·버튼 라벨·placeholder·note·card) (ⅲ) note는 공용 포매터 `noteCardLines(view)`(checks·tags·weakness 줄 — `app.js:1063-1077` = `photo-note-card.tsx:22-28·79-86`; 모르는 약점 id는 웹 규칙대로 버린다 — `resolveWeaknessLabel`(`diagnosisMap.ts:587-591`)은 '알 수 없음'을 주지만 통역표 키만 들어오므로 실제 차이 없음)로 적는다. `deps.now` 고정. **`profile`이 둘이라 골든도 둘**: `picksWeakness:false`(웹과 공유) / `true`(앱만 — 묻는 말풍선 뒤는 앱 골든).
- **어댑터 테스트**: 기존 `photo-flow-screen.test.tsx` 49개 — 도우미 둘(`walkToNote`·`walkToPick`, `:88-120`)의 라벨을 새 대본으로. 지우거나 다시 쓰는 것 `:333`(사다리)·`:565`(2번 후보 검산)·`:690·706·727`(`photo_dead_end`)·`:780` ≈ 6개(짐작). 새로: 입력칸(보내기→diagnose 목), 약점 카드, `closed` 뒤 [처음부터 다시], **unmount 뒤 늦은 verdict → `savePhotoNote` 호출 0**(astra 4).

### 4.3 시간 경합 — 골든이 아니라 러너 테스트 (astra 6)

골든 녹음기는 verdict를 바로 돌려준다. 5초 경합은 **`__tests__/quiz-verify-runner.test.ts`**가 `jest.useFakeTimers()` + 제어 Promise(`let resolve; new Promise(r => (resolve = r))`) + `jest.advanceTimersByTimeAsync`로 잰다:
1. 4,999ms에 match 도착 → `match`, `waited_ms ≈ 4999`.
2. 5,000ms까지 안 옴 → `{verdict:'skip', reason:'wait_timeout'}`, `waitedOnce=true` → 재도전은 cap 0 → pending이면 즉시 `wait_timeout`(빈 화면 10초 방지, `app.js:926`). 그 뒤 늦게 온 match는 **버려진다**(화면에 안 나감).
3. `dispose()` 뒤 verdict 도착 → `say/ask/log/showNote` 호출 0.
4. 출발 조건 미달(후보 없음·자신감 미달·보기 2개) → `not_started`, `verify_ms:null`.
5. `routeFromText` 중 `dispose()` → diagnose가 와도 출력 0(astra 4).
웹 쪽은 **1건만**: `web-golden.test.ts`에서 `jest.useFakeTimers()`로 ⑬(wait_timeout) 시나리오를 돌려 어댑터 배선(번들의 러너가 jsdom 전역 타이머를 쓰는지)만 확인한다. gate 스크립트의 즉시 실행 스텁(`verify-web-proto-gate.mjs:127`)은 여기 안 쓴다.

### 4.4 골든 17개 (가지마다 하나)

① 거르기 rotation ② 거르기 small ③ 풀이 없음→✏️→입력→AI 확신→confirm(주머니 죽음)→설문 ④ 단언→예→[아, 이거였구나]→쪽지 ✔→재도전 ✔→노트(약점 1, 인용에 `x^{2}`) ⑤ 쪽지 ✗→재도전 ✗→노트 fail ⑥ [모르겠어] concept 있음 ⑦ [모르겠어] concept 없음(fix) ⑧ [안 썼는데]→멈춤→오늘은 여기까지 ⑨ 단언→아니→주제 목록→다른 방법→설문(힌트 없음)→약점 카드(라벨 확인, astra 3) ⑩ 추측→아니→후보(제외)→이 중엔 없어→주제→직접 쓸게→AI null→키워드 후보 ⑪ 두 번 못 알아들음→전체 목록→잘 모르겠어→'방법 미상' 카드 ⑫ 방법 맞는데 오류 못 찾음→"좀 신기해"→ANSWER_READ_HINT ⑬ 검산 not_started/wait_timeout→쪽지 건너뜀→노트(쪽지 칸 빈 줄) ⑭ 재도전 unverified / 모양 깨짐 none ⑮ 약점 2개+ — 웹 "A 또는 B" / 앱 묻기→고름·잘 모르겠어 ⑯ [지금은 넘어갈래] ⑰ 약점 0개(이름표 줄 없음) + 보기에 `a_n`·`2*3`.

---

## 5. 옮기는 순서·커밋 단위·웹 배포 시점

| # | 커밋 | 끝나면 웹 | 끝나면 앱 |
|---|---|---|---|
| 1 | `feat(math): 공용 수식 포매터` — `components/math/format-math-text.ts` + 테스트, `MathText.tsx` 위임(+패턴에 아래첨자), `flow-entry.ts` export, `app.js` fmtMath→`F.formatMathText`·mathSpan `<sub>` 제거, 번들 재생성, esbuild·jsdom 고정, `build:proto`·`verify:proto`·`deploy:proto` 묶기 | 돈다(`_`·`^{}` 표기만 바뀜, 배포는 아직) | 돈다(`^{}`·`_` 표기 추가) |
| 2 | `test(web): 골든 17개 녹음` — jsdom 녹음기 + 골든 JSON | 그대로 | 그대로 |
| 3 | `feat(photo): 공용 대본 모듈` — `script/*`, `flow/survey-options.ts`, `flow/diagnose-method-request.ts`, 러너 테스트, 앱 골든 녹색, `flow-entry.ts` export | 그대로(아직 안 붙임) | 그대로 |
| **판단** | **커밋 3이 끝난 날 저녁(권고).** 그날이 **10.06(월) 이후**면 커밋 4·8을 건너뛰고 5로 간다(앱 전용 경로 1·2·3·5·6·7). 웹은 옛 app.js로 남고 골든이 둘을 같은 글자로 묶는다 | | |
| 4 | `refactor(web): app.js → 어댑터` — 660줄 삭제, webIO, `setFile`·`resetUpload` dispose(astra 1), `survey-data.js` 삭제 + `index.html` 태그 + **`verify-web-proto-gate.mjs:13`**(astra 2), 번들 재생성 | **골든 녹색 + gate 8/8 + storage 12/12**여야 커밋 | 그대로 |
| 5 | `feat(app): 대본 모듈로 ①②③` — thread 확장, 훅 교체(+unmount dispose), `PhotoChatBubble` 타입(astra 7), 약점 카드, event-types, 화면 테스트 (`profile.textInput:false`로 잠깐) | 그대로 | 돈다(입력칸 자리는 옛 버튼 폴백 — 커밋 6까지만) |
| 6 | `feat(app): ④ 입력칸 + diagnoseMethod` — `photo-text-input.tsx`, KeyboardAvoidingView, `textInput:true`, 테스트 | 그대로 | **웹과 같음** |
| 7 | `chore(app): 1.0.10 재빌드` — EAS iOS·안드, 제출, `docs/STATUS.md` | — | 심사 중 |
| 8 | `deploy:proto` — 웹 배포(커밋 1·4의 번들·app.js). 시각 규칙 아래 | **라이브 = 공용 대본** | — |

- 커밋 5의 `textInput:false`는 구현 중간 상태 — 스크립트가 `askText` 대신 옛 앱 폴백(`showAllMethods` 31개 버튼, `use-photo-flow.ts:427-431`)으로 가는 분기 하나. 커밋 6에서 `true`. 이 분기는 §7의 ④ 자르기에 다시 쓴다.
- **웹 배포는 커밋 4가 녹색이 되는 날 한다 — 앱 제출을 기다리지 않는다.** 두 사본이 같은 글자인 기간이 길수록 09.23의 갈라짐(`STATUS.md:182`)이 다시 생긴다. 미룰 이유는 "웹이 깨질까"뿐인데 커밋 4의 조건(골든+gate+storage 녹색)이 답한다.
- **피하는 시각**: 8호 10.03(토) 21:00·9호 10.05(월) 21:00 앞뒤 3시간. Netlify 기본 캐시가 `max-age=0, must-revalidate`라 보통 같이 갱신된다(짐작). 배포 뒤 `?qa=1`로 한 바퀴(스토어 버튼까지) 기윤 폰에서.

---

## 6. 1.0.10 코드와의 관계

**지워지는 것**(`96f59a1`에 들어간 것 중): "2번 후보 검산 출발" `use-photo-flow.ts:541-542`와 `startQuizVerify(index)`의 Map(`:130·227-261`) · 짚기 사다리 `:515-569`, `showWhy :571-576`, `pointing_rejected :521-537` · `photo_dead_end` 호출 셋(`:492·503·521`) · 화면 테스트 `:565·333·690·706·727·780` · `GATE_COPY` 사본(`:69-78`) · `VERIFY_WAIT_MS`(`:63`).

**남는 것**: `checkSkipped`(`types.ts:112`) — `checkResult==='skip'`에서 어댑터가 만든다. 카드 규칙(`photo-note-card.tsx:22-28`)·테스트(`photo-note-card.test.tsx:104·119`) 그대로. `verify-quiz-request.ts`·`quiz-guard.ts`·`route-from-analysis.ts`·`analyze-photo-request.ts`(축소·195초·submissionId·retakeOf) 전부 그대로. 대기 문구 그대로.

**`PhotoNote`는 안 바뀐다.** `types.ts:71-114` 그대로. `'unverified'`는 저장 전 `'none'`(1.0.10과 같음). 노트는 **날것 문자열**을 저장하고 포매터는 그릴 때 돈다 — 옛 노트도 새 규칙으로 보인다. 설문 결말 카드는 저장 안 함. **→ 예약급 없음.** `isPhotoNoteLike`(`note-store.ts:81-91`) 그대로.

**1.0.10에 있던 구멍 하나가 같이 막힌다**(astra 4): 헤더로 떠난 뒤 깨어난 검산 대기가 노트를 저장하고 복습 과제를 만들던 것 — `useEffect` cleanup의 `dispose()`.

**`event-types.ts`**: 추가만. **버전**: 1.0.10 그대로, 빌드 번호는 EAS. 이미 만든 iOS 20·안드 9 빌드는 안 낸다.

---

## 7. 위험과 자를 곳

**신호(10.01 🔒): 1.0.10+B가 10.14(수)까지 두 스토어에 못 뜬다.** 애플 1~2일·구글 수 시간~1일(둘 다 짐작) → **10.10(금)까지 제출**이 선. 오늘 10.01(목).

**판단 시점 둘**(권고 반영):
- **커밋 3 끝난 날 저녁** — 10.06 이후면 웹 어댑터(4)·웹 배포(8)를 건너뛴다. 앱 전용 경로 = 커밋 1·2·3·5·6·7. 골든이 옛 웹과 모듈을 같은 글자로 묶는다. 커밋 1의 포매터 웹 변경은 배포가 안 되니 라이브 웹은 `<sub>` 그대로 남는다 — 앱과 `_` 표기가 다른 기간이 생긴다(기록).
- **커밋 5 끝난 날 저녁** — 10.08 이후면 ④(커밋 6)를 자른다: `profile.textInput:false`로 두면 앱만 옛 버튼 폴백. 모듈 경로·웹 입력칸은 그대로. "막히는 자리가 플랫폼마다 다르다"가 1.0.11까지 남는다 — 09.23이 금한 것이라 **기록하고 자른다**.
- **자르지 않는 것**: ①②③. 이걸 자르면 1.0.10을 그냥 내는 게 낫다 — 그 판단은 기윤.

다른 위험:
- **웹이 지금 학생 문이다**(8호 10.03). 가짜 데이터 골든은 실제 AI 응답의 모서리(보기 2개·concept 없음·unknown id)를 ⑬⑭⑦⑪로 덮는다. 배포 뒤 `?qa=1` 실물 한 바퀴.
- **포매터가 photo 밖으로 간다**(§1.8). quiz 화면 문자열에 `^{`·`_`가 있으면 표기가 바뀐다 — `data/`를 grep해 몇 건인지 커밋 1에서 센다(이 설계에선 안 셌다). 규칙 1-3·5는 같은 코드라 나머지는 안 바뀐다.
- **번들 재현성** — esbuild 미고정. 커밋 1에서 고정.
- **jsdom 녹음기** — `app.js`가 로드 시점에 `document.getElementById('drop').addEventListener`(`:398`)를 바로 부른다 → body를 먼저 넣으면 된다. 스텁 4종은 §4.2. 가짜 DOM `vm`으로는 이미 돌고 있어(`verify-web-proto-gate.mjs:144-155`) 될 것으로 본다(짐작). 안 되면 플랜 B = 가짜 DOM에 `innerHTML` 중첩 파서·`querySelectorAll`(~40줄).
- **화면 테스트 49개 중 깨지는 수** — 도우미 2개로 대부분 산다고 봤지만 돌려봐야 안다. 15개 넘으면 어댑터(저장·헤더·retakeOf·검산 전송·unmount)만 남기고 대화 검증은 골든에.
- **1.0.10 vs 웹의 미세 차이가 더 있을 가능성** — 골든 녹음이 드러낸다(그래서 골든이 커밋 2).

---

## 8. 시간 견적 (전부 짐작, 1차보다 +0.5~1 세션)

참고치: 1.0.10 = 14파일 869줄, 커밋 `96f59a1` 16:27, 요청서 "한 오후"(가지 시작 시각은 못 봤다).

B의 크기(짐작): 새 파일 13 + 고치는 15 + 지우는 1 = **29파일, ±2,000줄**(스크립트 ~700 신규는 660줄 이식, app.js −660/+130, 훅 −500/+110, 포매터 ~80 + 테스트 ~60, 러너 테스트 ~120, 골든·녹음기 ~450).

| 단계 | 짐작 |
|---|---|
| 커밋 1 포매터 + 빌드 묶기 | 반나절 |
| 커밋 2 골든 녹음기 | 반나절 — jsdom 스텁이 막히면 +반나절 |
| 커밋 3 모듈 + 앱 골든 + 러너 테스트 | 반나절~하루 |
| 커밋 4 웹 어댑터(골든·gate·storage 녹색) | 반나절 |
| 커밋 5 앱 ①②③ + 테스트 고침 | 반나절~하루 — 화면 테스트가 변수 |
| 커밋 6 ④ 입력칸 + 실기기 키보드 | 반나절 |
| 커밋 7·8 빌드·제출·배포·STATUS | 반나절 (EAS 대기 포함) |

**합 3~4 세션** → 코드 10.02~10.07, 제출 10.07~08, 두 스토어 10.09~11. 10.14까지 여유 3~5일. 1차(2.5~3.5)보다 늘어난 건 포매터(photo 밖 범위)·러너 테스트·unmount 셋이다.

---

## 9. 기윤에게 올리는 갈림길 — 넷 (전부 "학생한테 가는 것")

`docs/how-we-decide.md` 「올리는 것 셋뿐」 1번(화면에 뜨는 것)에 걸리는 것만.

1. **📌 "수능장에서 이 풀이를 생각해 낼 수 있는가…" 접기 문장**(`app.js:1051`) — 웹 카드엔 있고 앱 카드엔 없다. **추천: 앱도 넣는다.** 카드 안 글자는 공용으로 정했는데 이 줄만 빼면 첫날부터 예외다. 비용 Text 한 줄.
2. **약점 고르기 말풍선을 웹에도 켜나** — **추천: 앱만.** 웹엔 고른 값이 갈 자리(저장·복습)가 없고 08.11 🔒가 "저장 경로를 붙일 때"라고 했다. ("똑같다"의 유일한 예외로 적어 둔다.)
3. **설문 결말(약점 카드)을 앱에서 저장하나** — **추천: 이번엔 안 한다.** 웹도 안 한다(`app.js:985-986`). 저장하려면 사진·인용 없는 새 노트 모양이 필요하다. 나중에 붙여도 값이 같다 → 젓가락급.
4. **(새) 아래첨자 `a_n`의 글자** — 지금 웹은 `<sub>` 태그로 어떤 글자든 내린다(`app.js:261-267`), 앱은 `a_n` 그대로. RN엔 `<sub>`가 없어 둘을 같게 하려면 **둘 다 유니코드 아래첨자**(숫자·기호·소문자 17자만 있고 b·c·d·f·g·q·w·y·z는 없음 — 없는 글자가 섞이면 `a_q`처럼 원문 유지)로 가야 한다. **추천: 유니코드로 통일.** 웹 학생 눈엔 `aₙ`의 모양이 조금 바뀐다(태그 → 글자). 대안 = 웹 `<sub>` 유지 + "아래첨자는 플랫폼 차이"로 적기 — 그러면 "글자까지 같다"가 `_`에서 깨진다.

---

## 10. 파일 목록

**새로 만드는 것 (13)**
- `components/math/format-math-text.ts` · `components/math/__tests__/format-math-text.test.ts`
- `features/photo/script/photo-script.ts` · `script-io.ts` · `script-events.ts` · `quiz-verify-runner.ts` · `transcript-recorder.ts`
- `features/photo/script/__fixtures__/golden/*.json`(17) · `__tests__/photo-script.test.ts` · `__tests__/web-golden.test.ts` · `__tests__/quiz-verify-runner.test.ts`
- `features/photo/flow/survey-options.ts` · `features/photo/flow/diagnose-method-request.ts`
- `features/photo/components/photo-text-input.tsx` · `photo-weakness-card.tsx`

**고치는 것 (15)**
- `components/math/MathText.tsx`(formatMathText 위임, 패턴에 아래첨자)
- `web-proto/app.js`(fmtMath→F · mathSpan sub 제거 · setFile/resetUpload dispose · 518-1177 삭제 → 어댑터) · `web-proto/index.html`(survey-data 태그 삭제) · `web-proto/flow-entry.ts`(export 5 추가, 빌드 주석) · `web-proto/flow-bundle.js`(재생성)
- `scripts/verify-web-proto-gate.mjs`(`:13` SOURCES에서 survey-data.js 제거)
- `package.json`(esbuild·jsdom devDependencies, `build:proto`·`verify:proto`, `deploy:proto` 묶기)
- `features/photo/hooks/use-photo-thread.ts`(textPrompt·askText·submitText·showWeaknessCard) · `use-photo-flow.ts`(311-812 → 어댑터, unmount dispose)
- `features/photo/types.ts`(PhotoBubble weakness) · `features/analytics/event-types.ts`(이름 6 추가·react?)
- `features/photo/screens/photo-flow-screen.tsx`(KeyboardAvoidingView·입력칸) · `features/photo/components/photo-chat-thread.tsx`(weakness 분기) · **`photo-chat-bubble.tsx`(`:21` 타입 좁힘)** · `photo-note-card.tsx`(갈림길 1이 "넣는다"면 한 줄)
- `features/photo/screens/__tests__/photo-flow-screen.test.tsx`(도우미 2 + ~6개 + unmount) · `features/photo/components/__tests__/photo-chat-bubble.test.tsx`(`x^{2}` 한 줄)
- `docs/STATUS.md`(끝날 때)

**지우는 것 (1)**: `web-proto/survey-data.js`

**안 건드리는 것**: `functions/**`(서버 변화 0) · `analyze-photo-request.ts` · `verify-quiz-request.ts` · `quiz-guard.ts` · `route-from-analysis.ts` · `note-store.ts` · `photo-file-store.ts` · `app/photo.tsx` · `app/_layout.tsx` · `scripts/verify-web-proto-storage.mjs`.

---

## 짐작 목록 (확인 안 한 것)

- 애플 심사 1~2일·구글 수 시간~1일 → "10.10까지 제출".
- 시간 견적 전부(§8). app.js ≈650줄·훅 ≈290줄 결과 크기. 화면 테스트에서 깨지는 수 ≈6.
- esbuild가 RN 소스(Flow)를 못 읽어 빌드가 터진다.
- jsdom 전역에서 `window.eval(app.js)`가 그대로 돈다(가짜 DOM `vm`은 돌고 있다). jest 가짜 시계가 `window.eval`로 올린 IIFE의 `setTimeout`에 걸린다.
- Netlify 기본 캐시 헤더가 `max-age=0, must-revalidate`.
- 1.0.10 "한 오후"의 시작 시각.
- quiz 화면 데이터에 `^{`·`_`가 몇 건 있는지(커밋 1에서 센다).
