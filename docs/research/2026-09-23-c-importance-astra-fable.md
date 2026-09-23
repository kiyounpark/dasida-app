# C칸은 지금 중요한가 — astra·Fable 원문 (2026.09.23)

> 결론과 조각별 시기는 `docs/STATUS.md` 「C는 지금 중요한가」. 이 파일은 원문 보관용이다.
> 순서: 같은 질문을 둘에 걸었다 → 갈려서 Fable에게 astra 답을 주고 다시 정하게 했다 → Fable 최종.
> 사용량: astra 64,891토큰(codex stderr `model: gpt-6-astra` 확인). Fable 두 번 합쳐 약 33만(Claude 구독).

## 질문 (둘에게 같은 것)

너는 1인 개발자 기윤의 수능 수학 오답분석 앱 DASIDA(저장소: /Users/baggiyun/dev/dasida-app)의 판단을 돕는다. 읽기만 하고 아무 파일도 고치지 마라.

## 먼저 읽을 것 (요약하지 말고 직접 열어라)
1. /private/tmp/claude-501/-Users-baggiyun-dev-dasida-app/f6c1b56f-d0d4-4752-8c7c-5098a902bc8b/scratchpad/march-plan.md — 3월 말 계획(기한·관문·판정표). 원래 claude.ai 아티팩트인데 본문을 옮겨 적었다
2. docs/STATUS.md 전체 — 개발 칸. 특히 C칸 행(138줄), 「C칸 인수인계」 절(181줄~), 97줄, 「🧭 순서」(65줄~)
3. 필요하면 코드를 직접 열어라 (web-proto/, features/photo/, data/, functions/src/)

## 질문
C칸(약점 이름표 — 통역표 186칸 중 빈 칸 130개, 이미 있는 약점 56개 중 문제 있는 것 40개, 수열 ② 보류)은
지금 개발 순서(⑤ ✅ → E → 사용량 로그 → 개발 멈추고 댓글 통로, ~10.07)에 없다.
STATUS 97줄은 "미뤄도 값이 같다(젓가락급)"라고 적었고, 계획은 "가장 새기 쉬운 일"이라고 적었다.

**이 판단이 맞나? C는 정말 지금 중요하지 않은 일인가?**

C를 한 덩어리로 보지 말고 조각으로 나눠서 봐라. 각 조각마다:
- 언제 해야 하나: 10.07 전 / 11.18 전 / 겨울(~01.15) / 안 해도 됨
- 그 이유가 계획의 어느 관문·숫자에 닿는지 (예: "다른 날 두 번째 풀이 1명", "반복 복습 학생", 01.15 관문)
- 미루면 비용이 커지나(데이터·스키마·학생 신뢰처럼 되돌리기 비싼 것) 아니면 언제 해도 같나

적어도 이 셋은 코드로 확인하고 답해라 (확인해보니 상관없으면 상관없다고 말해라):
(a) 댓글 통로로 오는 학생은 웹(web-proto)으로 온다. 웹에서 학생 눈에 약점 이름표가 뜨나? 뜬다면 "문제 있는 40개"가 그 학생에게 닿을 수 있나?
(b) E는 primaryWeaknessId가 있는 노트만 복습 과제로 만든다(STATUS 90줄, "대략 3분의 1"). C가 "반복 복습 학생" 숫자에 실제로 닿나? 3분의 1이라는 숫자는 확인된 건가?
(c) 계획 M3의 "새 수능 범위(기하 빠짐)에 약점 분류 맞춤"과 C는 같은 일인가, 다른 일인가? 겹친다면 지금 C를 하면 겨울에 버려지나?

## 답 형식 (한국어, 짧게)
1. 결론 한 줄: "중요하지 않다"가 맞음 / 틀림 / 일부만 맞음
2. 조각별 판정 (조각 하나에 2~3줄)
3. 근거는 반드시 파일:줄로. 근거 없는 주장은 쓰지 마라
4. 숫자(몇 건·몇 %)를 말하면 어떻게 셌는지 적어라. 못 셌으면 "안 셌다"고 적어라
5. 이 판단을 뒤집을 수 있는 사실 하나 (있다면)

