import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { StyleSheet, Text, View } from 'react-native';

type DiagnosisProblemBubbleProps = {
  topic: string;
  question: string;
};

export function DiagnosisProblemBubble({
  topic,
  question,
}: DiagnosisProblemBubbleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text selectable style={styles.eyebrow}>
          문제
        </Text>
        <Text selectable style={styles.topicChip}>
          {topic}
        </Text>
        <ProblemStatement question={question} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'flex-start',
  },
  card: {
    width: '100%',
    maxWidth: '92%',
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: '#D8E3D7',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 24px rgba(41, 59, 39, 0.06)',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primarySoft,
  },
  topicChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF5EC',
    color: BrandColors.primarySoft,
    fontSize: 12,
    fontWeight: '700',
  },
});
