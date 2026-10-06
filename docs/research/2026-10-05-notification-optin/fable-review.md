# Fable 설계·코드 리뷰 (커밋 전 변경 = 0147826a) — 2026-10-05 밤, 186,648토큰

**리뷰 결과 — 1.0.12 ② 커밋 전 변경 (작업 폴더 notif-optin, 전체 diff 860줄 `git diff` 원문으로 끝까지 읽음 · 바뀐 파일 주변은 worktree에서 직접 열어 확인)**

**반드시 고칠 것: 없음**

학생 화면·알림이 틀리거나 회귀하는 곳은 못 찾았다. 근거:
- 서버 아침 창 [D-1 00:00Z, D+1 00:00Z)는 `scheduledFor`가 앱(review-scheduler.ts:13-18)·서버(learning-history.ts:491-497) 둘 다 `KST날짜T00:00:00.000Z` 고정이라 문자열 비교(core.ts:147)·Firestore 범위(send-review-reminders.ts:54-59)가 안전. 쿼리 모양(완료==false + scheduledFor 범위)은 그대로라 인덱스 추가 없음. 발송 중복은 날짜·슬롯 sent-log(core.ts:47-53, send:82)가 막는다 → "놓친 다음 날 아침 1회"가 정확히 1회. D+1 아침 창은 [D, D+2)라 D-1 과제는 빠진다.
- 홈 due 판정이 `<= today`(local-learning-history-repository.ts:78-80 · 서버 learning-history.ts:550)라 새 문구 「내일도 홈에 그대로 남아요」는 사실. 놓친 과제 taskId로 탭해도 홈 due 목록에 있는 과제다.
- 홈 훅 부작용: effect deps `[accountKey, eligible, activate]`(use-notification-opt-in.ts:128), `registerPushToken`은 모듈 상수(provider.tsx:56, 352)라 eligible이 **뒤집힐 때만** 돈다. refresh로 `today` 객체가 바뀌어도 boolean이 같으면 안 돈다.
- 안드 13+: `getPermissionsAsync` 처음엔 undetermined → idle → 카드, 「다음」이 채널 `review` 만든 뒤 요청(scheduler.ts:48-63). 13 미만은 granted → 카드 없이 토큰만 등록. 서버 푸시 `channelId:'default'`(core.ts:134)는 기존 그대로. **← 2차에서 틀렸다고 Fable 스스로 정정(`fable-review-2.md`)**
- 게스트(익명) 경로: 운영은 소셜 로그인 필수(auth-policy.ts:6-12, `canUseDevGuestAuth = __DEV__`)라 학생에겐 안 닿는다.
- 결과 화면: `onDismiss` 제거만(quiz-result-report-view.tsx:106, use-result-screen.ts:100) — Q1' 그대로. 호출처는 두 곳뿐(use-result-screen.ts:101, use-quiz-hub-screen.ts:292), tsc 0과 일치.

**권고 (기록만, 커밋 막지 않음)**
1. 문구 사실 대조 — 카드 「복습하는 날 **아침**에 알려드릴게요」: 실제론 아침 07:30 **+ 저녁 20:00** 두 번(send-review-reminders.ts:143,150 · 로컬 scheduler.ts:10-13). 거짓은 아니고 반쪽. 기윤 검수 때 「아침·저녁」으로 할지 결정.
2. 홈 카드가 stale idle로 남는 경우 — 홈이 resting-photo로 떠 있는 채 결과 화면에서 허락하거나 설정에서 바꾸면, 홈 훅 deps가 안 바뀌어 'idle' 그대로(use-notification-opt-in.ts:96-128, 포커스 재조회 없음). 「다음」을 눌러도 창은 안 뜨고(existing granted → true, scheduler.ts:57-58) 카드만 사라진다 — 한 탭 손해, 결과 화면도 원래 같았다. 고치면 `useFocusEffect`로 권한 한 번 더 읽기(파일 1개).
3. 게스트(dev) 경로는 「다음」 눌러도 **아무것도 예약 안 됨** — `scheduleReviewNotifications`는 오늘 과제만 잡는데(scheduler.ts:36-43, 78-79) resting이면 오늘 과제가 없다. 기존 한계, 운영 비해당. 적어만 둔다.
4. 홈에서 이미 허락된 인증 학생은 홈이 뜰 때마다(eligible 뒤집힐 때마다) `cancelAllReviewNotifications`+토큰 등록 1회(use-notification-opt-in.ts:42-53) — 홈 effect(use-quiz-hub-screen.ts:113)와 cancel이 겹친다. 둘 다 멱등, 네트워크 1회. 그대로 둬도 됨.
5. dev 테스트 알림 본문이 옛 문구 「내일 처음부터예요」 그대로(scheduler.ts:150). `__DEV__` 전용, 학생 무관.
6. 빠진 테스트 — (a) `runReviewReminders` 배선(lookback+todayGte, send-review-reminders.ts:51-52,76)은 통합 테스트 없음(functions/tests에 send-review-reminders 테스트 파일 없음, 조각 함수만 core.test.ts:33-48,246-255). (b) `useQuizHubScreen`이 exam 소스일 때 `eligible=false`를 넘기는지 훅 테스트 없음 — home-today-modes.test.tsx:129-170은 state를 주입받은 뷰만 본다. (c) `pickRepresentativeTaskIdByAccount`에 `scheduledFor` 없는 doc 폴백 테스트 없음(core.ts:147 `?? ''`).
7. 「eligible = 사진 과제만」은 `nextTask`(가장 이른 미완료 1개, local-learning-history-repository.ts:76-77)의 source로 가른다 — 사진·실모 과제가 섞여 실모가 더 이르면 사진 과제가 있어도 안 묻는다. 카드 본문이 그때 실모용이라(no-review-day-card.tsx:35) Q1'과 일관. 기록만.
8. 카드는 undetermined인 한 resting 날마다 다시 뜬다(Q1' 「나중에」 없음의 귀결). 의도대로. 더 단순한 안은 없다 — 서버 41줄·앱 핵심 30줄이면 이미 작다. `preferFrom`은 Firestore가 scheduledFor 오름차순으로 주니 없어도 돌지만, 탭이 오늘 과제를 여는 값이라 둘 만하다.

**검증 못 한 것**: 시뮬레이터 실동작(요청서대로 아직). 위 판정은 코드·테스트 읽기 기준.
