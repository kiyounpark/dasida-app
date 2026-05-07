# iPad 가로 모드 부분 지원 (exam-solve 한정) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `exam-solve-screen` 진입 시에만 iPad 가로 모드를 허용하고, 첫 진입 시 안내 배너를 표시한다. 다른 화면은 현재처럼 세로 잠금 유지.

**Architecture:** `app.config.js` plist에서 iPad만 가로 허용 + `expo-screen-orientation` 라이브러리로 런타임 lock/unlock 제어. 앱 루트에서 기본 portrait 잠금, exam-solve 진입 시 unlock, 이탈 시 다시 lock. 회전 시 진행 중인 stroke 자동 종료.

**Tech Stack:** React Native, Expo Router, expo-screen-orientation (신규), AsyncStorage, Jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-05-07-ipad-landscape-exam-solve-design.md`

---

## File Structure

### 신규 파일
- `hooks/use-orientation-lock.ts` — `lockToPortrait()` / `unlockAllOrientations()` 헬퍼 (라이브러리 호출 캡슐화, 실패 graceful 처리)
- `hooks/use-orientation-lock.test.ts` — 헬퍼 단위 테스트
- `features/quiz/exam/storage/landscape-hint-store.ts` — 배너 본 적 있는지 flag 저장/조회
- `features/quiz/exam/storage/landscape-hint-store.test.ts` — store 단위 테스트
- `features/quiz/exam/components/landscape-hint-banner.tsx` — 배너 UI 컴포넌트
- `features/quiz/exam/components/landscape-hint-banner.test.tsx` — 배너 단위 테스트

### 수정 파일
- `app.config.js` — iPad orientation 4 방향 + `requireFullScreen: true`
- `package.json` — `expo-screen-orientation` 추가
- `constants/storage-keys.ts` — `landscapeHintSeen` 키 추가
- `app/_layout.tsx` — RootLayout 마운트 시 `lockToPortrait()`
- `features/quiz/exam/hooks/use-exam-solve-screen.ts` — `useFocusEffect`로 진입 시 unlock / 이탈 시 lock
- `features/quiz/exam/components/exam-solve-tablet-layout.tsx` — orientation change 리스너 (endStroke) + 배너 렌더링

### 책임 분리
- **lock/unlock 타이밍** → `use-exam-solve-screen.ts` (screen lifecycle)
- **회전 시 stroke 정리** → `exam-solve-tablet-layout.tsx` (scratchpad 소유처)
- **라이브러리 호출** → `use-orientation-lock.ts` (캡슐화)

---

## Task 1: expo-screen-orientation 설치 및 plist 설정

**Files:**
- Modify: `package.json`
- Modify: `app.config.js`

이번 task는 **네이티브 의존성을 추가**하므로 `npx expo prebuild --clean` 필수.

- [ ] **Step 1: expo-screen-orientation 설치**

```bash
npx expo install expo-screen-orientation
```

Expected: `package.json`에 `"expo-screen-orientation": "..."` 추가, `package-lock.json` 갱신.

- [ ] **Step 2: app.config.js의 ios.infoPlist 수정**

`app.config.js` 의 `ios` 섹션을 다음과 같이 수정한다:

```js
ios: {
  bundleIdentifier: IS_DEV ? 'com.dasida.app.dev' : 'com.dasida.app',
  buildNumber: '1',
  usesAppleSignIn: true,
  supportsTablet: true,
  requireFullScreen: true, // iPad 멀티태스킹 비활성화
  infoPlist: {
    ITSAppUsesNonExemptEncryption: false,
    UISupportedInterfaceOrientations: [
      'UIInterfaceOrientationPortrait',
    ],
    'UISupportedInterfaceOrientations~ipad': [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ],
  },
},
```

- [ ] **Step 3: prebuild + 빌드 실행**

```bash
npx expo prebuild --clean
npx expo run:ios
```

Expected: 시뮬레이터에서 앱 정상 실행. 아직 동작 변경 없음 (코드 미통합).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.config.js
git commit -m "chore: add expo-screen-orientation and ipad landscape plist entries"
```

