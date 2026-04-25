# step-complete(practice) 애니메이션 + X 버튼 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `step-complete(practice)` 화면에 ✓✓✓→✦ 진행 점 애니메이션과 X 닫기 버튼을 추가한다.

**Architecture:** Hook(`use-step-complete-screen`)에 `onDismiss` 핸들러를 추가하고, View(`step-complete-screen-view`)에 React Native Animated API 기반 4-dot 시퀀스 애니메이션과 X 버튼 UI를 추가한다. Screen 컴포넌트는 `{...screen}` spread를 이미 사용하므로 별도 변경 없이 자동 전달된다.

**Tech Stack:** React Native `Animated` API, `expo-haptics`, TypeScript

---

## 파일 맵

| 파일 | 변경 내용 |
|------|-----------|
| `features/quiz/hooks/use-step-complete-screen.ts` | `onDismiss` 필드 추가 (practice → `router.back()`, 나머지 → `undefined`) |
| `features/quiz/components/step-complete-screen-view.tsx` | `onDismiss` prop + 4-dot 애니메이션 + X 버튼 |

`features/quiz/screens/step-complete-screen.tsx` — 변경 없음 (`{...screen}` spread로 자동 전달)

---

## Task 1: `use-step-complete-screen.ts` — onDismiss 추가

**Files:**
- Modify: `features/quiz/hooks/use-step-complete-screen.ts`

- [ ] **Step 1: 타입과 반환값에 onDismiss 추가**

`UseStepCompleteScreenResult`에 `onDismiss` 필드를 추가하고, `practice` 스텝일 때만 `router.back()`을 반환한다.

```ts
// features/quiz/hooks/use-step-complete-screen.ts
import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

export type StepCompleteKey = 'diagnostic' | 'analysis' | 'practice';

export type UseStepCompleteScreenResult = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
  onDismiss: (() => void) | undefined;
  isGraduating: boolean;
};

export function useStepCompleteScreen(
  stepKey: StepCompleteKey,
): UseStepCompleteScreenResult {
  const { resetSession } = useQuizSession();
  const { graduateToPractice } = useCurrentLearner();
  const [isGraduating, setIsGraduating] = useState(false);

  const onContinue = useCallback(() => {
    if (stepKey === 'diagnostic') {
      router.back();
      return;
    }

    if (stepKey === 'analysis') {
      router.replace('/quiz/result');
      return;
    }

    // practice: 졸업 처리 후 홈으로 이동 (중복 호출 방지)
    if (isGraduating) return;
    setIsGraduating(true);
    void graduateToPractice()
      .then(() => {
        resetSession();
        router.replace('/(tabs)/quiz');
      })
      .catch((err) => {
        console.warn('[StepComplete] graduateToPractice failed', err);
        setIsGraduating(false);
        resetSession();
        router.replace('/(tabs)/quiz');
      });
  }, [stepKey, isGraduating, resetSession, graduateToPractice]);

  const onDismiss: (() => void) | undefined =
    stepKey === 'practice' ? () => router.back() : undefined;

  return { stepKey, onContinue, onDismiss, isGraduating };
}
```

- [ ] **Step 2: TypeScript 오류 없는지 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "use-step-complete-screen" | head -20
```

오류 없으면 다음으로.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-step-complete-screen.ts
git commit -m "feat(step-complete): onDismiss 핸들러 추가 — practice 스텝에서 X 닫기 시 router.back()"
```

---

## Task 2: `step-complete-screen-view.tsx` — 애니메이션 + X 버튼

