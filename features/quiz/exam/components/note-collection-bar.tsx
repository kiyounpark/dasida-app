import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type NoteCollectionBarProps = {
  current: number;
  total: number;
  variant?: 'full' | 'compact'; // full: 분석 화면, compact: 홈 카드
  showRemainingHint?: boolean; // "10장 더 모으면 종합 리포트" 표시 여부
};

const MAX_DOTS = 45;

export function NoteCollectionBar({
  current,
  total,
  variant = 'full',
  showRemainingHint = true,
}: NoteCollectionBarProps) {
  const safeTotal = Math.min(total, MAX_DOTS);
  const dots = Array.from({ length: safeTotal }, (_, i) => i < current);
  const remaining = total - current;
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.wrap, isCompact && styles.wrapCompact]}>
      <View style={styles.header}>
        <Text style={[styles.title, isCompact && styles.titleCompact]}>📔 학습 노트</Text>
        <Text style={[styles.count, isCompact && styles.countCompact]}>
          {current}
          <Text style={styles.countSuffix}>{isCompact ? ` / ${total}` : '장'}</Text>
        </Text>
      </View>

      <View style={[styles.dotsRow, isCompact && styles.dotsRowCompact]}>
        {dots.map((filled, idx) => (
          <View
            key={idx}
            style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty, isCompact && styles.dotCompact]}
          />
        ))}
      </View>

      {showRemainingHint && remaining > 0 ? (
        <Text style={styles.hint}>
          <Text style={styles.hintHighlight}>{remaining}장</Text> 더 모으면 종합 리포트 ✦
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: BrandColors.examPaleGreen,
    borderColor: BrandColors.examForestBorder,
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
  },
  wrapCompact: {
    backgroundColor: BrandColors.card,
    padding: BrandSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.examForest,
    letterSpacing: 0.6,
  },
  titleCompact: {
    fontSize: 11,
  },
  count: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    color: BrandColors.text,
  },
  countCompact: {
    fontSize: 14,
  },
  countSuffix: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: BrandColors.mutedText,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginVertical: BrandSpacing.xs,
  },
  dotsRowCompact: {
    marginVertical: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: BrandColors.success,
  },
  dotEmpty: {
    backgroundColor: BrandColors.border,
  },
  hint: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: BrandColors.text,
    textAlign: 'center',
  },
  hintHighlight: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.success,
  },
});
