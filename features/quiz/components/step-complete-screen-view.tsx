import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
};

const STEP_CONFIG: Record<StepCompleteKey, StepConfig> = {
  diagnostic: {
    charImage: require('../../../assets/images/characters/char_04.png'),
    title: '진단 완료!',
    body: '10문제로 약점을 찾았어요.\n이제 약점을 분석할게요.',
    nextLabel: '약점 분석 시작하기',
    accentColor: '#6366f1',
    backgroundColor: '#f5f3ff',
  },
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  practice: {
    charImage: require('../../../assets/images/characters/char_15.png'),
    title: '연습 완료!',
    body: '약점 연습을 모두 마쳤어요.\n여정 보드가 완성됐어요.',
    nextLabel: '여정 보드 보기',
    accentColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
};

type Props = {
  stepKey: StepCompleteKey;
  onContinue: () => void;
};

const AUTO_ADVANCE_SECONDS = 3;

export function StepCompleteScreenView({ stepKey, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const config = STEP_CONFIG[stepKey];
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECONDS);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0 && AUTO_ADVANCE_SECONDS > 0) {
      onContinueRef.current();
    }
  }, [countdown]);

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
          style={[styles.button, { backgroundColor: config.accentColor }]}
          onPress={onContinue}>
          <Text style={styles.buttonText}>{config.nextLabel}</Text>
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
    width: 180,
    height: 180,
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
  buttonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#ffffff',
  },
});
