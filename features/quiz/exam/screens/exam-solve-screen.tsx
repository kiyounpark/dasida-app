import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import examImages from '@/features/quiz/data/exam-images';

import { ExamNumberPanel } from '../components/exam-number-panel';
import { ExamProgressPanel } from '../components/exam-progress-panel';
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
    answeredIndices,
    currentAnswer,
    shortAnswerText,
    isCompactLayout,
    canGoPrev,
    isLast,
    imageKey,
    bookmarkedIndices,
    isCurrentBookmarked,
    onToggleBookmark,
    onSelectChoice,
    onChangeShortAnswer,
    onPrev,
    onNext,
    onExit,
  } = useExamSolveScreen(examId);

  // 이미지 자연 비율을 동적으로 측정
  const [imageAspectRatio, setImageAspectRatio] = useState<number | undefined>(undefined);
  const handleImageLoad = useCallback(
    (e: { source: { width: number; height: number } }) => {
      if (e.source.width > 0 && e.source.height > 0) {
        setImageAspectRatio(e.source.width / e.source.height);
      }
    },
    []
  );

  useEffect(() => {
    setImageAspectRatio(undefined);
  }, [imageKey]);

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
          isBookmarked={isCurrentBookmarked}
          onToggleBookmark={onToggleBookmark}
          onExit={onExit}
          isCompactLayout={isCompactLayout}
        />
      }
      body={
        <View style={styles.body}>
          <Image
            source={imageSource}
            style={[
              styles.problemImage,
              imageAspectRatio ? { aspectRatio: imageAspectRatio } : styles.problemImageFallback,
            ]}
            contentFit="contain"
            transition={0}
            onLoad={handleImageLoad}
          />
          <ExamProgressPanel
            totalCount={totalCount}
            currentIndex={currentIndex}
            answeredIndices={answeredIndices}
            bookmarkedIndices={bookmarkedIndices}
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
    />
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 16,
  },
  problemImage: {
    width: '100%',
  },
  problemImageFallback: {
    minHeight: 120,
  },
});