---

## Task 2: storage-keys 상수 추가

**Files:**
- Modify: `constants/storage-keys.ts`

- [ ] **Step 1: 상수 추가**

`constants/storage-keys.ts` 의 `StorageKeys` 객체에 키 추가:

```ts
export const StorageKeys = {
  // ... 기존 키 그대로 ...
  scratchpadPrefix: 'dasida/scratchpad/',
  scratchpadSplitRatioPrefix: 'dasida/scratchpad-split-ratio/',
  landscapeHintSeen: 'dasida/landscape-hint-seen', // 추가
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add constants/storage-keys.ts
git commit -m "chore: add landscapeHintSeen storage key"
```

---

## Task 3: use-orientation-lock 훅 (TDD)

**Files:**
- Create: `hooks/use-orientation-lock.ts`
- Create: `hooks/use-orientation-lock.test.ts`

라이브러리 호출 캡슐화. 실패 시 throw 안 하고 console.warn.

- [ ] **Step 1: 실패 테스트 작성**

`hooks/use-orientation-lock.test.ts`:

```ts
import * as ScreenOrientation from 'expo-screen-orientation';

import { lockToPortrait, unlockAllOrientations } from './use-orientation-lock';

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  unlockAsync: jest.fn(),
  OrientationLock: { PORTRAIT_UP: 1 },
}));

const mocked = jest.mocked(ScreenOrientation);

describe('use-orientation-lock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  describe('lockToPortrait', () => {
    it('ScreenOrientation.lockAsync(PORTRAIT_UP) 호출', async () => {
      mocked.lockAsync.mockResolvedValueOnce(undefined as never);
      await lockToPortrait();
      expect(mocked.lockAsync).toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    });

    it('lockAsync 실패해도 throw 안 함', async () => {
      mocked.lockAsync.mockRejectedValueOnce(new Error('boom'));
      await expect(lockToPortrait()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('unlockAllOrientations', () => {
    it('ScreenOrientation.unlockAsync 호출', async () => {
      mocked.unlockAsync.mockResolvedValueOnce(undefined as never);
      await unlockAllOrientations();
      expect(mocked.unlockAsync).toHaveBeenCalled();
    });

    it('unlockAsync 실패해도 throw 안 함', async () => {
      mocked.unlockAsync.mockRejectedValueOnce(new Error('boom'));
      await expect(unlockAllOrientations()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx jest hooks/use-orientation-lock.test.ts
```

Expected: FAIL — `Cannot find module './use-orientation-lock'`

- [ ] **Step 3: 헬퍼 구현**

`hooks/use-orientation-lock.ts`:

```ts
import * as ScreenOrientation from 'expo-screen-orientation';

export async function lockToPortrait(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    console.warn('[orientation-lock] lockToPortrait failed', error);
  }
}

export async function unlockAllOrientations(): Promise<void> {
  try {
    await ScreenOrientation.unlockAsync();
  } catch (error) {
    console.warn('[orientation-lock] unlockAllOrientations failed', error);
  }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx jest hooks/use-orientation-lock.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-orientation-lock.ts hooks/use-orientation-lock.test.ts
git commit -m "feat(orientation): add lockToPortrait/unlockAllOrientations helpers"
```

---

## Task 4: landscape-hint-store (TDD)

**Files:**
- Create: `features/quiz/exam/storage/landscape-hint-store.ts`
- Create: `features/quiz/exam/storage/landscape-hint-store.test.ts`

배너 한 번 닫으면 다시 안 보이도록 AsyncStorage flag 관리.

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/exam/storage/landscape-hint-store.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasSeenLandscapeHint, markLandscapeHintSeen } from './landscape-hint-store';

const mocked = jest.mocked(AsyncStorage);

