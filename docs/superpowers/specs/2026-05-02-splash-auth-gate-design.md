# 콜드 스타트 스플래시 / 인증 게이트 정리

## 배경

앱 콜드 스타트 시 사용자에게 비정상 화면이 노출된다.

수정 이전 증상 (사용자 스크린샷으로 확인):
- 상단에 `< (tabs) | index` 헤더가 표시됨
- 본문은 검은 배경

원인 분석 결과:
- `app/_layout.tsx:36-38`의 `unstable_settings = { anchor: '(tabs)' }` 설정으로 인해 expo-router가 콜드 스타트 시 스택을 `[ (tabs), index ]` 순서로 구성한다. anchor의 정상 동작이며, 알림 탭에서 `/quiz/review-session`으로 점프할 때 뒤로가기 백스택을 보장하기 위해 필요하다.
- `_layout.tsx:138`의 `<Stack.Screen name="index" options={{ headerShown: false }} />`이 anchor 적용 타이밍과 충돌하면서 헤더가 노출됐다.
- `index.tsx`는 `useCurrentLearner`의 인증 체크가 끝날 때까지 빈 View를 렌더하므로, 헤더를 가려도 베이지 빈 화면이 수백 ms 보인다.
- 스플래시 배경(`#ffffff` light, `#000000` dark)과 첫 화면 색이 달라 색 점프가 추가로 보인다.

## 목적

콜드 스타트 시 사용자에게 보이는 화면 흐름을 다음과 같이 정리한다.

- `< (tabs) | index` 헤더 노출 차단 (이미 임시 수정 적용됨, 본 작업으로 정식화)
- 스플래시 → 첫 화면 전환에서 색 점프 제거
- 인증/폰트 로딩이 끝날 때까지 스플래시 유지하여 빈 화면 노출 차단
- 인증 로딩이 비정상적으로 오래 걸려도 앱이 멈추지 않도록 안전장치 추가

## 변경 범위

- `app.json` — splash backgroundColor를 베이지(`#F6F2E7`)로 변경 (light/dark 둘 다)
- `app/_layout.tsx` — `SplashScreen.hideAsync` 호출 조건에 인증 ready 조건 추가, 3초 타임아웃 안전장치 추가
- `app/index.tsx` — 이미 적용된 임시 수정(헤더 숨김 + 베이지 배경) 유지

`features/learner/provider`의 인증 흐름 자체는 변경하지 않는다. 타이밍만 조정한다.

## 변경 상세

### 1) `app.json` 스플래시 배경색 변경

```diff
 "expo-splash-screen",
 {
   "image": "./assets/images/splash-icon.png",
   "imageWidth": 200,
   "resizeMode": "contain",
-  "backgroundColor": "#ffffff",
+  "backgroundColor": "#F6F2E7",
   "dark": {
-    "backgroundColor": "#000000"
+    "backgroundColor": "#F6F2E7"
   }
 }
```

베이지(`#F6F2E7`)는 `app/index.tsx`의 fallback View 색상과 일치한다. 라이트/다크 모두 동일 색상으로 통일하여 색 점프를 차단한다.

### 2) `app/_layout.tsx` SplashScreen 유지 로직

기존 동작:

```tsx
const [fontsLoaded, fontError] = useFonts({ ... });

useEffect(() => {
  if (fontsLoaded || fontError) {
    void SplashScreen.hideAsync();
    if (pendingTaskId.current) {
      router.push({ pathname: '/quiz/review-session', params: { taskId: pendingTaskId.current } });
      pendingTaskId.current = null;
    }
  }
}, [fontsLoaded, fontError]);
```

변경 후:

```tsx
const [fontsLoaded, fontError] = useFonts({ ... });
const { authGateState, isReady } = useCurrentLearner();
const splashHiddenRef = useRef(false);

const hideSplash = useCallback(() => {
  if (splashHiddenRef.current) return;
  splashHiddenRef.current = true;
  void SplashScreen.hideAsync();
  if (pendingTaskId.current) {
    router.push({ pathname: '/quiz/review-session', params: { taskId: pendingTaskId.current } });
    pendingTaskId.current = null;
  }
}, []);

// 정상 케이스: 폰트 + 인증 둘 다 준비되면 스플래시 내림
useEffect(() => {
  const fontsReady = fontsLoaded || fontError;
  const authReady = isReady && authGateState !== 'loading';
  if (fontsReady && authReady) {
    hideSplash();
  }
}, [fontsLoaded, fontError, isReady, authGateState, hideSplash]);

// 안전장치: 3초가 지나도 스플래시가 떠 있으면 강제로 내림
useEffect(() => {
  const timer = setTimeout(() => {
    if (!splashHiddenRef.current) {
      console.warn('[splash] forced hide after 3s timeout');
      hideSplash();
    }
  }, 3000);
  return () => clearTimeout(timer);
}, [hideSplash]);
```

