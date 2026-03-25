import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { DiagnosticChoiceCard } from '@/features/quiz/components/diagnostic-choice-card';
import { DiagnosticSolveFooter } from '@/features/quiz/components/diagnostic-solve-footer';
import { getQuizBottomPanelMaxHeight } from '@/features/quiz/components/quiz-solve-layout';

export type DiagnosticSolveBottomPanelProps = {
  canGoPrevious: boolean;
  choices: string[];
  isCompactLayout: boolean;
  isNextDisabled: boolean;
  onNextPress: () => void;
  onPreviousPress: () => void;
  onSelectChoice: (index: number) => void;
  problemId: string;
  selectedIndex: number | null;
};

export function DiagnosticSolveBottomPanel({
  canGoPrevious,
  choices,
  isCompactLayout,
  isNextDisabled,
  onNextPress,
  onPreviousPress,
  onSelectChoice,
  problemId,
  selectedIndex,
}: DiagnosticSolveBottomPanelProps) {
  const { height } = useWindowDimensions();
  const choicesMaxHeight = getQuizBottomPanelMaxHeight(height, isCompactLayout);

  return (
    <View style={styles.panel}>
      <ScrollView
        key={problemId}
        style={[styles.choiceScroll, { maxHeight: choicesMaxHeight }]}
        contentContainerStyle={[
          styles.choiceContent,
          isCompactLayout ? styles.choiceContentCompact : null,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {choices.map((choice, index) => (
          <DiagnosticChoiceCard
            key={`${problemId}-${index}`}
            index={index}
            isCompactLayout={isCompactLayout}
            isSelected={selectedIndex === index}
            onPress={() => onSelectChoice(index)}
            text={choice}
          />
        ))}
      </ScrollView>

      <DiagnosticSolveFooter
        canGoPrevious={canGoPrevious}
        isCompactLayout={isCompactLayout}
        isNextDisabled={isNextDisabled}
        onNextPress={onNextPress}
        onPreviousPress={onPreviousPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  choiceScroll: {
    width: '100%',
  },
  choiceContent: {
    gap: 12,
    paddingBottom: 4,
  },
  choiceContentCompact: {
    gap: 10,
  },
});
