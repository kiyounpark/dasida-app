# 알림 권한 카드 A1 디자인 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 라이트 테마의 평범한 알림 권한 카드(`features/quiz/components/notification-opt-in-card.tsx`)를 핸드오프 받은 A1 디자인(다크 forest 그라디언트 + SVG 58% 게이지 + 망각 타임라인 + Reanimated 진입 애니메이션)으로 시각만 완전히 교체한다.

**Architecture:** Props/Hook 인터페이스를 그대로 유지하고 컴포넌트 내부 JSX/스타일만 교체한다. `expo-linear-gradient`(신규 설치)로 대각선 linear gradient 배경, `react-native-svg`(기존 설치)로 원형 게이지, `react-native-reanimated`(기존 설치)로 진입 애니메이션을 구현한다. 호출부(`use-result-screen.ts`, `quiz-result-report-view.tsx`) 변경은 없다.

**Tech Stack:** React Native (Expo), TypeScript, react-native-svg, react-native-reanimated v4, expo-linear-gradient(신규), Jest + @testing-library/react-native.

**Spec:** [docs/superpowers/specs/2026-05-07-notification-permission-card-a1-redesign-design.md](../specs/2026-05-07-notification-permission-card-a1-redesign-design.md)

---

## Task 1: `expo-linear-gradient` 의존성 추가

**Files:**
- Modify: `package.json` (dependencies 섹션)
- Modify: `package-lock.json`
- Modify: `ios/` 디렉토리 (prebuild 결과)

이 저장소 [CLAUDE.md](../../../CLAUDE.md)의 네이티브 빌드 규칙: **패키지 추가/변경 후에는 반드시 `npx expo prebuild --clean` → `npx expo run:ios`**. 어기면 검정화면.

- [ ] **Step 1: 패키지 설치**

Run:
```bash
npx expo install expo-linear-gradient
```

`expo install`은 현재 Expo SDK 버전에 호환되는 정확한 버전을 자동 선택한다 (`npm install`을 직접 쓰면 SDK 호환 안 맞을 수 있음).

Expected: `package.json`의 dependencies에 `"expo-linear-gradient": "~14.x.x"` (혹은 SDK에 맞는 버전) 추가됨.

- [ ] **Step 2: 설치 확인**

Run:
```bash
grep -n "expo-linear-gradient" package.json
```

Expected: 한 줄 매칭 (dependencies 섹션 안).

- [ ] **Step 3: 네이티브 prebuild 재생성**

Run:
```bash
npx expo prebuild --clean
```

Expected: `ios/` 디렉토리가 재생성되고 `expo-linear-gradient`의 네이티브 모듈이 Pods에 포함됨. 출력에 `Successfully created native iOS project` 류 메시지.

- [ ] **Step 4: iOS 시뮬레이터 빌드 + 부팅 확인**

Run:
```bash
npx expo run:ios
```

