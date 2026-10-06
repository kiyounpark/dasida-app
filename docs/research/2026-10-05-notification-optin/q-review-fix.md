DASIDA 저장소 `/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin`(브랜치 notif-optin)의 커밋 `9c912f13` 하나만 리뷰해라. 파일은 읽기만 한다. 아무것도 고치지 않는다.

- 보는 법: `git show 9c912f13` (rtk가 출력을 줄일 수 있으니 줄여 보이면 `/usr/bin/git show 9c912f13`). 바뀐 파일 4개의 주변 코드는 직접 열어 봐라.
- 무엇: 안드 13+ 새 설치에서 expo-notifications 0.32.16이 묻기 전에도 `status:'denied', canAskAgain:true`를 줘서(`node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/permissions/NotificationPermissionsModule.kt` 66~71줄 `!areEnabled -> DENIED`) 알림 허락 카드가 숨고 창도 안 뜨던 것을 고친 커밋. 고치는 모양은 astra·Fable → Fable 최종으로 이미 정했다: 훅은 `denied && canAskAgain !== true`일 때만 denied, 요청 함수도 그때만 창 없이 false.
- 앞 커밋 `0147826a`(본판)는 이미 리뷰가 끝났다 — 다시 보지 마라.

묻는 것 하나: 이 커밋에 **「반드시 고칠 것」**(학생 화면·알림이 틀리거나 iOS·결과 화면이 회귀하는 것)이 있나. 없으면 첫 줄에 「반드시 고칠 것: 없음」이라고 그대로 써라. 권고는 세 줄 안. 근거는 파일:줄. 한국어 15줄 안.
