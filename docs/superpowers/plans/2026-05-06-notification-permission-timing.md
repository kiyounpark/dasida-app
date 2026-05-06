# Notification Permission Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과 화면에서 묵음 OS 다이얼로그를 제거하고, 약점 데이터를 카피에 박은 옵트인 카드(priming) → [켜기] 탭 시에만 OS 다이얼로그 → 허용 시 알림 스케줄링하는 흐름으로 교체한다.

**Architecture:**
- `useResultScreen` 훅이 카드의 노출/state/핸들러를 관리한다 (지금처럼 화면별 비즈니스 로직은 훅에 두는 패턴 준수).
- 새 컴포넌트 `NotificationOptInCard`는 순수 presentational. props로 받은 state/handlers만 그린다.
- `QuizResultScreenView`는 훅이 카드 표시 조건을 만족시킬 때만 카드를 그린다.

**Tech Stack:** React Native + Expo Notifications + 기존 `requestNotificationPermission` / `scheduleReviewNotifications` 재사용. 추가 라이브러리 없음.

**Spec:** [docs/superpowers/specs/2026-05-06-notification-permission-timing-design.md](../specs/2026-05-06-notification-permission-timing-design.md) (rev2)

---

## File Structure

**Create:**
- `features/quiz/components/notification-opt-in-card.tsx` — presentational 카드
- `features/quiz/components/notification-opt-in-card.test.tsx` — 카드 렌더링/핸들러 테스트
- `features/quiz/hooks/use-notification-opt-in.ts` — 카드 state + handler 훅 (분리해서 테스트 가능하게)
- `features/quiz/hooks/use-notification-opt-in.test.ts` — 훅 단위 테스트

**Modify:**
- `features/quiz/hooks/use-result-screen.ts` — 188-200라인 묵음 useEffect 제거, `useNotificationOptIn` 호출 추가, 반환 타입 확장
- `features/quiz/components/quiz-result-screen-view.tsx` — 약점 리스트 아래에 카드 렌더링 추가

**Verify (no edit):**
- `features/quiz/notifications/review-notification-scheduler.ts` — 변경 없음, 그대로 호출

---

## Task 1: NotificationOptInCard presentational 컴포넌트

**Files:**
- Create: `features/quiz/components/notification-opt-in-card.tsx`
- Test: `features/quiz/components/notification-opt-in-card.test.tsx`

이 컴포넌트는 props만 그린다. 비즈니스 로직 없음. state는 훅이 관리.

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/components/notification-opt-in-card.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationOptInCard } from './notification-opt-in-card';

