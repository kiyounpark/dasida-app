# RNFirebase Analytics 재도입 (Old Arch 전환)

> **상태: ❌ FAILED (2026-05-13 시도, 롤백됨)**
> **베이스 커밋 유지**: `9ef24c6` — 안정 상태
> 이 계획은 보존 — RNFB v25 출시 후 재시도 시 참고. 실패 교훈은 문서 하단 "## 시도 결과 및 교훈" 섹션 참조.

## 배경

현재 상태:
- GA4 Measurement Protocol (HTTPS 직접 호출)로 이벤트 추적 중
- 이벤트는 GA4에 도착하지만 **활성 사용자/세션/유지율 메트릭이 비어 있음** (임의 `app_instance_id`가 진짜 Firebase Installation ID로 인식 안 됨)
- 직전 시도(@react-native-firebase/analytics 재도입)는 New Arch + use_frameworks!:static + RNFB v24 빌드 충돌로 실패 → 롤백 완료 (커밋 `9ef24c6`)

전환 결정:
- **New Architecture를 OFF**로 전환하고 **Reanimated를 v3.16으로 다운그레이드**
- 이 조합에서 RNFB v24가 정상 빌드됨
- Reanimated v4 전용 기능은 사용하지 않으므로 코드 변경 없음 (검증됨)

## 목표

1. `@react-native-firebase/analytics`가 정상 동작 → first_open / session_start / user_engagement 자동 발사
2. GA4 Realtime "활성 사용자" 메트릭에 1+ 표시
3. 표준 보고서(참여도, 사용자)에 사용자 단위 메트릭 잡힘
4. 기존 비즈니스 이벤트(mock_exam_started 등) 그대로 동작
5. 시각적 UX 회귀 없음 (Reanimated 다운그레이드 시 코드 영향 없는지 검증)

## 사전 조건

- 현재 브랜치 `claude/silly-robinson-baed45`, HEAD = `9ef24c6` 안정 상태
- `.env`에 GA4 키들 정상 (이전 작업에서 확인됨)
- `GoogleService-Info.plist` 및 `google-services.json` 파일 존재 ([app.config.js](app.config.js) 참조 경로 확인 필수)

## 작업 순서

### Step 1: 패키지 변경

```bash
./node_modules/.bin/expo install \
  react-native-reanimated@~3.16.0 \
  @react-native-firebase/app \
  @react-native-firebase/analytics \
  expo-build-properties
```

기대 결과:
- `react-native-reanimated`가 `~4.1.1` → `~3.16.0`
- `@react-native-firebase/app`, `@react-native-firebase/analytics`가 `^24.0.0`으로 추가됨
- `expo-build-properties`가 설치됨

검증:
```bash
grep -E "react-native-reanimated|@react-native-firebase|expo-build-properties" package.json
```

### Step 2: app.config.js 수정

[app.config.js](app.config.js) 변경 사항:

**(a) `newArchEnabled: true` → `false`**

```js
// Before
newArchEnabled: true,
// After
newArchEnabled: false,
```

**(b) plugins 배열에 RNFB + build-properties 추가 (expo-apple-authentication 다음 위치)**

```js
plugins: [
  'expo-router',
  'expo-apple-authentication',
  // ↓↓↓ 추가
  '@react-native-firebase/app',
  [
    'expo-build-properties',
    {
      ios: {
        useFrameworks: 'static',
      },
    },
  ],
  // ↑↑↑ 추가
  [
    'expo-notifications',
    {
      androidMode: 'default',
    },
  ],
  // ... 나머지 그대로
],
```

주의: `@react-native-firebase/analytics`는 **plugin에 넣지 말 것** (config plugin 아님, npm 모듈일 뿐).

### Step 3: features/analytics/log-event.ts 재작성

**기존 MP 코드 완전 교체.** 새 내용:

```ts
/**
 * Firebase Analytics 래퍼 (@react-native-firebase/analytics).
 *
 * RNFB SDK가 first_open / session_start / user_engagement,
 * app_instance_id(FID), 세션 라이프사이클을 자동 처리.
 *
 * Note: New Arch OFF + Reanimated 3 조합에서 빌드 안정. RNFB v25에서
 * New Arch 호환되면 Reanimated 4 + New Arch로 복귀 검토.
 */
import analytics from '@react-native-firebase/analytics';

import type { EventName, EventParams, ScreenName } from './event-types';

export function logEvent<K extends EventName>(
  name: K,
  params: EventParams[K],
): void {
  void analytics().logEvent(
    name as string,
    (params ?? {}) as Record<string, unknown>,
  );
}

export function setAnalyticsUserId(uid: string | null): void {
  void analytics().setUserId(uid);
}

export function logScreenView(screen: ScreenName): void {
  void analytics().logScreenView({
    screen_name: screen,
    screen_class: screen,
  });
}
```

