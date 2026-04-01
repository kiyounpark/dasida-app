import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type ExamSolveHeaderProps = {
  currentNumber: number;
  totalCount: number;
  answeredCount: number;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onExit: () => void;
  isCompactLayout: boolean;
};

export function ExamSolveHeader({
  currentNumber,
  totalCount,
  answeredCount,
  isBookmarked,
  onToggleBookmark,
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? '북마크 해제' : '북마크 추가'}
        onPress={onToggleBookmark}
        style={[styles.bookmarkButton, isBookmarked && styles.bookmarkButtonActive]}>
        <Text style={styles.bookmarkIcon}>🔖</Text>
      </Pressable>
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
  bookmarkButton: {
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F5F4F1',
    borderWidth: 1,
    borderColor: '#E0DDD7',
  },
  bookmarkButtonActive: {
    backgroundColor: '#FFF8EC',
    borderColor: '#F5DFA0',
  },
  bookmarkIcon: {
    fontSize: 16,
  },
});
