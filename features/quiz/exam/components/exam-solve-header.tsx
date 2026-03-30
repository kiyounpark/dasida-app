import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type ExamSolveHeaderProps = {
  currentNumber: number;
  totalCount: number;
  answeredCount: number;
  score: number;
  onExit: () => void;
  isCompactLayout: boolean;
};

export function ExamSolveHeader({
  currentNumber,
  totalCount,
  answeredCount,
  score,
  onExit,
  isCompactLayout,
}: ExamSolveHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + (isCompactLayout ? 8 : 12) }]}>
      <Pressable accessibilityRole="button" onPress={onExit} style={styles.exitButton}>
        <Text selectable style={styles.exitText}>
          나가기
        </Text>
      </Pressable>

      <View style={styles.center}>
        <Text selectable style={styles.problemNumber}>
          {currentNumber}번
        </Text>
        <Text selectable style={styles.progressText}>
          {answeredCount}/{totalCount} 답변
        </Text>
      </View>

      <View style={styles.scoreWrap}>
        <Text selectable style={styles.scoreValue}>
          {score}점
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: BrandColors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(41, 59, 39, 0.08)',
    gap: 8,
  },
  exitButton: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    minWidth: 48,
  },
  exitText: {
    fontFamily: FontFamilies.medium,
    fontSize: 15,
    lineHeight: 20,
    color: '#8E8A81',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  problemNumber: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    color: '#1B1A17',
  },
  progressText: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#AEAAA2',
  },
  scoreWrap: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 20,
    color: BrandColors.primarySoft,
  },
});