describe('NotificationOptInCard', () => {
  const baseProps = {
    weaknessLabels: ['판별식', '인수분해'],
    onEnable: jest.fn(),
    onDismiss: jest.fn(),
    state: 'idle' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('약점 라벨을 카피에 노출한다', () => {
    const { getByText } = render(<NotificationOptInCard {...baseProps} />);
    expect(getByText(/판별식/)).toBeTruthy();
    expect(getByText(/인수분해/)).toBeTruthy();
  });

  it('[켜기] 탭 시 onEnable 호출', () => {
    const onEnable = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} onEnable={onEnable} />,
    );
    fireEvent.press(getByText('켜기'));
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  it('[나중에] 탭 시 onDismiss 호출', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByText('나중에'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('state가 requesting이면 버튼 비활성', () => {
    const onEnable = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} state="requesting" onEnable={onEnable} />,
    );
    fireEvent.press(getByText('켜기'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('state가 granted면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="granted" />,
    );
    expect(queryByText('켜기')).toBeNull();
  });

  it('state가 dismissed면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="dismissed" />,
    );
    expect(queryByText('켜기')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test -- features/quiz/components/notification-opt-in-card.test.tsx
```
기대: 모듈 import 실패.

- [ ] **Step 3: 컴포넌트 구현**

`features/quiz/components/notification-opt-in-card.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type NotificationOptInCardState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'dismissed';

type Props = {
  weaknessLabels: string[];
  state: NotificationOptInCardState;
  onEnable: () => void;
  onDismiss: () => void;
};

export function NotificationOptInCard({ weaknessLabels, state, onEnable, onDismiss }: Props) {
  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';
  const labelText = weaknessLabels.slice(0, 2).join(', ');

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title}>🔔 복습 알림 받기</Text>
      <Text style={styles.body}>
        {labelText} — 내일이면 절반 이상 잊혀져요
      </Text>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
          onPress={onEnable}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="복습 알림 켜기">
          <Text style={styles.primaryButtonText}>{isBusy ? '잠시만요…' : '켜기'}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={onDismiss}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="알림 나중에 켜기">
          <Text style={styles.secondaryButtonText}>나중에</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.text,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.mutedText,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.sm,
    marginTop: BrandSpacing.xs,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: BrandRadius.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamilies.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BrandRadius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontFamily: FontFamilies.regular,
    color: BrandColors.mutedText,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
```

> ⚠️ `BrandColors.surface` / `BrandColors.border` / `BrandSpacing.xs|sm|lg` / `BrandRadius.md|sm` 가 실제 존재하는지 `constants/brand.ts` 확인하고, 없으면 가장 가까운 토큰으로 교체. 새 토큰을 추가하지 말 것.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npm test -- features/quiz/components/notification-opt-in-card.test.tsx
```
기대: 6개 테스트 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/notification-opt-in-card.tsx features/quiz/components/notification-opt-in-card.test.tsx
git commit -m "feat(quiz): add NotificationOptInCard presentational component"
```

---

## Task 2: useNotificationOptIn 훅

**Files:**
- Create: `features/quiz/hooks/use-notification-opt-in.ts`
- Test: `features/quiz/hooks/use-notification-opt-in.test.ts`

훅이 다음을 처리한다:
- 마운트 시 `getPermissionsAsync()`로 현재 권한 상태 조회
- `granted`면 → state `granted`로 두고, `accountKey` 있으면 `scheduleReviewNotifications`만 실행
- `denied`면 → state `denied` (카드 안 보임)
- `undetermined`면 → state `idle` (카드 노출)
- `[켜기]` 핸들러: `requesting` → `requestNotificationPermission()` → 결과에 따라 `granted` (스케줄링) / `denied`
- `[나중에]` 핸들러: state `dismissed`. OS 다이얼로그 안 띄움.

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/hooks/use-notification-opt-in.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useNotificationOptIn } from './use-notification-opt-in';
import * as scheduler from '@/features/quiz/notifications/review-notification-scheduler';

jest.mock('expo-notifications');
jest.mock('@/features/quiz/notifications/review-notification-scheduler');

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermission = scheduler.requestNotificationPermission as jest.Mock;
const mockSchedule = scheduler.scheduleReviewNotifications as jest.Mock;

describe('useNotificationOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermission.mockResolvedValue(true);
    mockSchedule.mockResolvedValue(undefined);
  });

  it('권한 undetermined + 약점 있을 때 idle 상태', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));
  });

  it('권한 granted면 granted 상태로 가고 스케줄링 실행', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('granted'));
    expect(mockSchedule).toHaveBeenCalledWith('a1', expect.anything());
  });

  it('권한 denied면 denied 상태, 스케줄링 안 함', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('denied'));
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('약점 0개면 카드 안 보이는 상태(dismissed)로 둠', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: false }),
    );
    await waitFor(() => expect(result.current.state).toBe('dismissed'));
  });

  it('accountKey 없으면 idle도 안 되고 dismissed로 유지', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: undefined, hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('dismissed'));
  });

  it('onEnable: 요청 → 허용 → granted + 스케줄링', async () => {
    mockRequestPermission.mockResolvedValue(true);
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    await act(async () => {
      await result.current.onEnable();
    });
    expect(result.current.state).toBe('granted');
    expect(mockSchedule).toHaveBeenCalledWith('a1', expect.anything());
  });

  it('onEnable: 요청 → 거절 → denied', async () => {
    mockRequestPermission.mockResolvedValue(false);
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    await act(async () => {
      await result.current.onEnable();
    });
    expect(result.current.state).toBe('denied');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('onDismiss: state dismissed, OS 다이얼로그 호출 없음', async () => {
    const { result } = renderHook(() =>
      useNotificationOptIn({ accountKey: 'a1', hasWeaknesses: true }),
    );
    await waitFor(() => expect(result.current.state).toBe('idle'));

    act(() => {
      result.current.onDismiss();
    });
    expect(result.current.state).toBe('dismissed');
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test -- features/quiz/hooks/use-notification-opt-in.test.ts
```
기대: 모듈 import 실패.

- [ ] **Step 3: 훅 구현**

`features/quiz/hooks/use-notification-opt-in.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';

import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import {
  requestNotificationPermission,
  scheduleReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';

import type { NotificationOptInCardState } from '@/features/quiz/components/notification-opt-in-card';

const reviewStore = new LocalReviewTaskStore();

type Params = {
  accountKey: string | undefined;
  hasWeaknesses: boolean;
};

type Result = {
  state: NotificationOptInCardState;
  onEnable: () => Promise<void>;
  onDismiss: () => void;
};

export function useNotificationOptIn({ accountKey, hasWeaknesses }: Params): Result {
  const [state, setState] = useState<NotificationOptInCardState>('dismissed');

  useEffect(() => {
    let cancelled = false;

    if (!accountKey || !hasWeaknesses) {
      setState('dismissed');
      return () => {
        cancelled = true;
      };
    }

    void Notifications.getPermissionsAsync()
      .then(async ({ status }) => {
        if (cancelled) return;
        if (status === 'granted') {
          setState('granted');
          await scheduleReviewNotifications(accountKey, reviewStore).catch((err: unknown) => {
            console.warn('[useNotificationOptIn] schedule failed', err);
          });
          return;
        }
        if (status === 'denied') {
          setState('denied');
          return;
        }
        setState('idle');
      })
      .catch((err: unknown) => {
        console.warn('[useNotificationOptIn] getPermissionsAsync failed', err);
        if (!cancelled) setState('dismissed');
      });

    return () => {
      cancelled = true;
    };
  }, [accountKey, hasWeaknesses]);

  const onEnable = useCallback(async () => {
    if (!accountKey) return;
    setState('requesting');
    const granted = await requestNotificationPermission().catch(() => false);
    if (granted) {
      setState('granted');
      await scheduleReviewNotifications(accountKey, reviewStore).catch((err: unknown) => {
        console.warn('[useNotificationOptIn] schedule failed', err);
      });
    } else {
      setState('denied');
    }
  }, [accountKey]);

  const onDismiss = useCallback(() => {
    setState('dismissed');
  }, []);

  return { state, onEnable, onDismiss };
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npm test -- features/quiz/hooks/use-notification-opt-in.test.ts
```
기대: 8개 테스트 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-notification-opt-in.ts features/quiz/hooks/use-notification-opt-in.test.ts
git commit -m "feat(quiz): add useNotificationOptIn hook for permission priming flow"
```

---

## Task 3: useResultScreen에서 묵음 호출 제거 + 옵트인 통합

**Files:**
- Modify: `features/quiz/hooks/use-result-screen.ts`

기존 188-200 useEffect는 통째로 제거. 대신 `useNotificationOptIn`을 호출하고 결과를 반환 타입에 추가한다.

- [ ] **Step 1: 188-200 라인 useEffect 제거**

`features/quiz/hooks/use-result-screen.ts`:

```ts
// 삭제 대상 (현재 188-200):
//
// // 진단 완료 저장 후 알림 권한 요청 + Day1 알림 예약
// useEffect(() => {
//   if (saveState !== 'saved' || !liveSummary || !session?.accountKey) {
//     return;
//   }
//   const accountKey = session.accountKey;
//   requestNotificationPermission()
//     .then((granted) => {
//       if (!granted) return;
//       return scheduleReviewNotifications(accountKey, resultScreenReviewStore);
//     })
//     .catch(console.warn);
// }, [saveState, session?.accountKey]);
```

이 useEffect 블록만 제거. 다른 useEffect는 그대로.

- [ ] **Step 2: 안 쓰게 된 import / 모듈 변수 정리**

같은 파일 상단에서 다음을 제거:
- `import { LocalReviewTaskStore } from '@/features/learning/review-task-store';` (Task 2의 훅에서만 사용)
- `import { requestNotificationPermission, scheduleReviewNotifications } from '@/features/quiz/notifications/review-notification-scheduler';`
- `const resultScreenReviewStore = new LocalReviewTaskStore();`

> ⚠️ 다른 곳에서 같은 import를 쓰고 있으면 그건 남겨둘 것. grep으로 확인:
>
> ```bash
> grep -n "resultScreenReviewStore\|requestNotificationPermission\|scheduleReviewNotifications\|LocalReviewTaskStore" features/quiz/hooks/use-result-screen.ts
> ```
> 위 useEffect 외 다른 사용처가 있으면 해당 import는 유지.

- [ ] **Step 3: useNotificationOptIn 통합**

상단 import 추가:

```ts
import { useNotificationOptIn } from '@/features/quiz/hooks/use-notification-opt-in';
import type { NotificationOptInCardState } from '@/features/quiz/components/notification-opt-in-card';
```

훅 본문 안, `liveSummary` 정의 다음에 추가 (대략 export `useResultScreen` 함수 중간):

```ts
const optIn = useNotificationOptIn({
  accountKey: session?.accountKey,
  hasWeaknesses: (liveSummary?.weaknesses?.length ?? 0) > 0,
});
```

> ⚠️ `liveSummary`의 약점 필드 정확한 이름은 `QuizResultSummary` 타입 정의를 확인. 다를 수 있음 (예: `topWeaknesses`, `weaknessIds` 등). `hasWeaknesses` 계산을 그 필드에 맞춰 조정.

- [ ] **Step 4: 반환 타입 / 반환 객체 확장**

`UseResultScreenResult` 타입에 추가:

```ts
optInCard: {
  state: NotificationOptInCardState;
  weaknessLabels: string[];
  onEnable: () => Promise<void>;
  onDismiss: () => void;
};
```

`weaknessLabels` 계산 (약점 ID 1-2개 → 라벨 변환):

```ts
const weaknessLabels = useMemo(() => {
  const ids = liveSummary?.weaknesses?.slice(0, 2) ?? [];
  return ids
    .map((id) => diagnosisMap[id as WeaknessId]?.labelKo)
    .filter((label): label is string => Boolean(label));
}, [liveSummary?.weaknesses]);
```

> ⚠️ 실제 약점 필드 이름과 타입에 맞춰 조정. `diagnosisMap`은 이미 import 중.

return 객체에 추가:

```ts
return {
  // ...기존 필드들,
  optInCard: {
    state: optIn.state,
    weaknessLabels,
    onEnable: optIn.onEnable,
    onDismiss: optIn.onDismiss,
  },
};
```

- [ ] **Step 5: 타입 체크 + 기존 테스트 실행**

```bash
npx tsc --noEmit
npm test -- features/quiz/hooks
```
기대: 타입 에러 없음, 기존 결과 화면 관련 테스트 깨지지 않음.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/hooks/use-result-screen.ts
git commit -m "refactor(quiz): replace silent notification request with opt-in hook"
```

---

## Task 4: QuizResultScreenView에 카드 렌더링

**Files:**
- Modify: `features/quiz/components/quiz-result-screen-view.tsx`

- [ ] **Step 1: import 추가**

파일 상단:

```tsx
import { NotificationOptInCard } from '@/features/quiz/components/notification-opt-in-card';
```

- [ ] **Step 2: props 받기**

`QuizResultScreenView`의 props 디스트럭처링에 `optInCard` 추가:

```tsx
export function QuizResultScreenView({
  // ...기존 필드들,
  optInCard,
}: UseResultScreenResult) {
```

- [ ] **Step 3: 약점 리스트 아래, "약점 학습 시작하기" CTA 위에 카드 추가**

`liveSummary` 분기에서 약점 리스트가 렌더링되는 영역 바로 아래(또는 CTA 위) 위치에:

```tsx
<NotificationOptInCard
  weaknessLabels={optInCard.weaknessLabels}
  state={optInCard.state}
  onEnable={optInCard.onEnable}
  onDismiss={optInCard.onDismiss}
/>
```

> ⚠️ 정확한 삽입 위치는 `liveSummary` 분기 안에서, `<QuizResultReportView />` 또는 약점 리스트 직후. 첫 진입 사용자가 약점을 보고 난 다음 시야에 들어오는 위치.

- [ ] **Step 4: 시뮬레이터에서 시각 확인 (스타일 깨짐 방지)**

```bash
npx expo run:ios
```

진단 → 결과 화면 진입 시 카드가 약점 리스트 아래에 노출되는지 확인. `granted` 상태(시뮬레이터 사전 허용)에서는 카드가 안 보이는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/quiz-result-screen-view.tsx
git commit -m "feat(quiz): render NotificationOptInCard on result screen"
```

---

## Task 5: 수동 검증 (시뮬레이터, spec Verification 그대로)

자동 테스트로 못 잡는 OS 권한 다이얼로그 동작은 시뮬레이터로 확인.

- [ ] **Step 1: Happy path**

iOS 시뮬레이터 → 설정 > 알림에서 다시다 권한 미설정으로 리셋 (앱 삭제 후 재설치) → 진단 10문제 → 분석 → 결과 화면. 카드 노출 확인. [켜기] 탭 → OS 다이얼로그 → 허용. 그 다음:

```bash
# Expo dev tools console 또는 임시 스크립트로:
import * as Notifications from 'expo-notifications';
Notifications.getAllScheduledNotificationsAsync().then(console.log);
```

기대: morning/evening 2건 예약됨.

- [ ] **Step 2: 나중에 path**

앱 다시 설치 → 결과 화면 → [나중에] 탭 → 카드 사라짐. OS 다이얼로그 안 뜨는 것 시각 확인. `getPermissionsAsync()` 결과가 `undetermined`로 남아있는지 확인:

```ts
const { status, canAskAgain } = await Notifications.getPermissionsAsync();
console.log({ status, canAskAgain });
// 기대: status === 'undetermined', canAskAgain === true
```

- [ ] **Step 3: 이미 허용 path**

권한 사전 허용 상태에서 결과 화면 진입 → 카드 안 뜨는지 확인. 백그라운드에서 스케줄링 실행됐는지 `getAllScheduledNotificationsAsync`로 확인.

- [ ] **Step 4: 이미 거절 path**

권한 사전 거절 상태에서 결과 화면 진입 → 카드 안 뜨는지 확인. OS 다이얼로그 다시 안 뜨는지 확인.

- [ ] **Step 5: 약점 0개 path**

진단을 전체 정답으로 마치는 시나리오 (또는 디버그용으로 weaknesses=[]를 강제) → 결과 화면 → 카드 안 뜨는지 확인.

- [ ] **Step 6: 다음 사이클 재노출**

[나중에] 누른 후 새 진단 1회 더 → 새 결과 화면 → 카드 다시 뜨는지 확인.

- [ ] **Step 7: 결과 정리 + 커밋 (코드 변경 없으면 건너뛰기)**

검증 중 발견된 버그가 있으면 fix → 추가 테스트 → 커밋. 없으면 다음으로.

---

## Task 6: 최종 정리

- [ ] **Step 1: 전체 테스트 실행**

```bash
npm test
npx tsc --noEmit
```

기대: 모두 통과.

- [ ] **Step 2: 변경 라인 확인**

```bash
git diff main --stat
```

영향 범위 확인. 의도치 않은 파일이 변경됐는지 점검.

- [ ] **Step 3: 진행 기록 업데이트**

`docs/PROGRESS.md`에 한 줄 추가:

```
- 2026-05-06: 알림 권한 요청 타이밍 재배치 — 묵음 OS 다이얼로그 → 결과 화면 옵트인 카드 (rev2 spec)
```

- [ ] **Step 4: 최종 커밋**

```bash
git add docs/PROGRESS.md
git commit -m "docs: log notification opt-in card landing"
```

- [ ] **Step 5: 종료 알림**

```bash
npm run notify:done -- "알림 권한 요청 타이밍 재배치 (rev2): 결과 화면 옵트인 카드 도입"
```

---

## Self-Review Notes

- **Spec coverage 확인됨**:
  - rev2 spec의 변경 포인트 1 (묵음 호출 제거) → Task 3 Step 1
  - 변경 포인트 2 (카드 추가) → Task 1 + Task 4
  - 변경 포인트 3,4 (켜기/나중에 핸들러) → Task 2
  - 모든 Edge Case (0개 약점, granted, denied, dismissed) → Task 2 단위 테스트로 커버
  - 모든 Verification 항목 → Task 5에 1:1 매핑

- **Open Questions**:
  - 카드 위치(약점 리스트 위/아래) — Task 4 Step 3에서 결정. 첫 안: "약점 리스트 직후".
  - 버튼 단어 [켜기]/[나중에] — Task 1 Step 3 코드에 박혀 있음. 디자인 단계에서 변경 시 카피만 수정.
  - denied 상태 안내 UX — out of scope, 별도 spec.

- **Architectural decisions**:
  - 카드 state를 `useResultScreen`에 직접 넣지 않고 `useNotificationOptIn`으로 분리한 이유: 단위 테스트 용이성 + 단일 책임. 결과 화면 외 다른 진입점에서 재사용 가능.
  - `LocalReviewTaskStore`를 훅 모듈 스코프에 두고 매번 인스턴스화하지 않음: 기존 `resultScreenReviewStore` 패턴 그대로.
