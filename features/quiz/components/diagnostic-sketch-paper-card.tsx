import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { MathText, splitQuestionDisplaySegments } from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';
import { DiagnosticChoiceCard } from '@/features/quiz/components/diagnostic-choice-card';
import {
  DIAGNOSTIC_SKETCH_PAPER_SOURCE,
  DiagnosticSketchColors,
} from '@/features/quiz/components/diagnostic-sketch-assets';

export type DiagnosticSketchPaperCardProps = {
  choices: string[];
  isCompactLayout: boolean;
  onSelectChoice: (index: number) => void;
  question: string;
  selectedIndex: number | null;
};

export function DiagnosticSketchPaperCard({
  choices,
  isCompactLayout,
  onSelectChoice,
  question,
  selectedIndex,
}: DiagnosticSketchPaperCardProps) {
  const hasProminentFormula = splitQuestionDisplaySegments(question).some(
    (segment) => segment.kind === 'formula',
  );

  return (
    <View style={[styles.paper, isCompactLayout && styles.paperCompact]}>
      <Image
        contentFit="fill"
        source={DIAGNOSTIC_SKETCH_PAPER_SOURCE}
        style={styles.paperImage}
        transition={0}
      />

      <View style={[styles.content, isCompactLayout && styles.contentCompact]}>
        <View style={[styles.questionWrap, isCompactLayout && styles.questionWrapCompact]}>
          <MathText
            text={question}
            style={[
              styles.questionText,
              hasProminentFormula && styles.questionTextWithFormula,
              isCompactLayout && styles.questionTextCompact,
            ]}
          />
        </View>

        <View accessibilityRole="radiogroup" style={[styles.choiceGrid, isCompactLayout && styles.choiceGridCompact]}>
          {choices.map((choice, index) => {
            const isFullWidth = choices.length % 2 === 1 && index === choices.length - 1;

            return (
              <DiagnosticChoiceCard
                key={`diagnostic-sketch-choice-${index}`}
                index={index}
                isCompactLayout={isCompactLayout}
                isFullWidth={isFullWidth}
                isSelected={selectedIndex === index}
                onPress={() => onSelectChoice(index)}
                text={choice}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: '100%',
    minHeight: 360,
    position: 'relative',
    justifyContent: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#4E3E2A',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: `0 20px 38px ${DiagnosticSketchColors.paperShadow}`,
      },
    }),
  },
  paperCompact: {
    minHeight: 320,
  },
  paperImage: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    paddingHorizontal: 42,
    paddingTop: 46,
    paddingBottom: 34,
    gap: 28,
  },
  contentCompact: {
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 26,
    gap: 22,
  },
  questionWrap: {
    width: '100%',
    paddingRight: '10%',
  },
  questionWrapCompact: {
    paddingRight: 0,
  },
  questionText: {
    fontFamily: FontFamilies.medium,
    fontSize: 25,
    lineHeight: 40,
    color: DiagnosticSketchColors.ink,
    textAlign: 'left',
  },
  questionTextWithFormula: {
    lineHeight: 42,
  },
  questionTextCompact: {
    fontSize: 21,
    lineHeight: 34,
  },
  choiceGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: 18,
    rowGap: 18,
  },
  choiceGridCompact: {
    columnGap: 12,
    rowGap: 12,
  },
});
