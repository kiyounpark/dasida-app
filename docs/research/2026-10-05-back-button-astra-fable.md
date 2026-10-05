# 사진 화면 「< 홈」 탭 무반응 — 원인과 고침 (1.0.12 ⓪, 2026-10-05)

## 결론 먼저

- **원인:** react-native-screens 4.16의 iOS 26 전용 `navigationBar:shouldPopItem:`(`node_modules/react-native-screens/ios/RNSScreenStack.mm:225-247`)이 기본 뒤로 버튼을 탭하면 버튼을 끄고 YES를 돌려준다. 시트(ActionSheetIOS)나 사진첩을 띄웠다 닫은 뒤엔 UIKit 팝이 안 일어나서, 다시 켜는 `didPopItem:`(`:249-263`)이 안 돌고 버튼이 영영 꺼진다(lldb: `isUserInteractionEnabled = NO`, viewControllers 3개 그대로). 왜 팝이 안 일어나는지는 못 밝혔다. 4.17.0에서 이 코드가 통째로 빠졌다(업스트림 PR #3173). Expo SDK 54는 `~4.16.0` 고정.
- **같은 상태에서도 JS `router.back()`은 산다** (임시 버튼 실측) — 이게 고침의 근거.
- **고침 = E:** `photo`·`photo-notes`의 iOS 헤더를 끄고 맨 위 줄을 직접 그린다(`features/photo/components/photo-back-bar.tsx`). 커밋 `bc49da3`. 학생 화면의 카드·시트는 그대로.
- **거친 길:** 1차 두 모델 다 A(시트를 걷고 화면 안 두 버튼) → 구현해 보니 「들어가자마자 사진첩 → ✕」에서 2/2 재발(사진첩도 타이밍에 따라 같은 고장) → 2차 두 모델 다 E, A는 갈림(astra 되돌림 · Fable 남김) → Fable 최종 「A 되돌림」.
- **역사:** 08.26 `52f4da77`(카드형 사진첩 → FULL_SCREEN)이 같은 종류 고장을 한 번 고쳤고, 08.28 `654b4d7b`(카메라 갈래 + 시트)로 재발했다.
- **남은 것:** 기윤 실기기(1.0.12 빌드 뒤) · 안드로이드(헤더 없어진 뒤 기기 뒤로) · 카메라 · 사진 분석 뒤 대화 상태의 줄 위치.
- 토큰: 1차 astra 30,554 · Fable 139,383 / 2차 astra 26,479 · Fable 165,864(최종 판정 포함 누적 169,629) / 코드 리뷰 astra 37,047 · Fable 134,228.

## 실측 (Claude, 시뮬레이터 iPhone 17 Pro · iOS 26.5 · 개발 빌드)

| 판 | 코드 | 경로 | 「< 홈」 |
|---|---|---|---|
| 고치기 전 | 원래 | 사진 화면 들어가서 바로 | 됨 |
| 고치기 전 | 원래 | 카드 → 시트 → 바깥 눌러 닫기 | **안 됨 3/3** |
| 고치기 전 | 원래 | 카드 → 시트 → 앨범 → ✕ | **안 됨** |
| 고치기 전 | 원래 | lldb로 빈 VC 풀스크린 띄웠다 닫기 | 됨 |
| A | 시트 걷고 두 버튼 | 다 열린 뒤 앨범 → ✕ | 됨 2/2 |
| A | 시트 걷고 두 버튼 | 들어가자마자 앨범 → ✕ | **안 됨 2/2** |
| A | 죽은 상태 | 본문 임시 JS 버튼 `router.back()` | **됨** |
| E | 헤더 끄고 JS 줄 | 카드 → 시트 → 바깥 눌러 닫기 | 됨 2/2 |
| E | 헤더 끄고 JS 줄 | 들어가자마자 카드 → 시트 → 앨범 → ✕(닫히는 중 탭) | 됨 1/1 |
| E | 헤더 끄고 JS 줄 | 사진 → 지난 노트 「< 뒤로」 / 가장자리 스와이프 / 들어가자마자 「< 홈」 | 됨 · 한 장만 빠짐 |

다른 뒤로 가기(고치기 전 확인): 복습 「<」 두 곳 · 기출 「나가기」(Alert 띄웠다 닫은 뒤 포함) · 지난 노트 「< 뒤로」 · 스와이프 — 다 됨. 셋 다 화면 안 JS 버튼이라 이 고장과 무관.

## 1차 질문 원문

너는 DASIDA(수능 수학 오답 사진 → 분석 → 오답노트 → 복습 앱, Expo SDK 54 · RN 0.81.5 · expo-router 6.0.23 · react-native-screens 4.16.0, 1인 개발) 저장소 `/Users/baggiyun/dev/dasida-app`의 결정 자문이다. 파일은 읽기만 한다. 아무것도 고치지 않는다.

## 버그 (1.0.12 ⓪)
iOS 26 실기기(빌드 24 = 라이브 1.0.11)에서 사진 화면 왼쪽 위 「< 홈」(iOS 기본 헤더 뒤로 버튼)을 탭해도 반응이 없다. 왼쪽 가장자리 스와이프는 된다.

## Claude가 10.05 시뮬레이터(iPhone 17 Pro · iOS 26.5 · 개발 빌드)에서 확인한 것 — 전부 실측
1. 사진 화면에 들어가서 바로 「< 홈」 → **된다.**
2. 사진 카드 탭 → `ActionSheetIOS` 시트(「사진 찍기 / 앨범에서 고르기」, `features/photo/flow/ask-photo-source.ts:22`)가 뜬다 → 바깥을 눌러 닫음 → 「< 홈」 → **안 된다**(3회 재현). 「앨범에서 고르기」 → 사진 고르기 창 ✕로 닫음 → 「< 홈」도 안 된다. 즉 **사진을 올리는 모든 학생이 시트를 거치므로, 올린 뒤에는 그 사진 화면에서 「< 홈」이 죽는다.**
3. 한번 죽으면 계속 죽는다. 「지난 오답노트」로 갔다가(push) 「< 뒤로」로 돌아오면 다시 산다. 스와이프는 항상 된다. 화면 안의 다른 버튼은 다 눌린다.
4. lldb로 붙어서 본 것:
   - 시트를 열기 전·연 동안·닫은 직후: 뒤로 버튼 뷰(`rnscreens_findBackButtonWrapperView`, `_UIButtonBarButton`)의 `isUserInteractionEnabled` = **YES**, `transitionCoordinator` = nil.
   - 그 상태에서 「< 홈」을 한 번 탭한 뒤: `isUserInteractionEnabled` = **NO**, `viewControllers` 3개 그대로(위 = 사진 화면) — **팝이 안 일어났는데 버튼만 꺼졌다.**
   - 버튼을 끄는 곳은 `node_modules/react-native-screens/ios/RNSScreenStack.mm:225-247` 하나뿐(iOS 26 전용 `navigationBar:shouldPopItem:` — transitionCoordinator가 nil이면 버튼을 끄고 YES). 다시 켜는 곳은 `:249-263` `didPopItem:` — 팝이 끝나야만 돈다. 그래서 팝이 한 번 실패하면 버튼이 영영 꺼진다.
   - shouldPopItem에 멈추는 브레이크포인트를 건 채 탭하면 YES를 돌려주고 그때는 팝이 됐다(디버거가 타이밍을 바꾼 것으로 짐작). **왜 시트 뒤에 UIKit이 팝을 안 하는지는 못 밝혔다.**
   - lldb로 루트 VC에서 빈 `UIViewController`를 풀스크린으로 띄웠다 닫은 뒤엔 「< 홈」이 **됐다.** → 모든 모달이 아니라 이 액션시트(iOS 26에선 가운데 팝오버 모양, RN이 `sourceView = 루트 VC view`로 띄움 — `node_modules/react-native/React/CoreModules/RCTActionSheetManager.mm:49-63`)가 방아쇠로 보인다.
5. 업스트림: react-native-screens **4.17.0에서 이 shouldPopItem/didPopItem 코드가 통째로 빠졌다**(PR #3173 「Handle interactiveContentPopGesture for iOS 26」 — 대신 전환 중 화면 전체 상호작용을 막는 방식). 같은 증상 이슈는 못 찾았다. Expo SDK 54는 `react-native-screens ~4.16.0`을 고정한다(`node_modules/expo/bundledNativeModules.json:108`). 저장소에 patch-package 없음.

## 범위
- iOS 26 기본 헤더를 쓰는 화면은 `photo`(「< 홈」)와 `photo-notes`(「< 뒤로」) 둘뿐(`app/_layout.tsx:263-275`). `quiz` 쪽은 헤더도 스와이프도 꺼져 있고 화면 안 JS 버튼으로 돌아간다. 액션시트를 쓰는 곳은 사진 화면 하나.
- iOS 18 이하·안드로이드는 이 코드 경로가 없다(`@available(iOS 26)`). 안드는 안 봤다.

## 제약
- 🔒 10.05: 먼저 나가는 1.0.12 = ⓪ + ① + ② + 서버 과제 모양 + 쪽지 저장 → 두 스토어에 뜨면 영상 끝을 「앱스토어에서 다시다 검색」으로(신규 학생 초대).
- OTA(EAS Update)는 켜져 있다(`app.config.js:13`, runtimeVersion = appVersion). 아직 한 번도 안 보냈다. JS만 바꿀 수 있고, 스토어에서 새로 깐 학생은 첫 실행엔 내장 코드로 돈다.
- 네이티브 변경 → `npx expo prebuild --clean` + 스토어 빌드·심사.
- 학생은 아직 거의 없다. 1인 개발.

## 질문
⓪을 어떻게 고칠까. 후보(다른 안이 낫다면 제시해도 된다):
- **A.** 액션시트를 앱 화면 안의 선택(예: 업로드 화면에 「사진 찍기」·「앨범에서 고르기」 두 버튼, 또는 JS 바텀시트)으로 바꾼다 — JS만, OTA 가능. 방아쇠를 피하는 것이지 라이브러리 결함은 그대로.
- **B.** react-native-screens를 4.17+로 올린다 — 결함 자체가 사라짐. SDK 54 고정 버전을 벗어남, 네이티브.
- **C.** patch-package로 4.16의 iOS 26 shouldPopItem/didPopItem(또는 버튼 끄는 두 줄)만 뺀다 — 네이티브, 최소 변경.
- **D.** 헤더 왼쪽에 JS 뒤로 버튼(`headerLeft` → `router.back()`)을 직접 단다 — JS만, OTA 가능.

## 답 형식
- 맨 위 「결론 먼저」: 안 하나 + 이유 한 줄.
- 각 안마다: ⑴ 고쳐지는 범위(학생 화면 기준) ⑵ 깨질 수 있는 것 ⑶ OTA로 라이브 1.0.11 학생에게도 닿나.
- 고른 안을 **어떻게 검증할지**(시뮬레이터·실기기에서 무엇을 눌러 볼지) 목록.
- 근거마다 파일:줄. 근거 없는 주장 금지. 확인 못 한 건 "확인 못 함"이라고 적어라.
- 한국어. 2,000자 안쪽. 개발자는 쉬운 말을 원한다 — 전문 용어는 한 줄로 풀어라.

## 1차 astra 답 원문 (`gpt-6-astra` · 30,554토큰)

**결론 먼저: A — 화면 안에 「사진 찍기 / 앨범에서 고르기」 두 버튼을 둔다.** 제시된 실측에서 확인된 방아쇠를 없애면서, 1.0.12의 네이티브 변경·검증 부담을 줄일 수 있다.

단, **A의 해결 여부도 아직 확인 못 함**이다. 사진 선택창 자체만 열었다 닫는 검증이 필요하다. 아래 재현 결과는 제공받은 실측이며, 나는 코드만 확인했다.

근거 경로를 줄여 쓰면:
- `S` = `node_modules/react-native-screens/ios/RNSScreenStack.mm`
- `H` = `node_modules/@react-navigation/native-stack/src/views/useHeaderConfigProps.tsx`

**A. 화면 안 두 버튼 — 추천**

⑴ 사진 선택 시 `ActionSheetIOS`를 거치지 않게 해 「< 홈」 고장의 확인된 방아쇠를 제거한다(`features/photo/flow/ask-photo-source.ts:22`). 새 바텀시트보다 두 버튼을 권한다.

⑵ 선택 처리 변경 중 연속 탭 방지·취소 후 재시도가 깨질 수 있다(`features/photo/hooks/use-photo-flow.ts:103`). 카메라·앨범은 여전히 시스템 창이므로 단독 검증해야 한다. 현재 둘 다 전체 화면으로 여는 설정이다(`features/photo/flow/analyze-photo-request.ts:30`).

⑶ **OTA 가능**, 아래 배포 조건 적용.

**B. 4.17+ 업그레이드**

⑴ 제공된 정보대로라면 사진·지난 노트에서 버튼을 영구 비활성화하는 코드가 사라진다. 하지만 **최초 팝 실패까지 고쳐진다는 보장은 없다**. 돌아가기 실패 원인은 아직 미확인이다(`S:225`, `S:249`). 4.17 변경 원문은 이번 조회에서 확인 못 함.

⑵ Expo 지정 범위 `~4.16.0`을 벗어나므로 화면 전환 호환성 검증이 늘어난다(`node_modules/expo/bundledNativeModules.json:108`). 실제 충돌은 확인 못 함.

⑶ **OTA 불가**, 새 스토어 빌드 필요.

**C. 4.16 부분 패치**

⑴ 버튼 끄는 코드만 빼면 영구 잠김은 막지만, 첫 탭의 팝 실패는 남을 수 있다(`S:237`). 메서드 전체 삭제도 해결 여부 확인 못 함.

⑵ 기존 코드는 연타로 여러 화면이 빠지는 것을 막으려던 장치다. 삭제하면 그 보호가 약해질 수 있다(`S:228`). 패치 유지관리도 맡아야 한다.

⑶ **OTA 불가**, 새 스토어 빌드 필요.

**D. 직접 만든 뒤로 버튼**

⑴ `photo`와 `photo-notes`에 적용하면 기본 버튼 대신 JS로 돌아가기를 요청한다(`app/_layout.tsx:266`). 기본 버튼은 `headerBackVisible: false`로 숨긴다(`H:397`, `H:501`). **시트 뒤 실제 작동은 확인 못 함**.

⑵ 연타, 터치 영역, 음성 안내를 직접 검증해야 한다. 액션시트는 남으며, 긴 누르기 등 기본 뒤로 버튼 경험도 별도 고려가 필요하다.

⑶ **OTA 가능**.

OTA는 JS 코드를 내려받는 업데이트다. A·D도 **1.0.11용 runtime과 연결된 배포 채널**로 보내야 한다. 1.0.12 업데이트가 자동으로 1.0.11에 닿지는 않는다(`app.config.js:17`, `eas.json:45`; [Expo 설명](https://docs.expo.dev/eas-update/runtime-versions/)). 빌드 24의 실제 채널 연결·수신은 확인 못 함. 신규 학생의 첫 실행을 위해 수정은 **1.0.12 내장 코드에도 포함**한다.

**A 검증 목록**

- iOS 26.5 시뮬레이터: 진입 직후, 앨범 취소·선택 후 각각 「< 홈」. 매번 새로 진입해 3회.
- 문제의 iOS 26 실기기: 위 순서와 카메라 취소·촬영, 권한 거부 후 재시도.
- 분석→노트 저장 후 「< 홈」, 지난 노트 왕복, 가장자리 스와이프 완료·중간 취소.
- 두 선택 버튼 연타 시 창·분석이 중복 실행되지 않는지.
- iOS 18·Android에서도 취소·재시도·뒤로가기 확인.
- 1.0.12 배포 후보를 새로 설치해 첫 실행 검증. OTA를 쓰면 1.0.11 수신·재실행 후에도 별도 검증.

파일 변경·배포는 하지 않았다.

## 1차 Fable 답 원문 (139,383토큰)

(아래 「Fable 원문 모음」 1)

## 2차 질문 원문

너는 DASIDA(Expo SDK 54 · RN 0.81.5 · expo-router 6.0.23 · react-native-screens 4.16.0, 1인 개발) 저장소 `/Users/baggiyun/dev/dasida-app`의 결정 자문이다. 파일은 읽기만 한다. 아무것도 고치지 않는다.

## 2차 질문 — 1차 답(A)을 실제로 해 봤더니 반만 됐다
1차 질문·답: 아래 「1차 요약」. 너희 둘(astra·Fable) 다 **A(액션시트를 걷고 화면 안 두 버튼)**를 골랐다. 그대로 구현했다(작업 트리, 커밋 전 — `git diff`로 볼 수 있다: `features/photo/components/photo-upload-view.tsx`, `features/photo/hooks/use-photo-flow.ts`, `ask-photo-source.ts` 삭제, 테스트들). 테스트 932 통과 · tsc 0.

## 10.05 시뮬레이터(iPhone 17 Pro · iOS 26.5 · 개발 빌드)에서 A를 잰 결과 — 실측
매 판 앱을 껐다 켜서 깨끗한 상태로 시작(한번 죽은 뒤로 버튼 상태는 다른 화면으로도 이어지기 때문).
| 판 | 경로 | 「< 홈」 |
|---|---|---|
| 1 | 사진 화면 들어가 화면이 다 열린 뒤 「앨범에서 고르기」 → 사진첩 ✕ | 됨 |
| 2 | 들어가자마자(밀려 들어오는 애니메이션 중) 「앨범에서 고르기」 → ✕ | **안 됨** |
| 3 | 1과 같음 | 됨 |
| 4 | 2와 같음 | **안 됨** |
- 안 된 판을 lldb로 보면 1차 때와 똑같다: 뒤로 버튼 뷰 `isUserInteractionEnabled = NO`, `viewControllers` 3개 그대로, `transitionCoordinator` nil, `presentedViewController` nil. → 시트가 아니라도, **전체화면 사진첩도 타이밍에 따라 같은 고장을 낸다.** A는 방아쇠 하나(시트, 1차 때 3/3 재현)를 없앴지만 다 없애지 못했다.
- **결정적 실측**: 4판의 죽은 상태에서, 화면 본문에 임시로 단 JS 버튼(`router.back()`)을 누르면 **바로 홈으로 갔다.** (임시 코드는 지웠다.) 1차 때도 기출 화면의 「나가기」(Alert를 띄웠다 닫은 뒤 JS `router.back()`)는 됐다. 즉 네이티브 뒤로 버튼의 탭 경로(`RNSScreenStack.mm:225-263` shouldPopItem/didPopItem)만 죽고, JS에서 부르는 팝은 산다.
- 화면 안 다른 버튼·가장자리 스와이프는 항상 됐다.

## 1차 요약 (원문 근거)
- 원인 사슬: iOS 26에서 「< 홈」 탭 → react-native-screens 4.16의 `navigationBar:shouldPopItem:`(`node_modules/react-native-screens/ios/RNSScreenStack.mm:225-247`)이 버튼을 끄고 YES → 그런데 UIKit 팝이 안 일어남(이유는 못 밝힘) → 다시 켜는 `didPopItem:`(`:249-263`)이 안 돌아 영구히 죽음. 4.17.0에서 이 코드가 통째로 빠짐(업스트림 PR #3173). Expo SDK 54는 `~4.16.0` 고정.
- 같은 종류의 고장을 08.26 `52f4da77`(카드형 사진첩 → FULL_SCREEN)에서 한 번 고쳤고, 08.28 `654b4d7b`이 액션시트를 넣으며 재발.
- iOS 기본 헤더를 쓰는 화면은 `photo`(「< 홈」)·`photo-notes`(「< 뒤로」) 둘뿐(`app/_layout.tsx:263-275`). 나머지(복습·기출 등)는 헤더를 끄고 화면 안에 직접 그린 뒤로 버튼을 쓴다 — 예: `features/quiz/components/review-session-screen-view.tsx:110-118`(`IconSymbol chevron.left` + 제목 「오늘의 복습」). 이 화면들 뒤로는 1차 때 다 됐다.
- OTA 켜져 있음(`app.config.js:13`, runtimeVersion=appVersion, 아직 한 번도 안 보냄). 🔒 10.05: 1.0.12(⓪①②+서버 모양+쪽지 저장)가 두 스토어에 뜨면 신규 학생 초대.

## 질문
⓪을 이제 어떻게 마무리할까. 후보(다른 안이 낫다면 제시):
- **E.** `photo`·`photo-notes`의 iOS 헤더를 끄고(`headerShown: false`), 복습 화면처럼 화면 안에 「< 홈」/「< 뒤로」 줄을 직접 그려 `router.back()`(또는 canGoBack 아니면 홈으로 replace)을 부른다. JS만 · OTA 가능. 스와이프는 남는다(헤더와 별개 — 확인 필요하면 근거를 대라).
- **D.** iOS 헤더는 두고 `headerLeft`에 JS 버튼을 단다. JS만 · OTA 가능. 헤더 안 JS 버튼이 iOS 26 유리 헤더에서 어떻게 보이고 눌리는지는 확인 못 함.
- **C.** patch-package로 4.16의 shouldPopItem/didPopItem을 뺀다(네이티브, 스토어 빌드). 첫 탭 팝 실패 자체가 고쳐지는지는 확인 못 함.
- 그리고 **A(시트 걷기)를 남길지 되돌릴지.** E/D로 가면 시트는 더 이상 「< 홈」을 죽일 수 없다(JS 뒤로는 시트 뒤에도 산다는 게 위 실측). 되돌리면 학생 화면은 원래 카드 한 장으로 돌아가고 바뀌는 파일이 줄어든다.

## 답 형식
- 맨 위 「결론 먼저」: 안 하나(+A 남김/되돌림) + 이유 한 줄.
- 각 안: ⑴ 고쳐지는 범위(학생 화면 기준) ⑵ 깨질 수 있는 것 ⑶ 손댈 파일.
- 고른 안의 **검증 목록**(시뮬레이터에서 무엇을 어떤 순서로 — 위 표의 2·4판 "들어가자마자 사진첩"을 반드시 포함).
- 근거마다 파일:줄. 근거 없는 주장 금지. 확인 못 한 건 "확인 못 함".
- 한국어. 1,800자 안쪽. 개발자는 쉬운 말을 원한다.

## 2차 astra 답 원문 (`gpt-6-astra` · 26,479토큰)

결론 먼저: **E + A 되돌림.** 죽은 상태에서도 작동한 본문 JS 뒤로가기를 두 화면에 적용하고, 사진 선택은 원래 카드로 돌린다. 근거는 제공한 4판 실측이며, E 적용 후 성공은 아직 확인 못 함.

아래 경로는 저장소 기준. `사진/`은 `features/photo/`, `네이티브`는 `node_modules/react-native-screens/ios/RNSScreenStack.mm`이다.

**E — 추천**

⑴ 사진·지난 노트에서 기본 뒤로 버튼 탭 경로를 우회한다. 원인 자체를 고치는 것은 아니다. 버튼 비활성화·복구 코드는 `네이티브:225–263`. 본문 버튼 선례는 `features/quiz/components/review-session-screen-view.tsx:108–118`.

⑵ 위쪽 여백과 제목을 직접 챙겨야 한다. 특히 지난 노트는 로딩·오류·빈 목록에서도 뒤로 줄이 있어야 한다(`사진/screens/photo-notes-screen.tsx:43–88`). 사진도 업로드·분석·대화 상태 공통으로 배치한다(`사진/screens/photo-flow-screen.tsx:52–91`). `canGoBack()`이면 back, 아니면 홈으로 replace를 권한다.

⑶ `app/_layout.tsx:264–273`, 위 두 screen, 공용 뒤로 줄 컴포넌트와 화면 테스트. iOS만 바꾸면 Android 헤더와 중복되지 않게 분기한다.

스와이프 허용 조건은 헤더 표시가 아니라 `gestureEnabled`·스택 깊이·모달 여부다(`네이티브:1247–1258`). **코드상 유지 가능하나 E 적용 실측은 확인 못 함.**

**D**

⑴ JS 버튼으로 기본 뒤로 탭을 우회할 수 있다. `headerLeft`는 헤더 내부 뷰로 들어간다(`node_modules/@react-navigation/native-stack/src/views/useHeaderConfigProps.tsx:397–400`).

⑵ iOS 26 유리 헤더의 모양·터치 정상 여부는 확인 못 함. E보다 이번 실측과 다른 조건이 남는다.

⑶ `app/_layout.tsx:264–273`, 헤더 버튼과 테스트. 기본 뒤로 버튼도 명시적으로 숨긴다.

**C**

⑴ 버튼을 영구 비활성화하는 코드 제거. **첫 탭에서 팝이 안 되는 현상까지 해결되는지는 확인 못 함**(`네이티브:225–263`).

⑵ 연타·전환 중 팝을 막던 보호도 없어진다(:228–230). 두 화면 밖 스택까지 회귀 검증이 필요하다.

⑶ 해당 네이티브 파일용 `patches/` 패치, `package.json`·잠금 파일·설치 설정. 네이티브 재빌드가 필요하다.

**A 되돌림**

카드·시트 선택 흐름을 복원한다. 대상은 `사진/components/photo-upload-view.tsx:41`, `사진/hooks/use-photo-flow.ts:103`, 삭제된 `flow/ask-photo-source.ts`와 관련 테스트·타입 변경. FULL_SCREEN은 유지한다(`사진/flow/analyze-photo-request.ts:30–36`). 시트 후 JS 팝 성공은 제공 실측이며, 복원한 조합은 재검증해야 한다.

**검증 순서**

1. 매 판 앱 재시작. 진입 완료 → 카드 → 앨범 → ✕ → 본문 「홈」.
2. **진입 애니메이션 중 즉시 카드 → 앨범 → ✕ → 「홈」**. 1·2를 번갈아 각각 3회.
3. 시트 취소·사진 선택·권한 거부 후 뒤로. 분석·대화 중에도 확인.
4. 지난 노트의 로딩·오류·빈 목록·정상 목록 → 「뒤로」 → 사진 → 「홈」.
5. 양 화면 가장자리 스와이프 완료·중간 취소, 뒤로 연타, 이전 화면 없는 진입 확인.
6. 재시작 없이 반복해 다른 화면까지 영향이 남는지 확인. 카메라는 실기기로 별도 검증.

파일 수정·테스트 실행은 하지 않았다.

## 코드 리뷰 요청 원문

너는 DASIDA(Expo SDK 54 · RN 0.81.5 · expo-router 6.0.23 · react-native-screens 4.16.0) 저장소 `/Users/baggiyun/dev/dasida-app`의 코드 리뷰어다. 파일은 읽기만 한다. 아무것도 고치지 않는다.

## 리뷰할 것
작업 트리 변경(커밋 전). `git diff`로 본다(새 파일 둘은 intent-to-add라 diff에 나온다). 7파일 +171 −11.
- `app/_layout.tsx` — `photo`·`photo-notes`의 iOS 기본 헤더를 끔(`headerShown: false`).
- 새 `features/photo/components/photo-back-bar.tsx` — 맨 위 「< 홈」/「< 뒤로」 줄. `SafeAreaView edges={['top']}` + `router.canGoBack() ? back() : replace('/(tabs)/quiz')`.
- `features/photo/screens/photo-flow-screen.tsx` — 그 줄을 맨 위에.
- `features/photo/screens/photo-notes-screen.tsx` — 다섯 상태(읽는 중·서버 대기·서버 실패·빈 목록·목록) 모두에 그 줄.
- `jest.setup.js` — expo-router 목에 `back`·`canGoBack`.
- 테스트 둘(새 `photo-back-bar.test.tsx`, `photo-notes-screen.test.tsx`에 한 개).

## 왜 (1.0.12 ⓪, astra·Fable 2차 합의 → A 되돌림은 Fable 최종)
iOS 26 실기기·시뮬레이터에서 사진 화면 iOS 기본 뒤로 버튼이 시트(ActionSheetIOS)·사진첩(전체화면)을 띄웠다 닫은 뒤 영구히 죽었다. react-native-screens 4.16 `RNSScreenStack.mm:225-263`이 탭 때 버튼을 끄고 팝이 안 일어나 다시 안 켜짐. 같은 상태에서 JS `router.back()`은 살았다(lldb·임시 버튼 실측). 그래서 두 화면의 헤더를 끄고 뒤로를 JS로 그렸다.

## 확인한 것 (Claude, 10.05)
- tsc 0 · jest 116 suites / 944 tests 통과(전 940 + 새 4).
- 시뮬레이터 iPhone 17 Pro · iOS 26.5 · 개발 빌드: 사진 화면 줄 위치(상태바 아래) · 카드→시트→바깥 눌러 닫기→「< 홈」 2/2 · 들어가자마자 카드→시트→앨범→✕→「< 홈」(사진첩 닫히는 애니메이션 중에 눌러도) 1/1 · 사진→지난 노트→「< 뒤로」→사진 · 가장자리 스와이프 → 홈 · 들어가자마자 「< 홈」 연타 없이 한 번 → 한 장만 빠짐(탭 바 보이는 홈).
- 안 본 것: 안드로이드(헤더가 없어진 뒤 기기 뒤로 버튼) · 카메라(시뮬레이터 없음) · 다크 모드 · 아이패드 가로 · 대화(chat) 상태에서 줄 위치 · 지난 노트 서버 대기/실패 상태 화면.

## 리뷰 규칙
- **「반드시 고칠 것」(학생이 갇히거나 깨지는 것, 데이터 손실, 테스트가 거짓 통과)만 고칠 것으로 올린다.** 나머지는 「권고」로 따로, 짧게.
- 근거마다 파일:줄. 확인 못 한 건 "확인 못 함".
- 특히 볼 것: ⑴ 위 여백(SafeArea)이 상태별로 겹치거나 두 번 들어가는지(`photo-flow-screen.tsx`는 바깥이 `edges={['bottom']}`, chat 상태 ScrollView `contentInsetAdjustmentBehavior="automatic"`) ⑵ 안드로이드에서 기기 뒤로 버튼·모양 회귀 ⑶ `canGoBack` 거짓일 때 replace 대상이 맞는지(다른 화면들 `use-weakness-detail-screen.ts:82-83`) ⑷ 이 화면을 여는 길(`use-quiz-hub-screen.ts:208,212` · `use-result-screen.ts:177` · 알림 `notification-route`)에서 깨지는 것 ⑸ 사진 흐름 대본이 언마운트로 끊기는 것(`use-photo-flow.ts:93-101`)과 상호작용 ⑹ 테스트가 진짜를 재는지.
- 답 형식: 맨 위 「반드시 고칠 것: 없음」 또는 목록. 그다음 「권고」. 한국어, 1,500자 안쪽.

## 코드 리뷰 astra 원문 (`gpt-6-astra` · 37,047토큰)

반드시 고칠 것: 없음

읽은 diff에서 학생을 가두거나 데이터를 잃게 하는 새 결함, 테스트가 검증 대상 없이 통과하는 문제는 찾지 못했습니다.

- 상단 SafeArea는 새 바, 하단은 화면이 담당하며 지난 노트 다섯 상태에 모두 바가 있습니다([사진 화면:54](/Users/baggiyun/dev/dasida-app/features/photo/screens/photo-flow-screen.tsx:54), [지난 노트:45](/Users/baggiyun/dev/dasida-app/features/photo/screens/photo-notes-screen.tsx:45)).
- fallback은 기존 약점 상세와 같은 `/(tabs)/quiz`입니다([뒤로 바:18](/Users/baggiyun/dev/dasida-app/features/photo/components/photo-back-bar.tsx:18), [기존 구현:82](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-weakness-detail-screen.ts:82)). 알림은 현재 사진 화면을 직접 열지 않습니다([알림 경로:8](/Users/baggiyun/dev/dasida-app/features/quiz/notifications/notification-route.ts:8)).
- JS 뒤로가기도 화면을 pop하므로 기존 언마운트 시 대본 정리와 충돌하는 변경은 없습니다([정리:93](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:93)).

권고

- **미검증 화면 확인:** chat의 자동 inset과 상단 바 조합은 코드만으로 여백 중복을 확정할 수 없습니다([chat:68](/Users/baggiyun/dev/dasida-app/features/photo/screens/photo-flow-screen.tsx:68)). Android 기기 뒤로·모양, 카메라 복귀, 다크 모드·iPad 가로도 실행 확인 못 함. 헤더 변경은 양 플랫폼에 적용됩니다([레이아웃:267](/Users/baggiyun/dev/dasida-app/app/_layout.tsx:267)).
- **테스트 보강:** 새 테스트는 실제 버튼의 라우터 호출을 검사합니다. 다만 서버 대기·실패 상태의 뒤로 버튼은 검사하지 않으므로 두 상태도 추가하면 좋겠습니다([상태 테스트:150](/Users/baggiyun/dev/dasida-app/features/photo/screens/__tests__/photo-notes-screen.test.tsx:150)). 네이티브 복귀·레이아웃은 Jest 검증 범위 밖입니다.
- **문구:** 결과 화면에서 진입하면 「홈」이 실제로는 결과 화면으로 돌아갑니다. 「뒤로」가 더 정확합니다([진입:177](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-result-screen.ts:177), [표시:56](/Users/baggiyun/dev/dasida-app/features/photo/screens/photo-flow-screen.tsx:56)).
- 개발용 `/dev/photo-flow`에는 기존 헤더도 남아 제목 줄이 두 개 됩니다([개발 레이아웃:10](/Users/baggiyun/dev/dasida-app/app/dev/_layout.tsx:10)).

파일 수정·테스트 재실행 없이 읽기만 했습니다.

## Fable 원문 모음

### 1. 1차 Fable 답 (139,383토큰)

**결론 먼저 — A(화면 안 선택, 모달 없이).** 같은 벽을 08.26에 이미 넘었다: 카드형 사진첩을 닫으면 「< 홈」이 죽어 FULL_SCREEN으로 바꿨고(`52f4da77`, `features/photo/flow/analyze-photo-request.ts:31-36`), 이틀 뒤 들어온 액션시트(`654b4d7b`)가 같은 종류의 "전체화면 아닌 창"이라 두 번째로 걸린 것. 전체화면 창은 안전(10.05 lldb·08.26 고침), 화면 안 버튼은 시트 뒤에도 눌린다(10.05 관찰 3). JS만이라 OTA도 된다.

**A.** ⑴ 사진 화면 전체 — 선택 창이 없어지면 학생 길엔 전체화면 창(사진첩·카메라, `analyze-photo-request.ts:36,78`)만 남는다. ⑵ iOS를 `Alert.alert`로 바꾸는 건 피할 것 — 시트와 같은 UIAlertController(iOS 알림창 부품)라 같은 방아쇠인지 확인 못 함. RN `<Modal>`도 네이티브 창이라 피하고 그냥 View로, 두 플랫폼 같은 코드. 결함은 남아서 photo·photo-notes(`app/_layout.tsx:266-274`)에 전체화면 아닌 창을 다시 넣으면 재발. `ask-photo-source.ts:16-17`의 busyRef 함정은 창과 함께 없어짐. 손댈 곳: `ask-photo-source.ts`(삭제) · `use-photo-flow.ts:111`(start에 source 인자) · `photo-upload-view.tsx:40-47`(카드→두 버튼) · 테스트 3개(`flow/__tests__/ask-photo-source.test.ts`, `hooks/__tests__/use-photo-flow-cloud.test.tsx`, `screens/__tests__/photo-flow-screen.test.tsx`). ⑶ 닿는다 — 버전 1.0.11·runtimeVersion=appVersion(`app.config.js:7,17-19`), production 채널(`eas.json` build.production.channel). 단 첫 OTA라 파이프라인 자체가 미검증이고, 버전을 1.0.12로 올리기 전에 보내야 한다. 학생이 거의 없으니 안 보내고 1.0.12로 덮어도 된다.

**D.** ⑴ 사진 화면 「< 홈」만 — 방아쇠가 뭐든 네이티브 버튼을 안 쓰니 면역. ⑵ headerLeft(헤더 왼쪽에 내가 그리는 버튼)를 주면 네이티브 뒤로 버튼은 자동으로 숨고(`useHeaderConfigProps.tsx:335-339` → `RNSScreenStackHeaderConfig.mm:319-323`) 스와이프는 남는다(`RNSScreenStack.mm:524`). 그러나 iOS 26 유리 헤더에서 JS 버튼이 어떻게 보이는지, 시트 뒤 헤더가 JS 터치를 받는지 확인 못 함 — 08.26 기록은 "헤더만 터치 못 받음", 10.05 lldb는 "탭이 버튼엔 닿음"으로 갈린다. photo-notes는 네이티브 그대로라 두 화면 모양이 달라진다. ⑶ 닿는다(A와 같음).

**B.** ⑴ 결함 자체 제거 — 단 "4.17에서 빠졌다"는 인터넷 없이 확인 못 함(node_modules에 변경기록 없음). ⑵ SDK 54 고정(`bundledNativeModules.json:108`, `package.json:81`)을 벗어나 expo-router 6.0.23·탭·퀴즈까지 네이티브가 바뀜, 호환 확인 못 함. ⑶ 안 닿음.

**C.** ⑴ 버튼 끄는 줄(`RNSScreenStack.mm:237`)만 빼면 실패 뒤 재시도는 되지만 첫 탭이 되는지는 확인 못 함 — 10.05엔 버튼이 켜진 채 첫 탭이 실패했다. ⑵ 이 코드의 목적 "연타 시 두 화면 팝 방지"(`:228-229`)가 사라져 photo-notes 「< 뒤로」 연타가 홈까지 갈 수 있음(실제 그런지 확인 못 함). patch-package(설치 뒤 node_modules를 자동으로 고치는 도구)·postinstall이 없어(`package.json`, `patches/` 없음) 새로 깔고 prebuild. ⑶ 안 닿음.

**검증(A)** — 시뮬레이터 iPhone 17 Pro iOS 26.5 개발 빌드 → iOS 26 실기기: 1 홈→사진→바로 「< 홈」(회귀 없음) 2 카드 탭→두 버튼→아무것도 안 고르고 「< 홈」 ×3 3 앨범→사진 고르기 ✕→「< 홈」 ×3 — 시트 없이 사진첩만 거친 길은 처음 재는 것, 핵심 4 앨범→사진 선택→분석 중·분석 뒤 「< 홈」 5 사진 찍기→카메라 취소→「< 홈」(시뮬레이터엔 카메라 없음, 실기기) 6 사진→지난 오답노트→「< 뒤로」→「< 홈」 7 2~5 뒤 왼쪽 스와이프, 「< 홈」 빠른 연타에 1회만 팝 8 안드 에뮬레이터 2·3 9 jest 통과, 위 테스트 3개 갱신 10 OTA를 보내면: 1.0.11 기기 두 번 켠 뒤 두 버튼이 보이는지, 2·3 반복

### 2. 2차 Fable 답 (165,864토큰)

**결론 먼저 — E(두 화면 iOS 헤더 끄고 화면 안 「< 홈」/「< 뒤로」) + A 남김.** 죽는 건 네이티브 뒤로 버튼의 탭 경로뿐, JS 팝은 산다(4판 실측) — 버튼을 없애면 방아쇠를 더 안 쫓아도 된다. OTA 가능.

**E** ⑴ 뒤로가 전부 JS 경로. 밀려 들어오는 중에 눌러도 `RNSScreenStack.mm:793-806`이 전환 끝난 뒤로 미뤄 처리한다. 스와이프 남음 — 허용 조건 `:1247-1250`(gestureEnabled·VC 2↑·모달 아님)에 헤더는 없다. ⑵ 위 여백: 두 화면이 `edges={['bottom']}`(`photo-flow-screen.tsx:53`·`photo-notes-screen.tsx:45`)이라(`_layout.tsx:264-265` 주석) 새 줄은 복습처럼 `SafeAreaView edges={['top']}`(`review-session-screen-view.tsx:108-122`·`:300-322`). 안드 네이티브 헤더도 사라짐(기기 뒤로 — 확인 못 함). 진입은 push뿐(`use-quiz-hub-screen.ts:208,212`·`use-result-screen.ts:177`); `canGoBack` 아니면 `replace('/(tabs)/quiz')`(`use-weakness-detail-screen.ts:82-83`). `jest.setup.js:101-106` 목에 `back`·`canGoBack` 두 줄 추가. ⑶ `app/_layout.tsx:266-274`·두 screen·공용 줄 컴포넌트 1·테스트 2.

**D** ⑴ headerLeft를 주면 네이티브 뒤로 버튼은 안 그려진다(`useHeaderConfigProps.js:238,345`→`RNSScreenStackHeaderConfig.mm:321-323`). ⑵ iOS 26 버튼 찾기는 콘텐츠뷰 아래 **첫 `_UIButtonBarButton`**을 재귀로 집는다(`UINavigationBar+RNSUtility.mm:42-60`) — 우리 JS 버튼이 그 클래스에 싸이면 `:237`이 그걸 끈다. 싸이는지·유리 헤더 모양은 확인 못 함. ⑶ `_layout.tsx`+버튼 1.

**C** ⑴ 끄는 코드가 없어져 영구 고장은 사라짐. 첫 탭 팝 실패는 확인 못 함. ⑵ 스토어 빌드·OTA 불가. `patch-package`·`patches/` 없음 → 설치+`prebuild --clean`. 이 코드가 막던 「연타로 두 장 빠짐」(`:228-229`) 재발 가능. ⑶ `patches/…4.16.0.patch`.

**A**: 남김. E면 필수는 아니나 시트는 busyRef 걸림 위험(`ask-photo-source.ts:16-18`)·08.28 재발 이력이 있고 932 통과. 단 diff 주석 「시트·알림창을 띄우면 죽는다」는 2·4판으로 반쯤 틀림 → 「iOS 26·4.16 네이티브 뒤로 버튼이 죽어 헤더를 끔」으로.

**검증(E · 시뮬, 판마다 앱 껐다 켬)** 1 홈→사진: 「< 홈」 줄이 상태바 아래, 본문과 안 겹침. 2 다 열린 뒤 「앨범에서 고르기」→✕→「< 홈」 → 홈. 3 **들어가자마자(애니메이션 중) 「앨범에서 고르기」→✕→「< 홈」** → 홈. 2회(판 2·4). 4 들어가자마자 「< 홈」 탭 → 홈으로 한 번만(두 장 안 빠짐). 5 「사진 찍기」(시뮬은 거부 문구)→「< 홈」. 대화 상태에서도. 6 홈→지난 오답노트→「< 뒤로」→홈 / 사진→지난 오답노트→「< 뒤로」→사진. 7 두 화면 가장자리 스와이프. 8 안드 에뮬: 헤더 없이 기기 뒤로. 9 jest·tsc.

### 3. A 남김/되돌림 최종 — Fable (astra 2차 답 원문을 받고, 누적 169,629토큰)

최종: A 되돌림
A의 근거(시트가 방아쇠)는 2·4판으로 무너졌고, E면 네이티브 뒤로 버튼 자체가 없어 시트가 죽일 게 없다. 남는 이점은 주석 경고(`ask-photo-source.ts:16-18`)뿐이지 실측된 사고가 아니다. 되돌리면 1.0.12에 학생 화면 변경 없이 E만 남아 리뷰·검증 범위가 좁다(복원 7파일: `git status` M 5·D 2). 시트 뒤 JS 팝은 1차 실측(`use-exam-solve-screen.ts:142-148` 선례)대로 산다 — 검증 3번에 「시트 취소 → < 홈」을 넣는다.

### 4. 코드 리뷰 Fable (134,228토큰)

**반드시 고칠 것: 없음**

근거(파일:줄)
- ⑴ 위 여백: 바깥 `edges={['bottom']}`(photo-flow-screen.tsx:54 · photo-notes-screen.tsx:50·59·71·86·99) 안에 `edges={['top']}`(photo-back-bar.tsx:34) — 겹치는 변 없음. 다섯 상태 모두 `{backBar}` 들어감(notes:51·60·72·87·100). chat·목록 ScrollView의 `contentInsetAdjustmentBehavior="automatic"`(flow:72 · notes:101)은 스크롤뷰 자신의 safeArea 기준이라 바 아래에선 top 0 → 두 번 안 들어감. 복습 화면 appBar(review-session-screen-view.tsx:108-121)와 같은 구조. chat 상태는 시뮬레이터로 확인 못 함.
- ⑵ 안드: 기기 뒤로는 네이티브 스택 pop이라 헤더 유무와 무관, features/photo에 BackHandler 0건. `chevron.left` 안드 매핑 있음(components/ui/icon-symbol.tsx:27). edgeToEdgeEnabled true(app.json:43)라 top inset 들어감. 기기 확인 못 함.
- ⑶ replace 대상 `/(tabs)/quiz` — use-weakness-detail-screen.ts:82-83과 동일, 탭 제목 '홈'(app/(tabs)/_layout.tsx:47).
- ⑷ 여는 길 셋 다 push(use-quiz-hub-screen.ts:208·212 · features/quiz/hooks/use-result-screen.ts:177) → canGoBack 참. notification-route.ts는 사진 화면으로 안 보냄.
- ⑸ back()→언마운트→dispose(use-photo-flow.ts:95-101) — 네이티브 뒤로 때와 같은 경로.
- ⑹ photo-back-bar.test는 router.back/replace 호출을 직접 잼(진짜). jest.setup의 `canGoBack: jest.fn(() => true)`는 clearAllMocks에 안 지워지고, 누르는 테스트 둘은 값을 직접 박음.
- 내가 돌림: tsc 0 · jest features/photo 24 suites / 327 통과.

**권고**
1. notes 테스트는 읽는 중·빈 목록·목록 셋만 잼. 서버 대기·실패(notes:60·72)는 코드엔 있는데 테스트가 없음 — 한 줄씩 더하면 "다섯 상태 모두" 주장이 잠김.
2. 개발 허브 `app/dev/photo-flow.tsx`는 `app/dev/_layout.tsx:10`이 헤더를 켜서 줄이 둘(네이티브 '사진 → 대화' + JS '< 홈'). 개발 전용 — `headerShown: false`로 맞추거나 그냥 두기.
3. 분석 중 「< 홈」: 언마운트 뒤에도 start()가 이어져 scriptRef에 새 대본을 만들고 start(result)를 부름(use-photo-flow.ts:145-156) — 정리 effect는 이미 지나가 그 대본은 dispose 안 됨. 첫 단계가 학생 입력 대기라 저장까진 안 갈 것으로 보이나 확인 못 함. 이 변경 전(네이티브 뒤로)에도 같았음 — 회귀 아님.
4. 바 배경 '#FFFFFF' 고정(photo-back-bar.tsx:55). 화면도 cream 고정이라 다크 모드에서도 톤은 맞음 — 넘어가도 됨.
