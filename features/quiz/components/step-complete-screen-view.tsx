import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
};

export function StepCompleteScreenView({ stepKey, onContinue, isGraduating }: Props) {
  const insets = useSafeAreaInsets();
  const config = STEP_CONFIG[stepKey];
  const [countdown, setCountdown] = useState(config.autoAdvanceSeconds);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    if (config.autoAdvanceSeconds === 0) {
      return;
    }
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
      <View style={styles.content}>
        <Image
          source={config.charImage}
          style={styles.character}
          resizeMode="contain"
        />
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.body}>{config.body}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.countdown}>
          {countdown > 0 ? `${countdown}초 후 자동으로 넘어가요` : ''}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: config.accentColor }, isGraduating && styles.buttonDisabled]}
          onPress={onContinue}
          disabled={isGraduating}>
          <Text style={styles.buttonText}>{isGraduating ? '처리 중...' : config.nextLabel}</Text>
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
