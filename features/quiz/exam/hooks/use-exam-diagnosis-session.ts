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
  activeProblemIndexRef: React.MutableRefObject<number>;
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
  // Ref always reflects current value — readable by stale closures at call time
  const activeProblemIndexRef = useRef(activeProblemIndex);
  activeProblemIndexRef.current = activeProblemIndex;
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
    // Phone: FlatList slides with animation. Tablet: pagerRef is null (no FlatList),
    // but setActiveProblemIndex below re-keys the single ExamDiagnosisPage, triggering re-mount.
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

  const isResumed = state.problems.length === 0;

  const onBackToResult = useCallback(() => {
    // fresh: result가 스택에 있으므로 back()으로 돌아감 → remount 없어 이중 POST 없음.
    // resume: 스택에 result 없으므로 replace로 명시 navigate.
    //   resumed=1: result 화면 새 mount 시 초기 recordAttempt(비멱등 POST) 건너뜀.
    if (isResumed) {
      router.replace('/quiz/exam/result?resumed=1');
    } else {
      router.back();
    }
  }, [isResumed]);

  const progressPercent = total > 0 ? ((activeProblemIndex + 1) / total) * 100 : 0;

  return {
    examId,
    wrongProblemNumbers,
    activeProblemIndex,
    activeProblemIndexRef,
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
