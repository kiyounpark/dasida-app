import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PosterTitleBanner } from '@/features/quiz/components/poster-title-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
  onClose: () => void;
};

export function QuizResultReportHeader({
  isCompactLayout,
  onClose,
}: QuizResultReportHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityHint="퀴즈 홈으로 이동합니다"
          accessibilityLabel="퀴즈 홈으로"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.backButton,
            isCompactLayout && styles.backButtonCompact,
            pressed && styles.backButtonPressed,
          ]}>
          <IconSymbol color="#1E1A17" name="chevron.left" size={isCompactLayout ? 18 : 20} />
        </Pressable>
      </View>

      <PosterTitleBanner isCompactLayout={isCompactLayout} title="나의 약점 분석 리포트" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F3E8',
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    zIndex: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(33, 28, 24, 0.12)',
    boxShadow: '0 8px 20px rgba(38, 34, 28, 0.08)',
  },
  backButtonCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  backButtonPressed: {
    opacity: 0.84,
  },
});
