# 콜드 스타트 스플래시 / 인증 게이트 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 콜드 스타트 시 사용자에게 보이는 비정상 화면(헤더 노출, 색 점프, 빈 화면)을 제거한다.

**Architecture:** 스플래시 배경색을 첫 화면 색과 통일(A.5)하고, 폰트 + 인증 ready까지 스플래시를 유지(C)하며, 3초 타임아웃 안전장치를 추가한다. `RootLayout` 안에 `SplashGate` 컴포넌트를 분리해 `CurrentLearnerProvider` 안쪽에서 `useCurrentLearner`를 호출한다.

**Tech Stack:** Expo Router, expo-splash-screen, expo-font, React Native, Firebase Auth (`useCurrentLearner`)

**Spec:** [docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md](../specs/2026-05-02-splash-auth-gate-design.md)

---

## File Structure

| 파일 | 역할 | 변경 |
|------|------|------|
| `app.json` | Expo 설정. splash backgroundColor를 베이지로 통일. | Modify |
| `app/_layout.tsx` | RootLayout. `SplashGate` 컴포넌트를 추가하여 splash hide 타이밍 제어. | Modify |
| `app/index.tsx` | 헤더 숨김 + 베이지 fallback (이미 적용됨). | 변경 없음 (현재 상태 유지) |

추가 파일은 만들지 않는다. `SplashGate`는 `_layout.tsx` 내부에 inline 정의해 `AuthGateRedirector`와 동일 패턴을 따른다.

## Pre-conditions

- 현재 브랜치 `main`에 미커밋 변경: `app/index.tsx` (헤더 숨김 fix), `docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md` (이번 spec).
- 이 plan은 그 두 파일을 함께 첫 commit으로 묶는다.

---

## Task 1: 베이스라인 commit (현재까지의 변경 + spec)

**Files:**
- Modify: 이미 변경된 `app/index.tsx`
- Create: 이미 생성된 `docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md`

- [ ] **Step 1: 변경 확인**

```bash
git -C /Users/baggiyun/dev/dasida-app status -s
```

Expected:
```
 M app/index.tsx
?? docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md
```

- [ ] **Step 2: stage**

```bash
git -C /Users/baggiyun/dev/dasida-app add app/index.tsx docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md
```

- [ ] **Step 3: commit**

```bash
git -C /Users/baggiyun/dev/dasida-app commit -m "$(cat <<'EOF'
fix(navigation): hide stack header on cold-start index route

콜드 스타트 시 anchor=(tabs) 설정 + index 화면 옵션 적용 타이밍 충돌로
"< (tabs) | index" 헤더가 노출되던 문제. index.tsx 내부에서
<Stack.Screen options={{ headerShown: false }} />를 직접 선언해 강제 숨김.

스플래시 유지 / 색 점프 제거는 별도 spec으로 후속 처리.

Spec: docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: 검증**

```bash
git -C /Users/baggiyun/dev/dasida-app log -1 --oneline
git -C /Users/baggiyun/dev/dasida-app status -s
```

Expected: 새 commit 1개, working tree clean.

---

## Task 2: app.json 스플래시 배경색 변경

**Files:**
- Modify: `app.json` (expo-splash-screen 플러그인 설정)

- [ ] **Step 1: 현재 splash 설정 확인**

```bash
grep -A 12 "expo-splash-screen" /Users/baggiyun/dev/dasida-app/app.json
```

Expected: `"backgroundColor": "#ffffff"` (light), `"backgroundColor": "#000000"` (dark) 두 줄이 보인다.

- [ ] **Step 2: 두 backgroundColor를 모두 `#F6F2E7`로 변경**

`app.json`의 expo-splash-screen 블록을 다음과 같이 수정:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#F6F2E7",
    "dark": {
      "backgroundColor": "#F6F2E7"
    }
  }
]
```

`#F6F2E7`은 `app/index.tsx:13`의 fallback View 색상과 일치.

- [ ] **Step 3: 변경 확인**

```bash
grep -A 12 "expo-splash-screen" /Users/baggiyun/dev/dasida-app/app.json
```

