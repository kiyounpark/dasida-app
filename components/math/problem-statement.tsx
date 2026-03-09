import { StyleSheet, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';

import { MathText, splitQuestionDisplaySegments } from './MathText';

const FORMULA_BLOCK_BACKGROUND = 'rgba(74, 124, 89, 0.08)';

type ProblemStatementProps = {
  question: string;
};

export function ProblemStatement({ question }: ProblemStatementProps) {
  const segments = splitQuestionDisplaySegments(question);

  return (
    <View style={styles.container}>
      {segments.map((segment, index) =>
        segment.kind === 'formula' ? (
          <View key={`formula_${index}`} style={styles.formulaBlock}>
            <MathText selectable text={segment.text} style={styles.formulaText} />
          </View>
        ) : (
          <MathText
            key={`text_${index}`}
            selectable
            text={segment.text}
            style={styles.promptText}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    backgroundColor: BrandColors.background,
    paddingVertical: BrandSpacing.xl,
    paddingHorizontal: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
  formulaBlock: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: FORMULA_BLOCK_BACKGROUND,
    paddingVertical: BrandSpacing.lg,
    paddingHorizontal: BrandSpacing.md,
  },
  formulaText: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '700',
    color: BrandColors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
