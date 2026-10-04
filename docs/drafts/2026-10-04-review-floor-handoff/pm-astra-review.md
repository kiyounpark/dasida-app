# astra 리뷰 — 2026.10.04 오후 (codex exec · gpt-6-astra · 133,609 토큰)

질문 전문은 `pm-review-prompt.md`. 아래는 codex 출력 원문 그대로.

---

**반드시 고칠 것**

1. **`recordAttempt`를 빼려면 완료 기록의 대체 저장 경로가 필요하다.** 지금 과제 저장은 통신 실패 때 로컬에만 남기고, 다음 서버 조회가 그 로컬을 덮는다. 노트 복습 완료·다음 예약이 유실될 수 있다. 기존 `recordAttempt`에는 재전송 큐가 있다. 또한 과제만 저장하면 기존 요약의 최근 활동은 즉시 갱신되지 않는다. **완료·취소·문제 응답을 구분해 재전송 가능한 기록으로 남기는 설계**가 빠졌다.  
   근거: [remote-review-task-store.ts:58](/Users/baggiyun/dev/dasida-app/features/learning/remote-review-task-store.ts:58), [:84](/Users/baggiyun/dev/dasida-app/features/learning/remote-review-task-store.ts:84), [firebase-learning-history-repository.ts:113](/Users/baggiyun/dev/dasida-app/features/learning/firebase-learning-history-repository.ts:113), [learning-history.ts:1094](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:1094), [:1146](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:1146).

2. **“노트 못 찾으면 끝내기”는 정상 완료와 분리해야 한다.** 서버 조회 실패와 실제 없음은 다르다. 현재 `loadRemotePhotoNotes`는 오류를 삼키고 별도 콜백으로 알린다. 여기서 `completeReviewTask`를 부르면 **없는 노트의 다음 과제가 또 생기고**, 복습하지 않았는데 완료 집계에 들어간다. 재시도·돌아가기와 영구 취소를 구분해야 한다. 사진만 없고 글이 있는 경우도 별도다.  
   근거: [remote-note-store.ts:149](/Users/baggiyun/dev/dasida-app/features/photo/cloud/remote-note-store.ts:149), [:196](/Users/baggiyun/dev/dasida-app/features/photo/cloud/remote-note-store.ts:196), [review-scheduler.ts:54](/Users/baggiyun/dev/dasida-app/features/learning/review-scheduler.ts:54), [판정표:958](/Users/baggiyun/dev/dasida-app/docs/research/2026-09-23-marketing-pricing-deadline-astra-fable.md:958).

3. **게스트→로그인 이관에 노트가 빠져 있다.** 현재 import는 과제는 옮기지만 사진 노트는 보내지 않는다. 과제의 계정만 바뀌고, 노트는 이전 계정 저장소에 남아 B가 원본을 못 찾는다. 게스트 지원 여부와 노트·사진 이관을 명시해야 한다. `kind`도 서버뿐 아니라 **로컬 요약 변환**에서 보존해야 한다.  
   근거: [learning-history-migration-service.ts:333](/Users/baggiyun/dev/dasida-app/features/learning/learning-history-migration-service.ts:333), [local-learning-history-snapshot-store.ts:202](/Users/baggiyun/dev/dasida-app/features/learning/local-learning-history-snapshot-store.ts:202), [note-store.ts:22](/Users/baggiyun/dev/dasida-app/features/photo/note-store.ts:22), [local-learning-history-repository.ts:63](/Users/baggiyun/dev/dasida-app/features/learning/local-learning-history-repository.ts:63).

4. **연체 규칙 설명은 최신 잠금과 충돌한다.** 이미 “단계·날짜 유지, 지금 하기”로 정했다. 문서처럼 기존 강등을 그대로 적용하면 안 된다. 기존 구현은 단계만 내리고 id는 유지해서, 내려간 단계 완료 후 만들 다음 id가 자기 자신과 겹쳐 예약이 끊길 수도 있다.  
   근거: [STATUS.md:16](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:16), [review-scheduler.ts:102](/Users/baggiyun/dev/dasida-app/features/learning/review-scheduler.ts:102), [:66](/Users/baggiyun/dev/dasida-app/features/learning/review-scheduler.ts:66).

5. **“서버 먼저면 옛 앱 무해”, “과제 삭제로 롤백”은 불충분하다.** 서버 계약 확대 자체와 새 과제 생성은 분리해야 한다. 새 과제가 쌓인 계정의 옛 앱은 완료할 수 없는 화면을 받는다. 서버를 되돌릴 때는 과제 외에 **저장된 요약과 기기 미러**도 고려해야 한다. 요약 역시 엄격 검사하며, 로컬 과제는 검사 없이 읽는다. 호환 서버 유지·옛 앱 처리·생성 중단 순서를 정해야 한다.  
   근거: [review-session-screen-view.tsx:182](/Users/baggiyun/dev/dasida-app/features/quiz/components/review-session-screen-view.tsx:182), [learning-history.ts:1089](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:1089), [review-task-store.ts:25](/Users/baggiyun/dev/dasida-app/features/learning/review-task-store.ts:25). OTA도 앱 버전별 runtime이므로 옛 버전에 자동으로 해결책이 닿는다고 볼 수 없다([app.config.js:17](/Users/baggiyun/dev/dasida-app/app.config.js:17)).

