import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type ExamAnalysisResumeCardProps = {
  examTitle: string;
  noteCount: number;
  totalNotes: number;
  onPress: () => void;
};

export function ExamAnalysisResumeCard({
  examTitle,
  noteCount,
  totalNotes,
  onPress,
}: ExamAnalysisResumeCardProps) {
  const safeCurrent = Math.min(Math.max(noteCount, 0), totalNotes);
  const fillPercent: DimensionValue = totalNotes > 0 ? `${(safeCurrent / totalNotes) * 100}%` : '0%';

  return (
    <Pressable
      testID="exam-resume-card"
      accessibilityRole="button"
      accessibilityLabel={`${examTitle} 분석 이어가기, 학습 노트 ${noteCount} / ${totalNotes} 진행 중`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.pill}>
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>분석 진행 중</Text>
      </View>

      <Text style={styles.title}>{examTitle}</Text>

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>학습 노트</Text>
          <Text style={styles.progressCount}>
            {noteCount} / {totalNotes}
          </Text>
        </View>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: totalNotes, now: noteCount }}>
          <View
            testID="exam-resume-progress-fill"
            style={[styles.progressFill, { width: fillPercent }]}
          />
        </View>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>이어서 분석하기 →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.examPaleGreen,
    borderColor: BrandColors.examSoftGreen,
    borderWidth: 1.5,
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: BrandColors.examSoftGreen,
    gap: 6,
    marginBottom: BrandSpacing.sm,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primarySoft,
  },
  pillText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.examForest,
  },

  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: BrandColors.examDeepGreen,
    marginBottom: BrandSpacing.md,
  },

  progressSection: {
    marginBottom: BrandSpacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.mutedText,
  },
  progressCount: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 13,
    color: BrandColors.examForest,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: BrandColors.examSoftGreen,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
  },

  cta: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.examLightText,
  },
});
