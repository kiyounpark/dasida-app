# 1.0.12 ② 이어서 — 「놓친 복습 한 칸 내림」부터 (10.05~06 세션 인수인계)

> ✅ **10.06 오후 끝 — main `18b07cfd`.** 한 칸 내림(클라우드 세션) · 학생 문구 · 리뷰 · 합치기까지 됐다. 남은 것은 `docs/STATUS.md` 「✅ 10.06 오후」 줄의 ⑴~⑷(배포는 기윤에게 묻기). 아래는 그때의 인수인계 원문.

> 새 세션에 붙여 넣을 말: **`docs/drafts/2026-10-06-stepdown-handoff.md` 읽고 이어서.**
> 읽을 것: 이 파일 끝까지 · `docs/STATUS.md` 맨 위~25줄 · `docs/research/2026-10-05-notification-optin/fable-stepdown-2.md`(최종안 원문).

## 지금 어디까지

- 브랜치 **`notif-optin`** — worktree `.claude/worktrees/notif-optin`(세션마다 사라질 수 있다 → 없으면 `git worktree add .claude/worktrees/notif-optin notif-optin`, `node_modules`·`functions/node_modules` 심볼릭 링크, `.env`·`.env.local`·`functions/.env.dasida-app` 복사). main `9f3ac9d4` 위, origin에 push함, **main에 안 합침**.
  - `0147826a` ② 본판 — 홈 사진 「내일 복습」 카드 아래 알림 허락 카드(버튼 하나 「다음」, 「나중에」 없음 — 애플 HIG pre-alert) · 결과 화면 카드도 같이 · `useNotificationOptIn` `hasWeaknesses`→`eligible`, `onDismiss` 제거 · 서버 아침 알림이 어제 놓친 과제에 1회 더(`reminderLookbackDays`, 대표 과제는 오늘 것 먼저) · 아침 본문 초안 교체
  - `9c912f13` 안드 13+ 새 설치에서 허락 창이 안 뜨던 것(expo-notifications가 묻기 전에도 `denied`+`canAskAgain:true`) — 결과 화면 카드도 처음부터 안드 13+엔 못 물었다
  - `5775288a` 결정·리뷰 원문 `docs/research/2026-10-05-notification-optin/`
- 확인: tsc 0(앱·functions) · jest 974/974 · functions 289/289 · **iOS 시뮬레이터**: 아이패드 게스트에 사진 과제 한 줄을 직접 넣고 홈 → 「내일 복습」 아래 카드 → 「다음」 → iOS 허락 창 → 허용 → 카드 사라짐.
- 리뷰: 본판 astra(119,675) 반드시 고칠 것 1(안드) · Fable(186,648) 없음 → 안드 수정 커밋 astra(32,063)·Fable(110,945) 둘 다 「반드시 고칠 것: 없음」.
- **서버 배포 0 · 앱 빌드 0.**

## 🔒 10.06 바뀜 — 놓친 복습은 한 칸 내린다

10.04 ① 「놓친 복습은 단계·날짜 그대로」(10.05 `0c45017`로 main에 들어감)를 바꾼다. 10.05에 기윤 말 「놓친 날 다음 날」을 Claude가 「그대로 둔다」로 읽고 다시 안 물은 게 엇나간 자리. 기윤 10.06: **「7일차에서 못하면 3일차로 돌아가고」「3일차 못하면 1일차로… 하나씩」** · 「매일 열고 안 하면 매일 한 칸(30일차가 사흘에 1일차)」도 「네 좋네요」.

Fable 최종(astra와 갈려 2차, `fable-stepdown-2.md`):
- **언제**: 앱을 열 때 — 지금 `repairDemotedReviewTasks`가 도는 자리(`features/quiz/hooks/use-quiz-hub-screen.ts:93-114`) + 포커스 효과에 한 줄. `scheduledFor(앞 10글자) < 오늘`인 미완료 과제를 **한 칸** 내린다(day30→7→3→1, day1은 그대로). 며칠 지났어도 한 번 열 때 한 칸.
- **날짜**: 오늘로 옮긴다 → 그날 바로 할 수 있고, `< 오늘`이 거짓이 되어 같은 날 또 안 내려간다(새 필드 없음 — 서버 `ReviewTaskSchema`가 `z.object`라 모르는 필드는 버린다, `functions/src/learning-history.ts:254-268`, Claude 확인).
- **id**: 새 단계 id로 다시 만든다(`functions/src/review-task-contract.ts` `buildReviewTaskId`). 같은 id의 **완료본**이 있으면 제자리 교체(배열에 같은 id 둘이면 `find`가 완료본을 잡는다). `completeReviewTask`의 `alreadyExists`(`features/learning/review-scheduler.ts:66`)는 미완료만 보게.
- **1.0.11이 내려 둔 과제**(id day3·stage day1): 이미 내려간 것 → `repairDemotedReviewTasks`를 뒤집어 **id를 stage로** 다시 만든다(날짜 그대로, 지났으면 그날 또 한 칸).
- **서버 로직은 안 건드린다**(saveAll diff로 따라온다) — 서버는 문구 2파일만.
- 크기 짐작: 앱 6~7(`review-scheduler.ts` · `review-scheduler.test.ts` 156-211 다시 씀 · `use-quiz-hub-screen.ts` · `review-home-card.tsx:69` · `features/quiz/notifications/review-reminder-copy.ts`+테스트) · 서버 2(`functions/src/review-reminder-copy.ts`+테스트) · 1~2세션.
- astra 안(날짜 그대로 + 표식 + 서버 트랜잭션)은 버림 — 「3일차 못하면 1일차」가 안 오고, 표식은 서버가 버리고, 서버 로직 배포로 초대가 밀린다.

