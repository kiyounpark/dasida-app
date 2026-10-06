너는 DASIDA(수능 수학 오답 사진 → 오답노트 → 간격 복습 앱, Expo/RN + Firebase Functions, 1인 개발)의 결정 자문이다. 파일은 읽기만 한다. 아무것도 고치지 않는다. 오늘은 2026-10-05(월) 밤.
작업 폴더: `/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin` (브랜치 notif-optin = main `9f3ac9d4` + 커밋 2개, 아직 main에 안 합침)

## 기윤(개발자)이 정한 방향 — 원문
"7일차에서 못하면 3일차로 돌아가고 이렇게요" · "3일차 못하면 1일차로 돌아가고 하나씩 돌아가는 거에요"
→ **복습 날을 놓치면 단계가 한 칸 내려간다**(day30→day7, day7→day3, day3→day1, day1은 day1). 복습 단계는 day1 → day3 → day7 → day30.

## 지금 상태 (코드로 확인해라)
- **스토어 1.0.11**: 앱을 열 때 연체 과제를 한 칸 내리고 날짜를 「오늘+간격」으로 다시 밀었다(`applyOverduePenalties`, main `0c45017` 이전 — `git show 0c45017`로 옛 코드 확인). 문제 둘: ⓐ 날짜까지 밀려서 돌아온 학생이 그날 복습을 못 하고 또 「내일」만 봄 ⓑ 단계만 내리고 id(`…__day3`)는 그대로라, 그 과제를 끝내면 다음 id가 자기 자신과 겹쳐 다음 복습이 안 생김(`review-scheduler.ts` completeReviewTask의 `alreadyExists`).
- **main(1.0.12 예정, 10.05 `0c45017`)**: 🔒 10.04 ① 규칙 「놓친 복습은 단계·날짜 그대로」로 바꿨다 — `features/learning/review-scheduler.ts` `repairDemotedReviewTasks`(앱 열 때 1.0.11이 내려 둔 과제 stage를 id 단계로 되돌림) · completeReviewTask가 다음 단계를 id로 셈. 그 🔒은 기윤 10.05 말 「놓친 날 다음 날」을 Claude가 「그대로 둔다」로 읽고 다시 묻지 않은 것 — 기윤 뜻은 위 「한 칸 내림」이었다. **이번 질문은 그 🔒을 다시 여는 것이다. 전제로 쓰지 마라.**
- 복습 중에 또 틀리면 이미 day1로 다시 만든다(`spawnMistakeReviewTasks` — 「틀림」 리셋은 따로 있다). 이번 건 「안 함(놓침)」만.
- 홈 due 판정은 앱·서버 둘 다 `scheduledFor <= today`(`features/learning/local-learning-history-repository.ts` buildReviewTaskState · `functions/src/learning-history.ts` 549-550 부근). 서버도 과제를 들고 있다(로그인 학생은 원격 저장소 — `features/learning/remote-review-task-store.ts`, 서버 `saveReviewTasks`·`listReviewTasks`).
- 같은 브랜치에서 방금 넣은 것(커밋 `0147826a`): 서버 아침 알림이 어제 놓친 과제에도 한 번 더 간다(`functions/src/review-reminder-core.ts` reminderLookbackDays) · 아침 알림 본문을 「오늘 안 하면 내일도 홈에 그대로 남아요」로 바꿈(초안, 기윤 검수 전). 홈 복습 카드에는 「오늘 안 하면 리셋」(`features/quiz/components/review-home-card.tsx:69`)이 있다.
- 1.0.12는 아직 빌드 전. 이 판이 두 스토어에 뜨면 학생 초대가 시작된다.

## Claude 제안(버려도 된다)
단계만 한 칸 내리고 날짜는 밀지 않는다(돌아온 날 바로 할 수 있게) + 내릴 때 id도 그 단계로 다시 만든다(ⓑ 버그 방지). 날짜를 밀지 않으면 「놓쳤다」를 언제 한 번만 세나(매일 열 때마다 또 내려가지 않게)가 문제다.

## 정할 것
R1. 「한 칸 내림」의 정확한 모양: 언제 내리나(앱 열 때 / 서버 / 끝낼 때), 며칠 놓쳐야 한 칸인가(하루 = 한 칸? 며칠 놓쳐도 한 칸?), 날짜는 어떻게(그대로 / 오늘 / 내일), 같은 과제가 매일 또 내려가지 않게 하는 법, id·서버 문서 처리(ⓑ 버그 재발 방지 · 서버 문서 id가 바뀌면 생기는 일), 1.0.11에서 이미 내려간 과제·main의 repair와의 관계.
R2. 알림·문구가 어떻게 맞물리나: 놓친 다음 날 아침 알림 1회(이미 넣음)는 그대로 맞나 · 아침 알림 본문(「내일도 그대로 남아요」는 거짓이 됨) · 홈 「오늘 안 하면 리셋」은 「한 칸 내려가요」 쪽이 정확한가. 문구는 초안만(학생 문구는 따로 검수).
R3. 범위와 위험: 고칠 파일(앱·서버), 테스트, 이번 1.0.12에 넣나, 서버 배포가 필요한가. 「한 칸 내림」 자체에 반대할 이유가 있으면 짧게(결정은 기윤).

## 답 모양
한국어 40줄 안. R1을 맨 위에. 근거는 파일:줄. 숫자를 말하면 어디서 셌는지. 모르면 모른다고.
