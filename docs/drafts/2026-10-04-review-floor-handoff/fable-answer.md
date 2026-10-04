# Fable 답 — 2026.10.04 오전 (Agent 툴 · model fable · 약 187,587 토큰 · 도구 31회)

질문 전문은 `question.md`. 아래는 Fable 보고 원문(들여쓰기만 걷음). 인용 줄 중 Claude(Fable 세션)가 직접 확인한 것: `use-photo-flow.ts:250-252` · `photo-script.ts:507` · `learning-history.ts:194` · `app.config.js:13` · `ios/app/Supporting/Expo.plist:5-8` · `home-notes-heading.ts:13` · `weakness-mistake-type-map.test.ts:109,145-146` · `target-student.md:111,127` — 전부 맞았다.

---

## Q1. 선생과 학생이 갈릴 때 — (a)에 가깝지만 "그래도 안 읽히면 칸 비움"은 뺀다

**결론 1줄:** 수학(math-checker)이 이기고, 학생 눈은 고쳐쓰기 1회의 입력으로만 쓴다. 2차본이 수학에서 깨지면 **1차본(수학 통과본)을 넣는다 — 비우지 않는다.** 비우는 건 수학이 깨졌을 때뿐.

**근거**
- 이미 09.19에 반은 정해져 있다. `target-student`는 탈락 권한이 없고(`.claude/agents/target-student.md:111-113`, `:127-131` "시뮬이 실측을 이긴다"), 권고는 1회 고쳐쓰기 입력으로 들어간다(`docs/weakness-round-howto.md:86-89`). "누가 이기나"에서 남은 건 "안 읽힌다"가 **칸을 비우게 할 수 있나**뿐이다.
- 안 읽힌다는 근거는 아직 0건이다 — "동작 4개면 안 한다"는 원문 grep 0건(`docs/STATUS-archive.md:411-413`). 반면 "안 듣는다"는 코드 전수검사다(1,428,840쌍, `docs/weakness-fill-sequence-calc-slip-2026-09-20.md:118-119`). 실측이 시뮬 위.
- 수열 ② 충돌은 실제로는 수학이 끝냈다. 4동작 처방은 "안 읽혀서"가 아니라 e₁=e₂ 구조로 깨졌다(같은 문서 `:107-125`, Fable 최종 `:127-133`). 학생 처방(자릿수 갈라 적기)도 "지나간 줄 다시 보기"라 같은 구조. 즉 선생/학생 갈림이 아니라 **둘 다 깨진 칸**이었다.
- **"빈 것 = 0"은 코드에서 참이다 — 단 "0"이 무료는 아니다.** 후보 0개 → `primaryWeaknessId: null`(`features/photo/script/photo-script.ts:507-508`) → 복습 과제 안 만듦(`features/photo/hooks/use-photo-flow.ts:250-252`) → 카드 이름표도 없음(`features/photo/script/note-card-lines.ts:31`, `shown = []`) → 홈 문구 「복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요」(`features/quiz/home-notes-heading.ts:13`). 09.20의 "0"은 E칸 없던 때(`docs/weakness-routine-v2-2026-09-20.md:191-193` "E 없음 → 문제 없음")의 0이다. 1.0.9부터 E가 라이브라 지금의 0 = **내일 올 이유 0**이고, 11.18 관문이 재는 게 바로 그 "내일 옴"이다. 서버 문서가 안 생기니 마이너스는 아니지만, 비우기에도 값이 붙었다.
- 그래서 "안 읽히는데 수학은 듣는" 처방은 0이 아니라 플러스다 — tip 한 줄은 안 읽혀도 이름표·day1 과제·복습 3단계는 그대로 돈다(`features/quiz/hooks/use-review-session-screen.ts:200`이 weaknessId로 단계를 꺼낸다).

**(b)가 더 나은 조건:** 실제 학생 5~8명이 "동작 N개면 안 한다"를 보여줄 때(`target-student.md:131`에 적힌 재개 조건). 그 전엔 (b)는 근거 없는 골격에 수학을 맞추는 것이라 곱셈처럼 "읽히는데 안 듣는" 처방을 양산할 위험(= 마이너스)이 있다.

---

## Q2. 오늘 혼자 돌릴 것 — (B) ③ 견적·설계, 코드 0

**결론 1줄:** (B). ③은 빈 130칸 전부에 한 번에 "내일 올 이유"를 주는 길이고, 10.10로 잡힌 견적을 오늘 당기면 되돌릴 게 없다. (A)는 오늘 최대 1칸(수열×calc_slip)이고 09.10 🔒와 정면 충돌한다.

