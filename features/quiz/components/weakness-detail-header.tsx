import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { WeaknessProgressItem } from '@/features/learning/types';
import {
  SEVERITY_DOTS,
  SEVERITY_LABEL,
  getKoreanSubjectParticle,
  severityColor,
} from '@/features/quiz/components/weakness-severity-ui';

export function WeaknessDetailHeader({ item }: { item: WeaknessProgressItem }) {
  const color = severityColor(item.severity, item.completed);
  const dotsFilled = SEVERITY_DOTS[item.severity];

  return (
    <View style={styles.container}>
      <View style={styles.topicChip}>
        <Text style={styles.topicChipText}>{item.topicLabel}</Text>
      </View>
      <Text style={styles.headline}>
        {item.weaknessLabel}{getKoreanSubjectParticle(item.weaknessLabel)} 잘 안 잡혀
      </Text>

      {item.completed ? (
        <Text style={[styles.severity, { color }]}>✓ 해결됐어요!</Text>
      ) : (
        <View style={styles.severityRow}>
          <View style={styles.dots}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, i <= dotsFilled && { backgroundColor: color }]}
              />
            ))}
          </View>
          <Text style={[styles.severityLabel, { color }]}>
            {SEVERITY_LABEL[item.severity]}
          </Text>
        </View>
      )}

      <Text style={styles.countSubtext}>
        최근 5번 중 {item.recentAppearanceCount}번 등장
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  topicChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#2A5C38',
  },
  headline: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    color: '#1C2C19',
    lineHeight: 30,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
  severityLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
  },
  severity: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    marginTop: 4,
  },
  countSubtext: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(72, 67, 58, 0.7)',
    marginTop: 2,
  },
});