## 학생 문구 세 줄 — target-student 먼저 → 기윤 한 줄씩

1. **아침 알림 본문**(앱·서버 같은 문자열, 테스트 둘 다 `MORNING_BODY` 상수): 지금 초안 「오늘 안 하면 내일도 홈에 그대로 남아요」는 한 칸 내림 뒤 **거짓**. 기윤은 「나(사실+급한 느낌)가 좋은데 더 급박하게」. 후보: 「지금 안 보면 오늘 밤엔 더 흐려져요」(target-student 1위) · Fable 「오늘 안 하면 한 단계 내려가요」. 어제 놓친 학생에게도 다음 날 아침 같은 문구가 간다.
2. **홈 복습 카드 배지 「오늘 안 하면 리셋」**(`features/quiz/components/review-home-card.tsx:69`): day3 이상은 「오늘 안 하면 한 칸 내려가요」류, day1은 내려갈 데가 없어 다른 말(Fable 초안 「오늘 안 하면 내일 또 떠요」). 이미 내려간 과제엔 「놓친 복습, 지금 이어서」류(astra).
3. **허락 카드 안내** 「복습하는 날 아침에 알려드릴게요. 「다음」을 누르면 알림 허용 창이 떠요.」(`features/quiz/components/notification-opt-in-card.tsx` `OPEN_ALERT_LINE`): 실제론 아침 7:30·저녁 20:00 두 번 — 「아침·저녁」으로 할지.

## 그다음 순서

1. 한 칸 내림 커밋 → astra·Fable 리뷰(그 커밋만 좁게, 반드시 고칠 것만 — `docs/how-we-decide.md`)
2. 문구 확정 커밋 → 리뷰
3. main 합치기(main 폴더에서 `git merge --ff-only notif-optin`, 그 전에 main 받아 겹침 확인) → STATUS 갱신 → **functions 배포 전 기윤에게 묻기**(`sendReviewRemindersMorning`·`sendReviewRemindersEvening` — 문구·lookback)
4. 1.0.12 빌드 → **기윤 안드 폰**(안드 13 이상인지 먼저): 다시다 지우고 새로 설치 → 로그인 → 기출 하나 → 결과 화면 「다음」 → 안드 허락 창. 사진 카드는 이름 붙은 사진이 있어야 떠서 기출이 더 확실(같은 코드)
5. 두 스토어 → 초대

## 알게 된 것 (기록)

- **사진 3장(8호·9호·10.03 손글씨 3A 등차수열 합) 전부 약점 이름이 안 붙었다** → ②가 닿는 학생이 적을 수 있다. PostHog `photo_weakness_labeled`(08.27부터, 한 번도 안 열어 봄)로 비율을 세 볼 것.
- 허락 카드가 안 뜨는 자리: 이름 없는 노트만 있는 학생 · 오늘 복습이 있는 날(홈이 복습 리스트) · 다음 과제가 실모 과제인 날(Fable 권고 7 — 기록만).
- 권고 기록만(커밋 안 막음): 홈이 떠 있는 채 권한이 바뀌면 카드가 남아 한 탭 손해(포커스 때 재조회 — 파일 1개) · 안드 첫 「허용 안 함」 뒤 다음 resting 날 한 번 더 뜸(안드 정책) · 설정에서 알림을 끈 안드 학생은 카드가 떠도 창이 안 뜸 · `runReviewReminders` 배선 통합 테스트 없음.
- 개발 로그에서 `no_review_day_card_viewed`가 한 번 열 때 두 번 찍혔다 — 원인 안 봄.
- rtk는 `git diff > 파일`을 **요약판**으로 저장한다 → 리뷰용 diff는 `/usr/bin/git diff`.
- 시뮬레이터: iPhone 17 Pro(기윤 D칸 계정 `user:iWaBu…`)는 오늘 복습 4개라 홈이 리스트 모드 — 허락 카드 자리를 못 본다. 아이패드 게스트(`anon:mus1ogl7-697jcypy`)엔 AsyncStorage manifest에 과제·빈 요약을 직접 넣었다(백업 `manifest.json.bak-optin`, 3A 사진 노트 1장 추가) · **이 아이패드 앱은 알림이 이제 「허용」** — 다시 보려면 앱을 지우고 다시 깔아야 한다. 아이폰 시뮬레이터는 아직 한 번도 안 물음.
- 홈 복습 카드 「오늘 안 하면 리셋」은 스토어 1.0.11에도 있다.
- worktree 함정: jest는 경로를 맨 앞에 + `--testPathIgnorePatterns` 덮어쓰기(`/node_modules/` `/tests/` `/functions/` `/.expo/`), `rtk proxy`로. Metro는 `./node_modules/.bin/expo start --dev-client`를 timeout 2시간으로 따로.

- **3월 말 아티팩트는 10.05~06 세션에서 안 고쳤다** — M1 「쇼츠의 문」 줄이 아직 「②·⑵는 기윤 10.05 대기」다. ② 합칠 때 같이 고치고 `docs/research/2026-10-05-notification-optin/` 경로를 단다(CLAUDE.md 「문서·재료는 가리키게」).

시작 전에 판정부터 말하고 "진행"을 기다려라(무거움급 짐작 — 앱 6~7 + 서버 2).
