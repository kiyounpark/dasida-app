import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { DiagnosticProgressRing } from '@/features/quiz/components/diagnostic-progress-ring';

type DiagnosticSolveHeaderProps = {
  currentQuestionNumber: number;
  isCompactLayout: boolean;
  onBackPress: () => void;
  progressPercent: `${number}%`;
  questionCount: number;
};

export function DiagnosticSolveHeader({
  currentQuestionNumber,
  isCompactLayout,
  onBackPress,
  progressPercent,
  questionCount,
}: DiagnosticSolveHeaderProps) {
  const ringSize = isCompactLayout ? 68 : 76;
  const strokeWidth = isCompactLayout ? 6 : 7;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.wrap}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityHint="현재 진단을 나갈지 선택합니다"
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}>
            <IconSymbol color={BrandColors.primaryDark} name="chevron.left" size={isCompactLayout ? 24 : 28} />
            <Text selectable style={[styles.backLabel, isCompactLayout && styles.backLabelCompact]}>
              Back
            </Text>
          </Pressable>

          <Text selectable numberOfLines={1} style={[styles.title, isCompactLayout && styles.titleCompact]}>
            10문제 약점 진단
          </Text>

          <View style={styles.ringWrap}>
            <DiagnosticProgressRing
              color={BrandColors.primaryDark}
              current={currentQuestionNumber}
              size={ringSize}
              strokeWidth={strokeWidth}
              total={questionCount}
              trackColor="#E6E4DE"
            />
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressPercent }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 18,
    backgroundColor: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 22,
    lineHeight: 28,
    color: BrandColors.primaryDark,
  },
  backLabelCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  title: {
    flex: 1,
    fontFamily: FontFamilies.extrabold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: BrandColors.primaryDark,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  ringWrap: {
    width: 92,
    alignItems: 'flex-end',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E8E6E0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primaryDark,
  },
});
