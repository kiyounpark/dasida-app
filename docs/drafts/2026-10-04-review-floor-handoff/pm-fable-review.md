# Fable 리뷰 — 2026.10.04 오후 (Agent 툴 · model fable)

질문 전문은 `pm-review-prompt.md`. 1차 351,216 토큰(도구 52회·13분) · 2차(astra 답 전문 + 「네 안을 방어하지 마라」) 누적 371,776.
아래는 두 보고 원문(들여쓰기만 걷음).

---

## 1차

## 리뷰 결과 — `docs/research/2026-10-04-review-floor-design.md`

문서가 단 `파일:줄`은 전부 직접 열어 대조했고 틀린 인용은 없었다(`types.ts:73-120`은 실제 126까지, `photo-store-contract.ts:124-141`은 123~140 — 한두 줄 차이뿐).

### 반드시 고칠 것

1. **갈림길 ②의 (다) 「과제 종류 칸 신설」은 이미 있는 칸을 다시 만드는 것.** `source: 'photo'`가 앱·서버 양쪽에 있고(`features/learning/history-types.ts:2` · `functions/src/learning-history.ts:18`) 🔒 09.23 「앱·서버 양쪽에」로 잠겨 있다(`docs/STATUS.md:63`). 노트 과제 = `source === 'photo' && weaknessId === null`로 가를 수 있어 `kind` 칸이 필요 없다. ㄴ으로 가도 `source:'photo'` 전부를 노트 화면 → `weaknessId` 있으면 3단계 잇기로 표현된다. 표의 (다) 열은 「(가)와 같음」으로 접거나 지울 것.
2. **(나) 열 「반복 약점에 「노트」 약점이 생김」은 틀렸다.** `repeatedWeaknesses`는 과제가 아니라 `attemptResults.finalWeaknessId`로 센다(`learning-history.ts:647-707`, `:663-666`). 문서 자신이 「노트 복습은 `recordAttempt` 안 부름」으로 뒀으니 결과가 안 쌓여 오염되지 않는다. 오염되는 건 약점 차트(`home-state.ts:191-287`, 과제 목록에서 만듦)뿐.
3. **⑵에서 `concept`(rule·violation)을 빼놓았다.** 같은 `ErrorCandidate`에 실려 오고(`features/photo/types.ts:32`) 「왜 틀린 건지 아직 모르겠어」 학생에게만 보여준다(`photo-script.ts:375-378`). ⑵와 같은 이유로 지금 안 저장하면 영영 없다(원장은 요약만 `photo-analysis-run-log.ts:83-90` · 서버 노트 create 한 번 `photo-store-contract.ts:142`). 08.02 「재료가 어제 저장돼 있다」의 재료다. 칸 하나 더, 비용 0에 가깝다.
4. **「옛 노트 소급 안 함」은 Claude가 정할 크기가 아니다 — 기윤에게 올릴 것.** 10.03 오르비 글로 온 학생의 노트(1.0.11 이전)가 바로 10.12·11.18 판정 대상인데, 이 결정이면 그 학생은 1.0.12를 받아도 복습 0. 「날짜 지난 노트를 '어제'로 못 부른다」는 인사 문구 문제지 구조 문제가 아니다. `docs/how-we-decide.md:53` 기준 1(학생 화면이 바뀜).
5. **견적에서 빠진 것 넷.** ① 서버 테스트 4파일(`functions/tests/learning-history-review-tasks.test.ts`·`save-review-tasks`·`learning-history-weakness-practice`·`learning-history-import-ops` — `weaknessId` 언급 9·3·10·1), 앱 `use-review-session-screen.test.ts`(40회)와 짝이 되는 새 훅 테스트. ② 대본이 웹과 공용(`photo-script.ts:2-3`, `package.json:24-26` `build:proto`가 번들) → ⑵가 `NoteView`(`script-io.ts:17-34`)를 바꾸면 `verify:proto`의 `jest features/photo/script`가 같이 바뀐다(웹 배포는 불필요). ③ functions 배포 + 실계정 한 바퀴(09.24 E 선례 `docs/PROGRESS.md:4480`). ④ 리뷰 1세션은 10.03 선례(astra 7판·Fable 5갈래, `STATUS.md:18`)보다 작다. 코드 4~5 + 넷이면 6~8세션(짐작). 대사 검수는 세션이 아니라 기윤 시간이 병목.

### 갈림길 답

