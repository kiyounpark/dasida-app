import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';

import { buildExamAttemptInput } from '../build-exam-attempt-input';
import { useExamSession } from '../exam-session';
import type { ExamResultSummary } from '../types';

export type ResultSaveState = 'idle' | 'saving' | 'saved' | 'error';

export type UseExamResultScreenResult = {
  result: ExamResultSummary | null;
  examTitle: string;
  saveState: ResultSaveState;
  onStartDiagnostic: () => void;
  onReturnHome: () => void;
};

export function useExamResultScreen(): UseExamResultScreenResult {
  const { state, resetExam } = useExamSession();
  const { resetSession } = useQuizSession();
  const { profile, recordAttempt, session } = useCurrentLearner();
  const [saveState, setSaveState] = useState<ResultSaveState>('idle');
  const saveAttempted = useRef(false);

  const result = state.result;
  const examTitle = result ? (EXAM_CATALOG_BY_ID[result.examId]?.title ?? result.examId) : '';

  // profile/session이 비동기 로딩되는 경우에도 저장이 실행되도록 deps로 감시
  useEffect(() => {
    if (!result || !profile || !session) return;
    if (saveAttempted.current) return;
    saveAttempted.current = true;

    setSaveState('saving');
    recordAttempt(buildExamAttemptInput({ session, profile, result }))
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'));
  }, [result, profile, session, recordAttempt]);

  return {
    result,
    examTitle,
    saveState,
    onStartDiagnostic: () => {
      resetExam();
      resetSession();
      router.push({ pathname: '/quiz/diagnostic', params: { autostart: '1' } });
    },
    onReturnHome: () => {
      resetExam();
      router.replace('/quiz');
    },
  };
}
