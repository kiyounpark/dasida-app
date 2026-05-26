import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type Phase = 'idle' | 'wrong' | 'right';

const WRONG_TEXT = '미분 약함';
const RIGHT_TEXT = "f'(x)=0 풀고\n원함수에 대입하는 거 까먹기";

const PHASE_1_DURATION = 1500;
const FADE_DURATION = 350;

export default function CaptureComparisonScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const wrongOpacity = useRef(new Animated.Value(0)).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSequence = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    wrongOpacity.setValue(1);
    rightOpacity.setValue(0);
    setPhase('wrong');

    timerRef.current = setTimeout(() => {
      setPhase('right');
      Animated.parallel([
        Animated.timing(wrongOpacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(rightOpacity, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }, PHASE_1_DURATION);
  }, [wrongOpacity, rightOpacity]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => router.replace('/dev')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="개발자 도구로 돌아가기"
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.toolbarTitle}>약점 비교 (캡처용)</Text>
        <Pressable
          onPress={runSequence}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="다시 재생"
        >
          <Text style={styles.replay}>↻</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {phase === 'idle' ? (
          <Pressable
            onPress={runSequence}
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="비교 재생"
          >
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.playLabel}>재생</Text>
          </Pressable>
        ) : (
          <>
            <Animated.View style={[styles.slide, { opacity: wrongOpacity }]} pointerEvents="none">
              <Text style={styles.markWrong}>✕</Text>
              <Text style={styles.wrongLabel}>{WRONG_TEXT}</Text>
            </Animated.View>

            <Animated.View style={[styles.slide, { opacity: rightOpacity }]} pointerEvents="none">
              <Text style={styles.markRight}>✓</Text>
              <Text style={styles.rightLabel}>{RIGHT_TEXT}</Text>
            </Animated.View>
          </>
        )}
      </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          {phase === 'idle'
            ? '화면녹화 시작 후 ▶ 누르세요'
            : phase === 'wrong'
              ? '단원 수준의 약점'
              : '실제 풀이 단계의 약점'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },
  toolbar: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    color: BrandColors.text,
    width: 32,
    textAlign: 'center',
  },
  toolbarTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: BrandColors.mutedText,
  },
  replay: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    color: BrandColors.text,
    width: 32,
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  slide: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  markWrong: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 88,
    color: BrandColors.danger,
    lineHeight: 96,
  },
  markRight: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 88,
    color: BrandColors.examForest,
    lineHeight: 96,
  },
  wrongLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 32,
    lineHeight: 40,
    color: BrandColors.mutedText,
    textAlign: 'center',
    textDecorationLine: 'line-through',
    textDecorationColor: BrandColors.danger,
  },
  rightLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 28,
    lineHeight: 38,
    color: BrandColors.examDeepGreen,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  playButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  playButtonPressed: {
    opacity: 0.85,
  },
  playIcon: {
    fontFamily: FontFamilies.bold,
    fontSize: 56,
    color: BrandColors.examLightText,
    marginLeft: 8,
  },
  playLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.examLightText,
    letterSpacing: 0.5,
  },
  hint: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.mutedText,
  },
});
