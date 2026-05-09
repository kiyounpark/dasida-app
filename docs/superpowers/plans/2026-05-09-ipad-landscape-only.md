# iPad/Android Tablet Landscape-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 태블릿(iPad + Android tablet)을 landscape-only로 고정한다. iPhone과 Android phone은 portrait 유지. 회전 안내·잠금 우회 코드를 제거한다.

**Architecture:**
- iOS: `app.json`의 `expo.ios.infoPlist`에 `UISupportedInterfaceOrientations` + `~ipad` 키로 디바이스별 방향을 정적 선언 (portrait flash 없음).
- Android: `app.json`의 `expo.android.orientation`은 `default`로 두고, `app/_layout.tsx`에서 `expo-screen-orientation`을 사용해 디바이스가 태블릿이면 `LANDSCAPE`, 아니면 `PORTRAIT_UP`으로 런타임 lock.
- 화면 진입 시 unlock / 이탈 시 portrait lock 패턴은 더 이상 필요 없으므로 관련 훅·배너·스토어 일체 제거.

**Tech Stack:** Expo SDK + Expo Router · expo-screen-orientation · React Native (`Platform`, `Dimensions`) · Jest

**Spec:** [docs/superpowers/specs/2026-05-09-ipad-landscape-only-design.md](../specs/2026-05-09-ipad-landscape-only-design.md)

---

## File Map

### 새로 만드는 파일

없음 (정책 변경 + 정리 작업이 주).

### 손대지 않는 파일 (확인 필요)

다음 파일들은 spec §4.2가 변경 대상으로 언급했으나, 실제 코드 확인 결과 회전 관련 코드를 사용하지 않으므로 **본 plan에서 변경하지 않는다.** Task 8 Step 2의 잔존 참조 grep으로 재확인.

- `features/quiz/exam/screens/exam-diagnosis-screen.tsx` — `useIsTablet()`만 사용. `useExamScreenOrientation`/`LandscapeHintBanner` import 없음. (이 파일이 챗봇 = `DiagnosisChatBubble`/`DiagnosisFlowCard`의 호스트.)
- `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` — 동일.

### 수정하는 파일

| 파일 | 변경 요지 |
|---|---|
| `hooks/use-orientation-lock.ts` | Android 런타임 lock 용도. `lockToPortrait` 유지, `unlockAllOrientations` 제거, `lockToLandscape` 추가 |
| `hooks/use-orientation-lock.test.ts` | 위 변경에 맞춰 테스트 갱신 |
| `app/_layout.tsx` | 무조건 `lockToPortrait()` 호출 → Android에서만 디바이스에 따라 `lockToLandscape()` / `lockToPortrait()` 호출 |
| `features/quiz/exam/hooks/use-exam-solve-screen.ts` | `useExamScreenOrientation` 호출, `showLandscapeHint`/`onDismissLandscapeHint` 상태/로직, `isPortrait`/`useTabletLayout` 분기, `landscape-hint-store` import 제거. `useTabletLayout` → `isTablet` 단순화 |
| `features/quiz/exam/screens/exam-solve-screen.tsx` | `LandscapeHintBanner` import/렌더 제거. `showLandscapeHint`, `onDismissLandscapeHint` destructuring 제거 |
| `constants/storage-keys.ts` | `landscapeHintSeen` 키 제거 |
| `app.json` | iOS `infoPlist` 방향 키 추가, top-level `orientation`을 `default`로, `android.orientation`을 `default`로 명시 |

### 삭제하는 파일

| 파일 | 사유 |
|---|---|
| `features/quiz/exam/hooks/use-exam-screen-orientation.ts` | 진입 시 unlock / 이탈 시 portrait lock 자체가 불필요 |
| `features/quiz/exam/hooks/use-exam-screen-orientation.test.ts` | 위와 동반 |
| `features/quiz/exam/components/landscape-hint-banner.tsx` | 더 이상 안내 불필요 |
| `features/quiz/exam/components/landscape-hint-banner.test.tsx` | 위와 동반 |
| `features/quiz/exam/storage/landscape-hint-store.ts` | 사용처 사라짐 |
| `features/quiz/exam/storage/landscape-hint-store.test.ts` | 위와 동반 |