Expected: 두 backgroundColor 모두 `#F6F2E7`.

- [ ] **Step 4: prebuild 실행 (네이티브 splash 자산 재생성)**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo prebuild --clean
```

Expected: ios/, android/ 디렉토리가 재생성되고 splash storyboard / drawable에 새 색이 반영된다. 에러 없이 완료.

- [ ] **Step 5: ios splash 색 반영 확인**

```bash
grep -i "F6F2E7\|246.*242.*231\|0\\.96.*0\\.94.*0\\.90" /Users/baggiyun/dev/dasida-app/ios/dasida/SplashScreen.storyboard 2>/dev/null | head -3
```

Expected: 새 색상이 storyboard에 들어가 있다 (RGB로 변환된 형태일 수 있음).

- [ ] **Step 6: commit**

```bash
git -C /Users/baggiyun/dev/dasida-app add app.json ios android
git -C /Users/baggiyun/dev/dasida-app commit -m "$(cat <<'EOF'
chore(splash): match splash background to app beige (#F6F2E7)

스플래시 → 첫 화면 색 점프 제거. light/dark 모두 동일 색으로 통일.

Spec: docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SplashGate 컴포넌트 추출 (인증 ready까지 스플래시 유지)

**Files:**
- Modify: `app/_layout.tsx`

이 task는 두 단계로 나눈다 (3a: 추출, 3b: hide 조건 변경). 단일 commit으로 합친다.

- [ ] **Step 1: 현재 `_layout.tsx` 읽기**

```bash
sed -n '72,150p' /Users/baggiyun/dev/dasida-app/app/_layout.tsx
```

확인 사항:
- 폰트 로딩(`useFonts`) → splash hide 로직이 `RootLayout`에 있음 (line ~104-126)
- `pendingTaskId` ref 처리도 `RootLayout`에 있음 (line ~74, 80-84, 121-124)
- `RootLayout`은 `CurrentLearnerProvider` 바깥이므로 `useCurrentLearner`를 직접 호출 불가

- [ ] **Step 2: import 수정 — `useCallback`, `useRef`는 이미 있는지 확인 후 필요한 것 추가**

`app/_layout.tsx` 상단 import 블록을 다음으로 교체:

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CurrentLearnerProvider, useCurrentLearner } from '@/features/learner/provider';
import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';
import { useColorScheme } from '@/hooks/use-color-scheme';
```

(기존과 비교해 `useCallback`, `useRef` 추가됨)

- [ ] **Step 3: `RootLayout`에서 splash/font 관련 로직과 알림 ref 로직을 제거하고 `<SplashGate />`만 렌더하도록 변경**

`RootLayout` 함수 본문을 다음으로 교체:

```tsx
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CurrentLearnerProvider>
        <ExamSessionProvider>
          <SplashGate />
          <AuthGateRedirector />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="quiz" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
        </ExamSessionProvider>
      </CurrentLearnerProvider>
      <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
    </ThemeProvider>
  );
}
```

변경 포인트:
- `pendingTaskId`, `useEffect`(알림 처리), `useEffect`(asset 프리로드), `useFonts`, `useEffect`(splash hide), early return `if (!fontsLoaded && !fontError) return null` 모두 제거.
- 이 로직들은 `SplashGate`로 이동.
- `<SplashGate />`를 Stack 위에 마운트 (Provider 안쪽이므로 `useCurrentLearner` 호출 가능).

- [ ] **Step 4: `SplashGate` 컴포넌트를 `AuthGateRedirector` 함수 위쪽에 추가**

`AuthGateRedirector`(line ~40)의 직전에 다음 함수를 삽입:

```tsx
function SplashGate() {
  const { authGateState, isReady } = useCurrentLearner();
  const splashHiddenRef = useRef(false);
  const pendingTaskIdRef = useRef<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'SUIT-Regular': require('../assets/fonts/SUIT-Regular.ttf'),
    'SUIT-Medium': require('../assets/fonts/SUIT-Medium.ttf'),
    'SUIT-SemiBold': require('../assets/fonts/SUIT-SemiBold.ttf'),
    'SUIT-Bold': require('../assets/fonts/SUIT-Bold.ttf'),
    'SUIT-ExtraBold': require('../assets/fonts/SUIT-ExtraBold.ttf'),
  });

  const hideSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {});
    if (pendingTaskIdRef.current) {
      router.push({
        pathname: '/quiz/review-session',
        params: { taskId: pendingTaskIdRef.current },
      });
      pendingTaskIdRef.current = null;
    }
  }, []);

  // 콜드스타트 알림 페이로드 캡처 (Stack 마운트 전에 ref에만 저장)
  useEffect(() => {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const taskId = lastResponse.notification.request.content.data?.taskId as string | undefined;
      if (taskId) {
        pendingTaskIdRef.current = taskId;
      }
    }

    // 포그라운드/백그라운드 알림 탭
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.taskId as string | undefined;
      if (taskId) {
        router.push({ pathname: '/quiz/review-session', params: { taskId } });
      }
    });
    return () => subscription.remove();
  }, []);

  // 캐릭터 이미지 프리로드 (스플래시 유지 시간을 활용)
  useEffect(() => {
    void Asset.loadAsync([
      require('../assets/images/characters/char_04.png'),
      require('../assets/images/characters/char_07.png'),
      require('../assets/images/characters/char_sparkle_sunglasses.png'),
    ]).catch(() => {});
  }, []);

  // 폰트 에러 로그
  useEffect(() => {
    if (fontError) {
      console.warn('SUIT font loading failed, using system fallback instead.', fontError);
    }
  }, [fontError]);

  // 정상 케이스: 폰트 + 인증 둘 다 ready되면 스플래시 내림
  useEffect(() => {
    const fontsReady = fontsLoaded || !!fontError;
    const authReady = isReady && authGateState !== 'loading';
    if (fontsReady && authReady) {
      hideSplash();
    }
  }, [fontsLoaded, fontError, isReady, authGateState, hideSplash]);

  return null;
}
```

변경 포인트:
- 폰트 로딩 + 인증 ready 둘 다 만족할 때만 `hideSplash` 호출.
- `splashHiddenRef`로 중복 hide / 중복 라우팅 차단.
- `useCurrentLearner`는 Provider 안쪽이므로 안전하게 호출 가능.
- `pendingTaskIdRef`는 컴포넌트 내부 ref. 콜드 스타트 알림 페이로드를 hide 시점까지 보관.
- `SplashScreen.hideAsync().catch(() => {})` — fast refresh / 미지원 플랫폼에서 두 번 호출되어 reject되는 케이스 무시.

- [ ] **Step 5: 컴파일 / 타입 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit
```

