import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ReviewStage } from '@/features/learning/history-types';
import type { WeaknessProgressItem as WeaknessProgressItemType } from '@/features/learning/types';

function stageDotsFilled(stage: ReviewStage, completed: boolean): number {
  if (completed) return 4;
  switch (stage) {
    case 'day1':
      return 1;
    case 'day3':
      return 2;
    case 'day7':
      return 3;
    case 'day30':
      return 4;
  }
}

export function WeaknessProgressItem({ item }: { item: WeaknessProgressItemType }) {
  const filled = stageDotsFilled(item.stage, item.completed);
  const badgeText = item.completed ? '해결됐어요 ✓' : '점점 나아지는 중';
  const stageLabel = item.completed ? '완료' : item.stage;

  return (
    <View style={[styles.container, item.completed && styles.containerDone]}>
      <View style={styles.left}>
        <View style={styles.topicChip}>
          <Text style={styles.topicChipText}>{item.topicLabel}</Text>
        </View>
        <Text style={styles.weaknessLabel} numberOfLines={1}>
          {item.weaknessLabel}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.dots}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i <= filled && styles.dotFilled]} />
          ))}
        </View>
        <Text style={[styles.stageLabel, item.completed && styles.stageLabelDone]}>
          {stageLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  containerDone: {
    backgroundColor: 'rgba(74, 124, 89, 0.06)',
    borderColor: 'rgba(74, 124, 89, 0.18)',
  },
  left: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  topicChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A5C38',
  },
  weaknessLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
  },
  badge: {
    alignSelf: 'flex-start',
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
  right: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 3,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(41, 59, 39, 0.12)',
  },
  dotFilled: {
    backgroundColor: '#4A7C59',
  },
  stageLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    color: 'rgba(72, 67, 58, 0.4)',
  },
  stageLabelDone: {
    color: '#4A7C59',
  },
});
