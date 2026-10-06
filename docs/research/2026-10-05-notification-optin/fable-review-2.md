# Fable 2차 — 안드 13+ 판단이 astra와 갈려 다시 정함 (2026-10-05 밤, 누적 209,982토큰)

준 것: astra 리뷰 전문(`astra-review.md`) · 「네 안을 방어하지 마라」 · Claude가 읽은 `NotificationPermissionsModule.kt` 판정 순서 · 안드로이드 공식 문서 원문("If a user installs your app on a device that runs Android 13 or higher, your app's notifications are off by default.").

**안드 13+ 재판정 — astra가 맞다. 내 1차 「undetermined → idle → 카드」는 틀렸다.** 설치된 expo-notifications 0.32.16을 직접 읽었다.

**A. 못 띄운다.** 근거: 안드 13+ 새 설치는 POST_NOTIFICATIONS 미요청 → PermissionsService.kt:230-233이 UNDETERMINED(canAskAgain true, :236-239)를 주지만, NotificationPermissionsModule.kt:66-71이 `!areEnabled`(새 설치는 알림 꺼짐)를 먼저 봐서 status **`denied`** 로 바꾼다. 훅은 denied면 숨기고(use-notification-opt-in.ts:114-117), 요청 함수도 denied면 창 없이 false(review-notification-scheduler.ts:57-59). targetSdk 기본 36(ExpoModulesCorePlugin.gradle:69)이라 Api33 분기가 돈다. 앱에서 `requestPermissionsAsync`를 부르는 곳은 scheduler.ts:61 하나뿐 → 결과 화면 카드도 처음부터 안드 13+에선 한 번도 못 물었다.

**B. 이번 ②에 고친다.** 이유: 안 고치면 ②의 대상(사진만 올린 학생) 중 안드 새 설치 전원이 카드를 못 본다 — 기능이 안드에서 0이다.
가장 작은 모양(파일 4개):
1. use-notification-opt-in.ts:105-118 — `{status, canAskAgain}`을 읽고, **denied이면서 `canAskAgain === true`일 때만 idle**, 그 외 denied는 denied. (`=== true`로 두면 기존 `{status:'denied'}` 테스트가 안 깨진다.)
2. review-notification-scheduler.ts:57-59 — `denied && canAskAgain !== true`일 때만 창 없이 false, 아니면 `requestPermissionsAsync`로 간다.
3. use-notification-opt-in.test.ts — 2개 추가: `{status:'denied', canAskAgain:true}` → idle(안드 13+ 새 설치), `{status:'denied', canAskAgain:false}` → denied(iOS 거절).
4. review-notification-scheduler.test.ts — `requestNotificationPermission` 테스트 2개(지금 0개): denied+canAskAgain true → 요청 호출, denied+false → 호출 없음.
- iOS는 그대로: canAskAgain = `status != denied`(EXPermissionsService.m:142)라 undetermined→idle, denied→denied, granted→granted 변화 없음.
- 안드에서 한 번 「허용 안 함」 뒤: canAskAgain = `shouldShowRequestPermissionRationale`(PermissionsService.kt:215-217) → 첫 거절 뒤 true, 두 번째 거절 뒤 false(안드 OS 규칙 — 코드가 아니라 내 지식). 즉 같은 세션엔 숨고(onEnable이 denied, :139-140) 다음 resting 날 한 번 더 뜨고, 두 번째 거절이면 영구 숨김. **괜찮다** — OS가 허용하는 두 번째 창이고, 영구 숨김을 앱이 따로 저장하면 파일·테스트가 늘어난다. Q1' 「거절 → 사라짐」과 최대 한 번 어긋남, 기록만.
- 기록: 설정에서 알림을 끈 안드 학생(granted true·status denied·canAskAgain true)은 카드가 떠도 창이 안 뜬다. 드물고 한 탭 손해 — 안 고친다.
- 실기기 확인은 astra 말대로 필요: 안드 13+ 새 설치 → 카드 → 창 → 허용/거절. 시뮬레이터론 안 된다.

**C. 권고 2(포커스 때 권한 재조회)는 이번에 안 넣는다.** 이유: 한 탭 손해뿐이고 ② 범위 밖 — B 고침과 섞으면 리뷰 범위만 는다. STATUS 「모르는 것/남은 것」에 한 줄.