기윤의 기질: 큰 결정·복잡한 것에 에너지가 급소모된다. 추상어 말고 구체적으로. 결정은 기윤이 한다.

## astra 답

**일부만 맞음. C 전체를 먼저 할 필요는 없지만, ‘전부 미뤄도 비용이 같다’는 판단은 틀립니다.**

아래 날짜는 제 제안입니다. `계획`은 직접 읽은 [march-plan.md](/private/tmp/claude-501/-Users-baggiyun-dev-dasida-app/f6c1b56f-d0d4-4752-8c7c-5098a902bc8b/scratchpad/march-plan.md:19)를 뜻합니다.

- **웹에 보이는 이름표 오류 → 10.07 전, 확인된 오류만.**  
  웹도 `labelKo`를 표시합니다. 그러나 ‘문제 있는 40개’는 **설명·처방 점검 결과**이고, 웹의 설명·처방은 AI 응답에서 옵니다. 따라서 문제 약점의 **이름은 닿지만, 지적된 잘못된 처방이 그대로 닿지는 않습니다.** 이름표가 실제 풀이와 어긋나는 경우만 우선 수정할 이유가 있습니다. 첫 재방문 관문과 학생 신뢰에 닿습니다. ([app.js:735](/Users/baggiyun/dev/dasida-app/web-proto/app.js:735), [점검문서:3](/Users/baggiyun/dev/dasida-app/docs/weakness-copy-audit-2026-09-15.md:3), 계획:20)

- **기존 콘텐츠의 거짓·딴단원 처방 → 10.07 전 E로 노출할 부분부터, 나머지는 11.18 전 실제 노출 범위에 맞춰.**  
  예컨대 복습은 지금도 `ax²+bx+c`에서 곧바로 `b/2`를 쓰라고 가르칩니다. 이런 오류는 이름 다듬기와 다릅니다. E를 연결하면 잘못된 내용을 반복 학습시킬 수 있어, 미룰수록 학생 신뢰·학습 비용이 커집니다. ‘반복 복습 학생’ 관문에 닿습니다. ([review-content-map.ts:120](/Users/baggiyun/dev/dasida-app/data/review-content-map.ts:120), [use-review-session-screen.ts:200](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-review-session-screen.ts:200), 계획:29)

- **빈 칸 채우기 → 11.18 전, 실제 들어온 사진에서 복습이 막히는 칸만.**  
  C는 E 이후 **복습을 받을 수 있는 학생 범위**에 닿습니다. 다만 현재 코드는 노트 저장까지만 하며, `primaryWeaknessId` 조건은 아직 E의 계획입니다. 더욱이 웹은 노트를 저장하지 않아 **C를 채우고 앱 E를 붙여도 웹 학생의 반복 복습은 바로 생기지 않습니다.** 먼저 이 경로를 구분해야 합니다. ([use-photo-flow.ts:566](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:566), [STATUS.md:90](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:90), [app.js:727](/Users/baggiyun/dev/dasida-app/web-proto/app.js:727), 계획:29)

- **수열 ② → 11.18 전 해당 학생이 오면; 아니면 겨울로. 부호만 먼저 넣지는 않기.**  
  후보가 하나면 앱이 자동으로 대표 약점에 저장합니다. 따라서 부호만 추가하면 곱셈 실수에도 부호 이름표가 붙는다는 우려는 코드와 맞습니다. 빈 칸을 유지하는 비용보다 **틀린 ID로 노트·복습을 쌓는 비용**이 큽니다. ([use-photo-flow.ts:474](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:474), [STATUS.md:335](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:335), [review-scheduler.ts:140](/Users/baggiyun/dev/dasida-app/features/learning/review-scheduler.ts:140))