6. **서버 비교표의 자동 해결 주장을 고쳐야 한다.**
   - `kind`만 추가해도 뭉침이 사라지지 않는다. 노트 과제는 `sourceId` 등으로 묶기 기준을 실제로 바꿔야 한다([home-state.ts:216](/Users/baggiyun/dev/dasida-app/features/learning/home-state.ts:216)).
   - 가짜 id에 이름표까지 추가하면 `subtitle`이 반드시 undefined가 되는 것은 아니다([learning-history.ts:752](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:752)).
   - `repeatedWeaknesses`는 기존 약점 복습도 제외한다. “`recordAttempt`를 안 불러서 반복 약점에서 빠진다”는 설명은 틀렸다. 잃는 것은 복습 정답률·응답 이력이다([learning-history.ts:665](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:665), [home-state.ts:238](/Users/baggiyun/dev/dasida-app/features/learning/home-state.ts:238)).
   - `history-insights`는 모든 과제를 한 줄로 합치는 코드가 아니라, 다음 과제를 추가할 때 약점 중복을 검사한다([history-insights.ts:94](/Users/baggiyun/dev/dasida-app/features/history/history-insights.ts:94)).

7. **⑵는 저장 계약·웹 회귀까지 범위에 넣어야 한다.** “화면에 나간 문제만”은 검산 흐름과 맞다. 다만 **재도전 ‘넘어갈래’도 이미 노출된 문제이므로 저장**, 늦게 검산이 끝났지만 안 보여준 문제는 제외해야 한다. `PhotoQuiz` 타입 외에 서버의 보기·정답 범위 검사와 로컬 읽기 검사가 필요하다. 새 중첩 객체는 기존 JSON 비교가 최상위 키만 정렬한다는 점도 검증해야 한다. 웹도 같은 대본을 번들하므로 “해당 없음”은 저장에만 맞고 회귀검증에는 틀리다.  
   근거: [photo-script.ts:418](/Users/baggiyun/dev/dasida-app/features/photo/script/photo-script.ts:418), [:469](/Users/baggiyun/dev/dasida-app/features/photo/script/photo-script.ts:469), [:485](/Users/baggiyun/dev/dasida-app/features/photo/script/photo-script.ts:485), [quiz-verify-runner.ts:83](/Users/baggiyun/dev/dasida-app/features/photo/script/quiz-verify-runner.ts:83), [photo-store-contract.ts:199](/Users/baggiyun/dev/dasida-app/functions/src/photo-store-contract.ts:199), [web-proto/flow-entry.ts:15](/Users/baggiyun/dev/dasida-app/web-proto/flow-entry.ts:15). `toLocalNote`의 실제 위치도 `remote-note-store.ts`가 아니라 [photo-store-contract.ts:186](/Users/baggiyun/dev/dasida-app/functions/src/photo-store-contract.ts:186)이다.

**갈림길 답**

- **① ㄱ — 이번 출시는 이름 없는 노트부터.** 현재 복습이 없는 학생에게 돌아올 이유를 만드는 데 집중한다. 이름 붙은 학생에게 필수 복습을 더 길게 붙이는 것이 두 번째 사진을 늘린다는 근거는 없다(**효과 판단은 짐작**). 관문은 복습 길이가 아니라 다른 날 사진 재사용이다([판정 문서:1062](/Users/baggiyun/dev/dasida-app/docs/research/2026-09-23-marketing-pricing-deadline-astra-fable.md:1062)). 단, 모든 사진 복습에 적용한다는 08.02 인용과의 예외는 기윤에게 명시해야 한다.
- **② 다 — 종류로 구분하고 약점은 필요한 종류에만 필수.** 이름 유무와 복습 종류를 분리해야 이후 이름 붙은 노트도 B로 열 수 있다. 옛 데이터의 종류 기본값·로컬 정규화·요약·import까지 함께 정한다. 가짜 약점은 콘텐츠 완비 검사에도 끼어든다([review-content-map.test.ts:158](/Users/baggiyun/dev/dasida-app/data/review-content-map.test.ts:158)); nullable만으로는 복습 종류를 표현하지 못한다.

**권고**

