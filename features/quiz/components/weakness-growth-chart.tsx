import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ReviewStage } from '@/features/learning/history-types';
import type { WeaknessProgressItem } from '@/features/learning/types';

const MAX_BAR_HEIGHT = 44;
const STAGE_ORDER: ReviewStage[] = ['day1', 'day3', 'day7', 'day30'];

function StageBar({
  accuracy,
  isGhost,
}: {
  accuracy?: number;
  isGhost: boolean;
}) {
  if (isGhost) {
    return (
      <View style={styles.barColInner}>
        <View style={[styles.ghostBar, { height: MAX_BAR_HEIGHT }]} />
      </View>
    );
  }
  const height = Math.max(4, ((accuracy ?? 0) / 100) * MAX_BAR_HEIGHT);
  return (
    <View style={styles.barColInner}>
      <Text style={styles.barNum}>{accuracy}%</Text>
      <View style={[styles.solidBar, { height }]} />
    </View>
  );
}

function AccuracyBar({ item }: { item: WeaknessProgressItem }) {
  const stageIndex = STAGE_ORDER.indexOf(item.stage);
  const visibleStages = STAGE_ORDER.slice(0, stageIndex + 1);

  return (
    <View style={styles.barGroup}>
      <View style={[styles.barRow, { height: MAX_BAR_HEIGHT + 16 }]}>
        {visibleStages.map((stage) => {
          const accuracy = item.reviewAccuracyByStage[stage];
          return <StageBar key={stage} accuracy={accuracy} isGhost={accuracy == null} />;
        })}
      </View>
      <Text style={styles.barLabel} numberOfLines={2}>
        {item.weaknessLabel}
      </Text>
    </View>
  );
}

export function WeaknessAccuracyChart({ items }: { items: WeaknessProgressItem[] }) {
  const hasAnyReview = items.some(
    (item) => Object.keys(item.reviewAccuracyByStage).length > 0,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>복습 정답률</Text>
        {!hasAnyReview && (
          <Text style={styles.hint}>복습 한 번이면 바로 채워져요</Text>
        )}
      </View>

      <View style={styles.barsRow}>
        {items.map((item) => (
          <AccuracyBar key={item.weaknessId} item={item} />
        ))}
      </View>

      <View style={styles.floor} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.completedDot]} />
          <Text style={styles.legendText}>완료</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDotGhost} />
          <Text style={styles.legendText}>다음 복습</Text>
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
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#4A7C59',
  },
  ghostBar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'rgba(74, 124, 89, 0.18)',
  },
  barNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: '#2A5C38',
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
  completedDot: {
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
