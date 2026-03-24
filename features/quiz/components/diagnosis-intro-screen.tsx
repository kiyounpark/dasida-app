import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { FontFamilies } from '@/constants/typography';
import { JourneyCtaButton } from '@/features/quiz/components/journey-cta-button';

const INTRO_IMAGE_SOURCE = require('../../../assets/image.png');

export function DiagnosisIntroScreen({
  onStartDiagnosis,
}: {
  onStartDiagnosis: () => void;
}) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.imageContainer}>
        <Image
          contentFit="contain"
          source={INTRO_IMAGE_SOURCE}
          style={styles.illustration}
          transition={0}
        />
      </View>
      
      <View style={styles.footer}>
        <JourneyCtaButton
          label="심층 약점 분석 시작하기"
          onPress={onStartDiagnosis}
        />
        <Text selectable style={styles.footerText}>
          방금 푼 10문제를 바탕으로 나만의 약점을 찾아볼게요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FCF9F2',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BrandSpacing.lg,
  },
  illustration: {
    width: '100%',
    height: '100%',
    maxWidth: 400,
    maxHeight: 500,
  },
  footer: {
    width: '100%',
    paddingHorizontal: BrandSpacing.xl,
    alignItems: 'center',
    gap: BrandSpacing.md,
    paddingBottom: BrandSpacing.sm,
  },
  footerText: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 4,
  },
});
