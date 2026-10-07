# 리뷰 질문 — 설정 버전 줄 OTA 표시 (2026-10-07)

astra·Fable에 같은 질문(`docs/how-we-decide.md`). 학생 화면(설정)이 바뀌고 첫 OTA에 같이 실린다.

## 대상

- 저장소(worktree): `/Users/baggiyun/dev/dasida-app/.claude/worktrees/ota-marker` · 브랜치 `feat/ota-update-marker` · 커밋 `2b92a68f`(main `532a929c` 위 한 커밋)
- 보는 법: `/usr/bin/git -C <저장소> show 2b92a68f` · 바뀐 파일 셋 — `features/profile/update-label.ts`(새) · `features/profile/components/profile-screen-view.tsx`(import 둘 · 모듈 상수 한 줄 · 버전 줄) · `features/profile/__tests__/update-label.test.ts`(새)
- 참고: `node_modules/expo-updates/build/Updates.d.ts`(`isEnabled`·`updateId`·`isEmbeddedLaunch`) · `app.config.js`(runtimeVersion appVersion · updates) · `eas.json` · `package.json` `ota:production`

## 왜

첫 OTA(PR #57 1.0.13 버그 둘 + PR #58 노트 카드)를 1.0.12 스토어 출시 전에 먼저 보내, 지금 1.0.12를 가진 유일한 설치본(기윤 TestFlight 빌드 25 · 애플 심사 기기)에서 도착을 확인하려 한다. 그런데 앱에 지금 어떤 업데이트로 도는지 보여주는 곳이 0곳이다(Claude 코드 확인). 그래서 받은 업데이트로 돌 때만 「버전 1.0.12 · 업데이트 a1b2c3d4」(updateId 앞 8자리)를 붙인다. 이 줄 자체가 OTA에 실려 가므로, 폰에서 앱을 두 번 연 뒤 이 줄이 보이면 받은 것이다.

## 실측 (Claude)

tsc 0 · jest 1010/1010(새 3개) · 시뮬레이터 개발 빌드 설정 화면 「버전 1.0.12」 그대로(업데이트 꺼짐이라 붙지 않음 — OTA 붙은 모습은 실기기에서만 볼 수 있다).

## 질문

1. 빌드 25(스토어 1.0.12와 같은 네이티브)에서 이 JS가 OTA로 돌 때 깨질 길이 있나 — `expo-updates` import, 모듈 상수, iOS·안드 둘 다.
2. 「받은 업데이트일 때만」 조건(`isEnabled && !isEmbeddedLaunch && updateId`)이 맞나 — 내장 코드로 돌 때·업데이트가 꺼진 개발 빌드·롤백(내장으로 되돌림) 때 줄이 안 붙나? 8자리가 `eas update` 출력의 어느 값과 맞나?
3. 학생에게 보이는 문구로 문제 있나(설정 「앱 정보」 칸).
4. 이 표시 말고 도착 확인에 더 나은 길이 있나(새 빌드 없이).

## 답 형식

「반드시 고칠 것」(안 고치면 학생이 잘못 보거나 앱이 깨지는 것)과 「권고(기록만)」를 나눈다. 없으면 「반드시 고칠 것: 없음」. 모든 주장에 파일:줄 근거, 없으면 짐작이라고. 코드는 읽기만. 한국어 1,200자 안팎.