**Files:**
- Modify: `features/quiz/components/step-complete-screen-view.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
// features/quiz/components/step-complete-screen-view.tsx
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FontFamilies } from '@/constants/typography';
import type { StepCompleteKey } from '@/features/quiz/hooks/use-step-complete-screen';

type StepConfig = {
  charImage: number;
  title: string;
  body: string;
  nextLabel: string;
  accentColor: string;
  backgroundColor: string;
  autoAdvanceSeconds: number;
};

const STEP_CONFIG: Record<StepCompleteKey, StepConfig> = {
  diagnostic: {
    charImage: require('../../../assets/images/characters/char_04.png'),
    title: '진단 완료!',
    body: '10문제로 약점을 찾았어요.\n이제 약점을 분석할게요.',
    nextLabel: '약점 분석 시작하기',
    accentColor: '#6366f1',
    backgroundColor: '#f5f3ff',
    autoAdvanceSeconds: 3,
  },
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    autoAdvanceSeconds: 3,
  },
  practice: {
    charImage: require('../../../assets/images/characters/char_sparkle_sunglasses.png'),
    title: '이제 새로운\n시작이에요!',
    body: '진단, 분석, 연습까지 함께했어요.\n이제 실전에서 같이 나아가봐요.',
    nextLabel: '함께 실전 시작하기 →',
    accentColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    autoAdvanceSeconds: 0,
  },
};

type Props = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
  isGraduating: boolean;
  onDismiss?: () => void;
};

export function StepCompleteScreenView({ stepKey, onContinue, isGraduating, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const config = STEP_CONFIG[stepKey];
  const [countdown, setCountdown] = useState(config.autoAdvanceSeconds);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  const dot1Scale = useRef(new Animated.Value(0)).current;
  const dot2Scale = useRef(new Animated.Value(0)).current;
  const dot3Scale = useRef(new Animated.Value(0)).current;
  const dot4Scale = useRef(new Animated.Value(0)).current;
  const dot4Glow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // practice 전용: 4-dot 순차 팝인 → ✦ glow-pulse
  useEffect(() => {
    if (stepKey !== 'practice') return;

    const bounce = (anim: Animated.Value) =>
      Animated.spring(anim, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      });

    Animated.stagger(200, [
      bounce(dot1Scale),
      bounce(dot2Scale),
      bounce(dot3Scale),
      bounce(dot4Scale),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot4Glow, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(dot4Glow, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [stepKey, dot1Scale, dot2Scale, dot3Scale, dot4Scale, dot4Glow]);

  useEffect(() => {
    if (config.autoAdvanceSeconds === 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [config.autoAdvanceSeconds]);

  useEffect(() => {
    if (countdown === 0 && config.autoAdvanceSeconds > 0) {
      onContinueRef.current();
    }
  }, [countdown, config.autoAdvanceSeconds]);

  const checkDotScales = [dot1Scale, dot2Scale, dot3Scale];

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: config.backgroundColor,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}>

      {onDismiss != null && (
        <Pressable
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onDismiss}
          hitSlop={8}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      )}

      <View style={styles.content}>
        <Image
          source={config.charImage}
          style={styles.character}
          resizeMode="contain"
        />
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.body}>{config.body}</Text>

        {stepKey === 'practice' && (
          <View style={styles.dotsRow}>
            {checkDotScales.map((scale, i) => (
              <Animated.View
                key={i}
                style={[styles.dot, styles.dotGreen, { transform: [{ scale }] }]}>
                <Text style={styles.dotText}>✓</Text>
              </Animated.View>
            ))}
            {/* ✦ dot: 팝인(dot4Scale) 후 glow-pulse(dot4Glow) 중첩 */}
            <Animated.View style={{ transform: [{ scale: dot4Scale }] }}>
              <Animated.View
                style={[styles.dot, styles.dotGold, { transform: [{ scale: dot4Glow }] }]}>
                <Text style={styles.dotText}>✦</Text>
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.countdown}>
          {countdown > 0 ? `${countdown}초 후 자동으로 넘어가요` : ''}
        </Text>
        <Pressable
          style={[
            styles.button,
            { backgroundColor: config.accentColor },
            isGraduating && styles.buttonDisabled,
          ]}
          onPress={onContinue}
          disabled={isGraduating}>
          <Text style={styles.buttonText}>
            {isGraduating ? '처리 중...' : config.nextLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#999',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  character: {
    width: 220,
    height: 220,
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
    color: '#555',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  dotGold: {
    backgroundColor: '#f59e0b',
  },
  dotText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  footer: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  countdown: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: '#888',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#ffffff',
  },
});
```

- [ ] **Step 2: TypeScript 오류 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep "step-complete" | head -20
```

오류 없으면 다음으로.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "feat(step-complete): practice 완료 — ✓✓✓→✦ 애니메이션 + X 닫기 버튼 추가"
```

---

## 검증 체크리스트

- [ ] 약점 연습 완료 → step-complete(practice) 화면 진입
- [ ] 진입 즉시: ✓ 점 3개가 0.2초 간격으로 순서대로 팝인(bounce)
- [ ] 마지막 ✦ 점이 팝인 후 glow-pulse 무한 반복
- [ ] X(✕) 버튼이 우상단에 표시됨
- [ ] X 누름 → `router.back()` → JourneyBoard 복귀
- [ ] "함께 실전 시작하기" 버튼 → 정상 졸업 처리
- [ ] diagnostic, analysis 단계에서는 dots 없음, X 버튼 없음
- [ ] iOS: Haptic 발생 확인