---

## Task 순서 개요

1. **Task 1** — `use-orientation-lock` 재구성 (TDD)
2. **Task 2** — 제거: `use-exam-screen-orientation` (훅 + 테스트)
3. **Task 3** — 제거: `landscape-hint-banner` + `landscape-hint-store` + storage key
4. **Task 4** — `use-exam-solve-screen` 단순화
5. **Task 5** — `exam-solve-screen` 단순화
6. **Task 6** — `app/_layout.tsx` 플랫폼 분기 lock
7. **Task 7** — `app.json` 방향 정책 갱신
8. **Task 8** — 정적 검증 (typecheck + jest)
9. **Task 9** — iOS prebuild + iPhone/iPad 시뮬레이터 검증
10. **Task 10** — Android 시뮬레이터 검증

---

## Task 1: `use-orientation-lock` 재구성 (TDD)

**Goal:** `unlockAllOrientations`를 제거하고 `lockToLandscape`를 추가. iOS Info.plist가 정적 lock하므로 이 모듈은 Android에서만 호출되는 보조 헬퍼가 된다.

**Files:**
- Modify: `hooks/use-orientation-lock.ts`
- Modify: `hooks/use-orientation-lock.test.ts`

- [ ] **Step 1: 테스트 갱신 — `unlockAllOrientations` 케이스 제거 + `lockToLandscape` 케이스 추가 (failing)**

`hooks/use-orientation-lock.test.ts`를 다음 내용으로 통째로 교체:

```ts
import * as ScreenOrientation from 'expo-screen-orientation';

import { lockToLandscape, lockToPortrait } from './use-orientation-lock';

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  OrientationLock: { PORTRAIT_UP: 1, LANDSCAPE: 4 },
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

  describe('lockToLandscape', () => {
    it('ScreenOrientation.lockAsync(LANDSCAPE) 호출', async () => {
      mocked.lockAsync.mockResolvedValueOnce(undefined as never);
      await lockToLandscape();
      expect(mocked.lockAsync).toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    });

    it('lockAsync 실패해도 throw 안 함', async () => {
      mocked.lockAsync.mockRejectedValueOnce(new Error('boom'));
      await expect(lockToLandscape()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest hooks/use-orientation-lock.test.ts`
Expected: FAIL — `lockToLandscape`가 export되지 않거나 정의되지 않음

- [ ] **Step 3: `use-orientation-lock.ts` 구현 갱신**

`hooks/use-orientation-lock.ts`를 다음 내용으로 통째로 교체:

```ts
import * as ScreenOrientation from 'expo-screen-orientation';

export async function lockToPortrait(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    console.warn('[orientation-lock] lockToPortrait failed', error);
  }
}

export async function lockToLandscape(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch (error) {
    console.warn('[orientation-lock] lockToLandscape failed', error);
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest hooks/use-orientation-lock.test.ts`
Expected: PASS — 4건 모두 성공

- [ ] **Step 5: 커밋**