- **예약급 판정은 오후 문서가 대체로 맞다. 다만 “나중에도 값이 같다”는 과장이다.** ⑷의 노트 발생 건수는 저장된 칸으로 소급 가능하다. ⑶도 재료는 남지만 별도 AI 호출·저장 장소가 필요하고, 기존 노트 본문 수정은 충돌로 거절된다. 미뤄도 원재료가 안 사라지는 것과 비용이 같은 것은 다르다. **지금 잃을 수 있는 추가 재료는 B의 복습 응답·실제 완료 기록**이다([PhotoNote:86](/Users/baggiyun/dev/dasida-app/features/photo/types.ts:86), [:95](/Users/baggiyun/dev/dasida-app/features/photo/types.ts:95), [save-photo-note.ts:102](/Users/baggiyun/dev/dasida-app/functions/src/save-photo-note.ts:102)).

- **08.02를 명시적으로 해제한 기록은 찾지 못했다. 그러나 “08.13에 E가 바뀌었다”는 연혁은 고쳐야 한다.** 그 문서는 기존 화면 실측이며, E 구현·실기 확인은 이후 기록에 있다. 이름 노출도 최근 기윤 문구 결정이 있다. 따라서 “08.02 그대로 복원”보다 **현재 결정과 충돌하는 부분 재확인**이 정확하다. 특히 ㄴ에서 기존 A 화면으로 넘기면 AI·텍스트 입력 경로까지 따라온다([08.13 조사:32](/Users/baggiyun/dev/dasida-app/docs/research/2026-08-13-photo-flow-code-survey.md:32), [STATUS-archive.md:196](/Users/baggiyun/dev/dasida-app/docs/STATUS-archive.md:196), [no-review-day-card.tsx:54](/Users/baggiyun/dev/dasida-app/features/quiz/components/no-review-day-card.tsx:54), [use-review-session-screen.ts:499](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-review-session-screen.ts:499)).

- **화면 완료 조건을 더 써야 한다.** B↔A 체인 전환 때 상태 초기화, 중복 완료 방지, day30 졸업 뒤 남은 과제 이어가기, 오답·모르겠음에도 다음 단계로 올릴지 명시한다. “어제”는 노트 작성일 기준으로 바꾼다. 홈 첫 카드도 수정 대상이다([use-review-session-screen.ts:557](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-review-session-screen.ts:557), [:707](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-review-session-screen.ts:707), [review-home-card.tsx:57](/Users/baggiyun/dev/dasida-app/features/quiz/components/review-home-card.tsx:57)).

- **알림은 ‘종류 추가에 따른 수정 불필요’로 좁혀 쓰자.** 서버·로컬 모두 오늘 날짜 과제만 골라 연체 알림은 빠진다. 게스트 로컬 예약도 오늘 과제만 대상으로 한다. 알림 허락 작업과 연결해서 확인해야 한다([send-review-reminders.ts:52](/Users/baggiyun/dev/dasida-app/functions/src/send-review-reminders.ts:52), [review-notification-scheduler.ts:40](/Users/baggiyun/dev/dasida-app/features/quiz/notifications/review-notification-scheduler.ts:40)).

- **견적은 낙관적 짐작이다.** 표 자체 합도 `0.5 + (0.5~1) + (2~3) + 1 = 4~5.5세션`, 대사 검수는 별도다([설계:168](/Users/baggiyun/dev/dasida-app/docs/research/2026-10-04-review-floor-design.md:168)). 리뷰·시뮬레이터는 이미 들어 있다. 빠진 것은 저장 실패·이관·옛 앱·혼합 체인·서버 계약·웹 번들·OTA 배포/복구 검증이다. **⑴⑵+서버, ⑶⑷ 제외 범위에는 동의하되 완료 기록 보존도 포함**해야 한다.

- **기윤에게 올릴 것:** 차트·응답 기록을 남기지 않는 결정, 노트 없음의 취소 화면, 옛 노트 소급 제외. 학생 경험과 복구 가능성을 바꾼다. “검산 통과 후 실제 노출본 저장”과 기존 경로 안 분기는 구현 판단으로 충분하다. 기준: [how-we-decide.md:53](/Users/baggiyun/dev/dasida-app/docs/how-we-decide.md:53).

**읽은 파일 목록:** 위에 직접 인용한 파일 전부, 설계·인수인계 README 전체, `docs/AI_COLLABORATION.md`, `features/learning/{review-chain.ts,review-stage.ts,review-task-store-router.ts,remote-review-task-store.test.ts,local-learning-history-storage.ts}`, `features/photo/{flow/quiz-guard.ts,flow/weakness-mistake-type-map.test.ts,cloud/save-note-remote.ts,hooks/use-photo-flow.ts}`, `features/quiz/{hooks/use-quiz-hub-screen.ts,home-notes-heading.ts,components/home-review-list.tsx}`, `features/analytics/event-types.ts`, `functions/src/{learning-history-import-ops.ts,photo-analysis-run-log.ts,delete-account.ts}`, `data/{diagnosisMap.ts,review-content-map.ts}`, `package.json`, `web-proto/app.js` — 수정·테스트 실행 없음.
