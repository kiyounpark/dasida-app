import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { DiagnosticChoiceCard } from '@/features/quiz/components/diagnostic-choice-card';
import { DiagnosticQuestionCard } from '@/features/quiz/components/diagnostic-question-card';
import { DiagnosticSolveExitModal } from '@/features/quiz/components/diagnostic-solve-exit-modal';
import { DiagnosticSolveFooter } from '@/features/quiz/components/diagnostic-solve-footer';
import { DiagnosticSolveHeader } from '@/features/quiz/components/diagnostic-solve-header';
import type { DiagnosticQuizStageModel } from '@/features/quiz/hooks/use-diagnostic-screen';

type DiagnosticQuizStageProps = {
  quizStage: DiagnosticQuizStageModel;
};

export function DiagnosticQuizStage({ quizStage }: DiagnosticQuizStageProps) {
  const { height, width } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;

  return (
    <View style={styles.screen}>
      <DiagnosticSolveHeader
        currentQuestionNumber={quizStage.currentQuestionNumber}
        isCompactLayout={isCompactLayout}
        onBackPress={quizStage.onOpenExitModal}
        progressPercent={quizStage.progressPercent}
        questionCount={quizStage.questionCount}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isCompactLayout && styles.contentCompact]}
        contentInsetAdjustmentBehavior="automatic">
        <DiagnosticQuestionCard
          isCompactLayout={isCompactLayout}
          question={quizStage.problem.question}
        />

        <View style={styles.choices}>
          {quizStage.problem.choices.map((choice, index) => (
            <DiagnosticChoiceCard
              key={`${quizStage.problem.id}-${index}`}
              index={index}
              isCompactLayout={isCompactLayout}
              isSelected={quizStage.selectedIndex === index}
              onPress={() => quizStage.onSelectChoice(index)}
              text={choice}
            />
          ))}
        </View>
      </ScrollView>

      <DiagnosticSolveFooter
        canGoPrevious={quizStage.canGoPrevious}
        isCompactLayout={isCompactLayout}
        isNextDisabled={quizStage.isNextDisabled}
        onNextPress={quizStage.onNextQuestion}
        onPreviousPress={quizStage.onPreviousQuestion}
      />

      <DiagnosticSolveExitModal
        onClose={quizStage.onCloseExitModal}
        onConfirmExit={quizStage.onConfirmExit}
        visible={quizStage.isExitModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  contentCompact: {
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  choices: {
    gap: 16,
  },
});
