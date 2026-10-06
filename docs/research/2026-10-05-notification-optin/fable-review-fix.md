# Fable — 수정 커밋 9c912f13(안드 13+) 리뷰 (2026-10-05 밤)

반드시 고칠 것: 없음

근거
- 훅 `features/quiz/hooks/use-notification-opt-in.ts:115`와 요청 함수 `features/quiz/notifications/review-notification-scheduler.ts:62`가 같은 조건(`denied && canAskAgain !== true`). 필드가 없으면(undefined) 전처럼 denied라 기존 테스트 `use-notification-opt-in.test.ts:53`도 그대로 통과.
- iOS 회귀 없음: expo-modules-core가 `canAskAgain = status != Denied`로 고정(`node_modules/expo-modules-core/ios/Legacy/Services/Permissions/EXPermissionsService.m:142`) → iOS denied는 항상 canAskAgain false, undetermined·provisional은 전과 같이 idle.
- 안드 13+ 새 설치: `node_modules/expo-modules-core/android/.../PermissionsService.kt:229~240` didAsk=false → UNDETERMINED·canAskAgain true, `NotificationPermissionsModule.kt:66~71` `!areEnabled → DENIED` → denied+true → 이제 idle(카드) → 창. 두 번 거절 뒤엔 shouldShowRequestPermissionRationale=false(`PermissionsService.kt:215~218`) → denied로 숨음.
- 결과 화면·홈 카드는 state로만 그리고 새 state 없음(`features/quiz/components/notification-opt-in-card.tsx:64`). 다른 `getPermissionsAsync` 호출(`review-notification-scheduler.ts:76·189`)은 granted만 봐서 영향 없음.
- 테스트: 두 파일 24/24 통과 (worktree에선 jest.config이 `/.claude/worktrees/`를 무시해 `--testPathIgnorePatterns=/node_modules/`로 덮어써야 돈다).

권고
1. 안드 13+에서 허용했다가 설정에서 알림을 끈 학생: OS 권한 GRANTED+areEnabled false → denied+canAskAgain true(`NotificationPermissionsModule.kt:62·66~71`)라 카드가 뜨고, 눌러도 창 없이 false → 헛탭 한 번 뒤 사라짐(전엔 안 보였음). `granted === true`면 denied로 두면 막힘 — 드문 경우라 1.0.12엔 안 고쳐도 됨.
2. 안드 13+ 첫 「허용 안 함」 뒤엔 canAskAgain이 아직 true라 다음 마운트에 카드가 한 번 더 뜬다(안드 정책상 2회까지). 훅 32줄 주석 "「허용 안 함」 → 카드가 사라진다"는 안드에선 "두 번째 거절 뒤"가 정확.
