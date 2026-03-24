import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies } from '@/constants/typography';
import { DiagnosticProgressRing } from '@/features/quiz/components/diagnostic-progress-ring';
import { DiagnosticSketchColors } from '@/features/quiz/components/diagnostic-sketch-assets';
import { DIAGNOSTIC_PROGRESS_TRACK_COLOR } from '@/features/quiz/components/diagnostic-progress-theme';
import { DiagnosticSketchProgressBar } from '@/features/quiz/components/diagnostic-sketch-progress-bar';

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
  const ringSize = isCompactLayout ? 74 : 90;
  const strokeWidth = isCompactLayout ? 7 : 8.5;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.wrap, isCompactLayout && styles.wrapCompact]}>
        <View style={[styles.topRow, isCompactLayout && styles.topRowCompact]}>
          <Pressable
            accessibilityHint="현재 진단을 나갈지 선택합니다"
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            onPress={onBackPress}
            style={[styles.backButton, isCompactLayout && styles.backButtonCompact]}>
            <IconSymbol
              color={DiagnosticSketchColors.ink}
              name="chevron.left"
              size={isCompactLayout ? 28 : 32}
            />
            <Text style={[styles.backLabel, isCompactLayout && styles.backLabelCompact]}>
              Back
            </Text>
          </Pressable>

          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            numberOfLines={1}
            style={[styles.title, isCompactLayout && styles.titleCompact]}>
            10문제 약점 진단
          </Text>

          <View style={[styles.ringWrap, isCompactLayout && styles.ringWrapCompact]}>
            <DiagnosticProgressRing
              color={DiagnosticSketchColors.green}
              current={currentQuestionNumber}
              size={ringSize}
              strokeWidth={strokeWidth}
              total={questionCount}
              trackColor={DIAGNOSTIC_PROGRESS_TRACK_COLOR}
            />
          </View>
        </View>

        <DiagnosticSketchProgressBar
          current={currentQuestionNumber}
          isCompactLayout={isCompactLayout}
          progressPercent={progressPercent}
          total={questionCount}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: DiagnosticSketchColors.background,
  },
  wrap: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: DiagnosticSketchColors.background,
  },
  wrapCompact: {
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topRowCompact: {
    gap: 6,
  },
  backButton: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backButtonCompact: {
    width: 78,
    gap: 2,
  },
  backLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 21,
    lineHeight: 27,
    color: DiagnosticSketchColors.ink,
  },
  backLabelCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  title: {
    flex: 1,
    fontFamily: FontFamilies.extrabold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -1.4,
    color: DiagnosticSketchColors.ink,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.8,
  },
  ringWrap: {
    width: 112,
    alignItems: 'flex-end',
  },
  ringWrapCompact: {
    width: 74,
  },
});
