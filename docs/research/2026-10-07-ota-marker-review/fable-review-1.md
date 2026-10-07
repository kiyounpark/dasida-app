## 리뷰 답 — 설정 버전 줄 OTA 표시 (커밋 `2b92a68f`, Fable)

**반드시 고칠 것: 없음.**

### 1. 빌드 25에서 OTA로 돌 때 깨질 길
없음(코드 확인).
- 네이티브 모듈은 빌드 25에 들어 있다. 빌드 25 커밋 `b94647b5`의 package.json:71과 지금 package.json:72가 둘 다 `"expo-updates": "~29.0.17"`, lock도 29.0.17 동일. expo-updates 도입은 05.01 `bcf67e88`. 그래서 `requireNativeModule('ExpoUpdates')`(build/ExpoUpdates.js:5)가 던질 일이 없다.
- JS 상수는 전부 방어돼 있다 — `isEnabled = !!…`(build/Updates.js:14), `updateId … ?? null`(22-24), `isEmbeddedLaunch … || false`(73). 모듈 상수 `updateLabelOf(Updates)`(profile-screen-view.tsx:28)는 네이티브 상수를 한 번 읽는 것이라 실행 중 안 바뀐다.
- 안드도 같은 모양: IUpdatesController.kt:101(isEmbeddedLaunch)·102(isEnabled)·112(updateId).
- 웹(app.config.js:53 `output: static`)은 ExpoUpdates.web.js에서 `updateId` 미정의 → null → 줄 안 붙음.
- jest: jest-expo 목(expoModules.js:1306-1327)이 `isEnabled:true, isEmbeddedLaunch:false`, updateId 없음 → null. profile-review-consent.test.tsx에 영향 없음.

### 2. 조건이 맞나
맞다. 네 경우 전부 null.
- 내장 코드(스토어 첫 실행): iOS AppController.swift:73 `embeddedUpdate != nil && embeddedUpdate.updateId == launchedUpdate.updateId` → true. 안드 :101 동일. 테스트 update-label.test.ts:11-13이 이 칸.
- 업데이트 꺼진 빌드: DisabledAppController.swift:94·DisabledUpdatesController.kt:124 `isEnabled: false`.
- 롤백(내장으로 되돌림): 롤백 지시가 오면 내장 업데이트의 commitTime을 지시 시각으로 DB에 다시 쓴다(iOS RemoteAppLoader.swift:186-239, 안드 RemoteLoader.kt:99-137) → 런처가 내장을 고름 → id가 내장과 같아 isEmbeddedLaunch true → null.
- iOS 비상 런치(emergency): AppLauncherNoDatabase.swift:16-28에서 `launchedUpdate`를 아예 안 채움 → updateId null → null. 안드 비상 런치는 안 봤다(짐작: 같음).
- 8자리: 네이티브 updateId는 매니페스트 `id`(ExpoUpdatesUpdate.swift:22 → ExpoUpdatesManifest.swift:8-9)이고 JS가 소문자로 바꾼다(Updates.js:22-24). `eas update`는 「Update group ID」「Android update ID」「iOS update ID」 셋을 찍는다(eas-cli build/commands/update/index.js:472-474) → **아이폰에선 「iOS update ID」 앞 8자리**, 그룹 ID 아님. update-label.ts:6 주석이 정확하다.
- `isEnabled &&`는 사실 중복(꺼지면 updateId가 null — Updates.d.ts:15)이지만 해는 없다.

### 3. 학생 문구
틀린 정보는 아니다. 다만 「업데이트 a1b2c3d4」는 "업데이트 하세요"로 읽힐 여지가 있다(이건 짐작, 학생 실측 없음). `selectable`(profile-screen-view.tsx:427)이라 복사해 보내기는 된다. 젓가락급 — 나중에 바꿔도 값이 같다.

### 4. 더 나은 길
새 빌드 없이는 이 표시가 제일 싸다. 대안 둘 다 이보다 못하다 — (a) PR #58 고침(노트 「왜」 마지막 줄)을 눈으로 보려면 긴 「왜」 노트를 만들어야 한다. (b) EAS 대시보드가 기기별 수신 수를 보여주는지는 확인 안 했다(짐작: expo-insights 없이는 안 보임).

### 권고(기록만)
1. **「두 번 연다」는 완전히 껐다 켜기다.** 기본값이 launchWaitMs 0(UpdatesConfig.swift:236-249)·checkOnLaunch Always(:251-264)라 첫 실행은 지금 코드로 뜨고 뒤에서 받는다. 적용은 "next app cold start"(Updates.d.ts:169-171) — 백그라운드에서 꺼내는 건 안 센다. 확인 절차에 이 한 줄을 적어두면 좋다.
2. 나중에 PostHog 초기화에 `Updates.updateId`를 super property로 달면 학생 폰 안 보고도 누가 어느 업데이트로 도는지 서버에서 보인다. 지금은 아님 — 첫 OTA 범위를 넓히지 않는 게 맞다.
3. 문구 「업데이트 …」→ 괄호 「(a1b2c3d4)」 같은 중립형 고려. 젓가락급.

---

(Claude 메모 10.07) 대조: 빌드 25 커밋 `b94647b5` package.json:71 `"expo-updates": "~29.0.17"` — 맞음 · eas-cli `commands/update/index.js:472-474` 「Update group ID」「Android update ID」「iOS update ID」 — 맞음. Fable 토큰 142,269 · astra 58,877.
