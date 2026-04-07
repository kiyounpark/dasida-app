import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { WeaknessProgressItem } from '@/features/learning/types';

const MAX_BAR_HEIGHT = 44;

function AccuracyBar({
  diagnosticAccuracy,
  reviewAccuracy,
  label,
}: {
  diagnosticAccuracy?: number;
  reviewAccuracy?: number;
  label: string;
}) {
  const hasDiagData = diagnosticAccuracy != null;
  const hasReviewData = reviewAccuracy != null;

  // 진단 데이터 없고 복습만 있는 경우: 복습 막대를 왼쪽에, ghost를 오른쪽에
  const leftAccuracy = hasDiagData ? diagnosticAccuracy : reviewAccuracy;
  const leftIsReview = !hasDiagData && hasReviewData;
  const leftHeight = leftAccuracy != null ? Math.max(4, (leftAccuracy / 100) * MAX_BAR_HEIGHT) : 0;

  // 오른쪽: 진단+복습 모두 있으면 복습 막대, 그 외엔 ghost
  const showRightSolid = hasDiagData && hasReviewData;
  const rightHeight = showRightSolid
    ? Math.max(4, (reviewAccuracy! / 100) * MAX_BAR_HEIGHT)
    : 0;

  return (
    <View style={styles.barGroup}>
      <View style={[styles.barRow, { height: MAX_BAR_HEIGHT + 16 }]}>
        {/* 왼쪽: 진단 막대 (진단 있으면) 또는 복습 막대 (진단 없으면) */}
        {leftAccuracy != null && (
          <View style={styles.barColInner}>
            <Text style={[styles.barNum, leftIsReview && styles.reviewNum]}>
              {leftAccuracy}%
            </Text>
            <View
              style={[
                styles.solidBar,
                leftIsReview ? styles.reviewBar : styles.diagBar,
                { height: leftHeight },
              ]}
            />
          </View>
        )}

        {/* 오른쪽: 복습 막대 (진단+복습 모두 있으면) 또는 ghost */}
        <View style={styles.barColInner}>
          {showRightSolid ? (
            <>
              <Text style={[styles.barNum, styles.reviewNum]}>{reviewAccuracy}%</Text>
              <View style={[styles.solidBar, styles.reviewBar, { height: rightHeight }]} />
            </>
          ) : (
            <View style={[styles.ghostBar, { height: MAX_BAR_HEIGHT }]} />
          )}
        </View>
      </View>
      <Text style={styles.barLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function WeaknessAccuracyChart({ items }: { items: WeaknessProgressItem[] }) {
  const reviewedItems = items.filter(
    (item) => item.reviewAccuracy != null && item.diagnosticAccuracy != null,
  );
  const avgDelta =
    reviewedItems.length > 0
      ? Math.round(
          reviewedItems.reduce(
            (sum, item) => sum + (item.reviewAccuracy! - item.diagnosticAccuracy!),
            0,
          ) / reviewedItems.length,
        )
      : null;
  const hasReviewData = items.some((item) => item.reviewAccuracy != null);
  const hasAnyDiagData = items.some((item) => item.diagnosticAccuracy != null);

  const hintText = (() => {
    if (avgDelta != null && avgDelta > 0) return null;
    if (!hasReviewData) return '복습 한 번이면 바로 채워져요';
    if (hasReviewData && !hasAnyDiagData) return '한 번만 더! 바로 채워져요';
    return null;
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>약점별 정답률</Text>
        {avgDelta != null && avgDelta > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌱 평균 +{avgDelta}%</Text>
          </View>
        ) : hintText != null ? (
          <Text style={styles.hint}>{hintText}</Text>
        ) : null}
      </View>

      <View style={styles.barsRow}>
        {items.map((item) => (
          <AccuracyBar
            key={item.weaknessId}
            diagnosticAccuracy={item.diagnosticAccuracy}
            reviewAccuracy={item.reviewAccuracy}
            label={item.weaknessLabel}
          />
        ))}
      </View>

      <View style={styles.floor} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.diagDot]} />
          <Text style={styles.legendText}>진단</Text>
        </View>
        <View style={styles.legendItem}>
          {hasReviewData ? (
            <View style={[styles.legendDot, styles.reviewDot]} />
          ) : (
            <View style={styles.legendDotGhost} />
          )}
          <Text style={styles.legendText}>최근 복습</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1C2C19',
  },
  badge: {
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A4A28',
  },
  hint: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: 'rgba(72, 67, 58, 0.45)',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barColInner: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  solidBar: {
    width: 12,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  diagBar: {
    backgroundColor: 'rgba(74, 124, 89, 0.5)',
  },
  reviewBar: {
    backgroundColor: '#4A7C59',
  },
  ghostBar: {
    width: 12,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'rgba(74, 124, 89, 0.18)',
  },
  barNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: 'rgba(74, 124, 89, 0.6)',
  },
  reviewNum: {
    color: '#2A5C38',
  },
  barNumEmpty: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: 'rgba(41, 59, 39, 0.2)',
  },
  barLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: 'rgba(28, 44, 25, 0.45)',
    textAlign: 'center',
    lineHeight: 12,
  },
  floor: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.1)',
    marginTop: 6,
    marginBottom: 6,
  },
  legend: {
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  diagDot: {
    backgroundColor: 'rgba(74, 124, 89, 0.3)',
  },
  reviewDot: {
    backgroundColor: '#4A7C59',
  },
  legendDotGhost: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 124, 89, 0.35)',
  },
  legendText: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    color: 'rgba(28, 44, 25, 0.45)',
  },
});