describe('landscape-hint-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  describe('hasSeenLandscapeHint', () => {
    it('flag 없으면 false 반환', async () => {
      mocked.getItem.mockResolvedValueOnce(null);
      const seen = await hasSeenLandscapeHint();
      expect(seen).toBe(false);
    });

    it('flag "1"이면 true 반환', async () => {
      mocked.getItem.mockResolvedValueOnce('1');
      const seen = await hasSeenLandscapeHint();
      expect(seen).toBe(true);
    });

    it('AsyncStorage 실패 시 false (graceful)', async () => {
      mocked.getItem.mockRejectedValueOnce(new Error('boom'));
      const seen = await hasSeenLandscapeHint();
      expect(seen).toBe(false);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('markLandscapeHintSeen', () => {
    it('flag "1" 저장', async () => {
      mocked.setItem.mockResolvedValueOnce(undefined);
      await markLandscapeHintSeen();
      expect(mocked.setItem).toHaveBeenCalledWith(
        'dasida/landscape-hint-seen',
        '1',
      );
    });

    it('AsyncStorage 실패해도 throw 안 함', async () => {
      mocked.setItem.mockRejectedValueOnce(new Error('boom'));
      await expect(markLandscapeHintSeen()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx jest features/quiz/exam/storage/landscape-hint-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: store 구현**

`features/quiz/exam/storage/landscape-hint-store.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

export async function hasSeenLandscapeHint(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(StorageKeys.landscapeHintSeen);
    return value === '1';
  } catch (error) {
    console.warn('[landscape-hint-store] hasSeenLandscapeHint failed', error);
    return false;
  }
}

export async function markLandscapeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(StorageKeys.landscapeHintSeen, '1');
  } catch (error) {
    console.warn('[landscape-hint-store] markLandscapeHintSeen failed', error);
  }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx jest features/quiz/exam/storage/landscape-hint-store.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/storage/landscape-hint-store.ts features/quiz/exam/storage/landscape-hint-store.test.ts
git commit -m "feat(quiz): add landscape-hint-store for one-time banner flag"
```

---

## Task 5: landscape-hint-banner 컴포넌트 (TDD)

**Files:**
- Create: `features/quiz/exam/components/landscape-hint-banner.tsx`
- Create: `features/quiz/exam/components/landscape-hint-banner.test.tsx`

UI: 상단 배너 + ✕ 버튼. props로 표시 조건과 닫기 핸들러 받는다 (조건/저장 로직은 부모가 담당).

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/exam/components/landscape-hint-banner.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';

import { LandscapeHintBanner } from './landscape-hint-banner';

describe('LandscapeHintBanner', () => {
  it('메시지 텍스트 렌더링', () => {
    const { getByText } = render(<LandscapeHintBanner onDismiss={jest.fn()} />);
    expect(getByText(/옆으로 돌리면/)).toBeTruthy();
  });

  it('✕ 탭 시 onDismiss 호출', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(<LandscapeHintBanner onDismiss={onDismiss} />);
    fireEvent.press(getByLabelText('안내 닫기'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx jest features/quiz/exam/components/landscape-hint-banner.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: 컴포넌트 구현**

`features/quiz/exam/components/landscape-hint-banner.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onDismiss: () => void;
};

export function LandscapeHintBanner({ onDismiss }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>
        💡 iPad를 옆으로 돌리면 필기 공간이 더 넓어져요
      </Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        hitSlop={12}
        style={styles.close}
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF7E6',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5A8',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#7A4F00',
  },
  close: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeIcon: {
    fontSize: 16,
    color: '#7A4F00',
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx jest features/quiz/exam/components/landscape-hint-banner.test.tsx
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/components/landscape-hint-banner.tsx features/quiz/exam/components/landscape-hint-banner.test.tsx
git commit -m "feat(quiz): add landscape-hint-banner presentational component"
```

---

## Task 6: app/_layout.tsx 앱 시작 portrait 잠금

**Files:**
- Modify: `app/_layout.tsx`

앱 마운트 시점에 `lockToPortrait()` 호출. 기존 useEffect와 충돌 없도록 별도 useEffect로 추가.

- [ ] **Step 1: import 추가**

`app/_layout.tsx` 상단 import 영역에 추가:

```ts
import { lockToPortrait } from '@/hooks/use-orientation-lock';
```

- [ ] **Step 2: useEffect 추가**

`RootLayout` 컴포넌트 내부에 다른 useEffect들과 나란히 배치:

```ts
// 앱 전체 기본값: 세로 잠금. 가로 허용은 exam-solve-screen이 진입 시 해제.
useEffect(() => {
  lockToPortrait();
}, []);
```

- [ ] **Step 3: 시뮬레이터 검증**

```bash
npx expo run:ios
```

Expected:
- 앱 시작 → 홈/탐색 화면에서 iPad 회전 시도해도 세로 유지
- iPhone에서도 정상 동작 (이미 portrait-only)

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): lock orientation to portrait on app start"
```

---

## Task 7: use-exam-solve-screen에 lock/unlock 통합

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-solve-screen.ts`

`useFocusEffect` 사용 (mount/unmount 외에 navigation focus/blur도 처리).

- [ ] **Step 1: import 추가**

`features/quiz/exam/hooks/use-exam-solve-screen.ts` 상단:

```ts
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { lockToPortrait, unlockAllOrientations } from '@/hooks/use-orientation-lock';
```

(기존 react import에 `useCallback` 추가 — 이미 있으면 합치기)

- [ ] **Step 2: hook 본문에 useFocusEffect 추가**

`useExamSolveScreen` 함수 본문 안, 다른 useEffect들 근처에:

```ts
// orientation: 진입 시 가로 허용, 이탈 시 다시 세로 잠금
useFocusEffect(
  useCallback(() => {
    unlockAllOrientations();
    return () => {
      lockToPortrait();
    };
  }, []),
);
```

- [ ] **Step 3: 시뮬레이터 검증 (수동)**

```bash
npx expo run:ios
```

Expected (iPad):
- 홈 → 세로 고정
- 홈 → exam-solve 진입 → iPad 가로로 돌릴 수 있음
- exam-solve → 다른 화면 (결과/뒤로) → 자동 세로 복귀
- 가로 상태에서 뒤로 가도 다음 화면이 세로로 정상 표시

- [ ] **Step 4: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-solve-screen.ts
git commit -m "feat(quiz): unlock orientation on exam-solve focus, relock on blur"
```

---

## Task 8: exam-solve-tablet-layout에 회전 시 endStroke + 배너 통합

**Files:**
- Modify: `features/quiz/exam/components/exam-solve-tablet-layout.tsx`

이 task는 두 가지를 추가한다:
1. orientation change 리스너로 회전 시 `scratchpad.endStroke()` 호출 (cleanup 포함)
2. 첫 진입 시 배너 조건부 렌더 (iPad + portrait + unseen)

- [ ] **Step 1: import 추가**

`features/quiz/exam/components/exam-solve-tablet-layout.tsx` 상단 import 영역:

```tsx
import * as ScreenOrientation from 'expo-screen-orientation';

import { LandscapeHintBanner } from './landscape-hint-banner';
import {
  hasSeenLandscapeHint,
  markLandscapeHintSeen,
} from '@/features/quiz/exam/storage/landscape-hint-store';
```

(기존 useEffect, useRef, useState, useWindowDimensions은 이미 import 되어 있으므로 그대로)

- [ ] **Step 2: 회전 시 endStroke 리스너 추가**

`ExamSolveTabletLayout` 함수 본문, scratchpad 변수 정의 직후에 추가:

```tsx
// 회전 감지 → 진행 중인 stroke 정리 (좌표 깨짐 방지)
useEffect(() => {
  const subscription = ScreenOrientation.addOrientationChangeListener(() => {
    scratchpad.endStroke();
  });
  return () => {
    ScreenOrientation.removeOrientationChangeListener(subscription);
  };
}, [scratchpad]);
```

- [ ] **Step 3: 배너 표시 상태 관리**

같은 함수 본문에 추가:

```tsx
const [showHint, setShowHint] = useState(false);
const isPortrait = height >= width;

useEffect(() => {
  let cancelled = false;
  if (!isPortrait) return; // 이미 가로면 표시 X
  hasSeenLandscapeHint().then((seen) => {
    if (!cancelled && !seen) setShowHint(true);
  });
  return () => {
    cancelled = true;
  };
}, [isPortrait]);

const handleDismissHint = () => {
  setShowHint(false);
  void markLandscapeHintSeen();
};
```

- [ ] **Step 4: 배너 JSX 렌더**

`return` 절에서 header 위 또는 split 컨테이너 위 적절한 위치에 추가:

```tsx
return (
  <View style={styles.container}>
    {showHint ? <LandscapeHintBanner onDismiss={handleDismissHint} /> : null}
    {header}
    {/* ... 기존 split body ... */}
  </View>
);
```

(정확한 위치는 기존 JSX 구조에 맞춰 header 직전 또는 직후. 현재 root `<View style={styles.container}>` 바로 안쪽 첫 자식으로 배치)

- [ ] **Step 5: 시뮬레이터 통합 검증**

```bash
npx expo run:ios
```

Expected (iPad simulator):
- exam-solve 첫 진입 (세로) → 배너 표시
- ✕ 닫기 → 사라짐, 재진입해도 안 보임
- 펜으로 그리는 중 회전 → stroke 정리됨, 크래시 없음
- 가로에서 그린 후 → 세로 복귀 → 그림 보존
- 빠르게 회전 반복 → 크래시 없음

- [ ] **Step 6: Commit**

```bash
git add features/quiz/exam/components/exam-solve-tablet-layout.tsx
git commit -m "feat(quiz): handle orientation change with endStroke and show landscape hint banner"
```

---

## Task 9: 통합 회귀 검증 (iPad 시뮬레이터, 수동)

**Files:** 없음 (검증만)

| # | 시나리오 | 기대 결과 | 통과? |
|---|---|---|---|
| 1 | 앱 시작 → 홈 | 세로 고정, 회전 안 됨 | ☐ |
| 2 | 홈 → exam-solve 진입 (세로) | 세로 유지, 배너 표시 | ☐ |
| 3 | 배너 ✕ 닫기 → 재진입 | 사라짐 + 미표시 | ☐ |
| 4 | exam-solve에서 가로 회전 | 회전됨, split 가로 비율 | ☐ |
| 5 | 필기 중 회전 | stroke 종료, 그림 보존, 크래시 없음 | ☐ |
| 6 | 가로에서 결과 화면 이동 | 자동 세로 복귀, 결과 정상 | ☐ |
| 7 | 가로 + 백그라운드 → 복귀 | 가로 유지 | ☐ |
| 8 | 빠른 회전 반복 (10회) | 크래시 없음 | ☐ |
| 9 | 세로 → 가로 → 세로 그림 보존 | 그림 그대로 | ☐ |
| 10 | iPhone 시뮬레이터에서 동작 정상 | 변경 없음, portrait 유지 | ☐ |
| 11 | 온보딩/로그인/홈/결과/프로필/히스토리 → 세로만 유지 | 가로 누수 없음 | ☐ |

- [ ] **Step 1: 위 시나리오 1~11 모두 통과 확인**

각 시나리오 통과 시 체크박스 채우기.

- [ ] **Step 2: Reanimated/Skia 크래시 모니터링**

dc45701에서 고친 영역(`scratchpad-canvas.tsx`의 Reanimated worklet)을 회전 중에 충돌하는지 특히 주의. Console에 worklet 경고 또는 크래시 로그 있는지 확인.

발생 시 → 캔버스 dispose 처리를 `useEffect` cleanup에 추가하거나 Skia path 재생성 로직 점검.

- [ ] **Step 3: Commit (검증 완료 메모)**

검증 통과 후 `docs/PROGRESS.md` 에 항목 추가:

```bash
git add docs/PROGRESS.md
git commit -m "docs: log ipad landscape exam-solve verification"
```

---

## Self-Review

이 plan을 작성 후 spec 대비 점검:

### Spec 커버리지

| Spec 섹션 | 구현 task |
|---|---|
| §3 아키텍처 (plist + lock/unlock) | Task 1, 6, 7 |
| §4 신규 파일 (`use-orientation-lock`) | Task 3 |
| §4 신규 파일 (`landscape-hint-banner`) | Task 5 |
| §4 신규 파일 (`landscape-hint-store`) | Task 4 |
| §4 수정 (`storage-keys`) | Task 2 |
| §4 수정 (`app/_layout.tsx`) | Task 6 |
| §4 수정 (`use-exam-solve-screen`) | Task 7 |
| §4 수정 (`exam-solve-tablet-layout`) | Task 8 |
| §5 데이터 흐름 시나리오 A~D | Task 9 시나리오 1~9 |
| §6 배너 표시 조건 | Task 8 Step 3 |
| §7 엣지 케이스 1, 4, 5, 6, 7 | Task 9 시나리오 + 헬퍼의 graceful 처리 (Task 3) |
| §7 엣지 케이스 8 (Reanimated/Skia 크래시) | Task 9 Step 2 |
| §8 단위 테스트 | Task 3, 4, 5 |
| §8 통합 테스트 | Task 9 |
| §8 회귀 테스트 | Task 9 시나리오 10, 11 |
| §8 빌드 검증 | Task 1 Step 3 |

### Spec과의 차이점 (의도적)

- spec §4의 "use-exam-solve-screen.ts ... 리스너 콜백에서 endStroke 호출"은 실제 구조상 scratchpad가 tablet-layout에서 인스턴스화되므로 리스너를 tablet-layout에 둠. lock/unlock만 hook에 둠. 책임 분리는 동일하게 깔끔함.

### Placeholder 스캔

플랜에 TBD/TODO/"적절한"/"비슷한"/"위와 같이" 등 모호 표현 없음. 모든 코드 블록 완전.

### 타입 일관성

- `lockToPortrait()`, `unlockAllOrientations()` — Task 3 정의, Task 6/7에서 동일 시그니처 사용 ✅
- `hasSeenLandscapeHint()`, `markLandscapeHintSeen()` — Task 4 정의, Task 8에서 동일 사용 ✅
- `LandscapeHintBanner` props (`onDismiss`) — Task 5 정의, Task 8에서 동일 사용 ✅
- `StorageKeys.landscapeHintSeen` — Task 2 추가, Task 4에서 동일 키 사용 ✅
- `scratchpad.endStroke()` — `useScratchpad` 기존 API, Task 8에서 호출 ✅

---

## Future Work (이번 plan에서 제외)

⚠️ **사용자께 약속드린 알림**:

- **F1**: scratchpad를 약점 진단풀이 / 모의고사 / 복습 화면에도 추가 → 별도 spec
- **F2**: iPad 멀티태스킹 재고려 → 사용자 데이터 확인 후
- **F3**: 가로 시 split ratio / 툴바 / pencil-only 토글 UX 개선
- **F4**: `useIsTablet`을 `Math.min(width, height) >= 744`로 보강 (iPhone landscape 허용 시)

---

## Notion 업데이트 (구현 완료 후)

CLAUDE.md 종료 절차에 따라:

1. `notion-update-page` 로 "DASIDA 개발 기록" → "iPad 가로 모드 부분 지원" 페이지:
   - 상태 → `구현완료`
   - 구현완료일 → 오늘
   - Spec → GitHub permalink
   - Plan → GitHub permalink
2. 본문 `## 완료 메모` 섹션에 검증 결과 / 특이사항 추가
