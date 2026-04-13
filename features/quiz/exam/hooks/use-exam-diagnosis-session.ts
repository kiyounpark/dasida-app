// features/quiz/exam/hooks/use-exam-diagnosis-session.ts
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { FlatList } from 'react-native';

import { useExamSession } from '../exam-session';

type UseExamDiagnosisSessionParams = {
  examId: string;
  wrongProblemNumbers: number[];
  startIndex: number;
};

export type UseExamDiagnosisSessionResult = {
  examId: string;
  wrongProblemNumbers: number[];
  activeProblemIndex: number;
  diagnosedIndices: number[];
  pagerRef: React.RefObject<FlatList<number> | null>;
  progressLabel: string;
  progressPercent: number;
  getUserAnswer: (problemNumber: number) => number;
  getNextProblemNumber: (currentIndex: number) => number | null;
  onDotPress: (index: number) => void;       // 도트 탭: scroll + 상태 업데이트
  onSwipeEnd: (index: number) => void;       // 스와이프 완료: 상태만 업데이트 (scroll 없음)
  onComplete: (problemIndex: number) => void;
  onScrollToNext: (fromIndex: number) => void;
  onBackToResult: () => void;
};

export function useExamDiagnosisSession({
  examId,
  wrongProblemNumbers,
  startIndex,
}: UseExamDiagnosisSessionParams): UseExamDiagnosisSessionResult {
  const { state } = useExamSession();
  const [activeProblemIndex, setActiveProblemIndex] = useState(startIndex);
  const [diagnosedIndices, setDiagnosedIndices] = useState<number[]>([]);
  const pagerRef = useRef<FlatList<number>>(null);
  const total = wrongProblemNumbers.length;

  const getUserAnswer = useCallback(
    (problemNumber: number): number => {
      const perProblem = state.result?.perProblem ?? [];
      return perProblem.find((p) => p.number === problemNumber)?.userAnswer ?? 0;
    },
    [state.result],
  );

  const getNextProblemNumber = useCallback(
    (currentIndex: number): number | null => {
      const nextIndex = currentIndex + 1;
      return nextIndex < total ? (wrongProblemNumbers[nextIndex] ?? null) : null;
    },
    [total, wrongProblemNumbers],
  );

  const scrollToIndex = useCallback((index: number) => {
    pagerRef.current?.scrollToIndex({ index, animated: true });
    setActiveProblemIndex(index);
  }, []);

  const onDotPress = useCallback(
    (index: number) => {
      scrollToIndex(index);
    },
    [scrollToIndex],
  );

  // 스와이프로 페이지 변경 시 — 상태만 업데이트, scrollToIndex 호출 금지 (무한 루프 방지)
  const onSwipeEnd = useCallback((index: number) => {
    setActiveProblemIndex(index);
  }, []);

  const onComplete = useCallback((problemIndex: number) => {
    setDiagnosedIndices((prev) =>
      prev.includes(problemIndex) ? prev : [...prev, problemIndex],
    );
  }, []);

  const onScrollToNext = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      if (nextIndex < total) {
        scrollToIndex(nextIndex);
      }
    },
    [total, scrollToIndex],
  );

  const onBackToResult = useCallback(() => {
    router.back();
  }, []);

  const progressPercent = total > 0 ? ((activeProblemIndex + 1) / total) * 100 : 0;

  return {
    examId,
    wrongProblemNumbers,
    activeProblemIndex,
    diagnosedIndices,
    pagerRef,
    progressLabel: `${activeProblemIndex + 1} / ${total}`,
    progressPercent,
    getUserAnswer,
    getNextProblemNumber,
    onDotPress,
    onSwipeEnd,
    onComplete,
    onScrollToNext,
    onBackToResult,
  };
}
