import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import examImages from '@/features/quiz/data/exam-images';

import { ExamNumberPanel } from '../components/exam-number-panel';
import { ExamShortAnswerPanel } from '../components/exam-short-answer-panel';
import { ExamSolveHeader } from '../components/exam-solve-header';
import { useExamSolveScreen } from '../hooks/use-exam-solve-screen';

type ExamSolveScreenProps = {
  examId: string;
};

export function ExamSolveScreen({ examId }: ExamSolveScreenProps) {
  const {
    currentProblem,
    currentIndex,
    totalCount,
    answeredCount,
    totalScore,
    currentAnswer,
    shortAnswerText,
    isCompactLayout,
    canGoPrev,
    isLast,
    imageKey,
    onSelectChoice,
    onChangeShortAnswer,
    onPrev,
    onNext,
    onExit,
  } = useExamSolveScreen(examId);

  if (!currentProblem) return null;

  const imageSource = examImages[imageKey];
  const isShortAnswer = currentProblem.type === 'short_answer';

  return (
    <QuizSolveLayout
      header={
        <ExamSolveHeader
          currentNumber={currentProblem.number}
          totalCount={totalCount}
          answeredCount={answeredCount}
          score={totalScore}
          onExit={onExit}
          isCompactLayout={isCompactLayout}
        />
      }
      body={
        <View style={styles.imageWrap}>
          <Image
            source={imageSource}
            style={styles.problemImage}
            contentFit="contain"
            transition={0}
          />
        </View>
      }
      footer={
        isShortAnswer ? (
          <ExamShortAnswerPanel
            value={shortAnswerText}
            onChangeText={onChangeShortAnswer}
            onPrev={onPrev}
            onNext={onNext}
            canGoPrev={canGoPrev}
            isLast={isLast}
            isCompactLayout={isCompactLayout}
          />
        ) : (
          <ExamNumberPanel
            selectedAnswer={currentAnswer}
            onSelect={onSelectChoice}
            onPrev={onPrev}
            onNext={onNext}
            canGoPrev={canGoPrev}
            isLast={isLast}
            isCompactLayout={isCompactLayout}
          />
        )
      }
      bodyContentContainerStyle={styles.bodyContent}
    />
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    flexGrow: 1,
    padding: 16,
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
  },
  problemImage: {
    width: '100%',
    aspectRatio: undefined,
    flex: 1,
  },
});
