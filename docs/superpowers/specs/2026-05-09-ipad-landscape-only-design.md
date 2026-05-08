# iPad Landscape-Only — Design Spec

- **Date**: 2026-05-09
- **Branch**: claude/heuristic-tu-cf8886
- **Status**: 기획중

## 1. 배경 / 동기

iPad/태블릿에서 portrait↔landscape를 화면별로 다르게 허용하던 방식이 두 가지 문제를 만든다.

1. **시험 + 현재 구현된 챗봇처럼 가로 기준 화면이 portrait에서는 어색하다.** 좌(문제) / 우(스크래치패드 또는 채팅) 분할 레이아웃이 744pt 폭에 안 들어맞는다. 현재는 "옆으로 돌리세요" 힌트 배너로 우회하지만, 사용자가 안 돌리면 답답한 경험이 그대로 남는다. (챗봇 화면의 정확한 파일 경로는 plan 단계에서 확정한다.)
2. **화면 전환 시 자동 회전이 일어나면 사용자가 피로감을 느낀다.** 허브(세로) → 시험(unlock) → 다른 화면(세로)을 오갈 때 디바이스가 자동으로 회전해야 하고, 사용자가 잡은 자세를 계속 바꿔야 한다.

이번 spec은 이 두 가지를 한 번에 해소하기 위해 **태블릿(iPad + Android tablet)을 landscape-only로 고정**한다. 일반적인 학습 앱(GoodNotes, Notability 등) 사용 패턴 — 거치 + 펜슬 학습 — 과도 일치한다.

## 2. 방향 정책 (Orientation Policy)

| 디바이스 | 방향 |
|---|---|
| iPhone | portrait 고정 (현행 유지) |
| **iPad** | **landscape 고정 (Left + Right 모두 허용)** |
| Android phone | portrait 고정 |
| **Android tablet** | **landscape 고정** |

- portrait로는 절대 회전하지 않음 (모든 태블릿)
- 사용자가 태블릿을 어느 쪽으로 눕히든(Left/Right) 화면이 그 방향에 맞춰 정렬됨
- 화면 전환 시 회전 lock 변경이 일어나지 않음 → 토글 피로감 제거
- "옆으로 돌리세요" 힌트 배너 불필요
- 디바이스(폰/태블릿) 판별은 기존 `useIsTablet()` 기준 (width ≥ 744pt) 또는 동등한 런타임 검사를 사용

## 3. 구현 방식 (Lock 방식)

iOS와 Android는 시스템적 제약이 달라 방식을 분리한다.

### 3.1 iOS — Info.plist 정적 방식

`app.json`의 `expo.ios.infoPlist`에 디바이스별 지원 방향을 박는다. 시스템 차원에서 portrait를 막으므로 앱 시작 직후 portrait flash가 발생하지 않는다.

```jsonc
"ios": {
  "supportsTablet": true,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false,
    // iPhone: portrait만
    "UISupportedInterfaceOrientations": [
      "UIInterfaceOrientationPortrait"
    ],
    // iPad: landscape Left/Right만
    "UISupportedInterfaceOrientations~ipad": [
      "UIInterfaceOrientationLandscapeLeft",
      "UIInterfaceOrientationLandscapeRight"
    ]
  }
}
```

`expo.orientation` 최상위 값은 `default`로 변경한다(또는 충돌 회피를 위해 제거). Info.plist가 우선 적용된다.

iOS는 런타임 lock을 쓰지 않는다 — `expo-screen-orientation`으로 진입 시 lock하면 짧은 portrait flash 가능성이 있으나, Info.plist 정적 방식은 OS 차원이라 그런 flash 없음.

### 3.2 Android — 런타임 lock 방식

Android에는 iOS의 `~ipad` 같은 디바이스-클래스 분기 자원 한정자가 native 차원에서는 있어도(`sw600dp`) Expo workflow와 충돌이 크다. 따라서 다음 절차로 처리한다:

1. `app.json`의 `expo.android.orientation`을 `default`로 변경
2. 앱 진입 지점(`app/_layout.tsx`)에서 `expo-screen-orientation`으로 디바이스에 맞게 lock
   - 태블릿(width ≥ 744pt)이면 `lockAsync(LANDSCAPE)`
   - 폰이면 `lockAsync(PORTRAIT_UP)`
3. iOS는 Info.plist에서 이미 lock되므로 런타임 호출은 **Android에서만 수행** (Platform 분기)

**의식적으로 수용하는 단점**: Android에서는 앱 시작 직후 lock이 적용되기 전 짧은 화면 깜빡임 가능. 사용자 비중과 영향도를 고려해 허용한다.

## 4. 코드 변경 지점

### 4.1 제거 대상