**① ㄱ — 단, 08.02 🔒가 살아 있으면 ㄱ/ㄴ은 갈림길이 아니라 ㄴ이 이미 정해진 답.** 저장소에서 08.02를 푼 기록은 나도 못 찾았다(`docs/` grep 「복습 설계」「노트 다시」「어제 그 문항」「재진」 → 설계 문서를 가리키는 `STATUS.md:17`뿐 · `PROGRESS.md` 08.02 커밋 셋은 통역표·fix 두 칸). E칸 커밋 `9c4181a` 본문과 `PROGRESS.md:4480`은 「Claude 초안 → Fable 검수」만 적고 08.02 언급 없음. `2026-08-13-photo-flow-code-survey.md:32-34`가 사진 노트도 약점 화면을 쓴다고 처음 적은 자리인데 Claude 조사지 기윤 🔒가 아니다. → 기윤에게 올릴 질문은 「ㄱ이냐 ㄴ이냐」가 아니라 **「08.02를 유지하나」** 한 줄. 열어도 된다면 ㄱ: 11.18 관문은 「다른 날 두 번째 **사진** 3명」(3월 말 아티팩트 맨 위)이라 복습 모양이 아니라 "다음 날 돌아오게 하는 것"이 움직이고, 이름 안 붙는 노트가 다수(130/186 `weakness-mistake-type-map.test.ts:109`, 8호도 이름 없음 `STATUS.md:20`)라 ㄱ만으로 대부분 덮인다. ㄱ은 노트 다시 보기 vs 3단계 깔때기를 나란히 재는 덤. 화면을 조각 목록으로 지으면 ㄴ은 스위치 하나.

**② (가) `weaknessId` nullable + 기존 `source:'photo'`를 종류 칸으로.** (다)는 1번대로 중복. (나)는 가짜 id가 `weaknessOrder`를 도는 테스트 셋(`data/review-content-map.test.ts:7·23`, `weakness-removal-safety.test.ts:15`, `review-remedial-flows.test.ts`)에 걸리고 진단·연습에 섞이며 문자열은 못 되돌린다. (가)는 스키마 2곳(`learning-history.ts:206-213`·`:252-263`) + `:752` 한 줄, Firestore는 null을 그대로 둔다(`firestore-sanitize.ts:4-17`은 undefined만 제거) → `.nullable()`만으로 읽기가 안 깨진다. 앱은 `WeaknessId | null`로 바꾸면 tsc가 과제 약점을 읽는 12파일쯤을 잡는다(직접 셈: `history-insights`·`home-state`·`local-learning-history-repository`·`review-scheduler`·`home-review-list`·`no-review-day-card`·`review-home-card`·`review-session-screen-view`·`weakness-progress-item`·`use-review-session-screen`·`review-notification-scheduler`·`current-learner-controller:794`). 과제 id `{노트id}__note__{단계}`. 이관·계정 삭제는 손댈 게 없다 — 이관은 같은 `ReviewTaskSchema`(`:390`), 삭제는 `recursiveDelete`라 파싱 없음(`delete-account.ts:63-64`).

### 권고

- 「옛 앱이 안 죽는다」는 짐작→코드 확인으로 올려도 됨: `resolveWeaknessLabel(null)` → 「알 수 없음」(`diagnosisMap.ts:588`), `getReviewThinkingSteps(null)` → `[]`(`review-content-map.ts:2370`), `getReviewHeroPrompt` 기본 문구(`:2363-2365`), 안내 화면은 홈 버튼뿐(`no-steps-view.tsx:31-36`) → 과제 영영 미완. 실행은 안 함.
- 함정 1에 「시도 저장 전부」 추가: 서버를 되돌리면 `recordLearningAttempt:1031-1043`이 쓰기 전에 과제 전부를 파싱 → 그 계정의 기출 진단·이름 붙은 복습 저장까지 500.
- 함정 2(`:752`)는 노트 과제가 끝난 **다음** `recordAttempt`에서 터진다 — 테스트는 「완료된 null 과제 + 다음 시도」 모양으로. 이관 뒤 `buildSummary:1259`도 같은 줄.
- 길 그대로 두기 구현 주의: `app/quiz/review-session.tsx:9`가 `useReviewSessionScreen`을 무조건 부르고 로드 즉시 `review_started`·단계 선택(`use-review-session-screen.ts:199-200`) → 종류 로더가 훅 앞에 있어야 이벤트가 두 번 안 찍힌다. 체인은 이미 null을 받는다(`bridge-view.tsx:64-67`, `labelFor(null)` `:656-657`); `done-view.tsx`(day30)만 노트용 문구 필요.
- 「반복 복습 학생」은 `recordAttempt` 없이 셀 수 있다 — 아티팩트 정의 「사진에서 생긴 복습을 서로 다른 날 2번 이상 끝낸 학생」, 방법 미지정. `completeReviewTask:54`의 `completedAt`이 `saveAll`로 서버에 가니 `source:'photo'` + 날짜로. 잃는 건 쪽지 맞힘 여부의 서버 기록(PostHog `review_completed`에만, `event-types.ts:60-63`).
- 새 기기에서 받은 노트의 문제 칸은 다시 검사: `toLocalNote`는 통째로 넘기고(`photo-store-contract.ts:186-192`) `isRemoteNoteDoc`은 문제 칸을 안 본다(`remote-note-store.ts:37-48`) → `quiz-guard.ts:18-27` 같은 범위 검사 뒤 표시.
- ⑷ 작은 구멍: 웹 학생은 원장에만 남는데 원장엔 `mistakeType` 없음(`photo-analysis-run-log.ts:83-90`). 짚기는 늘 첫 후보(`photo-script.ts:325-326` idx 0) → `errorCandidates[0].mistakeType` 한 칸. 🔒 10.01 「문은 앱」이라 젓가락급.
- 1.0.12 범위(⑴⑵+서버 / ⑶⑷ 제외)와 「⑶⑷ 미뤄도 값이 같다」는 코드로 맞다 — `quote·why·fix`·`methodId·mistakeType`가 폰(`types.ts:86-88·95-96`)·서버(`save-photo-note.ts:49-51·54-55`) 둘 다 저장. 인수인계의 「⑶⑷ 예약급」 정정이 옳다.

