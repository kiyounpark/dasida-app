# Fable 리뷰 1 — OTA 그림 한도 A안 변경 (`024f9287`) · 2026-10-08

> Fable(Agent `model: fable`) · 157,139토큰 · 도구 34회 · 약 10분 48초 · 질문 `q-review.md` 그대로 · 읽기만. 아래는 답 원문.

반드시 고칠 것: 없음

확인한 근거 (파일을 직접 열어 본 것만):
- 커밋 `024f9287`은 `app.config.js` 한 파일, `updates.assetPatternsToBeBundled`를 넣을 것 8패턴으로 바꾼 것뿐 (`git show`).
- 새 패턴으로 내보낸 묶음(`scratchpad/dist-new`): assetmap 1,215항목 중 metadata에 실린 건 iOS 41·안드 42. 빠진 1,184개는 전부 `assets/exam/`, 그 밖에 빠진 건 0개 (assetmap↔metadata를 node로 직접 대조). 실린 31개 = node_modules 15·fonts 8·images 3·auth 3·review 1·features/quiz 1 — 질문의 숫자와 같다.
- 빠진 그림을 런타임에 앱 본체에서 찾는 장치가 expo-updates 29.0.17에 있다:
  - 안드 `node_modules/expo-updates/android/src/main/java/expo/modules/updates/launcher/DatabaseLauncher.kt:119` — `localAssetFiles = embeddedAssetFileMap().apply {…}`. 내장 app.manifest의 자산 전부를 바닥에 깔고(:170–207, `file:///android_res/drawable/<resourcesFilename>.webp`) 그 위에 업데이트 자산을 덮는다.
  - iOS `ios/EXUpdates/AppLauncher/AppLauncherWithDatabase.swift:202–203` — "Initialize asset map with the embedded assets that may not be part of this update" → `UpdatesUtils.swift:90` `embeddedAssetsMap`이 `Bundle.main.path(forResource:ofType:inDirectory: nsBundleDir)`로 채운다.
  - 열쇠는 `packagerHash` (`EmbeddedUpdate.kt:53`, `EmbeddedUpdate.swift:37,42`). 빌드 25 커밋으로 만든 두 manifest(`manifest-b25-ios` 1,837·`manifest-b25-android` 1,842)에서 시험 그림 1,184개 해시가 **빠진 것 0개**(iOS·안드 둘 다, node로 대조). 안드 항목 중 resourcesFolder/Filename 없는 것 0, iOS nsBundleFilename 없는 것 0.
- JS 쪽(expo-asset 12.0.12): `LocalAssets.js`가 `ExpoUpdates.localAssets[hash]`를 찾고, `Asset.js:76–84`가 `file:///android_res/`를 처리, `Asset.fx.js`가 안드는 `resolver.resourceIdentifierWithoutScale()`(RN `AssetSourceResolver.js:194` 있음)·iOS는 `fromSource(localUri)`로 돌린다. `expo-asset/build/index.js:1`이 `Asset.fx`를 불러오고, OTA 실행(isUsingEmbeddedAssets=false)에서만 켜진다(`PlatformUtils.js`).
- 시험 그림은 `expo-image`로 그린다(`features/quiz/exam/screens/exam-solve-screen.tsx:1,80`, `exam-problem-card.tsx:9`). expo-image `src/utils/resolveSources.tsx:27–28`이 RN `resolveAssetSource`를 부르므로 위 변환기를 그대로 탄다. 안드에서 나오는 값은 지금 스토어판(내장 실행)에서 RN `defaultAsset()`이 돌려주는 것과 같은 `resourceIdentifierWithoutScale()`(`AssetSourceResolver.js:112–124`)이라 새 경로가 아니다.
- `assets:verify`는 assetmap `fileHashes`를 manifest `packagerHash` ∪ export metadata와 대조한다(`cli/build/assetsVerifyAsync.js:31–37,68,90`). 그래서 `verify-ios.txt`·`verify-android.txt`의 「All resolved assets found」는 뜻이 있다. `verify-new-*`의 10·9건은 열어 봤고 전부 반대 플랫폼 전용 파일(`*.android.png`/`*.ios.png`·MaterialIcons.ttf·google-signin-light-*) — 질문의 설명과 같다.
- 패턴을 읽는 곳은 `@expo/cli/build/src/export/exportAssets.js` 한 파일(grep). `export/embed/exportEmbedAsync.js:248,321`은 필터 없이 `persistMetroAssetsAsync` — 다음 네이티브 빌드에도 그림은 그대로 들어간다는 질문의 확인 3이 맞다.

권고
- 앞으로 OTA마다 누르기 전에 `assets:verify`를 한 번 돌리는 걸 ota 스크립트 옆에 두면 좋다. 코드에 새 시험 그림 require가 늘었는데 스토어 빌드에 없으면 그 그림만 빈 칸으로 뜨는데, 이 도구가 그걸 잡는 유일한 선이다(`verify-negative.txt`로 실제 거르는 건 확인됨). 이번 건은 `git diff 11c08a99..HEAD -- assets` 0줄이라 해당 없음.
- 안드 `hasEmbeddedUpdate` 기본값은 true(`UpdatesConfiguration.kt:185–187` `?: true`) — 건드리지 않았으니 그대로 둔다.

안 본 것: 실제 EAS 빌드 25·코드 13 안의 app.manifest와 번들 파일(로컬 재생성본으로 대조, 해시는 내용 md5라 같다고 봄 — 짐작) · iOS `hasEmbeddedUpdate` 기본값 줄 · expo-image 안드 네이티브가 리소스 이름 URI를 받는 코드(지금 스토어판과 같은 입력이라 같다고 봄 — 짐작) · 기기에서 OTA를 실제로 받아 그림이 뜨는지 돌려 보는 것.