### Step 4: features/analytics/session-lifecycle.ts 삭제

```bash
rm features/analytics/session-lifecycle.ts
```

RNFB가 라이프사이클을 자동 처리하므로 불필요.

### Step 5: app/_layout.tsx 수정

[app/_layout.tsx](app/_layout.tsx):

```ts
// import 제거
- import { initAnalytics } from '@/features/analytics/session-lifecycle';

// ScreenTracker 컴포넌트에서 useEffect 제거
function ScreenTracker() {
  useScreenTracking();
-  useEffect(() => initAnalytics(), []);
  return null;
}
```

### Step 6: 타입 체크

```bash
npx tsc --noEmit
```

기대: `No errors found`

만약 에러가 나면 step 3의 export 누락(`setCurrentSessionId`, `getCurrentSessionId`, `logReservedEvent` 등을 다른 곳에서 import 중) 의심. 사용처 검색:
```bash
grep -rn "setCurrentSessionId\|getCurrentSessionId\|logReservedEvent" --include="*.ts" --include="*.tsx" | grep -v node_modules
```
사용처 있으면 제거.

### Step 7: prebuild --clean

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 ./node_modules/.bin/expo prebuild --clean --platform ios
```

기대:
- `✔ Finished prebuild`
- `✔ Installed CocoaPods`
- Pod install 성공 (RNFB pods 추가됨)

실패 시:
- CocoaPods 인코딩 에러 → LANG 환경변수 명시했는지 확인
- `non-modular include` 에러 → app.config.js의 useFrameworks가 `'static'`인지 + newArchEnabled가 `false`인지 재확인

### Step 8: iOS 빌드

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 ./node_modules/.bin/expo run:ios
```

백그라운드 권장. 5~10분 소요.

기대:
- `› Build Succeeded`
- 시뮬레이터 자동 실행
- 앱이 정상 부팅

실패 시 (가능성 있는 패턴):
- **`RNFBAppModule not found`** → newArchEnabled가 진짜 false인지 확인. ios/ 디렉터리 통째로 지우고 prebuild 재실행
- **Reanimated 빌드 에러** → 다운그레이드가 안 됐을 수 있음. `npm ls react-native-reanimated`로 버전 확인
- **`use_frameworks` 충돌** → expo-build-properties plugin이 plugins 배열에 들어갔는지 확인

### Step 9: GA4 Realtime 검증

