import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { UseMockExamIntroScreenResult } from '@/features/quiz/hooks/use-mock-exam-intro-screen';

const CHARACTER_SOURCE = require('../../../assets/auth/dasida-login-character.png');
const CHARACTER_ASPECT_RATIO = 492 / 534;
const CHARACTER_WIDTH = 160;

export function MockExamIntroScreenView({ onStartExam }: UseMockExamIntroScreenResult) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + BrandSpacing.xl }]}>
      <View style={styles.content}>
        <Image
          source={CHARACTER_SOURCE}
          style={[styles.character, { height: CHARACTER_WIDTH / CHARACTER_ASPECT_RATIO }]}
          contentFit="contain"
        />

        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>드디어 실전이에요!</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>약점 정리까지 마쳤어요</Text>
          <Text style={styles.body}>이제 모의고사에서 실전 감각을 확인해보세요</Text>
        </View>

        {/* 에빙하우스 복습 슬롯 — 추후 확장 */}
      </View>

      <View style={styles.ctaWrap}>
        <BrandButton title="모의고사 풀기" onPress={onStartExam} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
    paddingHorizontal: BrandSpacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BrandSpacing.md,
  },
  character: {
    width: CHARACTER_WIDTH,
  },
  bubble: {
    backgroundColor: BrandColors.card,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
  },
  bubbleText: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: BrandColors.primarySoft,
  },
  textBlock: {
    alignItems: 'center',
    gap: BrandSpacing.xs,
    marginTop: BrandSpacing.sm,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    color: BrandColors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: BrandColors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaWrap: {
    gap: BrandSpacing.sm,
  },
});
