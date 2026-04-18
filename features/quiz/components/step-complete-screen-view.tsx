// features/quiz/components/step-complete-screen-view.tsx
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { BrandColors } from '@/constants/brand';
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
    accentColor: BrandColors.warning,
    backgroundColor: BrandColors.background,
    autoAdvanceSeconds: 3,
  },
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.background,
    autoAdvanceSeconds: 3,
  },
  practice: {
    charImage: require('../../../assets/images/characters/char_sparkle_sunglasses.png'),
    title: '이제 새로운\n시작이에요!',
    body: '진단, 분석, 연습까지 함께했어요.\n이제 실전에서 같이 나아가봐요.',
    nextLabel: '함께 실전 시작하기 →',
    accentColor: BrandColors.primary,
    backgroundColor: BrandColors.background,
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

    let loopAnimation: Animated.CompositeAnimation | null = null;

    Animated.stagger(200, [
      bounce(dot1Scale),
      bounce(dot2Scale),
      bounce(dot3Scale),
      bounce(dot4Scale),
    ]).start(() => {
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(dot4Glow, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(dot4Glow, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ]),
      );
      loopAnimation.start();
    });

    return () => {
      dot1Scale.stopAnimation();
      dot2Scale.stopAnimation();
      dot3Scale.stopAnimation();
      dot4Scale.stopAnimation();
      dot4Glow.stopAnimation();
      loopAnimation?.stop();
    };
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
          hitSlop={{ top: 8, bottom: 16, left: 16, right: 8 }}>
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
    color: BrandColors.mutedText,
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
    color: BrandColors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
    color: BrandColors.mutedText,
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
    backgroundColor: BrandColors.success,
  },
  dotGold: {
    backgroundColor: BrandColors.warning,
  },
  dotText: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: FontFamilies.bold,
  },
  footer: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  countdown: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.mutedText,
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