- **새 수능 범위 맞춤 → 겨울, 01.15 전. C와 겹치지만 같은 일은 아님.**  
  C는 현재 분류의 빈칸·내용 수정이고, M3는 새 학생에게 보여줄 범위를 바꾸는 일입니다. 후보 함수에는 교육과정 구분 없이 풀이법·실수유형만 들어갑니다. 기하 노출 제한은 별도로 필요하며, 수열 같은 공통 내용 수정까지 버릴 이유는 없습니다. 기존 ID 삭제·의미 변경은 저장된 복습과 서버 허용값에 닿으므로 주의가 필요합니다. ([weakness-mistake-type-map.ts:135](/Users/baggiyun/dev/dasida-app/features/photo/flow/weakness-mistake-type-map.ts:135), [diagnosisMap.ts:465](/Users/baggiyun/dev/dasida-app/data/diagnosisMap.ts:465), [learning-history.ts:194](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:194), 계획:41)

- **전 칸 완성·말맛 다듬기 → 안 해도 됨.**  
  계획의 관문은 표 완성률이 아니라 학생의 재방문·복습입니다. 거짓을 고치는 일과 단순 표현 개선을 분리하면, 후자는 미뤄도 데이터 비용이 거의 없습니다. ([STATUS.md:312](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:312), 계획:20·29·53)

**숫자 확인:** 코드의 풀이법 31개 × 실수유형 6개를 전부 `weaknessCandidatesFor`에 넣어 셌습니다. 빈 칸 130, 후보 하나 51, 여러 후보 5였습니다. **56÷186≈30.1%는 표의 비율이지 학생 노트 비율이 아닙니다.** 여러 후보에서 학생이 “모르겠어”를 고르면 대표 약점도 비므로 ‘노트 대략 3분의 1’은 확인된 수치가 아닙니다. 실제 학생 비율과 ‘문제 약점 40개’의 현재 잔존 수는 **안 셌습니다.** ([후보 함수:135](/Users/baggiyun/dev/dasida-app/features/photo/flow/weakness-mistake-type-map.ts:135), [선택 처리:509](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:509), [STATUS.md:523](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:523))

**판단을 뒤집을 사실:** 댓글로 온 학생이 실제 복습 경로까지 들어왔는데, 그 학생 사진의 빈 칸 때문에 과제가 계속 생기지 않는다면 해당 C 조각은 즉시 앞으로 와야 합니다. 지금은 그 실제 비율을 모릅니다. ([STATUS.md:523](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:523))

## Fable 1차 답

1. **결론: "중요하지 않다"는 일부만 맞음.** 10.07·11.18 관문엔 C가 안 닿는다. 03.31 "반복 복습 학생 10명"엔 C의 한 조각(비기하 빈 칸)이 직접 닿는다. 그것도 겨울 일이지 지금 일은 아니다.

2. **조각별 판정**

**C-1a 비기하 빈 칸 32개** (diff 3·sequence 4·log_exp 5·trig 3·integral 3·limit 5·proposition 5·counting 3) → **겨울(~01.15), M3와 같은 판.**
E는 `finishNote(…, weaknessIds[0] ?? null)`로 후보 1개일 때만 primary를 박고(`use-photo-flow.ts:474-475`), 빈 칸이면 null → 과제 0건. 노트는 만들 때 한 번 이름표가 박히고 재계산이 없다(`photo-note-card.tsx:92`가 읽기만). 그래서 **C 전에 찍힌 노트는 영원히 복습이 안 생긴다** — 이게 "미루면 커지는 비용"의 모양이고, 지금은 학생 0명이라 0원, 1~2월 새 학생부터 커진다. 스키마 마이그레이션은 없다(id 추가형, 서버는 `WeaknessIdSchema = z.enum(weaknessOrder)` `learning-history.ts:194`).

**C-1b 기하 빈 칸 10개** (conic 5·vector 5, 42칸 목표 안에 들어 있음) → **안 해도 됨.** 2028학년도부터 기하가 빠지고(계획 M3, STATUS:110), 11.19 뒤엔 모든 학생이 새 범위다. 기출 태그 11.6%가 기하인데 그게 42칸의 24%를 먹고 있다.

