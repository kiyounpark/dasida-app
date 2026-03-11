import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { StyleSheet, Text, View } from 'react-native';

type DiagnosisProblemBubbleProps = {
  topic: string;
  question: string;
  variant?: 'hero';
};

export function DiagnosisProblemBubble({
  topic,
  question,
  variant = 'hero',
}: DiagnosisProblemBubbleProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.card, variant === 'hero' && styles.heroCard]}>
        <View style={styles.heroBand} />
        <Text selectable style={styles.eyebrow}>
          오늘 같이 볼 문제
        </Text>
        <Text selectable style={styles.topicChip}>
          {topic}
        </Text>
        <View style={styles.problemPanel}>
          <ProblemStatement question={question} />
        </View>
        <Text selectable style={styles.helper}>
          이 문제를 어떻게 풀었는지부터 같이 볼게요.
        </Text>
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
    overflow: 'hidden',
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.heroBg,
    boxShadow: '0 14px 28px rgba(36, 50, 41, 0.08)',
  },
  heroCard: {
    paddingTop: BrandSpacing.lg,
  },
  heroBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: DiagnosisTheme.heroAccent,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#54705B',
    letterSpacing: 0.4,
  },
  topicChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#E9F1E8',
    color: DiagnosisTheme.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  problemPanel: {
    marginTop: 2,
    padding: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: '#E5E7DE',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
  },
  helper: {
    paddingTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: DiagnosisTheme.inkMuted,
  },
});
