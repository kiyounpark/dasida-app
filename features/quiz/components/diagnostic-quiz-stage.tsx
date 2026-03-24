import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosticSolveExitModal } from '@/features/quiz/components/diagnostic-solve-exit-modal';
import { DiagnosticSolveHeader } from '@/features/quiz/components/diagnostic-solve-header';
import { DiagnosticSketchNavButtons } from '@/features/quiz/components/diagnostic-sketch-nav-buttons';
import { DiagnosticSketchPaperCard } from '@/features/quiz/components/diagnostic-sketch-paper-card';
import { DiagnosticSketchColors } from '@/features/quiz/components/diagnostic-sketch-assets';
import type { DiagnosticQuizStageModel } from '@/features/quiz/hooks/use-diagnostic-screen';

type DiagnosticQuizStageProps = {
  quizStage: DiagnosticQuizStageModel;
};

export function DiagnosticQuizStage({ quizStage }: DiagnosticQuizStageProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
        contentContainerStyle={[
          styles.content,
          isCompactLayout ? styles.contentCompact : null,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <DiagnosticSketchPaperCard
            key={quizStage.problem.id}
            choices={quizStage.problem.choices}
            isCompactLayout={isCompactLayout}
            onSelectChoice={quizStage.onSelectChoice}
            question={quizStage.problem.question}
            selectedIndex={quizStage.selectedIndex}
          />

          <DiagnosticSketchNavButtons
            canGoPrevious={quizStage.canGoPrevious}
            isCompactLayout={isCompactLayout}
            isNextDisabled={quizStage.isNextDisabled}
            onNextPress={quizStage.onNextQuestion}
            onPreviousPress={quizStage.onPreviousQuestion}
          />
        </View>
      </ScrollView>

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
    backgroundColor: DiagnosticSketchColors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 22,
  },
  contentCompact: {
    paddingHorizontal: 14,
    paddingTop: 4,
    gap: 18,
  },
  stage: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 22,
  },
});
