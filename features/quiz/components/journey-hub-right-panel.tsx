import { ScrollView, StyleSheet, View } from 'react-native';

import { JourneyCtaButton } from '@/features/quiz/components/journey-cta-button';
import { StepDetailCard } from '@/features/quiz/components/step-detail-card';
import {
  ExamAnalysisResumeCarousel,
  type ExamAnalysisResumeCarouselItem,
} from '@/features/quiz/exam/components/exam-analysis-resume-carousel';
import type { JourneyStepKey } from '@/features/learning/home-journey-state';

export function JourneyHubRightPanel({
  analysisResumeItems,
  ctaLabel,
  isCompactLayout,
  onPressCta,
  onResumeAnalysis,
  showAnalysisResume,
  stepKey,
}: {
  analysisResumeItems: ExamAnalysisResumeCarouselItem[];
  ctaLabel: string;
  isCompactLayout: boolean;
  onPressCta: () => void;
  onResumeAnalysis: (attemptId: string) => void;
  showAnalysisResume: boolean;
  stepKey: JourneyStepKey;
}) {
  // 분석 재개 카루셀이 등장하면 STEP 카드는 compact, 아니면 rich.
  const stepCardMode = showAnalysisResume ? 'compact' : 'rich';

  return (
    <View style={styles.panel}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <StepDetailCard mode={stepCardMode} stepKey={stepKey} />
        {showAnalysisResume && analysisResumeItems.length > 0 ? (
          <ExamAnalysisResumeCarousel
            items={analysisResumeItems}
            onPressItem={onResumeAnalysis}
          />
        ) : null}
      </ScrollView>
      <View style={styles.ctaFooter}>
        <JourneyCtaButton
          compact={isCompactLayout}
          label={ctaLabel}
          onPress={onPressCta}
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  ctaFooter: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    maxWidth: 480,
  },
});