Expected: `app/_layout.tsx` 관련 에러 없음. (다른 파일 사전 에러는 무시 — 이번 변경과 무관)

- [ ] **Step 6: 시뮬레이터에서 동작 확인 (콜드 스타트)**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo run:ios
```

확인:
- 스플래시(베이지+로고)가 인증 체크 끝날 때까지 유지되는지
- 스플래시 → 즉시 quiz 화면(또는 sign-in)으로 전환되는지
- 베이지 빈 화면이 보이지 않는지
- `< (tabs) | index` 헤더가 안 보이는지

❗ 인증 체크가 평소보다 길게 걸리면 (네트워크 느림) 스플래시가 무한 유지될 수 있음 — Task 4의 타임아웃이 그걸 잡음.

- [ ] **Step 7: commit**

```bash
git -C /Users/baggiyun/dev/dasida-app add app/_layout.tsx
git -C /Users/baggiyun/dev/dasida-app commit -m "$(cat <<'EOF'
refactor(navigation): hold splash until auth ready via SplashGate

콜드 스타트 시 베이지 빈 화면이 잠깐 보이던 문제 해결. 폰트 로딩 + 인증
ready 둘 다 만족할 때까지 SplashScreen.hideAsync 호출을 지연한다.

RootLayout의 splash/font/알림 처리 로직을 SplashGate 컴포넌트로 추출.
CurrentLearnerProvider 안쪽에 마운트하여 useCurrentLearner 직접 호출.

타임아웃 안전장치는 후속 commit에서 추가.

Spec: docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 3초 타임아웃 안전장치 추가

