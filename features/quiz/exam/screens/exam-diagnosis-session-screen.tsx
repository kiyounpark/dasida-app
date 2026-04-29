// features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { DiagnosisDarkHeader } from '@/features/quiz/components/diagnosis-dark-header';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { getSingleParam } from '@/utils/get-single-param';

import { ExamDiagnosisPage } from './exam-diagnosis-screen';
import { useExamDiagnosisSession } from '../hooks/use-exam-diagnosis-session';
import { useExamSession } from '../exam-session';

function parseProblemNumbers(raw: string | undefined): number[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ExamDiagnosisSessionScreen() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const wrongProblemNumbers = parseProblemNumbers(getSingleParam(params.wrongProblemNumbers));
  const rawIndex = Number(getSingleParam(params.startIndex) ?? '0');
  const startIndex = Math.max(
    0,
    Math.min(
      Number.isNaN(rawIndex) ? 0 : rawIndex,
      wrongProblemNumbers.length > 0 ? wrongProblemNumbers.length - 1 : 0,
    ),
  );

  const rawTotalNotes = Number(getSingleParam(params.totalNotes));
  const totalNotes =
    Number.isFinite(rawTotalNotes) && rawTotalNotes > 0
      ? rawTotalNotes
      : wrongProblemNumbers.length;
  const diagnosedCountBefore =
    Number(getSingleParam(params.diagnosedCountBefore)) || 0;

  const session = useExamDiagnosisSession({ examId, wrongProblemNumbers, startIndex });
  // HYDRATE_RESULT 경유 시 problems=[] → resume 흐름 식별. result 화면에서 초기 recordAttempt 중복 방지용.
  const { state: examState } = useExamSession();
  const isResumed = examState.problems.length === 0;
  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const router = useRouter();

  const handlePauseRequested = useCallback(() => {
    router.replace('/(tabs)/quiz');
  }, [router]);

  const { onSwipeEnd } = session;

  const handlePageComplete = useCallback(
    (index: number) => {
      session.onComplete(index);
      const hasNext = session.getNextProblemNumber(index) !== null;
      if (hasNext) {
        session.onScrollToNext(index);
      } else {
        // fresh flow: result가 스택에 있으므로 back()으로 복원 → remount 없어 이중 POST 없음.
        // resume flow: 스택에 result 없으므로 replace로 명시 navigate.
        //   resumed=1: result 화면 새 mount 시 초기 recordAttempt(비멱등 POST) 건너뜀.
        if (isResumed) {
          router.replace('/quiz/exam/result?resumed=1');
        } else {
          router.back();
        }
      }
    },
    [session, router, isResumed],
  );

  // 스와이프 완료 시 activeProblemIndex 동기화 (onDotPress 아님 — scroll 재호출 방지)
  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      onSwipeEnd(index);
    },
    [pageWidth, onSwipeEnd],
  );

  // 태블릿: FlatList 없이 현재 문제 하나만 렌더링
  if (isTablet) {
    const activeProblemNumber = wrongProblemNumbers[session.activeProblemIndex];

    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <DiagnosisDarkHeader
          title={`${activeProblemNumber ?? ''}번`}
          backLabel="← 채점 결과"
          progressLabel={session.progressLabel}
          progressPercent={session.progressPercent}
          totalCount={wrongProblemNumbers.length}
          completedIndices={session.diagnosedIndices}
          activeIndex={session.activeProblemIndex}
          onBack={session.onBackToResult}
          onDotPress={session.onDotPress}
        />
        {activeProblemNumber !== undefined && (
          <ExamDiagnosisPage
            key={activeProblemNumber}
            examId={examId}
            problemNumber={activeProblemNumber}
            userAnswer={session.getUserAnswer(activeProblemNumber)}
            width={pageWidth}
            isActive={true}
            totalNotes={totalNotes}
            currentNoteCountBeforeThis={diagnosedCountBefore + session.diagnosedIndices.length}
            isLastProblem={session.getNextProblemNumber(session.activeProblemIndex) === null}
            onPauseRequested={handlePauseRequested}
            onComplete={() => handlePageComplete(session.activeProblemIndex)}
          />
        )}
      </View>
    );
  }

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
            totalNotes={totalNotes}
            currentNoteCountBeforeThis={diagnosedCountBefore + session.diagnosedIndices.length}
            isLastProblem={session.getNextProblemNumber(index) === null}
            onPauseRequested={handlePauseRequested}
            onComplete={() => handlePageComplete(index)}
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
