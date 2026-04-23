import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PosterTitleBanner } from '@/features/quiz/components/poster-title-banner';

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
};

export function QuizResultReportHeader({ isCompactLayout }: QuizResultReportHeaderProps) {
  // poster-title-banner.tsx heroFrameWrapRaised(d) translateY(-32/-24)에 맞춰야 함; 4 + bannerRaise
  const bannerPaddingTop = isCompactLayout ? 28 : 36;
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.bannerWrap, { paddingTop: bannerPaddingTop }]}>
        <PosterTitleBanner
          isCompactLayout={isCompactLayout}
          title="나의 약점 분석 리포트"
          fontSize={isCompactLayout ? 24 : 28}
          numberOfLines={2}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F3E8',
  },
  bannerWrap: {
    paddingHorizontal: 14,
  },
});