| 파일 | 사유 |
|---|---|
| `features/quiz/exam/hooks/use-exam-screen-orientation.ts` | 진입 시 unlock / 이탈 시 portrait lock 자체가 불필요 |
| `features/quiz/exam/hooks/use-exam-screen-orientation.test.ts` | 위와 동반 |
| `features/quiz/exam/components/landscape-hint-banner.tsx` | landscape-only이므로 안내 불필요 |
| `features/quiz/exam/components/landscape-hint-banner.test.tsx` | 위와 동반 |
| `features/quiz/exam/storage/landscape-hint-store.ts` | 위와 동반 |
| `features/quiz/exam/storage/landscape-hint-store.test.ts` | 위와 동반 |
| `constants/storage-keys.ts` 내 `landscapeHintSeen` 키 | 위와 동반 |

### 4.2 변경 / 단순화 대상

| 파일 | 변경 |
|---|---|
| `hooks/use-orientation-lock.ts` | Android 런타임 lock 용도로 **유지**. `lockToLandscape` 추가, `unlockAllOrientations`는 더 이상 필요 없으므로 제거. 함수 시그니처와 호출 시점은 plan에서 확정 |
| `hooks/use-orientation-lock.test.ts` | 위 변경에 맞춰 갱신 |
| `app/_layout.tsx` | 기존 `lockToPortrait()` 무조건 호출을 제거하고, **Android일 때만** 디바이스(폰/태블릿) 감지 후 적절히 lock 하는 로직으로 교체. iOS는 Info.plist에 위임 |
| `features/quiz/exam/hooks/use-exam-solve-screen.ts` | `showLandscapeHint`, `onDismissLandscapeHint`, 회전-기반 분기 제거. 태블릿 판별 결과만 사용. **정확한 코드 변경은 plan에서 현 구현 확인 후 확정** |
| `features/quiz/exam/screens/exam-solve-screen.tsx` | `LandscapeHintBanner` import/렌더 제거 |
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | 회전 관련 분기/배너 제거 |
| `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` | 동일 |
| 챗봇 화면 (경로 plan에서 확정) | 회전 관련 분기/배너 사용처 있을 시 제거 |

### 4.3 변경 대상 (app.json)

- `expo.orientation`: `portrait` → `default` (혹은 제거)
- `expo.ios.infoPlist.UISupportedInterfaceOrientations` 추가 (iPhone portrait)
- `expo.ios.infoPlist.UISupportedInterfaceOrientations~ipad` 추가 (iPad landscape Left/Right)
- `expo.android.orientation`: `default` 명시 (생략 시 Expo 기본값에 의존하지 않게)

자세한 형태는 §3 참조.

## 5. 재튜닝 범위

### 5.1 이번 spec 안에서 다루는 것

iPad 가로에서 **깨지지 않을 정도의 최소 fallback**만 적용한다. "예쁘게"가 아니라 "깨지지 않게"가 목표.

- 가로 viewport(예: 11" 1194×834, 12.9" 1366×1024)에서 모든 화면이 크래시 없이 렌더되는지 확인
- 시험풀기 / 진단 / 진단세션 — 이미 가로 기준 디자인이므로 정상 동작 확인만
- 그 외 화면은 가운데 max-width 정렬로 양옆 빈 공간을 두는 정도까지만 허용

### 5.2 이번 spec에서 빼는 것 (후속 spec)

다음은 **별도 후속 spec으로 분리한다**. 이번 작업 이후에는 가로에서 어색하게 보일 수 있으나, "버그가 아니라 임시 상태"임을 의식적으로 수용한다.

- **허브 홈 / 여정보드 가로 기준 재설계**
  - `features/quiz/components/journey-board-layout.ts` (height-based cap, BUBBLE_OVERFLOW_RESERVE)
  - `features/quiz/components/journey-board.tsx`
  - `features/quiz/components/quiz-hub-screen-view.tsx` 의 ScrollView 배치
  - 768×960 portrait 비율 보드를 가로 viewport에 어떻게 배치할지 디자인 결정 필요 (좌우 정보 패널? 보드 가로 비율 재디자인? 등)
- **포스터 배너 / CTA 위치 디테일 재튜닝**
  - `features/quiz/components/poster-title-banner.tsx` heroFrameWrapTablet 위치
  - `quiz-hub-screen-view.tsx`의 CTA 푸터 가로 viewport 기준 비율
- **히스토리 / 프로필의 가로 전용 레이아웃**
  - `features/history/components/history-screen-view.tsx`
  - `features/profile/components/profile-screen-view.tsx`
  - 현재 `useIsTablet()` 기반 max-width만 적용된 상태. 가로에서 더 풍부하게 활용 가능

## 6. 의식적으로 수용하는 트레이드오프

