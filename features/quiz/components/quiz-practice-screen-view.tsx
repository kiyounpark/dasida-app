import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { GraduateFloatingBar } from '@/features/quiz/components/graduate-floating-bar';
import { QuizPracticeFooter } from '@/features/quiz/components/quiz-practice-footer';
import { QuizQuestionCard } from '@/features/quiz/components/quiz-question-card';
import { QuizSolveExitConfirmModal } from '@/features/quiz/components/quiz-solve-exit-confirm-modal';
import { QuizSolveHeader } from '@/features/quiz/components/quiz-solve-header';
import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

export function QuizPracticeScreenView({
  activeProblem,
  canGraduate,
  continueLabel,
  currentQuestionNumber,
  emptyActionLabel,
  emptyTitle,
  feedback,
  isExitModalVisible,
  isGraduating,
  isPersistingAttempt,
  onCloseExitModal,
  onConfirmExit,
  onContinue,
  onGraduate,
  onOpenExitModal,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
  persistErrorMessage,
  progressPercent,
  questionCount,
  screenTitle,
  selectedIndex,
  weaknessLabel,
}: UsePracticeScreenResult) {
  const { height, width } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;

  if (!activeProblem) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.emptyBody}>
          <View style={styles.emptyCard}>
            <Text style={styles.title}>{emptyTitle}</Text>
            <View style={styles.buttonTopGap}>
              <BrandButton title={emptyActionLabel} onPress={onViewResult} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <QuizSolveLayout
        body={
          <QuizQuestionCard
            choices={activeProblem.choices}
            isCompactLayout={isCompactLayout}
            question={activeProblem.question}
            selectedIndex={selectedIndex}
            subtitle={weaknessLabel}
          />
        }
        bodyContentContainerStyle={[styles.content, isCompactLayout ? styles.contentCompact : null]}
        footer={
          <QuizPracticeFooter
            choiceCount={activeProblem.choices.length}
            continueLabel={continueLabel}
            feedback={feedback}
            isCompactLayout={isCompactLayout}
            isPersistingAttempt={isPersistingAttempt}
            onContinue={onContinue}
            onRetry={onRetry}
            onSelectChoice={onSelectChoice}
            onSubmit={onSubmit}
            persistErrorMessage={persistErrorMessage}
            problemId={activeProblem.id}
            selectedIndex={selectedIndex}
          />
        }
        footerSafeArea={!canGraduate}
        header={
          <QuizSolveHeader
            currentQuestionNumber={currentQuestionNumber}
            isCompactLayout={isCompactLayout}
            onBackPress={onOpenExitModal}
            progressPercent={progressPercent}
            questionCount={questionCount}
            title={screenTitle}
          />
        }
        screenBackgroundColor={BrandColors.background}
      />

      {canGraduate ? (
        <GraduateFloatingBar
          disabled={isGraduating}
          isGraduating={isGraduating}
          onPress={onGraduate}
        />
      ) : null}

      <QuizSolveExitConfirmModal
        body="현재 풀던 문제는 저장되지 않아요. 연습 허브로 돌아갈까요?"
        onClose={onCloseExitModal}
        onConfirmExit={onConfirmExit}
        title="연습을 나갈까요?"
        visible={isExitModalVisible}
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
  emptyBody: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#fff',
    marginTop: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  buttonTopGap: {
    marginTop: 20,
  },
});
