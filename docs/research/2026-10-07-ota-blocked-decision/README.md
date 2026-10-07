# 첫 OTA가 파일 수 한도에 막혔다 — 어떻게 보내나 (2026-10-07)

## 결론 먼저

- astra(`gpt-6-astra` · 54,581토큰) · Fable(190,324토큰) **둘 다 A** — 시험 그림을 OTA에서 빼고 보낸다. 갈리지 않아 2차 없음. (Claude는 묻기 전 기윤에게 B를 말했다 — 두 모델과 반대였다. A가 코드상 되는지 몰랐던 탓.)
- **A가 되는 근거(코드 · Claude 확인)**: `expo/node_modules/@expo/cli/build/src/export/exportAssets.js:97-107`이 `updates.assetPatternsToBeBundled`를 읽는다(빈 배열 = 전부). iOS는 OTA로 돌 때 빌드에 든 그림 목록부터 깐다(`expo-updates/ios/EXUpdates/AppLauncher/AppLauncherWithDatabase.swift:202-203`), 안드도 같은 길(Fable: `DatabaseLauncher.kt:119`). 빌드 25 뒤 `assets/` 변경 0건 — 뺀 그림은 빌드에 다 있다. 대조 도구 `expo-updates/cli/src/assetsVerify.ts` 있음. 되돌리기 `eas update:roll-back-to-embedded`.
- **조건**: 실제로 보내기 전 확인 — 묶음 파일 수 1,000 아래 · (가능하면) `assets:verify`로 빌드와 대조 · 기윤 TestFlight 25에서 받은 뒤 기출 그림·노트 카드·설정 8자리를 본다. 문제면 내장으로 되돌리고 B.
- 패턴은 「넣을 것만」 적는다(`!` 부정 패턴은 안 먹는다 — Fable, `exportAssets.js:133`).
- 3번(OTA를 쓸 수 있게 해 두는 일): 둘 다 패턴 자체는 젓가락급. astra는 「빌드별 내장 목록(app.manifest) 보존」은 예약급일 수 있다고(짐작).
- 숫자: 시험 그림 파일 1,802 · 고유 내용 1,186(Claude 셈 · Fable 1,800·1,184). 거절된 1,843은 플랫폼별로 같은 내용을 따로 센 것(Fable 짐작).
- 심사 기기도 OTA를 받는다(`checkOnLaunch` 기본 Always) — 둘 다 위험 작다고 봄(짐작).

원문: `q-decide.md` · `astra-1.md` · `fable-1.md`.