```bash
git add hooks/use-orientation-lock.ts hooks/use-orientation-lock.test.ts
git commit -m "refactor(orientation-lock): replace unlock with lockToLandscape

iPad는 Info.plist 정적, Android는 런타임 분기로 호출되도록 단순화.
unlockAllOrientations는 호출처가 모두 사라져 제거.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 제거 — `use-exam-screen-orientation` 훅 + 테스트

**Goal:** 화면 진입 시 unlock / 이탈 시 portrait lock 패턴 자체가 불필요해졌으므로 훅과 테스트를 삭제한다. (호출처 정리는 Task 4에서 진행)

**Files:**
- Delete: `features/quiz/exam/hooks/use-exam-screen-orientation.ts`
- Delete: `features/quiz/exam/hooks/use-exam-screen-orientation.test.ts`

- [ ] **Step 1: 훅과 테스트 파일 삭제**

```bash
rm features/quiz/exam/hooks/use-exam-screen-orientation.ts
rm features/quiz/exam/hooks/use-exam-screen-orientation.test.ts
```

- [ ] **Step 2: 잔존 import 검증**

Run: `grep -rn "use-exam-screen-orientation\|useExamScreenOrientation" --include="*.ts" --include="*.tsx" .`
Expected: `features/quiz/exam/hooks/use-exam-solve-screen.ts`에만 import/호출이 남아 있어야 함 (Task 4에서 제거 예정). 그 외는 0건.

- [ ] **Step 3: 커밋 (이번 단계 추가만)**

이 시점에는 `use-exam-solve-screen.ts`가 깨진 import를 가지므로 commit은 Task 4 종료 후 묶어서 한다. **여기선 커밋하지 않고** Task 3, 4와 함께 진행.

> NOTE: Step 3는 의도적으로 비커밋 단계. Task 4 커밋에 포함된다.

---

## Task 3: 제거 — `landscape-hint-banner` + `landscape-hint-store` + storage key

**Goal:** "옆으로 돌리세요" 배너 시스템 일체 제거. iPad가 항상 landscape이므로 안내 자체가 불필요.

**Files:**
- Delete: `features/quiz/exam/components/landscape-hint-banner.tsx`
- Delete: `features/quiz/exam/components/landscape-hint-banner.test.tsx`
- Delete: `features/quiz/exam/storage/landscape-hint-store.ts`
- Delete: `features/quiz/exam/storage/landscape-hint-store.test.ts`
- Modify: `constants/storage-keys.ts`

- [ ] **Step 1: 배너 + 스토어 파일 삭제**

```bash
rm features/quiz/exam/components/landscape-hint-banner.tsx
rm features/quiz/exam/components/landscape-hint-banner.test.tsx
rm features/quiz/exam/storage/landscape-hint-store.ts
rm features/quiz/exam/storage/landscape-hint-store.test.ts
```

- [ ] **Step 2: storage key 제거**

`constants/storage-keys.ts` 14번 줄의 `landscapeHintSeen` 항목을 제거:

변경 전:
```ts
  landscapeHintSeen: 'dasida/landscape-hint-seen',
```

변경 후:
(해당 줄 삭제 — 객체 컴마/괄호 균형 유지)

- [ ] **Step 3: 잔존 참조 검증**

Run: `grep -rn "landscape-hint\|landscapeHint\|LandscapeHint\|hasSeenLandscapeHint\|markLandscapeHintSeen" --include="*.ts" --include="*.tsx" .`
Expected: 다음 두 파일에만 잔존 (Task 4·5에서 제거):
- `features/quiz/exam/hooks/use-exam-solve-screen.ts`
- `features/quiz/exam/screens/exam-solve-screen.tsx`

- [ ] **Step 4: 커밋 보류**

`use-exam-solve-screen.ts`/`exam-solve-screen.tsx`가 깨진 import를 가지므로 커밋은 Task 5 종료 후 일괄. **여기선 커밋하지 않음.**

---

## Task 4: `use-exam-solve-screen` 단순화

**Goal:** 회전·힌트 관련 상태/로직을 모두 제거. `useTabletLayout`은 `isTablet`과 동치이므로 결과 객체에서 제거하고 호출처(Task 5)는 `isTablet`을 직접 사용하도록 변경.

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-solve-screen.ts`

- [ ] **Step 1: import 정리**

`features/quiz/exam/hooks/use-exam-solve-screen.ts` 상단 import 블록을 다음과 같이 변경:

변경 전 (1-15줄):
```ts
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { useIsTablet } from '@/hooks/use-is-tablet';

import { getExamProblems } from '@/features/quiz/data/exam-problems';

import {
  hasSeenLandscapeHint,
  markLandscapeHintSeen,
} from '../storage/landscape-hint-store';
import { useExamSession } from '../exam-session';
import { useExamScreenOrientation } from './use-exam-screen-orientation';
import { useScratchpad, type UseScratchpadResult } from './use-scratchpad';
```

