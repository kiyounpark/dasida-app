import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type {
  WeaknessProgressItem as WeaknessProgressItemType,
  WeaknessSeverity,
} from '@/features/learning/types';

const SEVERITY_LABEL: Record<WeaknessSeverity, string> = {
  frequent: '단골 약점',
  often: '자주 등장',
  occasional: '가끔 등장',
};

const SEVERITY_DOTS: Record<WeaknessSeverity, number> = {
  frequent: 3,
  often: 2,
  occasional: 1,
};

function severityColor(severity: WeaknessSeverity, completed: boolean): string {
  if (completed) return '#4A7C59';
  switch (severity) {
    case 'frequent':
      return BrandColors.danger ?? '#D9534F';
    case 'often':
      return '#E8A547';
    case 'occasional':
      return '#4A7C59';
  }
}

export function WeaknessProgressItem({
  item,
  onPress,
}: {
  item: WeaknessProgressItemType;
  onPress?: (weaknessId: string) => void;
}) {
  const dotsFilled = SEVERITY_DOTS[item.severity];
  const color = severityColor(item.severity, item.completed);
  const severityLabel = item.completed ? '해결됐어요 ✓' : SEVERITY_LABEL[item.severity];
  const badgeText = item.completed ? '해결됐어요 ✓' : '점점 나아지는 중';

  const handlePress = () => onPress?.(item.weaknessId);

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: 'rgba(41, 59, 39, 0.06)' }}
      style={({ pressed }) => [
        styles.container,
        item.completed && styles.containerDone,
        pressed && styles.containerPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.weaknessLabel}, ${severityLabel}`}
    >
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
        <View style={styles.severityRow}>
          <View style={styles.dots}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i <= dotsFilled && { backgroundColor: color },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.severityLabel, { color }]}>{severityLabel}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
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
  containerPressed: {
    opacity: 0.7,
  },
  left: { flex: 1, gap: 3, minWidth: 0 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityRow: {
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
  severityLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
  },
  chevron: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    color: 'rgba(41, 59, 39, 0.35)',
    marginLeft: 2,
  },
});
