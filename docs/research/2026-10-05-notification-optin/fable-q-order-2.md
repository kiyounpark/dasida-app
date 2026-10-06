# Fable 2차 답 — astra 답 + 애플 HIG 원문 + 거짓 문구를 보고 다시 정함 (2026-10-05 밤, 누적 234,772토큰)

준 것: astra 답 전문(`astra-out.md`) · 「네 안을 방어하지 마라」 · HIG Privacy 「Pre-alert screens」 원문 · 아침 알림 본문이 ① 뒤로 거짓이 됐다는 사실.

## 2차 답 (astra 원문 24줄 전부 읽음 · 고친 파일 0)

**Q1' — 버튼 하나 「다음」(「나중에」 뺌). 자리는 홈 「내일 복습」 카드 밑 그대로, 누르면 시스템 창.**
- 이유: HIG 원문이 「screens, windows, or views」로 카드(view)까지 덮고, 버튼 하나·「Continue/Next」류·닫기 금지 셋을 명시한다. 같은 부품을 결과 화면도 쓰니(`features/quiz/components/quiz-result-report-view.tsx:106`) 한 번 고치면 둘 다 맞는다.
- 「알림 켜기」(`features/quiz/components/notification-opt-in-card.tsx:93`)는 HIG가 피하라는 「Allow」류라 「다음」으로, 본문에 「다음을 누르면 알림 허용 창이 떠요」 한 줄(학생 문구 → target-student + 기윤).
- 거절하고 싶은 학생: ⓐ 안 누르고 지나간다 — 막는 창이 아니고 resting 날 홈에만 뜬다(`features/quiz/hooks/use-quiz-hub-screen.ts:272-273`) ⓑ 시스템 창에서 「허용 안 함」 → `denied`로 카드가 사라진다(`features/quiz/hooks/use-notification-opt-in.ts:112-114` · `notification-opt-in-card.tsx:61`). OS가 기록하는 게 HIG가 원하는 길. 「나중에」 기억 코드가 필요 없어져 더 작아지고, `onDismiss`(`use-notification-opt-in.ts:142-144`)는 고아가 되니 뺀다.
- 버린 길: 「홈 카드는 custom screen이 아니다」로 두 버튼 유지 — 심사 4번 통과는 심사관이 그 화면을 봤는지 모르는 숫자라 근거가 못 된다.

**Q2' — astra 안으로: 놓친 다음 날 아침 1회, 정규 아침 슬롯에 합쳐. 단 「나중에 시험」 말고 ② 배포 뒤·초대 전에 서버만 배포.**
- 2회→1회로 버리는 이유: 둘 다 반응 데이터 0, 1회가 가장 작은 시험. 놓친 과제용 별도 문구도 뺀다 — Q3'를 고치면 아침 제목·본문이 놓친 과제에도 참이 된다.
- 0회가 아닌 이유: ①(`0c45017`) 뒤로 하루 놓치면 알림 줄이 조용히 끝난다 — 1.0.11은 밀린 날짜에 다시 울렸다(STATUS:20 권고 ⑴). 「나중에 시험」은 토큰 학생 0인 지금 기준이 없어 안 온다.
- 고칠 자리: `functions/src/send-review-reminders.ts:50` 아침 슬롯만 gte = today−1(`functions/src/review-reminder-core.ts:5-13`) · `pickRepresentativeTaskIdByAccount`(`review-reminder-core.ts:129-137`)가 오늘 과제를 먼저 집게 한 줄 · 테스트. 중복은 보낸 날짜+슬롯 기준(`review-reminder-core.ts:37-43`)이라 하루 1회가 그대로. 앱 코드 0줄 — 푸시는 taskId로 열고(`app/_layout.tsx:128`) 놓친 과제도 due다(`functions/src/learning-history.ts:549-550`).

**Q3' — 이번 ②에 같이 고친다.**
- 확인: 「오늘 안 하면 내일 처음부터예요」가 앱 `features/quiz/notifications/review-reminder-copy.ts:14` · 서버 `functions/src/review-reminder-copy.ts:15` · 테스트 `features/quiz/notifications/review-reminder-copy.test.ts:7,13` · `functions/tests/review-reminder-copy.test.ts`에 있다. ① 뒤 놓친 과제는 단계·날짜 그대로(`features/learning/review-scheduler.ts:93-99`)라 거짓이고, 서버 아침 푸시가 라벨 없이 이 본문을 보낸다(`send-review-reminders.ts:79` · `:134-139`).
- 이유: ②가 이 문장을 학생에게 처음 닿게 하는 일이다. 문자열 2곳 + 테스트 2곳, 서버는 functions 배포(밖으로 나가는 일 → 기윤에게 묻고, Q2' 서버 변경과 같은 배포에). 초안 「오늘 안 하면 내일도 홈에 그대로 남아요」 — target-student + 기윤 한 줄. `review-notification-scheduler.ts:150`은 `__DEV__` 전용이라 안 건드린다.