변경 후:
```ts
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { useIsTablet } from '@/hooks/use-is-tablet';

import { getExamProblems } from '@/features/quiz/data/exam-problems';

import { useExamSession } from '../exam-session';
import { useScratchpad, type UseScratchpadResult } from './use-scratchpad';
```

> 변경점: `useCallback` 제거(아래에서 미사용), `hasSeenLandscapeHint`/`markLandscapeHintSeen` import 삭제, `useExamScreenOrientation` import 삭제.

- [ ] **Step 2: 결과 타입에서 회전 관련 필드 제거**

`UseExamSolveScreenResult` (17-44줄)에서 다음 필드를 제거:
- `isPortrait: boolean;`
- `useTabletLayout: boolean;`
- `showLandscapeHint: boolean;`
- `onDismissLandscapeHint: () => void;`

- [ ] **Step 3: 본문에서 회전 관련 로컬 변수와 effect 제거**

다음 세 블록을 모두 제거 (라인 번호는 Step 1/2 적용 후 밀릴 수 있으므로 내용으로 식별):

**(a) `isPortrait` / `useTabletLayout` 로컬 변수**
```ts
const isPortrait = height >= width;
const useTabletLayout = isTablet && !isPortrait;
```

**(b) `handleOrientationChange` + `useExamScreenOrientation` 호출 블록**
```ts
// 회전 도중 휘발 stroke을 끊어 Reanimated/Skia 충돌을 방지.
const handleOrientationChange = useCallback(() => {
  scratchpad.endStroke();
}, [scratchpad.endStroke]); // eslint-disable-line react-hooks/exhaustive-deps

useExamScreenOrientation({
  isTablet,
  onOrientationChange: handleOrientationChange,
});
```

**(c) `showLandscapeHint` 상태 + 두 effect/콜백**
```ts
// 가로 회전 안내 배너: tablet이고 portrait일 때만, 한 번만 노출.
const [showLandscapeHint, setShowLandscapeHint] = useState(false);
useEffect(() => {
  if (!isTablet || !isPortrait) {
    setShowLandscapeHint(false);
    return;
  }
  let cancelled = false;
  hasSeenLandscapeHint().then((seen) => {
    if (!cancelled && !seen) setShowLandscapeHint(true);
  });
  return () => {
    cancelled = true;
  };
}, [isTablet, isPortrait]);

const handleDismissLandscapeHint = useCallback(() => {
  setShowLandscapeHint(false);
  void markLandscapeHintSeen();
}, []);
```

> 회전이 일어나지 않으므로 회전 도중 stroke 끊기 처리(`scratchpad.endStroke`) 자체가 불필요.

- [ ] **Step 4: return 객체에서 회전 관련 키 제거**

return 객체(187-218줄)에서 다음 키 모두 삭제:
- `isPortrait,`
- `useTabletLayout,`
- `showLandscapeHint,`
- `onDismissLandscapeHint: handleDismissLandscapeHint,`

- [ ] **Step 5: jest로 import 깨짐 없는지 빠르게 확인**

Run: `npx jest features/quiz/exam/hooks/use-exam-solve-screen.test.ts 2>&1 | tail -20`
- 만약 해당 테스트 파일이 없으면 skip
- 있으면: 회전 관련 expect가 있는지 확인 → 있으면 해당 expect 줄 제거

Run: `npx tsc --noEmit 2>&1 | grep -E "(use-exam-solve-screen|exam-solve-screen)" | head -20`
Expected: `exam-solve-screen.tsx`에서 `useTabletLayout`/`showLandscapeHint`/`onDismissLandscapeHint` 미정의 에러가 보일 수 있음 — Task 5에서 해소.

- [ ] **Step 6: 커밋 보류**

Task 5와 함께 커밋.

---

## Task 5: `exam-solve-screen` 단순화

**Goal:** Task 4에서 제거한 필드를 호출 측에서도 정리. `useTabletLayout` 참조를 `isTablet`으로 교체. 배너 import/렌더 제거.

**Files:**
- Modify: `features/quiz/exam/screens/exam-solve-screen.tsx`

- [ ] **Step 1: import 제거**

