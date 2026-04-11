import { StyleSheet, Text, View } from 'react-native';

import { MathText, splitQuestionDisplaySegments } from '@/components/math/MathText';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'] as const;

type DiagnosticQuestionCardProps = {
  isCompactLayout: boolean;
  question: string;
  choices: string[];
  selectedIndex: number | null;
};

export function DiagnosticQuestionCard({
  isCompactLayout,
  question,
  choices,
  selectedIndex,
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

      {choices.length > 0 && (
        <View style={styles.choicesSection}>
          <View style={styles.divider} />
          {choices.map((choice, i) => {
            const isSelected = selectedIndex === i;
            return (
              <View key={i} style={styles.choiceRow}>
                <Text
                  selectable
                  style={[
                    styles.choiceLabel,
                    isCompactLayout && styles.choiceLabelCompact,
                    isSelected && styles.choiceLabelSelected,
                  ]}>
                  {CHOICE_LABELS[i] ?? `(${i + 1})`}
                </Text>
                <View style={styles.choiceTextWrap}>
                  <MathText
                    selectable
                    text={choice}
                    style={[
                      styles.choiceText,
                      isCompactLayout && styles.choiceTextCompact,
                      isSelected && styles.choiceTextSelected,
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
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
    gap: 0,
  },
  cardCompact: {
    minHeight: 180,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
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
  choicesSection: {
    marginTop: 16,
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.08)',
    marginBottom: 4,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  choiceLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 28,
    color: '#948E83',
    width: 24,
    flexShrink: 0,
  },
  choiceLabelCompact: {
    fontSize: 16,
    lineHeight: 26,
  },
  choiceLabelSelected: {
    color: BrandColors.primaryDark,
  },
  choiceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  choiceText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#3D3B36',
    textAlign: 'left',
  },
  choiceTextCompact: {
    fontSize: 16,
    lineHeight: 26,
  },
  choiceTextSelected: {
    color: BrandColors.primaryDark,
    fontFamily: FontFamilies.bold,
  },
});
