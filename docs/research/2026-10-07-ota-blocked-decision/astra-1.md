추천: A

단, **제출본의 내장 그림 검증을 통과한 뒤 보낸다. 실패하면 B로 전환하고, 1.0.12 출시·초대는 그대로 진행한다.**

1. **학생에게 고침을 보내되 초대 일정을 지킨다.** 두 스토어 출시 뒤 초대하고 10.12 숫자를 보는 결정이 이미 있다(`docs/STATUS.md:12-14`). 복습 두 버그는 기존 리뷰에서도 출시를 막지 않는다고 판단했다(`docs/research/2026-10-06-build-1012-go-nogo/fable-review-fix.md:9-14`). 따라서 C로 제출을 취소할 이유는 약하다. A가 검증되면 B의 추가 심사 대기 없이 복습·노트 잘림을 고칠 수 있다는 판단이다. 실제 수정은 계정별 동시 내림 합치기와 행 높이 보정이다(`features/learning/review-scheduler.ts:127-142`, `features/photo/components/photo-note-card.tsx:138-144`).

2. **된다 — 단, 제외한 그림과 동일한 해시가 설치본에 있어야 한다.** 아래 `N`은 `node_modules/`, `U`는 `node_modules/expo-updates/`다.
   - 키를 읽는 곳은 중첩 CLI다. 빈 배열은 필터 없음으로 처리하고, 패턴이 있으면 맞는 자산만 내보낸다. 즉 “키를 안 읽는다”는 전제가 틀렸다(`N/expo/node_modules/@expo/cli/build/src/export/exportAssets.js:97-119,203-215`).
   - iOS는 **OTA에 없는 내장 자산까지** 맵에 먼저 넣고, 안드로이드도 내장 자산 맵으로 시작한다(`U/ios/EXUpdates/AppLauncher/AppLauncherWithDatabase.swift:202-203`, `U/android/src/main/java/expo/modules/updates/launcher/DatabaseLauncher.kt:119,170-184`). JS는 해시로 그 로컬 URI를 찾는다(`N/expo-asset/src/LocalAssets.ts:9-22`).
   - 이 버전에 `assets:verify`가 있다. 제출한 **iOS 25·안드 13 각각의** `app.manifest`와 후보 OTA의 `assetmap.json`·`metadata.json`을 대조해야 한다. 도구는 내장본과 OTA 양쪽에 없는 해시를 실패로 판정한다(`U/cli/src/assetsVerify.ts:46-53,74-85`, `U/cli/src/assetsVerifyAsync.ts:47-64`).

   **이번 제출본에서 실제로 되는지는 모름**이다. 위 대조와 실기기 검증은 하지 않았다. 권고는 누락 0·발행 자산 한도 충족을 확인한 다음, 두 플랫폼에서 OTA 수신 후 오프라인 기출 그림·복습·노트 끝줄을 보는 것이다. 도착 표시는 플랫폼별 ID 앞 8자리로 확인한다(`features/profile/update-label.ts:6,13-16`).

3. **예약급은 ‘내장 자산 기준 보존’, 패턴 수정 자체는 젓가락급이다.** 검증은 빌드별 manifest에 의존하므로 이를 지금 보존하고 앞으로 그림을 추가·교체할 때 같은 검증을 걸자(`U/cli/src/assetsVerifyAsync.ts:19-23,89-90`). 자료가 사라지거나 설치본이 갈라진 뒤 복구 비용이 커진다는 것은 짐작이다. 반면 현재 런타임은 앱 버전 기준이므로 패턴 수정만을 위해 새 빌드를 예약할 근거는 없다(`app.config.js:7,13-18`). A 중단 시 B로 넘어가는 비용은 제한적이라는 판단이지만, 이미 받은 OTA의 회수 비용은 별개다. 내장본 롤백 처리 경로는 있어도 즉시 전원 복구를 보장하진 않는다(`U/ios/EXUpdates/Procedures/CheckForUpdateProcedure.swift:96-97`).
