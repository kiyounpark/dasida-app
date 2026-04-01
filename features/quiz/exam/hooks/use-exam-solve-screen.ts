import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { getExamProblems } from '@/features/quiz/data/exam-problems';

import { useExamSession } from '../exam-session';

export type UseExamSolveScreenResult = {
  examId: string;
  currentProblem: ReturnType<typeof getExamProblems>[number] | null;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  answeredIndices: number[];
  currentAnswer: number | null;
  shortAnswerText: string;
  isCompactLayout: boolean;
  canGoPrev: boolean;
  isLast: boolean;
  imageKey: string;
  bookmarkedIndices: number[];
  isCurrentBookmarked: boolean;
  onToggleBookmark: () => void;
  onSelectChoice: (n: number) => void;
  onChangeShortAnswer: (text: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
};

export function useExamSolveScreen(examId: string): UseExamSolveScreenResult {
  const { state, initExam, setAnswer, goToNext, goToPrev, submitExam } = useExamSession();
  const { width, height } = useWindowDimensions();
  const isCompactLayout = width < 390 || height < 780;
  const initialized = useRef(false);

  // 단답형 입력 로컬 상태 (문자열)
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [bookmarkedIndices, setBookmarkedIndices] = useState<number[]>([]);

  // 초기화: examId가 바뀌면 exam 로드
  useEffect(() => {
    if (initialized.current && state.examId === examId) return;
    const problems = getExamProblems(examId);
    if (problems.length === 0) return;
    initExam(examId, problems);
    initialized.current = true;
  }, [examId, initExam, state.examId]);

  // 문제가 바뀌면 단답형 텍스트 동기화
  useEffect(() => {
    const currentAnswer = state.answers[state.currentIndex];
    if (state.problems[state.currentIndex]?.type === 'short_answer') {
      setShortAnswerText(currentAnswer !== null ? String(currentAnswer) : '');
    } else {
      setShortAnswerText('');
    }
  }, [state.currentIndex, state.answers, state.problems]);

  // 채점 완료 시 결과 화면으로
  useEffect(() => {
    if (state.isFinished && state.result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/quiz/exam/result' as any);
    }
  }, [state.isFinished, state.result]);

  const currentProblem = state.problems[state.currentIndex] ?? null;
  const currentAnswer = state.answers[state.currentIndex] ?? null;
  const answeredCount = state.answers.filter((a) => a !== null).length;
  const handleNext = () => {
    const isLast = state.currentIndex === state.problems.length - 1;

    if (isLast) {
      // onChangeShortAnswer가 이미 실시간으로 state.answers를 동기화하므로 직접 읽어도 정확
      const unanswered = state.answers.filter((a) => a === null).length;
      const total = state.problems.length;
      const msg =
        unanswered > 0
          ? `${unanswered}문제를 아직 답하지 않았습니다.\n채점하시겠습니까?`
          : `${total}문제를 모두 풀었습니다.\n채점하시겠습니까?`;

      Alert.alert('채점하기', msg, [
        { text: '취소', style: 'cancel' },
        { text: '채점하기', onPress: () => submitExam() },
      ]);
    } else {
      goToNext();
    }
  };

  const handlePrev = () => {
    goToPrev();
  };

  const handleSelectChoice = (n: number) => {
    setAnswer(state.currentIndex, n);
  };

  const handleExit = () => {
    Alert.alert('시험 나가기', '지금 나가면 풀이 내용이 사라집니다.', [
      { text: '계속 풀기', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  const answeredIndices = state.answers
    .map((a, i) => (a !== null ? i : null))
    .filter((i): i is number => i !== null);

  const isCurrentBookmarked = bookmarkedIndices.includes(state.currentIndex);

  const handleToggleBookmark = () => {
    setBookmarkedIndices((prev) =>
      prev.includes(state.currentIndex)
        ? prev.filter((i) => i !== state.currentIndex)
        : [...prev, state.currentIndex]
    );
  };

  const imageKey = currentProblem
    ? `${state.examId}/${currentProblem.number}`
    : '';

  return {
    examId: state.examId,
    currentProblem,
    currentIndex: state.currentIndex,
    totalCount: state.problems.length,
    answeredCount,
    answeredIndices,
    currentAnswer,
    shortAnswerText,
    isCompactLayout,
    canGoPrev: state.currentIndex > 0,
    isLast: state.currentIndex === state.problems.length - 1,
    imageKey,
    bookmarkedIndices,
    isCurrentBookmarked,
    onToggleBookmark: handleToggleBookmark,
    onSelectChoice: handleSelectChoice,
    onChangeShortAnswer: (text) => {
      setShortAnswerText(text);
      const num = parseInt(text, 10);
      setAnswer(state.currentIndex, text === '' ? null : isNaN(num) ? null : num);
    },
    onPrev: handlePrev,
    onNext: handleNext,
    onExit: handleExit,
  };
}
