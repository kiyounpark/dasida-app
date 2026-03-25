import { StyleSheet, View } from 'react-native';

import { MathText, splitQuestionDisplaySegments } from '@/components/math/MathText';
import { BrandColors } from '@/constants/brand';

type DiagnosticQuestionCardProps = {
  isCompactLayout: boolean;
  question: string;
};

export function DiagnosticQuestionCard({
  isCompactLayout,
  question,
}: DiagnosticQuestionCardProps) {
  const hasProminentFormula = splitQuestionDisplaySegments(question).some(
    (segment) => segment.kind === 'formula',
  );

  return (
    <View style={[styles.card, isCompactLayout && styles.cardCompact]}>
      <MathText
        selectable
        text={question}
        style={[
          styles.questionText,
          hasProminentFormula && styles.questionTextWithFormula,
          isCompactLayout && styles.questionTextCompact,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.card,
    paddingHorizontal: 26,
    paddingVertical: 32,
    justifyContent: 'flex-start',
    boxShadow: '0 18px 36px rgba(36, 52, 38, 0.10)',
  },
  cardCompact: {
    minHeight: 180,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  questionText: {
    fontSize: 24,
    lineHeight: 41,
    color: '#1D1B18',
    textAlign: 'left',
  },
  questionTextWithFormula: {
    lineHeight: 43,
  },
  questionTextCompact: {
    fontSize: 21,
    lineHeight: 36,
  },
});
