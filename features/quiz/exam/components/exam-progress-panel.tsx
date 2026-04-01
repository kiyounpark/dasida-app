import { StyleSheet, View, Text } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type ExamProgressPanelProps = {
  totalCount: number;
  currentIndex: number;       // 0-based
  answeredIndices: number[];  // 답변 완료한 문제 인덱스 목록
  bookmarkedIndices: number[]; // 북마크한 문제 인덱스 목록
};

export function ExamProgressPanel({
  totalCount,
  currentIndex,
  answeredIndices,
  bookmarkedIndices,
}: ExamProgressPanelProps) {
  const answered = new Set(answeredIndices);
  const bookmarked = new Set(bookmarkedIndices);
  const progressRatio = totalCount > 0 ? answeredIndices.length / totalCount : 0;

  return (
    <View style={styles.panel}>
      {/* 진행바 */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>진행률</Text>
        <Text style={styles.progressCount}>
          {answeredIndices.length} / {totalCount}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` as `${number}%` }]} />
      </View>

      {/* 도트 그리드 */}
      <View style={styles.grid}>
        {Array.from({ length: totalCount }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = answered.has(i);
          const isBookmarked = bookmarked.has(i);

          return (
            <View
              key={i}
              style={[
                styles.dot,
                isCurrent && styles.dotCurrent,
                !isCurrent && isBookmarked && styles.dotBookmarked,
                !isCurrent && !isBookmarked && isAnswered && styles.dotAnswered,
              ]}
            />
          );
        })}
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotAnswered]} />
          <Text style={styles.legendText}>답변</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotBookmarked]} />
          <Text style={styles.legendText}>북마크</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotCurrent]} />
          <Text style={styles.legendText}>현재</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
    color: '#8E8A81',
  },
  progressCount: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 16,
    color: BrandColors.primarySoft,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E0DDD7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: BrandColors.primarySoft,
    borderRadius: 999,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dot: {
    width: '8%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#E0DDD7',
  },
  dotAnswered: {
    backgroundColor: BrandColors.primarySoft,
  },
  dotBookmarked: {
    backgroundColor: '#F5DFA0',
  },
  dotCurrent: {
    backgroundColor: BrandColors.primaryDark,
    borderWidth: 2,
    borderColor: BrandColors.primarySoft,
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  legendText: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
    color: '#8E8A81',
  },
});