`features/quiz/exam/screens/exam-solve-screen.tsx` 13번 줄 삭제:
```ts
import { LandscapeHintBanner } from '../components/landscape-hint-banner';
```

- [ ] **Step 2: destructuring에서 회전 관련 필드 제거**

20-45줄의 destructuring에서 다음 항목 제거:
- `useTabletLayout,`
- `showLandscapeHint,`
- `onDismissLandscapeHint,`

대신 `isTablet`을 추가:
```ts
const {
  currentProblem,
  currentIndex,
  totalCount,
  answeredCount,
  answeredIndices,
  currentAnswer,
  shortAnswerText,
  isCompactLayout,
  isTablet,
  scratchpad,
  canGoPrev,
  isLast,
  imageKey,
  bookmarkedIndices,
  isCurrentBookmarked,
  onToggleBookmark,
  onSelectChoice,
  onChangeShortAnswer,
  onPrev,
  onNext,
  onExit,
} = useExamSolveScreen(examId);
```

- [ ] **Step 3: 렌더 분기 변경**

122-140줄을 다음과 같이 변경:

변경 전:
```tsx
return (
  <View style={styles.root}>
    {useTabletLayout ? (
      <ExamSolveTabletLayout
        header={header}
        scratchpad={scratchpad}
        problemPanel={
          <View style={styles.tabletProblemPanel}>
            <View style={styles.tabletBody}>{body}</View>
            <View>{footer}</View>
          </View>
        }
      />
    ) : (
      <QuizSolveLayout header={header} body={body} footer={footer} />
    )}
    {showLandscapeHint ? <LandscapeHintBanner onDismiss={onDismissLandscapeHint} /> : null}
  </View>
);
```

변경 후:
```tsx
return (
  <View style={styles.root}>
    {isTablet ? (
      <ExamSolveTabletLayout
        header={header}
        scratchpad={scratchpad}
        problemPanel={
          <View style={styles.tabletProblemPanel}>
            <View style={styles.tabletBody}>{body}</View>
            <View>{footer}</View>
          </View>
        }
      />
    ) : (
      <QuizSolveLayout header={header} body={body} footer={footer} />
    )}
  </View>
);
```

- [ ] **Step 4: typecheck 통과 확인**

Run: `npx tsc --noEmit 2>&1 | grep -E "(use-exam-solve-screen|exam-solve-screen|use-exam-screen-orientation|landscape-hint)" | head -30`
Expected: 0건 (관련 에러 모두 해소)

- [ ] **Step 5: jest 통과 확인**

Run: `npx jest 2>&1 | tail -30`
Expected: 모든 테스트 통과 (또는 사전에 알려진 무관한 실패만)

- [ ] **Step 6: Task 2 + 3 + 4 + 5 일괄 커밋**

```bash
git add -u
git status   # 삭제/수정 목록 확인
git commit -m "refactor(exam): remove landscape hint banner + per-screen orientation hook

iPad/태블릿이 landscape-only로 고정되므로 회전 안내 배너,
화면 단위 lock/unlock 훅, AsyncStorage hint 키가 모두 불필요.
useTabletLayout은 isTablet과 동치가 되어 호출처에서 직접 사용.

- delete features/quiz/exam/hooks/use-exam-screen-orientation.ts (+ test)
- delete features/quiz/exam/components/landscape-hint-banner.tsx (+ test)
- delete features/quiz/exam/storage/landscape-hint-store.ts (+ test)
- remove StorageKeys.landscapeHintSeen
- simplify use-exam-solve-screen + exam-solve-screen

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: `app/_layout.tsx` 플랫폼 분기 lock

**Goal:** iOS는 Info.plist에 위임(런타임 호출 없음). Android는 디바이스(폰/태블릿) 감지 후 적절한 방향으로 lock. 디바이스 판별은 화면 크기의 짧은 변(`Math.min(screen.width, screen.height)`)이 600 이상이면 태블릿(Material 가이드라인). 현재 방향과 무관하게 동작해야 하므로 `Dimensions.get('screen')`을 사용.

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: import 변경**

`app/_layout.tsx` 14줄을 다음과 같이 변경:

변경 전:
```ts
import { lockToPortrait } from '@/hooks/use-orientation-lock';
```

변경 후:
```ts
import { Dimensions, Platform } from 'react-native';

