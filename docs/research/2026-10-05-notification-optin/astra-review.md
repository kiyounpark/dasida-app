설계의 큰 틀은 맞습니다. 다만 **Android 신규 설치에서 허락을 묻지 못하는 기존 결함을 새 홈 경로도 그대로 물려받습니다.** 이 부분은 빌드 전에 고쳐야 합니다.
첨부 diff는 끝부분이 생략돼 있어 실제 `git diff`로 보완했고, 주변 코드까지 읽었습니다. 수정·테스트 실행은 하지 않았습니다.

**반드시 고칠 것**

- **Android 13+에서 ‘아직 안 물음’을 ‘거절함’으로 처리합니다.** 신규 설치는 알림이 기본적으로 꺼져 있습니다([Android 공식 문서](https://developer.android.com/develop/ui/compose/notifications/notification-permission)). 설치된 Expo 모듈은 `!areEnabled`이면 `denied`를 반환합니다([NotificationPermissionsModule.kt:70](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/permissions/NotificationPermissionsModule.kt:70)).
  그런데 훅은 `denied`면 카드를 숨기고, 권한 요청 함수도 `denied`면 시스템 창 없이 반환합니다([use-notification-opt-in.ts:114](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/hooks/use-notification-opt-in.ts:114), [review-notification-scheduler.ts:59](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/notifications/review-notification-scheduler.ts:59)).
  **미요청과 실제 거절을 구분하는 Android 처리가 필요합니다.** `canAskAgain`과 요청 이력을 함께 고려해, 처음에는 묻고 실제 거절 뒤에는 숨긴다는 승인된 동작을 유지하세요. 채널 생성 자체는 요청 함수 앞부분에 있습니다. 신규 설치 → 카드 → 시스템 창 → 허용/거절을 실제 기기에서 확인해야 합니다.

**권고**

- **게스트는 허락해도 내일 알림이 예약되지 않습니다.** 홈은 미래 사진 과제가 있을 때 묻지만, 로컬 예약은 오늘 과제만 고르고 없으면 반환합니다([use-quiz-hub-screen.ts:280](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/hooks/use-quiz-hub-screen.ts:280), [review-notification-scheduler.ts:76](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/notifications/review-notification-scheduler.ts:76)). 다만 게스트가 개발용으로 제한돼 있어 이번 학생 배포의 차단 사유는 아닙니다([auth-policy.ts:10](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/auth/auth-policy.ts:10)). 게스트 검증 결과를 운영 알림 검증으로 간주하지 마세요.

- **홈 포커스마다 토큰 등록이 반복되지는 않습니다.** 등록 함수는 모듈 수준에서 고정되고, 훅은 계정·eligible·활성화 함수 변경에 반응합니다([provider.tsx:56](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/learner/provider.tsx:56), [use-notification-opt-in.ts:128](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/hooks/use-notification-opt-in.ts:128)). 반대로 토큰 등록 실패 후 단순 포커스 복귀만으로 재시도된다는 보장도 없습니다. 취소 중복 최적화보다 이 재시도 조건을 기록하는 편이 낫습니다.

- **서버의 ‘한 번’은 동시 실행까지 보장하지 않습니다.** 발송 기록을 읽고 전송한 뒤 기록하므로, 겹친 실행은 같은 슬롯을 중복 발송할 수 있습니다. 이번 범위 확장으로 생긴 회귀는 아닌 기존 한계입니다([send-review-reminders.ts:80](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/send-review-reminders.ts:80), [send-review-reminders.ts:127](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/send-review-reminders.ts:127)).

- **테스트는 연결부를 보강하세요.** 홈 테스트는 `notificationOptIn` 상태를 직접 주입하고, 훅 테스트는 예약 함수를 모킹합니다([home-today-modes.test.tsx:145](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/components/__tests__/home-today-modes.test.tsx:145), [use-notification-opt-in.test.ts:8](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/hooks/use-notification-opt-in.test.ts:8)). Android 미요청 상태, 사진/실모 eligibility 전환, 서버의 어제·오늘 혼합/완료 과제 제외/저녁 제외를 실제 호출 연결까지 검증하면 좋겠습니다.

설계상 유지해도 되는 부분은 다음과 같습니다.

- 사진 조건은 승인된 `NextReviewBody` 표시 조건과 일치합니다. 결과 화면도 기존 약점 조건을 유지합니다([no-review-day-card.tsx:35](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/components/no-review-day-card.tsx:35), [use-result-screen.ts:101](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/quiz/hooks/use-result-screen.ts:101)).
- 서버는 완료 과제를 제외하고 계정별로 묶으며 오늘 과제를 우선합니다. 조회 필드·연산자는 그대로여서 이번 변경 자체가 새 인덱스 형태를 요구하지는 않습니다([send-review-reminders.ts:54](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/send-review-reminders.ts:54)).
- UTC 자정 범위는 실제 시각 변환이 아니라 저장된 날짜 라벨 규약에 맞습니다. 아침 슬롯도 KST 07:30이므로 새 안내의 ‘아침’과 맞습니다([review-scheduler.ts:9](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/features/learning/review-scheduler.ts:9), [send-review-reminders.ts:137](/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin/functions/src/send-review-reminders.ts:137)).
