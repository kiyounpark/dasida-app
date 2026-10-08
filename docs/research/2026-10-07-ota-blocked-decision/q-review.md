# 질문 — OTA 그림 한도 A안 변경 리뷰 (2026-10-08)

> 아래 스크래치패드 경로의 증거 파일은 `~/dev/dasida-measure/2026-10-08-ota-asset-patterns/`로 옮겼다(`dist-new` → `dist-both`). 답: `astra-review-1.md` · `fable-review-1.md` — 둘 다 「반드시 고칠 것: 없음」.

저장소: /Users/baggiyun/dev/dasida-app (Expo SDK 54 · expo-updates ~29.0.17 · runtimeVersion appVersion · 버전 1.0.12)
리뷰할 커밋: `024f9287` (브랜치 `fix/ota-asset-patterns`) — `git show 024f9287`로 직접 볼 것. 바뀐 파일은 `app.config.js` 하나.

## 사정
- 10.07 19:53 첫 OTA(`npm run ota:production`)가 서버에서 거절됨: 「Each update is limited to a maximum of 1000 assets (attempted to publish 1843)」. 발행 0건.
- 원인은 시험 그림 `assets/exam`(파일 1,802 · 고유 내용 1,184). astra·Fable 둘 다 「A — 시험 그림을 OTA에서 빼고 보낸다」를 추천했고, 이 커밋이 그 실행이다. 결정 근거: `docs/research/2026-10-07-ota-blocked-decision/README.md` · `fable-1.md` · `astra-1.md`.
- **그 뒤에 바뀐 사실**: 1.0.12가 두 스토어에 출시됐다(안드 10.07 11:21 · 애플 10.08 새벽 — `git show 21ab5b7c` STATUS 변경). 그래서 이번 OTA는 TestFlight·심사 기기만이 아니라 **스토어에서 1.0.12를 받은 실제 학생**에게도 간다(production 채널).
- 빌드 25(iOS)·코드 13(안드)는 커밋 `11c08a99`에서 EAS로 만들었다. `git diff 11c08a99..HEAD -- assets`는 0줄.

## 바꾼 것
`updates.assetPatternsToBeBundled`를 `[]`(= 전부 싣기)에서 넣을 것만 적은 목록으로:
`assets/auth/**`, `assets/fonts/**`, `assets/images/**`, `assets/journey/**`, `assets/quiz/**`, `assets/review/**`, `features/**`, `node_modules/**`.
`assets/`의 하위 폴더는 auth·exam·fonts·images·journey·quiz·review 일곱 개뿐(맨 위에 png 4개가 있지만 코드가 require하지 않음 — 아래 assetmap에 없음).

## Claude가 돌려서 확인한 것 (증거 파일은 스크래치패드 `/private/tmp/claude-501/-Users-baggiyun-dev-dasida-app/5a6c1c6e-d74f-4352-8585-5f5193fa2e18/scratchpad/`)
1. `ota:production`과 같은 조건(셸 `EXPO_PUBLIC_*` 벗김 · `eas env:exec production` · `EXPO_NO_DOTENV=1`)으로 `expo export --dump-assetmap --platform ios --platform android --clear` → `dist-new/`. metadata.json의 플랫폼별 자산 수 **iOS 41 · 안드 42**(고유 경로 38·40). 빠진 것은 `assets/exam` 1,184개뿐, 나머지 31개 자산(node_modules 15 · fonts 8 · images 3 · auth 3 · review 1 · features/quiz 1)은 전부 들어감. 서버 env 24개 실림, PostHog 키·학습 기록 주소가 두 .hbc에 다 있음. 로그 `export-new.log`.
2. `assets:verify`(`node_modules/expo-updates/cli/build/cli.js assets:verify`): 빌드 25 커밋 `11c08a99`을 임시 worktree로 풀고(node_modules는 심링크) `node_modules/expo-updates/utils/build/createUpdatesResources.js <platform> <root> <dest> all node_modules/expo-router/entry.js`로 app.manifest를 만들어 대조 → `manifest-b25-ios/app.manifest`(1,837항목 · exam 1,800) · `manifest-b25-android/app.manifest`(1,842항목 · exam 1,800).
   - 두 플랫폼을 한 번에 내보낸 묶음(`dist-new`)으로 대조하면 iOS 10건·안드 9건 「없음」 — 전부 다른 플랫폼 전용 파일(`*.android.png`·`*.ios.png`, 구글 버튼 플랫폼별 png, iOS에선 MaterialIcons.ttf)이다. assetmap.json이 두 플랫폼 자산을 합쳐 담아서 생기는 것으로 봄(`verify-new-ios.txt`·`verify-new-android.txt`).
   - 플랫폼별로 따로 내보낸 묶음(`dist-ios`·`dist-android`)으로 대조하면 **iOS·안드 둘 다 「All resolved assets found」 · exit 0**(`verify-ios.txt`·`verify-android.txt`).
   - 반대 시험: 빈 app.manifest로 대조하면 exam 1,184개가 「없음」으로 잡힌다(`verify-negative.txt`) — 도구가 실제로 거른다.
   - 한계: manifest를 EAS 빌드에서 꺼낸 게 아니라 같은 커밋에서 로컬로 만든 것. 심링크 탓에 node_modules 자산의 경로 칸이 실제와 다르다(해시는 파일 내용 md5라 같다고 봄).
3. 다음 네이티브 빌드에서 시험 그림이 앱 본체에서 빠지나: 패턴을 읽는 곳은 `node_modules/expo/node_modules/@expo/cli/build/src/export/exportAssets.js`·`exportApp.js`뿐(grep). 네이티브 빌드는 `export:embed`(ios pbxproj 「Bundle React Native code and images」 · `android/app/build.gradle:21`)를 쓰고, `export/embed/exportEmbedAsync.js:248`은 자산 전부를 `persistMetroAssetsAsync`로 쓴다. 실제로 새 설정에서 `expo export:embed --platform ios|android --dev false --assets-dest …`를 돌리면 시험 그림 **1,800개 그대로**(iOS 1,835 · 안드 1,841 파일 · `embed-ios/`·`embed-android/`).

## 묻는 것 — 하나만
이 커밋 그대로 main에 합치고 `npm run ota:production`을 누르면 **학생 화면이 깨지거나(그림이 안 뜨는 등) 되돌리기 어려운 일이 생기는, 반드시 고칠 것**이 있나?
- 있으면: 무엇 · 왜 · 근거 파일:줄 · 어떻게 고치나. 위 확인이 틀렸으면 어디가 틀렸는지.
- 없으면 「반드시 고칠 것: 없음」 한 줄.
- 권고(있으면 좋은 것)는 따로 「권고」로 짧게 — 고칠 것과 섞지 말 것.
- A안을 할지 말지, OTA를 보낼지 말지는 다시 정하지 않는다(정해졌다). 이 변경이 맞게 됐는지만 본다.
- 숫자·「있다/없다」는 파일을 직접 열어 확인한 것만 말하고, 짐작이면 짐작이라고 적는다.
