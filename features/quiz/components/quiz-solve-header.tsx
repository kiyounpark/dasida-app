import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type QuizSolveHeaderProps = {
  currentQuestionNumber: number;
  isCompactLayout: boolean;
  onBackPress: () => void;
  progressPercent: `${number}%`;
  questionCount: number;
  title: string;
};

export function QuizSolveHeader({
  currentQuestionNumber,
  isCompactLayout,
  onBackPress,
  progressPercent,
  questionCount,
  title,
}: QuizSolveHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.wrap, isCompactLayout && styles.wrapCompact]}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityHint="현재 풀이를 나갈지 선택합니다"
            accessibilityLabel="나가기"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}>
            <IconSymbol color={BrandColors.primaryDark} name="chevron.left" size={isCompactLayout ? 22 : 24} />
          </Pressable>

          <Text numberOfLines={1} style={[styles.title, isCompactLayout && styles.titleCompact]}>
            {title}
          </Text>

          <Text style={[styles.counter, isCompactLayout && styles.counterCompact]}>
            {currentQuestionNumber} / {questionCount}
          </Text>
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
    paddingBottom: 12,
    gap: 10,
  },
  wrapCompact: {
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 40,
  },
  title: {
    flex: 1,
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: BrandColors.primaryDark,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  counter: {
    minWidth: 40,
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    color: BrandColors.primaryDark,
    textAlign: 'right',
  },
  counterCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    width: '100%',
    height: 5,
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
