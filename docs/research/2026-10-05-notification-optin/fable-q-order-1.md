# Fable 1차 답 — q-order.md (2026-10-05 밤, 217,440토큰)

**Q0 — 가(그대로): ② 작게 넣고 1.0.12 빌드 → 두 스토어 → 초대, ⑴은 그 뒤.** 단, ②가 닿는 범위를 🔒 줄에 덧붙이고, 10.12 판정 재료(이름 붙는 비율)를 코드 0으로 먼저 센다.
- 이유 1: 관문(다른 날 두 번째 사진)은 들어오는 학생이 0이면 ⑴이 있어도 0이다. 영상→웹 0명, 오르비 글은 10.07 판정 전(STATUS:17·26). ⑴을 먼저 하면 초대가 그만큼 늦고 ⑴의 값은 학생이 와야 생긴다.
- 이유 2: ②는 ⑴이 와도 필요한 조각이다 — ⑴만으론 앱을 여는 학생만 받는다(`docs/research/2026-10-04-review-floor-design.md:76`). 아래 Q1 자리면 훅·카드 재사용이라 파일 2~3개(짐작). ⑴은 2~3세션 + 기윤 대사 검수(같은 문서 :78·:178) + 리뷰·배포.
- 이유 3: 미룰수록 비싼 둘((가)·⑵)은 10.05에 끝났고(STATUS:19·22), ⑴ 화면은 예약급 「아니오」(design:188).
- 대가(안 뺀다): 1.0.12에서 ②로 실제 알림을 받는 학생은 **이름 붙은 노트 학생뿐**이다 — 과제는 `primaryWeaknessId` 있을 때만(`features/photo/hooks/use-photo-flow.ts:256`), 알림은 과제가 있어야(`functions/src/send-review-reminders.ts:52-57`). 이름 없는 학생은 다음 날 「복습 날짜는 안 잡혔어요」(`features/quiz/home-notes-heading.ts:13`)만 보고 알림 0. 비율은 모른다 — 코드상 186칸 중 56칸(`features/photo/flow/weakness-mistake-type-map.test.ts:109` 빈칸 130 · `:145-146` 51+5), 실제 표본 3장 중 1장 붙음(STATUS:27·54·212). 10.05 결정문 대가 줄(`2026-10-05-invite-before-review-floor-astra-fable.md:11`)엔 「안 잡혔어요를 본다」까지만 있고 ②가 거기 안 닿는다는 말은 없다.
- 대가 2: 1.0.12~⑴ 사이 이름 없는 노트는 ⑴이 와도 과제가 저절로 안 생긴다(과제는 노트 뜰 때만 만든다 `use-photo-flow.ts:254-260`) → 갈림길 ③ 소급(design:82) 대상이 는다. 재료(⑵·서버 노트)는 남아 소급은 된다.
- 바뀌는 조건: 10.12에 첫 사진 학생은 있는데 다른 날 두 번째 0 + 그 노트들이 전부 이름 없음 → ⑴을 다음 빌드로(10.05 문서 :12와 같음). 비율은 지금도 셀 수 있다 — PostHog `photo_weakness_labeled.labeled`(08.27부터, 한 번도 안 열어 봄 design:129·199) 또는 서버 `users/*/photoNotes`의 `primaryWeaknessId` null 비율(콘솔). ② 세션 첫 10분에 한 번 열어 보길 권한다.

