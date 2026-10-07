추천: A (시험 그림을 OTA에서 빼고 보낸다 — 단, 학생이 1.0.12를 깔기 전에 기윤 TestFlight 25로 먼저 확인)

이유 셋
1. 학생이 보는 것: 셋(#57·#58·#59)은 전부 1.0.12 설치본에만 가는 고침이다(runtimeVersion appVersion, `app.config.js:17-19`). B면 1.0.12 학생은 1.0.13 심사가 끝날 때까지 「한 칸 내림 경주」·「밤 알림이 며칠 뒤 과제를 당김」·「노트 카드 마지막 줄 잘림」을 그대로 쓴다. A면 통과 뒤 두 번째 실행부터 받는다.
2. 일정: C는 심사 중인 1.0.12를 빼고 다시 줄을 서는 것이라 🔒 10.05 초대(「1.0.12가 두 스토어에 뜨면」)가 밀린다. B는 EAS 빌드 2개 + 심사 한 번 더. A는 빌드·심사 0, 명령 한 줄. 그리고 B·C는 OTA 파이프라인을 안 고친다 — 다음 OTA 때 똑같이 1,000에 막힌다.
3. 되돌리기: A는 `eas update:roll-back-to-embedded --channel production`(eas-cli `build/commands/update/roll-back-to-embedded.js:20` 「roll back to the embedded update」)으로 다음 실행에 빌드 25 코드로 돌아간다. 지금 production 채널의 1.0.12 설치본은 기윤 TestFlight + 애플 심사 기기뿐(질문지 기준 · 심사 기기 수는 짐작)이라 사고 범위가 가장 작은 때가 지금이다. 단서 하나: 심사 기기도 OTA를 받는다(`checkOnLaunch` 기본값 Always — `expo-updates/ios/EXUpdates/UpdatesConfig.swift:264`). JS OTA는 허용되고 내용이 버그 고침이라 위험은 작지만, 학생에게 가는 게 바뀌는 갈림길이라 기윤이 정한다.

2. A가 되나 — **된다** (코드 경로로 확인, 실행은 안 함)
- 내보내기: `@expo/cli` `build/src/export/exportAssets.js:97-107`이 `updates.assetPatternsToBeBundled`를 읽는다 — `.length`가 0이면 undefined라 「전부 싣는다」(지금 `[]`가 그 상태). 패턴이 있으면 `:208-215`에서 안 맞는 자산을 `embeddedHashSet`에 넣고, `createMetadataJson.js:31`이 그 해시를 metadata.json에서 뺀다 → eas-cli는 metadata.json을 그대로 매니페스트로 쓴다(`eas-cli/build/project/publish.js:305-310`). 주의: 패턴은 `path.join(projectRoot, p)`로 절대경로가 된다(`exportAssets.js:133`) → `!` 부정 패턴은 안 먹는다. 넣을 것만 적어야 한다. 예: `['assets/auth/**','assets/fonts/**','assets/images/**','assets/journey/**','assets/quiz/**','assets/review/**','node_modules/**']`.
- 빌드엔 영향 없음: 내장 매니페스트는 `expo-updates/utils/build/createManifestForBuildAsync.js:34`가 `exportEmbedAssetsAsync`로 만들고, `@expo/cli/build/src/export/embed/`엔 패턴 거르기가 없다(grep 0건). 즉 빌드 25엔 시험 그림이 다 들어 있고, 패턴을 넣어도 1.0.13 빌드에 그대로 들어간다(공식 문서도 「native binary에 드는 자산은 안 바뀐다」).
- 런타임 iOS: OTA로 돌 때 `AppLauncherWithDatabase.swift:203` 「Initialize asset map with the embedded assets that may not be part of this update」 → `UpdatesUtils.swift:90-108 embeddedAssetsMap`이 내장 매니페스트의 자산(키 = packagerHash, `Update/EmbeddedUpdate.swift:37-42`)을 메인 번들 경로로 먼저 채우고, 그 위에 업데이트 자산을 덮는다(`:218`). 이 맵이 JS에 `localAssets`로 간다(`AppController.swift:91-92`).
- 런타임 안드: `launcher/DatabaseLauncher.kt:119` `localAssetFiles = embeddedAssetFileMap()` → `:170-207`이 `file:///android_res/…`(`utils/AndroidResourceAssetUtils.kt:22-30`)로 채움 → `IUpdatesController.kt:116-124` `localAssets`.
- JS: `expo-asset/build/Asset.js:75-83`이 해시로 `localAssets`를 찾아 `downloaded=true`(안드 `android_res`는 uri로), `Asset.fx.js`가 RN resolver를 덮고(`expo-asset/build/index.js:1`에서 자동 설치), 시험 그림을 그리는 `expo-image`는 RN `resolveAssetSource`를 쓴다(`expo-image/src/utils/resolveAssetSource.tsx:1-3`, `resolveSources.tsx:28`). 업데이트에도 내장본에도 없으면 uri가 빈 문자열(`AssetSources.js` 끝) — 그래서 「내장본에 있나」만 지키면 된다.
- 내장본과 같은가: `git diff 11c08a99..HEAD -- assets` 0건 — 빌드 25 이후 자산 변경 없음. 키는 내용 해시라 같은 파일이면 같은 키.
- 확인 도구 있음: `npx expo-updates assets:verify`(`expo-updates/cli/build/cli.js:57`, `assetsVerify.js:66-78`) — `expo export --dump-assetmap`(`@expo/cli …/export/index.js:72`)의 assetmap.json·metadata.json과 빌드의 `app.manifest`를 대조한다. 다만 `app.manifest`가 이 맥엔 없다(find 0건 · Debug 빌드는 건너뜀 `expo-updates/scripts/create-updates-resources-ios.sh:10-15`). Release 시뮬레이터 빌드(EAS 한도 안 씀)로 뽑거나, 건너뛰고 TestFlight 25에서 직접 본다(설정 「업데이트 xxxxxxxx」 + 기출 화면 그림).
- 숫자 1,843 재구성(로그 없음·짐작): `assets/exam` webp 1,800개, 내용 고유 1,184개. `createMetadataJson.js:31-37`은 플랫폼별 목록을 해시로 안 합치므로 require 1,800 + 그 외 ~43 = 1,843. 한도는 플랫폼별 업데이트당 1,000(expo.fyi 「limit of 1000 assets per update」 · CLI의 2,000은 서버 조회값 `PublishQuery.js:36-43`, 실제 거절은 1,000). 시험 그림을 빼면 ~43.

3. 예약급인가 — **젓가락급**. 패턴은 `expo export`에만 작용하고 빌드·DB·데이터 구조를 안 건드려 나중에 넣어도 값이 같다. 단, OTA를 한 번이라도 쓰려면 그 전에 반드시 넣어야 하고, 시험 그림(고유 1,184 > 1,000)은 앞으로도 OTA로 못 가니 「그림 바뀌면 = 새 빌드」가 구조다.

안 본 것: 애플 한 번에 한 버전 심사(짐작), EAS 빌드 잔여 횟수(eas 명령 안 돌림), 실제 기기에서 webp가 뜨는지(코드 경로만).

---

(Claude 메모 10.07) 대조: 빌드 25 뒤 `assets/` 변경 0건 — 맞음 · 시험 그림 파일 1,802 · 고유 1,186(Fable 1,800·1,184) · `roll-back-to-embedded.js` 있음 · `exportAssets.js:97-107` · `AppLauncherWithDatabase.swift:202-203` — 맞음. 패턴 예시에 `features/**`가 빠졌다(내보낸 자산 중 `features/quiz` 1개) — 빠지면 내장본으로 풀릴 것(같은 원리 · 짐작).
