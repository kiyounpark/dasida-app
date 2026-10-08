# 첫 OTA가 파일 수 한도에 막혔다 — 어떻게 보내나 (2026-10-07)

## 결론 먼저

- **✅ 10.08 끝 — 10:16 발행(기윤 「OK, 눌러」) · 10:5x 기윤 TestFlight 25에서 「업데이트 01a11915」 보임 · 「잘 떠요」.** 그룹 `b1594395-8e8b-4bdb-8538-14a147276e09` · iOS `01a11915-9ed6-7fcc-…` · 안드 `01a11915-9ed6-7f83-…` · 환경값 줄에 PostHog 키 있음. A안은 실제로 됐다(빌드 25 + 시험 그림 뺀 OTA). 기록 정본 `docs/STATUS-archive.md` 「10.08 오전에 내림」 · 남은 것은 STATUS 「✅ 10.08 1.0.13」 줄.
- **10.08 실행 끝 — OTA 발행은 아직(첫 OTA라 기윤 OK 대기).** 커밋 `4f713b3c`(브랜치 `fix/ota-asset-patterns`에서 만들어 10.08 main 합침 · 리뷰는 rebase 전 같은 내용 `024f9287`에 걸었다) `app.config.js` `assetPatternsToBeBundled` = `assets/{auth,fonts,images,journey,quiz,review}/**` · `features/**` · `node_modules/**`. 묶음 파일 수 **iOS 41 · 안드 42**(빠진 건 `assets/exam` 1,184뿐) · `assets:verify` 빌드 25 커밋 `11c08a99`로 만든 app.manifest와 iOS·안드 둘 다 통과(플랫폼별로 따로 내보내야 깨끗 — 한 번에 내보내면 반대 플랫폼 파일 10·9건이 거짓으로 걸림) · 다음 네이티브 빌드는 패턴을 안 읽는다(`export:embed` 실제 실행 — 시험 그림 1,800개 그대로). 리뷰 astra(34,726토큰)·Fable(157,139토큰) 둘 다 「반드시 고칠 것: 없음」 → `q-review.md` · `astra-review-1.md` · `fable-review-1.md`. 증거 파일(질문지의 스크래치패드 경로는 지워짐) `~/dev/dasida-measure/2026-10-08-ota-asset-patterns/`.
- ⚠️ **10.08 바뀐 사정**: 1.0.12가 두 스토어에 떴다(안드 10.07 11:21 · 애플 10.08 새벽). 아래 Fable 셋째 이유 「사고 범위가 가장 작은 때가 지금」은 더는 안 맞는다 — OTA는 스토어 1.0.12 학생에게도 같이 간다. 결정(A)은 그대로.
- 앞으로: 시험 그림이 바뀌거나 늘면 = 새 빌드. 새 하위 폴더를 `assets/`에 만들면 패턴에 넣어야 OTA에 실린다(안 넣으면 그 그림은 앱 본체에만 있어야 뜬다).
- astra(`gpt-6-astra` · 54,581토큰) · Fable(190,324토큰) **둘 다 A** — 시험 그림을 OTA에서 빼고 보낸다. 갈리지 않아 2차 없음. (Claude는 묻기 전 기윤에게 B를 말했다 — 두 모델과 반대였다. A가 코드상 되는지 몰랐던 탓.)
- **A가 되는 근거(코드 · Claude 확인)**: `expo/node_modules/@expo/cli/build/src/export/exportAssets.js:97-107`이 `updates.assetPatternsToBeBundled`를 읽는다(빈 배열 = 전부). iOS는 OTA로 돌 때 빌드에 든 그림 목록부터 깐다(`expo-updates/ios/EXUpdates/AppLauncher/AppLauncherWithDatabase.swift:202-203`), 안드도 같은 길(Fable: `DatabaseLauncher.kt:119`). 빌드 25 뒤 `assets/` 변경 0건 — 뺀 그림은 빌드에 다 있다. 대조 도구 `expo-updates/cli/src/assetsVerify.ts` 있음. 되돌리기 `eas update:roll-back-to-embedded`.
- **조건**: 실제로 보내기 전 확인 — 묶음 파일 수 1,000 아래 · (가능하면) `assets:verify`로 빌드와 대조 · 기윤 TestFlight 25에서 받은 뒤 기출 그림·노트 카드·설정 8자리를 본다. 문제면 내장으로 되돌리고 B.
- 패턴은 「넣을 것만」 적는다(`!` 부정 패턴은 안 먹는다 — Fable, `exportAssets.js:133`).
- 3번(OTA를 쓸 수 있게 해 두는 일): 둘 다 패턴 자체는 젓가락급. astra는 「빌드별 내장 목록(app.manifest) 보존」은 예약급일 수 있다고(짐작).
- 숫자: 시험 그림 파일 1,802 · 고유 내용 1,186(Claude 셈 · Fable 1,800·1,184). 거절된 1,843은 플랫폼별로 같은 내용을 따로 센 것(Fable 짐작).
- 심사 기기도 OTA를 받는다(`checkOnLaunch` 기본 Always) — 둘 다 위험 작다고 봄(짐작).

원문: `q-decide.md` · `astra-1.md` · `fable-1.md`.