변경 포인트:
- `useCurrentLearner`를 `RootLayout` 안에서 호출해야 하므로 **Provider 안쪽에 마운트되는 별도 컴포넌트로 분리한다**. `RootLayout`은 `CurrentLearnerProvider` 바깥이므로 직접 호출 불가.
- 분리 방식: 현재 `AuthGateRedirector`와 동일 위치에 `SplashGate` 컴포넌트를 두어 그 안에서 hide 로직을 관리한다. `useFonts`와 `pendingTaskId` 처리도 함께 이동한다.
- 이중 호출 방지를 위해 `splashHiddenRef` 사용. `SplashScreen.hideAsync`는 멱등하지만, pendingTaskId 라우팅은 한 번만 실행돼야 한다.

### 3) `app/index.tsx`

이미 적용된 변경 유지:
- `<Stack.Screen options={{ headerShown: false }} />` 단일 선언
- 인증 로딩 중 베이지 View 렌더
- 인증 완료 후 `Redirect` 분기

추가 변경 없음. 옵션 C로 인해 사용자에게 거의 노출되지 않지만 타임아웃 시 fallback으로 잠깐 보일 수 있어 그대로 둔다.

## 컴포넌트 재구성

`RootLayout`의 책임을 다음과 같이 분리한다.

| 컴포넌트 | 책임 |
|---------|------|
| `RootLayout` | Provider 트리, Stack 정의, ThemeProvider, StatusBar |
| `SplashGate` (신규) | 폰트 로딩, 인증 ready 감지, 스플래시 hide, pendingTaskId 라우팅, 3초 타임아웃 |
| `AuthGateRedirector` (기존) | 런타임 인증 상태 변화 감지 후 redirect |

알림 콜드 스타트 처리(`getLastNotificationResponse`)는 `SplashGate`에서 폰트/인증이 ready된 시점에 실행하므로 기존과 타이밍이 거의 동일하다. 단, 인증 미준비 상태에서는 알림 라우팅을 보류한다 (기존 코드와 동일한 보호).

## 회귀 위험

- **알림 콜드 스타트 라우팅**: 기존엔 폰트만 ready되면 라우팅, 변경 후엔 인증까지 ready된 후 라우팅. 인증 실패 시 타임아웃(3초) 후 hide되므로 알림 라우팅도 그때 실행된다. 사용자가 알림 탭 → 앱 진입 시 최대 3초 지연 가능. 다만 인증 미완료 상태로 review-session에 들어가도 어차피 sign-in으로 튕기므로 결과적으로 차이 없음.
- **anchor 동작 의존**: 본 작업은 `unstable_settings.anchor: '(tabs)'`를 그대로 둔다. 알림 라우팅 백스택 보장을 위해 필요하므로 변경하지 않는다.
- **다크 모드**: 스플래시가 라이트/다크 동일 베이지로 변경되어 다크 모드 사용자에겐 살짝 밝은 스플래시. 앱 전체 색조와 일치하므로 의도된 동작.
- **SplashScreen.hideAsync 이중 호출**: `splashHiddenRef`로 차단. `hideAsync` 자체는 멱등이지만 pendingTaskId 라우팅이 두 번 실행되면 문제.
- **`useFonts`가 `RootLayout`에서 빠지면서 conditional render에 영향 없는지**: `RootLayout`은 더 이상 `if (!fontsLoaded && !fontError) return null` 분기를 들지 않는다. 스플래시가 hide될 때까지 화면을 가리므로 null 반환 없이도 안전하다. 단, Stack은 항상 마운트된다.

## 검증 항목

콜드 스타트 시나리오:
- [ ] 라이트 모드 콜드 스타트: 스플래시(베이지+로고) → quiz 화면. 색 점프 없음.
- [ ] 다크 모드 콜드 스타트: 동일.
- [ ] 미인증 사용자 콜드 스타트: 스플래시 → sign-in. 색 점프 없음.
- [ ] 온보딩 미완료 콜드 스타트: 스플래시 → onboarding. 색 점프 없음.
- [ ] `< (tabs) | index` 헤더가 어떤 시나리오에서도 보이지 않는지.

타임아웃 시나리오:
- [ ] 인증 응답을 인위적으로 지연시켰을 때 3초 후 스플래시가 강제로 내려가는지.
- [ ] 강제 hide 후에도 인증이 완료되면 정상적으로 화면 전환되는지.

알림 시나리오:
- [ ] 알림에서 콜드 스타트 진입 시 `/quiz/review-session`으로 정상 라우팅되는지.
- [ ] 인증 미완료 상태에서 알림 콜드 스타트 시 sign-in으로 튕기는지.
- [ ] 포그라운드/백그라운드 알림 탭은 기존과 동일하게 동작하는지.

회귀:
- [ ] `expo run:ios` / `expo run:android` 둘 다 빌드 성공.
- [ ] `npx expo prebuild --clean` 후 정상 동작 (app.json 변경으로 prebuild 필요).

## 검증 외 메모

- `app.json` splash 색상 변경은 네이티브 설정 변경이므로 OTA로는 적용 불가. 다음 빌드부터 반영.
- 빌드 순서: app.json 수정 → `npx expo prebuild --clean` → `npx expo run:ios`.