**근거**
- 11.18에 닿는 양: 통역표는 186칸 중 **56칸** 참(130 빈 칸 — `features/photo/flow/weakness-mistake-type-map.test.ts:109`, 단일 51 + 복수 5 `:145-146`). 10.03 8호 사진도 이름이 안 붙었다(`docs/STATUS.md:18`). ③은 130칸을 한 번에, (A)는 오늘 1칸(수열 calc_slip; 다른 풀이법은 0단계부터 새로).
- (A)의 실제 수확 기대값: 부호는 승인본이 있지만 "다시 쓸 때는 검산을 한 번 더"(`docs/weakness-fill-sequence-calc-slip-2026-09-20.md:87`), 곱셈은 세 번 깨졌고 새 처방(부분곱)은 "검증된 처방이 아니다"(`:131-133`). **둘이 같이 서야 넣을 수 있다** — 부호만 넣으면 후보 1개로 박혀 곱셈 틀린 학생이 부호 이름표를 받는다(`:59-62`, `docs/STATUS-archive.md:500-502`). 말풍선(`d846d45`, archive `:527-539`)은 후보가 2개 이상일 때만 돈다. 즉 곱셈이 또 깨지면 오늘 수확 0칸. 09.20 실적도 8회→0칸(archive `:485-491`).
- 09.10 🔒 "약점 빈칸 채우기는 사람이 온 뒤의 일" — (A)는 정면 충돌, (B)는 무충돌. (저장소 grep에서 이 문장은 못 찾았다 — `grep -rn "사람이 온 뒤" docs/` 0건. 질문의 맥락을 사실로 받았다.)
- 되돌리기 비용: (B)는 문서라 0. (A)는 브랜치면 git으로 되돌릴 수 있지만 기윤 검수(5줄×세트)와 빌드가 붙는다.
- (B)에서 오늘 풀어야 할 설계 자리(코드에서 확인한 것):
  - 서버는 과제 4곳에서 weaknessId를 enum으로 강제한다 — `ActiveReviewTaskSummarySchema:208`, `repeatedWeaknesses:229`, `ReviewTaskSchema:255`, 과제 id에 약점 이름이 들어감 `createTaskId:513-514`(`functions/src/learning-history.ts`). 앱 쪽 `review-scheduler.ts:157`도 같은 id 꼴.
  - 복습 화면은 weaknessId로 `thinkingSteps`를 꺼내고(`use-review-session-screen.ts:200`), 없으면 `NoStepsView`(`features/quiz/components/review-session-screen-view.tsx:180-191`). 이름 없는 노트는 **복습할 콘텐츠 자체가 없다** → ③은 "서버 enum 풀기"가 아니라 **새 복습 화면(노트 자체를 다시 보기 — quote·why·fix·사진, `photo-script.ts:556-572`)**이 본체다. astra 안도 그것(`docs/research/2026-10-04-invite-after-1012-astra-fable.md:67`). 덤: 이름 붙은 `g3_seq_sum_term`도 단계 0개라(`fill 문서:172`) 같은 화면이 구제한다.
  - 갈림길 셋을 문서로: ⑴ `weaknessId` nullable + 새 id 꼴 ⑵ 가짜 약점 id 하나를 enum에 추가(서버 변경 최소, 대신 약점 차트·repeatedWeaknesses 오염) ⑶ 과제 종류(kind) 신설. 서버 배포 순서(enum은 superset이라 옛 앱 무해) 포함.

**(A)가 더 나은 조건:** 기윤이 09.10 🔒를 풀고, ③ 견적이 1.0.12 범위를 넘는 크기로 나올 때(그러면 11.18 전에 day1 과제를 줄 길이 칸 채우기뿐). 또 8호 사진의 칸이 정확히 수열×calc_slip이면 (A) 1칸이 관측된 그 사례를 바로 덮는다 — 어느 칸이었는지는 저장소에서 못 확인했다.

---

## Q3. 규칙 5를 "브랜치까지"로 풀어도 되나 — 조건부 예. 단 전제 두 개가 반만 참이다

**결론 1줄:** 브랜치에 넣는 것까지는 풀어도 된다(젓가락급 — git으로 되돌아간다). 하지만 "다음 빌드 전까지 학생에게 안 간다"는 **설정상 거짓**(OTA 켜져 있음)이고, 서버 enum은 빌드와 따로 돈다. 5줄 확인만으로는 09.19·09.20에 실제로 깨진 자리를 못 본다.

