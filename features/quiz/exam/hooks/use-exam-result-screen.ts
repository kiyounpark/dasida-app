import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';
import { getExamProblems } from '@/features/quiz/data/exam-problems';

import { buildExamAttemptInput } from '../build-exam-attempt-input';
import {
  getDiagnosisProgress,
  type ExamDiagnosisProgress,
} from '../exam-diagnosis-progress';
import { useExamSession } from '../exam-session';
import type { ExamResultSummary } from '../types';

export type ResultSaveState = 'idle' | 'saving' | 'saved' | 'error';

export type ProblemTile = {
  number: number;
  topic: string;
  score: number;
  status: 'undone' | 'done' | 'blank';
};

export type UseExamResultScreenResult = {
  result: ExamResultSummary | null;
  examTitle: string;
  saveState: ResultSaveState;
  problemTiles: ProblemTile[];
  diagnosedCount: number;
  wrongCount: number;
  onAnalyzeProblem: (problemNumber: number) => void;
  onReturnHome: () => void;
};

export function useExamResultScreen(): UseExamResultScreenResult {
  const { state, resetExam } = useExamSession();
  const { profile, recordAttempt, session } = useCurrentLearner();
  const [saveState, setSaveState] = useState<ResultSaveState>('idle');
  const [diagnosedProblems, setDiagnosedProblems] = useState<ExamDiagnosisProgress>({});
  const saveAttempted = useRef(false);

  const result = state.result;
  const examTitle = result ? (EXAM_CATALOG_BY_ID[result.examId]?.title ?? result.examId) : '';

  const examProblems = useMemo(
    () => (result ? getExamProblems(result.examId) : []),
    [result],
  );

  // 결과 저장 (최초 1회)
  useEffect(() => {
    if (!result || !profile || !session) return;
    if (saveAttempted.current) return;
    saveAttempted.current = true;

    setSaveState('saving');
    recordAttempt(buildExamAttemptInput({ session, profile, result }))
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'));
  }, [result, profile, session, recordAttempt]);

  // 포커스 시 진단 진행 상태 갱신
  useFocusEffect(
    useCallback(() => {
      if (!result) return;
      getDiagnosisProgress(result.examId).then(setDiagnosedProblems);
    }, [result]),
  );

  // 문제 타일 계산
  const problemTiles: ProblemTile[] = result
    ? result.perProblem
        .filter((p) => !p.isCorrect)
        .sort((a, b) => {
          const aBlank = a.userAnswer === null;
          const bBlank = b.userAnswer === null;
          if (aBlank !== bBlank) return aBlank ? 1 : -1;
          const aScore = examProblems.find((ep) => ep.number === a.number)?.score ?? 0;
          const bScore = examProblems.find((ep) => ep.number === b.number)?.score ?? 0;
          return bScore - aScore;
        })
        .map((p) => {
          const ep = examProblems.find((e) => e.number === p.number);
          return {
            number: p.number,
            topic: ep?.topic ?? '문제',
            score: ep?.score ?? 0,
            status:
              p.userAnswer === null
                ? 'blank'
                : diagnosedProblems[p.number]
                  ? 'done'
                  : 'undone',
          };
        })
    : [];

  const wrongCount = result
    ? result.perProblem.filter((p) => !p.isCorrect && p.userAnswer !== null).length
    : 0;
  const diagnosedCount = Object.keys(diagnosedProblems).length;

  return {
    result,
    examTitle,
    saveState,
    problemTiles,
    diagnosedCount,
    wrongCount,
    onAnalyzeProblem: (problemNumber: number) => {
      if (!result) return;
      const wrongProblemNumbers = result.perProblem
        .filter((p) => !p.isCorrect && p.userAnswer !== null)
        .map((p) => p.number);
      const startIndex = wrongProblemNumbers.indexOf(problemNumber);
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: result.examId,
          wrongProblemNumbers: JSON.stringify(wrongProblemNumbers),
          startIndex: String(Math.max(0, startIndex)),
        },
      });
    },
    onReturnHome: () => {
      resetExam();
      router.replace('/quiz');
    },
  };
}
