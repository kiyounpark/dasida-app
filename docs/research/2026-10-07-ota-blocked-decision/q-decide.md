# 질문 — 첫 OTA가 파일 수 한도에 막혔다. 고친 것 셋을 학생에게 어떻게 보내나 (2026-10-07)

astra·Fable에 같은 질문(`docs/how-we-decide.md`). 갈리면 Fable 2차가 최종, 그 뒤 기윤(학생에게 가는 게 바뀌는 갈림길).

저장소: `/Users/baggiyun/dev/dasida-app` (main). **읽기만 한다 — 파일 수정·eas·git 변경·배포·알림 스크립트 실행 금지.**

## 지금 상태 (Claude 확인)

- 스토어: 학생은 1.0.11. **1.0.12**(iOS 빌드 25 · 안드 코드 13)는 10.07 제출 — 애플 「Waiting for Review」 · 안드 프로덕션 「검토 중」, 둘 다 통과 즉시 자동 출시. `docs/STATUS.md` 맨 위 줄·14줄.
- 초대 계획 🔒 10.05: 1.0.12가 두 스토어에 뜨면 다음 영상부터 「앱스토어에서 다시다 검색」. 11.18 관문(다른 날 두 번째 사진 3명)은 앱으로만 센다. 10.12에 첫 숫자를 본다. `docs/STATUS.md` 12·13줄.
- main(`6d4d8091`)엔 빌드 25 뒤로 학생 코드 셋이 합쳐져 있다 — 버전은 1.0.12 그대로(`app.config.js:7`, runtimeVersion appVersion):
  - **PR #57** 1.0.13 버그 둘 — ① 놓친 복습 「한 칸 내림」을 계정마다 한 번만(홈·복습 화면 동시 실행 경주) ② 알림 진입은 오늘(기기 날짜)까지인 과제만(밤에 아침 알림을 누르면 며칠 뒤 단계를 당겨 풀던 것). 1.0.12 빌드 전 리뷰에서 1.0.13으로 미룬 것 — 원문 `docs/research/2026-10-06-build-1012-go-nogo/fable-review-fix.md`. 리뷰 `docs/research/2026-10-07-1013-stepdown-entry-review/`. 10.07 시뮬레이터 확인(`docs/STATUS.md` PR #57 줄 「⑷」).
  - **PR #58** 노트 카드 「왜」 마지막 줄이 안 그려지던 것(3x 화면 · 글이 1024·2048pt 경계를 걸칠 때 · 흐름 끝 카드에서 실측) — `docs/research/2026-10-07-notecard-clip-review/README.md`.
  - **PR #59** 설정 버전 줄에 받은 OTA 표시(도착 확인용) — `docs/research/2026-10-07-ota-marker-review/README.md`.
- **첫 OTA 실패 (10.07 19:53)**: `npm run ota:production`(`package.json` scripts) → 묶음·업로드 끝 → 발행에서 서버 거절 「Each update is limited to a maximum of 1000 assets (attempted to publish 1843)」. CLI는 같은 출력에 「maximum: 2000 total per update」. 발행 0건(production 브랜치 업데이트 0개). 내보낸 파일 1,215종 중 `assets/exam` 시험 그림 1,184. `app.config.js:15` `assetPatternsToBeBundled: []` — 설명상 「비우면 전부 싣는다」(`node_modules/@expo/config-types/build/ExpoConfig.d.ts:212`). Claude는 `@expo/cli` 빌드 코드에서 이 키를 읽는 곳을 못 찾았다. **패턴으로 시험 그림을 빼면 그 그림을 앱 빌드(내장)에 든 것으로 대신 쓰는지는 확인 안 함.**
- 애플은 한 번에 한 버전만 심사한다(Claude 기억 — 원문 안 봄). EAS 무료 빌드 한도 iOS·안드 각 월 15, 10월 사용 iOS 약 6 · 안드 약 5(10.06 밤 5·4 + 10.07 각 1 — 짐작).

## 길 (Claude가 나눈 것 — 더 나은 길이 있으면 말하라)

- **A** OTA에서 시험 그림을 빼고(`assetPatternsToBeBundled`에 실제 패턴) 보낸다 — 빌드 25에 든 그림을 대신 쓴다는 전제. 지금은 1.0.12 설치본이 기윤 TestFlight·심사 기기뿐이라 먼저 시험할 수 있다.
- **B** OTA를 접고 1.0.12가 통과한 뒤 1.0.13 새 빌드(버전 올림)로 제출 — 1.0.12 학생은 1.0.13 통과까지 셋 없이 쓴다.
- **C** 심사 중인 1.0.12를 빼고 main(#57~59 포함) 빌드로 다시 제출 — 출시·초대가 밀린다.

## 묻는 것

1. 지금 무엇으로 보내나(A/B/C/다른 길) — 이유를 학생이 보는 것·일정·되돌리기 비용으로.
2. A가 실제로 되나 — `node_modules/expo-updates`·`expo-asset`·`@expo/cli`(또는 eas-cli)를 읽고, 빠진 그림이 내장본으로 풀리는지 코드 근거로. 확인 도구(예: `expo-updates assets:verify` 같은 것)가 이 버전에 있나.
3. 이번에 A를 안 하더라도, 앞으로 OTA를 쓸 수 있게 해 두는 일은 미룰수록 비싸지나(예약급) 아니면 나중에 해도 값이 같나(젓가락급).

## 답 형식

첫 줄에 「추천: A / B / C / 기타」. 그다음 이유 셋 안. 2번은 「된다 / 안 된다 / 모름」 + 파일:줄 근거(근거 없으면 짐작). 한국어 1,500자 안팎.