import { lockToLandscape, lockToPortrait } from '@/hooks/use-orientation-lock';
```

> NOTE: 기존 `react-native` import가 다른 곳에 있으면 합치되, 위 두 식별자(`Dimensions`, `Platform`)가 빠져 있지 않게 한다. 현재 파일에는 `react-native` import가 없으므로 새 줄로 추가.

- [ ] **Step 2: `RootLayout`의 effect를 플랫폼 분기로 교체**

168-170줄의 다음 블록:

```ts
useEffect(() => {
  lockToPortrait();
}, []);
```

다음으로 교체:

```ts
useEffect(() => {
  // iOS는 Info.plist의 UISupportedInterfaceOrientations(~ipad 포함)가 정적으로 처리.
  // Android는 디바이스-클래스 분기가 manifest 차원에 없어 런타임 lock 사용.
  if (Platform.OS !== 'android') return;
  const screen = Dimensions.get('screen');
  const shorterEdge = Math.min(screen.width, screen.height);
  const isTabletDevice = shorterEdge >= 600;
  if (isTabletDevice) {
    void lockToLandscape();
  } else {
    void lockToPortrait();
  }
}, []);
```

- [ ] **Step 3: typecheck 통과 확인**

Run: `npx tsc --noEmit 2>&1 | grep -E "_layout|use-orientation-lock" | head -10`
Expected: 0건

- [ ] **Step 4: 커밋**

```bash
git add app/_layout.tsx
git commit -m "feat(layout): platform-aware orientation lock at root

iOS는 Info.plist 정적 lock에 위임. Android는 화면 짧은 변 ≥ 600일 때
LANDSCAPE, 그 외 PORTRAIT_UP으로 런타임 lock.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: `app.json` 방향 정책 갱신

**Goal:** iOS는 Info.plist 키로 디바이스별 방향 선언. Android는 `default`로 두고 런타임 lock에 위임.

**Files:**
- Modify: `app.json`

- [ ] **Step 1: top-level `orientation`을 `default`로**

`app.json` 6번 줄:

변경 전:
```json
"orientation": "portrait",
```

변경 후:
```json
"orientation": "default",
```

- [ ] **Step 2: `expo.ios.infoPlist`에 방향 키 추가**

23-25줄의 `infoPlist` 블록을 다음과 같이 확장:

변경 전:
```json
"infoPlist": {
  "ITSAppUsesNonExemptEncryption": false
}
```

변경 후:
```json
"infoPlist": {
  "ITSAppUsesNonExemptEncryption": false,
  "UISupportedInterfaceOrientations": [
    "UIInterfaceOrientationPortrait"
  ],
  "UISupportedInterfaceOrientations~ipad": [
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight"
  ]
}
```

- [ ] **Step 3: `expo.android`에 `orientation` 명시**

27번 줄의 `android` 객체에 `orientation: "default"` 추가 (동일 의미지만 명시적으로):

변경 전:
```json
"android": {
  "versionCode": 1,
  ...
}
```

변경 후 (versionCode 다음 줄에 추가):
```json
"android": {
  "versionCode": 1,
  "orientation": "default",
  ...
}
```

- [ ] **Step 4: `app.json` 유효성 검증**

Run: `cat app.json | python3 -m json.tool > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 5: 커밋**

```bash
git add app.json
git commit -m "feat(config): iPad landscape-only via Info.plist, Android default

- top-level orientation: portrait → default
- ios.infoPlist: UISupportedInterfaceOrientations(iPhone portrait)
  + ~ipad(landscape Left/Right)
- android.orientation: default (런타임 lock에 위임)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 정적 검증 (typecheck + jest)

**Goal:** 모든 코드 변경 후 정적 분석/단위 테스트 통과를 확인.

- [ ] **Step 1: TypeScript 검증**

Run: `npx tsc --noEmit`
Expected: 에러 0건

- [ ] **Step 2: 잔존 참조 grep**