**Files:**
- Modify: `app/_layout.tsx` (`SplashGate` 컴포넌트)

- [ ] **Step 1: `SplashGate` 함수의 마지막 `useEffect`(splash hide 조건) 바로 다음에 타임아웃 useEffect 추가**

```tsx
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

- [ ] **Step 2: 타입 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "_layout"
```

Expected: 관련 에러 없음.

- [ ] **Step 3: 타임아웃 동작 확인 — 인증을 인위적으로 지연시켜 검증**

테스트 방법: `features/learner/provider.tsx`의 controller를 임시로 지연시키거나, 네트워크 throttle을 걸어 시뮬레이터에서 콜드 스타트.

빠른 검증 (코드 수정 없이): 시뮬레이터의 Network Link Conditioner로 "100% Loss" 또는 "Very Bad Network" 적용 후 앱 실행.

확인:
- 3초 후 `[splash] forced hide after 3s timeout` 경고가 콘솔에 출력되는지
- 스플래시가 강제로 내려가고 베이지 fallback 화면(index.tsx)이 보이는지
- 강제 hide 후 인증이 늦게 완료되면 정상적으로 화면 전환되는지

확인 후 Network Link Conditioner 해제.

- [ ] **Step 4: 정상 케이스 회귀 확인 (Network 정상 상태로 콜드 스타트)**

확인:
- 스플래시가 짧게 떴다가 사라지고 quiz 화면(또는 sign-in)이 나오는지
- 타임아웃 경고가 콘솔에 안 뜨는지 (정상 케이스에서는 hideSplash가 먼저 실행되므로 타임아웃 콜백이 호출돼도 `splashHiddenRef.current === true`라 무시됨)

- [ ] **Step 5: commit**

```bash
git -C /Users/baggiyun/dev/dasida-app add app/_layout.tsx
git -C /Users/baggiyun/dev/dasida-app commit -m "$(cat <<'EOF'
fix(splash): force hide after 3s timeout to prevent infinite splash

인증 응답이 비정상적으로 오래 걸리거나 isReady가 영원히 false인 버그
시나리오에서 앱이 스플래시에 갇히는 것을 방지한다. 3초 후 강제로
hideAsync를 호출하고 in-app fallback 화면(index.tsx 베이지 View)으로
넘긴다.

Spec: docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 통합 검증 (Spec 체크리스트)

**Files:** 코드 변경 없음. 시뮬레이터에서 수동 검증.

Spec의 "검증 항목" 섹션을 체크리스트로 따라간다.

- [ ] **Step 1: 라이트 모드 콜드 스타트**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo run:ios
```

(앱을 완전히 종료한 후 다시 실행)

확인:
- 스플래시(베이지+로고) → quiz 화면. 색 점프 없음.
- `< (tabs) | index` 헤더 안 보임.

- [ ] **Step 2: 다크 모드 콜드 스타트**

시뮬레이터 → Features → Toggle Appearance (또는 Settings → Developer → Dark Appearance ON) 후 앱 재실행.

확인: 라이트 모드와 동일한 흐름 (스플래시도 베이지로 통일됨).

- [ ] **Step 3: 미인증 사용자 콜드 스타트**

시뮬레이터에서 로그아웃 후 앱 종료 → 재실행.

확인: 스플래시 → sign-in. 빈 화면 / 헤더 노출 없음.

- [ ] **Step 4: 알림 콜드 스타트 (가능한 경우)**

푸시 알림(taskId 포함)이 와 있는 상태에서 알림 탭 → 콜드 스타트 진입.

확인: `/quiz/review-session`으로 정상 라우팅. 미인증 시 sign-in으로 튕김.