> 🟡 **이번 spec 적용 직후, 다음 화면들이 iPad 가로에서 어색하게 보일 수 있다:**
> - 허브 홈: 양옆이 휑하거나, 여정보드가 작거나, 배너 위치가 어정쩡할 수 있음
> - 히스토리/프로필: 가운데 좁은 컨텐츠 + 양옆 빈 공간
>
> **이는 의도된 임시 상태이며, §5.2의 후속 spec에서 해결한다.**

5/7에 진행한 "iPad portrait journey board fit" 작업의 일부 가정(세로 viewport height-cap)이 가로에서는 다르게 동작한다. 이번 spec에서는 이 로직을 깨지 않는 선에서 두고, 후속 spec에서 가로 기준으로 재설계한다.

## 7. 검증 항목

### 7.1 회귀 검증 (반드시 통과)

**iPhone**
- [ ] portrait 고정 유지 (앱 동작 변화 없음)
- [ ] 회전 시도해도 화면이 안 돌아감

**iPad — 다음 디바이스 모두 검증**
- [ ] iPad mini (1133×744 가로) — split layout이 압박받지 않는지
- [ ] iPad 11" (1194×834 가로)
- [ ] iPad Pro 12.9" (1366×1024 가로)
- [ ] 앱 시작 시 landscape로 진입 (portrait flash 없음)
- [ ] 좌/우 어느 쪽으로 눕혀도 화면이 정방향
- [ ] portrait로는 회전 안 됨

**Android**
- [ ] Android phone (예: Pixel) — portrait 고정
- [ ] Android tablet 시뮬레이터(또는 가능한 경우 실기기) — landscape 고정
- [ ] Android 시작 시 짧은 깜빡임이 있어도 결과 방향이 올바름

**화면별 (iPad 가로 / Android tablet 가로 기준)**
- [ ] 시험풀기 (`exam-solve`) — split layout 정상 렌더, 스크래치패드 동작
- [ ] 시험 진단 (`exam-diagnosis`, `exam-diagnosis-session`) — 정상 렌더
- [ ] **챗봇 화면** — 정상 렌더, 메시지 송수신 동작 (경로는 plan에서 확정)
- [ ] 허브 홈 — 깨지지 않음 (어색해도 OK, §6 트레이드오프)
- [ ] 히스토리 / 프로필 — 깨지지 않음
- [ ] 인증 / 온보딩 화면 — 깨지지 않음

### 7.2 코드 검증

- [ ] 제거 대상 파일들의 import가 모든 호출처에서 제거됨 (`grep` 잔존 호출 0건)
- [ ] `landscape-hint-banner.test.tsx`, `use-exam-screen-orientation.test.ts`, `landscape-hint-store.test.ts` 삭제 + 관련 테스트 그룹에서 누락 없음
- [ ] `constants/storage-keys.ts`에서 `landscapeHintSeen` 키 제거됨, 잔존 참조 0건
- [ ] `hooks/use-orientation-lock.ts` 변경 후 `unlockAllOrientations` 잔존 호출 0건
- [ ] 타입 체크 통과 (`tsc --noEmit`)
- [ ] 단위 테스트 통과 (`jest`)

### 7.3 빌드 검증

- [ ] `npx expo prebuild --clean` 성공
- [ ] `npx expo run:ios` (iPhone 시뮬레이터) 성공
- [ ] iPad 시뮬레이터(또는 실기기)에서 동작 확인
- [ ] `npx expo run:android` (Android phone 에뮬레이터) 성공
- [ ] Android tablet 에뮬레이터에서 동작 확인 (가능한 경우)

## 8. 후속 작업 — 사용자에게 반드시 다시 알릴 것

> ⚠️ **다음 항목은 이번 spec에서 의도적으로 제외되었다. 본 spec 구현 완료 후 사용자(박기윤)에게 반드시 리마인드한다.**

1. **허브 홈 / 여정보드 가로 기준 재설계 spec 작성**
2. **포스터 배너 / CTA 위치 디테일 재튜닝 spec 작성**
3. **히스토리 / 프로필 가로 전용 레이아웃 spec 작성**

리마인드 방법:
- `docs/PROGRESS.md`에 본 spec 완료 기록 시 "후속 작업 필요" 섹션을 함께 남긴다
- Notion "DASIDA 개발 기록"의 본 페이지 본문 `## 후속 작업` 섹션에 위 3개 항목을 명시한다 (구현완료 페이지 업데이트 시)

## 9. 참고

- 관련 직전 spec: `docs/superpowers/specs/2026-05-07-ipad-portrait-journey-board-fit-design.md` — 본 spec 적용 시 일부 가정이 무효화됨
- 관련 직전 spec: `docs/superpowers/specs/2026-05-07-ipad-landscape-exam-solve-design.md` — 본 spec과 정합
- Apple HIG: iPad는 모든 방향 지원이 권장되지만, "primarily landscape" 앱은 명시적으로 허용됨 (e.g., 게임, 드로잉, 학습 앱)
