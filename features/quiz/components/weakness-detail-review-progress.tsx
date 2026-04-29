import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ReviewStage } from '@/features/learning/history-types';

const STAGE_ORDER: ReviewStage[] = ['day1', 'day3', 'day7', 'day30'];

function stageDotsFilled(stage: ReviewStage, completed: boolean): number {
  if (completed) return 4;
  return STAGE_ORDER.indexOf(stage) + 1;
}

function nextStageLabel(stage: ReviewStage, completed: boolean): string {
  if (completed) return '완료';
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) return '';
  if (idx === STAGE_ORDER.length - 1) return '다음 복습을 완료하면 약점 해결!';
  return `다음 복습: ${STAGE_ORDER[idx + 1]}`;
}

export function WeaknessDetailReviewProgress({
  stage,
  completed,
}: {
  stage: ReviewStage;
  completed: boolean;
}) {
  const filled = stageDotsFilled(stage, completed);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>복습 진도</Text>
      <View style={styles.row}>
        <View style={styles.dots}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i <= filled && styles.dotFilled]} />
          ))}
        </View>
        <Text style={styles.stageText}>
          {completed ? '완료' : `${stage} 복습 완료`}
        </Text>
      </View>
      <Text style={styles.nextText}>{nextStageLabel(stage, completed)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(41, 59, 39, 0.12)',
  },
  dotFilled: {
    backgroundColor: '#4A7C59',
  },
  stageText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1C2C19',
  },
  nextText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: 'rgba(72, 67, 58, 0.7)',
    marginTop: 2,
  },
});