**C-2 문제 있는 desc·tip 40개** → **겨울, "590개 검산"(STATUS:462)과 한 묶음.** 점검 대상은 desc·tip뿐이고(audit 문서 3줄), desc·tip이 학생 눈에 뜨는 자리는 기출 실모 결과 화면뿐이다(`quiz-result-screen-view.tsx:98`, `quiz-result-report-hero.tsx:36,42`). 복습 hero는 60개 전부 `heroPrompt`가 있어 tip 폴백(`review-content-map.ts:2364`)이 안 탄다. **사진 경로·웹엔 안 뜬다.**

**C-3 수열 ②(곱셈/부호)** → C-1a의 일부. 수열은 기출 11.7%인데 6칸 중 4칸이 빈다. 겨울에 C-1a를 열면 첫 순서.

**C-4 웹 번들 재빌드** → **다음 웹 배포 때 5분.** `deploy:proto`가 `--no-build`(package.json:24)고 `flow-bundle.js`는 09.08 빌드(`b7244a6`)라 09.19에 넣은 `g3_seq_sum_term`이 웹에 **0건**이다. 급하진 않다 — 웹에서 C는 🏷️ 한 줄이 전부라서.

3. **코드로 확인한 셋**
(a) 웹은 뜬다 — `app.js:745-748`이 `F.weaknessCandidatesFor` → `labelKo` 한 줄. 빈 칸이면 줄을 지운다(748). "문제 40개"는 desc·tip이라 **웹 학생에게 안 닿는다.** 웹의 "다음엔"은 AI `cand.fix` 아니면 실수유형 통조림 문구다(`app.js:736`).
(b) 닿는다 — 위 C-1a. "3분의 1"은 **칸 기준**이다: 186칸 중 하나로 좁혀지는 칸 51개 = 27%(`weakness-mistake-type-map.test.ts:159`). 기출 빈도로 가중하면 30%(아래 4). **실제 노트에서 몇 %인지는 표본 1장뿐**(STATUS:523). 앱은 `photo_weakness_labeled`를 남기지만(`use-photo-flow.ts:465`) 웹은 그 이벤트가 없다(grep 0건).
(c) 다른 일이다. M3는 기하·미적Ⅱ 풀이법 8개를 새 학생에게 안 보이게 하는 일(지우기), C는 칸 채우기(넣기). 겹치는 건 C-1b 10칸뿐 — 그건 지금 하면 겨울에 버려진다.

4. **숫자 센 법**
- 1800문항·60시험지·태그 1813개: `data/exam/*/problems.json`의 `diagnosisMethods`를 python으로 셌다.
- 51/5/130: 테스트 파일 숫자 + 같은 규칙(`weaknessCandidatesFor`, 두루뭉술 뒷순위)으로 재계산해 일치.
- 30%: 풀이법별 "하나로 좁혀지는 칸/6"에 기출 빈도를 곱해 더했다. **실수유형 6개가 고르게 나온다는 가정**이 들어 있다 — 안 확인됨.
- 기하 10/42: 상위 10 풀이법 중 conic(7.8%)·vector(2.3%)의 빈 칸 5+5.
- "40개"는 못 재현했다. audit 문서는 제기 59·버틴 44건이고, `### ` 제목의 약점 id를 겹치지 않게 세면 **30개**다.
  > **Claude 주 (09.23):** 같은 방법으로 세면 40개다. `grep -E '^### ' docs/weakness-copy-audit-2026-09-15.md | grep -oE '`[a-z0-9_]+`' | sort -u | wc -l` → 40. Fable 숫자가 틀렸다.

5. **뒤집을 사실 하나.** 댓글 통로 7일 동안 웹 노트 20장에서 이름표가 붙은 비율이 나오면 판정이 바뀐다. 10% 밑이면 C-1a를 M3 앞(12월)으로, 50% 위면 C-1a도 안 해도 된다. 웹에 `photo_weakness_labeled` 한 줄(`app.js:745` 바로 뒤, 후보 개수는 이미 손에 있다)을 붙이면 잴 수 있고, 지금 만들 사용량 로그와 같은 자리다.