Run:
```bash
grep -rn "landscape-hint\|landscapeHint\|LandscapeHint\|hasSeenLandscapeHint\|markLandscapeHintSeen\|use-exam-screen-orientation\|useExamScreenOrientation\|unlockAllOrientations" --include="*.ts" --include="*.tsx" .
```
Expected: spec 문서(`docs/superpowers/specs/...`)와 plan 문서(`docs/superpowers/plans/...`)를 제외하고 0건.

- [ ] **Step 3: jest 전체 실행**

Run: `npx jest`
Expected: 모든 테스트 통과. 사전에 알려진 무관한 실패가 있으면 해당 항목만 노트하고 진행.

- [ ] **Step 4: 변화 없으면 별도 커밋 없음**

이 단계는 검증 단계이며 코드 변경이 없으면 커밋하지 않는다.

---

## Task 9: iOS prebuild + iPhone/iPad 시뮬레이터 검증

**Goal:** Info.plist가 의도대로 적용되는지 실제 빌드로 확인.

- [ ] **Step 1: prebuild --clean 수행**

Run: `npx expo prebuild --clean`
Expected: 정상 종료

- [ ] **Step 2: iPhone 시뮬레이터 빌드/실행**

Run: `npx expo run:ios`
Expected: 빌드 성공, 시뮬레이터에서 앱이 portrait로 켜짐. 시뮬레이터 회전(⌘+→) 시 화면이 돌아가지 않아야 함.

- [ ] **Step 3: iPad 시뮬레이터로 전환하여 검증**

다음 시뮬레이터에서 각각 실행 (`npx expo run:ios --device "<이름>"` 또는 Xcode/시뮬레이터 메뉴로 변경):
- iPad mini (6th generation)
- iPad Pro 11-inch (4th generation 등)
- iPad Pro 12.9-inch (6th generation 등)

각 디바이스에서 다음을 확인:
- [ ] 앱 시작 시 즉시 landscape로 진입 (portrait flash 없음)
- [ ] 디바이스를 좌/우 어느 쪽으로 눕혀도 화면이 정방향
- [ ] portrait로 회전하지 않음
- [ ] 시험풀기 화면 (`exam-solve`) — split layout 정상, 스크래치패드 동작
- [ ] 시험 진단 / 진단세션 (챗봇) — 정상 렌더, 메시지 송수신 OK
- [ ] 허브 홈 / 히스토리 / 프로필 / 인증 — 깨지지 않음 (어색해도 OK)

- [ ] **Step 4: 검증 결과를 PROGRESS에 메모**

발견된 이슈가 있으면 별도 task/이슈로 기록. 깨지는 화면이 있을 시 후속 spec(허브/히스토리/프로필 가로 재설계)에서 다룰 항목인지 즉시 고쳐야 할 회귀인지 분류.

- [ ] **Step 5: prebuild로 생긴 파일 변경 커밋 (있을 경우)**

`prebuild --clean` 후 `ios/` 디렉토리가 재생성되었으면:
```bash
git add ios android
git status
git commit -m "chore(prebuild): regenerate native projects for orientation policy

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
> `ios/`, `android/`가 `.gitignore`에 들어 있는 프로젝트면 이 단계는 스킵.

---

## Task 10: Android 시뮬레이터 검증

**Goal:** 런타임 lock이 디바이스 클래스에 따라 올바르게 동작하는지 확인.

- [ ] **Step 1: Android phone 에뮬레이터 빌드/실행**

Run: `npx expo run:android`
Expected: 빌드 성공. 폰 에뮬레이터(예: Pixel 6)에서 앱이 portrait로 시작. 짧은 깜빡임이 있어도 결과가 portrait이면 정상.

- [ ] **Step 2: Android tablet 에뮬레이터로 검증**

`Pixel Tablet` 또는 `10.1" WXGA Tablet` AVD 생성 후 실행:
```bash
npx expo run:android --device  # 디바이스 선택 프롬프트에서 tablet 선택
```