**근거**
- **OTA 구멍:** `expo-updates` 설치(`package.json:71`), `EXUpdatesEnabled true`·`CheckOnLaunch ALWAYS`(`ios/app/Supporting/Expo.plist:5-8`), `updates.url` 설정 + `runtimeVersion.policy: 'appVersion'`(`app.config.js:13-19`), `eas.json:45` production 채널. 즉 `eas update --channel production` 한 번이면 라이브 1.0.11에 JS가 간다. 쓴 기록은 없다 — `grep -rn "eas update" docs package.json` 1건(경고문 `docs/research/2026-08-13-photo-flow-code-survey.md:20`), `git log --all --grep="eas update"` 1건(도입 `bcf67e88`). "안 간다"는 잠금이 아니라 **아무도 안 누른 습관**이다.
- **서버 구멍:** 새 id가 앱에만 있고 서버 `weaknessOrder`(`learning-history.ts:54-120` → zod enum `:194`, `:255`)에 없으면 `saveReviewTasks` 400 → 4xx는 폴백 안 함(`features/learning/firebase-learning-history-api.ts:26-29`) → `use-photo-flow.ts:253` `.catch(console.warn)`으로 **조용히 과제 0**. 순서는 서버 배포 먼저(superset이라 1.0.9 안드·1.0.10 iOS 무해).
- **5줄 확인이 못 보는 것:** 한 세트는 11곳이고(`docs/weakness-round-howto.md:115`), 09.19엔 복습 콘텐츠 누락(`STATUS-archive.md:392-396`), 09.20엔 범위 밖 편집(`practiceMap.ts:445`, archive `:458-466`)이 깨진 자리였다 — 둘 다 5줄 밖. 다만 기윤이 diff를 봐도 수학은 못 잡는다(`math-checker.md:102` "기윤은 수학을 모른다")는 게 이미 적혀 있어, 사람 눈의 값은 원래 "읽히나" 5줄에 있었다.
- 규칙 5의 뜻은 `weakness-author.md:99` "넣을지는 기윤이 정한다" — 타자 금지가 아니라 **결정권**이다. 09.19 `g3_seq_sum_term`도 Claude가 코드에 넣었다(archive `:375-390`). 그래서 "브랜치에 넣고 기윤이 5줄 보고 main 합치기"는 결정권을 안 건드린다.

**풀면 깨지는 것 / 대신 둘 것:** 범위 밖 편집을 잡던 "기윤 diff" 게이트가 사라진다 → `npm run typecheck && npm test` + `functions tsc` + `stage0 --set` 11곳 ✅(`howto:117-120`)를 **브랜치 커밋 전 필수**로, 그리고 기윤에게 5줄 + 검산 「검사 범위」 줄(`math-checker.md:82-88`)을 같이 보여준다. 추가로 "eas update 금지"를 어딘가 명시해야 전제가 참이 된다. 안 풀어야 하는 조건: 자동 검사 3종을 안 돌릴 거면 — 그땐 5줄이 유일한 눈이라 09.20형 거짓 explanation이 그대로 main에 간다.

---

**읽은 파일:** `question.md` · `docs/weakness-routine-v2-2026-09-20.md`(215줄 전체) · `docs/weakness-round-howto.md`(146줄 전체) · `docs/STATUS-archive.md` 371~635 · `docs/STATUS.md` 1~35 · `docs/weakness-fill-sequence-calc-slip-2026-09-20.md`(175줄 전체) · `features/photo/flow/weakness-mistake-type-map.ts`(전체) · `features/photo/flow/weakness-mistake-type-map.test.ts` 95~149 · `.claude/agents/weakness-author.md`·`math-checker.md`·`target-student.md`(전체) · `functions/src/learning-history.ts` 50~124, 190~269, 505~604 · `features/photo/hooks/use-photo-flow.ts` 85~104, 205~277 · `features/photo/script/photo-script.ts` 490~574 · `features/photo/script/note-card-lines.ts` 25~45 · `features/learning/review-scheduler.ts` 60~169 · `features/learning/remote-review-task-store.ts`(전체) · `features/learning/firebase-learning-history-api.ts` 17~29 · `features/quiz/hooks/use-review-session-screen.ts` 190~215 · `features/quiz/components/review-session-screen-view.tsx` 172~192 · `app.config.js` 1~40 · `ios/app/Supporting/Expo.plist` · `data/review-content-map.ts` 2361~2371 · `docs/research/2026-10-04-invite-after-1012-astra-fable.md`(③ 줄만 grep) · grep만: `package.json`·`eas.json`·`features/quiz/home-notes-heading.ts`·`features/photo/types.ts`·`data/diagnosisTree.ts`.