## Fable 2차 답 — astra 답을 받고 다시 정함 (최종)

> 프롬프트에 넣은 문장: "네 안을 방어하지 마라. astra 안이 나으면 그걸로 가도 된다. 버려도 된다."
> 갈린 자리: astra는 복습 콘텐츠의 거짓(b/2)을 10.07 전으로, Fable은 겨울로 뒀다.

E가 여는 복습 화면은 `review-content-map`의 생각단계와 `remedialFlows`만 그린다(`use-review-session-screen.ts:5,19,200,333`). `diagnosisMap`에서는 `labelKo`만 읽는다(`:654`). **점검에서 나온 거짓 8건은 전부 desc·tip이고(audit 문서 3줄), 그 문장은 복습 화면에 안 뜬다.** 8건 중 5개 약점(`counting_method_confusion`·`g2_poly_factoring`·`g2_set_count`·`g3_integral`·`g3_trig`)이 E로 열리는 46개 안에 있긴 하지만, 열리는 건 그 약점의 생각단계지 그 tip이 아니다.

복습 콘텐츠 자체에서 거짓이 **확인된 건 1곳**: `review-content-map.ts:120` (`formula_understanding`, cps×개념구멍 — 후보 1개 칸이라 E가 자동으로 연다). 단 cps는 기출 1800문항 중 **0번**(`data/exam/*/problems.json`에 `"cps"` 파일 0개). 나머지 590개는 아무도 안 봤다 — "거짓"이 아니라 "미확인"이다.

E가 자동으로 여는 약점 46개는 186칸 중 후보 1개 칸의 약점을 겹치지 않게 센 것(python, `weaknessCandidatesFor` 규칙 재현).

**astra 답에서 받은 것 둘**
- 웹은 노트를 저장 안 하니(`app.js:727` 캡처 안내) C+E를 해도 **웹 학생의 "반복 복습"은 0**이다. 판정표의 반복 복습 학생은 앱 학생만 센다 — 내 첫 답에 이 줄이 빠져 있었다.
- 부호만 먼저 넣지 않기(`use-photo-flow.ts:474`) — 같은 판단.

안 받은 것: "웹 이름표 오류 10.07 전" — labelKo가 틀렸다고 확인된 건은 0건이다(점검 대상이 desc·tip).

| 조각 | 시기 | 바뀐 것 · 이유 |
|---|---|---|
| `review-content-map.ts:120` b/2 한 줄 | **10.07 전, E 여는 날 5분** | 바뀜(겨울→지금). 확인된 거짓이고 E가 자동으로 여는 칸이다. 기출 0번이라 급하진 않지만 한 줄이라 미룰 이유도 없다 |
| 590개 검산 (미확인 콘텐츠) | **겨울, 1~2월 새 학생 전** | 안 바뀜. 복습은 앱에만 있고 앱 학생은 겨울까지 안 온다(댓글 통로=웹) |
| desc·tip 40 고치기 | **겨울** | 안 바뀜. 뜨는 자리가 실모 결과 화면뿐(`quiz-result-screen-view.tsx:98`), 복습·사진·웹엔 안 뜬다 |
| 비기하 빈 칸 32개 (수열 ② 포함) | **겨울, M3 같은 판** | 안 바뀜. 앱 E 학생의 과제 생성률(칸 기준 27%)을 올리는 일 — 학생이 앱에 오기 전이면 된다 |
| 기하 빈 칸 10개 | **안 해도 됨** | 안 바뀜. 2028 범위에서 빠짐 |
| 웹 번들 재빌드 (09.19 C가 웹에 0건) | **다음 웹 배포 때 5분** | 안 바뀜 |

**뒤집을 사실**: 댓글로 온 학생을 앱으로 보내기로 하면(웹 대신) 비기하 32칸과 590 검산이 11.18 전으로 당겨진다. 지금 계획은 웹이다.