**Q1 — 홈 「내일 복습」 카드가 처음 뜰 때, 그 카드 밑에 기존 `NotificationOptInCard`(우리 안내 → 「알림 켜기」 누르면 시스템 창).** Q0이 가든 나든 자리는 같다 — 가면 이름 붙은 학생만, 나면 과제 있는 전원.
- 왜 거기: 그 카드는 과제가 **저장된 뒤에만** 뜬다(`features/quiz/hooks/use-quiz-hub-screen.ts:272-273` resting+nextTask · `features/quiz/components/no-review-day-card.tsx:55`). 노트 직후에 물으면 과제 0인 이름 없는 노트에도 묻게 되고, iOS는 한 번 거절이면 끝 — 보낼 알림이 없는 학생에게 그 한 번을 쓰면 안 된다. 「과제 생긴 직후」는 `spawnMistakeReviewTasks`를 기다리지 않고 던져서(`use-photo-flow.ts:257-259`) 서버 거절(4xx → 과제 0, design:162)을 모른 채 묻게 된다. 온보딩은 과제도 없이 묻는 자리라 같은 이유로 안 된다. ⓪ 뒤로 학생은 「< 홈」으로 바로 홈에 오니(STATUS:23) 시간 차도 거의 없다.
- 재사용: `useNotificationOptIn`에 `hasWeaknesses: showNoReviewDayCard && nextTask.source==='photo'`를 주면 된다 — 이미 허락된 학생은 자동 토큰 등록(`features/quiz/hooks/use-notification-opt-in.ts:103-110`), 거절은 숨김. **허락만으론 안 된다**: 인증 학생은 홈이 로컬 예약을 취소하고 서버 푸시만 쓰는데(`use-quiz-hub-screen.ts:103-105`), 토큰 등록은 이 훅의 `activateForAuthenticated`뿐(`use-notification-opt-in.ts:36-55`) — 어디서 묻든 이 훅을 거쳐야 한다.
- 우리 안내 뒤에 띄운다 — 지금 결과 화면과 같은 꼴(`features/quiz/components/quiz-result-report-view.tsx:106` → `onEnable` `use-notification-opt-in.ts:128-131` → `requestPermissionsAsync` `features/quiz/notifications/review-notification-scheduler.ts:61`). 「나중에」가 시스템 창을 안 태운다. 애플 안내문 규칙 원문은 이번에 안 봤다(기억: 맥락 있을 때·목적 설명 — 확인 필요).
- 같이 고칠 것: 「나중에」가 화면 상태뿐이라(`use-notification-opt-in.ts:71`) 홈에 올 때마다 다시 뜬다 → 계정별로 기억(`use-quiz-hub-screen.ts:256-265`의 AsyncStorage 꼴), 새 과제가 생기면 한 번 더. 카드 문구 「망각 곡선 경고…58%」(`features/quiz/components/notification-opt-in-card.tsx:77-81`)는 그대로 가도 되나 학생 문구라 target-student 한 번.

**Q2 — 보낸다. 놓친 다음 날·다다음 날 아침 1회씩, 최대 2회 추가. 이번 앱 빌드엔 안 묶는다(서버만, ② 배포 뒤·초대 전).**
- 지금: 놓친 과제는 홈엔 뜨지만(`functions/src/learning-history.ts:549-550` `<= today`) 알림은 그날뿐(`send-review-reminders.ts:55-56` · `functions/src/review-reminder-core.ts:5-13`). ①로 날짜를 안 미루게 되면서 하루 놓치면 그 줄은 조용히 끝난다 — 1.0.11은 밀린 날짜에 다시 울렸다(STATUS:20 권고 ⑴).
- 왜 아침만 2회: 반응 데이터가 0명이라 근거 없는 짐작이다. 아침·저녁 둘 다면 과제 하나에 6회, 아침만 2일이면 최대 4회. 저녁 문구는 「마감」(`features/quiz/notifications/review-reminder-copy.ts:20`)이라 놓친 과제엔 거짓이다.
- 고칠 자리(서버만): `send-review-reminders.ts:50` 아침 슬롯 gte를 today−2로 · `pickRepresentativeTaskIdByAccount`(`review-reminder-core.ts:129-137`)가 오늘 과제를 먼저 집게 · 놓친 과제용 문구 한 벌(앱·서버 문자열 같아야 해서 `review-reminder-copy.ts:3-4` 앱 테스트도 같이, 문구는 target-student). 중복 방지는 보낸 날짜 기준이라(`review-reminder-core.ts:37-43`) 그대로 된다.
- 왜 빌드 밖: 앱 코드 0줄 — 푸시는 taskId로 열고(`app/_layout.tsx:128`) ① 뒤 복습 화면이 놓친 과제를 받는다. ② 전엔 토큰 가진 학생이 0이라 지금 배포해도 효과 0. 전제 하나 안 봄: `config/notifications.enabled`(`send-review-reminders.ts:32-38`)가 켜져 있는지.

(읽은 것: STATUS 231줄 전부 · 질문에 적힌 코드 7파일 전부 · design·invite 문서 전부 · 홈 훅/뷰·스케줄러·알림 코어·문구 파일. 고친 파일 0.)
