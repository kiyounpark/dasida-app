import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PosterTitleBanner } from '@/features/quiz/components/poster-title-banner';

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
};

export function QuizResultReportHeader({ isCompactLayout }: QuizResultReportHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bannerWrap}>
        <PosterTitleBanner isCompactLayout={isCompactLayout} title="나의 약점 분석 리포트" />
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
    paddingTop: 4,
  },
});
