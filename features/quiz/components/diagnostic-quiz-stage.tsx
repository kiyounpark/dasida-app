import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { QuizQuestionCard } from '@/features/quiz/components/quiz-question-card';
import { DiagnosticSolveBottomPanel } from '@/features/quiz/components/diagnostic-solve-bottom-panel';
import { QuizSolveExitConfirmModal } from '@/features/quiz/components/quiz-solve-exit-confirm-modal';
import { QuizSolveHeader } from '@/features/quiz/components/quiz-solve-header';
import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import { LandscapeHintBanner } from '@/features/quiz/exam/components/landscape-hint-banner';
import type { IndexedScratchpadApi } from '@/features/quiz/hooks/use-diagnostic-scratchpad-store';
import type { DiagnosticQuizStageModel } from '@/features/quiz/hooks/use-diagnostic-screen';

import { DiagnosticSolveTabletLayout } from './diagnostic-solve-tablet-layout';

type DiagnosticQuizStageProps = {
  quizStage: DiagnosticQuizStageModel;
  scratchpad: IndexedScratchpadApi;
  isTablet: boolean;
  isPortrait: boolean;
  showLandscapeHint: boolean;
  onDismissLandscapeHint: () => void;
};

export function DiagnosticQuizStage({
  quizStage,
  scratchpad,
  isTablet,
  isPortrait,
  showLandscapeHint,
  onDismissLandscapeHint,
}: DiagnosticQuizStageProps) {
  const { width, height } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;
  const useTabletLayout = isTablet && !isPortrait;

  const header = (
    <QuizSolveHeader
      currentQuestionNumber={quizStage.currentQuestionNumber}
      isCompactLayout={isCompactLayout}
      onBackPress={quizStage.onOpenExitModal}
      progressPercent={quizStage.progressPercent}
      questionCount={quizStage.questionCount}
      title="약점 진단"
    />
  );

  const body = (
    <QuizQuestionCard
      choices={quizStage.problem.choices}
      isCompactLayout={isCompactLayout}
      question={quizStage.problem.question}
      selectedIndex={quizStage.selectedIndex}
    />
  );

  const footer = (
    <DiagnosticSolveBottomPanel
      canGoPrevious={quizStage.canGoPrevious}
      isCompactLayout={isCompactLayout}
      isNextDisabled={quizStage.isNextDisabled}
      onNextPress={quizStage.onNextQuestion}
      onPreviousPress={quizStage.onPreviousQuestion}
      onSelectChoice={quizStage.onSelectChoice}
      selectedIndex={quizStage.selectedIndex}
    />
  );

  return (
    <View style={styles.screen}>
      {useTabletLayout ? (
        <DiagnosticSolveTabletLayout
          header={header}
          scratchpad={scratchpad}
          problemPanel={
            <View style={styles.tabletProblemPanel}>
              <View style={styles.tabletBody}>{body}</View>
              <View>{footer}</View>
            </View>
          }
        />
      ) : (
        <QuizSolveLayout
          body={body}
          bodyContentContainerStyle={[
            styles.content,
            isCompactLayout ? styles.contentCompact : null,
          ]}
          footer={footer}
          header={header}
          screenBackgroundColor={BrandColors.background}
        />
      )}

      {isTablet && isPortrait && showLandscapeHint ? (
        <LandscapeHintBanner onDismiss={onDismissLandscapeHint} />
      ) : null}

      <QuizSolveExitConfirmModal
        body="지금까지 푼 답안은 저장되지 않아요. 나가면 처음부터 다시 시작해야 해요."
        onClose={quizStage.onCloseExitModal}
        onConfirmExit={quizStage.onConfirmExit}
        title="진단을 나갈까요?"
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
    paddingTop: 10,
    paddingBottom: 12,
    gap: 18,
  },
  contentCompact: {
    paddingTop: 8,
    paddingBottom: 10,
    gap: 16,
  },
  tabletProblemPanel: {
    flex: 1,
    flexDirection: 'column',
  },
  tabletBody: { flex: 1 },
});
