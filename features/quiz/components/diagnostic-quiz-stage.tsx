import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { DiagnosticQuestionCard } from '@/features/quiz/components/diagnostic-question-card';
import { DiagnosticSolveBottomPanel } from '@/features/quiz/components/diagnostic-solve-bottom-panel';
import { DiagnosticSolveExitModal } from '@/features/quiz/components/diagnostic-solve-exit-modal';
import { DiagnosticSolveHeader } from '@/features/quiz/components/diagnostic-solve-header';
import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import type { DiagnosticQuizStageModel } from '@/features/quiz/hooks/use-diagnostic-screen';

type DiagnosticQuizStageProps = {
  quizStage: DiagnosticQuizStageModel;
};

export function DiagnosticQuizStage({ quizStage }: DiagnosticQuizStageProps) {
  const { width, height } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;

  return (
    <View style={styles.screen}>
      <QuizSolveLayout
        body={
          <DiagnosticQuestionCard
            choices={quizStage.problem.choices}
            isCompactLayout={isCompactLayout}
            question={quizStage.problem.question}
            selectedIndex={quizStage.selectedIndex}
          />
        }
        bodyContentContainerStyle={[styles.content, isCompactLayout ? styles.contentCompact : null]}
        footer={
          <DiagnosticSolveBottomPanel
            canGoPrevious={quizStage.canGoPrevious}
            isCompactLayout={isCompactLayout}
            isNextDisabled={quizStage.isNextDisabled}
            onNextPress={quizStage.onNextQuestion}
            onPreviousPress={quizStage.onPreviousQuestion}
            onSelectChoice={quizStage.onSelectChoice}
            selectedIndex={quizStage.selectedIndex}
          />
        }
        header={
          <DiagnosticSolveHeader
            currentQuestionNumber={quizStage.currentQuestionNumber}
            isCompactLayout={isCompactLayout}
            onBackPress={quizStage.onOpenExitModal}
            progressPercent={quizStage.progressPercent}
            questionCount={quizStage.questionCount}
          />
        }
        screenBackgroundColor={BrandColors.background}
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
});
