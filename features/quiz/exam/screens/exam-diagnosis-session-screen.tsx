// features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { DiagnosisDarkHeader } from '@/features/quiz/components/diagnosis-dark-header';
import { getSingleParam } from '@/utils/get-single-param';

import { ExamDiagnosisPage } from './exam-diagnosis-screen';
import { useExamDiagnosisSession } from '../hooks/use-exam-diagnosis-session';

export function ExamDiagnosisSessionScreen() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const wrongProblemNumbers: number[] = JSON.parse(
    getSingleParam(params.wrongProblemNumbers) ?? '[]',
  ) as number[];
  const startIndex = Number(getSingleParam(params.startIndex) ?? '0');

  const session = useExamDiagnosisSession({ examId, wrongProblemNumbers, startIndex });
  const insets = useSafeAreaInsets();
  const pageWidth = Dimensions.get('window').width;

  // 스와이프 완료 시 activeProblemIndex 동기화 (onDotPress 아님 — scroll 재호출 방지)
  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      session.onSwipeEnd(index);
    },
    [pageWidth, session.onSwipeEnd],
  );

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <DiagnosisDarkHeader
        title={`${wrongProblemNumbers[session.activeProblemIndex] ?? ''}번`}
        backLabel="← 채점 결과"
        progressLabel={session.progressLabel}
        progressPercent={session.progressPercent}
        totalCount={wrongProblemNumbers.length}
        completedIndices={session.diagnosedIndices}
        activeIndex={session.activeProblemIndex}
        onBack={session.onBackToResult}
        onDotPress={session.onDotPress}
      />
      <FlatList
        ref={session.pagerRef}
        data={wrongProblemNumbers}
        horizontal
        pagingEnabled
        bounces={false}
        directionalLockEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(problemNumber) => String(problemNumber)}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item: problemNumber, index }) => (
          <ExamDiagnosisPage
            examId={examId}
            problemNumber={problemNumber}
            userAnswer={session.getUserAnswer(problemNumber)}
            width={pageWidth}
            isActive={index === session.activeProblemIndex}
            nextProblemNumber={session.getNextProblemNumber(index)}
            onComplete={() => session.onComplete(index)}
            onNext={() => session.onScrollToNext(index)}
            onBackToResult={session.onBackToResult}
          />
        )}
        style={styles.pager}
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DiagnosisTheme.canvas,
  },
  pager: {
    flex: 1,
  },
});