Expected: 빌드 성공 → 앱이 시뮬레이터에서 부팅 → JS 번들 로드 성공 (검정화면 아님). 홈 화면이 보이면 OK.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json ios/
git commit -m "chore(deps): add expo-linear-gradient for A1 notification card"
```

---

## Task 2: 기존 테스트를 A1 사양으로 수정 (실패 상태로)

**Files:**
- Modify: `features/quiz/components/notification-opt-in-card.test.tsx`

기존 테스트는 이전 카피(`"켜기"` 버튼 텍스트, 약점 라벨 본문 노출)를 가정한다. A1은 `"알림 켜기"` 버튼 + 약점 라벨을 본문에 쓰지 않으므로, 테스트를 먼저 A1 기준으로 갱신해 **실패하는 상태**로 만든다 (TDD).

- [ ] **Step 1: 테스트 파일 전체 교체**

기존 [features/quiz/components/notification-opt-in-card.test.tsx](../../../features/quiz/components/notification-opt-in-card.test.tsx) 내용을 아래로 교체:

```tsx
import { render, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { NotificationOptInCard } from './notification-opt-in-card';

describe('NotificationOptInCard', () => {
  const baseProps = {
    weaknessLabels: ['판별식', '인수분해'],
    onEnable: jest.fn(),
    onDismiss: jest.fn(),
    state: 'idle' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('A1 priming 카피("58%")를 노출한다', () => {
    const { getByText } = render(<NotificationOptInCard {...baseProps} />);
    expect(getByText(/58%/)).toBeTruthy();
  });

  it('"망각 곡선 경고" eyebrow를 노출한다', () => {
    const { getByText } = render(<NotificationOptInCard {...baseProps} />);
    expect(getByText(/망각 곡선 경고/)).toBeTruthy();
  });

  it('[알림 켜기] 탭 시 onEnable 호출', () => {
    const onEnable = jest.fn();
    const { getByText } = render(
      <NotificationOptInCard {...baseProps} onEnable={onEnable} />,
    );
    fireEvent.press(getByText('알림 켜기'));
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

  it('state가 requesting이면 [알림 켜기] 비활성', async () => {
    const onEnable = jest.fn();
    const user = userEvent.setup();
    render(
      <NotificationOptInCard {...baseProps} state="requesting" onEnable={onEnable} />,
    );
    await user.press(screen.getByText('알림 켜기'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('state가 granted면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="granted" />,
    );
    expect(queryByText('알림 켜기')).toBeNull();
  });

  it('state가 denied면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="denied" />,
    );
    expect(queryByText('알림 켜기')).toBeNull();
  });

  it('state가 dismissed면 카드 자체를 안 그림', () => {
    const { queryByText } = render(
      <NotificationOptInCard {...baseProps} state="dismissed" />,
    );
    expect(queryByText('알림 켜기')).toBeNull();
  });
});
```

변경 요약:
- `약점 라벨을 카피에 노출한다` → `A1 priming 카피("58%")를 노출한다` + `"망각 곡선 경고" eyebrow를 노출한다` (A1은 weaknessLabels를 카피에 안 씀)
- 버튼 텍스트 `"켜기"` → `"알림 켜기"` 전체 교체
- `denied` 케이스 추가 (기존 누락)

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run:
```bash
npx jest features/quiz/components/notification-opt-in-card.test.tsx
```

Expected: 일부 테스트 실패 — 현재 구현은 `"켜기"` 텍스트 사용 중이라 `getByText('알림 켜기')`가 매칭 안 됨. `"58%"` / `"망각 곡선 경고"` 도 현재 구현엔 없음.

실패 메시지 예: `Unable to find an element with text: 알림 켜기`.

(`granted` / `dismissed` / `requesting` 분기 테스트는 기존과 동일 로직이라 통과할 가능성 높음. 그것까지 다 실패할 필요는 없다.)

- [ ] **Step 3: 커밋 (실패 상태로 — TDD)**

```bash
git add features/quiz/components/notification-opt-in-card.test.tsx
git commit -m "test(notification-card): update assertions for A1 design"
```

---

## Task 3: A1 카드 컴포넌트 구현

**Files:**
- Modify: `features/quiz/components/notification-opt-in-card.tsx` (전체 교체)

핸드오프 README의 사양을 그대로 구현한다. 단, 진입 애니메이션은 Task 4에서 추가 — 이 Task에서는 정적 렌더만.

- [ ] **Step 1: 컴포넌트 파일 전체 교체**

[features/quiz/components/notification-opt-in-card.tsx](../../../features/quiz/components/notification-opt-in-card.tsx) 내용을 아래로 교체:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { FontFamilies } from '@/constants/typography';

export type NotificationOptInCardState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'dismissed';

type Props = {
  weaknessLabels: string[]; // 호환을 위해 유지. A1 카피에서는 사용 안 함.
  state: NotificationOptInCardState;
  onEnable: () => void;
  onDismiss: () => void;
};

const COLORS = {
  forestStart: '#4A6F4A',
  forestEnd: '#293B27',
  honey: '#F4B942',
  forest400: '#87B084',
  forest300: '#AECBAA',
  paper: '#FFFCF4',
  inkOnPaper: '#293B27',
  whiteFaint10: 'rgba(255,255,255,0.10)',
  whiteFaint12: 'rgba(255,255,255,0.12)',
  whiteFaint18: 'rgba(255,255,255,0.18)',
  whiteFaint25: 'rgba(255,255,255,0.25)',
  whiteFaint35: 'rgba(255,255,255,0.35)',
} as const;

export function NotificationOptInCard({ state, onEnable, onDismiss }: Props) {
  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';

  return (
    <View style={styles.cardOuter} accessibilityRole="alert">
      <LinearGradient
        colors={[COLORS.forestStart, COLORS.forestEnd]}
        locations={[0, 0.55]}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}>
        <View style={styles.topRow}>
          <View style={styles.textBlock}>
            <Text style={styles.eyebrow}>망각 곡선 경고</Text>
            <Text style={styles.headline}>
              내일이면 오늘 배운 것{'\n'}
              <Text style={styles.headlineEm}>58%가 사라져요.</Text>
            </Text>
          </View>
          <ForgettingGauge />
        </View>
        <ForgettingTimeline />
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={onEnable}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="알림 켜기">
            <Text style={styles.primaryButtonText}>알림 켜기</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={onDismiss}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="나중에 결정">
            <Text style={styles.secondaryButtonText}>나중에</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function ForgettingGauge() {
  const size = 64;
  const strokeWidth = 5.5;
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * 0.58;

  return (
    <View style={gaugeStyles.wrap}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.whiteFaint10}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.honey}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            fill="none"
          />
        </G>
      </Svg>
      <View style={gaugeStyles.center} pointerEvents="none">
        <Text style={gaugeStyles.percent}>58%</Text>
        <Text style={gaugeStyles.label}>망각</Text>
      </View>
    </View>
  );
}

function ForgettingTimeline() {
  return (
    <View style={timelineStyles.wrap}>
      <View style={timelineStyles.track}>
        <LinearGradient
          colors={[COLORS.forest400, COLORS.honey]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={timelineStyles.fill}
        />
      </View>
      <View style={timelineStyles.markerRow}>
        <TimelineMarker time="지금" pct="100%" pctColor={COLORS.forest400} />
        <TimelineMarker time="내일" pct="42%" pctColor={COLORS.honey} />
        <TimelineMarker time="3일 후" pct="20%" pctColor={COLORS.whiteFaint25} />
        <TimelineMarker time="1주 후" pct="10%" pctColor={COLORS.whiteFaint18} />
      </View>
      <Text style={timelineStyles.source}>에빙하우스 망각 곡선</Text>
    </View>
  );
}

function TimelineMarker({
  time,
  pct,
  pctColor,
}: {
  time: string;
  pct: string;
  pctColor: string;
}) {
  return (
    <View style={timelineStyles.marker}>
      <Text style={[timelineStyles.markerPct, { color: pctColor }]}>{pct}</Text>
      <Text style={timelineStyles.markerTime}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gradient: {
    paddingTop: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    gap: 14,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontFamily: FontFamilies.bold,
    fontSize: 10.5,
    color: COLORS.forest300,
    letterSpacing: 0.1 * 10.5,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: FontFamilies.bold,
    fontSize: 19,
    lineHeight: 25.65, // 1.35
    color: '#FFFCF4',
    letterSpacing: -0.015 * 19,
  },
  headlineEm: {
    color: COLORS.honey,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: COLORS.inkOnPaper,
    letterSpacing: -0.01 * 15,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.whiteFaint12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: COLORS.whiteFaint35,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

const gaugeStyles = StyleSheet.create({
  wrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: COLORS.honey,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 8.5,
    color: COLORS.forest300,
  },
});

const timelineStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },
  track: {
    height: 3,
    backgroundColor: COLORS.whiteFaint10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    width: '28%',
    height: '100%',
    borderRadius: 999,
  },
  markerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marker: {
    alignItems: 'flex-start',
    gap: 2,
  },
  markerPct: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  markerTime: {
    fontFamily: FontFamilies.medium,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.45)',
  },
  source: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    color: COLORS.whiteFaint25,
    textAlign: 'right',
  },
});
```

주의사항:
- `import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand'` 제거 (A1은 자체 색 팔레트).
- `FontFamilies`만 유지.
- `weaknessLabels` props는 받기만 하고 destructure 시 무시 (`{ state, onEnable, onDismiss }` — `weaknessLabels`는 빠짐).

- [ ] **Step 2: 테스트 실행 → 통과 확인**

Run:
```bash
npx jest features/quiz/components/notification-opt-in-card.test.tsx
```

Expected: 8개 테스트 모두 PASS.

- [ ] **Step 3: TypeScript 타입 체크**

Run:
```bash
npx tsc --noEmit
```

Expected: 에러 없음. (특히 `expo-linear-gradient` 타입과 `react-native-svg`의 `G`/`Circle` 타입.)

만약 `Cannot find module 'expo-linear-gradient'` 에러가 뜨면 Task 1의 prebuild가 안 되었거나 패키지 설치가 누락된 것 — Task 1으로 돌아가서 확인.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/notification-opt-in-card.tsx
git commit -m "feat(notification-card): replace with A1 design (gradient + svg gauge + timeline)"
```

---

## Task 4: Reanimated 진입 애니메이션 추가

**Files:**
- Modify: `features/quiz/components/notification-opt-in-card.tsx` (top-level wrapper만 변경)

핸드오프 사양: `translateY: 12 → 0`, `opacity: 0 → 1`, duration `320ms`, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. 마운트 시 1회만 실행.

- [ ] **Step 1: import 추가**

[features/quiz/components/notification-opt-in-card.tsx](../../../features/quiz/components/notification-opt-in-card.tsx) 상단의 import 영역에 다음을 추가:

```tsx
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
```

기존 `import { Pressable, StyleSheet, Text, View } from 'react-native';`은 그대로 유지.

- [ ] **Step 2: NotificationOptInCard 함수 본문에 애니메이션 추가**

`if (state === 'granted' || state === 'dismissed' || state === 'denied') return null;` 분기 바로 **다음 줄**에 hook을 추가하고, 최상위 `<View>`를 `<Animated.View>`로 교체.

변경 전:
```tsx
export function NotificationOptInCard({ state, onEnable, onDismiss }: Props) {
  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';

  return (
    <View style={styles.cardOuter} accessibilityRole="alert">
      ...
    </View>
  );
}
```

변경 후:
```tsx
export function NotificationOptInCard({ state, onEnable, onDismiss }: Props) {
  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const config = {
      duration: 320,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    };
    opacity.value = withTiming(1, config);
    translateY.value = withTiming(0, config);
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.cardOuter, animatedStyle]} accessibilityRole="alert">
      ...
    </Animated.View>
  );
}
```

`...` 안의 `<LinearGradient>` 등 자식은 Step 1에서 작성된 그대로 유지.

- [ ] **Step 3: React hooks 규칙 위반 체크**

위 코드는 early return(`if (state === ... ) return null`) **다음에** hook을 호출한다. React 규칙상 위반이다. 수정해야 한다.

수정 패턴: hook들을 early return **이전**으로 옮기고, `state`가 숨김 상태일 때는 hook을 그대로 호출하되 컴포넌트만 null 반환.

올바른 형태:

```tsx
export function NotificationOptInCard({ state, onEnable, onDismiss }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const config = {
      duration: 320,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    };
    opacity.value = withTiming(1, config);
    translateY.value = withTiming(0, config);
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';

  return (
    <Animated.View style={[styles.cardOuter, animatedStyle]} accessibilityRole="alert">
      ...
    </Animated.View>
  );
}
```

이 형태로 Step 2의 코드를 다시 정리하라.

- [ ] **Step 4: 테스트 재실행 → 여전히 통과 확인**

Run:
```bash
npx jest features/quiz/components/notification-opt-in-card.test.tsx
```

Expected: 8개 테스트 PASS. 애니메이션은 Reanimated의 jest setup이 mock 처리하므로 영향 없음.

만약 `Cannot find module 'react-native-reanimated'` 등의 에러가 뜨면 jest setup을 확인. (이 저장소의 [jest.setup.js](../../../jest.setup.js)에 reanimated mock이 포함되어 있어야 함. 만약 누락이면 다음 추가:
```js
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
```
)

- [ ] **Step 5: TypeScript 체크**

Run:
```bash
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/notification-opt-in-card.tsx
git commit -m "feat(notification-card): add reanimated entrance animation"
```

---

## Task 5: 시뮬레이터 통합 검증

**Files:** (코드 변경 없음, 수동 검증)

[CLAUDE.md](../../../CLAUDE.md) 규칙에 따라 UI 변경은 시뮬레이터에서 실제로 동작 확인을 거쳐야 한다.

- [ ] **Step 1: 시뮬레이터 빌드 + 실행**

Run:
```bash
npx expo run:ios
```

Expected: 빌드 성공, 앱 부팅.

- [ ] **Step 2: 권한 미허용 상태 만들기 (필요 시)**

iOS 시뮬레이터 메뉴: `Device > Erase All Content and Settings...` 또는 앱을 삭제 후 재설치하여 알림 권한이 미정 상태(`undetermined`)가 되도록 한다.

- [ ] **Step 3: `/quiz/result` 화면 진입**

진단(`/quiz/diagnostic`)을 한 번 풀고 결과 화면에 도달, 또는 모의고사를 풀고 약점 진단을 모두 마쳐서 자동으로 `/quiz/result?source=exam`으로 진입.

- [ ] **Step 4: 카드 시각 검증**

체크 항목:
- [ ] 다크 forest 그라디언트 배경 (우상→좌하)
- [ ] eyebrow `"망각 곡선 경고"` (대문자 letter-spacing 적용된 모양)
- [ ] headline 두 줄, "58%가 사라져요." 부분이 honey(#F4B942)
- [ ] 우측 상단 64x64 원형 게이지: 58% honey arc + 중앙 "58%" / "망각" 텍스트
- [ ] 타임라인: 28% 채워진 그라디언트 바 + 4개 마커 (지금 100% / 내일 42% / 3일 후 20% / 1주 후 10%)
- [ ] "에빙하우스 망각 곡선" 출처 텍스트 우측 정렬
- [ ] Primary 버튼 `"알림 켜기"` (paper 배경, forest 텍스트)
- [ ] Secondary 버튼 `"나중에"` (투명 배경, 흐린 흰 테두리)
- [ ] 진입 시 위에서 살짝 떠오르며 페이드인 (translateY 12 → 0)

- [ ] **Step 5: "알림 켜기" 동작 확인**

탭 → OS 권한 다이얼로그 노출 → 허용 → 카드 사라짐 + (백그라운드에서) review 알림 스케줄링 시도. 콘솔에 `[useNotificationOptIn] schedule failed` 같은 에러가 없어야 한다.

- [ ] **Step 6: "나중에" 동작 확인**

(앱 삭제→재설치로 권한 미정 상태 복구 후) 다시 `/quiz/result` 진입 → "나중에" 탭 → 카드 사라짐.

같은 화면을 다시 진입하면(예: 다른 진단 풀고 다시) → 카드 다시 노출 (dismiss는 컴포넌트 인스턴스 한정).

- [ ] **Step 7: 권한 이미 허용 상태에서 카드 미노출 확인**

권한이 `granted`인 상태에서 `/quiz/result` 진입 → 카드 자체가 안 뜸 (hook의 useEffect가 `granted` 감지 후 즉시 카드 unmount).

- [ ] **Step 8: 약점 없는 결과(만점) 케이스 확인**

만점 케이스(`liveSummary.topWeaknesses.length === 0`)에서 결과 화면 진입 → 카드 안 뜸 (hook의 `hasWeaknesses=false` 분기).

- [ ] **Step 9: 안드로이드 시뮬레이터 cross-check (선택)**

가능하면 Android에서도 같은 검증을 짧게. SVG 게이지 anti-alias, 그라디언트 색감, 폰트 weight 차이를 확인.

Run (Android):
```bash
npx expo run:android
```

- [ ] **Step 10: 최종 커밋 (필요 시)**

수동 검증 중 발견된 미세 조정 사항을 반영했다면:
```bash
git add features/quiz/components/notification-opt-in-card.tsx
git commit -m "fix(notification-card): adjust A1 visual based on simulator verification"
```

조정 사항이 없으면 커밋 생략.

---

## Self-Review Checklist (이 plan을 spec과 대조)

Spec [docs/superpowers/specs/2026-05-07-notification-permission-card-a1-redesign-design.md](../specs/2026-05-07-notification-permission-card-a1-redesign-design.md)의 각 섹션을 어느 task가 다루는지:

- ✅ **Scope - In scope: 카드 디자인 교체** → Task 3
- ✅ **Scope - In scope: hook 단순 정리** → Spec에서 "변경 없음으로 처리할 수도" 명시 → 이 plan에서는 hook 수정하지 않음 (의도적 생략)
- ✅ **Goals 1: A1 디자인 픽셀 재현** → Task 3
- ✅ **Goals 2: Props/state 인터페이스 유지** → Task 3 (props 시그니처 그대로)
- ✅ **Goals 3: Reanimated 진입 애니메이션** → Task 4
- ✅ **Premises 1: expo-linear-gradient 설치** → Task 1
- ✅ **Design - 컴포넌트 구조** → Task 3 코드 블록
- ✅ **Design - Props 인터페이스** → Task 3 (`weaknessLabels` 호환 유지)
- ✅ **Design - Radial gradient → linear 대체** → Task 3 LinearGradient 사용
- ✅ **Design - SVG 원형 게이지 (dasharray 등)** → Task 3 ForgettingGauge
- ✅ **Design - 망각 타임라인** → Task 3 ForgettingTimeline
- ✅ **Design - 진입 애니메이션 (320ms cubic-bezier)** → Task 4
- ✅ **Design - 접근성 (accessibilityLabel/role)** → Task 3
- ✅ **Files Affected: notification-opt-in-card.tsx** → Task 3, 4
- ✅ **Files Affected: 테스트 업데이트** → Task 2
- ✅ **Testing - Unit (버튼/state 분기)** → Task 2
- ✅ **Testing - Manual (시뮬레이터 시나리오 1~5)** → Task 5

Placeholder 스캔: `TBD`/`TODO`/"적절히"/"비슷하게" 검색 결과 없음. ✅

타입 일관성: Props 시그니처(`weaknessLabels: string[]`, `state: NotificationOptInCardState`, `onEnable`, `onDismiss`)가 Task 2의 테스트와 Task 3의 구현에서 일치. ✅