### 읽은 파일 목록
`docs/research/2026-10-04-review-floor-design.md` · `docs/drafts/2026-10-04-review-floor-handoff/README.md` · `docs/STATUS.md`(221줄 전부) · `docs/how-we-decide.md` · `docs/research/2026-08-13-photo-flow-code-survey.md:25-40` · `docs/research/2026-10-04-invite-after-1012-astra-fable.md`(grep) · `docs/PROGRESS.md`(08.02 커밋·`:4480`) · 아티팩트 「다시다 3월 말 계획」 · `features/photo/hooks/use-photo-flow.ts` · `features/photo/script/photo-script.ts` · `script-io.ts:17-34` · `features/photo/types.ts` · `flow/quiz-guard.ts` · `flow/weakness-mistake-type-map.test.ts:100-150` · `note-store.ts:20-35` · `cloud/save-note-remote.ts` · `cloud/remote-note-store.ts` · `features/learning/review-scheduler.ts` · `review-stage.ts` · `review-chain.ts` · `types.ts` · `history-types.ts` · `review-task-store.ts` · `review-task-store-router.ts` · `remote-review-task-store.ts` · `firebase-learning-history-api.ts:10-35` · `home-state.ts:150-321` · `local-learning-history-repository.ts:210-262` · `learning-history-migration-service.ts` · `features/learner/types.ts` · `provider.tsx`(grep) · `features/history/history-insights.ts:60-139` · `features/quiz/hooks/use-review-session-screen.ts` · `use-quiz-hub-screen.ts:95-202` · `home-notes-heading.ts` · `components/review-session-screen-view.tsx:1-60·170-200` · `review-session/no-steps-view.tsx` · `bridge-view.tsx`(grep) · `home-review-list.tsx:45-60` · `no-review-day-card.tsx:55-66` · `notifications/notification-route.ts` · `review-notification-scheduler.ts:70-95` · `features/analytics/event-types.ts` · `log-event.ts`(grep) · `app/quiz/review-session.tsx` · `app.config.js:10-16` · `package.json:24-26` · `data/diagnosisMap.ts:583-595` · `data/review-content-map.ts:2361-2371` · `review-content-map.test.ts`(grep) · `weakness-removal-safety.test.ts:1-40` · `functions/src/learning-history.ts`(1276줄 전부) · `learning-history-import-ops.ts:95-135` · `save-photo-note.ts` · `photo-store-contract.ts:100-200` · `photo-analysis-run-log.ts:75-95` · `send-review-reminders.ts` · `review-reminder-core.ts:112-140` · `review-reminder-copy.ts` · `delete-account.ts:20-70` · `firestore-sanitize.ts` · `openai-client.ts:350-432` · `analyze-photo-core.ts:115-162` · `functions/tests/`(목록·weaknessId 건수).

---

## 2차 — astra 답 읽고 다시 정함

