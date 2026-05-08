// features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { useCurrentLearner } from '@/features/learner/provider';
import { DiagnosisDarkHeader } from '@/features/quiz/components/diagnosis-dark-header';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { getSingleParam } from '@/utils/get-single-param';

import { OriginalStrokesSheet } from '@/features/quiz/exam/components/original-strokes-sheet';
import { useProblemStrokes } from '@/features/quiz/exam/hooks/use-problem-strokes';

import { ExamDiagnosisPage } from './exam-diagnosis-screen';
import { buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
import { useAppBackgroundSync } from '../use-app-background-sync';
import { getDiagnosisProgress } from '../exam-diagnosis-progress';
import { navigateBackToExamResult } from '../exam-result-navigation';
import { useExamSession } from '../exam-session';
import { useExamDiagnosisSession } from '../hooks/use-exam-diagnosis-session';

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

  const activeProblemNumber = wrongProblemNumbers[session.activeProblemIndex] ?? 0;
  const { strokes, loaded: strokesLoaded, hasStrokes } = useProblemStrokes(
    examId,
    activeProblemNumber,
  );

  const [strokesSheetVisible, setStrokesSheetVisible] = useState(false);

  useEffect(() => {
    setStrokesSheetVisible(false);
  }, [session.activeProblemIndex]);

  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const router = useRouter();
  const { profile, session: authSession, recordAttempt } = useCurrentLearner();
  const { state: examState } = useExamSession();

  const handlePauseRequested = useCallback(() => {
    void (async () => {
      const result = examState.result;
      if (result && profile && authSession) {
        try {
          const diagnosed = await getDiagnosisProgress({
            examId: result.examId,
            attemptId: result.attemptId,
            attemptDateISO: result.completedAt,
          });
          const input = buildExamAttemptInputWithDiagnosis({
            session: authSession,
            profile,
            result,
            diagnosedProblems: diagnosed,
          });
          await recordAttempt(input).catch((err) => {
            console.warn('[Exam] sync on pause failed', err);
          });
        } catch (err) {
          console.warn('[Exam] sync on pause failed', err);
        }
      }
      router.replace('/(tabs)/quiz');
    })();
  }, [router, examState.result, profile, authSession, recordAttempt]);

  useAppBackgroundSync(() => {
    void (async () => {
      const result = examState.result;
      if (!result || !profile || !authSession) return;
      try {
        const diagnosed = await getDiagnosisProgress({
          examId: result.examId,
          attemptId: result.attemptId,
          attemptDateISO: result.completedAt,
        });
        await recordAttempt(
          buildExamAttemptInputWithDiagnosis({
            session: authSession,
            profile,
            result,
            diagnosedProblems: diagnosed,
          }),
        );
      } catch {
        /* 다음 sync point에서 회복 */
      }
    })();
  });

  const { onSwipeEnd } = session;

  const handlePageComplete = useCallback(
    (index: number) => {
      session.onComplete(index);
      const hasNext = session.getNextProblemNumber(index) !== null;
      if (hasNext) {
        session.onScrollToNext(index);
      } else {
        navigateBackToExamResult(session.isResumed);
      }
    },
    [session],
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
          showOriginalStrokesButton={hasStrokes}
          onPressOriginalStrokes={() => setStrokesSheetVisible(true)}
        />
        {activeProblemNumber !== 0 && (
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
        <OriginalStrokesSheet
          visible={strokesSheetVisible}
          strokes={strokes}
          loaded={strokesLoaded}
          onClose={() => setStrokesSheetVisible(false)}
        />
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
        showOriginalStrokesButton={hasStrokes}
        onPressOriginalStrokes={() => setStrokesSheetVisible(true)}
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
      <OriginalStrokesSheet
        visible={strokesSheetVisible}
        strokes={strokes}
        loaded={strokesLoaded}
        onClose={() => setStrokesSheetVisible(false)}
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