확인:
- [ ] 앱 시작 시 landscape로 lock (시작 직후 짧은 깜빡임 허용)
- [ ] 디바이스를 portrait로 회전 시도 시 화면이 돌아가지 않음
- [ ] 시험풀기 / 진단 화면 정상 동작

- [ ] **Step 3: 검증 결과를 PROGRESS에 메모**

이슈 있으면 별도 기록.

- [ ] **Step 4: 잔여 변경 커밋 (있을 경우)**

빌드 산출물 외에 코드 변경이 있었다면 commit. 없으면 스킵.

---

## Task 11: PROGRESS / Notion / 후속 작업 리마인드 등록

**Goal:** spec §8의 "후속 작업 — 사용자에게 반드시 다시 알릴 것"을 영속화.

- [ ] **Step 1: `docs/PROGRESS.md`에 본 작업 기록 + 후속 작업 섹션 추가**

다음 항목을 PROGRESS.md 적절한 위치에 추가 (날짜·기능명·후속 작업):

```markdown
## 2026-05-09 — iPad/Android tablet landscape-only

- 정책: iPad와 Android tablet은 landscape 고정. iPhone과 Android phone은 portrait 유지.
- iOS는 Info.plist 정적, Android는 런타임 lock(`Dimensions.get('screen')` 짧은 변 ≥ 600 기준).
- 회전 관련 훅·배너·스토어 일괄 제거: `use-exam-screen-orientation`, `landscape-hint-banner`,
  `landscape-hint-store`, `StorageKeys.landscapeHintSeen`, `unlockAllOrientations`.
- spec: `docs/superpowers/specs/2026-05-09-ipad-landscape-only-design.md`
- plan: `docs/superpowers/plans/2026-05-09-ipad-landscape-only.md`

### 후속 작업 필요 (반드시 다시 알릴 것)

1. 허브 홈 / 여정보드 가로 기준 재설계 spec 작성
2. 포스터 배너 / CTA 위치 디테일 재튜닝 spec 작성
3. 히스토리 / 프로필 가로 전용 레이아웃 spec 작성
```

- [ ] **Step 2: 커밋**

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): log iPad landscape-only + 후속 작업 리마인더

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 3: Notion 페이지 업데이트(가능 시)**

Notion 토큰이 유효하면 "DASIDA 개발 기록"의 본 spec 페이지에:
- 상태 → `구현완료`
- 구현완료일 → 오늘 날짜
- Spec/Plan을 GitHub permalink로
- 본문 `## 후속 작업` 섹션에 위 3개 항목 명시

토큰이 무효(401)이면 이 단계 스킵하고 사용자에게 수동 처리 안내.

- [ ] **Step 4: 사용자에게 후속 작업 안내**

채팅 마지막에 다음과 같이 명시:

> 본 spec 구현 완료. 다음은 별도 spec으로 진행이 필요합니다:
> 1. 허브 홈 / 여정보드 가로 기준 재설계
> 2. 포스터 배너 / CTA 위치 디테일 재튜닝
> 3. 히스토리 / 프로필 가로 전용 레이아웃

---

## 검증 체크리스트 (Spec §7 매핑)

| Spec 검증 항목 | 본 plan에서 다루는 task |
|---|---|
| iPhone portrait 고정 | Task 9 Step 2 |
| iPad mini/11"/12.9" landscape 고정, flash 없음 | Task 9 Step 3 |
| 좌/우 양방향 landscape | Task 9 Step 3 |
| Android phone portrait | Task 10 Step 1 |
| Android tablet landscape | Task 10 Step 2 |
| 시험풀기/진단/챗봇 정상 동작 | Task 9 Step 3, Task 10 Step 2 |
| 허브/히스토리/프로필/인증 깨지지 않음 | Task 9 Step 3 |
| import 잔존 참조 0건 | Task 8 Step 2 |
| storage key/잔존 호출 0건 | Task 8 Step 2 |
| typecheck 통과 | Task 8 Step 1 |
| jest 통과 | Task 8 Step 3 |
| prebuild 성공 | Task 9 Step 1 |
| iOS 빌드 성공 | Task 9 Step 2 |
| Android 빌드 성공 | Task 10 Step 1 |