- [ ] **Step 5: 안드로이드 콜드 스타트 (가능한 경우)**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo run:android
```

확인: iOS와 동일한 흐름.

- [ ] **Step 6: 타임아웃 동작 (Task 4의 Step 3 결과 재확인)**

3초 fallback이 제대로 동작했는지 한번 더 확인.

- [ ] **Step 7: 검증 결과 메모 작성**

검증 중 발견한 회귀 / 미세한 문제가 있으면 spec 파일 하단 "검증 외 메모" 섹션에 추가하거나, 새로운 commit으로 fix.

- [ ] **Step 8: docs/PROGRESS.md 업데이트**

`docs/PROGRESS.md`에 짧은 한 줄 추가:

```markdown
- 2026-05-02: 콜드 스타트 스플래시 / 인증 게이트 정리 (헤더 노출 차단 + 색 점프 제거 + 3초 타임아웃)
```

위치는 PROGRESS.md의 최신 항목 형식을 따른다 (먼저 읽고 일관성 유지).

```bash
git -C /Users/baggiyun/dev/dasida-app add docs/PROGRESS.md
git -C /Users/baggiyun/dev/dasida-app commit -m "$(cat <<'EOF'
docs(progress): 콜드 스타트 스플래시 / 인증 게이트 정리 기록

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: push + Notion 페이지 업데이트

- [ ] **Step 1: 현재 브랜치 확인**

```bash
git -C /Users/baggiyun/dev/dasida-app branch --show-current
```

Expected: `main` (또는 작업 브랜치)

- [ ] **Step 2: push**

```bash
git -C /Users/baggiyun/dev/dasida-app push origin "$(git -C /Users/baggiyun/dev/dasida-app branch --show-current)"
```

- [ ] **Step 3: spec 파일의 GitHub permalink 확보**

```bash
SPEC_COMMIT=$(git -C /Users/baggiyun/dev/dasida-app log -n 1 --pretty=format:%H -- docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md)
echo "https://github.com/<owner>/dasida-app/blob/${SPEC_COMMIT}/docs/superpowers/specs/2026-05-02-splash-auth-gate-design.md"
```

`<owner>` 부분은 실제 저장소 owner로 치환 (e.g. `kiyounpark`).

- [ ] **Step 4: Notion 페이지 업데이트**

Notion "DASIDA 개발 기록" DB의 페이지([35373f86-2604-8140-a3d5-e8c01f79bbb1](https://app.notion.com/p/35373f8626048140a3d5e8c01f79bbb1))를 업데이트:
- 상태: `구현완료`
- 구현완료일: `2026-05-02` (또는 실제 완료일)
- Spec: 위 Step 3에서 확보한 GitHub permalink
- Plan: 이 plan 파일의 GitHub permalink

`mcp__notion__notion-update-page` 도구로 처리.

- [ ] **Step 5: log:commit 실행 (CLAUDE.md 종료 절차)**

```bash
cd /Users/baggiyun/dev/dasida-app && npm run log:commit
```

- [ ] **Step 6: 종료 알림**

```bash
cd /Users/baggiyun/dev/dasida-app && npm run notify:done -- "콜드 스타트 스플래시 / 인증 게이트 정리 완료 (헤더 노출 차단 + 색 점프 제거 + 3초 타임아웃)"
```

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | 대응 task |
|-----------|-----------|
| A.5: app.json 색상 변경 | Task 2 |
| C: SplashScreen.hideAsync 조건 변경 | Task 3 |
| 3초 타임아웃 | Task 4 |
| `SplashGate` 컴포넌트 분리 | Task 3 Step 4 |
| `unstable_settings.anchor` 유지 | 변경 없음 (계획상 명시) |
| `app/index.tsx` 임시 수정 유지 | Task 1에서 commit |
| 검증 항목 (라이트/다크/미인증/알림/타임아웃/회귀) | Task 5 |

누락 없음.

### Placeholder 스캔

- TBD/TODO/"적절한 에러 처리" 등 없음.
- 모든 코드 step에 실제 코드 블록 포함.
- 모든 명령에 expected output 포함.

### Type 일관성

- `SplashGate`, `splashHiddenRef`, `pendingTaskIdRef`, `hideSplash` 이름이 모든 task에서 일관됨.
- `useCurrentLearner` 반환값 `{ isReady, authGateState }`는 `features/learner/provider.tsx:87-88`의 정의와 일치.
- `Notifications.getLastNotificationResponse` / `addNotificationResponseReceivedListener` 시그니처는 기존 `_layout.tsx`와 동일.

이슈 없음.
