# Fable 2차(최종) — astra 답을 보고 다시 정함 (2026-10-05 밤, 누적 164,521토큰)

준 것: astra 답 전문(`astra-stepdown.md`) · 「네 안을 방어하지 마라」 · 갈린 자리 넷(날짜·id·서버·시기).
Claude 확인: 서버 `ReviewTaskSchema`는 `z.object`에 `.strict()`·`.passthrough()`가 없다(`functions/src/learning-history.ts:254-268`) → 모르는 필드는 버려진다(zod 기본).

astra 원문(29줄) 다 읽고 코드로 다시 봤다. 넷 중 둘은 astra 지적을 받아 내 안을 고쳤고, 둘은 내 안 유지. 이유는 각각 한 줄.

1. **날짜: 오늘로 옮김, 표식 없음 (내 안)**. 기윤 원문 「3일차 못하면 1일차로… 하나씩」은 연쇄인데, astra처럼 예정일을 그대로 두면 내려간 과제에 새 마감이 없어 두 번째 「못하면」이 영영 안 온다(astra 자신도 2줄에 「추가 강등 없음」이라 적음). 게다가 `overdueAppliedFor` 표식은 서버 `ReviewTaskSchema`가 `z.object`(기본 strip, `functions/src/learning-history.ts:254-268`)라 save(`:1150`)·list(`:1142`)에서 버려진다 — 서버 스키마를 안 고치면 다음 열 때 또 내려가는, 막으려던 그 버그가 난다. 오늘로 옮기면 `< 오늘`이 거짓이라 필드 없이 하루 1회가 된다.

2. **id: 새 단계 id로 다시 만듦 (내 안) + astra 충돌 지적 반영 → 완료된 같은 id는 push가 아니라 제자리 교체**. astra의 「회차 파생 id」는 앱·서버 공용 id 계약(`functions/src/review-task-contract.ts:31`)을 바꿔 서버 `createTaskId`(`learning-history.ts:866`·`:905`)와 로컬 복사본(`features/learning/local-learning-history-repository.ts:385-425`)도 같이 바꿔야 한다 — 안 그러면 복습 끝낼 때 서버가 먼저(`use-review-session-screen.ts:605-607`), 앱이 뒤에(`:643`) 서로 다른 다음 과제를 하나씩 만든다. 완료 슬롯을 덮는 전례는 이미 있다: 틀림 리셋이 완료된 `__day1` 위에 새 `__day1`을 push(`review-scheduler.ts:161-174`, 테스트 `:133-147`이 그 상태를 정상으로 봄). 잃는 건 서버 recentActivity 한 줄(`learning-history.ts:755`)뿐, 앱엔 완료 과제를 읽는 곳이 없다(grep). 덧: `alreadyExists`(`review-scheduler.ts:66`)가 완료본도 막아서 리셋 뒤 다시 올라갈 때 끊기는 기존 구멍이 있다 — 미완료만 보게 같이 고친다(앱만 고쳐도 서버가 안 만든 건 앱이 뒤에서 만든다).

3. **서버: 로직 안 건드림, 문구 2파일만 배포 (내 안)**. 전체 목록 덮어쓰기(`:1159`)는 spawn·complete·repair 전부가 쓰는 저장 모양의 성질이지 내림이 새로 만드는 위험이 아니고, 기기 2대 학생은 초대 규모에서 드물다 → 트랜잭션은 1.0.12 밖. 서버 완료 경로(`:861`, stage 기준)는 id=stage면 앱(`review-scheduler.ts:53`)과 같은 답을 낸다. lookback(`0147826a`)도 아직 미배포라 배포는 어차피 한 번.

4. **시기: 1.0.12에 넣고 초대는 안 미룸**. astra도 「1.0.12에 넣되」(21줄)라 판은 같고 갈린 건 크기다 — astra 안은 스키마·id 계약·트랜잭션·서버 완료 경로까지라 서버 로직 배포 + 세션 3개 이상 짐작 → 초대가 밀린다. 최종안 크기: **앱 6~7개**(`review-scheduler.ts`·`review-scheduler.test.ts`(156-211 다시 씀)·`use-quiz-hub-screen.ts`(호출 이름, 포커스 효과 `:124-135`에도 한 줄)·`review-home-card.tsx:69`·`features/quiz/notifications/review-reminder-copy.ts:14`+테스트) · **서버 2개**(`functions/src/review-reminder-copy.ts:15`+테스트) · **세션 1~2**(구현+테스트 1, 문구 검수+astra·Fable 리뷰 1). 짐작이다.

**「하나씩 돌아가는」에 맞는 쪽: 내 안.** astra 안은 과제당 한 번이라 「7일차 못하면 3일차」까지만 맞고 「3일차 못하면 1일차」가 안 온다. 내 안의 값: 매일 열고 안 하면 사흘에 day30→day1 — 기윤이 이 모양을 원하는지만 한 번 확인.

astra에서 가져온 것: day1엔 강등 예고 안 씀 · 이미 내려간 과제엔 「놓친 복습, 지금 이어서」류 다른 문구 · 홈 말고 다른 진입에도 적용(포커스 한 줄). 1.0.11 잔여 과제(id day3·stage day1)는 둘 다 「이미 내려간 것」으로 보고 id만 stage로 다시 만든다(날짜 지났으면 그날 또 한 칸). 운영에 몇 건인지는 여전히 모른다.