1. 시뮬레이터에서 앱 실행 → 로그인 → 화면 몇 개 이동
2. Metro 콘솔에서 RNFB SDK 자동 이벤트는 콘솔 출력 안 됨 (이건 정상)
3. GA4 Realtime (https://analytics.google.com → 해당 속성 → 보고서 → 실시간)에서 1~2분 대기 후:
   - **활성 사용자: 1+** ← 가장 중요
   - 이벤트 목록에 `screen_view`, `session_start`, `first_open`, `user_engagement` 등 등장

검증 통과 기준:
- 활성 사용자 ≥ 1
- screen_view 발생
- 사용자가 백그라운드 갔다가 복귀 시 세션 카운트 갱신

### Step 10: UI 회귀 검증

Reanimated 다운그레이드로 인한 시각적 회귀 확인:

1. 로그인 화면 — 페이드인 정상?
2. 퀴즈 풀이 — 푸터 등장/사라짐 정상?
3. 진단 대화 — 메시지 페이드인 정상?
4. 시험 진단 — FadeInDown 정상?
5. 다음 문제 카드 — 등장 정상?
6. 분할 디바이더 (iPad landscape) — 드래그 정상?
7. 온보딩 — 슬라이드 전환 정상?
8. 헬로 웨이브, 패럴랙스 — 정상?

회귀 없으면 통과. 있으면 해당 컴포넌트 코드 점검 (대부분 v3-v4 API 호환이라 회귀 없을 것으로 예상).

### Step 11: 커밋

변경 파일:
- `app.config.js`
- `app/_layout.tsx`
- `features/analytics/log-event.ts`
- `features/analytics/session-lifecycle.ts` (삭제)
- `package.json`
- `package-lock.json`

커밋 메시지 제안:

```
refactor(analytics): @react-native-firebase/analytics 재도입 (Old Arch 전환)

GA4 Measurement Protocol 환경에선 활성 사용자/세션 메트릭이 임의 app_instance_id
한계로 집계되지 않아 RNFirebase SDK로 복귀. RNFB v24 + New Arch + use_frameworks 빌드
충돌 해결을 위해 New Architecture를 일시 OFF + Reanimated를 v3.16으로 다운그레이드.

- react-native-reanimated 4.1 → 3.16: 사용 중인 API(FadeIn, useSharedValue,
  withTiming 등)가 모두 v3 호환이라 코드 변경 없음. v4 신기능(CSS animations 등)
  사용처 없음.
- newArchEnabled false 전환: Reanimated 4 외 New Arch 강제 라이브러리 없음
  (screens 4.16, gesture-handler 2.28 모두 양쪽 지원).
- @react-native-firebase/app + analytics 재추가: SDK가 first_open/session_start/
  user_engagement 자동 발사, 진짜 FID 사용 → 활성 사용자 메트릭 정상 집계.
- MP 우회 코드 제거 (log-event.ts 단순화, session-lifecycle.ts 삭제).
- expo-build-properties 추가: useFrameworks: static (Firebase iOS SDK 요구사항).

RNFB v25에서 New Arch + use_frameworks 호환 패치 출시 시 Reanimated 4 + New Arch
조합으로 재이전 검토.
```

### Step 12: Push + 로그

```bash
git push origin claude/silly-robinson-baed45
npm run log:commit
npm run notify:done -- "RNFB 재도입 (Old Arch 전환) 완료"
```

## 롤백 절차

빌드 실패 또는 회귀 발견 시:

```bash
git reset --hard 9ef24c6
rm -rf ios/  # 더러워진 네이티브 디렉터리 정리
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 ./node_modules/.bin/expo prebuild --clean --platform ios
```

베이스 커밋 `9ef24c6`은 안정 검증된 상태.

## 위험 요소 및 완화

| 위험 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| Reanimated v3 다운그레이드로 UI 회귀 | 낮음 | 시각적 결함 | Step 10에서 화면별 점검 |
| RNFB v24 + Old Arch 빌드 여전히 실패 | 낮음 | 작업 전체 무효 | 롤백 후 Mixpanel/PostHog 검토 |
| New Arch OFF로 인한 성능 저하 체감 | 매우 낮음 | 약간의 cold start 증가 | RNFB v25 출시 후 New Arch 복귀 |
| 다른 라이브러리가 New Arch 강제 (현재 발견 못 함) | 매우 낮음 | 빌드 실패 | 빌드 로그 분석 후 개별 대응 |

## 사후 확인

- [ ] 24시간 후 GA4 표준 보고서에 사용자 메트릭 정상 집계 확인
- [ ] iOS TestFlight 빌드 정상 통과 (배포 시점)
- [ ] Android prebuild + 빌드 검증 (별도 진행)
- [ ] RNFB v25 릴리스 모니터링 (이슈: https://github.com/invertase/react-native-firebase)

---

## 시도 결과 및 교훈 (2026-05-13)

### 결과: 실패. 롤백 완료.

Step 8 (iOS 빌드)에서 막힘. fmt 11.x + Apple Clang 컴파일 에러로 진입 불가능. 안전 베이스(`9ef24c6`)로 회귀.

### 놓친 가정 1: `react-native-worklets`가 별도 npm 패키지

- 가정: "Reanimated 4 → 3 다운그레이드 + Old Arch면 끝"
- 실제: `react-native-worklets`가 별도 패키지로 `package.json`에 박혀 있음. Reanimated 4 내부 의존성인데 직접 노출됨. Old Arch와 호환 안 됨 → 수동 제거 필요.
- **추후 재시도 시**: Step 1에서 `npm uninstall react-native-worklets`를 명시할 것.

### 놓친 가정 2: Reanimated v4 전용 API 사용 흔적

- 가정: "사용 중인 API 전부 v3 호환이라 코드 변경 없음"
- 실제: 두 곳에서 v4 전용 API 사용:
  - [components/hello-wave.tsx](components/hello-wave.tsx): CSS animations API (`animationName`, `animationDuration`) — v4 전용
  - [components/parallax-scroll-view.tsx](components/parallax-scroll-view.tsx): `useScrollOffset` → v4에서 이름 변경됨. v3는 `useScrollViewOffset`
- **추후 재시도 시**: Step 1 전에 코드 grep으로 v4 전용 API 사용 여부 사전 점검 + Step 6에 수정 방법 명시.

### 진짜 블로커 (놓친 가정 3): RN 0.81 Old Arch는 fmt 소스 빌드 실패

이게 결정적이고, 계획 자체를 무효화한 부분입니다.

#### 발견 사실

**Expo SDK 54 Podfile 17~18줄 (자동 생성):**
```ruby
ENV['RCT_USE_PREBUILT_RNCORE'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true'
                                       && podfile_properties['newArchEnabled'] != 'false'
```

- **`newArchEnabled = true`**: React Native 코어를 미리 컴파일된 바이너리(prebuilt `.xcframework`)로 가져옴 → fmt 컴파일 건너뜀 → 빌드 OK
- **`newArchEnabled = false`**: React Native 코어를 소스에서 직접 컴파일 → fmt 11.0.2 + 현재 Apple Clang 조합에서 `consteval` 컴파일 에러 → 빌드 실패

#### 실제 발생한 에러

```
ios/Pods/fmt/include/fmt/format-inl.h:59:
  call to consteval function 'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>'
  is not a constant expression
```

#### 시도한 우회책 (모두 실패)

1. Podfile post_install에 `CLANG_CXX_LANGUAGE_STANDARD = 'c++20'` 강제 적용 → 빌드 여전히 실패
2. `FMT_USE_CONSTEVAL=0` 매크로 fmt 타겟에 정의 → 빌드 여전히 실패
3. (시도 미완) `RCT_USE_PREBUILT_RNCORE=1`을 Old Arch에서도 강제 → 사용자가 롤백 결정

#### 결론

Expo SDK 54 + RN 0.81 환경에서 **Old Arch 빌드 경로가 사실상 폐쇄됨**:
- Meta가 prebuilt RN 코어를 New Arch 전용으로만 활성화
- fmt 11.x + Apple Clang 호환성 이슈는 fmt/clang 둘 다의 패치를 기다려야 함
- 깊은 네이티브 패치(fmt 소스 수정) 없이는 Old Arch로 RN 코어 컴파일 불가

이건 **Reanimated 4 다운그레이드만으로 풀리는 문제가 아니라**, RN/Expo 자체의 운영 정책 변화입니다. RN 0.82부터는 Old Arch가 공식 deprecated 예정.

### 계획의 근본 결함

이 계획은 두 가지 잘못된 추론을 했습니다:

1. "New Arch 강제 = Reanimated 4 때문만" → 부분적으로만 사실. RN 코어 자체도 사실상 New Arch 가정.
2. "Old Arch는 안정적이고 잘 작동" → RN 0.80+ 환경에선 빌드 파이프라인이 깨지는 시점에 도달.

### 미래 재시도 트리거

이 계획은 **RNFB v25 출시 시점에 새로 짜야 합니다.** v25가 New Arch + use_frameworks!:static 호환을 패치하면:

- Reanimated 다운그레이드 불필요
- `newArchEnabled` 그대로 `true` 유지
- 단순히 RNFB 패키지 추가 + plugin 등록만으로 끝
- fmt 빌드 이슈 회피 (prebuilt RN core 사용)

**모니터링 대상:**
- https://github.com/invertase/react-native-firebase/issues — `new architecture` 라벨
- RNFB v25 릴리스 노트
- React Native 0.82 릴리스 (Old Arch deprecated 시점)

### 임시 운영 방침 (RNFB v25 출시까지)

1. **현재 MP 기반 GA4 추적 유지** (커밋 `9ef24c6` 기준)
2. **활성 사용자 메트릭은 포기**하거나 별도 도구로 우회 (Mixpanel/PostHog 등)
3. **24h 후 GA4 표준 보고서 확인** — Realtime엔 없어도 표준 보고서에서 사용자 잡힐 가능성 있음

### 단어 정리 (실패 시 후속 작업자 참고)

- **`react-native-worklets`**: Reanimated v4가 내부적으로 쓰는 별도 npm 패키지. v3 다운그레이드 시 같이 제거 대상.
- **`RCT_USE_PREBUILT_RNCORE`**: RN 코어를 prebuilt 바이너리로 쓸지 결정하는 환경변수. Expo Podfile에서 newArchEnabled에 묶여 있음.
- **`fmt`**: C++ string formatting 라이브러리. RN 0.81+ 코어 의존성. 11.x 버전이 `consteval` 사용하면서 Apple Clang과 호환성 이슈.
- **`use_frameworks!:static`**: Firebase iOS SDK가 요구하는 CocoaPods 옵션. New Arch + RNFB v24와 충돌하는 원흉.