**1. 갈림길 ② 최종: (가) 그대로 — 단 1차의 「`source:'photo'`가 곧 종류」는 정정한다.** 사진 복습에서 틀려 생기는 약점 과제도 `source:'photo'`·`sourceId`=노트 id다(`use-review-session-screen.ts:637-644`) → 종류는 `source` 하나가 아니라 **(source, weaknessId) 쌍**으로 읽는다: photo+null = 노트 과제, photo+X = 약점 과제. astra 근거를 보는 눈:
- 「nullable만으론 종류를 못 표현한다」 — ㄱ에선 표현된다(null이 종류). ㄴ으로 바꾸는 날 `kind` 칸을 붙여도 **옛 과제 전부의 기본값을 (source, weaknessId)에서 유도**할 수 있어 데이터 이동이 0이다. 유도 가능한 칸은 예약급이 아니다 — 지금 만들 이유가 없다.
- 「옛 데이터 기본값·로컬 정규화·요약·import」 — (다)에 더 걸린다. (가)는 이미 모든 손 베끼기 자리가 나르는 `weaknessId`의 타입만 바꾸니 import(`learning-history.ts:390` 같은 스키마)·요약(`:206-213` nullable)·로컬(검사 없음 `review-task-store.ts:25`)이 그대로 지나가고, 옛 데이터 기본값 문제 자체가 없다. (다)는 새 칸이라 서버 `toReviewTaskSummary:525-534`·`createReviewTask:570-589`·`areReviewTasksEqual:592-605`, 앱 `completeReviewTask:71-81`·`spawnMistakeReviewTasks:157-168`·`local-learning-history-snapshot-store.ts:202` 전부가 알아야 하고, zod가 비strict라 한 곳만 빠지면 kind가 **소리 없이 사라져** day3부터 3단계 화면으로 떨어진다(문서 함정 4 그대로). tsc가 못 잡는 실패 모양이다.
- 「가짜 약점이 콘텐츠 검사에 끼어든다(`review-content-map.test.ts:158`)」 — (나) 반대 근거, 동의. (가)와 무관.
- astra에서 받는 것 하나: 종류를 가르는 함수 하나(`reviewTaskKind(task)` 꼴)를 앱·서버 공용 자리에 두고 화면·집계·알림이 전부 그걸 쓴다. 나중에 kind 칸이 생겨도 그 함수만 바뀐다.

**2. 갈림길 ①: ㄱ 그대로 + 「08.02를 유지하나」는 기윤에게 — astra와 같다.**

**3. astra 반드시 고칠 것 1~7 중 동의 안 하는 것: 1번만, 그것도 '반드시'가 아니라 '권고'로 내린다.** 「`recordAttempt`엔 재전송 큐가 있어 완료가 보호된다」가 틀렸다 — 큐가 다시 보낼 때 서버는 `replay: true`로 과제를 일절 안 건드린다(`learning-history.ts:927-929` · 앱 `firebase-learning-history-repository.ts:165`). 그래서 이름 붙은 복습도 완료는 `saveAll` 한 번(망·5xx 재시도 1회 `firebase-learning-history-api.ts:85`)에 걸려 있고, 노트 복습이 더 약해지는 게 아니라 **같다.** 유실 위험은 기존 버그지 B 설계가 새로 만드는 구멍이 아니다 → 1.0.12 밖 별건(「미러가 서버보다 새로우면 다시 보내기」). 「최근 활동 즉시 갱신 안 됨」도 지금 앱 완료 과제와 같다(`saveReviewTasks:1146-1165`는 요약을 안 다시 만든다). 나머지 2·3·4·5·6·7 **동의.** 덧 둘: 3은 실제 학생이 전부 로그인 벽 뒤라(`PROGRESS.md:4480`) 지금은 개발용 게스트 길 — 그래도 설계에 「게스트는 노트 과제 안 만듦」 한 줄은 적어야 한다. 6의 셋째는 내 1차도 틀렸다 — `:665`가 `weakness-practice` 결과를 빼서 복습은 원래 반복 약점에 안 들어간다, 잃는 건 `reviewAccuracyByStage`(`home-state.ts:236-249`)와 응답 이력뿐.

**4. 견적 최종: 6~8세션(코드 4~5 + 테스트·functions 배포·실계정 한 바퀴·리뷰 2~3) + 대사 검수는 기윤 시간으로 별도.** astra의 추가 항목을 넣어도 같은 띠다 — 저장 실패 대비(1번)는 별건으로 뺀 숫자.

덧(한 줄): astra 권고 「⑶은 미뤄도 재료만 남지 값이 같진 않다(나중엔 노트당 글-only 호출 1 + 별도 저장소, 노트 본문은 409라 못 고침)」에 동의 — 문서의 「값이 같다」는 「재료는 남는다」로 고치는 게 맞다. 예약급 판정은 안 바뀐다.
